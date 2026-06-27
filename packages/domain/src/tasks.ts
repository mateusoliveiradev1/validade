import type { PhysicalConfirmationStatus } from "./presence";
import { calculateLotRisk, type RiskCalculationLot } from "./risk";
import type {
  CategoryRuleProfile,
  ProductRuleOverride,
  RiskAssessment,
  RiskReason,
  RiskState,
} from "./types";

export const TODAY_ACTIONABLE_RISK_STATES = [
  "expired",
  "critical",
  "markdown_due",
  "uncertain",
] as const satisfies readonly RiskState[];

export type TodayActionableRiskState = (typeof TODAY_ACTIONABLE_RISK_STATES)[number];

export const TODAY_TASK_SEVERITIES = ["critical", "high", "medium", "follow_up"] as const;

export type TodayTaskSeverity = (typeof TODAY_TASK_SEVERITIES)[number];

export const TODAY_TASK_SECTIONS = [
  "withdraw_now",
  "check_sales_area",
  "request_markdown",
  "follow_up",
  "future_attention",
] as const;

export type TodayTaskSection = (typeof TODAY_TASK_SECTIONS)[number];

export const TODAY_DUE_BUCKETS = ["now", "shift", "today", "follow_up"] as const;

export type TodayDueBucket = (typeof TODAY_DUE_BUCKETS)[number];

export const REQUIRED_RESOLUTIONS = [
  "withdraw_or_loss",
  "repack_or_loss",
  "check_presence",
  "request_markdown",
  "approve_markdown",
  "apply_markdown",
  "confirm_markdown_on_shelf",
  "sales_area_recheck",
] as const;

export type RequiredResolution = (typeof REQUIRED_RESOLUTIONS)[number];

export const TASK_RESOLUTION_ACTIONS = [
  "withdraw",
  "repack",
  "record_loss",
  "confirm_presence",
  "request_markdown",
  "approve_markdown",
  "reject_markdown",
  "apply_markdown",
  "confirm_markdown_on_shelf",
  "mark_not_found",
  "mark_probably_sold_out",
  "move_lot",
  "complete_recheck",
] as const;

export type TaskResolutionAction = (typeof TASK_RESOLUTION_ACTIONS)[number];

export type TodayRiskAttention = "active_task" | "future_attention" | "none";

export type TodayTaskLocation =
  | { kind: "area_de_venda" }
  | { kind: "estoque" }
  | { kind: "camara_fria" }
  | { kind: "ilha_promocional" }
  | { kind: "retirada_perda" }
  | { kind: "other"; customName: string };

export interface TodayTaskCandidateInput {
  lotId: string;
  productDisplayName: string;
  lotIdentity: string;
  currentLocation: TodayTaskLocation;
  assessment: RiskAssessment;
  observedAt: string;
  recheckParentId?: string;
  followUpWindowLabel?: string;
}

export interface TodayTaskCandidate {
  activeKey: string;
  lotId: string;
  productDisplayName: string;
  lotIdentity: string;
  currentLocation: TodayTaskLocation;
  riskState: TodayActionableRiskState;
  severity: TodayTaskSeverity;
  dueBucket: TodayDueBucket;
  requiredResolution: RequiredResolution;
  section: TodayTaskSection;
  ownerLabel: "Equipe do turno";
  sourceRisk: {
    state: TodayActionableRiskState;
    reasons: readonly RiskReason[];
  };
  priority: number;
  observedAt: string;
  recheckParentId?: string;
  followUpWindowLabel?: string;
}

export interface FutureAttentionCandidate {
  lotId: string;
  productDisplayName: string;
  lotIdentity: string;
  currentLocation: TodayTaskLocation;
  riskState: "radar";
  section: "future_attention";
  sourceRisk: {
    state: "radar";
    reasons: readonly RiskReason[];
  };
  observedAt: string;
}

export interface CentralLotPhysicalObservation {
  status: PhysicalConfirmationStatus;
  observedAt: string;
  quantityState: "estimated" | "not_estimable";
  approximateQuantity?: number;
}

export interface CentralLotTaskProjectionInput {
  currentDate: string;
  currentTimestamp: string;
  lotId: string;
  productDisplayName: string;
  lotIdentity: string;
  currentLocation: TodayTaskLocation;
  lot: RiskCalculationLot;
  categoryProfile: CategoryRuleProfile;
  productOverride?: ProductRuleOverride;
  lastPhysicalObservation?: CentralLotPhysicalObservation;
}

export type CentralLotTaskProjection =
  | {
      attention: "active_task";
      assessment: RiskAssessment;
      task: TodayTaskCandidate;
    }
  | {
      attention: "future_attention";
      assessment: RiskAssessment;
      futureAttention: FutureAttentionCandidate;
    }
  | {
      attention: "none";
      assessment: RiskAssessment;
    };

export function classifyTodayRiskAttention(assessment: RiskAssessment): TodayRiskAttention {
  if (isTodayActionableRiskState(assessment.state)) {
    return "active_task";
  }

  if (assessment.state === "radar") {
    return "future_attention";
  }

  return "none";
}

export function deriveTodayTaskCandidate(
  input: TodayTaskCandidateInput,
): TodayTaskCandidate | null {
  if (!isTodayActionableRiskState(input.assessment.state)) {
    return null;
  }

  const requiredResolution = requiredResolutionForAssessment(input.assessment);
  const candidate: TodayTaskCandidate = {
    activeKey: createTodayTaskActiveKey({
      lotId: input.lotId,
      riskState: input.assessment.state,
      requiredResolution,
      ...(input.recheckParentId === undefined ? {} : { recheckParentId: input.recheckParentId }),
    }),
    lotId: input.lotId,
    productDisplayName: input.productDisplayName,
    lotIdentity: input.lotIdentity,
    currentLocation: input.currentLocation,
    riskState: input.assessment.state,
    severity: severityForRisk(input.assessment.state),
    dueBucket: dueBucketForRisk(input.assessment.state),
    requiredResolution,
    section: sectionForRisk(input.assessment.state, input.currentLocation),
    ownerLabel: "Equipe do turno",
    sourceRisk: {
      state: input.assessment.state,
      reasons: input.assessment.reasons,
    },
    priority: priorityForRisk(input.assessment.state, input.currentLocation),
    observedAt: input.observedAt,
    ...(input.recheckParentId === undefined ? {} : { recheckParentId: input.recheckParentId }),
    ...(input.followUpWindowLabel === undefined
      ? {}
      : { followUpWindowLabel: input.followUpWindowLabel }),
  };

  return candidate;
}

export function deriveFutureAttentionCandidate(
  input: TodayTaskCandidateInput,
): FutureAttentionCandidate | null {
  if (input.assessment.state !== "radar") {
    return null;
  }

  return {
    lotId: input.lotId,
    productDisplayName: input.productDisplayName,
    lotIdentity: input.lotIdentity,
    currentLocation: input.currentLocation,
    riskState: "radar",
    section: "future_attention",
    sourceRisk: {
      state: "radar",
      reasons: input.assessment.reasons,
    },
    observedAt: input.observedAt,
  };
}

export function projectCentralLotTask(
  input: CentralLotTaskProjectionInput,
): CentralLotTaskProjection {
  const assessment = calculateLotRisk({
    currentDate: input.currentDate,
    currentTimestamp: input.currentTimestamp,
    categoryProfile: input.categoryProfile,
    ...(input.productOverride === undefined ? {} : { productOverride: input.productOverride }),
    ...(input.lastPhysicalObservation === undefined
      ? {}
      : {
          lastPhysicalConfirmation: {
            status: input.lastPhysicalObservation.status,
            confirmedAt: input.lastPhysicalObservation.observedAt,
            ...(input.lastPhysicalObservation.quantityState === "estimated" &&
            input.lastPhysicalObservation.approximateQuantity !== undefined
              ? { approximateQuantity: input.lastPhysicalObservation.approximateQuantity }
              : {}),
          },
        }),
    lot: input.lot,
  });
  const task = deriveTodayTaskCandidate({
    lotId: input.lotId,
    productDisplayName: input.productDisplayName,
    lotIdentity: input.lotIdentity,
    currentLocation: input.currentLocation,
    assessment,
    observedAt: input.currentTimestamp,
  });

  if (task !== null) {
    return {
      attention: "active_task",
      assessment,
      task,
    };
  }

  const futureAttention = deriveFutureAttentionCandidate({
    lotId: input.lotId,
    productDisplayName: input.productDisplayName,
    lotIdentity: input.lotIdentity,
    currentLocation: input.currentLocation,
    assessment,
    observedAt: input.currentTimestamp,
  });

  if (futureAttention !== null) {
    return {
      attention: "future_attention",
      assessment,
      futureAttention,
    };
  }

  return {
    attention: "none",
    assessment,
  };
}

export function compareTodayTaskPriority(
  left: TodayTaskCandidate,
  right: TodayTaskCandidate,
): number {
  const priorityDifference = left.priority - right.priority;

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const observedDifference = left.observedAt.localeCompare(right.observedAt);

  if (observedDifference !== 0) {
    return observedDifference;
  }

  return left.lotId.localeCompare(right.lotId);
}

export function isResolutionCompatible(
  requiredResolution: RequiredResolution,
  action: TaskResolutionAction,
): boolean {
  return compatibleActionsFor(requiredResolution).includes(action);
}

export function compatibleActionsFor(
  requiredResolution: RequiredResolution,
): readonly TaskResolutionAction[] {
  if (requiredResolution === "withdraw_or_loss") {
    return ["withdraw", "record_loss"];
  }

  if (requiredResolution === "repack_or_loss") {
    return ["repack", "record_loss"];
  }

  if (requiredResolution === "check_presence") {
    return ["confirm_presence", "mark_not_found", "mark_probably_sold_out", "move_lot"];
  }

  if (requiredResolution === "request_markdown") {
    return ["request_markdown"];
  }

  if (requiredResolution === "approve_markdown") {
    return ["approve_markdown", "reject_markdown"];
  }

  if (requiredResolution === "apply_markdown") {
    return ["apply_markdown"];
  }

  if (requiredResolution === "confirm_markdown_on_shelf") {
    return ["confirm_markdown_on_shelf"];
  }

  return ["complete_recheck", "confirm_presence"];
}

function isTodayActionableRiskState(state: RiskState): state is TodayActionableRiskState {
  return TODAY_ACTIONABLE_RISK_STATES.includes(state as TodayActionableRiskState);
}

function requiredResolutionForRisk(state: TodayActionableRiskState): RequiredResolution {
  if (state === "expired") {
    return "withdraw_or_loss";
  }

  if (state === "markdown_due") {
    return "request_markdown";
  }

  return "check_presence";
}

function requiredResolutionForAssessment(assessment: RiskAssessment): RequiredResolution {
  if (assessment.state === "expired" && assessment.command === "repack_or_loss") {
    return "repack_or_loss";
  }

  return requiredResolutionForRisk(assessment.state as TodayActionableRiskState);
}

function severityForRisk(state: TodayActionableRiskState): TodayTaskSeverity {
  if (state === "expired") {
    return "critical";
  }

  if (state === "critical" || state === "uncertain") {
    return "high";
  }

  return "medium";
}

function dueBucketForRisk(state: TodayActionableRiskState): TodayDueBucket {
  if (state === "expired") {
    return "now";
  }

  if (state === "critical" || state === "uncertain") {
    return "shift";
  }

  return "today";
}

function sectionForRisk(
  state: TodayActionableRiskState,
  currentLocation: TodayTaskLocation,
): TodayTaskSection {
  if (state === "expired") {
    return "withdraw_now";
  }

  if (state === "markdown_due") {
    return "request_markdown";
  }

  if (currentLocation.kind === "area_de_venda") {
    return "check_sales_area";
  }

  return "follow_up";
}

function priorityForRisk(
  state: TodayActionableRiskState,
  currentLocation: TodayTaskLocation,
): number {
  const isSalesArea = currentLocation.kind === "area_de_venda";

  if (isSalesArea && state === "expired") {
    return 0;
  }

  if (isSalesArea && state === "critical") {
    return 1;
  }

  if (isSalesArea && state === "uncertain") {
    return 2;
  }

  if (state === "markdown_due") {
    return 3;
  }

  if (state === "expired") {
    return 4;
  }

  if (state === "critical") {
    return 5;
  }

  return 6;
}

function createTodayTaskActiveKey(input: {
  lotId: string;
  riskState: TodayActionableRiskState;
  requiredResolution: RequiredResolution;
  recheckParentId?: string;
}): string {
  return [
    input.lotId,
    input.riskState,
    input.requiredResolution,
    input.recheckParentId ?? "root",
  ].join(":");
}
