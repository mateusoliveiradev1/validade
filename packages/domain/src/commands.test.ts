import { describe, expect, it } from "vitest";
import { calculateLotRisk } from "./risk";
import type { CategoryRuleProfile } from "./types";

const currentDate = "2026-06-19";
const currentTimestamp = "2026-06-19T12:00:00.000Z";

const categoryProfile: CategoryRuleProfile = {
  categoryId: "categoria-ficticia-ovos",
  mode: "formal_validity",
  maxPhysicalConfirmationAgeHours: 24,
};

const freshPresence = {
  status: "present",
  confirmedAt: "2026-06-19T11:30:00.000Z",
  approximateQuantity: 10,
} as const;

function formalRisk(expiresAt?: string) {
  return calculateLotRisk({
    currentDate,
    currentTimestamp,
    categoryProfile,
    lastPhysicalConfirmation: freshPresence,
    lot: {
      mode: "formal_validity",
      productId: "produto-ficticio-ovos-001",
      lotCode: "LOTE-FICTICIO-OVOS-001",
      ...(expiresAt ? { expiresAt } : {}),
    },
  });
}

describe("operational command mapping", () => {
  it("returns correct_data when required date data is missing", () => {
    expect(formalRisk().command).toBe("correct_data");
  });

  it("returns check_presence when physical confirmation is stale", () => {
    const result = calculateLotRisk({
      currentDate,
      currentTimestamp,
      categoryProfile,
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

    expect(result.command).toBe("check_presence");
  });

  it("returns request_markdown for markdown window with fresh presence", () => {
    expect(formalRisk("2026-07-04").command).toBe("request_markdown");
  });

  it("returns withdraw_now for expired lots with fresh presence", () => {
    expect(formalRisk("2026-06-18").command).toBe("withdraw_now");
  });

  it("returns monitor for safe, radar, and critical fresh scenarios", () => {
    expect(formalRisk("2026-09-01").command).toBe("monitor");
    expect(formalRisk("2026-08-17").command).toBe("monitor");
    expect(formalRisk("2026-06-22").command).toBe("monitor");
  });
});

describe("conditional physical resolutions", () => {
  it("keeps not_found traceable without stale-presence uncertainty", () => {
    const result = calculateLotRisk({
      currentDate,
      currentTimestamp,
      categoryProfile,
      lastPhysicalConfirmation: {
        status: "not_found",
        confirmedAt: "2026-06-18T10:59:00.000Z",
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
    expect(result.reasons.map((reason) => reason.code)).toContain(
      "presence_conditionally_resolved",
    );
  });

  it("keeps probably_sold_out traceable without stale-presence uncertainty", () => {
    const result = calculateLotRisk({
      currentDate,
      currentTimestamp,
      categoryProfile,
      lastPhysicalConfirmation: {
        status: "probably_sold_out",
        confirmedAt: "2026-06-18T10:59:00.000Z",
      },
      lot: {
        mode: "formal_validity",
        productId: "produto-ficticio-ovos-001",
        lotCode: "LOTE-FICTICIO-OVOS-001",
        expiresAt: "2026-08-17",
      },
    });

    expect(result.state).toBe("radar");
    expect(result.command).toBe("monitor");
    expect(result.reasons.map((reason) => reason.code)).toContain(
      "presence_conditionally_resolved",
    );
  });
});
