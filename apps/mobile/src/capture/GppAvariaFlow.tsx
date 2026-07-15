import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GPP_COPY } from "./gpp-copy";
import type { GppClient } from "./gpp-client";
import type { CaptureRepository } from "./repository";
import {
  GPP_AVARIA_FINALITIES,
  GPP_AVARIA_VALIDATION_COPY,
  GPP_QUANTITY_UNITS,
  buildGppAvariaRequest,
  gppAvariaDestinationForFinality,
  validateGppAvariaDraft,
  type GppAvariaDraft,
} from "./gpp-flow-state";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  ScreenSection,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "central_confirmed"; message: string }
  | { kind: "offline_pending"; message: string }
  | { kind: "central_failed"; message: string };

export function GppAvariaFlow({
  client,
  repository,
  storeId = "loja-local",
  sector = "FLV",
  now = () => new Date().toISOString(),
  createIdempotencyKey = () => `gpp-avaria:${Date.now()}`,
  onBack,
}: {
  client?: GppClient | undefined;
  repository: CaptureRepository;
  storeId?: string | undefined;
  sector?: string | undefined;
  now?: () => string;
  createIdempotencyKey?: () => string;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<GppAvariaDraft>({
    productCode: "",
    productName: "",
    quantity: "",
    finality: "baixa_gpp",
    destination: "Controle GPP",
  });
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const selectedFinalityLabel = useMemo(
    () => GPP_AVARIA_FINALITIES.find((option) => option.value === draft.finality)?.label,
    [draft.finality],
  );
  const selectedDestination =
    draft.finality === undefined ? undefined : gppAvariaDestinationForFinality(draft.finality);
  const submissionIsTerminal =
    submission.kind === "offline_pending" || submission.kind === "central_confirmed";

  function continueAvaria(): void {
    const validation = validateGppAvariaDraft(draft);
    if (validation !== undefined) {
      setError(GPP_AVARIA_VALIDATION_COPY[validation]);
      return;
    }
    setError(undefined);
    setReviewing(true);
  }

  async function submitAvaria(): Promise<void> {
    const validation = validateGppAvariaDraft(draft);
    if (validation !== undefined) {
      setError(GPP_AVARIA_VALIDATION_COPY[validation]);
      return;
    }
    const submittedAt = now();
    const request = buildGppAvariaRequest({
      draft,
      storeId,
      sector,
      occurredAt: submittedAt,
      idempotencyKey: createIdempotencyKey(),
    });
    setSubmission({ kind: "submitting" });
    if (client === undefined) {
      await repository.saveGppPending({ kind: "avaria", payload: request });
      setSubmission({ kind: "offline_pending", message: GPP_COPY.localPending });
      return;
    }

    const result = await client.createGppAvaria(request);
    if (result.state === "central_success") {
      const sentRecord = await repository.saveGppPending({ kind: "avaria", payload: request });
      await repository.markGppPendingConfirmed({
        localId: sentRecord.localId,
        confirmedAt:
          result.response.state === "replayed"
            ? result.response.replayedAt
            : result.response.confirmedAt,
        centralRequestId: result.response.requestId,
      });
      setSubmission({
        kind: "central_confirmed",
        message:
          result.response.state === "replayed"
            ? "Registro ja confirmado na central"
            : "Registrado na central",
      });
      return;
    }
    if (result.state === "offline_pending_candidate") {
      await repository.saveGppPending({ kind: "avaria", payload: request });
      setSubmission({ kind: "offline_pending", message: GPP_COPY.localPending });
      return;
    }
    setSubmission({ kind: "central_failed", message: result.message });
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Registrar avaria"
        body="Registre o que o setor encontrou. Sucesso so aparece depois da confirmacao central."
      />

      {submission.kind === "submitting" ? (
        <StatusNotice title="Enviando para central..." tone="info">
          Aguarde a confirmacao antes de sair desta tela.
        </StatusNotice>
      ) : null}
      {submission.kind === "central_confirmed" ? (
        <StatusNotice title={submission.message} tone="success">
          A avaria foi recebida pelo Controle GPP central.
        </StatusNotice>
      ) : null}
      {submission.kind === "offline_pending" ? (
        <StatusNotice title={submission.message} tone="warning">
          A central ainda nao recebeu esta avaria. Ela ficara visivel para retry.
        </StatusNotice>
      ) : null}
      {submission.kind === "central_failed" ? (
        <StatusNotice title="Controle GPP recusou o envio" tone="critical">
          {submission.message}
        </StatusNotice>
      ) : null}
      {error === undefined ? null : <StatusNotice tone="critical">{error}</StatusNotice>}

      {!reviewing ? (
        <ScreenSection
          title="Produto e quantidade"
          body="Codigo, descricao, quantidade e unidade ficam no mesmo bloco para evitar envio ambiguo."
        >
          <Field
            label="Codigo do produto"
            onChangeText={(productCode) => setDraft((current) => ({ ...current, productCode }))}
            value={draft.productCode}
          />
          <Field
            label="Nome ou descricao"
            onChangeText={(productName) => setDraft((current) => ({ ...current, productName }))}
            value={draft.productName}
          />
          <Field
            keyboardType="numeric"
            label="Quantidade"
            onChangeText={(quantity) => setDraft((current) => ({ ...current, quantity }))}
            value={draft.quantity}
          />
          <View style={styles.compactSection}>
            <Text style={styles.sectionLabel}>Unidade da avaria</Text>
            <View style={styles.unitGrid}>
              {GPP_QUANTITY_UNITS.map((unit) => (
                <CompactChoice
                  key={unit}
                  label={unit}
                  onPress={() => setDraft((current) => ({ ...current, unit }))}
                  selected={draft.unit === unit}
                />
              ))}
            </View>
          </View>
          <View style={styles.compactSection}>
            <Text style={styles.sectionLabel}>O que o GPP precisa fazer?</Text>
            <Text style={styles.sectionHint}>
              O destino e automatico; escolha so a finalidade operacional.
            </Text>
            {GPP_AVARIA_FINALITIES.map((option) => (
              <SelectionRow
                key={option.value}
                detail={`Encaminha para ${option.destination} - destino automatico`}
                label={option.label}
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    finality: option.value,
                    destination: option.destination,
                  }))
                }
                selected={draft.finality === option.value}
              />
            ))}
          </View>
          <PrimaryAction label="Continuar avaria" onPress={continueAvaria} />
          <SecondaryAction label="Voltar para Controle GPP" onPress={onBack} />
        </ScreenSection>
      ) : (
        <ScreenSection
          title="Revisar avaria"
          body="Confira produto, quantidade e encaminhamento antes de enviar ao Controle GPP."
        >
          <View style={styles.reviewPanel}>
            <ReviewLine label="Codigo" value={draft.productCode} />
            <ReviewLine label="Produto" value={draft.productName || draft.productCode} />
            <ReviewLine label="Quantidade" value={`${draft.quantity} ${draft.unit}`} />
            <ReviewLine label="Finalidade" value={selectedFinalityLabel ?? "Baixa GPP"} />
            <ReviewLine label="Encaminhamento" value={selectedDestination ?? "Controle GPP"} />
          </View>

          {submission.kind === "offline_pending" ? (
            <StatusNotice title="Proximo passo" tone="warning">
              Volte ao Controle GPP para sincronizar as pendencias quando a internet voltar.
            </StatusNotice>
          ) : submission.kind === "central_confirmed" ? (
            <StatusNotice title="Proximo passo" tone="success">
              A central ja recebeu esta avaria. Voce pode voltar ao Controle GPP.
            </StatusNotice>
          ) : (
            <StatusNotice title="Confirmacao central">
              Sucesso aparece somente depois que o Controle GPP central confirmar ou reconhecer
              replay.
            </StatusNotice>
          )}

          {submissionIsTerminal ? (
            <PrimaryAction label="Voltar para Controle GPP" onPress={onBack} />
          ) : (
            <PrimaryAction
              disabled={submission.kind === "submitting"}
              label={
                submission.kind === "central_failed"
                  ? "Tentar enviar novamente"
                  : "Enviar avaria para central"
              }
              onPress={() => void submitAvaria()}
            />
          )}
          {submissionIsTerminal ? null : (
            <SecondaryAction label="Editar avaria" onPress={() => setReviewing(false)} />
          )}
          {submissionIsTerminal ? null : (
            <SecondaryAction label="Voltar sem enviar" onPress={onBack} />
          )}
        </ScreenSection>
      )}
    </ScrollView>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

function CompactChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      android_ripple={{ color: captureColors.surfacePressed }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.unitChoice, selected ? styles.unitChoiceSelected : undefined]}
    >
      <Text style={[styles.unitChoiceLabel, selected ? styles.unitChoiceLabelSelected : undefined]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
    paddingBottom: captureSpacing.xxlarge * 3,
  },
  section: {
    gap: captureSpacing.medium,
  },
  reviewSection: {
    gap: captureSpacing.medium,
  },
  compactSection: {
    gap: captureSpacing.small,
  },
  sectionLabel: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  sectionHint: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  unitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
  },
  unitChoice: {
    alignItems: "center",
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: captureSpacing.medium,
    paddingVertical: captureSpacing.small,
  },
  unitChoiceSelected: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
  },
  unitChoiceLabel: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  unitChoiceLabelSelected: {
    color: captureColors.accent,
  },
  reviewTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  reviewPanel: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.medium,
  },
  reviewRow: {
    gap: captureSpacing.xsmall,
  },
  reviewLabel: {
    color: captureColors.mutedInk,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  reviewValue: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
});
