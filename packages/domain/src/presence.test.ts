import { describe, expect, it } from "vitest";
import {
  PHYSICAL_CONFIRMATION_STATUSES,
  classifyPhysicalConfirmationFreshness,
  type PhysicalConfirmation,
} from "./presence";
import { resolveRuleProfile } from "./profiles";
import type { CategoryRuleProfile, ProductRuleOverride } from "./types";

const currentTimestamp = "2026-06-19T12:00:00.000Z";

describe("physical confirmation vocabulary", () => {
  it("exports exactly the concrete physical confirmation statuses", () => {
    expect(PHYSICAL_CONFIRMATION_STATUSES).toEqual([
      "present",
      "moved",
      "withdrawn",
      "loss",
      "not_found",
      "probably_sold_out",
    ]);
    expect(PHYSICAL_CONFIRMATION_STATUSES).not.toContain("checked");
    expect(PHYSICAL_CONFIRMATION_STATUSES).not.toContain("confirmed");
  });

  it("accepts a recent present confirmation with approximate quantity", () => {
    const confirmation: PhysicalConfirmation = {
      status: "present",
      confirmedAt: "2026-06-19T11:30:00.000Z",
      approximateQuantity: 12,
    };

    const freshness = classifyPhysicalConfirmationFreshness({
      confirmation,
      currentTimestamp,
      maxPhysicalConfirmationAgeHours: 24,
    });

    expect(freshness.status).toBe("fresh");
    expect(freshness.confirmation?.status).toBe("present");
    expect(freshness.confirmation?.approximateQuantity).toBe(12);
  });

  it("marks a 25-hour-old confirmation as stale when max age is 24 hours", () => {
    const freshness = classifyPhysicalConfirmationFreshness({
      confirmation: {
        status: "present",
        confirmedAt: "2026-06-18T10:59:00.000Z",
      },
      currentTimestamp,
      maxPhysicalConfirmationAgeHours: 24,
    });

    expect(freshness.status).toBe("stale");
    expect(freshness.ageHours).toBeGreaterThan(25);
  });
});

describe("physical confirmation recency profiles", () => {
  it("resolves maxPhysicalConfirmationAgeHours from category defaults and product overrides", () => {
    const categoryProfile: CategoryRuleProfile = {
      categoryId: "categoria-ficticia-ovos",
      mode: "formal_validity",
      maxPhysicalConfirmationAgeHours: 24,
    };
    const productOverride: ProductRuleOverride = {
      productId: "produto-ficticio-ovos-001",
      maxPhysicalConfirmationAgeHours: 12,
    };

    expect(resolveRuleProfile(categoryProfile).maxPhysicalConfirmationAgeHours).toBe(24);
    expect(resolveRuleProfile(categoryProfile, productOverride).maxPhysicalConfirmationAgeHours).toBe(
      12,
    );
  });
});
