import type { CategoryRuleProfile, ProductRuleOverride, RuleProfile, RiskWindows } from "./types";

export const DEFAULT_RISK_WINDOWS = {
  radarDays: 60,
  markdownDays: 15,
  criticalDays: 3,
  expiredDays: 0,
} as const satisfies RiskWindows;

export const DEFAULT_RULE_PROFILE: RuleProfile = {
  mode: "formal_validity",
  windows: { ...DEFAULT_RISK_WINDOWS },
};

export function resolveRuleProfile(
  categoryProfile: CategoryRuleProfile,
  productOverride?: ProductRuleOverride,
): RuleProfile {
  return {
    mode: productOverride?.mode ?? categoryProfile.mode,
    windows: {
      ...DEFAULT_RISK_WINDOWS,
      ...categoryProfile.windows,
      ...productOverride?.windows,
    },
  };
}
