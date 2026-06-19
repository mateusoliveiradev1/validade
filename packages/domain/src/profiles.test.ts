import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_WINDOWS, DEFAULT_RULE_PROFILE, resolveRuleProfile } from "./profiles";
import type { CategoryRuleProfile, ProductRuleOverride } from "./types";

describe("domain rule profiles", () => {
  it("exports the default 60 / 15 / 3 / 0 risk windows", () => {
    expect(DEFAULT_RISK_WINDOWS).toEqual({
      radarDays: 60,
      markdownDays: 15,
      criticalDays: 3,
      expiredDays: 0,
    });
    expect(DEFAULT_RULE_PROFILE).toEqual({
      mode: "formal_validity",
      windows: DEFAULT_RISK_WINDOWS,
    });
  });

  it("resolves category defaults with product overrides without mutating inputs", () => {
    const categoryProfile: CategoryRuleProfile = {
      categoryId: "categoria-ficticia-ovos",
      mode: "formal_validity",
      windows: {
        radarDays: 45,
        markdownDays: 12,
      },
    };
    const productOverride: ProductRuleOverride = {
      productId: "produto-ficticio-ovos-001",
      windows: {
        markdownDays: 10,
      },
    };
    const originalCategoryProfile = structuredClone(categoryProfile);
    const originalProductOverride = structuredClone(productOverride);

    const resolvedProfile = resolveRuleProfile(categoryProfile, productOverride);

    expect(resolvedProfile).toEqual({
      mode: "formal_validity",
      windows: {
        radarDays: 45,
        markdownDays: 10,
        criticalDays: 3,
        expiredDays: 0,
      },
    });
    expect(categoryProfile).toEqual(originalCategoryProfile);
    expect(productOverride).toEqual(originalProductOverride);
  });

  it("allows a product profile to override the category mode", () => {
    const categoryProfile: CategoryRuleProfile = {
      categoryId: "categoria-ficticia-flv",
      mode: "flv_inspection",
    };
    const productOverride: ProductRuleOverride = {
      productId: "produto-ficticio-embalado-001",
      mode: "receiving_monitored",
    };

    expect(resolveRuleProfile(categoryProfile, productOverride).mode).toBe("receiving_monitored");
  });
});
