import { CameraView, useCameraPermissions } from "expo-camera";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { cameraBlockedCopy, cameraFallbackCopy, cameraPermissionCopy } from "./capture-copy";

export function BarcodeLookupAssistant({
  onLookup,
  onBack,
}: {
  onLookup: (value: string) => void;
  onBack: () => void;
}) {
  const [mountError, setMountError] = useState<string | undefined>();
  const [permission, requestPermission] = useCameraPermissions();
  if (permission === undefined || permission === null)
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Ler código" body="Preparando a câmera opcional." />
        <SecondaryAction label="Buscar manualmente" onPress={onBack} />
      </View>
    );

  if (!permission.granted) {
    const blocked = permission.status === "denied" && permission.canAskAgain === false;

    return (
      <View style={styles.screen}>
        <ScreenHeader
          title="Ler código"
          body="A câmera ajuda a localizar um produto; a confirmação continua manual."
        />
        <StatusNotice tone={blocked ? "error" : "info"}>
          {blocked ? cameraBlockedCopy : cameraPermissionCopy}
        </StatusNotice>
        {blocked ? (
          <PrimaryAction
            label="Abrir configurações da câmera"
            onPress={() => void Linking.openSettings()}
          />
        ) : (
          <PrimaryAction label="Permitir câmera" onPress={() => void requestPermission()} />
        )}
        <SecondaryAction label="Buscar manualmente" onPress={onBack} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Ler código"
        body="A leitura apenas preenche a busca. Confirme o produto depois."
      />
      {mountError === undefined ? null : (
        <StatusNotice tone="error">{`${cameraFallbackCopy} Detalhe: ${mountError}`}</StatusNotice>
      )}
      <CameraView
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
        }}
        facing="back"
        onBarcodeScanned={({ data }) => onLookup(data)}
        onMountError={({ message }) => setMountError(message)}
        style={styles.camera}
      />
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
