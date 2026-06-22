import { describe, expect, it } from "vitest";
import {
  authorizeStoreCapability,
  roleAllowsCapability,
  type AuthenticatedIdentity,
  type StoreMembership,
} from "./authorization";

const identity: AuthenticatedIdentity = {
  subjectId: "actor-1",
  displayName: "Pessoa Piloto",
};

const leadMembership: StoreMembership = {
  subjectId: "actor-1",
  role: "lead",
  storeId: "loja-piloto",
  storeName: "Loja Ficticia Piloto",
  status: "active",
};

describe("authorization matrix", () => {
  it("keeps collaborator, lead, and admin operational capabilities distinct", () => {
    expect(roleAllowsCapability("collaborator", "task.act")).toBe(true);
    expect(roleAllowsCapability("collaborator", "shift.close")).toBe(false);
    expect(roleAllowsCapability("lead", "shift.close")).toBe(true);
    expect(roleAllowsCapability("lead", "user.manage")).toBe(false);
    expect(roleAllowsCapability("admin", "user.manage")).toBe(true);
    expect(roleAllowsCapability("admin", "shift.close")).toBe(false);
  });

  it("authorizes only active memberships in the target store", () => {
    const decision = authorizeStoreCapability({
      identity,
      memberships: [leadMembership],
      capability: "shift.close",
      resourceStoreId: "loja-piloto",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.context?.membership.role).toBe("lead");
    expect(decision.context?.capabilities).toContain("shift.close");
  });

  it("denies known cross-store resources without exposing resource details", () => {
    const decision = authorizeStoreCapability({
      identity,
      memberships: [leadMembership],
      capability: "audit.read_store",
      resourceStoreId: "loja-outra",
    });

    expect(decision).toEqual({
      allowed: false,
      reason: "outside_store_scope",
    });
    expect(JSON.stringify(decision)).not.toContain("loja-outra");
  });

  it("does not treat admin governance membership as implicit lead membership", () => {
    const decision = authorizeStoreCapability({
      identity,
      memberships: [
        {
          subjectId: "actor-1",
          role: "admin",
          storeId: "loja-piloto",
          storeName: "Loja Ficticia Piloto",
          status: "active",
        },
      ],
      capability: "shift.close",
      resourceStoreId: "loja-piloto",
    });

    expect(decision).toEqual({
      allowed: false,
      reason: "capability_not_allowed",
    });
  });

  it("denies inactive memberships before capability evaluation", () => {
    const decision = authorizeStoreCapability({
      identity,
      memberships: [{ ...leadMembership, status: "inactive" }],
      capability: "shift.close",
      resourceStoreId: "loja-piloto",
    });

    expect(decision).toEqual({
      allowed: false,
      reason: "inactive_membership",
    });
  });
});
