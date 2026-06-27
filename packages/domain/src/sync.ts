import type {
  RequiredResolution,
  TaskResolutionAction,
  TodayActionableRiskState,
  TodayTaskLocation,
} from "./tasks";

export const OFFLINE_CACHE_STATES = [
  "offline_ready",
  "offline_stale",
  "offline_unavailable",
  "offline_mode",
] as const;

export type OfflineCacheState = (typeof OFFLINE_CACHE_STATES)[number];

export const SYNC_COMMAND_STATES = [
  "command_saved_local",
  "pending_sync",
  "syncing",
  "synced",
  "sync_failed",
  "sync_conflict",
  "discarded",
] as const;

export type SyncCommandState = (typeof SYNC_COMMAND_STATES)[number];

export const SYNC_COMMAND_KINDS = [
  "resolve_task",
  "request_markdown",
  "decide_markdown",
  "record_markdown_application",
  "confirm_markdown_on_shelf",
] as const;

export type SyncCommandKind = (typeof SYNC_COMMAND_KINDS)[number];

export const SYNC_CONFLICT_RESOLUTION_ACTIONS = [
  "keep_local_and_retry",
  "use_current_task",
  "discard_offline_action",
] as const;

export type SyncConflictResolutionAction = (typeof SYNC_CONFLICT_RESOLUTION_ACTIONS)[number];

export const SYNC_COMMAND_URGENCIES = ["critical", "high", "medium", "low"] as const;

export type SyncCommandUrgency = (typeof SYNC_COMMAND_URGENCIES)[number];

export interface OfflineCacheStateInput {
  activeTaskCount: number;
  requiredLotSnippetCount: number;
  staleAfterHours: number;
  referenceTime: string;
  lastRefreshedAt?: string;
  isConnected?: boolean | null;
}

export interface SyncCommandUrgencyInput {
  kind: SyncCommandKind;
  action?: TaskResolutionAction;
  requiredResolution?: RequiredResolution;
  riskState?: TodayActionableRiskState;
  currentLocation?: TodayTaskLocation;
}

export interface SyncQueueSortableItem {
  state: SyncCommandState;
  urgency: SyncCommandUrgency;
  createdAt: string;
}

export interface DiscardReasonPolicyInput {
  kind: SyncCommandKind;
  action?: TaskResolutionAction;
  requiredResolution?: RequiredResolution;
  riskState?: TodayActionableRiskState;
  affectsSalesAreaSafety?: boolean;
}

export interface SafetyVerdictSyncInput {
  cacheState: OfflineCacheState;
  commands?: readonly Pick<SyncQueueSortableItem, "state" | "urgency">[];
}

export type CentralSyncApplicationPolicyResult =
  | {
      status: "accepted";
      businessState: "active_task" | "resolved_history" | "discarded";
    }
  | {
      status: "conflict";
      reason: string;
    }
  | {
      status: "retry";
      error: string;
    };

export function deriveOfflineCacheState(input: OfflineCacheStateInput): OfflineCacheState {
  const lastRefreshedAt = input.lastRefreshedAt;
  const hasPreviousRefresh = lastRefreshedAt !== undefined;

  if (!hasPreviousRefresh && input.activeTaskCount === 0) {
    return "offline_unavailable";
  }

  if (
    lastRefreshedAt !== undefined &&
    isOlderThanHours(lastRefreshedAt, input.referenceTime, input.staleAfterHours)
  ) {
    return "offline_stale";
  }

  if (input.isConnected === false && hasUsableTaskCache(input)) {
    return "offline_mode";
  }

  return "offline_ready";
}

export function classifySyncCommandUrgency(input: SyncCommandUrgencyInput): SyncCommandUrgency {
  if (input.riskState === "expired") {
    return "critical";
  }

  if (input.currentLocation?.kind === "area_de_venda" && input.riskState === "critical") {
    return "critical";
  }

  if (
    input.requiredResolution === "withdraw_or_loss" ||
    input.requiredResolution === "repack_or_loss" ||
    input.requiredResolution === "sales_area_recheck" ||
    input.requiredResolution === "apply_markdown" ||
    input.requiredResolution === "confirm_markdown_on_shelf"
  ) {
    return "critical";
  }

  if (
    input.action === "withdraw" ||
    input.action === "record_loss" ||
    input.action === "apply_markdown" ||
    input.action === "confirm_markdown_on_shelf" ||
    input.action === "complete_recheck"
  ) {
    return "critical";
  }

  if (input.requiredResolution === "approve_markdown" || input.kind === "decide_markdown") {
    return "high";
  }

  if (input.requiredResolution === "request_markdown" || input.kind === "request_markdown") {
    return "medium";
  }

  return "low";
}

export function sortSyncQueueItems<TItem extends SyncQueueSortableItem>(
  items: readonly TItem[],
): TItem[] {
  return [...items].sort((left, right) => {
    const stateDifference = stateSortWeight(left.state) - stateSortWeight(right.state);

    if (stateDifference !== 0) {
      return stateDifference;
    }

    const urgencyDifference = urgencySortWeight(left.urgency) - urgencySortWeight(right.urgency);

    if (urgencyDifference !== 0) {
      return urgencyDifference;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function requiresDiscardReason(input: DiscardReasonPolicyInput): boolean {
  if (
    input.action === "withdraw" ||
    input.action === "record_loss" ||
    input.action === "apply_markdown" ||
    input.action === "confirm_markdown_on_shelf" ||
    input.kind === "record_markdown_application" ||
    input.kind === "confirm_markdown_on_shelf"
  ) {
    return true;
  }

  if (
    input.action === "complete_recheck" ||
    input.requiredResolution === "sales_area_recheck" ||
    input.riskState === "critical" ||
    input.riskState === "expired"
  ) {
    return true;
  }

  return input.action === "confirm_presence" && input.affectsSalesAreaSafety === true;
}

export function shouldQualifySafetyVerdict(input: SafetyVerdictSyncInput): boolean {
  if (input.cacheState === "offline_stale" || input.cacheState === "offline_unavailable") {
    return true;
  }

  return (
    input.commands?.some(
      (command) =>
        command.state === "sync_conflict" ||
        (command.urgency === "critical" &&
          command.state !== "synced" &&
          command.state !== "discarded"),
    ) ?? false
  );
}

export function keepsActiveRiskVisibleAfterCentralSync(
  result: CentralSyncApplicationPolicyResult,
): boolean {
  if (result.status !== "accepted") {
    return true;
  }

  return result.businessState !== "resolved_history";
}

export function isCentralBusinessResolution(result: CentralSyncApplicationPolicyResult): boolean {
  return result.status === "accepted" && result.businessState === "resolved_history";
}

function hasUsableTaskCache(input: OfflineCacheStateInput): boolean {
  if (input.lastRefreshedAt === undefined) {
    return false;
  }

  if (input.activeTaskCount === 0) {
    return true;
  }

  return input.requiredLotSnippetCount >= input.activeTaskCount;
}

function isOlderThanHours(
  lastRefreshedAt: string,
  referenceTime: string,
  staleAfterHours: number,
): boolean {
  const elapsedMs = new Date(referenceTime).getTime() - new Date(lastRefreshedAt).getTime();
  const staleAfterMs = staleAfterHours * 60 * 60 * 1000;

  return elapsedMs > staleAfterMs;
}

function stateSortWeight(state: SyncCommandState): number {
  if (state === "sync_conflict") {
    return 0;
  }

  if (state === "sync_failed") {
    return 1;
  }

  if (state === "command_saved_local" || state === "pending_sync" || state === "syncing") {
    return 2;
  }

  if (state === "synced") {
    return 3;
  }

  return 4;
}

function urgencySortWeight(urgency: SyncCommandUrgency): number {
  if (urgency === "critical") {
    return 0;
  }

  if (urgency === "high") {
    return 1;
  }

  if (urgency === "medium") {
    return 2;
  }

  return 3;
}
