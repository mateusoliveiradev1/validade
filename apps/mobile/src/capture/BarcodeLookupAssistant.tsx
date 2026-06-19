import { CameraView, useCameraPermissions } from "expo-camera";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { cameraFallbackCopy } from "./capture-copy";

export function BarcodeLookupAssistant({
  onLookup,
  onBack,
}: {
  onLookup: (value: string) => void;
  onBack: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  if (permission === undefined)
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Ler código" body="Preparando a câmera opcional." />
        <SecondaryAction label="Buscar manualmente" onPress={onBack} />
      </View>
    );
  if (permission === null || !permission.granted)
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title="Ler código"
          body="A câmera ajuda a localizar um produto; a confirmação continua manual."
        />
        <StatusNotice tone="error">{cameraFallbackCopy}</StatusNotice>
        <PrimaryAction label="Permitir câmera" onPress={() => void requestPermission()} />
        <SecondaryAction label="Buscar manualmente" onPress={onBack} />
      </View>
    );
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Ler código"
        body="A leitura apenas preenche a busca. Confirme o produto depois."
      />
      <CameraView style={styles.camera} onBarcodeScanned={({ data }) => onLookup(data)} />
      <Text style={styles.caption}>Se a câmera não funcionar, use Buscar manualmente.</Text>
      <SecondaryAction label="Buscar manualmente" onPress={onBack} />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { backgroundColor: "#F5F7EF", flex: 1, gap: 16, padding: 16 },
  camera: { minHeight: 240 },
  caption: { color: "#3F5546", fontSize: 14, lineHeight: 20 },
});
