import { describe, expect, it } from "vitest";
import { FakeAuthProvider, createInMemoryMembershipRepository } from "./auth";
import { createInMemoryAuditRepository } from "./audit";
import { createApiApp } from "./index";

const NOW = new Date("2030-01-10T12:00:02.000Z");

function createApp() {
  const auditRepository = createInMemoryAuditRepository();
  const app = createApiApp({
    auditRepository,
    authProvider: new FakeAuthProvider(),
    membershipRepository: createInMemoryMembershipRepository([
      {
        subjectId: "lead-local",
        role: "lead",
        storeId: "loja-piloto",
        storeName: "Loja Piloto",
        status: "active",
      },
      {
        subjectId: "lead-outra",
        role: "lead",
        storeId: "loja-outra",
        storeName: "Loja Outra",
        status: "active",
      },
      {
        subjectId: "collaborator-local",
        role: "collaborator",
        storeId: "loja-piloto",
        storeName: "Loja Piloto",
        status: "active",
      },
    ]),
    now: () => NOW,
  });

  return { app, auditRepository };
}

async function recordTaskAction(app: ReturnType<typeof createApiApp>, idempotencyKey?: string) {
  return app.request("/tasks/task-audit-001/actions", {
    method: "POST",
    headers: {
      authorization: "Bearer fake:lead-local",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      storeId: "loja-piloto",
      action: "withdraw",
      occurredAt: "2030-01-10T12:00:00.000Z",
      idempotencyKey: idempotencyKey ?? "task-audit-001:withdraw:2030-01-10T12:00:00.000Z",
      productDisplayName: "Ovos FICTICIOS",
      lotCode: "OVOS-001",
      reason: "Produto vencido removido fisicamente.",
    }),
  });
}

describe("audit API seam", () => {
  it("records a protected task action and exposes it through the lead store audit query", async () => {
    const { app, auditRepository } = createApp();

    const mutation = await recordTaskAction(app);
    const mutationBody = (await mutation.json()) as unknown;
    const query = await app.request("/audit/events?storeId=loja-piloto&limit=10", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const queryBody = (await query.json()) as { items: unknown[] };

    expect(mutation.status).toBe(200);
    expect(mutationBody).toMatchObject({
      action: {
        taskId: "task-audit-001",
        action: "withdraw",
        status: "recorded",
      },
      auditEvent: {
        type: "task.changed",
        store: { storeId: "loja-piloto", storeName: "Loja Piloto" },
        actor: { actorId: "lead-local", roleSnapshot: "lead" },
        target: {
          type: "task",
          id: "task-audit-001",
          label: "Ovos FICTICIOS - lote OVOS-001",
        },
        occurredAt: "2030-01-10T12:00:00.000Z",
        receivedAt: "2030-01-10T12:00:02.000Z",
      },
      replayed: false,
    });
    expect(query.status).toBe(200);
    expect(queryBody.items).toHaveLength(1);
    expect(queryBody.items[0]).toMatchObject({
      summary: "Retirada registrada na area de venda.",
      reason: "Produto vencido removido fisicamente.",
    });
    expect(JSON.stringify(queryBody)).not.toMatch(
      /idempotencyKey|payload|authorization|Bearer|objectKey|signedUrl|uri|base64/i,
    );
    expect(auditRepository.readEvents()).toHaveLength(1);
  });

  it("deduplicates replayed task actions by idempotency key", async () => {
    const { app, auditRepository } = createApp();
    const idempotencyKey = "task-audit-001:withdraw:replay";

    const first = await recordTaskAction(app, idempotencyKey);
    const second = await recordTaskAction(app, idempotencyKey);
    const secondBody = (await second.json()) as unknown;

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody).toMatchObject({ replayed: true });
    expect(auditRepository.readEvents()).toHaveLength(1);
  });

  it("denies collaborator audit reads without leaking the target details", async () => {
    const { app } = createApp();

    await recordTaskAction(app);
    const response = await app.request(
      "/audit/events?storeId=loja-piloto&targetType=task&targetId=task-audit-001",
      {
        headers: { authorization: "Bearer fake:collaborator-local" },
      },
    );
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(403);
    expect(JSON.stringify(body)).not.toContain("task-audit-001");
  });

  it("denies another-store leads and stores only sanitized denial audit data", async () => {
    const { app, auditRepository } = createApp();

    await recordTaskAction(app);
    const response = await app.request("/audit/events?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-outra" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      error: "access_denied",
      reason: "outside_store_scope",
    });
    expect(JSON.stringify(body)).not.toContain("loja-piloto");
    expect(auditRepository.readEvents()).toHaveLength(2);
    expect(auditRepository.readEvents()[1]).toMatchObject({
      type: "access.denied",
      status: "denied",
      target: { type: "access_request", id: "redacted" },
      metadata: {
        requestedCapability: "audit.read_store",
        denialReason: "outside_store_scope",
      },
    });
    expect(JSON.stringify(auditRepository.readEvents()[1])).not.toMatch(
      /Bearer|authorization|headers|raw|payload|token|task-audit-001/i,
    );
  });
});
