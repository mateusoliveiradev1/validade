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
    expect(roleAllowsCapability("collaborator", "command_center.read_store")).toBe(true);
    expect(roleAllowsCapability("collaborator", "catalog.review")).toBe(false);
    expect(roleAllowsCapability("collaborator", "shift.close")).toBe(false);
    expect(roleAllowsCapability("collaborator", "pilot.push_test.send")).toBe(false);
    expect(roleAllowsCapability("lead", "shift.close")).toBe(true);
    expect(roleAllowsCapability("lead", "catalog.review")).toBe(true);
    expect(roleAllowsCapability("lead", "pilot.push_test.send")).toBe(true);
    expect(roleAllowsCapability("lead", "user.manage")).toBe(false);
    expect(roleAllowsCapability("admin", "user.manage")).toBe(true);
    expect(roleAllowsCapability("admin", "catalog.review")).toBe(true);
    expect(roleAllowsCapability("admin", "pilot.push_test.send")).toBe(true);
    expect(roleAllowsCapability("admin", "command_center.read_store")).toBe(false);
    expect(roleAllowsCapability("admin", "shift.close")).toBe(false);
    expect(roleAllowsCapability("collaborator", "gpp.avaria.create")).toBe(true);
    expect(roleAllowsCapability("collaborator", "gpp.avaria.correct_own_pending")).toBe(true);
    expect(roleAllowsCapability("collaborator", "gpp.queue.read")).toBe(false);
    expect(roleAllowsCapability("collaborator", "gpp.avaria.baixar")).toBe(false);
    expect(roleAllowsCapability("lead", "gpp.avaria.correct_store")).toBe(true);
    expect(roleAllowsCapability("lead", "gpp.correction.review")).toBe(true);
    expect(roleAllowsCapability("lead", "gpp.avaria.baixar")).toBe(false);
    expect(roleAllowsCapability("admin", "gpp.avaria.baixar")).toBe(false);
    expect(roleAllowsCapability("gpp", "gpp.queue.read")).toBe(true);
    expect(roleAllowsCapability("gpp", "gpp.avaria.baixar")).toBe(true);
    expect(roleAllowsCapability("gpp", "gpp.purchase.attend")).toBe(true);
    expect(roleAllowsCapability("gpp", "shift.close")).toBe(false);
    expect(roleAllowsCapability("gpp", "user.manage")).toBe(false);
    expect(roleAllowsCapability("gpp", "policy.manage")).toBe(false);
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

  it("allows same-store leadership and admin to send pilot push tests", () => {
    const leadDecision = authorizeStoreCapability({
      identity,
      memberships: [leadMembership],
      capability: "pilot.push_test.send",
      resourceStoreId: "loja-piloto",
    });
    const adminDecision = authorizeStoreCapability({
      identity,
      memberships: [
        {
          ...leadMembership,
          role: "admin",
        },
      ],
      capability: "pilot.push_test.send",
      resourceStoreId: "loja-piloto",
    });

    expect(leadDecision.allowed).toBe(true);
    expect(leadDecision.context?.capabilities).toContain("pilot.push_test.send");
    expect(adminDecision.allowed).toBe(true);
    expect(adminDecision.context?.capabilities).toContain("pilot.push_test.send");
  });

  it("authorizes GPP operations only for active same-store GPP membership", () => {
    const decision = authorizeStoreCapability({
      identity,
      memberships: [
        {
          ...leadMembership,
          role: "gpp",
        },
      ],
      capability: "gpp.avaria.baixar",
      resourceStoreId: "loja-piloto",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.context?.membership.role).toBe("gpp");
    expect(decision.context?.capabilities).toContain("gpp.queue.read");
    expect(decision.context?.capabilities).toContain("gpp.avaria.baixar");
  });

  it("denies governance and leadership memberships for GPP baixa by default", () => {
    const leadDecision = authorizeStoreCapability({
      identity,
      memberships: [leadMembership],
      capability: "gpp.avaria.baixar",
      resourceStoreId: "loja-piloto",
    });
    const adminDecision = authorizeStoreCapability({
      identity,
      memberships: [
        {
          ...leadMembership,
          role: "admin",
        },
      ],
      capability: "gpp.avaria.baixar",
      resourceStoreId: "loja-piloto",
    });

    expect(leadDecision).toEqual({
      allowed: false,
      reason: "capability_not_allowed",
    });
    expect(adminDecision).toEqual({
      allowed: false,
      reason: "capability_not_allowed",
    });
  });

  it("denies collaborator push tests without leaking cross-store details", () => {
    const collaboratorDecision = authorizeStoreCapability({
      identity,
      memberships: [
        {
          ...leadMembership,
          role: "collaborator",
        },
      ],
      capability: "pilot.push_test.send",
      resourceStoreId: "loja-piloto",
    });
    const crossStoreDecision = authorizeStoreCapability({
      identity,
      memberships: [leadMembership],
      capability: "pilot.push_test.send",
      resourceStoreId: "loja-outra",
    });

    expect(collaboratorDecision).toEqual({
      allowed: false,
      reason: "capability_not_allowed",
    });
    expect(crossStoreDecision).toEqual({
      allowed: false,
      reason: "outside_store_scope",
    });
    expect(JSON.stringify(crossStoreDecision)).not.toContain("loja-outra");
  });

  it("keeps GPP cross-store and inactive membership denial behavior unchanged", () => {
    const crossStoreDecision = authorizeStoreCapability({
      identity,
      memberships: [
        {
          ...leadMembership,
          role: "gpp",
        },
      ],
      capability: "gpp.queue.read",
      resourceStoreId: "loja-outra",
    });
    const inactiveDecision = authorizeStoreCapability({
      identity,
      memberships: [
        {
          ...leadMembership,
          role: "gpp",
          status: "inactive",
        },
      ],
      capability: "gpp.queue.read",
      resourceStoreId: "loja-piloto",
    });

    expect(crossStoreDecision).toEqual({
      allowed: false,
      reason: "outside_store_scope",
    });
    expect(JSON.stringify(crossStoreDecision)).not.toContain("loja-outra");
    expect(inactiveDecision).toEqual({
      allowed: false,
      reason: "inactive_membership",
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
