import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { calculateLotRisk } from "./risk";
import type { CategoryRuleProfile } from "./types";

const currentDate = "2026-06-19";

const categoryProfile: CategoryRuleProfile = {
  categoryId: "categoria-ficticia-ovos",
  mode: "formal_validity",
};

const flvCategoryProfile = {
  categoryId: "categoria-ficticia-flv",
  mode: "flv_inspection",
  windows: {
    qualityWindowDays: 3,
  },
} as const;

const presenceAwareCategoryProfile: CategoryRuleProfile = {
  categoryId: "categoria-ficticia-ovos",
  mode: "formal_validity",
  maxPhysicalConfirmationAgeHours: 24,
};

function formalValidityInput(expiresAt: string) {
  return {
    currentDate,
    categoryProfile,
    lot: {
      mode: "formal_validity",
      productId: "produto-ficticio-ovos-001",
      lotCode: "LOTE-FICTICIO-OVOS-001",
      expiresAt,
    },
  } as const;
}

describe("formal-validity risk windows", () => {
  it.each([
    ["2026-09-01", "safe", undefined, "monitor"],
    ["2026-08-17", "radar", "expires_in_60_days", "monitor"],
    ["2026-07-04", "markdown_due", "expires_in_15_days", "request_markdown"],
    ["2026-06-22", "critical", "expires_in_3_days", "monitor"],
    ["2026-06-18", "expired", "expired", "withdraw_now"],
  ] as const)(
    "returns %s as %s for the default 60 / 15 / 3 / 0 windows",
    (expiresAt, expectedState, expectedReason, expectedCommand) => {
      const result = calculateLotRisk(formalValidityInput(expiresAt));

      expect(result.state).toBe(expectedState);
      expect(result.command).toBe(expectedCommand);
      if (expectedReason) {
        expect(result.reasons.map((reason) => reason.code)).toContain(expectedReason);
      } else {
        expect(result.reasons).toEqual([]);
      }
    },
  );

  it("treats an expiry date equal to the current date as expired", () => {
    const result = calculateLotRisk(formalValidityInput(currentDate));

    expect(result.state).toBe("expired");
    expect(result.command).toBe("withdraw_now");
    expect(result.reasons.map((reason) => reason.code)).toContain("expired");
  });
});

describe("FLV quality-window and missing-data uncertainty", () => {
  it("calculates FLV critical risk from receivedAt plus qualityWindowDays", () => {
    const result = calculateLotRisk({
      currentDate: "2026-06-22",
      categoryProfile: flvCategoryProfile,
      lot: {
        mode: "flv_inspection",
        productId: "produto-ficticio-maca-001",
        lotCode: "LOTE-FICTICIO-FLV-001",
        receivedAt: "2026-06-19",
      },
    });

    expect(result.state).toBe("critical");
    expect(result.command).toBe("monitor");
    expect(result.reasons.map((reason) => reason.code)).toContain("expires_in_3_days");
  });

  it("calculates FLV expired risk after the quality window", () => {
    const result = calculateLotRisk({
      currentDate: "2026-06-23",
      categoryProfile: flvCategoryProfile,
      lot: {
        mode: "flv_inspection",
        productId: "produto-ficticio-maca-001",
        lotCode: "LOTE-FICTICIO-FLV-001",
        receivedAt: "2026-06-19",
      },
    });

    expect(result.state).toBe("expired");
    expect(result.command).toBe("withdraw_now");
    expect(result.reasons.map((reason) => reason.code)).toContain("expired");
  });

  it("uses a direct qualityInspectionDueAt date when one is present", () => {
    const result = calculateLotRisk({
      currentDate: "2026-06-22",
      categoryProfile: flvCategoryProfile,
      lot: {
        mode: "flv_inspection",
        productId: "produto-ficticio-maca-001",
        lotCode: "LOTE-FICTICIO-FLV-001",
        qualityInspectionDueAt: "2026-06-22",
      },
    });

    expect(result.state).toBe("critical");
    expect(result.command).toBe("monitor");
  });

  it("returns uncertain and correct_data for a formal lot without expiresAt", () => {
    const result = calculateLotRisk({
      currentDate,
      categoryProfile,
      lot: {
        mode: "formal_validity",
        productId: "produto-ficticio-ovos-001",
        lotCode: "LOTE-FICTICIO-OVOS-001",
      },
    });

    expect(result.state).toBe("uncertain");
    expect(result.command).toBe("correct_data");
    expect(result.reasons.map((reason) => reason.code)).toContain("missing_required_date");
  });

  it("returns uncertain and correct_data for FLV without quality-window inputs", () => {
    const result = calculateLotRisk({
      currentDate,
      categoryProfile: {
        categoryId: "categoria-ficticia-flv",
        mode: "flv_inspection",
      },
      lot: {
        mode: "flv_inspection",
        productId: "produto-ficticio-maca-001",
        lotCode: "LOTE-FICTICIO-FLV-001",
      },
    });

    expect(result.state).toBe("uncertain");
    expect(result.command).toBe("correct_data");
    expect(result.reasons.map((reason) => reason.code)).toContain("missing_quality_window");
  });
});

describe("risk severity precedence and product overrides", () => {
  it("keeps processed items out of markdown and requires repack or loss when expired", () => {
    const markdownWindow = calculateLotRisk({
      currentDate,
      categoryProfile: {
        categoryId: "categoria-ficticia-processados",
        mode: "processed_repack_loss",
      },
      lot: {
        mode: "processed_repack_loss",
        productId: "produto-ficticio-melancia-processada-001",
        lotCode: "LOTE-FICTICIO-MELANCIA-001",
        expiresAt: "2026-07-04",
      },
    });
    const expired = calculateLotRisk({
      currentDate,
      categoryProfile: {
        categoryId: "categoria-ficticia-processados",
        mode: "processed_repack_loss",
      },
      lot: {
        mode: "processed_repack_loss",
        productId: "produto-ficticio-melancia-processada-001",
        lotCode: "LOTE-FICTICIO-MELANCIA-001",
        expiresAt: "2026-06-18",
      },
    });

    expect(markdownWindow.state).toBe("radar");
    expect(markdownWindow.command).toBe("monitor");
    expect(expired.state).toBe("expired");
    expect(expired.command).toBe("repack_or_loss");
  });

  it("treats a processed item expiring today as repack or loss work", () => {
    const result = calculateLotRisk({
      currentDate,
      categoryProfile: {
        categoryId: "categoria-ficticia-processados",
        mode: "processed_repack_loss",
      },
      lot: {
        mode: "processed_repack_loss",
        productId: "produto-ficticio-melancia-processada-001",
        lotCode: "LOTE-FICTICIO-MELANCIA-001",
        expiresAt: currentDate,
      },
    });

    expect(result.state).toBe("expired");
    expect(result.command).toBe("repack_or_loss");
    expect(result.reasons.map((reason) => reason.code)).toContain("expired");
  });

  it("keeps expired dominating markdown_due and lower states", () => {
    const result = calculateLotRisk(formalValidityInput("2026-06-18"));

    expect(result.state).toBe("expired");
    expect(result.state).not.toBe("markdown_due");
    expect(result.command).toBe("withdraw_now");
    expect(result.reasons.map((reason) => reason.code)).toContain("expired");
  });

  it("uses product markdownDays override so a 10-day item is radar instead of markdown_due", () => {
    const categoryProfileWithDefaults: CategoryRuleProfile = {
      categoryId: "categoria-ficticia-ovos",
      mode: "formal_validity",
      windows: {
        markdownDays: 15,
      },
    };
    const productOverride = {
      productId: "produto-ficticio-ovos-001",
      windows: {
        markdownDays: 7,
      },
    } as const;
    const originalCategoryProfile = structuredClone(categoryProfileWithDefaults);
    const originalProductOverride = structuredClone(productOverride);

    const result = calculateLotRisk({
      ...formalValidityInput("2026-06-29"),
      categoryProfile: categoryProfileWithDefaults,
      productOverride,
    });

    expect(result.state).toBe("radar");
    expect(result.state).not.toBe("markdown_due");
    expect(result.reasons.map((reason) => reason.code)).toContain("expires_in_60_days");
    expect(categoryProfileWithDefaults).toEqual(originalCategoryProfile);
    expect(productOverride).toEqual(originalProductOverride);
  });
});

describe("presence-aware risk uncertainty", () => {
  it("returns blocking uncertain check_presence when the last physical confirmation is stale", () => {
    const result = calculateLotRisk({
      currentDate,
      currentTimestamp: "2026-06-19T12:00:00.000Z",
      categoryProfile: presenceAwareCategoryProfile,
      lastPhysicalConfirmation: {
        status: "present",
        confirmedAt: "2026-06-18T10:59:00.000Z",
      },
      lot: {
        mode: "formal_validity",
        productId: "produto-ficticio-ovos-001",
        lotCode: "LOTE-FICTICIO-OVOS-001",
        expiresAt: "2026-07-04",
      },
    });

    expect(result.state).toBe("uncertain");
    expect(result.command).toBe("check_presence");
    expect(result.reasons.map((reason) => reason.code)).toContain("presence_stale");
  });

  it("returns blocking uncertain check_presence when risky lot has no physical confirmation", () => {
    const result = calculateLotRisk({
      currentDate,
      currentTimestamp: "2026-06-19T12:00:00.000Z",
      categoryProfile: presenceAwareCategoryProfile,
      lot: {
        mode: "formal_validity",
        productId: "produto-ficticio-ovos-001",
        lotCode: "LOTE-FICTICIO-OVOS-001",
        expiresAt: "2026-07-04",
      },
    });

    expect(result.state).toBe("uncertain");
    expect(result.command).toBe("check_presence");
    expect(result.reasons.map((reason) => reason.code)).toContain("presence_missing");
  });

  it("keeps date-window risk when physical confirmation is fresh", () => {
    const result = calculateLotRisk({
      currentDate,
      currentTimestamp: "2026-06-19T12:00:00.000Z",
      categoryProfile: presenceAwareCategoryProfile,
      lastPhysicalConfirmation: {
        status: "present",
        confirmedAt: "2026-06-19T11:30:00.000Z",
        approximateQuantity: 8,
      },
      lot: {
        mode: "formal_validity",
        productId: "produto-ficticio-ovos-001",
        lotCode: "LOTE-FICTICIO-OVOS-001",
        expiresAt: "2026-07-04",
      },
    });

    expect(result.state).toBe("markdown_due");
    expect(result.command).toBe("request_markdown");
    expect(result.reasons.map((reason) => reason.code)).toContain("expires_in_15_days");
  });

  it("does not use an implicit system clock inside risk calculation", () => {
    const riskSourcePath = fileURLToPath(new URL("./risk.ts", import.meta.url));
    const riskSource = readFileSync(riskSourcePath, "utf8");

    expect(riskSource).not.toContain("Date.now(");
    expect(riskSource).not.toContain("new Date()");
  });
});
