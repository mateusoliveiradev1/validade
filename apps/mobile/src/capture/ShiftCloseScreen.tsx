import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  PrepareTurnCacheStatus,
  ShiftCloseSafeRequest,
  ShiftClosureSnapshot,
} from "@validade-zero/contracts";
import {
  SHIFT_CLOSE_CHECKLIST_KEYS,
  evaluateShiftClose,
  type ShiftCloseCentralState,
  type ShiftCloseChecklistKey,
  type ShiftCloseEvaluation,
} from "@validade-zero/domain";
import { Field, PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import type { CaptureRepository, ShiftCloseOutboxRecord } from "./repository";
import { ShiftCloseReceipt } from "./ShiftCloseReceipt";
import { createSafeShiftCloseRequest, createUnsafeShiftCloseRequest } from "./shift-close";

const checklistCopy: Record<ShiftCloseChecklistKey, string> = {
  sales_area_checked: "Conferi fisicamente a área de venda.",
  pending_work_explained: "Expliquei as pendências que continuam ativas.",
  handoff_ready: "A passagem está pronta para a próxima liderança.",
};

export function ShiftCloseScreen({
  repository,
  canCloseShift,
  onBack,
  onSafeClose,
  storeId = "loja-local",
  prepareTurnCacheStatus,
  prepareTurnSource,
  now = () => new Date(),
}: {
  repository: CaptureRepository;
  canCloseShift: boolean;
  onBack: () => void;
  onSafeClose?: ((request: ShiftCloseSafeRequest) => Promise<ShiftClosureSnapshot>) | undefined;
  storeId?: string | undefined;
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  now?: () => Date;
}) {
  const [evaluation, setEvaluation] = useState<ShiftCloseEvaluation | undefined>();
  const [checklist, setChecklist] = useState<ShiftCloseChecklistKey[]>([]);
  const [reason, setReason] = useState("");
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [pendingUnsafeClose, setPendingUnsafeClose] = useState<
    ShiftCloseOutboxRecord | undefined
  >();
  const [safeClosure, setSafeClosure] = useState<ShiftClosureSnapshot | undefined>();
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();

  async function refresh(): Promise<void> {
    const [tasks, cache, queue, evidence, outbox] = await Promise.all([
      repository.listActiveTodayTasks(),
      repository.loadOfflineCacheStatus(),
      repository.listSyncQueue(),
      repository.listEvidenceUploads(),
      repository.listShiftCloseOutbox?.() ?? Promise.resolve([]),
    ]);
    const pendingOutbox = outbox.filter((item) => item.state !== "synced");
    const central = centralStateFromPrepareTurn(
      prepareTurnCacheStatus,
      prepareTurnSource,
      queue.totalCount,
    );
    setPendingUnsafeClose(pendingOutbox[0]);
    setEvaluation(
      evaluateShiftClose({
        cacheState: cache.state,
        tasks: tasks.map((task) => ({
          id: task.id,
          status: task.status,
          riskState: task.riskState,
          severity: task.severity,
          requiredResolution: task.requiredResolution,
        })),
        syncCommands: queue.commands.map((command) => ({
          state: command.state,
          urgency: command.urgency,
        })),
        evidence: evidence.map((item) => ({ required: true, state: item.state })),
        ...(central === undefined ? {} : { central }),
        pendingUnsafeCloseCount: pendingOutbox.length,
        checklist,
      }),
    );
  }

  useEffect(() => {
    void refresh();
  }, [checklist]);

  if (!canCloseShift) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader title="Fechamento do turno" />
        <StatusNotice tone="info">
          O fechamento exige liderança autorizada nesta loja. Continue a execução das tarefas do
          turno.
        </StatusNotice>
        <SecondaryAction label="Voltar para Hoje" onPress={onBack} />
      </ScrollView>
    );
  }

  if (safeClosure !== undefined || pendingUnsafeClose !== undefined) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ShiftCloseReceipt
          closure={safeClosure}
          pendingUnsafeClose={pendingUnsafeClose}
          onBack={onBack}
        />
      </ScrollView>
    );
  }

  const canQueueUnsafe =
    reason.trim().length > 0 &&
    owner.trim().length > 0 &&
    deadline.trim().length > 0 &&
    note.trim().length > 0;
  const canRequestSafe = evaluation?.eligibility === "eligible_safe" && onSafeClose !== undefined;

  async function queueUnsafeClose(): Promise<void> {
    if (!canQueueUnsafe || repository.queueUnsafeShiftClose === undefined) {
      setFeedback("Não foi possível salvar a passagem insegura neste aparelho.");
      return;
    }
    const timestamp = now().toISOString();
    const request = createUnsafeShiftCloseRequest({
      storeId,
      verdict: "unsafe",
      reason: reason.trim(),
      continuityOwner: owner.trim(),
      continuityDeadline: deadline.trim(),
      note: note.trim(),
      checklist,
      occurredAt: timestamp,
      idempotencyKey: `unsafe-shift-close:${timestamp}`,
    });
    const saved = await repository.queueUnsafeShiftClose({
      localCloseId: `local-shift-close:${timestamp}`,
      request,
    });
    setPendingUnsafeClose(saved);
  }

  async function requestSafeClose(): Promise<void> {
    if (!canRequestSafe || onSafeClose === undefined) return;
    setIsValidating(true);
    setFeedback(undefined);
    try {
      const timestamp = now().toISOString();
      const closure = await onSafeClose(
        createSafeShiftCloseRequest({
          storeId,
          verdict: "safe",
          checklist: [...SHIFT_CLOSE_CHECKLIST_KEYS],
          occurredAt: timestamp,
          idempotencyKey: `safe-shift-close:${timestamp}`,
        }),
      );
      setSafeClosure(closure);
    } catch {
      setFeedback("A validação central encontrou uma mudança. Registre a passagem com pendências.");
      await refresh();
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Fechamento do turno"
        body="O horário de saída não transforma pendências em área segura."
      />
      <StatusNotice tone={evaluation?.eligibility === "eligible_safe" ? "success" : "error"}>
        {evaluation?.eligibility === "eligible_safe"
          ? "Pronto para validação central de área segura."
          : "Há bloqueios ou dados sem validação central. A passagem insegura continua disponível."}
      </StatusNotice>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Conferência física obrigatória</Text>
        {SHIFT_CLOSE_CHECKLIST_KEYS.map((key) => {
          const checked = checklist.includes(key);
          return (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={checklistCopy[key]}
              onPress={() =>
                setChecklist((current) =>
                  checked ? current.filter((item) => item !== key) : [...current, key],
                )
              }
              style={[styles.checkRow, checked ? styles.checkRowChecked : undefined]}
            >
              <Text style={styles.checkMark}>{checked ? "✓" : "○"}</Text>
              <Text style={styles.checkText}>{checklistCopy[key]}</Text>
            </Pressable>
          );
        })}
      </View>
      {evaluation === undefined || evaluation.blockers.length === 0 ? null : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bloqueios atuais</Text>
          {evaluation.blockers.map((blocker) => (
            <View key={blocker.code} style={styles.blocker}>
              <Text style={styles.blockerLabel}>{blocker.label}</Text>
              <Text style={styles.blockerAction}>{blocker.actionLabel}</Text>
            </View>
          ))}
        </View>
      )}
      <PrimaryAction
        disabled={!canRequestSafe || isValidating}
        label={isValidating ? "Validando com o sistema…" : "Encerrar turno com área segura"}
        onPress={() => void requestSafeClose()}
      />
      {onSafeClose === undefined ? (
        <Text style={styles.helper}>
          A confirmação segura só aparece após a API central validar o turno.
        </Text>
      ) : null}
      <View style={[styles.card, styles.unsafeCard]}>
        <Text style={styles.sectionTitle}>Encerrar turno com pendências</Text>
        <Text style={styles.helper}>
          Não resolve tarefas nem silencia alertas. Define a continuidade da próxima liderança.
        </Text>
        <Field
          label="Motivo"
          value={reason}
          onChangeText={setReason}
          placeholder="Ex.: retirada crítica ainda em conferência"
        />
        <Field
          label="Responsável pela continuidade"
          value={owner}
          onChangeText={setOwner}
          placeholder="Nome da liderança seguinte"
        />
        <Field
          label="Prazo (ISO)"
          value={deadline}
          onChangeText={setDeadline}
          placeholder="2030-01-10T19:00:00.000Z"
        />
        <Field
          label="Nota para a passagem"
          value={note}
          onChangeText={setNote}
          placeholder="Próximo passo físico obrigatório"
        />
        <PrimaryAction
          disabled={!canQueueUnsafe}
          label="Encerrar turno com pendências"
          onPress={() => void queueUnsafeClose()}
        />
      </View>
      {feedback === undefined ? null : <StatusNotice tone="error">{feedback}</StatusNotice>}
      <SecondaryAction label="Voltar para Hoje" onPress={onBack} />
    </ScrollView>
  );
}

function centralStateFromPrepareTurn(
  cache: PrepareTurnCacheStatus | null | undefined,
  source: "central" | "local_cache" | undefined,
  pendingCommandCount: number,
): ShiftCloseCentralState | undefined {
  if (cache === null || cache === undefined) {
    return undefined;
  }

  const resolvedSource = source ?? cache.source;
  const hasCentralFacts =
    cache.productCount +
      cache.lotCount +
      cache.activeTaskCount +
      cache.conflictCount +
      cache.resolvedHistoryCount >
    0;
  const prepared =
    resolvedSource === "central" &&
    cache.state === "ready" &&
    cache.lastCentralReadAt !== undefined &&
    hasCentralFacts;

  return {
    source: resolvedSource,
    readiness: prepared ? "prepared" : cache.state === "ready" ? "cache_ready" : "needs_review",
    hasCurrentRead: cache.lastCentralReadAt !== undefined,
    hasCentralFacts,
    activeTaskCount: cache.activeTaskCount,
    pendingProductDraftCount: 0,
    conflictCount: cache.conflictCount,
    discardedActionCount: 0,
    pendingCommandCount,
    storeBlockerCount: prepared ? 0 : 1,
  };
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  card: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  unsafeCard: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  sectionTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  checkRow: {
    alignItems: "center",
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    flexDirection: "row",
    gap: captureSpacing.medium,
    minHeight: 48,
    padding: captureSpacing.medium,
  },
  checkRowChecked: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
  },
  checkMark: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
  },
  checkText: {
    color: captureColors.ink,
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  blocker: {
    borderTopColor: captureColors.border,
    borderTopWidth: 1,
    gap: captureSpacing.small,
    paddingTop: captureSpacing.medium,
  },
  blockerLabel: {
    color: captureColors.critical,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  blockerAction: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  helper: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
});
