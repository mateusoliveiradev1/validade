import { View, Text, StyleSheet } from "react-native";
import { PrimaryAction, SecondaryAction } from "./capture-ui";

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
  sheet: { backgroundColor: "#E6EEE4", gap: 16, padding: 16 },
  title: { color: "#112016", fontSize: 20, fontWeight: "600", lineHeight: 25 },
  body: { color: "#112016", fontSize: 16, lineHeight: 24 },
});
