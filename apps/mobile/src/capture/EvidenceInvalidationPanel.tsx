import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Field, PrimaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

export function EvidenceInvalidationPanel({
  canInvalidate,
  evidenceLabel,
  replacementAssetId,
  onInvalidate,
  disabled = false,
}: {
  canInvalidate: boolean;
  evidenceLabel: string;
  replacementAssetId?: string | undefined;
  onInvalidate: (input: { reason: string; replacementAssetId?: string | undefined }) => void;
  disabled?: boolean | undefined;
}) {
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();
  const canSubmit = canInvalidate && !disabled && trimmedReason.length > 0;

  if (!canInvalidate) {
    return (
      <StatusNotice tone="error">
        Apenas liderança autorizada pode invalidar uma evidência.
      </StatusNotice>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Invalidar evidência</Text>
      <Text style={styles.body}>
        {evidenceLabel}. A evidência original continuará no histórico com autoria, horário, hash e
        alvo preservados.
      </Text>
      {replacementAssetId === undefined ? null : (
        <Text style={styles.body}>Substituição vinculada: {replacementAssetId}</Text>
      )}
      <Field
        label="Motivo da invalidação"
        value={reason}
        onChangeText={setReason}
        placeholder="Ex.: foto desfocada, produto fora do enquadramento"
      />
      <PrimaryAction
        disabled={!canSubmit}
        label="Invalidar evidência"
        onPress={() =>
          onInvalidate({
            reason: trimmedReason,
            ...(replacementAssetId === undefined ? {} : { replacementAssetId }),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  title: {
    color: captureColors.critical,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  body: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
});
