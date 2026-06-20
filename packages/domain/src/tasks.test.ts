import { describe, expect, it } from "vitest";
import {
  classifyTodayRiskAttention,
  compareTodayTaskPriority,
  deriveFutureAttentionCandidate,
  deriveTodayTaskCandidate,
  isResolutionCompatible,
  type TodayTaskCandidate,
  type TodayTaskCandidateInput,
} from "./tasks";
import type { RiskAssessment } from "./types";

const observedAt = "2030-01-10T09:00:00.000Z";
const salesArea = { kind: "area_de_venda" } as const;
const stock = { kind: "estoque" } as const;

function risk(state: RiskAssessment["state"]): RiskAssessment {
  return {
    state,
    command:
      state === "expired"
        ? "withdraw_now"
        : state === "markdown_due"
          ? "request_markdown"
          : state === "uncertain"
            ? "check_presence"
            : "monitor",
    reasons: state === "safe" ? [] : [{ code: state === "expired" ? "expired" : "expires_in_3_days" }],
  };
}

function input(
  state: RiskAssessment["state"],
  overrides: Partial<TodayTaskCandidateInput> = {},
): TodayTaskCandidateInput {
  return {
    lotId: `lote-ficticio-${state}`,
    productDisplayName: `Produto FICTICIO ${state}`,
    lotIdentity: `LOTE-FICTICIO-${state}`,
    currentLocation: salesArea,
    assessment: risk(state),
    observedAt,
    ...overrides,
  };
}

function task(
  state: RiskAssessment["state"],
  overrides: Partial<TodayTaskCandidateInput> = {},
): TodayTaskCandidate {
  const candidate = deriveTodayTaskCandidate(input(state, overrides));

  if (candidate === null) {
    throw new Error(`Expected ${state} to create a task candidate.`);
  }

  return candidate;
}

describe("Today task derivation", () => {
  it.each(["expired", "critical", "markdown_due", "uncertain"] as const)(
    "creates an active task for %s",
    (state) => {
      expect(deriveTodayTaskCandidate(input(state))).toEqual(
        expect.objectContaining({
          riskState: state,
          ownerLabel: "Equipe do turno",
          sourceRisk: expect.objectContaining({ state }),
        }),
      );
      expect(classifyTodayRiskAttention(risk(state))).toBe("active_task");
    },
  );

  it.each(["safe", "radar"] as const)("does not create an active task for %s", (state) => {
    expect(deriveTodayTaskCandidate(input(state))).toBeNull();
  });

  it("exposes radar only as future attention", () => {
    expect(classifyTodayRiskAttention(risk("radar"))).toBe("future_attention");
    expect(deriveFutureAttentionCandidate(input("radar"))).toEqual(
      expect.objectContaining({
        riskState: "radar",
        section: "future_attention",
      }),
    );
  });

  it("sorts sales-area risk before markdown and other-location work", () => {
    const ordered = [
      task("markdown_due"),
      task("critical"),
      task("expired", { currentLocation: stock }),
      task("uncertain"),
      task("expired"),
    ].sort(compareTodayTaskPriority);

    expect(ordered.map((candidate) => candidate.riskState)).toEqual([
      "expired",
      "critical",
      "uncertain",
      "markdown_due",
      "expired",
    ]);
    expect(ordered[4]?.currentLocation.kind).toBe("estoque");
  });

  it("assigns severity-based due buckets", () => {
    expect(task("expired").dueBucket).toBe("now");
    expect(task("critical").dueBucket).toBe("shift");
    expect(task("uncertain").dueBucket).toBe("shift");
    expect(task("markdown_due").dueBucket).toBe("today");
  });

  it("checks the compatible action matrix", () => {
    expect(isResolutionCompatible("withdraw_or_loss", "confirm_presence")).toBe(false);
    expect(isResolutionCompatible("withdraw_or_loss", "withdraw")).toBe(true);
    expect(isResolutionCompatible("withdraw_or_loss", "record_loss")).toBe(true);
    expect(isResolutionCompatible("request_markdown", "request_markdown")).toBe(true);
    expect(isResolutionCompatible("check_presence", "confirm_presence")).toBe(true);
  });
});
