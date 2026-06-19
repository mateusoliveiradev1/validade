import { describe, expect, it } from "vitest";
import { calculateLotRisk, type RiskCalculationInput } from "./risk";
import type { CategoryRuleProfile, ProductRuleOverride, RiskReasonCode } from "./types";

const currentDate = "2026-06-19";
const currentTimestamp = "2026-06-19T12:00:00.000Z";

const formalCategory: CategoryRuleProfile = {
  categoryId: "categoria-ficticia-ovos",
  mode: "formal_validity",
};

const flvCategory: CategoryRuleProfile = {
  categoryId: "categoria-ficticia-flv",
  mode: "flv_inspection",
  windows: {
    qualityWindowDays: 3,
  },
};

const presenceAwareCategory: CategoryRuleProfile = {
  ...formalCategory,
  maxPhysicalConfirmationAgeHours: 24,
};

const freshPresence = {
  status: "present",
  confirmedAt: "2026-06-19T11:30:00.000Z",
  approximateQuantity: 9,
} as const;

interface Scenario {
  label: string;
  input: RiskCalculationInput;
  expectedState: ReturnType<typeof calculateLotRisk>["state"];
  expectedCommand: ReturnType<typeof calculateLotRisk>["command"];
  expectedReason?: RiskReasonCode;
}

function formalLot(expiresAt?: string) {
  return {
    mode: "formal_validity",
    productId: "produto-ficticio-ovos-001",
    lotCode: "LOTE-FICTICIO-OVOS-001",
    ...(expiresAt ? { expiresAt } : {}),
  } as const;
}

function formalInput(
  expiresAt: string | undefined,
  overrides: Partial<RiskCalculationInput> = {},
): RiskCalculationInput {
  return {
    currentDate,
    categoryProfile: formalCategory,
    lot: formalLot(expiresAt),
    ...overrides,
  };
}

const markdownOverride: ProductRuleOverride = {
  productId: "produto-ficticio-ovos-001",
  windows: {
    markdownDays: 7,
  },
};

const scenarios: Scenario[] = [
  {
    label: "CAT-04 RSK-01 formal_validity safe keeps formal path distinct",
    input: formalInput("2026-09-01"),
    expectedState: "safe",
    expectedCommand: "monitor",
  },
  {
    label: "RSK-02 formal_validity radar uses default 60-day window",
    input: formalInput("2026-08-17"),
    expectedState: "radar",
    expectedCommand: "monitor",
    expectedReason: "expires_in_60_days",
  },
  {
    label: "RSK-02 formal_validity markdown uses default 15-day window",
    input: formalInput("2026-07-04"),
    expectedState: "markdown_due",
    expectedCommand: "request_markdown",
    expectedReason: "expires_in_15_days",
  },
  {
    label: "RSK-02 formal_validity critical uses default 3-day window",
    input: formalInput("2026-06-22"),
    expectedState: "critical",
    expectedCommand: "monitor",
    expectedReason: "expires_in_3_days",
  },
  {
    label: "D-07 formal_validity expired dominates lower states",
    input: formalInput("2026-06-18"),
    expectedState: "expired",
    expectedCommand: "withdraw_now",
    expectedReason: "expired",
  },
  {
    label: "CAT-04 RSK-01 flv_inspection critical uses quality-window path",
    input: {
      currentDate: "2026-06-22",
      categoryProfile: flvCategory,
      lot: {
        mode: "flv_inspection",
        productId: "produto-ficticio-maca-001",
        lotCode: "LOTE-FICTICIO-FLV-001",
        receivedAt: "2026-06-19",
      },
    },
    expectedState: "critical",
    expectedCommand: "monitor",
    expectedReason: "expires_in_3_days",
  },
  {
    label: "CAT-04 RSK-01 flv_inspection expired after quality window",
    input: {
      currentDate: "2026-06-23",
      categoryProfile: flvCategory,
      lot: {
        mode: "flv_inspection",
        productId: "produto-ficticio-maca-001",
        lotCode: "LOTE-FICTICIO-FLV-001",
        receivedAt: "2026-06-19",
      },
    },
    expectedState: "expired",
    expectedCommand: "withdraw_now",
    expectedReason: "expired",
  },
  {
    label: "CAT-04 receiving_monitored missing received date is uncertain",
    input: {
      currentDate,
      categoryProfile: {
        categoryId: "categoria-ficticia-recebimento",
        mode: "receiving_monitored",
      },
      lot: {
        mode: "receiving_monitored",
        productId: "produto-ficticio-banana-001",
        lotCode: "LOTE-FICTICIO-RECEBIMENTO-001",
      },
    },
    expectedState: "uncertain",
    expectedCommand: "correct_data",
    expectedReason: "missing_received_date",
  },
  {
    label: "D-04 missing formal date is uncertain instead of safe",
    input: formalInput(undefined),
    expectedState: "uncertain",
    expectedCommand: "correct_data",
    expectedReason: "missing_required_date",
  },
  {
    label: "LOC-04 stale physical presence is uncertain check_presence",
    input: formalInput("2026-07-04", {
      currentTimestamp,
      categoryProfile: presenceAwareCategory,
      lastPhysicalConfirmation: {
        status: "present",
        confirmedAt: "2026-06-18T10:59:00.000Z",
      },
    }),
    expectedState: "uncertain",
    expectedCommand: "check_presence",
    expectedReason: "presence_stale",
  },
  {
    label: "RSK-01 fresh physical presence preserves concrete risk",
    input: formalInput("2026-07-04", {
      currentTimestamp,
      categoryProfile: presenceAwareCategory,
      lastPhysicalConfirmation: freshPresence,
    }),
    expectedState: "markdown_due",
    expectedCommand: "request_markdown",
    expectedReason: "expires_in_15_days",
  },
  {
    label: "RSK-02 product override changes markdown window to radar",
    input: formalInput("2026-06-29", {
      categoryProfile: {
        ...formalCategory,
        windows: {
          markdownDays: 15,
        },
      },
      productOverride: markdownOverride,
    }),
    expectedState: "radar",
    expectedCommand: "monitor",
    expectedReason: "expires_in_60_days",
  },
  {
    label: "D-13 not_found remains conditional and traceable",
    input: formalInput("2026-07-04", {
      currentTimestamp,
      categoryProfile: presenceAwareCategory,
      lastPhysicalConfirmation: {
        status: "not_found",
        confirmedAt: "2026-06-18T10:59:00.000Z",
      },
    }),
    expectedState: "markdown_due",
    expectedCommand: "request_markdown",
    expectedReason: "presence_conditionally_resolved",
  },
  {
    label: "D-13 probably_sold_out remains conditional and traceable",
    input: formalInput("2026-08-17", {
      currentTimestamp,
      categoryProfile: presenceAwareCategory,
      lastPhysicalConfirmation: {
        status: "probably_sold_out",
        confirmedAt: "2026-06-18T10:59:00.000Z",
      },
    }),
    expectedState: "radar",
    expectedCommand: "monitor",
    expectedReason: "presence_conditionally_resolved",
  },
];

describe("Phase 2 decision and requirement scenario matrix", () => {
  it.each(scenarios)("$label", ({ input, expectedState, expectedCommand, expectedReason }) => {
    const result = calculateLotRisk(input);

    expect(result.state).toBe(expectedState);
    expect(result.command).toBe(expectedCommand);
    expect(result.reasons.every((reason) => !reason.code.includes(" "))).toBe(true);
    if (expectedReason) {
      expect(result.reasons.map((reason) => reason.code)).toContain(expectedReason);
    }
  });
});
