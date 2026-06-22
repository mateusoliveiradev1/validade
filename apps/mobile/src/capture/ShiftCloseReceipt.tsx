import { StyleSheet, Text, View } from "react-native";
import type { ShiftClosureSnapshot } from "@validade-zero/contracts";
import type { ShiftCloseOutboxRecord } from "./repository";
import { PrimaryAction, SecondaryAction } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

export function ShiftCloseReceipt({
  closure,
  pendingUnsafeClose,
  onAcknowledgeHandoff,
  onBack,
}: {
  closure?: ShiftClosureSnapshot | undefined;
  pendingUnsafeClose?: ShiftCloseOutboxRecord | undefined;
  onAcknowledgeHandoff?: (() => void) | undefined;
  onBack: () => void;
}) {
  const isPending = pendingUnsafeClose !== undefined;
  const isSafe = closure?.verdict === "safe";
  const title = isPending
    ? "Fechamento inseguro salvo neste aparelho"
    : isSafe
      ? "Turno encerrado com área segura"
      : "Turno encerrado com pendências";
  const body = isPending
    ? "A passagem ainda aguarda sincronização. As tarefas e cobranças continuam ativas."
    : isSafe
      ? "A validação central confirmou o checklist e a ausência de bloqueios."
      : "A passagem foi registrada sem esconder as pendências operacionais.";
  const continuityOwner = pendingUnsafeClose?.request.continuityOwner ?? closure?.continuityOwner;
  const deadline = pendingUnsafeClose?.request.continuityDeadline ?? closure?.continuityDeadline;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.card, isSafe ? styles.safe : styles.unsafe]}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {continuityOwner === undefined ? null : (
        <Text style={styles.detail}>Continuidade: {continuityOwner}</Text>
      )}
      {deadline === undefined ? null : (
        <Text style={styles.detail}>Prazo: {formatTime(deadline)}</Text>
      )}
      {onAcknowledgeHandoff === undefined ? null : (
        <PrimaryAction label="Confirmar recebimento da passagem" onPress={onAcknowledgeHandoff} />
      )}
      <SecondaryAction label="Voltar para Hoje" onPress={onBack} />
    </View>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  card: {
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  safe: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
  },
  unsafe: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  title: {
    color: captureColors.ink,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  body: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  detail: {
    color: captureColors.mutedInk,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
});
