import { describe, expect, it } from "vitest";
import {
  classifyTodayRiskAttention,
  compareTodayTaskPriority,
  deriveFutureAttentionCandidate,
  deriveTodayTaskCandidate,
  isResolutionCompatible,
  projectCentralLotTask,
  resolveCentralTerminalOutcome,
  type TodayTaskCandidate,
  type TodayTaskCandidateInput,
} from "./tasks";
import type { RiskAssessment } from "./types";

const observedAt = "2030-01-10T09:00:00.000Z";
const salesArea = { kind: "area_de_venda" } as const;
const stock = { kind: "estoque" } as const;
const terminalResolutionInput = {
  taskId: "tarefa-central-ficticia-001",
  lotId: "lote-central-ficticio-001",
  productDisplayName: "Produto Central FICTICIO",
  lotIdentity: "LOTE-CENTRAL-FICTICIO-001",
  currentLocation: salesArea,
  actorLabel: "Colaboradora FICTICIA",
  occurredAt: observedAt,
} as const;

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
    reasons:
      state === "safe" ? [] : [{ code: state === "expired" ? "expired" : "expires_in_3_days" }],
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
    expect(isResolutionCompatible("repack_or_loss", "repack")).toBe(true);
    expect(isResolutionCompatible("repack_or_loss", "record_loss")).toBe(true);
    expect(isResolutionCompatible("repack_or_loss", "request_markdown")).toBe(false);
    expect(isResolutionCompatible("request_markdown", "request_markdown")).toBe(true);
    expect(isResolutionCompatible("check_presence", "confirm_presence")).toBe(true);
    expect(isResolutionCompatible("approve_markdown", "approve_markdown")).toBe(true);
    expect(isResolutionCompatible("approve_markdown", "reject_markdown")).toBe(true);
    expect(isResolutionCompatible("approve_markdown", "apply_markdown")).toBe(false);
    expect(isResolutionCompatible("apply_markdown", "apply_markdown")).toBe(true);
    expect(isResolutionCompatible("apply_markdown", "reject_markdown")).toBe(false);
    expect(isResolutionCompatible("confirm_markdown_on_shelf", "confirm_markdown_on_shelf")).toBe(
      true,
    );
    expect(isResolutionCompatible("confirm_markdown_on_shelf", "complete_recheck")).toBe(false);
  });

  it.each([
    ["withdraw_or_loss", "withdraw", "withdrawn"],
    ["withdraw_or_loss", "record_loss", "loss_recorded"],
    ["repack_or_loss", "repack", "repack_completed"],
    ["check_presence", "mark_not_found", "not_found"],
    ["check_presence", "mark_probably_sold_out", "probably_sold_out"],
    ["check_presence", "move_lot", "moved"],
    ["sales_area_recheck", "complete_recheck", "sales_area_recheck_completed"],
    ["approve_markdown", "approve_markdown", "markdown_approved"],
    ["apply_markdown", "apply_markdown", "markdown_applied"],
    ["confirm_markdown_on_shelf", "confirm_markdown_on_shelf", "markdown_shelf_confirmed"],
  ] as const)("accepts central terminal outcome %s / %s", (requiredResolution, action, kind) => {
    expect(
      resolveCentralTerminalOutcome({
        ...terminalResolutionInput,
        requiredResolution,
        action,
        ...(action === "move_lot" ? { destination: stock } : {}),
        ...(action === "complete_recheck" ||
        action === "apply_markdown" ||
        action === "confirm_markdown_on_shelf"
          ? { evidenceState: "no_photo_reason" as const }
          : {}),
      }),
    ).toMatchObject({
      status: "accepted",
      outcome: {
        kind,
        centralState: "resolved",
        closesActiveTask: true,
      },
    });
  });

  it("keeps active risk visible for incompatible or incomplete terminal outcomes", () => {
    expect(
      resolveCentralTerminalOutcome({
        ...terminalResolutionInput,
        requiredResolution: "withdraw_or_loss",
        action: "confirm_presence",
      }),
    ).toEqual({
      status: "rejected",
      reason: "incompatible_action",
      keepsActiveRiskVisible: true,
    });
    expect(
      resolveCentralTerminalOutcome({
        ...terminalResolutionInput,
        requiredResolution: "check_presence",
        action: "move_lot",
      }),
    ).toEqual({
      status: "rejected",
      reason: "destination_required",
      keepsActiveRiskVisible: true,
    });
    expect(
      resolveCentralTerminalOutcome({
        ...terminalResolutionInput,
        requiredResolution: "confirm_markdown_on_shelf",
        action: "confirm_markdown_on_shelf",
      }),
    ).toEqual({
      status: "rejected",
      reason: "evidence_or_no_photo_reason_required",
      keepsActiveRiskVisible: true,
    });
  });

  it("turns processed expired risk into a reembalar/avaria task instead of rebaixa", () => {
    expect(
      deriveTodayTaskCandidate(
        input("expired", {
          assessment: {
            state: "expired",
            command: "repack_or_loss",
            reasons: [{ code: "expired", field: "expiresAt" }],
          },
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        requiredResolution: "repack_or_loss",
        section: "withdraw_now",
      }),
    );
  });

  it("projects formal-validity central lots into active withdrawal tasks", () => {
    const projection = projectCentralLotTask(
      centralLotProjectionInput({
        lot: {
          mode: "formal_validity",
          productId: "produto-central-ficticio-001",
          lotCode: "LOTE-FORMAL-FICTICIO-001",
          expiresAt: "2030-01-09",
        },
      }),
    );

    expect(projection).toMatchObject({
      attention: "active_task",
      task: {
        requiredResolution: "withdraw_or_loss",
        section: "withdraw_now",
      },
    });
  });

  it("projects processed/repack-loss central lots into repack-or-loss tasks", () => {
    const projection = projectCentralLotTask(
      centralLotProjectionInput({
        lot: {
          mode: "processed_repack_loss",
          productId: "produto-central-ficticio-002",
          lotCode: "LOTE-PROCESSADO-FICTICIO-001",
          expiresAt: "2030-01-09",
        },
        categoryProfile: {
          categoryId: "categoria-processados-ficticia",
          mode: "processed_repack_loss",
          windows: { radarDays: 7, markdownDays: 0, criticalDays: 1, expiredDays: 0 },
        },
      }),
    );

    expect(projection).toMatchObject({
      attention: "active_task",
      task: {
        requiredResolution: "repack_or_loss",
      },
    });
  });

  it("projects FLV inspection central lots into active quality-window tasks", () => {
    const projection = projectCentralLotTask(
      centralLotProjectionInput({
        lot: {
          mode: "flv_inspection",
          productId: "produto-central-ficticio-003",
          lotCode: "LOTE-FLV-FICTICIO-001",
          receivedAt: "2030-01-08",
          qualityWindowDays: 2,
        },
        categoryProfile: {
          categoryId: "categoria-flv-ficticia",
          mode: "flv_inspection",
          windows: { radarDays: 7, markdownDays: 3, criticalDays: 1, expiredDays: 0 },
          maxPhysicalConfirmationAgeHours: 24,
        },
      }),
    );

    expect(projection).toMatchObject({
      attention: "active_task",
      task: {
        riskState: "critical",
        requiredResolution: "check_presence",
      },
    });
  });

  it("keeps unverified risky central lots uncertain instead of safe", () => {
    const projection = projectCentralLotTask(
      centralLotProjectionInput({
        lot: {
          mode: "formal_validity",
          productId: "produto-central-ficticio-004",
          lotCode: "LOTE-SEM-PRESENCA-FICTICIO-001",
          expiresAt: "2030-01-11",
        },
        lastPhysicalObservation: undefined,
      }),
    );

    expect(projection).toMatchObject({
      attention: "active_task",
      task: {
        riskState: "uncertain",
        requiredResolution: "check_presence",
      },
    });
  });

  it("projects central radar lots as future attention instead of active tasks", () => {
    const projection = projectCentralLotTask(
      centralLotProjectionInput({
        lot: {
          mode: "formal_validity",
          productId: "produto-central-ficticio-005",
          lotCode: "LOTE-RADAR-FICTICIO-001",
          expiresAt: "2030-01-18",
        },
      }),
    );

    expect(projection).toMatchObject({
      attention: "future_attention",
      futureAttention: {
        riskState: "radar",
      },
    });
  });

  it("projects receiving-monitored central lots with missing received date as active review work", () => {
    const projection = projectCentralLotTask(
      centralLotProjectionInput({
        lot: {
          mode: "receiving_monitored",
          productId: "produto-central-ficticio-006",
          lotCode: "LOTE-RECEBIMENTO-FICTICIO-001",
        },
        categoryProfile: {
          categoryId: "categoria-recebimento-ficticia",
          mode: "receiving_monitored",
          windows: { radarDays: 2, markdownDays: 1, criticalDays: 1, expiredDays: 0 },
        },
      }),
    );

    expect(projection).toMatchObject({
      attention: "active_task",
      task: {
        riskState: "uncertain",
        requiredResolution: "check_presence",
      },
    });
  });
});

function centralLotProjectionInput(
  overrides: Partial<Parameters<typeof projectCentralLotTask>[0]> = {},
): Parameters<typeof projectCentralLotTask>[0] {
  return {
    currentDate: "2030-01-10",
    currentTimestamp: "2030-01-10T09:00:00.000Z",
    lotId: "lote-central-ficticio-001",
    productDisplayName: "Produto Central FICTICIO",
    lotIdentity: "LOTE-CENTRAL-FICTICIO-001",
    currentLocation: salesArea,
    lot: {
      mode: "formal_validity",
      productId: "produto-central-ficticio-001",
      lotCode: "LOTE-CENTRAL-FICTICIO-001",
      expiresAt: "2030-01-09",
    },
    categoryProfile: {
      categoryId: "categoria-ficticia-ovos",
      mode: "formal_validity",
      windows: { radarDays: 10, markdownDays: 5, criticalDays: 2, expiredDays: 0 },
      maxPhysicalConfirmationAgeHours: 24,
    },
    lastPhysicalObservation: {
      status: "present",
      observedAt,
      quantityState: "estimated",
      approximateQuantity: 6,
    },
    ...overrides,
  };
}
