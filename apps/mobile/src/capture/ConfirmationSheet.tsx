import { View, Text, StyleSheet } from "react-native";
import { PrimaryAction, SecondaryAction } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

export function ConfirmationSheet({
  summary,
  title = "Confirme antes de registrar",
  confirmLabel = "Confirmar registro",
  backLabel = "Voltar e revisar",
  onConfirm,
  onBack,
}: {
  summary: string;
  title?: string;
  confirmLabel?: string;
  backLabel?: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{summary}</Text>
      <PrimaryAction label={confirmLabel} onPress={onConfirm} />
      <SecondaryAction label={backLabel} onPress={onBack} />
    </View>
  );
}
const styles = StyleSheet.create({
  sheet: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  title: { color: captureColors.ink, fontSize: 20, fontWeight: "600", lineHeight: 25 },
  body: { color: captureColors.ink, fontSize: 16, lineHeight: 24 },
});
