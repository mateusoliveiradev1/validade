import { StatusBar, StyleSheet, View } from "react-native";
import { CaptureApp } from "./src/capture/CaptureApp";
import type { PushAlertChannel } from "./src/capture/alert-channel";
import { captureColors } from "./src/capture/capture-theme";
import { createSQLiteCaptureRepository } from "./src/capture/sqlite-repository";
import { AuthGate, createMobileAuthClient, type MobileAuthClient } from "./src/auth/AuthGate";

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
          {(session) => (
            <CaptureApp
              repository={repository}
              activeRole={session.activeRole}
              actorLabel={session.actor.displayName ?? "Pessoa da operacao"}
              storeId={session.store.storeId}
              {...(alertChannel === undefined ? {} : { alertChannel })}
            />
          )}
        </AuthGate>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: captureColors.background,
    flex: 1,
    paddingTop: StatusBar.currentHeight ?? 0,
  },
});
