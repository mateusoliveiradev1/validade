import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import type { SessionContextResponse } from "@validade-zero/contracts";
import { CaptureApp } from "./src/capture/CaptureApp";
import type { PushAlertChannel } from "./src/capture/alert-channel";
import { captureColors, captureSpacing } from "./src/capture/capture-theme";
import { createSQLiteCaptureRepository } from "./src/capture/sqlite-repository";
import {
  AuthGate,
  type AuthGateReadyControls,
  configuredApiBaseUrl,
  createMobileAuthClient,
  type MobileAuthClient,
} from "./src/auth/AuthGate";
import { createFetchSyncTransport } from "./src/capture/http-sync-transport";
import { createNetInfoNetworkStateProvider } from "./src/capture/network-state";
import { createSyncEngine } from "./src/capture/sync-engine";
import { readMobileBuildInfo } from "./src/build-info";
import { ScreenHeader, StatusNotice } from "./src/capture/capture-ui";
import type { CaptureRepository, CaptureRepositoryDependencies } from "./src/capture/repository";
import { deviceIdForStore } from "./src/capture/device-identity";

const defaultAuthClient = createMobileAuthClient();

export default function App({
  alertChannel,
  authClient = defaultAuthClient,
}: {
  alertChannel?: PushAlertChannel;
  authClient?: MobileAuthClient;
} = {}) {
  return (
    <>
      <StatusBar backgroundColor={captureColors.background} barStyle="dark-content" />
      <View style={styles.safeArea}>
        <MobileLaunchErrorBoundary>
          <AuthGate authClient={authClient}>
            {(session, authenticatedClient, authControls) => (
              <AuthenticatedCaptureApp
                alertChannel={alertChannel}
                authControls={authControls}
                authClient={authenticatedClient}
                session={session}
              />
            )}
          </AuthGate>
        </MobileLaunchErrorBoundary>
      </View>
    </>
  );
}

export class MobileLaunchErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(): void {
    // Keep the native app alive; detailed crash evidence must come from device logs.
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return <LaunchRecoveryScreen />;
    }

    return this.props.children;
  }
}

function AuthenticatedCaptureApp({
  alertChannel,
  authControls,
  authClient,
  session,
}: {
  alertChannel?: PushAlertChannel | undefined;
  authControls: AuthGateReadyControls;
  authClient: MobileAuthClient;
  session: SessionContextResponse;
}) {
  const apiBaseUrl = useMemo(() => configuredApiBaseUrl(), []);
  const buildInfo = useMemo(() => readMobileBuildInfo({ apiTarget: apiBaseUrl }), [apiBaseUrl]);
  const repositoryResult = useMemo(
    () =>
      createRepositorySafely({
        clock: () => new Date().toISOString(),
        createId: () => `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        searchCentralProducts: authClient.searchCentralProducts.bind(authClient),
        ...(authClient.listCentralCategories === undefined
          ? {}
          : { listCentralCategories: authClient.listCentralCategories.bind(authClient) }),
        createProductDraft: authClient.createProductDraft.bind(authClient),
        createCentralLot: authClient.createCentralLot.bind(authClient),
      }),
    [authClient],
  );
  const repository = repositoryResult.state === "ready" ? repositoryResult.repository : undefined;
  const [deviceInstallId, setDeviceInstallId] = useState<string | undefined>();
  const [deviceIdentityFailed, setDeviceIdentityFailed] = useState(false);
  const physicalDeviceId = useMemo(
    () =>
      deviceInstallId === undefined
        ? undefined
        : deviceIdForStore(session.store.storeId, deviceInstallId),
    [deviceInstallId, session.store.storeId],
  );

  useEffect(() => {
    let isActive = true;

    setDeviceInstallId(undefined);
    setDeviceIdentityFailed(false);

    if (repository === undefined) {
      return () => {
        isActive = false;
      };
    }

    if (repository.getOrCreateDeviceInstallId === undefined) {
      setDeviceIdentityFailed(true);

      return () => {
        isActive = false;
      };
    }

    void repository
      .getOrCreateDeviceInstallId()
      .then((installId) => {
        if (isActive) {
          setDeviceInstallId(installId);
        }
      })
      .catch(() => {
        if (isActive) {
          setDeviceIdentityFailed(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [repository]);

  const syncEngine = useMemo(() => {
    if (repository === undefined || physicalDeviceId === undefined) return undefined;

    return createSyncEngine({
      repository,
      network: createNetInfoNetworkStateProvider(),
      transport: createFetchSyncTransport({
        baseUrl: apiBaseUrl,
        storeId: session.store.storeId,
        storeName: session.store.storeName,
        headers: () => authClient.authHeaders(),
      }),
      createId: () => `sync-batch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      deviceId: physicalDeviceId,
    });
  }, [
    apiBaseUrl,
    authClient,
    physicalDeviceId,
    repository,
    session.store.storeId,
    session.store.storeName,
  ]);
  const prepareTurnClient = useMemo(() => authClient.prepareTurn.bind(authClient), [authClient]);
  const closeShiftClient = useMemo(() => authClient.closeShift.bind(authClient), [authClient]);
  const registerPushDeviceClient = useMemo(
    () =>
      authClient.registerPushDevice === undefined
        ? undefined
        : authClient.registerPushDevice.bind(authClient),
    [authClient],
  );

  if (repository === undefined || deviceIdentityFailed) {
    return <LaunchRecoveryScreen />;
  }

  if (physicalDeviceId === undefined) {
    return <DeviceIdentityLoadingScreen />;
  }

  return (
    <CaptureApp
      repository={repository}
      authControls={authControls}
      session={session}
      activeRole={session.activeRole}
      actorLabel={session.actor.displayName ?? "Pessoa da operacao"}
      storeId={session.store.storeId}
      deviceId={physicalDeviceId}
      buildInfo={buildInfo}
      syncEngine={syncEngine}
      prepareTurnClient={prepareTurnClient}
      closeShiftClient={closeShiftClient}
      {...(registerPushDeviceClient === undefined ? {} : { registerPushDeviceClient })}
      {...(alertChannel === undefined ? {} : { alertChannel })}
    />
  );
}

function createRepositorySafely(
  dependencies: CaptureRepositoryDependencies,
): { state: "ready"; repository: CaptureRepository } | { state: "failed" } {
  try {
    return {
      state: "ready",
      repository: createSQLiteCaptureRepository(dependencies),
    };
  } catch {
    return { state: "failed" };
  }
}

function DeviceIdentityLoadingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.recoveryScreen}>
      <ScreenHeader
        title="Preparando aparelho"
        body="Criando a identidade local desta instalacao para sincronizar com seguranca."
      />
      <StatusNotice title="Aparelho ainda nao identificado">
        Aguarde alguns segundos. Esta etapa separa este celular dos outros aparelhos da mesma loja.
      </StatusNotice>
    </ScrollView>
  );
}

function LaunchRecoveryScreen() {
  return (
    <ScrollView contentContainerStyle={styles.recoveryScreen}>
      <ScreenHeader
        title="Recuperar app neste aparelho"
        body="O Validade Zero nao conseguiu abrir a instalacao local deste aparelho."
      />
      <StatusNotice tone="critical" title="Instalacao local precisa ser limpa">
        Feche o app, limpe os dados do Validade Zero nos ajustes do Android e instale novamente o
        APK aprovado do piloto. As tarefas centrais continuam na loja; esta tela nao confirma nem
        resolve pendencias.
      </StatusNotice>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: captureColors.background,
    flex: 1,
    paddingTop: StatusBar.currentHeight ?? 0,
  },
  recoveryScreen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    justifyContent: "center",
    padding: captureSpacing.large,
  },
});
