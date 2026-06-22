import { describe, expect, it } from "vitest";
import {
  createDefaultMemberships,
  createInMemoryAccessDeniedAuditRecorder,
  createInMemoryMembershipRepository,
  FakeAuthProvider,
  JwtAuthProvider,
} from "./auth";
import { createApiApp } from "./index";

describe("authorization API seam", () => {
  it("returns server-resolved collaborator context and protects collaborator probe", async () => {
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository(),
    });

    const contextResponse = await app.request("/session/context?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:collaborator-local" },
    });
    const contextBody = (await contextResponse.json()) as unknown;

    expect(contextResponse.status).toBe(200);
    expect(contextBody).toMatchObject({
      activeRole: "collaborator",
      store: { storeId: "loja-piloto" },
      actions: { canActOnTask: true, canCloseShift: false },
    });

    const probeResponse = await app.request("/session/probe/task-act?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:collaborator-local" },
    });

    expect(probeResponse.status).toBe(200);
  });

  it("returns lead context with the close action", async () => {
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository(),
    });

    const response = await app.request("/session/context?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      activeRole: "lead",
      actions: { canCloseShift: true, canReadStoreAudit: true },
    });
  });

  it("denies inactive memberships", async () => {
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([
        {
          subjectId: "lead-local",
          role: "lead",
          storeId: "loja-piloto",
          storeName: "Loja Ficticia Piloto",
          status: "inactive",
        },
      ]),
    });

    const response = await app.request("/session/context?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      error: "access_denied",
      reason: "inactive_membership",
    });
  });

  it("does not let forged role or store input alter authorization", async () => {
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository(),
    });

    const response = await app.request("/session/probe/shift-close?storeId=loja-piloto", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:collaborator-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: "admin", storeId: "loja-piloto" }),
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      error: "access_denied",
      reason: "capability_not_allowed",
    });
  });

  it("denies known cross-store identifiers with sanitized audit event", async () => {
    const auditRecorder = createInMemoryAccessDeniedAuditRecorder();
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository(),
      accessDeniedAuditRecorder: auditRecorder,
    });

    const response = await app.request("/session/probe/task-act?storeId=loja-outra", {
      headers: { authorization: "Bearer fake:collaborator-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      error: "access_denied",
      reason: "outside_store_scope",
    });
    expect(JSON.stringify(body)).not.toContain("loja-outra");
    expect(auditRecorder.readEvents()).toHaveLength(1);
    expect(auditRecorder.readEvents()[0]).toMatchObject({
      actorSubjectId: "collaborator-local",
      actorRoleSnapshot: "collaborator",
      requestedCapability: "task.act",
      targetType: "task_probe",
      storeScope: "loja-outra",
      reason: "outside_store_scope",
    });
    expect(JSON.stringify(auditRecorder.readEvents()[0])).not.toMatch(
      /Bearer|authorization|headers|raw|payload|token/i,
    );
  });

  it("denies admin shift close without explicit lead membership", async () => {
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository(createDefaultMemberships()),
    });

    const response = await app.request("/session/probe/shift-close?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:admin-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      reason: "capability_not_allowed",
    });
  });

  it("treats expired and invalid identities as unauthenticated", async () => {
    const auditRecorder = createInMemoryAccessDeniedAuditRecorder();
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository(),
      accessDeniedAuditRecorder: auditRecorder,
    });

    const expiredResponse = await app.request("/session/context?storeId=loja-piloto", {
      headers: { authorization: "Bearer expired:lead-local" },
    });
    const invalidResponse = await app.request("/session/context?storeId=loja-piloto", {
      headers: { authorization: "Bearer invalid" },
    });

    expect(expiredResponse.status).toBe(403);
    await expect(expiredResponse.json()).resolves.toMatchObject({
      reason: "unauthenticated",
    });
    expect(invalidResponse.status).toBe(403);
    await expect(invalidResponse.json()).resolves.toMatchObject({
      reason: "unauthenticated",
    });
    expect(JSON.stringify(auditRecorder.readEvents())).not.toMatch(/expired:lead-local|Bearer/i);
  });

  it("keeps JWT verification behind a replaceable AuthProvider boundary", async () => {
    const provider = new JwtAuthProvider({
      verify(token) {
        if (token === "good-token") {
          return Promise.resolve({
            subjectId: "lead-local",
            displayName: "Lideranca local",
            issuer: "jwks-test",
            expiresAt: "2999-01-01T00:00:00.000Z",
          });
        }

        return Promise.resolve(undefined);
      },
    });

    await expect(
      provider.verify(
        new Request("https://api.local/session", {
          headers: { authorization: "Bearer good-token" },
        }),
      ),
    ).resolves.toMatchObject({
      subjectId: "lead-local",
      issuer: "jwks-test",
    });
    await expect(
      provider.verify(
        new Request("https://api.local/session", {
          headers: { authorization: "Bearer bad-token" },
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
