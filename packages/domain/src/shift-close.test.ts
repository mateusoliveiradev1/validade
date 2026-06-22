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
});
