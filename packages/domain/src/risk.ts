import { classifyPhysicalConfirmationFreshness, type PhysicalConfirmation } from "./presence";
import { resolveRuleProfile } from "./profiles";
import type {
  CategoryRuleProfile,
  ProductRuleOverride,
  RiskAssessment,
  RiskReason,
  RiskReasonCode,
  RiskState,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ConcreteRiskState = Exclude<RiskState, "uncertain">;

const CONCRETE_SEVERITY: Record<ConcreteRiskState, number> = {
  safe: 0,
  radar: 1,
  markdown_due: 2,
  critical: 3,
  expired: 4,
};

export interface FormalValidityRiskLot {
  mode: "formal_validity";
  productId: string;
  lotCode: string;
  expiresAt?: string;
}

export interface ProcessedRepackLossRiskLot {
  mode: "processed_repack_loss";
  productId: string;
  lotCode: string;
  expiresAt?: string;
}

export interface FlvInspectionRiskLot {
  mode: "flv_inspection";
  productId: string;
  lotCode: string;
  qualityInspectionDueAt?: string;
  receivedAt?: string;
  qualityWindowDays?: number;
}

export interface ReceivingMonitoredRiskLot {
  mode: "receiving_monitored";
  productId: string;
  lotCode: string;
  receivedAt?: string;
}

export type RiskCalculationLot =
  | FormalValidityRiskLot
  | ProcessedRepackLossRiskLot
  | FlvInspectionRiskLot
  | ReceivingMonitoredRiskLot;

export interface RiskCalculationInput {
  currentDate: string;
  currentTimestamp?: string;
  categoryProfile: CategoryRuleProfile;
  productOverride?: ProductRuleOverride;
  lastPhysicalConfirmation?: PhysicalConfirmation;
  lot: RiskCalculationLot;
}

export function compareRiskSeverity(left: ConcreteRiskState, right: ConcreteRiskState): number {
  return CONCRETE_SEVERITY[left] - CONCRETE_SEVERITY[right];
}

export function calculateLotRisk(input: RiskCalculationInput): RiskAssessment {
  const profile = resolveRuleProfile(input.categoryProfile, input.productOverride);
  const dateRisk = calculateDateRisk(input, profile.windows);

  return applyPresenceFreshness(input, dateRisk, profile.maxPhysicalConfirmationAgeHours);
}

function calculateDateRisk(
  input: RiskCalculationInput,
  windows: {
    radarDays: number;
    markdownDays: number;
    criticalDays: number;
    expiredDays: number;
    qualityWindowDays?: number;
  },
): RiskAssessment {
  if (input.lot.mode === "formal_validity" || input.lot.mode === "processed_repack_loss") {
    if (!input.lot.expiresAt) {
      return uncertainty("missing_required_date", "expiresAt");
    }

    return calculateWindowRisk(input.currentDate, input.lot.expiresAt, "expiresAt", windows, {
      allowMarkdown: input.lot.mode === "formal_validity",
      expireOnTargetDate: true,
      expiredCommand:
        input.lot.mode === "processed_repack_loss" ? "repack_or_loss" : "withdraw_now",
    });
  }

  if (input.lot.mode === "flv_inspection") {
    const qualityInspectionDueAt =
      input.lot.qualityInspectionDueAt ??
      deriveQualityInspectionDueAt(
        input.lot.receivedAt,
        input.lot.qualityWindowDays ?? windows.qualityWindowDays,
      );

    if (!qualityInspectionDueAt) {
      return uncertainty("missing_quality_window", "qualityWindow");
    }

    return calculateWindowRisk(
      input.currentDate,
      qualityInspectionDueAt,
      "qualityInspectionDueAt",
      windows,
    );
  }

  if (!input.lot.receivedAt) {
    return uncertainty("missing_received_date", "receivedAt");
  }

  return {
    state: "safe",
    command: "monitor",
    reasons: [],
  };
}

function applyPresenceFreshness(
  input: RiskCalculationInput,
  risk: RiskAssessment,
  maxPhysicalConfirmationAgeHours: number | undefined,
): RiskAssessment {
  if (risk.state === "uncertain") {
    return risk;
  }

  if (
    input.lastPhysicalConfirmation?.status === "not_found" ||
    input.lastPhysicalConfirmation?.status === "probably_sold_out"
  ) {
    return {
      ...risk,
      reasons: [
        ...risk.reasons,
        reason("presence_conditionally_resolved", "lastPhysicalConfirmation.status"),
      ],
    };
  }

  if (
    maxPhysicalConfirmationAgeHours === undefined ||
    input.currentTimestamp === undefined ||
    risk.state === "safe"
  ) {
    return risk;
  }

  const freshness = classifyPhysicalConfirmationFreshness(
    input.lastPhysicalConfirmation
      ? {
          confirmation: input.lastPhysicalConfirmation,
          currentTimestamp: input.currentTimestamp,
          maxPhysicalConfirmationAgeHours,
        }
      : {
          currentTimestamp: input.currentTimestamp,
          maxPhysicalConfirmationAgeHours,
        },
  );

  if (freshness.status === "missing") {
    return presenceUncertainty("presence_missing", "lastPhysicalConfirmation");
  }

  if (freshness.status === "stale") {
    return presenceUncertainty("presence_stale", "lastPhysicalConfirmation.confirmedAt");
  }

  return risk;
}

function calculateWindowRisk(
  currentDate: string,
  targetDate: string,
  field: string,
  windows: {
    radarDays: number;
    markdownDays: number;
    criticalDays: number;
    expiredDays: number;
  },
  options: {
    allowMarkdown?: boolean;
    expireOnTargetDate?: boolean;
    expiredCommand?: RiskAssessment["command"];
  } = {},
): RiskAssessment {
  const daysUntilTarget = daysBetween(currentDate, targetDate);
  const allowMarkdown = options.allowMarkdown ?? true;
  const isExpired =
    options.expireOnTargetDate === true
      ? daysUntilTarget <= windows.expiredDays
      : daysUntilTarget < windows.expiredDays;
  const expiredCommand = options.expiredCommand ?? "withdraw_now";

  if (isExpired) {
    return {
      state: "expired",
      command: expiredCommand,
      reasons: [reason("expired", field)],
    };
  }

  if (daysUntilTarget <= windows.criticalDays) {
    return {
      state: "critical",
      command: "monitor",
      reasons: [reason("expires_in_3_days", field)],
    };
  }

  if (allowMarkdown && daysUntilTarget <= windows.markdownDays) {
    return {
      state: "markdown_due",
      command: "request_markdown",
      reasons: [reason("expires_in_15_days", field)],
    };
  }

  if (daysUntilTarget <= windows.radarDays) {
    return {
      state: "radar",
      command: "monitor",
      reasons: [reason("expires_in_60_days", field)],
    };
  }

  return {
    state: "safe",
    command: "monitor",
    reasons: [],
  };
}

function deriveQualityInspectionDueAt(
  receivedAt: string | undefined,
  qualityWindowDays: number | undefined,
): string | undefined {
  if (!receivedAt || qualityWindowDays === undefined) {
    return undefined;
  }

  const receivedDate = parseIsoDateOnly(receivedAt);
  const dueAt = new Date(receivedDate.getTime() + qualityWindowDays * MS_PER_DAY);

  return dueAt.toISOString().slice(0, 10);
}

function uncertainty(code: RiskReasonCode, field: string): RiskAssessment {
  return {
    state: "uncertain",
    command: "correct_data",
    reasons: [reason(code, field)],
  };
}

function presenceUncertainty(code: RiskReasonCode, field: string): RiskAssessment {
  return {
    state: "uncertain",
    command: "check_presence",
    reasons: [reason(code, field)],
  };
}

function reason(code: RiskReasonCode, field: string): RiskReason {
  return { code, field };
}

function daysBetween(currentDate: string, targetDate: string): number {
  const current = parseIsoDateOnly(currentDate);
  const target = parseIsoDateOnly(targetDate);

  return Math.floor((target.getTime() - current.getTime()) / MS_PER_DAY);
}

function parseIsoDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
