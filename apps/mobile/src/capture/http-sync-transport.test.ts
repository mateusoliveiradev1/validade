import {
  SyncCommandRecordSchema,
  SyncTransportBatchSchema,
  type SyncCommandRecord,
} from "@validade-zero/contracts";
import { describe, expect, it, vi } from "vitest";
import { createFetchSyncTransport } from "./http-sync-transport";

const NOW = "2030-01-10T12:30:00.000Z";

describe("HTTP sync transport", () => {
  it("posts mobile command batches to the central store-scoped sync endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              status: "ack",
              commandId: "command-sync-001",
              idempotencyKey: "sync-idempotency-001",
              syncedAt: NOW,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const transport = createFetchSyncTransport({
      baseUrl: "https://validade-zero-api-staging.validadezero.workers.dev/",
      storeId: "loja-piloto",
      storeName: "Loja Piloto - Staging",
      headers: () => ({ Authorization: "Bearer fake-session-token" }),
      fetcher,
    });

    await expect(transport.sendBatch(createBatch())).resolves.toEqual([
      {
        status: "ack",
        commandId: "command-sync-001",
        idempotencyKey: "sync-idempotency-001",
        syncedAt: NOW,
      },
    ]);
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(
      "https://validade-zero-api-staging.validadezero.workers.dev/sync/commands?storeId=loja-piloto&storeName=Loja+Piloto+-+Staging",
    );
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer fake-session-token");
    expect(init.body).toContain("command-sync-001");
  });

  it("keeps the local command queued when the central sync endpoint rejects the batch", async () => {
    const transport = createFetchSyncTransport({
      baseUrl: "https://validade-zero-api-staging.validadezero.workers.dev",
      storeId: "loja-piloto",
      fetcher: vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: "failed" }), { status: 503 })),
    });

    await expect(transport.sendBatch(createBatch())).rejects.toThrow(
      "Central sync rejected the command batch.",
    );
  });
});

function createBatch() {
  const command = SyncCommandRecordSchema.parse({
    id: "command-sync-001",
    idempotencyKey: "sync-idempotency-001",
    kind: "resolve_task",
    state: "syncing",
    urgency: "critical",
    payload: {
      kind: "resolve_task",
      payload: {
        taskId: "task-sync-001",
        action: "withdraw",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:10:00.000Z",
        destination: { kind: "retirada_perda" },
        evidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
      },
    } satisfies SyncCommandRecord["payload"],
    taskId: "task-sync-001",
    taskActiveKey: "active-sync-001",
    lotId: "lot-sync-001",
    productDisplayName: "Ovos FICTICIOS",
    lotIdentity: {
      identitySource: "printed",
      value: "LOTE-OVOS-SYNC-FICTICIO",
    },
    currentLocation: { kind: "area_de_venda" },
    riskState: "expired",
    requiredResolution: "withdraw_or_loss",
    createdAt: "2030-01-10T12:00:00.000Z",
    updatedAt: NOW,
    savedAt: "2030-01-10T12:05:00.000Z",
    firstAttemptedAt: NOW,
    lastAttemptedAt: NOW,
    attemptCount: 1,
  });

  return SyncTransportBatchSchema.parse({
    batchId: "batch-sync-001",
    deviceId: "device-sync-001",
    commands: [command],
    sentAt: NOW,
  });
}
