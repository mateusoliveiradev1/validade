import { describe, expect, it } from "vitest";
import { createInMemoryMembershipManagementRepository } from "@validade-zero/database/membership-repository";
import { createInMemoryAuditRepository } from "./audit";
import { FakeAuthProvider } from "./auth";
import { createApiApp } from "./index";

const NOW = new Date("2030-01-10T18:00:00.000Z");

function createMembershipApp() {
  const memberships = createInMemoryMembershipManagementRepository([
    {
      membershipId: "membership-admin-ficticia",
      subjectId: "admin-local",
      displayName: "Administracao Ficticia",
      role: "admin",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      status: "active",
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      membershipId: "membership-lead-ficticia",
      subjectId: "lead-local",
      displayName: "Lideranca Ficticia",
      role: "lead",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      status: "active",
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      membershipId: "membership-outra-ficticia",
      subjectId: "lead-outra",
      displayName: "Lideranca Outra Ficticia",
      role: "lead",
      storeId: "loja-outra",
      storeName: "Loja Ficticia Outra",
      status: "active",
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]);
  const auditRepository = createInMemoryAuditRepository();
  const app = createApiApp({
    authProvider: new FakeAuthProvider(),
    membershipRepository: memberships,
    membershipManagementRepository: memberships,
    auditRepository,
    now: () => NOW,
  });
  return { app, auditRepository, memberships };
}

function grantPayload(idempotencyKey = "membership-grant-ficticia") {
  return {
    storeId: "loja-piloto",
    storeName: "Loja Ficticia Piloto",
    subjectId: "operador-ficticio",
    displayName: "Operador Ficticio",
    role: "lead",
    idempotencyKey,
  };
}

describe("membership administration", () => {
  it("lets an admin grant, replay, downgrade, and revoke a scoped membership with audit", async () => {
    const { app, auditRepository } = createMembershipApp();
    const request = (body: unknown) =>
      app.request("/memberships", {
        method: "POST",
        headers: { authorization: "Bearer fake:admin-local", "content-type": "application/json" },
        body: JSON.stringify(body),
      });

    const created = await request(grantPayload());
    expect(created.status).toBe(200);
    const createdBody = (await created.json()) as {
      membership: { membershipId: string; version: number };
    };
    expect(createdBody.membership.version).toBe(1);

    const replay = await request(grantPayload());
    expect(replay.status).toBe(200);
    expect((await replay.json()) as { replayed: boolean }).toMatchObject({ replayed: true });

    const changed = await app.request(`/memberships/${createdBody.membership.membershipId}/role`, {
      method: "PATCH",
      headers: { authorization: "Bearer fake:admin-local", "content-type": "application/json" },
      body: JSON.stringify({
        storeId: "loja-piloto",
        role: "collaborator",
        expectedVersion: 1,
        idempotencyKey: "membership-downgrade-ficticia",
      }),
    });
    expect(changed.status).toBe(200);

    const session = await app.request("/session/context?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:operador-ficticio" },
    });
    expect((await session.json()) as { actions: { canCloseShift: boolean } }).toMatchObject({
      actions: { canCloseShift: false },
    });

    const revoked = await app.request(
      `/memberships/${createdBody.membership.membershipId}/revoke`,
      {
        method: "POST",
        headers: { authorization: "Bearer fake:admin-local", "content-type": "application/json" },
        body: JSON.stringify({
          storeId: "loja-piloto",
          expectedVersion: 2,
          idempotencyKey: "membership-revoke-ficticia",
        }),
      },
    );
    expect(revoked.status).toBe(200);
    expect(auditRepository.readEvents().map((event) => event.type)).toEqual([
      "membership.changed",
      "membership.changed",
      "membership.changed",
    ]);
  });

  it("denies a lead and does not reveal a cross-store membership", async () => {
    const { app } = createMembershipApp();
    const leadDenied = await app.request("/memberships?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    expect(leadDenied.status).toBe(403);

    const crossStore = await app.request("/memberships/membership-outra-ficticia/revoke", {
      method: "POST",
      headers: { authorization: "Bearer fake:admin-local", "content-type": "application/json" },
      body: JSON.stringify({
        storeId: "loja-outra",
        expectedVersion: 1,
        idempotencyKey: "cross-store-ficticia",
      }),
    });
    expect(crossStore.status).toBe(403);
    expect(JSON.stringify(await crossStore.json())).not.toContain("membership-outra-ficticia");
  });
});
