import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GPP_COPY } from "./gpp-copy";
import type { GppClient } from "./gpp-client";
import type { CaptureRepository } from "./repository";
import {
  GPP_PURCHASE_VALIDATION_COPY,
  GPP_QUANTITY_UNITS,
  buildGppPurchaseRequest,
  validateGppPurchaseDraft,
  type GppPurchaseDraft,
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

export function GppPurchaseFlow({
  client,
  repository,
  storeId = "loja-local",
  sector = "FLV",
  now = () => new Date().toISOString(),
  createIdempotencyKey = () => `gpp-purchase:${Date.now()}`,
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
  const [draft, setDraft] = useState<GppPurchaseDraft>({
    productName: "",
    productCode: "",
    quantity: "",
    finality: "",
  });
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });

  function continuePurchase(): void {
    const validation = validateGppPurchaseDraft(draft);
    if (validation !== undefined) {
      setError(GPP_PURCHASE_VALIDATION_COPY[validation]);
      return;
    }
    setError(undefined);
    setReviewing(true);
  }

  async function submitPurchase(): Promise<void> {
    const validation = validateGppPurchaseDraft(draft);
    if (validation !== undefined) {
      setError(GPP_PURCHASE_VALIDATION_COPY[validation]);
      return;
    }
    const request = buildGppPurchaseRequest({
      draft,
      storeId,
      sector,
      requestedAt: now(),
      idempotencyKey: createIdempotencyKey(),
    });
    setSubmission({ kind: "submitting" });
    const result =
      client === undefined
        ? {
            state: "central_failure" as const,
            message: "Cliente GPP indisponivel neste aparelho.",
          }
        : await client.createGppPurchaseRequest(request);
    if (result.state === "central_success") {
      setSubmission({
        kind: "central_confirmed",
        message:
          result.response.state === "replayed"
            ? "Registro ja confirmado na central"
            : "Solicitacao enviada para central",
      });
      return;
    }
    if (result.state === "offline_pending_candidate") {
      await repository.saveGppPending({ kind: "purchase", payload: request });
      setSubmission({ kind: "offline_pending", message: GPP_COPY.localPending });
      return;
    }
    setSubmission({ kind: "central_failed", message: result.message });
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Solicitar compra interna"
        body="Descreva o produto para o GPP localizar ou confirmar o codigo."
      />
      {submission.kind === "submitting" ? (
        <StatusNotice title="Enviando para central...">Aguarde a confirmacao.</StatusNotice>
      ) : null}
      {submission.kind === "central_confirmed" ? (
        <StatusNotice title={submission.message} tone="success">
          A compra interna foi recebida pelo Controle GPP central.
        </StatusNotice>
      ) : null}
      {submission.kind === "offline_pending" ? (
        <StatusNotice title={submission.message} tone="warning">
          A central ainda nao recebeu esta compra interna.
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
            label="Nome ou descricao do produto"
            onChangeText={(productName) => setDraft((current) => ({ ...current, productName }))}
            value={draft.productName}
          />
          <Field
            label="Codigo do produto (opcional)"
            onChangeText={(productCode) => setDraft((current) => ({ ...current, productCode }))}
            value={draft.productCode}
          />
          <Field
            keyboardType="numeric"
            label="Quantidade"
            onChangeText={(quantity) => setDraft((current) => ({ ...current, quantity }))}
            value={draft.quantity}
          />
          <View style={styles.section}>
            {GPP_QUANTITY_UNITS.map((unit) => (
              <SelectionRow
                key={unit}
                label={unit}
                onPress={() => setDraft((current) => ({ ...current, unit }))}
                selected={draft.unit === unit}
              />
            ))}
          </View>
          <Field
            label="Finalidade da compra interna"
            onChangeText={(finality) => setDraft((current) => ({ ...current, finality }))}
            value={draft.finality}
          />
          <PrimaryAction label="Continuar compra" onPress={continuePurchase} />
          <SecondaryAction label="Voltar para Controle GPP" onPress={onBack} />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.reviewTitle}>Revisar compra interna</Text>
          <Text style={styles.reviewLine}>Produto: {draft.productName}</Text>
          <Text style={styles.reviewLine}>
            Codigo:{" "}
            {draft.productCode.trim().length === 0 ? "opcional nao informado" : draft.productCode}
          </Text>
          <Text style={styles.reviewLine}>
            Quantidade: {draft.quantity} {draft.unit}
          </Text>
          <Text style={styles.reviewLine}>Finalidade: {draft.finality}</Text>
          <Text style={styles.reviewLine}>Setor solicitante: {sector}</Text>
          <StatusNotice title="Confirmacao central">
            Sucesso aparece somente depois que o Controle GPP central confirmar ou reconhecer
            replay.
          </StatusNotice>
          <PrimaryAction
            disabled={submission.kind === "submitting"}
            label="Enviar compra para central"
            onPress={() => void submitPurchase()}
          />
          <SecondaryAction label="Editar compra" onPress={() => setReviewing(false)} />
          <SecondaryAction label="Voltar para Controle GPP" onPress={onBack} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { gap: captureSpacing.large, padding: captureSpacing.large },
  section: { gap: captureSpacing.medium },
  reviewTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  reviewLine: { color: captureColors.ink, fontSize: 16, lineHeight: 24 },
});
