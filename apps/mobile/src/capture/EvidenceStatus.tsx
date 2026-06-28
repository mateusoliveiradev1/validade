import { StyleSheet, Text, View } from "react-native";
import type { EvidenceUploadQueueRecord } from "./repository";
import { SecondaryAction } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

export type EvidenceLifecycleState = EvidenceUploadQueueRecord["state"];

export function EvidenceStatus({
  evidence,
  onRetry,
}: {
  evidence: Pick<
    EvidenceUploadQueueRecord,
    "localEvidenceId" | "state" | "updatedAt" | "lastError" | "uploadedAt"
  >;
  onRetry?: ((localEvidenceId: string) => void) | undefined;
}) {
  const copy = evidenceStatusCopy(evidence.state);
  const canRetry = evidence.state === "failed" && onRetry !== undefined;

  return (
    <View
      accessibilityLabel={`Status da evidência: ${copy.label}`}
      style={[
        styles.container,
        copy.tone === "warning" ? styles.warning : undefined,
        copy.tone === "critical" ? styles.critical : undefined,
        copy.tone === "success" ? styles.success : undefined,
      ]}
    >
      <Text style={[styles.label, copy.tone === "critical" ? styles.criticalText : undefined]}>
        {copy.label}
      </Text>
      <Text style={styles.body}>{copy.body}</Text>
      {evidence.lastError === undefined ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {evidence.lastError}
        </Text>
      )}
      <Text style={styles.meta}>
        {evidence.uploadedAt === undefined
          ? `Atualizado em ${formatEvidenceTime(evidence.updatedAt)}`
          : `Enviada em ${formatEvidenceTime(evidence.uploadedAt)}`}
      </Text>
      {canRetry ? (
        <SecondaryAction
          label="Tentar enviar novamente"
          onPress={() => onRetry(evidence.localEvidenceId)}
        />
      ) : null}
    </View>
  );
}

export function evidenceStatusCopy(state: EvidenceLifecycleState): {
  label: string;
  body: string;
  tone: "neutral" | "warning" | "critical" | "success";
} {
  if (state === "waiting_upload") {
    return {
      label: "Aguardando envio",
      body: "Foto salva apenas neste aparelho. Ainda não é prova central disponível.",
      tone: "warning",
    };
  }

  if (state === "uploading") {
    return {
      label: "Enviando evidência",
      body: "Aguardando confirmação do armazenamento privado.",
      tone: "warning",
    };
  }

  if (state === "uploaded") {
    return {
      label: "Evidência enviada",
      body: "Armazenamento central confirmou o arquivo privado.",
      tone: "success",
    };
  }

  if (state === "failed") {
    return {
      label: "Falha no envio",
      body: "A foto continua salva neste aparelho e pode ser reenviada.",
      tone: "critical",
    };
  }

  if (state === "invalidated") {
    return {
      label: "Evidência invalidada",
      body: "O histórico foi preservado, mas esta evidência não deve ser usada como prova atual.",
      tone: "critical",
    };
  }

  return {
    label: "Arquivo expirado",
    body: "O arquivo venceu pela política de retenção; os metadados seguem no histórico.",
    tone: "neutral",
  };
}

function formatEvidenceTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
  },
  warning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  critical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  success: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
  },
  label: {
    color: captureColors.ink,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  body: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: captureColors.critical,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  criticalText: {
    color: captureColors.critical,
  },
});
