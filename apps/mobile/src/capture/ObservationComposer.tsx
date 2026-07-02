import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { OperationalLocation, PhysicalObservationInput } from "@validade-zero/contracts";
import type { CaptureLotDetail, CaptureRepository } from "./repository";
import { actionLabel, formatQuantity } from "./RecentLotList";
import {
  formatLocation,
  observationActions,
  operationalLocations,
  requiredFieldError,
} from "./capture-copy";
import { ConfirmationSheet } from "./ConfirmationSheet";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";

type Action = (typeof observationActions)[number][0];

export function ObservationComposer({
  repository,
  detail,
  onAfterSave,
  onDone,
  onBack,
}: {
  repository: CaptureRepository;
  detail: CaptureLotDetail;
  onAfterSave?: () => Promise<void> | void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [action, setAction] = useState<Action | undefined>();
  const [quantity, setQuantity] = useState(
    detail.currentObservation.quantityState === "estimated"
      ? String(detail.currentObservation.approximateQuantity)
      : "",
  );
  const [quantityConfirmed, setQuantityConfirmed] = useState(false);
  const [quantityReviewAttempted, setQuantityReviewAttempted] = useState(false);
  const [notEstimable, setNotEstimable] = useState(false);
  const [destination, setDestination] = useState<OperationalLocation | undefined>();
  const [correction, setCorrection] = useState(false);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const needsQuantity = action === "present" || action === "moved";
  const canAppend =
    action !== undefined &&
    (!needsQuantity || notEstimable || (quantityConfirmed && validQuantity(quantity))) &&
    (action !== "moved" || destination !== undefined) &&
    (!correction || reason.trim().length > 0);
  const currentLocation = detail.currentObservation.location;

  function selectAction(nextAction: Action): void {
    setAction(nextAction);
    setQuantityConfirmed(false);
    setNotEstimable(false);
    setQuantityReviewAttempted(false);
  }

  function updateQuantity(value: string): void {
    setQuantity(value);
    setQuantityConfirmed(false);
    setQuantityReviewAttempted(false);
  }

  function confirmQuantity(): void {
    if (!validQuantity(quantity)) {
      setQuantityReviewAttempted(true);
      return;
    }
    setQuantityConfirmed((confirmed) => !confirmed);
  }

  function toggleNotEstimable(): void {
    setNotEstimable((value) => !value);
    setQuantityConfirmed(false);
    setQuantityReviewAttempted(false);
  }

  function submit(): void {
    if (submitting) {
      return;
    }
    if (!canAppend || action === undefined) {
      setError("Revise os campos destacados antes de registrar a observação.");
      return;
    }
    if (
      action === "withdrawn" ||
      action === "loss" ||
      action === "not_found" ||
      action === "probably_sold_out"
    ) {
      setConfirming(true);
    } else {
      void append();
    }
  }
  async function append(): Promise<void> {
    if (action === undefined || submitting) return;
    setSubmitting(true);
    setError(undefined);
    const location = action === "moved" ? destination! : currentLocation;
    const input: PhysicalObservationInput = {
      status: action,
      actorLabel: "Colaborador local",
      occurredAt: new Date().toISOString(),
      location,
      ...(notEstimable
        ? { quantityState: "not_estimable" as const }
        : { quantityState: "estimated" as const, approximateQuantity: Number(quantity) }),
      isCorrection: correction,
      ...(correction ? { correctionReason: reason } : {}),
    };
    try {
      await repository.appendObservation(detail.id, input);
      onDone();
      void Promise.resolve(onAfterSave?.()).catch(() => undefined);
    } catch {
      setSubmitting(false);
      setConfirming(false);
      setError("Não foi possível salvar agora. Tente novamente em instantes.");
    }
  }
  if (confirming && action !== undefined)
    return (
      <ConfirmationSheet
        summary={`${detail.productDisplayName} — lote ${detail.identity.value}. ${actionLabel(action)} em ${formatLocation(action === "moved" ? destination! : currentLocation)}, ${notEstimable ? "Não foi possível estimar" : `${quantity} unidades`}.`}
        confirmLabel={submitting ? "Salvando..." : "Confirmar registro"}
        confirmDisabled={submitting}
        backDisabled={submitting}
        onConfirm={() => void append()}
        onBack={() => setConfirming(false)}
      />
    );
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Registrar observação"
        body={`${detail.productDisplayName} — lote ${detail.identity.value}`}
      />
      <Text style={styles.metadata}>Última quantidade: {formatQuantity(detail)}</Text>
      {observationActions.map(([value, label]) => (
        <SelectionRow
          key={value}
          label={label}
          selected={action === value}
          onPress={() => selectAction(value)}
        />
      ))}
      {needsQuantity ? (
        <>
          <Field
            label="Quantidade confirmada"
            value={quantity}
            onChangeText={updateQuantity}
            keyboardType="numeric"
            error={
              quantityReviewAttempted && !notEstimable && !validQuantity(quantity)
                ? requiredFieldError("a quantidade confirmada")
                : undefined
            }
          />
          {!notEstimable && !quantityConfirmed && validQuantity(quantity) ? (
            <Text style={styles.hint}>
              Confira a quantidade e toque em "Confirmar quantidade informada" para continuar.
            </Text>
          ) : null}
          <SelectionRow
            label="Confirmar quantidade informada"
            selected={quantityConfirmed}
            onPress={confirmQuantity}
          />
          <SelectionRow
            label="Não foi possível estimar"
            selected={notEstimable}
            onPress={toggleNotEstimable}
          />
        </>
      ) : null}
      {action === "moved" ? (
        <View style={styles.group}>
          <Text style={styles.label}>Destino do lote</Text>
          {operationalLocations.slice(0, 5).map((option) => (
            <SelectionRow
              key={option.kind}
              label={option.label}
              selected={destination?.kind === option.kind}
              onPress={() => setDestination({ kind: option.kind } as OperationalLocation)}
            />
          ))}
          {destination === undefined ? (
            <Text style={styles.error}>{requiredFieldError("o destino")}</Text>
          ) : null}
        </View>
      ) : null}
      <SecondaryAction
        label="Corrigir última observação"
        onPress={() => setCorrection(!correction)}
      />
      {correction ? (
        <Field
          label="Motivo da correção"
          value={reason}
          onChangeText={setReason}
          error={reason.trim() === "" ? requiredFieldError("o motivo da correção") : undefined}
        />
      ) : null}
      {error === undefined ? null : <StatusNotice tone="error">{error}</StatusNotice>}
      <PrimaryAction
        label={submitting ? "Salvando..." : "Registrar observação"}
        disabled={!canAppend || submitting}
        onPress={submit}
      />
      <SecondaryAction label="Voltar e revisar" disabled={submitting} onPress={onBack} />
    </ScrollView>
  );
}
function validQuantity(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}
const styles = StyleSheet.create({
  screen: { backgroundColor: "#F5F7EF", gap: 16, padding: 16 },
  metadata: { color: "#3F5546", fontSize: 14, lineHeight: 20 },
  hint: { color: "#3F5546", fontSize: 14, lineHeight: 20 },
  group: { gap: 8 },
  label: { color: "#112016", fontSize: 14, fontWeight: "600", lineHeight: 20 },
  error: { color: "#B42318", fontSize: 14, lineHeight: 20 },
});
