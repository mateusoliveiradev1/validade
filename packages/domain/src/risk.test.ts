import { describe, expect, it } from "vitest";
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

  it("treats an expiry date equal to the current date as critical, not expired", () => {
    const result = calculateLotRisk(formalValidityInput(currentDate));

    expect(result.state).toBe("critical");
    expect(result.command).toBe("monitor");
    expect(result.reasons.map((reason) => reason.code)).toContain("expires_in_3_days");
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
