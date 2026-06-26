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

const repository = createSQLiteCaptureRepository({
  clock: () => new Date().toISOString(),
  createId: () => `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
});

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
          {(session) => <AuthenticatedCaptureApp alertChannel={alertChannel} session={session} />}
        </AuthGate>
      </View>
    </>
  );
}

function AuthenticatedCaptureApp({
  alertChannel,
  session,
}: {
  alertChannel?: PushAlertChannel | undefined;
  session: SessionContextResponse;
}) {
  const syncEngine = useMemo(
    () =>
      createSyncEngine({
        repository,
        network: createNetInfoNetworkStateProvider(),
        transport: createFetchSyncTransport({
          baseUrl: configuredApiBaseUrl(),
          storeId: session.store.storeId,
          storeName: session.store.storeName,
        }),
        createId: () => `sync-batch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        deviceId: `validade-zero-mobile:${session.store.storeId}`,
      }),
    [session.store.storeId, session.store.storeName],
  );

  return (
    <CaptureApp
      repository={repository}
      activeRole={session.activeRole}
      actorLabel={session.actor.displayName ?? "Pessoa da operacao"}
      storeId={session.store.storeId}
      syncEngine={syncEngine}
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
