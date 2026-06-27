import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CaptureProductInput, SyncConflictRecord } from "@validade-zero/contracts";
import { createMemoryCaptureRepository } from "./memory-repository";
import { ensureTodayTaskSyncColumns } from "./sqlite-migrations";

const currentDate = "2030-01-10";
const currentTimestamp = "2030-01-10T12:00:00.000Z";

function createRepository(initialClock = "2030-01-10T09:00:00.000Z") {
  let idCounter = 0;
  let now = initialClock;
  const repository = createMemoryCaptureRepository({
    clock: () => now,
    createId: () => `identificador-ficticio-sync-${++idCounter}`,
  });

  return {
    repository,
    setClock: (value: string) => {
      now = value;
    },
  };
}

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

async function createExpiredTask() {
  const harness = createRepository();
  const { repository } = harness;
  await repository.initialize();
  const product = await repository.createProduct(formalProduct("Ovos FICTICIOS"));

  await repository.saveLot({
    lot: {
      productId: product.id,
      identity: { identitySource: "printed", value: "LOTE-OVOS-VENCIDO-FICTICIO" },
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

  return { ...harness, task };
}

describe("offline sync repository behavior", () => {
  it("refreshes offline cache metadata and marks it stale after the threshold", async () => {
    const harness = createRepository();
    const { repository } = harness;
    await repository.initialize();

    await expect(repository.loadOfflineCacheStatus()).resolves.toMatchObject({
      state: "offline_unavailable",
      activeTaskCount: 0,
    });

    const product = await repository.createProduct(formalProduct("Iogurte FICTICIO"));
    await repository.saveLot({
      lot: {
        productId: product.id,
        identity: { identitySource: "printed", value: "LOTE-IOGURTE-CRITICO-FICTICIO" },
        mode: "formal_validity",
        expiresAt: "2030-01-11",
        approximateQuantity: 6,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora FICTICIA",
    });
    await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp,
      source: "manual_refresh",
    });

    await expect(repository.loadOfflineCacheStatus()).resolves.toMatchObject({
      state: "offline_ready",
      activeTaskCount: 1,
      requiredLotSnippetCount: 1,
      source: "manual_refresh",
    });

    harness.setClock("2030-01-10T14:01:00.000Z");

    await expect(repository.loadOfflineCacheStatus()).resolves.toMatchObject({
      state: "offline_stale",
    });
  });

  it("saves critical offline task actions before keeping the pending task visible", async () => {
    const { repository, task } = await createExpiredTask();
    const command = await repository.saveOfflineAction({
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

    expect(command).toMatchObject({
      kind: "resolve_task",
      state: "pending_sync",
      urgency: "critical",
      taskId: task.id,
    });
    await expect(repository.loadTodayTask(task.id)).resolves.toMatchObject({
      status: "active",
      sync: {
        state: "pending_sync",
        pendingCommandId: command.id,
      },
    });
  });

  it("creates a local audit timeline event and reconciles it without duplication", async () => {
    const { repository, task } = await createExpiredTask();
    const listAuditTimeline = repository.listAuditTimeline;

    if (listAuditTimeline === undefined) {
      throw new Error("Expected memory repository to expose audit timeline.");
    }

    const command = await repository.saveOfflineAction({
      kind: "resolve_task",
      payload: {
        taskId: task.id,
        action: "withdraw",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:10:00.000Z",
        destination: { kind: "retirada_perda" },
      },
    });

    await expect(
      listAuditTimeline({ targetType: "task", targetId: task.id }),
    ).resolves.toMatchObject([
      {
        status: "pending_ack",
        summary: "Retirada salva neste aparelho.",
        target: { id: task.id },
      },
    ]);

    await repository.saveOfflineAction({
      kind: "resolve_task",
      payload: {
        taskId: task.id,
        action: "withdraw",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:10:00.000Z",
        destination: { kind: "retirada_perda" },
      },
    });

    await expect(
      listAuditTimeline({ targetType: "task", targetId: task.id }),
    ).resolves.toHaveLength(1);

    await repository.applySyncTransportResult({
      status: "ack",
      commandId: command.id,
      idempotencyKey: command.idempotencyKey,
      syncedAt: "2030-01-10T12:12:00.000Z",
    });

    await expect(
      listAuditTimeline({ targetType: "task", targetId: task.id }),
    ).resolves.toMatchObject([
      {
        status: "received",
        receivedAt: "2030-01-10T12:12:00.000Z",
      },
    ]);
  });

  it("separates transport ack from central business resolution", async () => {
    const { repository, task } = await createExpiredTask();
    const command = await repository.saveOfflineAction({
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

    await repository.applySyncTransportResult({
      status: "ack",
      commandId: command.id,
      idempotencyKey: command.idempotencyKey,
      syncedAt: "2030-01-10T12:12:00.000Z",
    });

    await expect(repository.loadTodayTask(task.id)).resolves.toMatchObject({
      status: "active",
      sync: {
        state: "synced",
      },
    });

    await repository.applySyncTransportResult({
      status: "ack",
      commandId: command.id,
      idempotencyKey: command.idempotencyKey,
      syncedAt: "2030-01-10T12:13:00.000Z",
      centralResult: {
        kind: "resolved_history",
        history: {
          centralTaskId: task.id,
          activeKey: task.activeKey,
          lotId: task.lotId,
          productDisplayName: task.productDisplayName,
          lotIdentity: task.lotIdentity,
          currentLocation: { kind: "retirada_perda" },
          action: "withdraw",
          actorLabel: "Ana FICTICIA",
          occurredAt: "2030-01-10T12:10:00.000Z",
          evidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
          resolutionState: "resolved",
          source: "central",
          updatedAt: "2030-01-10T12:13:00.000Z",
        },
      },
    });

    await expect(repository.loadTodayTask(task.id)).resolves.toMatchObject({
      status: "resolved",
      resolvedAt: "2030-01-10T12:10:00.000Z",
      currentLocation: { kind: "retirada_perda" },
      resolutionHistory: [
        expect.objectContaining({
          action: "withdraw",
          actorLabel: "Ana FICTICIA",
        }),
      ],
      sync: {
        state: "synced",
        lastSyncedAt: "2030-01-10T12:13:00.000Z",
      },
    });
    await expect(repository.listActiveTodayTasks()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: task.id })]),
    );
  });

  it("supports all offline action kinds without duplicating commands on retry", async () => {
    const { repository, task } = await createExpiredTask();
    const resolveCommand = await repository.saveOfflineAction({
      kind: "resolve_task",
      payload: {
        taskId: task.id,
        action: "withdraw",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:10:00.000Z",
        destination: { kind: "retirada_perda" },
      },
    });
    const retry = await repository.markSyncCommandAttempt(
      [resolveCommand.id],
      "2030-01-10T12:11:00.000Z",
    );
    const secondRetry = await repository.markSyncCommandAttempt(
      [resolveCommand.id],
      "2030-01-10T12:12:00.000Z",
    );

    expect(retry[0]).toMatchObject({ id: resolveCommand.id, attemptCount: 1 });
    expect(secondRetry[0]).toMatchObject({ id: resolveCommand.id, attemptCount: 2 });

    const markdownProduct = await repository.createProduct(formalProduct("Queijo FICTICIO"));
    const lot = await repository.saveLot({
      lot: {
        productId: markdownProduct.id,
        identity: { identitySource: "printed", value: "LOTE-QUEIJO-REBAIXA-FICTICIO" },
        mode: "formal_validity",
        expiresAt: "2030-01-20",
        approximateQuantity: 10,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora FICTICIA",
    });
    const refresh = await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp,
      source: "manual_refresh",
    });
    const requestTask = refresh.tasks.find((candidate) => candidate.lotId === lot.id);

    if (requestTask === undefined) {
      throw new Error("Expected markdown request task.");
    }

    await expect(
      repository.saveOfflineAction({
        kind: "request_markdown",
        payload: {
          lotId: lot.id,
          sourceTaskId: requestTask.id,
          actorLabel: "Ana FICTICIA",
          occurredAt: "2030-01-10T12:15:00.000Z",
          reason: "rule_window",
        },
      }),
    ).resolves.toMatchObject({ kind: "request_markdown" });

    const workflow = await repository.requestMarkdown({
      lotId: lot.id,
      sourceTaskId: requestTask.id,
      actorLabel: "Ana FICTICIA",
      occurredAt: "2030-01-10T12:20:00.000Z",
      reason: "rule_window",
    });
    const approvalTask = (await repository.listActiveTodayTasks()).find(
      (candidate) => candidate.markdownWorkflowId === workflow.id,
    );

    if (approvalTask === undefined) {
      throw new Error("Expected approval task.");
    }

    await expect(
      repository.saveOfflineAction({
        kind: "decide_markdown",
        payload: {
          workflowId: workflow.id,
          taskId: approvalTask.id,
          actorLabel: "Lideranca FICTICIA",
          occurredAt: "2030-01-10T12:25:00.000Z",
          decision: "approved",
        },
      }),
    ).resolves.toMatchObject({ kind: "decide_markdown" });

    await repository.decideMarkdown({
      workflowId: workflow.id,
      taskId: approvalTask.id,
      actorLabel: "Lideranca FICTICIA",
      occurredAt: "2030-01-10T12:30:00.000Z",
      decision: "approved",
    });
    const applicationTask = (await repository.listActiveTodayTasks()).find(
      (candidate) => candidate.markdownWorkflowId === workflow.id,
    );

    if (applicationTask === undefined) {
      throw new Error("Expected application task.");
    }

    await expect(
      repository.saveOfflineAction({
        kind: "record_markdown_application",
        payload: {
          workflowId: workflow.id,
          taskId: applicationTask.id,
          actorLabel: "Equipe do turno",
          occurredAt: "2030-01-10T12:35:00.000Z",
          evidence: { kind: "photo_recorded_placeholder" },
        },
      }),
    ).resolves.toMatchObject({ kind: "record_markdown_application" });

    await repository.recordMarkdownApplication({
      workflowId: workflow.id,
      taskId: applicationTask.id,
      actorLabel: "Equipe do turno",
      occurredAt: "2030-01-10T12:40:00.000Z",
      evidence: { kind: "photo_recorded_placeholder" },
    });
    const shelfTask = (await repository.listActiveTodayTasks()).find(
      (candidate) => candidate.markdownWorkflowId === workflow.id,
    );

    if (shelfTask === undefined) {
      throw new Error("Expected shelf confirmation task.");
    }

    await expect(
      repository.saveOfflineAction({
        kind: "confirm_markdown_on_shelf",
        payload: {
          workflowId: workflow.id,
          taskId: shelfTask.id,
          actorLabel: "Equipe do turno",
          occurredAt: "2030-01-10T12:45:00.000Z",
          evidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
        },
      }),
    ).resolves.toMatchObject({ kind: "confirm_markdown_on_shelf" });
  });

  it("summarizes conflicts and pending commands by urgency", async () => {
    const { repository, task } = await createExpiredTask();
    const command = await repository.saveOfflineAction({
      kind: "resolve_task",
      payload: {
        taskId: task.id,
        action: "withdraw",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:10:00.000Z",
        destination: { kind: "retirada_perda" },
      },
    });
    const conflict: SyncConflictRecord = {
      id: "conflito-ficticio-sync-001",
      commandId: command.id,
      severity: "critical",
      reason: "A tarefa mudou em outro aparelho.",
      localAction: {
        commandId: command.id,
        kind: command.kind,
        label: "Retirar agora",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:10:00.000Z",
        productDisplayName: command.productDisplayName,
        lotIdentity: command.lotIdentity,
        currentLocation: command.currentLocation,
      },
      remoteChange: {
        kind: "lot_moved",
        summary: "O lote foi movido em outro aparelho.",
        changedAt: "2030-01-10T12:11:00.000Z",
      },
      allowedActions: ["keep_local_and_retry", "use_current_task", "discard_offline_action"],
      createdAt: "2030-01-10T12:11:00.000Z",
    };

    await repository.applySyncTransportResult({
      status: "conflict",
      commandId: command.id,
      idempotencyKey: command.idempotencyKey,
      conflict,
    });

    await expect(repository.listSyncQueue()).resolves.toMatchObject({
      state: "has_conflict",
      totalCount: 1,
      conflictCount: 1,
      hasCriticalConflict: true,
      criticalCount: 1,
      oldestPendingCritical: expect.objectContaining({
        id: command.id,
        state: "sync_conflict",
      }),
    });
    await expect(repository.loadSyncConflict(conflict.id)).resolves.toMatchObject({
      id: conflict.id,
      localAction: expect.objectContaining({ productDisplayName: command.productDisplayName }),
    });
  });

  it("keeps the SQLite offline outbox transactional and metadata-only", () => {
    const sqlitePath = fileURLToPath(new URL("./sqlite-repository.ts", import.meta.url));
    const source = readFileSync(sqlitePath, "utf8");

    expect(source).toContain("CREATE TABLE IF NOT EXISTS offline_cache_status");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS sync_commands");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS sync_conflicts");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS local_audit_events");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS sync_commands_state_urgency_created_idx");
    expect(source).toContain("CREATE UNIQUE INDEX IF NOT EXISTS sync_commands_idempotency_key_idx");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS sync_conflicts_command_idx");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS local_audit_events_target_occurred_idx");
    expect(source).toContain("upsertLocalAuditEvent");
    expect(source).toContain("sync_json");
    expect(source).toContain("withTransactionAsync");
    expect(source).not.toContain("R2");
    expect(source).not.toContain("object_key");
    expect(source).not.toContain("base64");
    expect(source).not.toContain("photoUri");
    expect(source).not.toContain("imageBytes");
  });

  it("adds the Today task sync marker idempotently for existing SQLite stores", async () => {
    const existingColumns = new Set(["id", "active_key"]);
    const statements: string[] = [];
    const db = {
      getAllAsync: () => Promise.resolve([...existingColumns].map((name) => ({ name }))),
      execAsync: (source: string) => {
        statements.push(source);

        if (source.includes("sync_json")) {
          existingColumns.add("sync_json");
        }

        return Promise.resolve();
      },
    };

    await ensureTodayTaskSyncColumns(db);
    await ensureTodayTaskSyncColumns(db);

    expect(statements).toEqual(["ALTER TABLE today_tasks ADD COLUMN sync_json TEXT;"]);
  });
});
