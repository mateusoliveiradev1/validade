import { describe, expect, it } from "vitest";
import {
  SHIFT_CLOSE_CHECKLIST_KEYS,
  canCloseSafely,
  evaluateShiftClose,
  hasCompleteShiftCloseChecklist,
} from "./shift-close";

const baseInput = {
  cacheState: "offline_ready" as const,
  tasks: [],
  syncCommands: [],
  evidence: [],
  central: {
    source: "central" as const,
    readiness: "prepared" as const,
    hasCurrentRead: true,
    hasCentralFacts: true,
    activeTaskCount: 0,
    pendingProductDraftCount: 0,
    conflictCount: 0,
    discardedActionCount: 0,
    pendingCommandCount: 0,
    storeBlockerCount: 0,
  },
  pendingUnsafeCloseCount: 0,
  checklist: SHIFT_CLOSE_CHECKLIST_KEYS,
};

describe("shift close policy", () => {
  it("allows a safe close only with current data and the ordered physical checklist", () => {
    const evaluation = evaluateShiftClose(baseInput);

    expect(evaluation.eligibility).toBe("eligible_safe");
    expect(canCloseSafely(evaluation)).toBe(true);
    expect(hasCompleteShiftCloseChecklist(SHIFT_CLOSE_CHECKLIST_KEYS)).toBe(true);
    expect(hasCompleteShiftCloseChecklist([...SHIFT_CLOSE_CHECKLIST_KEYS].reverse())).toBe(false);
  });

  it("requires an unsafe path when active risk, critical sync, or evidence remain", () => {
    const evaluation = evaluateShiftClose({
      ...baseInput,
      tasks: [
        {
          id: "task-expired-ficticia",
          status: "active",
          riskState: "expired",
          severity: "critical",
          requiredResolution: "withdraw_or_loss",
        },
      ],
      syncCommands: [{ state: "pending_sync", urgency: "critical" }],
      evidence: [{ required: true, state: "waiting_upload" }],
    });

    expect(evaluation.eligibility).toBe("must_close_unsafe");
    expect(evaluation.blockers.map((blocker) => blocker.code)).toEqual(
      expect.arrayContaining([
        "expired_or_critical_risk",
        "critical_pending_sync",
        "required_evidence_pending",
      ]),
    );
  });

  it("never qualifies safe while stale, unavailable, or offline", () => {
    for (const cacheState of ["offline_stale", "offline_unavailable", "offline_mode"] as const) {
      expect(evaluateShiftClose({ ...baseInput, cacheState }).eligibility).toBe("cannot_evaluate");
    }
  });

  it("fails closed when the central capture read is stale or empty", () => {
    const evaluation = evaluateShiftClose({
      ...baseInput,
      central: {
        ...baseInput.central,
        readiness: "needs_review",
        hasCurrentRead: false,
        hasCentralFacts: false,
      },
    });

    expect(evaluation.eligibility).toBe("cannot_evaluate");
    expect(evaluation.blockers.map((blocker) => blocker.code)).toContain(
      "central_capture_not_ready",
    );
  });

  it("requires the unsafe path for central tasks, drafts, discards, and pending local close sync", () => {
    const evaluation = evaluateShiftClose({
      ...baseInput,
      central: {
        ...baseInput.central,
        activeTaskCount: 1,
        pendingProductDraftCount: 1,
        discardedActionCount: 1,
      },
      pendingUnsafeCloseCount: 1,
    });

    expect(evaluation.eligibility).toBe("must_close_unsafe");
    expect(evaluation.blockers.map((blocker) => blocker.code)).toEqual(
      expect.arrayContaining([
        "central_active_tasks",
        "central_product_review_pending",
        "central_discarded_action",
        "pending_unsafe_close_sync",
      ]),
    );
  });
});
