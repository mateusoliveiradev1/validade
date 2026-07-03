import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GPP_COPY } from "./gpp-copy";
import type { GppClient } from "./gpp-client";
import type { CaptureRepository } from "./repository";
import {
  GPP_AVARIA_FINALITIES,
  GPP_AVARIA_VALIDATION_COPY,
  GPP_QUANTITY_UNITS,
  buildGppAvariaRequest,
  validateGppAvariaDraft,
  type GppAvariaDraft,
} from "./gpp-flow-state";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";
import { captureColors, captureSpacing } from "./capture-theme";

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
    destination: "",
  });
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const selectedFinalityLabel = useMemo(
    () => GPP_AVARIA_FINALITIES.find((option) => option.value === draft.finality)?.label,
    [draft.finality],
  );

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
    const request = buildGppAvariaRequest({
      draft,
      storeId,
      sector,
      occurredAt: now(),
      idempotencyKey: createIdempotencyKey(),
    });
    setSubmission({ kind: "submitting" });
    const result =
      client === undefined
        ? {
            state: "central_failure" as const,
            message: "Cliente GPP indisponivel neste aparelho.",
          }
        : await client.createGppAvaria(request);
    if (result.state === "central_success") {
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
        body="Comece pelo codigo do produto. A central confirma o que foi recebido."
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
        <View style={styles.section}>
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
          <View style={styles.optionGrid}>
            {GPP_QUANTITY_UNITS.map((unit) => (
              <SelectionRow
                key={unit}
                label={unit}
                onPress={() => setDraft((current) => ({ ...current, unit }))}
                selected={draft.unit === unit}
              />
            ))}
          </View>
          <View style={styles.section}>
            {GPP_AVARIA_FINALITIES.map((option) => (
              <SelectionRow
                key={option.value}
                label={option.label}
                onPress={() => setDraft((current) => ({ ...current, finality: option.value }))}
                selected={draft.finality === option.value}
              />
            ))}
          </View>
          <Field
            label="Destino"
            onChangeText={(destination) => setDraft((current) => ({ ...current, destination }))}
            value={draft.destination}
          />
          <PrimaryAction label="Continuar avaria" onPress={continueAvaria} />
          <SecondaryAction label="Voltar para Controle GPP" onPress={onBack} />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.reviewTitle}>Revisar avaria</Text>
          <Text style={styles.reviewLine}>Codigo: {draft.productCode}</Text>
          <Text style={styles.reviewLine}>Produto: {draft.productName || draft.productCode}</Text>
          <Text style={styles.reviewLine}>
            Quantidade: {draft.quantity} {draft.unit}
          </Text>
          <Text style={styles.reviewLine}>Finalidade: {selectedFinalityLabel}</Text>
          <Text style={styles.reviewLine}>Destino: {draft.destination}</Text>
          <StatusNotice title="Confirmacao central">
            Sucesso aparece somente depois que o Controle GPP central confirmar ou reconhecer
            replay.
          </StatusNotice>
          <PrimaryAction
            disabled={submission.kind === "submitting"}
            label="Enviar avaria para central"
            onPress={() => void submitAvaria()}
          />
          <SecondaryAction label="Editar avaria" onPress={() => setReviewing(false)} />
          <SecondaryAction label="Voltar para Controle GPP" onPress={onBack} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  section: {
    gap: captureSpacing.medium,
  },
  optionGrid: {
    gap: captureSpacing.small,
  },
  reviewTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  reviewLine: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
});
