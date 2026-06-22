import { describe, expect, it } from "vitest";
import { createAuditRepositoryFromQuery } from "./audit-repository";
import { createMembershipRepositoryFromQuery } from "./membership-repository";

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
});

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
