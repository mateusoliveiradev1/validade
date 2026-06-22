import { describe, expect, it } from "vitest";
import { createAuditRepositoryFromQuery } from "./audit-repository";
import { createMembershipRepositoryFromQuery } from "./membership-repository";

describe("database repositories", () => {
  it("maps active membership rows to the domain shape", async () => {
    const repository = createMembershipRepositoryFromQuery((() => Promise.resolve([
      {
        subject_id: "lead-local",
        role: "lead",
        store_id: "loja-piloto",
        store_name: "Loja Piloto",
        status: "active",
      },
    ])) as never);

    await expect(repository.listActiveMemberships("lead-local")).resolves.toEqual([
      {
        subjectId: "lead-local",
        role: "lead",
        storeId: "loja-piloto",
        storeName: "Loja Piloto",
        status: "active",
      },
    ]);
  });

  it("only exposes append for audit events", () => {
    const repository = createAuditRepositoryFromQuery((() => Promise.resolve([])) as never);
    const keys = Object.keys(repository);

    expect(keys).toEqual(["append"]);
    expect("update" in repository).toBe(false);
    expect("delete" in repository).toBe(false);
  });

  it("writes sanitized append-only audit rows through insert-only SQL", async () => {
    const statements: readonly unknown[][] = [];
    const captured: unknown[][] = [];
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.push([strings.join("?"), ...values]);
      return Promise.resolve(statements);
    }) as never;
    const repository = createAuditRepositoryFromQuery(sql);

    await repository.append({
      eventId: "event-1",
      idempotencyKey: "idem-1",
      type: "access.denied",
      storeId: "loja-piloto",
      actorId: "actor-1",
      actorDisplayName: "Pessoa Piloto",
      actorRoleSnapshot: "lead",
      occurredAt: new Date("2026-06-22T10:00:00.000Z"),
      targetType: "task",
      targetId: "task-ficticia",
      summary: "Acesso negado sanitizado.",
      reason: "outside_store_scope",
      metadata: { requestedCapability: "task.act" },
    });

    expect(String(captured[0]?.[0])).toContain("insert into audit_events");
    expect(String(captured[0]?.[0])).not.toMatch(/update|delete/i);
    expect(String(captured[0]?.[0])).toContain("sanitized");
    expect(String(captured[0]?.[0])).toContain("true");
  });
});
