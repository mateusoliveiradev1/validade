import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CaptureProductInput } from "@validade-zero/contracts";
import { createMemoryCaptureRepository } from "./memory-repository";

const currentDate = "2030-01-10";

function createRepository(clock = () => "2030-01-10T09:00:00.000Z") {
  let idCounter = 0;

  return createMemoryCaptureRepository({
    clock,
    createId: () => `identificador-ficticio-alerta-${++idCounter}`,
  });
}

function formalProduct(displayName: string, maxPhysicalConfirmationAgeHours?: number) {
  return {
    displayName,
    categoryId: `categoria-ficticia-${displayName.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`,
    categoryRuleProfile: {
      categoryId: `categoria-ficticia-${displayName.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`,
      mode: "formal_validity",
      ...(maxPhysicalConfirmationAgeHours === undefined ? {} : { maxPhysicalConfirmationAgeHours }),
    },
  } satisfies CaptureProductInput;
}

async function saveFormalLot(input: {
  repository: ReturnType<typeof createRepository>;
  displayName: string;
  lotCode: string;
  expiresAt: string;
  location?: { kind: "area_de_venda" | "estoque" };
  maxPhysicalConfirmationAgeHours?: number;
}) {
  const product = await input.repository.createProduct(
    formalProduct(input.displayName, input.maxPhysicalConfirmationAgeHours),
  );

  return input.repository.saveLot({
    lot: {
      productId: product.id,
      identity: {
        identitySource: "printed",
        value: input.lotCode,
      },
      mode: "formal_validity",
      expiresAt: input.expiresAt,
      approximateQuantity: 8,
      initialLocation: input.location ?? { kind: "area_de_venda" },
    },
    actorLabel: "Colaboradora FICTICIA",
  });
}

async function registerShiftDevice(repository: ReturnType<typeof createRepository>) {
  return repository.registerAlertDevice({
    deviceId: "aparelho-ficticio-alertas",
    deviceLabel: "Celular do turno FICTICIO",
    audienceRole: "shift_team",
    permissionStatus: "granted",
    expoPushToken: "ExpoPushToken-FICTICIO-ALERTAS",
    registeredAt: "2030-01-10T08:55:00.000Z",
  });
}

async function createExpiredTask(repository: ReturnType<typeof createRepository>) {
  await saveFormalLot({
    repository,
    displayName: "Ovos FICTICIOS",
    lotCode: "LOTE-OVOS-VENCIDO-FICTICIO",
    expiresAt: "2030-01-09",
  });

  const refresh = await repository.refreshTodayTasks({
    currentDate,
    currentTimestamp: "2030-01-10T09:00:00.000Z",
    source: "today_open",
  });
  const task = refresh.tasks[0];

  if (task === undefined) {
    throw new Error("Expected expired fixture to create a Today task.");
  }

  return task;
}

describe("task alert state repository", () => {
  it("creates cadence state idempotently without replacing Hoje as source of truth", async () => {
    const repository = createRepository();
    await repository.initialize();
    await registerShiftDevice(repository);
    const task = await createExpiredTask(repository);

    const firstRefresh = await repository.refreshTaskAlertStates({
      referenceTime: "2030-01-10T09:00:00.000Z",
      isWithinShift: true,
    });
    const secondRefresh = await repository.refreshTaskAlertStates({
      referenceTime: "2030-01-10T09:05:00.000Z",
      isWithinShift: true,
    });

    expect(firstRefresh).toEqual([
      expect.objectContaining({
        taskId: task.id,
        taskActiveKey: task.activeKey,
        channelState: "active",
        attemptState: "pending",
        nextReminderAt: "2030-01-10T09:15:00.000Z",
      }),
    ]);
    expect(secondRefresh).toHaveLength(1);
    await expect(repository.listActiveTodayTasks()).resolves.toEqual([
      expect.objectContaining({
        id: task.id,
        status: "active",
      }),
    ]);
  });

  it("creates an alert state for lots expiring today", async () => {
    const repository = createRepository();
    await repository.initialize();
    await registerShiftDevice(repository);
    await saveFormalLot({
      repository,
      displayName: "Melancia FICTICIA",
      lotCode: "LOTE-MELANCIA-HOJE-FICTICIO",
      expiresAt: currentDate,
    });

    const refresh = await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp: "2030-01-10T09:00:00.000Z",
      source: "today_open",
    });
    const task = refresh.tasks[0];

    expect(task).toMatchObject({
      riskState: "expired",
      dueBucket: "now",
      requiredResolution: "withdraw_or_loss",
      status: "active",
    });

    if (task === undefined) {
      throw new Error("Expected expiring-today lot to create a Today task.");
    }

    await expect(
      repository.refreshTaskAlertStates({
        referenceTime: "2030-01-10T09:00:00.000Z",
        isWithinShift: true,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        taskId: task.id,
        taskActiveKey: task.activeKey,
        attemptState: "pending",
        nextReminderAt: "2030-01-10T09:15:00.000Z",
      }),
    ]);
  });

  it("persists off-shift suppression without removing ordinary active tasks", async () => {
    const repository = createRepository();
    await repository.initialize();
    await saveFormalLot({
      repository,
      displayName: "Queijo FICTICIO",
      lotCode: "LOTE-QUEIJO-REBAIXA-FICTICIO",
      expiresAt: "2030-01-20",
      location: { kind: "estoque" },
    });
    const refresh = await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp: "2030-01-10T09:00:00.000Z",
      source: "today_open",
    });

    expect(refresh.tasks[0]).toMatchObject({
      requiredResolution: "request_markdown",
      status: "active",
    });

    await expect(
      repository.refreshTaskAlertStates({
        referenceTime: "2030-01-10T09:00:00.000Z",
        isWithinShift: false,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        attemptState: "suppressed_out_of_shift",
      }),
    ]);
    await expect(repository.listActiveTodayTasks()).resolves.toHaveLength(1);
  });

  it("records retry and sent attempts without resolving tasks", async () => {
    const repository = createRepository();
    await repository.initialize();
    const task = await createExpiredTask(repository);
    await repository.refreshTaskAlertStates({
      referenceTime: "2030-01-10T09:00:00.000Z",
      isWithinShift: true,
    });

    await expect(
      repository.recordAlertAttempt({
        attemptId: "tentativa-ficticia-001",
        taskId: task.id,
        taskActiveKey: task.activeKey,
        attemptedAt: "2030-01-10T09:00:00.000Z",
        result: {
          status: "retryable_error",
          failureReason: "Provider temporariamente indisponivel",
          retryAfterSeconds: 60,
        },
      }),
    ).resolves.toMatchObject({
      attemptState: "retry_pending",
      retryCount: 1,
      failureReason: "Provider temporariamente indisponivel",
    });

    await expect(
      repository.recordAlertAttempt({
        attemptId: "tentativa-ficticia-002",
        taskId: task.id,
        taskActiveKey: task.activeKey,
        attemptedAt: "2030-01-10T09:01:00.000Z",
        result: {
          status: "ok",
          providerTicketId: "ticket-ficticio-001",
        },
      }),
    ).resolves.toMatchObject({
      attemptState: "sent",
      lastReminderAt: "2030-01-10T09:01:00.000Z",
    });
    await expect(repository.loadTodayTask(task.id)).resolves.toMatchObject({ status: "active" });
  });

  it("records leadership acknowledgement as alert state while task remains active", async () => {
    const repository = createRepository();
    await repository.initialize();
    const task = await createExpiredTask(repository);

    await repository.refreshTaskAlertStates({
      referenceTime: "2030-01-10T09:30:00.000Z",
      isWithinShift: true,
    });

    await expect(
      repository.acknowledgeEscalation({
        taskId: task.id,
        taskActiveKey: task.activeKey,
        actorLabel: "Lider FICTICIO",
        acknowledgedAt: "2030-01-10T09:35:00.000Z",
      }),
    ).resolves.toMatchObject({
      escalationState: "leadership_acknowledged",
      leadershipAcknowledgedAt: "2030-01-10T09:35:00.000Z",
    });
    await expect(repository.loadTodayTask(task.id)).resolves.toMatchObject({ status: "active" });
  });

  it("acknowledges delayed markdown approval without resolving the task or workflow", async () => {
    const repository = createRepository();
    await repository.initialize();
    await saveFormalLot({
      repository,
      displayName: "Queijo Rebaixa FICTICIO",
      lotCode: "LOTE-QUEIJO-REBAIXA-FICTICIO",
      expiresAt: "2030-01-20",
      location: { kind: "area_de_venda" },
    });
    const refresh = await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp: "2030-01-10T09:00:00.000Z",
      source: "today_open",
    });
    const requestTask = refresh.tasks[0];

    if (requestTask === undefined) {
      throw new Error("Expected markdown request task.");
    }

    const workflow = await repository.requestMarkdown({
      lotId: requestTask.lotId,
      sourceTaskId: requestTask.id,
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: "2030-01-10T09:05:00.000Z",
      reason: "rule_window",
    });
    const approvalTask = (await repository.listActiveTodayTasks()).find(
      (task) => task.markdownWorkflowId === workflow.id,
    );

    if (approvalTask === undefined) {
      throw new Error("Expected markdown approval task.");
    }

    await repository.refreshTaskAlertStates({
      referenceTime: "2030-01-10T11:05:00.000Z",
      isWithinShift: true,
    });

    await expect(
      repository.acknowledgeEscalation({
        taskId: approvalTask.id,
        taskActiveKey: approvalTask.activeKey,
        actorLabel: "Lider FICTICIO",
        acknowledgedAt: "2030-01-10T11:10:00.000Z",
      }),
    ).resolves.toMatchObject({
      escalationState: "leadership_acknowledged",
      leadershipAcknowledgedAt: "2030-01-10T11:10:00.000Z",
    });
    await expect(repository.loadTodayTask(approvalTask.id)).resolves.toMatchObject({
      status: "active",
      requiredResolution: "approve_markdown",
    });
    await expect(repository.loadMarkdownWorkflowForLot(requestTask.lotId)).resolves.toMatchObject({
      id: workflow.id,
      status: "requested",
      currentStage: "requested",
    });
  });

  it("starts sales-area recheck alert cadence immediately", async () => {
    const repository = createRepository();
    await repository.initialize();
    const task = await createExpiredTask(repository);

    await repository.resolveTodayTask({
      taskId: task.id,
      action: "withdraw",
      actorLabel: "Ana FICTICIA",
      occurredAt: "2030-01-10T09:05:00.000Z",
      destination: { kind: "retirada_perda" },
    });
    const recheck = (await repository.listActiveTodayTasks())[0];

    expect(recheck).toBeDefined();

    if (recheck === undefined) {
      throw new Error("Expected recheck task after withdrawal.");
    }

    const states = await repository.refreshTaskAlertStates({
      referenceTime: "2030-01-10T09:05:00.000Z",
      isWithinShift: true,
    });

    expect(states).toContainEqual(
      expect.objectContaining({
        taskId: recheck.id,
        taskActiveKey: recheck.activeKey,
        attemptState: "pending",
        nextReminderAt: "2030-01-10T09:20:00.000Z",
      }),
    );
  });

  it("resolves push-open intents as current, updated, resolved, or missing", async () => {
    const repository = createRepository();
    await repository.initialize();
    const task = await createExpiredTask(repository);

    await expect(
      repository.resolvePushOpenIntent({
        taskId: task.id,
        taskActiveKey: task.activeKey,
        openedAt: "2030-01-10T09:01:00.000Z",
      }),
    ).resolves.toMatchObject({ result: "current_task" });

    await repository.resolveTodayTask({
      taskId: task.id,
      action: "withdraw",
      actorLabel: "Ana FICTICIA",
      occurredAt: "2030-01-10T09:05:00.000Z",
      destination: { kind: "retirada_perda" },
    });

    await expect(
      repository.resolvePushOpenIntent({
        taskId: task.id,
        taskActiveKey: task.activeKey,
        openedAt: "2030-01-10T09:06:00.000Z",
      }),
    ).resolves.toMatchObject({ result: "task_updated" });

    const recheck = (await repository.listActiveTodayTasks())[0];

    if (recheck === undefined) {
      throw new Error("Expected recheck task after withdrawal.");
    }

    await repository.resolveTodayTask({
      taskId: recheck.id,
      action: "complete_recheck",
      actorLabel: "Ana FICTICIA",
      occurredAt: "2030-01-10T09:10:00.000Z",
      evidence: { kind: "photo_recorded_placeholder" },
    });

    await expect(
      repository.resolvePushOpenIntent({
        taskId: task.id,
        taskActiveKey: task.activeKey,
        openedAt: "2030-01-10T09:11:00.000Z",
      }),
    ).resolves.toMatchObject({ result: "task_resolved" });
    await expect(
      repository.resolvePushOpenIntent({
        taskId: "tarefa-inexistente-ficticia",
        taskActiveKey: "active-key-inexistente",
        openedAt: "2030-01-10T09:12:00.000Z",
      }),
    ).resolves.toMatchObject({ result: "task_missing" });
  });

  it("keeps SQLite alert tables local, indexed, and free of real-token/evidence upload scope", () => {
    const sqlitePath = fileURLToPath(new URL("./sqlite-repository.ts", import.meta.url));
    const source = readFileSync(sqlitePath, "utf8");

    expect(source).toContain("CREATE TABLE IF NOT EXISTS device_alert_channels");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS task_alert_states");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS alert_attempts");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS escalation_receipts");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS task_alert_states_task_id_active_key_idx");
    expect(source).toContain(
      "CREATE INDEX IF NOT EXISTS task_alert_states_attempt_state_next_reminder_idx",
    );
    expect(source).toContain("CREATE INDEX IF NOT EXISTS alert_attempts_task_created_at_idx");
    expect(source).not.toContain("ExponentPushToken[");
    expect(source).not.toContain("R2");
    expect(source).not.toContain("object_key");
  });
});
