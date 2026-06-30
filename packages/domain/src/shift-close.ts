import type { OfflineCacheState, SyncCommandState, SyncCommandUrgency } from "./sync";
import type { TodayTaskSeverity } from "./tasks";

export const SHIFT_CLOSE_VERDICTS = ["safe", "unsafe"] as const;
export type ShiftCloseVerdict = (typeof SHIFT_CLOSE_VERDICTS)[number];

export const SHIFT_CLOSE_ELIGIBILITIES = [
  "eligible_safe",
  "must_close_unsafe",
  "cannot_evaluate",
] as const;
export type ShiftCloseEligibility = (typeof SHIFT_CLOSE_ELIGIBILITIES)[number];

export const SHIFT_CLOSE_CHECKLIST_KEYS = [
  "sales_area_checked",
  "pending_work_explained",
  "handoff_ready",
] as const;
export type ShiftCloseChecklistKey = (typeof SHIFT_CLOSE_CHECKLIST_KEYS)[number];

export const SHIFT_CLOSE_BLOCKER_CODES = [
  "expired_or_critical_risk",
  "open_sales_area_recheck",
  "central_capture_not_ready",
  "central_active_tasks",
  "central_product_review_pending",
  "central_discarded_action",
  "critical_sync_conflict",
  "critical_pending_sync",
  "offline_cache_stale",
  "offline_cache_unavailable",
  "offline_mode_requires_central_revalidation",
  "required_evidence_pending",
  "pending_unsafe_close_sync",
  "incomplete_checklist",
] as const;
export type ShiftCloseBlockerCode = (typeof SHIFT_CLOSE_BLOCKER_CODES)[number];

export const SHIFT_CLOSE_RULE_VERSION = "phase-10-central-v1" as const;

export interface ShiftCloseTaskState {
  id: string;
  status: "active" | "resolved" | "blocked";
  riskState: "expired" | "critical" | "markdown_due" | "uncertain";
  severity: TodayTaskSeverity;
  requiredResolution:
    | "withdraw_or_loss"
    | "repack_or_loss"
    | "check_presence"
    | "request_markdown"
    | "approve_markdown"
    | "apply_markdown"
    | "confirm_markdown_on_shelf"
    | "sales_area_recheck";
}

export interface ShiftCloseSyncState {
  state: SyncCommandState;
  urgency: SyncCommandUrgency;
}

export interface ShiftCloseEvidenceState {
  required: boolean;
  state: "waiting_upload" | "uploading" | "failed" | "uploaded" | "invalidated" | "expired";
}

export interface ShiftCloseCentralState {
  source: "central" | "local_cache" | "pending_central" | "unavailable";
  readiness: "needs_review" | "cache_ready" | "prepared" | "blocked";
  hasCurrentRead: boolean;
  hasCentralFacts: boolean;
  activeTaskCount: number;
  pendingProductDraftCount: number;
  conflictCount: number;
  discardedActionCount: number;
  pendingCommandCount: number;
  storeBlockerCount: number;
}

export interface ShiftCloseBlocker {
  code: ShiftCloseBlockerCode;
  label: string;
  actionLabel: string;
}

export interface ShiftCloseEvaluationInput {
  cacheState: OfflineCacheState;
  tasks: readonly ShiftCloseTaskState[];
  syncCommands?: readonly ShiftCloseSyncState[];
  evidence?: readonly ShiftCloseEvidenceState[];
  checklist?: readonly ShiftCloseChecklistKey[];
  central?: ShiftCloseCentralState;
  pendingUnsafeCloseCount?: number;
}

export interface ShiftCloseEvaluation {
  eligibility: ShiftCloseEligibility;
  blockers: readonly ShiftCloseBlocker[];
  checklistComplete: boolean;
  ruleVersion: typeof SHIFT_CLOSE_RULE_VERSION;
}

export function evaluateShiftClose(input: ShiftCloseEvaluationInput): ShiftCloseEvaluation {
  const blockers: ShiftCloseBlocker[] = [];
  const activeTasks = input.tasks.filter((task) => task.status === "active");
  const central = input.central;

  if (
    central !== undefined &&
    (central.source !== "central" ||
      central.readiness !== "prepared" ||
      !central.hasCurrentRead ||
      !central.hasCentralFacts ||
      central.storeBlockerCount > 0)
  ) {
    blockers.push({
      code: "central_capture_not_ready",
      label: "A leitura central ainda nao confirma a seguranca da area de venda.",
      actionLabel: "Preparar turno pela central",
    });
  }

  if (central !== undefined && central.activeTaskCount > 0) {
    blockers.push({
      code: "central_active_tasks",
      label: "Ha tarefas centrais ativas antes do fechamento.",
      actionLabel: "Resolver tarefas ativas",
    });
  }

  if (central !== undefined && central.pendingProductDraftCount > 0) {
    blockers.push({
      code: "central_product_review_pending",
      label: "Ha cadastro de produto aguardando revisao central.",
      actionLabel: "Revisar cadastro pendente",
    });
  }

  if (central !== undefined && central.conflictCount > 0) {
    blockers.push({
      code: "critical_sync_conflict",
      label: "Ha conflito central aguardando revisao.",
      actionLabel: "Revisar conflitos",
    });
  }

  if (central !== undefined && central.discardedActionCount > 0) {
    blockers.push({
      code: "central_discarded_action",
      label: "Ha acao local descartada pela central que precisa de ciencia operacional.",
      actionLabel: "Revisar descarte central",
    });
  }

  if (central !== undefined && central.pendingCommandCount > 0) {
    blockers.push({
      code: "critical_pending_sync",
      label: "Ha acao local ainda sem confirmacao central.",
      actionLabel: "Sincronizar acoes",
    });
  }

  if (activeTasks.some((task) => task.riskState === "expired" || task.severity === "critical")) {
    blockers.push({
      code: "expired_or_critical_risk",
      label: "Há risco vencido ou crítico ativo.",
      actionLabel: "Resolver riscos críticos",
    });
  }

  if (activeTasks.some((task) => task.requiredResolution === "sales_area_recheck")) {
    blockers.push({
      code: "open_sales_area_recheck",
      label: "Há reconferência de área de venda pendente.",
      actionLabel: "Conferir área de venda",
    });
  }

  const syncCommands = input.syncCommands ?? [];
  if (
    syncCommands.some(
      (command) => command.state === "sync_conflict" && command.urgency === "critical",
    )
  ) {
    blockers.push({
      code: "critical_sync_conflict",
      label: "Há conflito crítico aguardando revisão.",
      actionLabel: "Revisar conflitos",
    });
  }

  if (
    syncCommands.some(
      (command) =>
        command.urgency === "critical" &&
        ["command_saved_local", "pending_sync", "syncing", "sync_failed"].includes(command.state),
    )
  ) {
    blockers.push({
      code: "critical_pending_sync",
      label: "Há ação crítica ainda sem confirmação central.",
      actionLabel: "Sincronizar ações",
    });
  }

  if (input.cacheState === "offline_stale") {
    blockers.push({
      code: "offline_cache_stale",
      label: "Os dados locais estão desatualizados.",
      actionLabel: "Atualizar dados",
    });
  }

  if (input.cacheState === "offline_unavailable") {
    blockers.push({
      code: "offline_cache_unavailable",
      label: "Não há dados locais suficientes para avaliar o turno.",
      actionLabel: "Conectar e atualizar",
    });
  }

  if (input.cacheState === "offline_mode") {
    blockers.push({
      code: "offline_mode_requires_central_revalidation",
      label: "O fechamento seguro exige validação central online.",
      actionLabel: "Conectar para validar",
    });
  }

  if (
    (input.evidence ?? []).some((evidence) => evidence.required && evidence.state !== "uploaded")
  ) {
    blockers.push({
      code: "required_evidence_pending",
      label: "Há evidência obrigatória sem confirmação central.",
      actionLabel: "Enviar evidências",
    });
  }

  if ((input.pendingUnsafeCloseCount ?? 0) > 0) {
    blockers.push({
      code: "pending_unsafe_close_sync",
      label: "Ha fechamento inseguro local aguardando sincronizacao.",
      actionLabel: "Sincronizar passagem pendente",
    });
  }

  const checklistComplete = hasCompleteShiftCloseChecklist(input.checklist ?? []);
  if (!checklistComplete) {
    blockers.push({
      code: "incomplete_checklist",
      label: "A conferência física de fechamento está incompleta.",
      actionLabel: "Completar conferência",
    });
  }

  const cannotEvaluate = blockers.some((blocker) =>
    [
      "offline_cache_stale",
      "offline_cache_unavailable",
      "offline_mode_requires_central_revalidation",
      "central_capture_not_ready",
    ].includes(blocker.code),
  );

  return {
    eligibility: cannotEvaluate
      ? "cannot_evaluate"
      : blockers.length === 0
        ? "eligible_safe"
        : "must_close_unsafe",
    blockers,
    checklistComplete,
    ruleVersion: SHIFT_CLOSE_RULE_VERSION,
  };
}

export function hasCompleteShiftCloseChecklist(
  checklist: readonly ShiftCloseChecklistKey[],
): boolean {
  return (
    checklist.length === SHIFT_CLOSE_CHECKLIST_KEYS.length &&
    checklist.every((item, index) => item === SHIFT_CLOSE_CHECKLIST_KEYS[index])
  );
}

export function canCloseSafely(evaluation: ShiftCloseEvaluation): boolean {
  return evaluation.eligibility === "eligible_safe";
}
