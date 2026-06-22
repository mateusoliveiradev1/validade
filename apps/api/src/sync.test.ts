import {
  SyncCommandRecordSchema,
  SyncTransportBatchSchema,
  type SyncCommandRecord,
  type SyncTransportBatch,
} from "@validade-zero/contracts";
import { describe, expect, it } from "vitest";
import { createApiApp, createInMemorySyncCommandService } from "./index";

const NOW = "2030-01-10T12:30:00.000Z";

function createSyncCommand(input?: {
  id?: string;
  idempotencyKey?: string;
  payload?: SyncCommandRecord["payload"];
}): SyncCommandRecord {
  const payload =
    input?.payload ??
    ({
      kind: "resolve_task",
      payload: {
        taskId: "task-sync-001",
        action: "withdraw",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:10:00.000Z",
        destination: { kind: "retirada_perda" },
        evidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
      },
    } satisfies SyncCommandRecord["payload"]);

  return SyncCommandRecordSchema.parse({
    id: input?.id ?? "command-sync-001",
    idempotencyKey:
      input?.idempotencyKey ?? "resolve_task:task-sync-001:withdraw:2030-01-10T12:10:00.000Z",
    kind: payload.kind,
    state: "syncing",
    urgency: "critical",
    payload,
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
    updatedAt: "2030-01-10T12:30:00.000Z",
    savedAt: "2030-01-10T12:05:00.000Z",
    firstAttemptedAt: "2030-01-10T12:30:00.000Z",
    lastAttemptedAt: "2030-01-10T12:30:00.000Z",
    attemptCount: 1,
  });
}

function createBatch(command = createSyncCommand()): SyncTransportBatch {
  return SyncTransportBatchSchema.parse({
    batchId: "batch-sync-001",
    deviceId: "device-sync-001",
    commands: [command],
    sentAt: NOW,
  });
}

async function postSync(app: ReturnType<typeof createApiApp>, payload: unknown) {
  return app.request("/sync/commands", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("sync command API seam", () => {
  it("acknowledges a valid sync batch through strict transport contracts", async () => {
    const service = createInMemorySyncCommandService({ now: () => NOW });
    const app = createApiApp({ syncCommandService: service });
    const response = await postSync(app, createBatch());
    const body = (await response.json()) as { results: unknown[] };

    expect(response.status).toBe(200);
    expect(body.results).toEqual([
      {
        status: "ack",
        commandId: "command-sync-001",
        idempotencyKey: "resolve_task:task-sync-001:withdraw:2030-01-10T12:10:00.000Z",
        syncedAt: NOW,
      },
    ]);
    expect(service.readResults()).toHaveLength(1);
  });

  it("deduplicates duplicate idempotency keys instead of creating another result", async () => {
    const service = createInMemorySyncCommandService({ now: () => NOW });
    const app = createApiApp({ syncCommandService: service });
    const batch = createBatch();

    const first = await postSync(app, batch);
    const second = await postSync(app, {
      ...batch,
      batchId: "batch-sync-002",
    });
    const firstBody = (await first.json()) as { results: unknown[] };
    const secondBody = (await second.json()) as { results: unknown[] };

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.results).toEqual(firstBody.results);
    expect(service.readResults()).toHaveLength(1);
  });

  it("rejects malformed sync batches without stack traces", async () => {
    const app = createApiApp();
    const response = await postSync(app, { batchId: "", commands: [] });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(400);
    expect(JSON.stringify(body)).toContain("invalid_sync_batch");
    expect(JSON.stringify(body)).not.toMatch(/stack|trace|at /i);
  });

  it("returns retry results for simulated retryable failures", async () => {
    const command = createSyncCommand({ idempotencyKey: "retry-key-ficticia" });
    const app = createApiApp({
      syncCommandService: createInMemorySyncCommandService({
        retryIdempotencyKeys: ["retry-key-ficticia"],
      }),
    });
    const response = await postSync(app, createBatch(command));
    const body = (await response.json()) as { results: unknown[] };

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      status: "retry",
      commandId: command.id,
      idempotencyKey: "retry-key-ficticia",
      retryAfterSeconds: 60,
    });
  });

  it("returns conflict detail with local action and remote change context", async () => {
    const command = createSyncCommand({ idempotencyKey: "conflict-key-ficticia" });
    const app = createApiApp({
      syncCommandService: createInMemorySyncCommandService({
        now: () => NOW,
        conflictIdempotencyKeys: ["conflict-key-ficticia"],
        remoteChangeSummary: "Outro aparelho moveu o lote para estoque.",
      }),
    });
    const response = await postSync(app, createBatch(command));
    const body = (await response.json()) as { results: Array<{ conflict?: unknown }> };

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      status: "conflict",
      commandId: command.id,
      conflict: {
        localAction: {
          commandId: command.id,
          kind: "resolve_task",
          actorLabel: "Ana FICTICIA",
          occurredAt: "2030-01-10T12:10:00.000Z",
          productDisplayName: "Ovos FICTICIOS",
          lotIdentity: {
            value: "LOTE-OVOS-SYNC-FICTICIO",
          },
          currentLocation: { kind: "area_de_venda" },
        },
        remoteChange: {
          kind: "task_changed",
          summary: "Outro aparelho moveu o lote para estoque.",
          changedAt: NOW,
        },
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/R2|uri|base64|objectKey|photoUri|imageBytes/i);
  });

  it("rejects raw evidence transport fields at the API boundary", async () => {
    const command = createSyncCommand();
    const response = await postSync(createApiApp(), {
      ...createBatch(command),
      commands: [
        {
          ...command,
          payload: {
            kind: "resolve_task",
            payload: {
              ...command.payload.payload,
              evidence: {
                kind: "photo_recorded_placeholder",
                uri: "file:///private/foto-ficticia.jpg",
              },
            },
          },
        },
      ],
    });

    expect(response.status).toBe(400);
  });

  it("keeps existing health and probe behavior available", async () => {
    const app = createApiApp();
    const health = await app.request("/health");
    const probe = await app.request("/probe", {
      method: "POST",
      body: JSON.stringify({ value: "probe-sync-ficticio" }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toMatchObject({ service: "validade-zero-api" });
    expect(probe.status).toBe(200);
    await expect(probe.json()).resolves.toMatchObject({ value: "probe-sync-ficticio" });
  });
});
