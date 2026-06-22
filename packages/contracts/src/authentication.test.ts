import { describe, expect, it } from "vitest";

import {
  FirstAccessActivationRequestSchema,
  LoginRequestSchema,
  PrivacyRequestSchema,
  SessionContextResponseSchema,
} from "./index";

const session = {
  actor: { subjectId: "subject-1", displayName: "Pessoa piloto" },
  store: { storeId: "store-1", storeName: "Loja Ficticia Piloto" },
  activeRole: "lead" as const,
  capabilities: ["task.act", "shift.close"] as const,
  sessionExpiresAt: "2026-06-23T12:00:00.000Z",
  accountStatus: "active" as const,
  canRequestRecovery: true,
  privacyCenterUrl: "/privacy",
  actions: {
    canActOnTask: true,
    canCloseShift: true,
    canReadStoreAudit: true,
    canManageUsers: false,
  },
};

describe("authentication contracts", () => {
  it("keeps role, capabilities and store authority out of login input", () => {
    expect(
      LoginRequestSchema.safeParse({
        identifier: "pessoa@piloto.invalid",
        password: "senha-forte-123",
        role: "admin",
        storeId: "other-store",
      }).success,
    ).toBe(false);
  });

  it("keeps activation input limited to the invite token and password", () => {
    expect(
      FirstAccessActivationRequestSchema.safeParse({
        token: "invite-token-with-at-least-thirty-two-characters",
        password: "senha-forte-123",
        capabilities: ["user.manage"],
      }).success,
    ).toBe(false);
  });

  it("preserves server-owned session actions and account metadata", () => {
    expect(SessionContextResponseSchema.parse(session)).toEqual(session);
  });

  it("accepts a bounded LGPD rights request with explicit contact and categories", () => {
    expect(
      PrivacyRequestSchema.parse({
        requestType: "access",
        contact: { channel: "email", value: "pessoa@piloto.invalid" },
        dataCategories: ["identity", "store_and_role", "timestamps_and_audit"],
        body: "Quero receber uma copia dos dados vinculados a minha conta.",
        idempotencyKey: "privacy-request-1",
      }),
    ).toMatchObject({ requestType: "access" });
  });

  it("rejects unknown privacy fields and unbounded empty content", () => {
    expect(
      PrivacyRequestSchema.safeParse({
        requestType: "deletion",
        contact: { channel: "phone", value: "+5511999999999" },
        dataCategories: ["identity"],
        body: "curto",
        idempotencyKey: "privacy-request-2",
        signedEvidenceUrl: "https://example.invalid/private",
      }).success,
    ).toBe(false);
  });
});
