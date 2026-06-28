import { describe, expect, it } from "vitest";
import {
  ClientSafeAuthorizationDenialSchema,
  ChangeMembershipRoleRequestSchema,
  CreateMembershipRequestSchema,
  ManagedStoreMembershipSchema,
  ProtectedCapabilityProbeResponseSchema,
  SessionContextResponseSchema,
  SessionStoresResponseSchema,
  StoreMembershipSchema,
} from "./authorization";

describe("authorization contracts", () => {
  it("keeps membership payload strict", () => {
    const parsed = StoreMembershipSchema.safeParse({
      subjectId: "actor-1",
      role: "lead",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
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
        storeName: "Loja Ficticia Piloto",
      },
      activeRole: "lead",
      capabilities: [
        "task.act",
        "command_center.read_store",
        "catalog.review",
        "shift.close",
        "audit.read_store",
        "pilot.push_test.send",
      ],
      sessionExpiresAt: "2026-06-23T12:00:00.000Z",
      accountStatus: "active",
      canRequestRecovery: true,
      privacyCenterUrl: "/privacy",
      actions: {
        canReadCommandCenter: true,
        canActOnTask: true,
        canReviewProductDrafts: true,
        canCloseShift: true,
        canReadStoreAudit: true,
        canManageUsers: false,
        canSendPilotPushTest: true,
      },
    });

    expect(context.actions.canCloseShift).toBe(true);
    expect(context.actions.canSendPilotPushTest).toBe(true);
  });

  it("backfills newly introduced session actions from server-owned capabilities", () => {
    const context = SessionContextResponseSchema.parse({
      actor: {
        subjectId: "lead-local",
        displayName: "Lideranca local",
      },
      store: {
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
      },
      activeRole: "lead",
      capabilities: [
        "task.act",
        "command_center.read_store",
        "shift.close",
        "audit.read_store",
        "pilot.push_test.send",
      ],
      sessionExpiresAt: "2026-06-23T12:00:00.000Z",
      accountStatus: "active",
      canRequestRecovery: true,
      privacyCenterUrl: "/privacy",
      actions: {
        canActOnTask: true,
        canCloseShift: true,
        canReadStoreAudit: true,
        canManageUsers: false,
      },
    });

    expect(context.actions.canReadCommandCenter).toBe(true);
    expect(context.actions.canReviewProductDrafts).toBe(false);
    expect(context.actions.canSendPilotPushTest).toBe(true);
  });

  it("represents store-scoped administration without leaking other stores", () => {
    const response = SessionStoresResponseSchema.parse({
      stores: [
        {
          store: { storeId: "loja-10", storeName: "Loja 10 - Staging" },
          roles: ["lead", "admin"],
          actions: {
            canReadCommandCenter: true,
            canActOnTask: true,
            canReviewProductDrafts: true,
            canCloseShift: true,
            canReadStoreAudit: true,
            canManageUsers: true,
            canSendPilotPushTest: true,
          },
        },
      ],
    });

    expect(response.stores[0]?.roles).toEqual(["lead", "admin"]);
    expect(response.stores[0]?.actions.canManageUsers).toBe(true);
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

  it("requires explicit store, role, version, and idempotency for membership changes", () => {
    expect(
      CreateMembershipRequestSchema.safeParse({
        storeId: "loja-ficticia",
        storeName: "Loja Ficticia",
        subjectId: "colaborador-ficticio",
        displayName: "Colaborador Ficticio",
        role: "lead",
        idempotencyKey: "grant-001",
        capabilities: ["shift.close"],
      }).success,
    ).toBe(false);

    expect(
      ChangeMembershipRoleRequestSchema.safeParse({
        storeId: "loja-ficticia",
        role: "collaborator",
        expectedVersion: 0,
        idempotencyKey: "role-001",
      }).success,
    ).toBe(false);
  });

  it("keeps managed identity read-only in the server response", () => {
    const parsed = ManagedStoreMembershipSchema.safeParse({
      membershipId: "membership-ficticia",
      subjectId: "colaborador-ficticio",
      displayName: "Colaborador Ficticio",
      role: "collaborator",
      storeId: "loja-ficticia",
      storeName: "Loja Ficticia",
      status: "active",
      version: 1,
      createdAt: "2030-01-10T12:00:00.000Z",
      updatedAt: "2030-01-10T12:00:00.000Z",
      clientAuthority: true,
    });

    expect(parsed.success).toBe(false);
  });
});
