import { DEFAULT_RISK_WINDOWS } from "./profiles";
import type { CategoryRuleProfile, ProductMode, ProductRuleOverride, RiskWindows } from "./types";

export const STORE_PRESENTATION_KINDS = [
  "loose_whole",
  "supplier_packaged",
  "store_cut_ped",
  "store_fractioned_repacked",
  "prepared_ready_to_eat",
  "eggs",
  "industrial_chilled_validity",
  "unknown_other",
] as const;

export type StorePresentationKind = (typeof STORE_PRESENTATION_KINDS)[number];

export type ProductPolicyRequiredLotField =
  | "expiresAt"
  | "receivedAt"
  | "qualityWindowDays"
  | "qualityInspectionDueAt";

export type ProductPolicyTerminalAction =
  | "withdraw_or_loss"
  | "repack_or_loss"
  | "check_presence";

export type ProductPolicyKey =
  | "printed_validity"
  | "quality_inspection"
  | "internal_repack_loss"
  | "conservative_review";

export interface ProductOperationalPolicyInput {
  storePresentation: StorePresentationKind;
  categoryRuleProfile: CategoryRuleProfile;
  productRuleOverride?: Pick<ProductRuleOverride, "mode" | "windows">;
  currentDate?: string;
}

export interface ProductOperationalPolicy {
  mode: ProductMode;
  requiredLotFields: readonly ProductPolicyRequiredLotField[];
  allowMarkdown: boolean;
  defaultMarkdownDays: number | null;
  qualityWindowDays: number | null;
  terminalAction: ProductPolicyTerminalAction;
  requiresCentralReview: boolean;
  publicPolicyKey: ProductPolicyKey;
}

interface PresentationDefaults {
  mode: ProductMode;
  allowMarkdown: boolean;
  requiresCentralReview: boolean;
  publicPolicyKey: ProductPolicyKey;
}

const DEFAULT_QUALITY_WINDOW_DAYS = 3;

const PRESENTATION_DEFAULTS: Record<StorePresentationKind, PresentationDefaults> = {
  loose_whole: {
    mode: "flv_inspection",
    allowMarkdown: false,
    requiresCentralReview: false,
    publicPolicyKey: "quality_inspection",
  },
  supplier_packaged: {
    mode: "formal_validity",
    allowMarkdown: true,
    requiresCentralReview: false,
    publicPolicyKey: "printed_validity",
  },
  store_cut_ped: {
    mode: "processed_repack_loss",
    allowMarkdown: false,
    requiresCentralReview: false,
    publicPolicyKey: "internal_repack_loss",
  },
  store_fractioned_repacked: {
    mode: "processed_repack_loss",
    allowMarkdown: false,
    requiresCentralReview: false,
    publicPolicyKey: "internal_repack_loss",
  },
  prepared_ready_to_eat: {
    mode: "processed_repack_loss",
    allowMarkdown: false,
    requiresCentralReview: false,
    publicPolicyKey: "internal_repack_loss",
  },
  eggs: {
    mode: "formal_validity",
    allowMarkdown: true,
    requiresCentralReview: false,
    publicPolicyKey: "printed_validity",
  },
  industrial_chilled_validity: {
    mode: "formal_validity",
    allowMarkdown: true,
    requiresCentralReview: false,
    publicPolicyKey: "printed_validity",
  },
  unknown_other: {
    mode: "receiving_monitored",
    allowMarkdown: false,
    requiresCentralReview: true,
    publicPolicyKey: "conservative_review",
  },
};

const REQUIRED_FIELDS_BY_MODE: Record<ProductMode, readonly ProductPolicyRequiredLotField[]> = {
  formal_validity: ["expiresAt"],
  flv_inspection: ["receivedAt", "qualityWindowDays"],
  processed_repack_loss: ["expiresAt"],
  receiving_monitored: ["receivedAt"],
};

export function resolveProductOperationalPolicy(
  input: ProductOperationalPolicyInput,
): ProductOperationalPolicy {
  const defaults = PRESENTATION_DEFAULTS[input.storePresentation];
  const mode = input.productRuleOverride?.mode ?? defaults.mode;
  const windows = resolvePolicyWindows(input.categoryRuleProfile, input.productRuleOverride);
  const allowMarkdown = defaults.allowMarkdown && mode === "formal_validity";
  const qualityWindowDays =
    mode === "flv_inspection"
      ? (windows.qualityWindowDays ?? DEFAULT_QUALITY_WINDOW_DAYS)
      : null;

  return {
    mode,
    requiredLotFields: REQUIRED_FIELDS_BY_MODE[mode],
    allowMarkdown,
    defaultMarkdownDays: allowMarkdown ? windows.markdownDays : null,
    qualityWindowDays,
    terminalAction: terminalActionForMode(mode),
    requiresCentralReview: defaults.requiresCentralReview,
    publicPolicyKey: defaults.publicPolicyKey,
  };
}

function resolvePolicyWindows(
  categoryRuleProfile: CategoryRuleProfile,
  productRuleOverride: ProductOperationalPolicyInput["productRuleOverride"] | undefined,
): RiskWindows {
  return {
    ...DEFAULT_RISK_WINDOWS,
    ...categoryRuleProfile.windows,
    ...productRuleOverride?.windows,
  };
}

function terminalActionForMode(mode: ProductMode): ProductPolicyTerminalAction {
  if (mode === "processed_repack_loss") {
    return "repack_or_loss";
  }

  if (mode === "formal_validity") {
    return "withdraw_or_loss";
  }

  return "check_presence";
}
