import { describe, expect, it } from "vitest";
import {
  ClientSafeAuthorizationDenialSchema,
  ProtectedCapabilityProbeResponseSchema,
  SessionContextResponseSchema,
  StoreMembershipSchema,
} from "./authorization";

describe("authorization contracts", () => {
  it("keeps membership payload strict", () => {
    const parsed = StoreMembershipSchema.safeParse({
      subjectId: "actor-1",
      role: "lead",
      storeId: "loja-piloto",
      storeName: "Loja Piloto",
      status: "active",
      extra: "not allowed",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects client-provided authority in probe responses", () => {
    const parsed = ProtectedCapabilityProbeResponseSchema.safeParse({
      status: "authorized",
      capability: "task.act",
      checkedAt: "2026-06-22T12:00:00.000Z",
      role: "admin",
      storeId: "loja-outra",
    });

    expect(parsed.success).toBe(false);
  });

  it("returns server-resolved session context with explicit actions", () => {
    const context = SessionContextResponseSchema.parse({
      actor: {
        subjectId: "lead-local",
        displayName: "Lideranca local",
      },
      store: {
        storeId: "loja-piloto",
        storeName: "Loja Piloto",
      },
      activeRole: "lead",
      capabilities: ["task.act", "shift.close", "audit.read_store"],
      actions: {
        canActOnTask: true,
        canCloseShift: true,
        canReadStoreAudit: true,
        canManageUsers: false,
      },
    });

    expect(context.actions.canCloseShift).toBe(true);
  });

  it("keeps denial payload client-safe and resource-free", () => {
    const denial = ClientSafeAuthorizationDenialSchema.parse({
      error: "access_denied",
      reason: "outside_store_scope",
      message: "Acesso bloqueado para este escopo operacional.",
      denialId: "denial-1",
    });

    expect(JSON.stringify(denial)).not.toMatch(/target|payload|token|authorization/i);
  });
});
