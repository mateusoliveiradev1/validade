import { describe, expect, it } from "vitest";
import { createAuditRepositoryFromQuery } from "./audit-repository";
import { createInMemoryAuthRepository } from "./auth-repository";
import {
  createInMemoryMembershipManagementRepository,
  createMembershipRepositoryFromQuery,
} from "./membership-repository";

describe("database repositories", () => {
  it("maps active membership rows to the domain shape", async () => {
    const repository = createMembershipRepositoryFromQuery((() =>
      Promise.resolve([
        {
          subject_id: "lead-local",
          role: "lead",
          store_id: "loja-piloto",
          store_name: "Loja Ficticia Piloto",
          status: "active",
        },
      ])) as never);

    await expect(repository.listActiveMemberships("lead-local")).resolves.toEqual([
      {
        subjectId: "lead-local",
        role: "lead",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
    ]);
  });

  it("only exposes append and store-scoped select operations for audit events", () => {
    const repository = createAuditRepositoryFromQuery((() => Promise.resolve([])) as never);
    const keys = Object.keys(repository);

    expect(keys).toEqual(["append", "appendWithMutation", "listByTarget", "queryStore"]);
    expect("update" in repository).toBe(false);
    expect("delete" in repository).toBe(false);
  });

  it("writes sanitized append-only audit rows with idempotent insert-only SQL", async () => {
    const captured: unknown[][] = [];
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.push([strings.join("?"), ...values]);
      if (strings.join("?").includes("select")) {
        return Promise.resolve([createAuditRow()]);
      }

      return Promise.resolve([]);
    }) as never;
    const repository = createAuditRepositoryFromQuery(sql);

    const event = await repository.append({
      eventId: "event-1",
      idempotencyKey: "idem-1",
      type: "access.denied",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      actorId: "actor-1",
      actorDisplayName: "Pessoa Piloto",
      actorRoleSnapshot: "lead",
      occurredAt: new Date("2026-06-22T10:00:00.000Z"),
      targetType: "access_request",
      targetId: "task-ficticia",
      targetLabel: "Tentativa bloqueada",
      summary: "Acesso negado sanitizado.",
      reason: "outside_store_scope",
      status: "denied",
      metadata: { requestedCapability: "task.act" },
    });

    expect(String(captured[0]?.[0])).toContain("insert into audit_events");
    expect(String(captured[0]?.[0])).toContain("on conflict (idempotency_key) do nothing");
    expect(String(captured[0]?.[0])).not.toMatch(/update|delete/i);
    expect(String(captured[0]?.[0])).toContain("sanitized");
    expect(String(captured[0]?.[0])).toContain("true");
    expect(event).toMatchObject({
      eventId: "event-1",
      storeId: "loja-piloto",
      status: "denied",
    });
  });

  it("does not run the mutation callback when idempotency already exists", async () => {
    const captured: unknown[][] = [];
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.push([strings.join("?"), ...values]);
      return Promise.resolve([createAuditRow()]);
    }) as never;
    const repository = createAuditRepositoryFromQuery(sql);
    let mutationCount = 0;

    const result = await repository.appendWithMutation({
      event: {
        eventId: "event-1",
        idempotencyKey: "idem-1",
        type: "task.changed",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        actorId: "actor-1",
        actorDisplayName: "Pessoa Piloto",
        actorRoleSnapshot: "lead",
        occurredAt: new Date("2026-06-22T10:00:00.000Z"),
        targetType: "task",
        targetId: "task-ficticia",
        summary: "Tarefa atualizada.",
      },
      mutate: () => {
        mutationCount += 1;
        return Promise.resolve({ status: "mutated" });
      },
    });

    expect(result.replayed).toBe(true);
    expect(mutationCount).toBe(0);
    expect(String(captured[0]?.[0])).toContain("where idempotency_key =");
    expect(captured).toHaveLength(1);
  });

  it("queries audit rows with a mandatory store predicate and cursor limit", async () => {
    const captured: unknown[][] = [];
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.push([strings.join("?"), ...values]);
      return Promise.resolve([createAuditRow()]);
    }) as never;
    const repository = createAuditRepositoryFromQuery(sql);

    const page = await repository.queryStore({
      storeId: "loja-piloto",
      targetType: "task",
      targetId: "task-ficticia",
      limit: 10,
    });

    expect(String(captured[0]?.[0])).toContain("where store_id =");
    expect(String(captured[0]?.[0])).toContain("target_type");
    expect(String(captured[0]?.[0])).toContain("limit");
    expect(page.items).toHaveLength(1);
  });

  it("deduplicates pilot invites and rejects expired invite tokens", async () => {
    const repository = createInMemoryAuthRepository({
      memberships: createMemberships(),
      secrets: TEST_SECRETS,
    });
    const first = await repository.createInvite({ ...inviteInput(), token: RAW_INVITE_TOKEN });
    const replay = await repository.createInvite({
      ...inviteInput(),
      token: "different-raw-token-that-must-not-be-stored",
    });

    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ invite: first.invite, replayed: true });
    await expect(
      repository.validateInvite({
        token: RAW_INVITE_TOKEN,
        now: new Date("2026-06-30T00:00:00.000Z"),
      }),
    ).resolves.toEqual({ status: "expired" });
  });

  it("stores only salted password and token hashes", async () => {
    const repository = createInMemoryAuthRepository({
      memberships: createMemberships(),
      secrets: TEST_SECRETS,
    });
    await repository.createInvite({ ...inviteInput(), token: RAW_INVITE_TOKEN });
    await repository.activateAccount({
      token: RAW_INVITE_TOKEN,
      password: RAW_PASSWORD,
      activatedAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    await repository.rotateSession({
      sessionId: "session-1",
      subjectId: "subject-1",
      storeId: "store-1",
      nextToken: RAW_SESSION_TOKEN,
      expiresAt: new Date("2026-06-22T18:05:00.000Z"),
      occurredAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    await repository.createRecoveryRequest({
      recoveryId: "recovery-1",
      idempotencyKey: "recovery-idempotency-1",
      identifier: "person@example.invalid",
      token: RAW_RECOVERY_TOKEN,
      expiresAt: new Date("2026-06-22T10:35:00.000Z"),
      createdAt: new Date("2026-06-22T10:06:00.000Z"),
    });

    const stored = JSON.stringify(repository.readStoredState());
    expect(stored).not.toContain(RAW_INVITE_TOKEN);
    expect(stored).not.toContain(RAW_SESSION_TOKEN);
    expect(stored).not.toContain(RAW_RECOVERY_TOKEN);
    expect(stored).not.toContain(RAW_PASSWORD);
    expect(repository.readStoredState().credentials[0]?.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
  });

  it("blocks session refresh after the store membership is revoked", async () => {
    const memberships = createMemberships();
    const repository = createInMemoryAuthRepository({ memberships, secrets: TEST_SECRETS });
    await repository.createInvite({ ...inviteInput(), token: RAW_INVITE_TOKEN });
    await repository.activateAccount({
      token: RAW_INVITE_TOKEN,
      password: RAW_PASSWORD,
      activatedAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    await repository.rotateSession({
      sessionId: "session-1",
      subjectId: "subject-1",
      storeId: "store-1",
      nextToken: RAW_SESSION_TOKEN,
      expiresAt: new Date("2026-06-22T18:05:00.000Z"),
      occurredAt: new Date("2026-06-22T10:05:00.000Z"),
    });
    await expect(
      repository.verifySession({
        token: RAW_SESSION_TOKEN,
        now: new Date("2026-06-22T10:06:00.000Z"),
      }),
    ).resolves.toMatchObject({ subjectId: "subject-1", storeId: "store-1" });

    await memberships.revokeMembership({
      membershipId: "membership-1",
      storeId: "store-1",
      expectedVersion: 1,
      idempotencyKey: "revoke-membership-1",
      occurredAt: new Date("2026-06-22T10:07:00.000Z"),
    });

    await expect(
      repository.verifySession({
        token: RAW_SESSION_TOKEN,
        now: new Date("2026-06-22T10:08:00.000Z"),
      }),
    ).resolves.toBeUndefined();
  });

  it("stores bounded privacy intake without evidence or secret fields", async () => {
    const repository = createInMemoryAuthRepository({
      memberships: createMemberships(),
      secrets: TEST_SECRETS,
    });
    const receipt = await repository.createPrivacyRequest({
      requestId: "privacy-1",
      idempotencyKey: "privacy-idempotency-1",
      subjectId: "subject-1",
      storeId: "store-1",
      requestType: "access",
      contactChannel: "email",
      contactValue: "person@example.invalid",
      dataCategories: ["identity", "store_and_role", "timestamps_and_audit"],
      requestBody: "Solicito uma copia dos dados associados a minha conta.",
      receivedAt: new Date("2026-06-22T10:10:00.000Z"),
    });

    expect(receipt.replayed).toBe(false);
    expect(Object.keys(receipt.request)).not.toEqual(
      expect.arrayContaining(["binary", "base64", "deviceUri", "signedUrl", "secret"]),
    );
  });
});

const TEST_SECRETS = {
  tokenPepper: "test-token-pepper-at-least-16",
  passwordPepper: "test-password-pepper-at-least-16",
};
const RAW_INVITE_TOKEN = "raw-invite-token-at-least-thirty-two-characters";
const RAW_SESSION_TOKEN = "raw-session-token-at-least-thirty-two-characters";
const RAW_RECOVERY_TOKEN = "raw-recovery-token-at-least-thirty-two-characters";
const RAW_PASSWORD = "senha-piloto-forte-123";

function createMemberships() {
  const occurredAt = new Date("2026-06-22T10:00:00.000Z");
  return createInMemoryMembershipManagementRepository([
    {
      membershipId: "membership-1",
      subjectId: "subject-1",
      displayName: "Pessoa Piloto",
      role: "lead",
      storeId: "store-1",
      storeName: "Loja Piloto",
      status: "active",
      version: 1,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    },
  ]);
}

function inviteInput() {
  return {
    inviteId: "invite-1",
    idempotencyKey: "invite-idempotency-1",
    identifier: "Person@Example.Invalid",
    subjectId: "subject-1",
    displayName: "Pessoa Piloto",
    storeId: "store-1",
    storeName: "Loja Piloto",
    role: "lead" as const,
    expiresAt: new Date("2026-06-29T10:00:00.000Z"),
    createdBy: "admin-1",
    createdAt: new Date("2026-06-22T10:00:00.000Z"),
  };
}

function createAuditRow() {
  return {
    event_id: "event-1",
    idempotency_key: "idem-1",
    type: "access.denied",
    store_id: "loja-piloto",
    store_name: "Loja Ficticia Piloto",
    actor_id: "actor-1",
    actor_display_name: "Pessoa Piloto",
    actor_role_snapshot: "lead",
    occurred_at: "2026-06-22T10:00:00.000Z",
    received_at: "2026-06-22T10:00:01.000Z",
    target_type: "access_request",
    target_id: "task-ficticia",
    target_label: "Tentativa bloqueada",
    summary: "Acesso negado sanitizado.",
    reason: "outside_store_scope",
    status: "denied",
    linked_event_id: null,
    metadata: { requestedCapability: "task.act" },
  };
}
