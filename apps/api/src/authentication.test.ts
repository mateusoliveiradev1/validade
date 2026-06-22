import { describe, expect, it } from "vitest";

import {
  createInMemoryAuthRepository,
  type AuthRepository,
} from "@validade-zero/database/auth-repository";
import { createInMemoryMembershipManagementRepository } from "@validade-zero/database/membership-repository";

import { FakeAuthProvider } from "./auth";
import {
  createInMemoryAuthSecurityAuditRecorder,
  createInMemoryRecoveryDeliveryProvider,
} from "./authentication";
import { createApiApp } from "./index";

const TEST_SECRETS = {
  tokenPepper: "api-test-token-pepper-at-least-16",
  passwordPepper: "api-test-password-pepper-at-least-16",
};
const INVITE_TOKEN = "invite-token-with-at-least-thirty-two-characters";
const PASSWORD = "senha-piloto-forte-123";

describe("pilot authentication API", () => {
  it("activates an invite, resolves session context, logs out, and logs in again", async () => {
    const fixture = createFixture();
    await seedInvite(fixture.repository);

    const invalid = await fixture.app.request(
      "/auth/invites/invalid-token-with-at-least-thirty-two-characters",
    );
    expect(invalid.status).toBe(410);
    await expect(invalid.json()).resolves.toEqual({ status: "invalid" });

    const activated = await fixture.app.request(`/auth/invites/${INVITE_TOKEN}/activate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: PASSWORD }),
    });
    const activatedBody = (await activated.json()) as {
      sessionToken: string;
      session: { actions: { canCloseShift: boolean }; accountStatus: string };
    };
    expect(activated.status).toBe(201);
    expect(activated.headers.get("set-cookie")).toMatch(/HttpOnly; Secure; SameSite=Strict/);
    expect(activatedBody.session).toMatchObject({
      accountStatus: "active",
      actions: { canCloseShift: true },
    });

    const session = await fixture.app.request("/auth/session", {
      headers: { authorization: `Bearer ${activatedBody.sessionToken}` },
    });
    expect(session.status).toBe(200);

    const logout = await fixture.app.request("/auth/logout", {
      method: "POST",
      headers: {
        authorization: `Bearer ${activatedBody.sessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(
      (
        await fixture.app.request("/auth/session", {
          headers: { authorization: `Bearer ${activatedBody.sessionToken}` },
        })
      ).status,
    ).toBe(401);

    const login = await fixture.app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "person@example.invalid", password: PASSWORD }),
    });
    expect(login.status).toBe(200);
    await expect(login.json()).resolves.toMatchObject({
      status: "authenticated",
      session: { store: { storeId: "store-1" }, activeRole: "lead" },
    });
  });

  it("expires sessions and blocks refresh immediately after membership revocation", async () => {
    let current = new Date("2030-01-10T10:00:00.000Z");
    const fixture = createFixture({ now: () => current, sessionTtlSeconds: 1 });
    const token = await activate(fixture);
    current = new Date("2030-01-10T10:00:02.000Z");
    expect(
      (
        await fixture.app.request("/auth/session", {
          headers: { authorization: `Bearer ${token}` },
        })
      ).status,
    ).toBe(401);

    current = new Date("2030-01-10T11:00:00.000Z");
    const activeFixture = createFixture({ now: () => current });
    const activeToken = await activate(activeFixture);
    await activeFixture.memberships.revokeMembership({
      membershipId: "membership-1",
      storeId: "store-1",
      expectedVersion: 1,
      idempotencyKey: "membership-revoke-auth-test",
      occurredAt: current,
    });
    expect(
      (
        await activeFixture.app.request("/auth/session", {
          headers: { authorization: `Bearer ${activeToken}` },
        })
      ).status,
    ).toBe(401);
  });

  it("returns blocked account state and records only sanitized security context", async () => {
    const security = createInMemoryAuthSecurityAuditRecorder();
    const fixture = createFixture({ authSecurityAuditRecorder: security });
    await activate(fixture);
    await fixture.repository.changeAccountStatus({
      subjectId: "subject-1",
      storeId: "store-1",
      status: "blocked",
      occurredAt: fixture.now(),
    });

    const response = await fixture.app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "person@example.invalid", password: PASSWORD }),
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "account_blocked",
      accountStatus: "blocked",
    });
    expect(security.readEvents()).toHaveLength(1);
    expect(JSON.stringify(security.readEvents())).not.toMatch(
      /senha-piloto|invite-token|authorization|requestBody|body/i,
    );
  });

  it("keeps recovery account-neutral and accepts authenticated LGPD intake", async () => {
    const recovery = createInMemoryRecoveryDeliveryProvider();
    const fixture = createFixture({ recoveryDeliveryProvider: recovery });
    const sessionToken = await activate(fixture);

    const existing = await requestRecovery(fixture.app, "person@example.invalid");
    const missing = await requestRecovery(fixture.app, "missing@example.invalid");
    expect(existing.status).toBe(202);
    expect(missing.status).toBe(202);
    await expect(existing.json()).resolves.toEqual({ status: "recovery_requested" });
    await expect(missing.json()).resolves.toEqual({ status: "recovery_requested" });
    expect(recovery.readDeliveries()).toHaveLength(1);

    const reset = await fixture.app.request("/auth/recovery/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: recovery.readDeliveries()[0]?.token,
        password: "nova-senha-piloto-123",
      }),
    });
    expect(reset.status).toBe(200);

    const relogin = await fixture.app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: "person@example.invalid",
        password: "nova-senha-piloto-123",
      }),
    });
    const reloginBody = (await relogin.json()) as { sessionToken: string };
    expect(relogin.status).toBe(200);

    const privacy = await fixture.app.request("/privacy/requests", {
      method: "POST",
      headers: {
        authorization: `Bearer ${reloginBody.sessionToken || sessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requestType: "access",
        contact: { channel: "email", value: "person@example.invalid" },
        dataCategories: ["identity", "store_and_role", "timestamps_and_audit"],
        body: "Solicito uma copia dos dados associados a minha conta.",
        idempotencyKey: "privacy-request-auth-test",
      }),
    });
    expect(privacy.status).toBe(202);
    await expect(privacy.json()).resolves.toMatchObject({ status: "received", replayed: false });
  });

  it("guards admin invite creation and revocation with server-owned user.manage", async () => {
    const memberships = createAdminMemberships();
    const repository = createInMemoryAuthRepository({ memberships, secrets: TEST_SECRETS });
    const security = createInMemoryAuthSecurityAuditRecorder();
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      authRepository: repository,
      membershipManagementRepository: memberships,
      membershipRepository: memberships,
      authSecurityAuditRecorder: security,
      now: () => new Date("2030-01-10T10:00:00.000Z"),
    });
    const payload = {
      identifier: "invitee@example.invalid",
      displayName: "Pessoa Convidada",
      storeId: "store-1",
      storeName: "Loja Ficticia Piloto",
      role: "collaborator",
      idempotencyKey: "admin-invite-auth-test",
      expiresAt: "2030-01-17T10:00:00.000Z",
    };

    const denied = await app.request("/auth/invites", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:collaborator-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    expect(denied.status).toBe(403);

    const created = await app.request("/auth/invites", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:admin-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const createdBody = (await created.json()) as { inviteId: string; token: string };
    expect(created.status).toBe(201);
    expect(createdBody.token).toHaveLength(64);

    const revoked = await app.request(`/auth/invites/${createdBody.inviteId}/revoke`, {
      method: "POST",
      headers: {
        authorization: "Bearer fake:admin-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({ storeId: "store-1", idempotencyKey: "revoke-invite-auth-test" }),
    });
    expect(revoked.status).toBe(200);
    await expect(revoked.json()).resolves.toMatchObject({ status: "revoked" });
    expect(security.readEvents()).toHaveLength(1);
  });

  it("uses the real pilot provider in default composition", async () => {
    const response = await createApiApp().request("/session/context?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:collaborator-local" },
    });
    expect(response.status).toBe(403);
  });
});

function createFixture(input?: {
  now?: () => Date;
  sessionTtlSeconds?: number;
  authSecurityAuditRecorder?: ReturnType<typeof createInMemoryAuthSecurityAuditRecorder>;
  recoveryDeliveryProvider?: ReturnType<typeof createInMemoryRecoveryDeliveryProvider>;
}) {
  const now = input?.now ?? (() => new Date("2030-01-10T10:00:00.000Z"));
  const memberships = createPilotMemberships();
  const repository = createInMemoryAuthRepository({ memberships, secrets: TEST_SECRETS });
  const app = createApiApp({
    authRepository: repository,
    membershipManagementRepository: memberships,
    membershipRepository: memberships,
    ...(input?.authSecurityAuditRecorder === undefined
      ? {}
      : { authSecurityAuditRecorder: input.authSecurityAuditRecorder }),
    ...(input?.recoveryDeliveryProvider === undefined
      ? {}
      : { recoveryDeliveryProvider: input.recoveryDeliveryProvider }),
    ...(input?.sessionTtlSeconds === undefined
      ? {}
      : { sessionTtlSeconds: input.sessionTtlSeconds }),
    now,
  });
  return { app, memberships, repository, now };
}

function createPilotMemberships() {
  const at = new Date("2030-01-10T09:00:00.000Z");
  return createInMemoryMembershipManagementRepository([
    {
      membershipId: "membership-1",
      subjectId: "subject-1",
      displayName: "Pessoa Piloto",
      role: "lead",
      storeId: "store-1",
      storeName: "Loja Ficticia Piloto",
      status: "active",
      version: 1,
      createdAt: at,
      updatedAt: at,
    },
  ]);
}

function createAdminMemberships() {
  const at = new Date("2030-01-10T09:00:00.000Z");
  return createInMemoryMembershipManagementRepository([
    {
      membershipId: "membership-admin",
      subjectId: "admin-local",
      displayName: "Administracao local",
      role: "admin",
      storeId: "store-1",
      storeName: "Loja Ficticia Piloto",
      status: "active",
      version: 1,
      createdAt: at,
      updatedAt: at,
    },
    {
      membershipId: "membership-collaborator",
      subjectId: "collaborator-local",
      displayName: "Colaborador local",
      role: "collaborator",
      storeId: "store-1",
      storeName: "Loja Ficticia Piloto",
      status: "active",
      version: 1,
      createdAt: at,
      updatedAt: at,
    },
  ]);
}

async function seedInvite(repository: AuthRepository): Promise<void> {
  await repository.createInvite({
    inviteId: "invite-1",
    idempotencyKey: "invite-auth-test",
    token: INVITE_TOKEN,
    identifier: "person@example.invalid",
    subjectId: "subject-1",
    displayName: "Pessoa Piloto",
    storeId: "store-1",
    storeName: "Loja Ficticia Piloto",
    role: "lead",
    expiresAt: new Date("2030-01-17T10:00:00.000Z"),
    createdBy: "admin-test",
    createdAt: new Date("2030-01-10T09:30:00.000Z"),
  });
}

async function activate(fixture: ReturnType<typeof createFixture>): Promise<string> {
  await seedInvite(fixture.repository);
  const response = await fixture.app.request(`/auth/invites/${INVITE_TOKEN}/activate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  expect(response.status).toBe(201);
  const body = (await response.json()) as { sessionToken: string };
  return body.sessionToken;
}

function requestRecovery(app: ReturnType<typeof createApiApp>, identifier: string) {
  return app.request("/auth/recovery/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
}
