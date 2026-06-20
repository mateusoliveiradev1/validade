import { describe, expect, it } from "vitest";
import {
  canStartMarkdownWorkflow,
  deriveMarkdownStageTaskCandidate,
  type MarkdownRequestReason,
} from "./markdown";
import type { PhysicalConfirmationStatus } from "./presence";
import type { RiskState } from "./types";

const now = "2030-01-10T09:00:00.000Z";
const freshAt = "2030-01-10T08:30:00.000Z";

function eligibility(overrides: {
  riskState?: RiskState;
  status?: PhysicalConfirmationStatus;
  requestReason?: MarkdownRequestReason;
  earlyJustification?: string;
  confirmedAt?: string;
}) {
  return canStartMarkdownWorkflow({
    riskState: overrides.riskState ?? "markdown_due",
    physicalConfirmation:
      overrides.status === undefined
        ? undefined
        : {
            status: overrides.status,
            confirmedAt: overrides.confirmedAt ?? freshAt,
          },
    currentTimestamp: now,
    maxPhysicalConfirmationAgeHours: 2,
    requestReason: overrides.requestReason ?? "rule_window",
    earlyJustification: overrides.earlyJustification,
  });
}

describe("markdown workflow eligibility", () => {
  it("allows a normal request only for markdown_due with fresh physical presence", () => {
    expect(eligibility({ status: "present" })).toEqual({
      status: "allowed",
      workflowStatus: "requested",
      requiresLeadershipApproval: true,
      reason: "rule_window",
    });
    expect(eligibility({ status: "present", riskState: "critical" })).toEqual({
      status: "blocked",
      blocker: {
        code: "not_markdown_due",
        label: "Lote fora da janela de rebaixa",
      },
    });
  });

  it("allows early exception reasons only with a non-empty justification", () => {
    expect(
      eligibility({
        status: "present",
        riskState: "radar",
        requestReason: "excess_stock",
        earlyJustification: "Excesso observado na ilha promocional",
      }),
    ).toEqual({
      status: "allowed",
      workflowStatus: "requested",
      requiresLeadershipApproval: true,
      reason: "excess_stock",
    });
    expect(
      eligibility({
        status: "present",
        riskState: "radar",
        requestReason: "quality_issue",
        earlyJustification: " ",
      }),
    ).toEqual({
      status: "blocked",
      blocker: {
        code: "early_justification_required",
        label: "Informe a justificativa da rebaixa antecipada",
      },
    });
  });

  it.each(["not_found", "probably_sold_out", "withdrawn", "loss"] as const)(
    "blocks %s presence before markdown starts",
    (status) => {
      expect(eligibility({ status })).toMatchObject({
        status: "blocked",
        blocker: { code: "presence_required" },
      });
    },
  );

  it("blocks missing and stale presence before markdown starts", () => {
    expect(eligibility({})).toMatchObject({
      status: "blocked",
      blocker: { code: "presence_required" },
    });
    expect(
      eligibility({
        status: "present",
        confirmedAt: "2030-01-10T04:00:00.000Z",
      }),
    ).toMatchObject({
      status: "blocked",
      blocker: { code: "presence_required" },
    });
  });
});

describe("markdown stage task policy", () => {
  const base = {
    workflowId: "markdown-ficticio-001",
    lotId: "lote-ficticio-001",
    productDisplayName: "Ovos Brancos FICTICIOS",
    lotIdentity: "OVOS-FICTICIOS-001",
    currentLocation: { kind: "area_de_venda" } as const,
    sourceRisk: {
      state: "markdown_due",
      reasons: [{ code: "expires_in_15_days" as const }],
    },
    observedAt: now,
  };

  it("maps requested stage to leadership approval due today", () => {
    expect(deriveMarkdownStageTaskCandidate({ ...base, currentStage: "requested" })).toMatchObject({
      activeKey: "markdown:markdown-ficticio-001:requested",
      requiredResolution: "approve_markdown",
      ownerLabel: "Lideranca local",
      dueBucket: "today",
      severity: "medium",
      markdownStage: "requested",
    });
  });

  it("maps approved and applied stages to stronger shift work", () => {
    expect(deriveMarkdownStageTaskCandidate({ ...base, currentStage: "approved" })).toMatchObject({
      requiredResolution: "apply_markdown",
      ownerLabel: "Equipe do turno",
      dueBucket: "shift",
      severity: "high",
    });
    expect(deriveMarkdownStageTaskCandidate({ ...base, currentStage: "applied" })).toMatchObject({
      requiredResolution: "confirm_markdown_on_shelf",
      ownerLabel: "Equipe do turno",
      dueBucket: "now",
      severity: "high",
    });
  });
});
