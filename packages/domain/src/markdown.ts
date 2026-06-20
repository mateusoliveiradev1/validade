import {
  classifyPhysicalConfirmationFreshness,
  type PhysicalConfirmation,
} from "./presence";
import type {
  RequiredResolution,
  TodayDueBucket,
  TodayTaskSection,
  TodayTaskSeverity,
} from "./tasks";
import type { RiskState } from "./types";

export const MARKDOWN_WORKFLOW_STATUSES = [
  "requested",
  "approved",
  "applied",
  "shelf_confirmed",
  "rejected",
] as const;

export type MarkdownWorkflowStatus = (typeof MARKDOWN_WORKFLOW_STATUSES)[number];

export const MARKDOWN_STAGE_TASKS = [
  "approve_markdown",
  "apply_markdown",
  "confirm_markdown_on_shelf",
] as const;

export type MarkdownStageTask = (typeof MARKDOWN_STAGE_TASKS)[number];

export const MARKDOWN_REQUEST_REASONS = [
  "rule_window",
  "excess_stock",
  "quality_issue",
  "package_damage",
  "operational_guidance",
  "other",
] as const;

export type MarkdownRequestReason = (typeof MARKDOWN_REQUEST_REASONS)[number];

export type MarkdownStartBlockerCode =
  | "presence_required"
  | "not_markdown_due"
  | "early_justification_required";

export interface MarkdownStartBlocker {
  code: MarkdownStartBlockerCode;
  label: string;
}

export type MarkdownStartEligibility =
  | {
      status: "allowed";
      workflowStatus: "requested";
      requiresLeadershipApproval: true;
      reason: MarkdownRequestReason;
    }
  | {
      status: "blocked";
      blocker: MarkdownStartBlocker;
    };

export interface MarkdownStartInput {
  riskState: RiskState;
  physicalConfirmation?: PhysicalConfirmation;
  currentTimestamp: string;
  maxPhysicalConfirmationAgeHours: number;
  requestReason: MarkdownRequestReason;
  earlyJustification?: string;
}

export interface MarkdownStageTaskCandidateInput {
  workflowId: string;
  lotId: string;
  productDisplayName: string;
  lotIdentity: string;
  currentLocation: {
    kind:
      | "area_de_venda"
      | "estoque"
      | "camara_fria"
      | "ilha_promocional"
      | "retirada_perda"
      | "other";
    customName?: string;
  };
  sourceRisk: {
    state: "markdown_due";
    reasons: readonly { code: "expires_in_15_days"; field?: string }[];
  };
  observedAt: string;
  currentStage: Extract<MarkdownWorkflowStatus, "requested" | "approved" | "applied">;
}

export interface MarkdownStageTaskCandidate {
  activeKey: string;
  lotId: string;
  productDisplayName: string;
  lotIdentity: string;
  currentLocation: MarkdownStageTaskCandidateInput["currentLocation"];
  riskState: "markdown_due";
  severity: TodayTaskSeverity;
  dueBucket: TodayDueBucket;
  requiredResolution: Extract<
    RequiredResolution,
    "approve_markdown" | "apply_markdown" | "confirm_markdown_on_shelf"
  >;
  section: Extract<TodayTaskSection, "request_markdown">;
  ownerLabel: "Lideranca local" | "Equipe do turno";
  sourceRisk: MarkdownStageTaskCandidateInput["sourceRisk"];
  priority: number;
  observedAt: string;
  markdownWorkflowId: string;
  markdownStage: Extract<MarkdownWorkflowStatus, "requested" | "approved" | "applied">;
}

const PRESENCE_REQUIRED_BLOCKER: MarkdownStartBlocker = {
  code: "presence_required",
  label: "Conferir presenca antes da rebaixa",
};

const NOT_MARKDOWN_DUE_BLOCKER: MarkdownStartBlocker = {
  code: "not_markdown_due",
  label: "Lote fora da janela de rebaixa",
};

const EARLY_JUSTIFICATION_REQUIRED_BLOCKER: MarkdownStartBlocker = {
  code: "early_justification_required",
  label: "Informe a justificativa da rebaixa antecipada",
};

export function canStartMarkdownWorkflow(input: MarkdownStartInput): MarkdownStartEligibility {
  const freshness = classifyPhysicalConfirmationFreshness({
    currentTimestamp: input.currentTimestamp,
    maxPhysicalConfirmationAgeHours: input.maxPhysicalConfirmationAgeHours,
    ...(input.physicalConfirmation === undefined
      ? {}
      : { confirmation: input.physicalConfirmation }),
  });

  if (
    freshness.status !== "fresh" ||
    (freshness.confirmation.status !== "present" && freshness.confirmation.status !== "moved")
  ) {
    return {
      status: "blocked",
      blocker: PRESENCE_REQUIRED_BLOCKER,
    };
  }

  if (input.requestReason === "rule_window") {
    if (input.riskState !== "markdown_due") {
      return {
        status: "blocked",
        blocker: NOT_MARKDOWN_DUE_BLOCKER,
      };
    }

    return {
      status: "allowed",
      workflowStatus: "requested",
      requiresLeadershipApproval: true,
      reason: input.requestReason,
    };
  }

  if (input.earlyJustification?.trim()) {
    return {
      status: "allowed",
      workflowStatus: "requested",
      requiresLeadershipApproval: true,
      reason: input.requestReason,
    };
  }

  return {
    status: "blocked",
    blocker: EARLY_JUSTIFICATION_REQUIRED_BLOCKER,
  };
}

export function deriveMarkdownStageTaskCandidate(
  input: MarkdownStageTaskCandidateInput,
): MarkdownStageTaskCandidate {
  const policy = stagePolicyFor(input.currentStage);

  return {
    activeKey: `markdown:${input.workflowId}:${input.currentStage}`,
    lotId: input.lotId,
    productDisplayName: input.productDisplayName,
    lotIdentity: input.lotIdentity,
    currentLocation: input.currentLocation,
    riskState: "markdown_due",
    severity: policy.severity,
    dueBucket: policy.dueBucket,
    requiredResolution: policy.requiredResolution,
    section: "request_markdown",
    ownerLabel: policy.ownerLabel,
    sourceRisk: input.sourceRisk,
    priority: policy.priority,
    observedAt: input.observedAt,
    markdownWorkflowId: input.workflowId,
    markdownStage: input.currentStage,
  };
}

function stagePolicyFor(stage: MarkdownStageTaskCandidateInput["currentStage"]): {
  requiredResolution: MarkdownStageTaskCandidate["requiredResolution"];
  ownerLabel: MarkdownStageTaskCandidate["ownerLabel"];
  dueBucket: TodayDueBucket;
  severity: TodayTaskSeverity;
  priority: number;
} {
  if (stage === "requested") {
    return {
      requiredResolution: "approve_markdown",
      ownerLabel: "Lideranca local",
      dueBucket: "today",
      severity: "medium",
      priority: 3,
    };
  }

  if (stage === "approved") {
    return {
      requiredResolution: "apply_markdown",
      ownerLabel: "Equipe do turno",
      dueBucket: "shift",
      severity: "high",
      priority: 2,
    };
  }

  return {
    requiredResolution: "confirm_markdown_on_shelf",
    ownerLabel: "Equipe do turno",
    dueBucket: "now",
    severity: "high",
    priority: 1,
  };
}
