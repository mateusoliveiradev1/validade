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

export interface FlvInspectionRiskLot {
  mode: "flv_inspection";
  productId: string;
  lotCode: string;
}

export interface ReceivingMonitoredRiskLot {
  mode: "receiving_monitored";
  productId: string;
  lotCode: string;
}

export type RiskCalculationLot =
  | FormalValidityRiskLot
  | FlvInspectionRiskLot
  | ReceivingMonitoredRiskLot;

export interface RiskCalculationInput {
  currentDate: string;
  categoryProfile: CategoryRuleProfile;
  productOverride?: ProductRuleOverride;
  lot: RiskCalculationLot;
}

export function compareRiskSeverity(left: ConcreteRiskState, right: ConcreteRiskState): number {
  return CONCRETE_SEVERITY[left] - CONCRETE_SEVERITY[right];
}

export function calculateLotRisk(input: RiskCalculationInput): RiskAssessment {
  const profile = resolveRuleProfile(input.categoryProfile, input.productOverride);

  if (input.lot.mode !== "formal_validity") {
    return uncertainty("missing_required_date", "lot.mode");
  }

  if (!input.lot.expiresAt) {
    return uncertainty("missing_required_date", "expiresAt");
  }

  const daysUntilExpiry = daysBetween(input.currentDate, input.lot.expiresAt);

  if (daysUntilExpiry < profile.windows.expiredDays) {
    return {
      state: "expired",
      command: "withdraw_now",
      reasons: [reason("expired", "expiresAt")],
    };
  }

  if (daysUntilExpiry <= profile.windows.criticalDays) {
    return {
      state: "critical",
      command: "monitor",
      reasons: [reason("expires_in_3_days", "expiresAt")],
    };
  }

  if (daysUntilExpiry <= profile.windows.markdownDays) {
    return {
      state: "markdown_due",
      command: "request_markdown",
      reasons: [reason("expires_in_15_days", "expiresAt")],
    };
  }

  if (daysUntilExpiry <= profile.windows.radarDays) {
    return {
      state: "radar",
      command: "monitor",
      reasons: [reason("expires_in_60_days", "expiresAt")],
    };
  }

  return {
    state: "safe",
    command: "monitor",
    reasons: [],
  };
}

function uncertainty(code: RiskReasonCode, field: string): RiskAssessment {
  return {
    state: "uncertain",
    command: "correct_data",
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
