import { describe, expect, it } from "vitest";
import {
  AuditCursorPageSchema,
  AuditEventRecordSchema,
  AuditProducerCommandSchema,
  AuditQuerySchema,
  AuditTimelineItemSchema,
} from "./audit";

const baseEvent = {
  eventId: "audit-event-001",
  idempotencyKey: "task-action:task-001:withdraw:2030-01-10T12:00:00.000Z",
  type: "task.changed",
  store: {
    storeId: "loja-piloto",
    storeName: "Loja Ficticia Piloto",
  },
  actor: {
    actorId: "lead-local",
    displayName: "Lideranca local",
    roleSnapshot: "lead",
  },
  target: {
    type: "task",
    id: "task-001",
    label: "Ovos FICTICIOS - lote OVOS-001",
  },
  occurredAt: "2030-01-10T12:00:00.000Z",
  receivedAt: "2030-01-10T12:00:02.000Z",
  summary: "Retirada registrada na area de venda.",
  reason: "Produto vencido removido fisicamente.",
  status: "received",
  metadata: {
    action: "withdraw",
    productDisplayName: "Ovos FICTICIOS",
    lotCode: "OVOS-001",
  },
} as const;

describe("audit contracts", () => {
  it("validates a strict operational audit event with actor, store, target, and two times", () => {
    expect(AuditEventRecordSchema.parse(baseEvent)).toEqual(baseEvent);
    expect(
      AuditEventRecordSchema.safeParse({
        ...baseEvent,
        rawPayload: { token: "nao-deve-entrar" },
      }).success,
    ).toBe(false);
  });

  it("rejects raw metadata fields and signed evidence material", () => {
    expect(
      AuditEventRecordSchema.safeParse({
        ...baseEvent,
        metadata: {
          action: "withdraw",
          objectKey: "evidencias/reais/nao-registrar.jpg",
        },
      }).success,
    ).toBe(false);

    expect(
      AuditEventRecordSchema.safeParse({
        ...baseEvent,
        metadata: {
          signedUrl: "https://storage.invalid/arquivo-privado",
        },
      }).success,
    ).toBe(false);
  });

  it("projects timeline items without idempotency keys", () => {
    const { idempotencyKey: _idempotencyKey, ...projection } = baseEvent;
    void _idempotencyKey;
    const timelineItem = AuditTimelineItemSchema.parse({
      ...projection,
    });

    expect("idempotencyKey" in timelineItem).toBe(false);
    expect(timelineItem.summary).toBe("Retirada registrada na area de venda.");
  });

  it("allows pending local timeline items without central receipt", () => {
    const { idempotencyKey: _idempotencyKey, receivedAt: _receivedAt, ...projection } = baseEvent;
    void _idempotencyKey;
    void _receivedAt;
    const timelineItem = AuditTimelineItemSchema.parse({
      ...projection,
      eventId: "local-audit-event-001",
      status: "pending_ack",
    });

    expect(timelineItem.receivedAt).toBeUndefined();
    expect(timelineItem.status).toBe("pending_ack");
  });

  it("types every producer seam before it can reach the audit ledger", () => {
    const { idempotencyKey: _idempotencyKey, ...projection } = baseEvent;
    void _idempotencyKey;

    expect(
      AuditProducerCommandSchema.parse({
        producerKind: "sync.ack",
        idempotencyKey: "sync-ack:command-001",
        event: projection,
      }),
    ).toMatchObject({ producerKind: "sync.ack" });
    expect(
      AuditProducerCommandSchema.safeParse({
        producerKind: "navigation.click",
        idempotencyKey: "click-001",
        event: projection,
      }).success,
    ).toBe(false);
  });

  it("accepts GPP audit events with bounded previous and next state metadata", () => {
    expect(
      AuditEventRecordSchema.parse({
        ...baseEvent,
        eventId: "audit-gpp-avaria-001",
        idempotencyKey: "gpp:avaria-001",
        type: "gpp.changed",
        actor: {
          actorId: "gpp-local",
          displayName: "Operador GPP",
          roleSnapshot: "gpp",
        },
        target: {
          type: "gpp_avaria",
          id: "avaria-001",
          label: "162 Banana prata",
        },
        summary: "Avaria GPP registrada na central.",
        metadata: {
          action: "gpp.avaria.created",
          sector: "FLV",
          productCode: "162",
          previousState: "null",
          nextState: '{"status":"pendente"}',
        },
      }).type,
    ).toBe("gpp.changed");
  });

  it("requires store-scoped cursor queries and caps page size", () => {
    expect(
      AuditQuerySchema.parse({
        storeId: "loja-piloto",
        type: "task.changed",
        limit: "10",
      }),
    ).toMatchObject({ storeId: "loja-piloto", limit: 10 });

    expect(AuditQuerySchema.safeParse({ type: "task.changed" }).success).toBe(false);
    expect(AuditQuerySchema.safeParse({ storeId: "loja-piloto", limit: 500 }).success).toBe(false);
    expect(
      AuditQuerySchema.safeParse({
        storeId: "loja-piloto",
        targetId: "task-001",
      }).success,
    ).toBe(false);
  });

  it("validates cursor pages without total counts", () => {
    const { idempotencyKey: _idempotencyKey, ...projection } = baseEvent;
    void _idempotencyKey;
    const page = AuditCursorPageSchema.parse({
      items: [
        {
          ...projection,
          eventId: "audit-event-page-001",
        },
      ],
      nextCursor: "cursor-page-2",
    });

    expect(page.items).toHaveLength(1);
    expect(JSON.stringify(page)).not.toMatch(/total|count/i);
  });
});
