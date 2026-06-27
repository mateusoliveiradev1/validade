import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { AuditTimelineItem } from "@validade-zero/contracts";
import type { MarkdownRequestReason } from "@validade-zero/domain";
import { AuditTimeline } from "./AuditTimeline";
import type { CaptureLotDetail, MarkdownEntryState } from "./repository";
import { actionLabel, centralStateLabel, formatQuantity } from "./RecentLotList";
import { formatLocation, formatObservationTimestamp } from "./capture-copy";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";
import { todayCopy } from "./today-copy";

type EarlyMarkdownReason = Exclude<MarkdownRequestReason, "rule_window">;

const earlyReasonLabels = {
  excess_stock: "Excesso",
  quality_issue: "Qualidade ruim",
  package_damage: "Embalagem afetada",
  operational_guidance: "Orientacao operacional",
  other: "Outro",
} as const satisfies Record<EarlyMarkdownReason, string>;

export interface LotDetailMarkdownRequest {
  reason: MarkdownRequestReason;
  earlyJustification?: string;
}

export function LotDetailScreen({
  detail,
  markdownEntryState,
  onObserve,
  onRequestMarkdown,
  onOpenActiveMarkdown,
  onBack,
  auditEvents = [],
}: {
  detail: CaptureLotDetail;
  markdownEntryState?: MarkdownEntryState | undefined;
  onObserve: () => void;
  onRequestMarkdown?: (request: LotDetailMarkdownRequest) => Promise<void> | void;
  onOpenActiveMarkdown?: (() => void) | undefined;
  onBack: () => void;
  auditEvents?: readonly AuditTimelineItem[] | undefined;
}) {
  const [selectedReason, setSelectedReason] = useState<EarlyMarkdownReason | undefined>();
  const [earlyJustification, setEarlyJustification] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const observation = detail.currentObservation;

  async function requestRuleWindowMarkdown(): Promise<void> {
    if (onRequestMarkdown === undefined) {
      return;
    }

    setSubmitting(true);
    setError(undefined);

    try {
      await onRequestMarkdown({ reason: "rule_window" });
    } catch {
      setError(todayCopy.markdown.missingWorkflow);
    } finally {
      setSubmitting(false);
    }
  }

  async function requestEarlyMarkdown(): Promise<void> {
    if (onRequestMarkdown === undefined) {
      return;
    }

    const trimmedJustification = earlyJustification.trim();

    if (selectedReason === undefined || trimmedJustification.length === 0) {
      setError(todayCopy.markdown.earlyReasonLabel);
      return;
    }

    setSubmitting(true);
    setError(undefined);

    try {
      await onRequestMarkdown({
        reason: selectedReason,
        earlyJustification: trimmedJustification,
      });
    } catch {
      setError(todayCopy.markdown.missingWorkflow);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={detail.productDisplayName} body={`Lote ${detail.identity.value}`} />
      <Text style={styles.metadata}>Local atual: {formatLocation(observation.location)}</Text>
      <Text style={styles.metadata}>Ultima acao: {actionLabel(observation.status)}</Text>
      <Text style={styles.metadata}>
        Registrado por {observation.actorLabel} em{" "}
        {formatObservationTimestamp(observation.occurredAt)}
      </Text>
      <Text style={styles.metadata}>{formatQuantity(detail)}</Text>
      <Text style={styles.metadata}>Estado central: {centralStateLabel(detail)}</Text>
      {detail.centralAcknowledgementMessage === undefined ? null : (
        <Text style={styles.metadata}>{detail.centralAcknowledgementMessage}</Text>
      )}
      {observation.status === "not_found" || observation.status === "probably_sold_out" ? (
        <StatusNotice>
          Presenca incerta: confirme fisicamente este lote antes de trata-lo como seguro.
        </StatusNotice>
      ) : (
        <StatusNotice>Estado fisico atual disponivel para conferencia.</StatusNotice>
      )}
      <MarkdownEntry
        entryState={markdownEntryState}
        selectedReason={selectedReason}
        earlyJustification={earlyJustification}
        submitting={submitting}
        onObserve={onObserve}
        onOpenActiveMarkdown={onOpenActiveMarkdown}
        onRequestEarlyMarkdown={() => void requestEarlyMarkdown()}
        onRequestRuleWindowMarkdown={() => void requestRuleWindowMarkdown()}
        onSelectReason={(reason) => {
          setSelectedReason(reason);
          setError(undefined);
        }}
        onUpdateJustification={(value) => {
          setEarlyJustification(value);
          setError(undefined);
        }}
      />
      {error === undefined ? null : <StatusNotice tone="error">{error}</StatusNotice>}
      {markdownEntryState?.status === "presence_required" ? null : (
        <SecondaryAction label="Registrar observacao" onPress={onObserve} />
      )}
      <SecondaryAction label="Voltar e revisar" onPress={onBack} />
      {auditEvents.length === 0 ? null : <AuditTimeline events={auditEvents} />}
    </ScrollView>
  );
}

function MarkdownEntry({
  entryState,
  selectedReason,
  earlyJustification,
  submitting,
  onObserve,
  onRequestRuleWindowMarkdown,
  onRequestEarlyMarkdown,
  onSelectReason,
  onUpdateJustification,
  onOpenActiveMarkdown,
}: {
  entryState?: MarkdownEntryState | undefined;
  selectedReason: EarlyMarkdownReason | undefined;
  earlyJustification: string;
  submitting: boolean;
  onObserve: () => void;
  onRequestRuleWindowMarkdown: () => void;
  onRequestEarlyMarkdown: () => void;
  onSelectReason: (reason: EarlyMarkdownReason) => void;
  onUpdateJustification: (value: string) => void;
  onOpenActiveMarkdown?: (() => void) | undefined;
}) {
  if (entryState === undefined) {
    return null;
  }

  if (entryState.status === "presence_required") {
    return (
      <>
        <StatusNotice>{todayCopy.markdown.presenceGate}</StatusNotice>
        <PrimaryAction label={todayCopy.markdown.presenceGate} onPress={onObserve} />
      </>
    );
  }

  if (entryState.status === "eligible_rule_window") {
    return (
      <>
        <StatusNotice>Janela de rebaixa disponivel para este lote.</StatusNotice>
        <PrimaryAction
          disabled={submitting}
          label={todayCopy.markdown.primaryRequest}
          onPress={onRequestRuleWindowMarkdown}
        />
      </>
    );
  }

  if (entryState.status === "already_active") {
    return (
      <>
        <StatusNotice>
          {todayCopy.markdown.alreadyActivePrefix}: {entryState.label}
        </StatusNotice>
        <PrimaryAction
          label={entryState.label}
          onPress={() => {
            onOpenActiveMarkdown?.();
          }}
        />
      </>
    );
  }

  return (
    <View style={styles.group}>
      <StatusNotice>
        Este lote ainda nao esta na janela. Use excecao com justificativa.
      </StatusNotice>
      <Text style={styles.label}>{todayCopy.markdown.earlyReasonLabel}</Text>
      {entryState.reasons.map((reason) => (
        <SelectionRow
          key={reason}
          label={earlyReasonLabels[reason]}
          selected={selectedReason === reason}
          onPress={() => onSelectReason(reason)}
        />
      ))}
      <Field
        label={todayCopy.markdown.earlyReasonLabel}
        value={earlyJustification}
        onChangeText={onUpdateJustification}
      />
      <PrimaryAction
        disabled={
          selectedReason === undefined || earlyJustification.trim().length === 0 || submitting
        }
        label={todayCopy.markdown.earlyRequest}
        onPress={onRequestEarlyMarkdown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F5F7EF", gap: 16, padding: 16 },
  metadata: { color: "#3F5546", fontSize: 16, lineHeight: 24 },
  group: { gap: 8 },
  label: { color: "#112016", fontSize: 14, fontWeight: "600", lineHeight: 20 },
});
