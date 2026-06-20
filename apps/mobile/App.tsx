import { StatusBar, StyleSheet, View } from "react-native";
import { CaptureApp } from "./src/capture/CaptureApp";
import type { PushAlertChannel } from "./src/capture/alert-channel";
import { captureColors } from "./src/capture/capture-theme";
import { createSQLiteCaptureRepository } from "./src/capture/sqlite-repository";

const repository = createSQLiteCaptureRepository({
  clock: () => new Date().toISOString(),
  createId: () => `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
});

export default function App({ alertChannel }: { alertChannel?: PushAlertChannel } = {}) {
  return (
    <>
      <StatusBar backgroundColor={captureColors.background} barStyle="dark-content" />
      <View style={styles.safeArea}>
        <CaptureApp
          repository={repository}
          {...(alertChannel === undefined ? {} : { alertChannel })}
        />
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
