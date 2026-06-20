import { StatusBar, StyleSheet, View } from "react-native";
import { CaptureApp } from "./src/capture/CaptureApp";
import { captureColors } from "./src/capture/capture-theme";
import { createSQLiteCaptureRepository } from "./src/capture/sqlite-repository";

const repository = createSQLiteCaptureRepository({
  clock: () => new Date().toISOString(),
  createId: () => `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
});

export default function App() {
  return (
    <>
      <StatusBar backgroundColor={captureColors.background} barStyle="dark-content" />
      <View style={styles.safeArea}>
        <CaptureApp repository={repository} />
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
