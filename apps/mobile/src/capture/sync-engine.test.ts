import { describe, expect, it } from "vitest";
import type {
  CaptureProductInput,
  SyncCommandRecord,
  SyncConflictRecord,
  SyncTransportBatch,
  SyncTransportResult,
} from "@validade-zero/contracts";
import { createMemoryCaptureRepository } from "./memory-repository";
import { createFakeNetworkStateProvider, type NetInfoSnapshot } from "./network-state";
import { createSyncEngine, type SyncTransport } from "./sync-engine";

const currentDate = "2030-01-10";
const currentTimestamp = "2030-01-10T12:00:00.000Z";

function formalProduct(displayName: string) {
  return {
    displayName,
    categoryId: `categoria-ficticia-${displayName.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`,
    categoryRuleProfile: {
      categoryId: `categoria-ficticia-${displayName.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`,
      mode: "formal_validity",
    },
  } satisfies CaptureProductInput;
}

function createHarness(initialNetwork: NetInfoSnapshot = { isConnected: true, isInternetReachable: true }) {
  let idCounter = 0;
  let now = "2030-01-10T12:30:00.000Z";
  let handler: (batch: SyncTransportBatch) => Promise<readonly SyncTransportResult[]> = (batch) =>
    Promise.resolve(
      batch.commands.map((command) => ({
        status: "ack",
        commandId: command.id,
        idempotencyKey: command.idempotencyKey,
        syncedAt: now,
      })),
    );
  const batches: SyncTransportBatch[] = [];
  const repository = createMemoryCaptureRepository({
    clock: () => now,
    createId: () => `identificador-ficticio-engine-${++idCounter}`,
  });
  const network = createFakeNetworkStateProvider(initialNetwork, { now: () => now });
  const transport: SyncTransport = {
    async sendBatch(batch) {
      batches.push(batch);
      return handler(batch);
    },
  };
  const engine = createSyncEngine({
    repository,
    network,
    transport,
    createId: () => `lote-ficticio-sync-${++idCounter}`,
    now: () => now,
    deviceId: "aparelho-ficticio-sync",
  });

  return {
    repository,
    network,
    engine,
    batches,
    setNow(value: string) {
      now = value;
    },
    setTransport(nextHandler: typeof handler) {
      handler = nextHandler;
    },
  };
}

async function createExpiredTask(repository: ReturnType<typeof createMemoryCaptureRepository>) {
  await repository.initialize();
  const product = await repository.createProduct(formalProduct("Ovos FICTICIOS"));

  await repository.saveLot({
    lot: {
      productId: product.id,
      identity: { identitySource: "printed", value: "LOTE-OVOS-SYNC-FICTICIO" },
      mode: "formal_validity",
      expiresAt: "2030-01-09",
      approximateQuantity: 8,
      initialLocation: { kind: "area_de_venda" },
    },
    actorLabel: "Colaboradora FICTICIA",
  });
  const refresh = await repository.refreshTodayTasks({
    currentDate,
    currentTimestamp,
    source: "today_open",
  });
  const task = refresh.tasks[0];

  if (task === undefined) {
    throw new Error("Expected expired lot to create a task.");
  }

  return task;
}

async function saveWithdrawCommand(repository: ReturnType<typeof createMemoryCaptureRepository>) {
  const task = await createExpiredTask(repository);

  return repository.saveOfflineAction({
    kind: "resolve_task",
    payload: {
      taskId: task.id,
      action: "withdraw",
      actorLabel: "Ana FICTICIA",
      occurredAt: "2030-01-10T12:10:00.000Z",
      destination: { kind: "retirada_perda" },
      evidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
    },
  });
}

function conflictFor(command: SyncCommandRecord): SyncConflictRecord {
  return {
    id: "conflito-ficticio-engine-001",
    commandId: command.id,
    severity: command.urgency,
    reason: "A tarefa mudou antes da sincronizacao.",
    localAction: {
      commandId: command.id,
      kind: command.kind,
      label: "Acao local pendente",
      actorLabel: command.payload.payload.actorLabel,
      occurredAt: command.payload.payload.occurredAt,
      productDisplayName: command.productDisplayName,
      lotIdentity: command.lotIdentity,
      currentLocation: command.currentLocation,
    },
    remoteChange: {
      kind: "task_changed",
      summary: "A tarefa atual foi alterada em outro aparelho.",
      changedAt: "2030-01-10T12:20:00.000Z",
    },
    allowedActions: ["keep_local_and_retry", "use_current_task", "discard_offline_action"],
    createdAt: "2030-01-10T12:21:00.000Z",
  };
}

describe("sync engine", () => {
  it("skips automatic sync while offline without submitting queued commands", async () => {
    const harness = createHarness({ isConnected: false, isInternetReachable: false });
    const command = await saveWithdrawCommand(harness.repository);

    await expect(harness.engine.syncPendingCommands()).resolves.toMatchObject({
      state: "skipped_offline",
      selectedCommandIds: [],
      attemptedCommandIds: [],
    });
    expect(harness.batches).toEqual([]);
    await expect(harness.repository.listSyncQueue()).resolves.toMatchObject({
      totalCount: 1,
      commands: [expect.objectContaining({ id: command.id, state: "pending_sync" })],
    });
  });

  it("allows manual retry in degraded network and waits for transport ack", async () => {
    const harness = createHarness({ isConnected: null, isInternetReachable: null });
    const command = await saveWithdrawCommand(harness.repository);

    await expect(harness.engine.syncPendingCommands()).resolves.toMatchObject({
      state: "skipped_degraded",
    });
    await expect(harness.engine.syncPendingCommands({ manual: true })).resolves.toMatchObject({
      state: "sent",
      selectedCommandIds: [command.id],
    });
    await expect(harness.repository.loadTodayTask(command.taskId)).resolves.toMatchObject({
      sync: {
        state: "synced",
        lastSyncedAt: "2030-01-10T12:30:00.000Z",
      },
    });
  });

  it("sends strict online batches and applies ack results", async () => {
    const harness = createHarness();
    const command = await saveWithdrawCommand(harness.repository);

    await expect(harness.engine.syncPendingCommands()).resolves.toMatchObject({
      state: "sent",
      attemptedCommandIds: [command.id],
      appliedResults: [expect.objectContaining({ status: "ack", commandId: command.id })],
    });
    expect(harness.batches[0]).toMatchObject({
      deviceId: "aparelho-ficticio-sync",
      commands: [expect.objectContaining({ id: command.id, idempotencyKey: command.idempotencyKey })],
    });
    await expect(harness.repository.listSyncQueue()).resolves.toMatchObject({ totalCount: 0 });
  });

  it("keeps failed transport visible as sync_failed with retry metadata", async () => {
    const harness = createHarness();
    const command = await saveWithdrawCommand(harness.repository);
    harness.setTransport(() => Promise.reject(new Error("rede indisponivel")));

    await expect(harness.engine.syncPendingCommands()).resolves.toMatchObject({
      state: "transport_failed",
      attemptedCommandIds: [command.id],
      appliedResults: [expect.objectContaining({ status: "retry", commandId: command.id })],
    });
    await expect(harness.repository.listSyncQueue()).resolves.toMatchObject({
      state: "has_failed",
      commands: [expect.objectContaining({ id: command.id, state: "sync_failed" })],
    });
    await expect(harness.repository.loadTodayTask(command.taskId)).resolves.toMatchObject({
      sync: {
        state: "sync_failed",
        pendingCommandId: command.id,
        lastError: "rede indisponivel",
      },
    });
  });

  it("applies conflict results and keeps review details loadable", async () => {
    const harness = createHarness();
    const command = await saveWithdrawCommand(harness.repository);
    harness.setTransport((batch) =>
      Promise.resolve([
        {
          status: "conflict",
          commandId: batch.commands[0]?.id ?? command.id,
          idempotencyKey: batch.commands[0]?.idempotencyKey ?? command.idempotencyKey,
          conflict: conflictFor(batch.commands[0] ?? command),
        },
      ]),
    );

    await expect(harness.engine.syncPendingCommands()).resolves.toMatchObject({
      state: "sent",
      appliedResults: [expect.objectContaining({ status: "conflict", commandId: command.id })],
    });
    await expect(harness.repository.loadTodayTask(command.taskId)).resolves.toMatchObject({
      sync: {
        state: "sync_conflict",
        conflictId: "conflito-ficticio-engine-001",
      },
    });
    await expect(
      harness.repository.loadSyncConflict("conflito-ficticio-engine-001"),
    ).resolves.toMatchObject({
      localAction: expect.objectContaining({
        productDisplayName: command.productDisplayName,
        occurredAt: "2030-01-10T12:10:00.000Z",
      }),
      remoteChange: expect.objectContaining({ kind: "task_changed" }),
    });
  });

  it("retries a failed command with the same idempotency key and payload", async () => {
    const harness = createHarness();
    const command = await saveWithdrawCommand(harness.repository);
    let shouldFail = true;
    harness.setTransport((batch) => {
      if (shouldFail) {
        shouldFail = false;
        return Promise.reject(new Error("timeout"));
      }

      return Promise.resolve(
        batch.commands.map((candidate) => ({
          status: "ack",
          commandId: candidate.id,
          idempotencyKey: candidate.idempotencyKey,
          syncedAt: "2030-01-10T12:35:00.000Z",
        })),
      );
    });

    await harness.engine.syncPendingCommands();
    harness.setNow("2030-01-10T12:35:00.000Z");
    await harness.engine.syncPendingCommands();

    expect(harness.batches).toHaveLength(2);
    expect(harness.batches[1]?.commands[0]).toMatchObject({
      id: command.id,
      idempotencyKey: harness.batches[0]?.commands[0]?.idempotencyKey,
      payload: harness.batches[0]?.commands[0]?.payload,
      attemptCount: 2,
    });
  });

  it("does not submit commands already marked syncing", async () => {
    const harness = createHarness();
    const command = await saveWithdrawCommand(harness.repository);

    await harness.repository.markSyncCommandAttempt([command.id], "2030-01-10T12:31:00.000Z");

    await expect(harness.engine.syncPendingCommands()).resolves.toMatchObject({
      state: "empty",
      selectedCommandIds: [],
    });
    expect(harness.batches).toEqual([]);
  });

  it("submits the oldest critical command before lower urgency work", async () => {
    const harness = createHarness();
    await harness.repository.initialize();
    const markdownProduct = await harness.repository.createProduct(formalProduct("Queijo FICTICIO"));
    const lot = await harness.repository.saveLot({
      lot: {
        productId: markdownProduct.id,
        identity: { identitySource: "printed", value: "LOTE-QUEIJO-SYNC-FICTICIO" },
        mode: "formal_validity",
        expiresAt: "2030-01-20",
        approximateQuantity: 10,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora FICTICIA",
    });
    const refresh = await harness.repository.refreshTodayTasks({
      currentDate,
      currentTimestamp,
      source: "manual_refresh",
    });
    const markdownTask = refresh.tasks.find((task) => task.lotId === lot.id);

    if (markdownTask === undefined) {
      throw new Error("Expected markdown task.");
    }

    const medium = await harness.repository.saveOfflineAction({
      kind: "request_markdown",
      payload: {
        lotId: lot.id,
        sourceTaskId: markdownTask.id,
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:05:00.000Z",
        reason: "rule_window",
      },
    });
    const critical = await saveWithdrawCommand(harness.repository);

    await harness.engine.syncPendingCommands();

    expect(medium.urgency).toBe("medium");
    expect(critical.urgency).toBe("critical");
    expect(harness.batches[0]?.commands.map((command) => command.id)).toEqual([
      critical.id,
      medium.id,
    ]);
  });
});
