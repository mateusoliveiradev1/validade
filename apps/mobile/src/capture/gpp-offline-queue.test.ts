import { describe, expect, it } from "vitest";

import { applyGppRetryResult, sendGppPendingRecord } from "./gpp-offline-queue";
import { createMemoryCaptureRepository } from "./memory-repository";

const avariaPayload = {
  storeId: "loja-18",
  sector: "FLV",
  product: { code: "789000000001", name: "Maca FICTICIA" },
  quantity: { value: 2, unit: "kg" },
  finality: "baixa_gpp",
  destination: "Controle GPP",
  occurredAt: "2030-01-10T09:00:00.000Z",
  idempotencyKey: "idem-gpp-001",
} as const;

const purchasePayload = {
  storeId: "loja-18",
  sector: "FLV",
  product: { name: "Banana prata FICTICIA" },
  requestedQuantity: { value: 3, unit: "caixa" },
  finality: "Reposicao da avaria",
  requestedAt: "2030-01-10T09:05:00.000Z",
  idempotencyKey: "idem-gpp-002",
} as const;

describe("GPP offline queue", () => {
  it("saves, lists, loads, and deduplicates pending GPP records by idempotency key", async () => {
    let nextId = 1;
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => `gpp-local-${nextId++}`,
    });

    const first = await repository.saveGppPending({
      kind: "avaria",
      payload: avariaPayload,
    });
    const duplicate = await repository.saveGppPending({
      kind: "avaria",
      payload: avariaPayload,
    });
    const purchase = await repository.saveGppPending({
      kind: "purchase",
      payload: purchasePayload,
    });

    expect(first.localId).toBe(duplicate.localId);
    expect(first.kind).toBe("avaria");
    expect(purchase.kind).toBe("purchase");
    await expect(repository.loadGppPending(first.localId)).resolves.toMatchObject({
      idempotencyKey: avariaPayload.idempotencyKey,
      state: "pending_retry",
    });
    await expect(repository.listGppPending()).resolves.toHaveLength(2);
  });

  it("tracks retry attempts, conflicts, central confirmations, and discards", async () => {
    let nextId = 1;
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => `gpp-local-${nextId++}`,
    });
    const pending = await repository.saveGppPending({
      kind: "avaria",
      payload: avariaPayload,
    });

    await expect(
      repository.markGppPendingAttempt({
        localId: pending.localId,
        attemptedAt: "2030-01-10T09:10:00.000Z",
        failureReason: "offline",
      }),
    ).resolves.toMatchObject({
      state: "retrying",
      attemptCount: 1,
      idempotencyKey: avariaPayload.idempotencyKey,
    });

    await expect(
      repository.markGppPendingConflict({
        localId: pending.localId,
        occurredAt: "2030-01-10T09:12:00.000Z",
        reason: "Produto divergente no central",
      }),
    ).resolves.toMatchObject({
      state: "conflict",
      conflictReason: "Produto divergente no central",
    });

    await expect(
      repository.discardGppPending({
        localId: pending.localId,
        discardedAt: "2030-01-10T09:13:00.000Z",
        justification: "Conferido fisicamente e duplicado",
      }),
    ).resolves.toMatchObject({
      state: "discarded",
      discardJustification: "Conferido fisicamente e duplicado",
    });

    const confirmed = await repository.saveGppPending({
      kind: "purchase",
      payload: purchasePayload,
    });
    await expect(
      repository.markGppPendingConfirmed({
        localId: confirmed.localId,
        confirmedAt: "2030-01-10T09:20:00.000Z",
        centralRequestId: "gpp-purchase:idem-gpp-002",
      }),
    ).resolves.toMatchObject({
      state: "central_confirmed",
      centralRequestId: "gpp-purchase:idem-gpp-002",
    });
  });

  it("retries original payloads with original idempotency keys and maps retry outcomes", async () => {
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => "gpp-local-retry",
    });
    const record = await repository.saveGppPending({
      kind: "purchase",
      payload: purchasePayload,
    });
    const client = {
      createGppAvaria: () => Promise.reject(new Error("not used")),
      createGppPurchaseRequest: (request: typeof purchasePayload) =>
        Promise.resolve({
          state: "central_success" as const,
          copy: "Confirmado no Controle GPP." as const,
          response: {
            state: "central_confirmed" as const,
            requestId: `central:${request.idempotencyKey}`,
            confirmedAt: "2030-01-10T09:20:00.000Z",
          },
        }),
    };

    const result = await sendGppPendingRecord(client, record);
    expect(result).toMatchObject({
      state: "central_success",
      response: { requestId: `central:${purchasePayload.idempotencyKey}` },
    });
    expect(
      applyGppRetryResult({
        record,
        result,
        attemptedAt: "2030-01-10T09:20:00.000Z",
      }),
    ).toMatchObject({
      state: "central_confirmed",
      idempotencyKey: purchasePayload.idempotencyKey,
      attemptCount: 1,
    });

    expect(
      applyGppRetryResult({
        record,
        result: {
          state: "central_failure",
          reason: "business_rule",
          message: "Produto recusado pela central",
          retryable: false,
        },
        attemptedAt: "2030-01-10T09:21:00.000Z",
      }),
    ).toMatchObject({
      state: "conflict",
      conflictReason: "Produto recusado pela central",
    });
  });
});
