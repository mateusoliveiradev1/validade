import { describe, expect, it } from "vitest";
import { SHIFT_CLOSE_CHECKLIST_KEYS } from "@validade-zero/domain";
import {
  ShiftCloseEvaluationSchema,
  ShiftCloseSafeRequestSchema,
  ShiftCloseUnsafeRequestSchema,
  ShiftClosureSnapshotSchema,
} from "./shift-close";

const base = {
  storeId: "loja-ficticia-piloto",
  occurredAt: "2030-01-10T18:00:00.000Z",
  idempotencyKey: "shift-close-ficticia-001",
};

describe("shift close contracts", () => {
  it("requires every continuity detail for an unsafe close", () => {
    expect(
      ShiftCloseUnsafeRequestSchema.parse({
        ...base,
        verdict: "unsafe",
        reason: "Risco vencido ainda em conferência.",
        continuityOwner: "Lideranca Ficticia Noturna",
        continuityDeadline: "2030-01-10T19:00:00.000Z",
        note: "Retomar a retirada antes de declarar área segura.",
        checklist: [],
      }),
    ).toMatchObject({ verdict: "unsafe" });
    expect(
      ShiftCloseUnsafeRequestSchema.safeParse({
        ...base,
        verdict: "unsafe",
        reason: "Risco vencido ainda em conferência.",
        continuityOwner: "",
        note: "Sem continuidade.",
        checklist: [],
      }).success,
    ).toBe(false);
  });

  it("requires the three ordered confirmations for safe close", () => {
    expect(
      ShiftCloseSafeRequestSchema.parse({
        ...base,
        verdict: "safe",
        checklist: SHIFT_CLOSE_CHECKLIST_KEYS,
      }),
    ).toMatchObject({ verdict: "safe" });
    expect(
      ShiftCloseSafeRequestSchema.safeParse({
        ...base,
        verdict: "safe",
        checklist: [...SHIFT_CLOSE_CHECKLIST_KEYS].reverse(),
      }).success,
    ).toBe(false);
  });

  it("accepts public safe-close blocker codes for build and authorization", () => {
    expect(
      ShiftCloseEvaluationSchema.parse({
        eligibility: "must_close_unsafe",
        blockers: [
          {
            code: "required_build_update",
            label: "Atualizacao obrigatoria do app antes do fechamento seguro.",
            actionLabel: "Atualizar app aprovado",
          },
          {
            code: "device_authorization_blocker",
            label: "Conta, loja ou aparelho sem autorizacao.",
            actionLabel: "Revalidar acesso",
          },
        ],
        checklistComplete: true,
        ruleVersion: "phase-10-central-v1",
      }),
    ).toMatchObject({ eligibility: "must_close_unsafe" });
  });

  it("keeps unsafe snapshots immutable in shape with their continuity fields", () => {
    expect(
      ShiftClosureSnapshotSchema.parse({
        closureId: "closure-ficticia-001",
        ...base,
        storeName: "Loja Ficticia Piloto",
        verdict: "unsafe",
        eligibility: "must_close_unsafe",
        blockers: [],
        checklist: [],
        actor: {
          actorId: "lead-ficticia",
          displayName: "Lideranca Ficticia",
          roleSnapshot: "lead",
        },
        occurredAt: base.occurredAt,
        receivedAt: "2030-01-10T18:00:01.000Z",
        ruleVersion: "phase-10-central-v1",
        reason: "Risco vencido ainda em conferência.",
        continuityOwner: "Lideranca Ficticia Noturna",
        continuityDeadline: "2030-01-10T19:00:00.000Z",
        note: "Retomar a retirada antes de declarar área segura.",
      }),
    ).toMatchObject({ verdict: "unsafe" });
  });
});
