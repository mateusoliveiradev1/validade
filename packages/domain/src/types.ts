export const PRODUCT_MODES = ["formal_validity", "flv_inspection", "receiving_monitored"] as const;

export type ProductMode = (typeof PRODUCT_MODES)[number];

export const RISK_STATES = [
  "safe",
  "radar",
  "markdown_due",
  "critical",
  "expired",
  "uncertain",
] as const;

export type RiskState = (typeof RISK_STATES)[number];

export const OPERATIONAL_COMMANDS = [
  "check_presence",
  "request_markdown",
  "withdraw_now",
  "monitor",
  "correct_data",
] as const;

export type OperationalCommand = (typeof OPERATIONAL_COMMANDS)[number];

export const RISK_REASON_CODES = [
  "missing_required_date",
  "missing_received_date",
  "missing_quality_window",
  "presence_conditionally_resolved",
  "presence_missing",
  "presence_stale",
  "expired",
  "expires_in_60_days",
  "expires_in_15_days",
  "expires_in_3_days",
] as const;

export type RiskReasonCode = (typeof RISK_REASON_CODES)[number];

export interface RiskWindows {
  radarDays: number;
  markdownDays: number;
  criticalDays: number;
  expiredDays: number;
  qualityWindowDays?: number;
}

export interface RuleProfile {
  mode: ProductMode;
  windows: RiskWindows;
  maxPhysicalConfirmationAgeHours?: number;
}

export interface CategoryRuleProfile {
  categoryId: string;
  mode: ProductMode;
  windows?: Partial<RiskWindows>;
  maxPhysicalConfirmationAgeHours?: number;
}

export interface ProductRuleOverride {
  productId: string;
  mode?: ProductMode;
  windows?: Partial<RiskWindows>;
  maxPhysicalConfirmationAgeHours?: number;
}

export interface ProductBase {
  productId: string;
  categoryId: string;
  displayName: string;
}

export interface FormalValidityProduct extends ProductBase {
  mode: "formal_validity";
  lotRequirements: {
    expiresAt: true;
    receivedAt?: boolean;
  };
}

export interface FlvInspectionProduct extends ProductBase {
  mode: "flv_inspection";
  lotRequirements: {
    receivedAt: true;
    qualityWindowDays: true;
    qualityInspectionDueAt?: boolean;
  };
}

export interface ReceivingMonitoredProduct extends ProductBase {
  mode: "receiving_monitored";
  lotRequirements: {
    receivedAt: true;
  };
}

export type ProductDefinition =
  | FormalValidityProduct
  | FlvInspectionProduct
  | ReceivingMonitoredProduct;

export interface LotBase {
  productId: string;
  lotCode: string;
  quantity?: number;
}

export interface FormalValidityLotInput extends LotBase {
  mode: "formal_validity";
  expiresAt: string;
  receivedAt?: string;
}

export interface FlvInspectionLotInput extends LotBase {
  mode: "flv_inspection";
  receivedAt?: string;
  qualityWindowDays?: number;
  qualityInspectionDueAt?: string;
}

export interface ReceivingMonitoredLotInput extends LotBase {
  mode: "receiving_monitored";
  receivedAt: string;
}

export type LotInput = FormalValidityLotInput | FlvInspectionLotInput | ReceivingMonitoredLotInput;

export interface RiskReason {
  code: RiskReasonCode;
  field?: string;
}

export interface RiskAssessment {
  state: RiskState;
  command: OperationalCommand;
  reasons: readonly RiskReason[];
}
