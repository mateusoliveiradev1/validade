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
  type ShiftCloseDeviceAuthorization,
  type ShiftCloseEvaluation,
} from "@validade-zero/domain";
import type { MobileBuildInfo } from "../build-info";
import { Field, PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import type { CaptureRepository, ShiftCloseOutboxRecord } from "./repository";
import { ShiftCloseReceipt } from "./ShiftCloseReceipt";
import { createSafeShiftCloseRequest, createUnsafeShiftCloseRequest } from "./shift-close";

const checklistCopy: Record<ShiftCloseChecklistKey, string> = {
  sales_area_checked: "Conferi fisicamente a area de venda.",
  pending_work_explained: "Expliquei as pendencias que continuam ativas.",
  handoff_ready: "A passagem esta pronta para a proxima lideranca.",
};

interface CloseSummary {
  activeTaskCount: number;
  syncPendingCount: number;
  syncConflictCount: number;
  centralReadStatus: string;
  buildStatus: string;
  deviceAuthorizationStatus: string;
  checklistProgress: string;
  centralValidationAvailable: boolean;
}

export function ShiftCloseScreen({
  repository,
  canCloseShift,
  onBack,
  onSafeClose,
  storeId = "loja-local",
  prepareTurnCacheStatus,
  prepareTurnSource,
  buildInfo,
  deviceAuthorization,
  now = () => new Date(),
}: {
  repository: CaptureRepository;
  canCloseShift: boolean;
  onBack: () => void;
  onSafeClose?: ((request: ShiftCloseSafeRequest) => Promise<ShiftClosureSnapshot>) | undefined;
  storeId?: string | undefined;
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  buildInfo?: MobileBuildInfo | undefined;
  deviceAuthorization?: ShiftCloseDeviceAuthorization | undefined;
  now?: () => Date;
}) {
  const [evaluation, setEvaluation] = useState<ShiftCloseEvaluation | undefined>();
  const [summary, setSummary] = useState<CloseSummary | undefined>();
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
    setSummary(
      shiftCloseSummaryFrom({
        activeTaskCount: tasks.filter((task) => task.status === "active").length,
        buildInfo,
        central,
        checklistCount: checklist.length,
        deviceAuthorization,
        syncConflictCount: queue.conflictCount,
        syncPendingCount: queue.totalCount,
      }),
    );
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
        ...(buildInfo === undefined
          ? {}
          : {
              buildCompatibility: buildInfo.buildCompatibility,
              buildRequiredForSafeClose: true,
            }),
        ...(deviceAuthorization === undefined ? {} : { deviceAuthorization }),
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
          O fechamento exige lideranca autorizada nesta loja. Continue a execucao das tarefas do
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

  const parsedDeadline = parseContinuityDeadline(deadline, now());
  const deadlineError =
    deadline.trim().length === 0 || parsedDeadline !== undefined
      ? undefined
      : "Informe um horario como 19:00 ou uma data ISO valida.";
  const canQueueUnsafe =
    reason.trim().length > 0 &&
    owner.trim().length > 0 &&
    parsedDeadline !== undefined &&
    note.trim().length > 0;
  const safeEvaluationReady =
    evaluation?.eligibility === "eligible_safe" && summary?.centralValidationAvailable === true;
  const canRequestSafe = safeEvaluationReady && onSafeClose !== undefined;

  async function queueUnsafeClose(): Promise<void> {
    const continuityDeadline = parseContinuityDeadline(deadline, now());

    if (
      !canQueueUnsafe ||
      continuityDeadline === undefined ||
      repository.queueUnsafeShiftClose === undefined
    ) {
      setFeedback("Nao foi possivel salvar a passagem com pendencias neste aparelho.");
      return;
    }
    const timestamp = now().toISOString();
    const request = createUnsafeShiftCloseRequest({
      storeId,
      verdict: "unsafe",
      reason: reason.trim(),
      continuityOwner: owner.trim(),
      continuityDeadline,
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
      const fallbackDeadline = defaultContinuityDeadline(now());

      setReason((current) =>
        current.trim().length === 0
          ? "A leitura central mudou durante a validacao segura."
          : current,
      );
      setOwner((current) => (current.trim().length === 0 ? "Lideranca seguinte" : current));
      setDeadline((current) => (current.trim().length === 0 ? fallbackDeadline : current));
      setNote((current) =>
        current.trim().length === 0
          ? "Atualizar Hoje, revisar bloqueios e continuar a conferencia fisica."
          : current,
      );
      setFeedback(
        "A central encontrou mudanca antes de aceitar area segura. A passagem com pendencias ja ficou preparada abaixo.",
      );
      await refresh();
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Fechamento do turno"
        body="O horario de saida nao transforma pendencias em area segura."
      />
      <StatusNotice tone={safeEvaluationReady ? "success" : "error"}>
        {safeEvaluationReady
          ? "Pronto para validacao central de area segura."
          : "Ha bloqueios ou dados sem validacao central. A passagem com pendencias continua disponivel."}
      </StatusNotice>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resumo antes do fechamento seguro</Text>
        <View style={styles.summaryGrid}>
          <SummaryRow
            label="Tarefas ativas"
            value={
              summary === undefined ? "0 tarefas ativas" : taskCountLabel(summary.activeTaskCount)
            }
          />
          <SummaryRow
            label="Fila local"
            value={
              summary === undefined
                ? "0 pendencias, 0 conflitos"
                : `${summary.syncPendingCount} pendencias, ${summary.syncConflictCount} conflitos`
            }
          />
          <SummaryRow
            label="Leitura central"
            value={summary?.centralReadStatus ?? "nao informado"}
          />
          <SummaryRow label="Atualizacao do app" value={summary?.buildStatus ?? "nao informado"} />
          <SummaryRow
            label="Conta e aparelho"
            value={summary?.deviceAuthorizationStatus ?? "nao informado"}
          />
          <SummaryRow
            label="Checklist fisico"
            value={
              summary?.checklistProgress ?? `0/${SHIFT_CLOSE_CHECKLIST_KEYS.length} conferencias`
            }
          />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Conferencia fisica obrigatoria</Text>
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
              <Text style={styles.checkMark}>{checked ? "OK" : "-"}</Text>
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
        label={isValidating ? "Validando com o sistema..." : "Encerrar turno com area segura"}
        onPress={() => void requestSafeClose()}
      />
      {onSafeClose === undefined ? (
        <Text style={styles.helper}>
          A confirmacao segura so aparece apos a API central validar o turno.
        </Text>
      ) : null}
      <View style={[styles.card, styles.unsafeCard]}>
        <Text style={styles.sectionTitle}>Encerrar turno com pendencias</Text>
        <Text style={styles.helper}>
          A area nao esta segura; o trabalho continua no proximo turno. Nao resolve tarefas nem
          silencia alertas.
        </Text>
        <Field
          label="Motivo"
          value={reason}
          onChangeText={setReason}
          placeholder="Ex.: retirada critica ainda em conferencia"
        />
        <Field
          label="Responsavel pela continuidade"
          value={owner}
          onChangeText={setOwner}
          placeholder="Nome da lideranca seguinte"
        />
        <Field
          label="Prazo da passagem"
          value={deadline}
          onChangeText={setDeadline}
          placeholder="Ex.: 19:00"
        />
        {deadlineError === undefined ? null : (
          <Text style={styles.fieldError}>{deadlineError}</Text>
        )}
        <Field
          label="Nota para a passagem"
          value={note}
          onChangeText={setNote}
          placeholder="Proximo passo fisico obrigatorio"
        />
        <PrimaryAction
          disabled={!canQueueUnsafe}
          label="Encerrar turno com pendencias"
          onPress={() => void queueUnsafeClose()}
        />
      </View>
      {feedback === undefined ? null : <StatusNotice tone="error">{feedback}</StatusNotice>}
      <SecondaryAction label="Voltar para Hoje" onPress={onBack} />
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function shiftCloseSummaryFrom(input: {
  activeTaskCount: number;
  buildInfo: MobileBuildInfo | undefined;
  central: ShiftCloseCentralState | undefined;
  checklistCount: number;
  deviceAuthorization: ShiftCloseDeviceAuthorization | undefined;
  syncConflictCount: number;
  syncPendingCount: number;
}): CloseSummary {
  const centralValidationAvailable =
    input.central?.source === "central" &&
    input.central.readiness === "prepared" &&
    input.central.hasCurrentRead &&
    input.central.hasCentralFacts;

  return {
    activeTaskCount: input.activeTaskCount,
    syncPendingCount: input.syncPendingCount,
    syncConflictCount: input.syncConflictCount,
    centralReadStatus: centralReadStatusLabel(input.central),
    buildStatus: buildStatusLabel(input.buildInfo),
    deviceAuthorizationStatus: deviceAuthorizationStatusLabel(input.deviceAuthorization),
    checklistProgress: `${input.checklistCount}/${SHIFT_CLOSE_CHECKLIST_KEYS.length} conferencias`,
    centralValidationAvailable,
  };
}

function centralReadStatusLabel(central: ShiftCloseCentralState | undefined): string {
  if (central === undefined) {
    return "nao informado";
  }

  if (central.source === "local_cache") {
    return "leitura local; nao comprova area segura";
  }

  if (!central.hasCurrentRead) {
    return "sem leitura central confirmada";
  }

  if (!central.hasCentralFacts) {
    return "leitura central sem fatos";
  }

  if (central.source === "central" && central.readiness === "prepared") {
    return "leitura central atual";
  }

  return "revisao central pendente";
}

function taskCountLabel(count: number): string {
  return count === 1 ? "1 tarefa ativa" : `${count} tarefas ativas`;
}

function buildStatusLabel(buildInfo: MobileBuildInfo | undefined): string {
  if (buildInfo === undefined) {
    return "nao informado";
  }

  if (buildInfo.buildCompatibility === "atual") {
    return "build atual";
  }

  if (buildInfo.buildCompatibility === "incompativel") {
    return "build incompativel";
  }

  if (buildInfo.buildCompatibility === "desatualizado") {
    return "atualizacao obrigatoria";
  }

  return "build nao confirmado";
}

function deviceAuthorizationStatusLabel(
  authorization: ShiftCloseDeviceAuthorization | undefined,
): string {
  if (authorization === undefined || authorization === "unknown") {
    return "nao informado";
  }

  return authorization === "valid" ? "conta e loja autorizadas" : "autorizacao invalida";
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

function parseContinuityDeadline(value: string, reference: Date): string | undefined {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  const timeMatch = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (timeMatch === null) {
    return undefined;
  }

  const candidate = new Date(reference);
  candidate.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);

  if (candidate.getTime() <= reference.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate.toISOString();
}

function defaultContinuityDeadline(reference: Date): string {
  const candidate = new Date(reference.getTime() + 60 * 60 * 1000);
  candidate.setMinutes(0, 0, 0);
  return candidate.toISOString();
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
  summaryGrid: {
    gap: captureSpacing.small,
  },
  summaryRow: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryLabel: {
    color: captureColors.mutedInk,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  summaryValue: {
    color: captureColors.ink,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  helper: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldError: {
    color: captureColors.critical,
    fontSize: 13,
    lineHeight: 18,
  },
});
