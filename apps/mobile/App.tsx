import { useMemo } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import type { SessionContextResponse } from "@validade-zero/contracts";
import { CaptureApp } from "./src/capture/CaptureApp";
import type { PushAlertChannel } from "./src/capture/alert-channel";
import { captureColors } from "./src/capture/capture-theme";
import { createSQLiteCaptureRepository } from "./src/capture/sqlite-repository";
import {
  AuthGate,
  configuredApiBaseUrl,
  createMobileAuthClient,
  type MobileAuthClient,
} from "./src/auth/AuthGate";
import { createFetchSyncTransport } from "./src/capture/http-sync-transport";
import { createNetInfoNetworkStateProvider } from "./src/capture/network-state";
import { createSyncEngine } from "./src/capture/sync-engine";
import { readMobileBuildInfo } from "./src/build-info";

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
        <AuthGate authClient={authClient}>
          {(session, authenticatedClient) => (
            <AuthenticatedCaptureApp
              alertChannel={alertChannel}
              authClient={authenticatedClient}
              session={session}
            />
          )}
        </AuthGate>
      </View>
    </>
  );
}

function AuthenticatedCaptureApp({
  alertChannel,
  authClient,
  session,
}: {
  alertChannel?: PushAlertChannel | undefined;
  authClient: MobileAuthClient;
  session: SessionContextResponse;
}) {
  const apiBaseUrl = useMemo(() => configuredApiBaseUrl(), []);
  const buildInfo = useMemo(() => readMobileBuildInfo({ apiTarget: apiBaseUrl }), [apiBaseUrl]);
  const repository = useMemo(
    () =>
      createSQLiteCaptureRepository({
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
  const syncEngine = useMemo(
    () =>
      createSyncEngine({
        repository,
        network: createNetInfoNetworkStateProvider(),
        transport: createFetchSyncTransport({
          baseUrl: apiBaseUrl,
          storeId: session.store.storeId,
          storeName: session.store.storeName,
          headers: () => authClient.authHeaders(),
        }),
        createId: () => `sync-batch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        deviceId: `validade-zero-mobile:${session.store.storeId}`,
      }),
    [apiBaseUrl, authClient, repository, session.store.storeId, session.store.storeName],
  );
  const prepareTurnClient = useMemo(() => authClient.prepareTurn.bind(authClient), [authClient]);
  const closeShiftClient = useMemo(() => authClient.closeShift.bind(authClient), [authClient]);

  return (
    <CaptureApp
      repository={repository}
      activeRole={session.activeRole}
      actorLabel={session.actor.displayName ?? "Pessoa da operacao"}
      storeId={session.store.storeId}
      buildInfo={buildInfo}
      syncEngine={syncEngine}
      prepareTurnClient={prepareTurnClient}
      closeShiftClient={closeShiftClient}
      {...(alertChannel === undefined ? {} : { alertChannel })}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: captureColors.background,
    flex: 1,
    paddingTop: StatusBar.currentHeight ?? 0,
  },
});
