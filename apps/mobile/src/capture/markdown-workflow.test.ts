import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CaptureProductInput } from "@validade-zero/contracts";
import { createMemoryCaptureRepository } from "./memory-repository";
import { ensureTodayTaskMarkdownColumns } from "./sqlite-migrations";

const currentDate = "2030-01-10";
const currentTimestamp = "2030-01-10T12:00:00.000Z";

function createRepository(clock = () => "2030-01-10T09:00:00.000Z") {
  let idCounter = 0;

  return createMemoryCaptureRepository({
    clock,
    createId: () => `identificador-ficticio-markdown-${++idCounter}`,
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
      approximateQuantity: 12,
      initialLocation: { kind: "area_de_venda" },
    },
    actorLabel: "Colaboradora FICTICIA",
  });
}

async function createMarkdownDueLot() {
  const repository = createRepository();
  await repository.initialize();
  const lot = await saveFormalLot({
    repository,
    displayName: "Queijo FICTICIO",
    lotCode: "LOTE-QUEIJO-REBAIXA-FICTICIO",
    expiresAt: "2030-01-20",
  });
  const refresh = await repository.refreshTodayTasks({
    currentDate,
    currentTimestamp,
    source: "today_open",
  });
  const sourceTask = refresh.tasks.find((task) => task.requiredResolution === "request_markdown");

  if (sourceTask === undefined) {
    throw new Error("Expected markdown_due lot to create a request task.");
  }

  return { repository, lot, sourceTask };
}

describe("markdown workflow repository", () => {
  it("creates a rule-window workflow and one active approval task", async () => {
    const { repository, lot, sourceTask } = await createMarkdownDueLot();
    const workflow = await repository.requestMarkdown({
      lotId: lot.id,
      sourceTaskId: sourceTask.id,
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: currentTimestamp,
      reason: "rule_window",
    });

    await expect(repository.loadTodayTask(sourceTask.id)).resolves.toMatchObject({
      status: "resolved",
      resolutionHistory: [expect.objectContaining({ action: "request_markdown" })],
    });
    await expect(repository.listActiveTodayTasks()).resolves.toEqual([
      expect.objectContaining({
        requiredResolution: "approve_markdown",
        ownerLabel: "Lideranca local",
        markdownWorkflowId: workflow.id,
        markdownStage: "requested",
      }),
    ]);
    await expect(repository.listActiveMarkdownWorkflows()).resolves.toEqual([
      expect.objectContaining({ id: workflow.id, status: "requested" }),
    ]);
  });

  it("requires early exception justification and prevents duplicate active workflows", async () => {
    const repository = createRepository();
    await repository.initialize();
    const lot = await saveFormalLot({
      repository,
      displayName: "Maca FICTICIA",
      lotCode: "LOTE-MACA-ANTECIPADA-FICTICIO",
      expiresAt: "2030-04-01",
    });

    await expect(
      repository.requestMarkdown({
        lotId: lot.id,
        actorLabel: "Colaboradora FICTICIA",
        occurredAt: currentTimestamp,
        reason: "excess_stock",
      }),
    ).rejects.toThrow();

    await repository.requestMarkdown({
      lotId: lot.id,
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: currentTimestamp,
      reason: "excess_stock",
      earlyJustification: "Excesso visivel na area de venda",
    });

    await expect(
      repository.requestMarkdown({
        lotId: lot.id,
        actorLabel: "Colaboradora FICTICIA",
        occurredAt: "2030-01-10T12:05:00.000Z",
        reason: "quality_issue",
        earlyJustification: "Qualidade ruim",
      }),
    ).rejects.toThrow("active markdown workflow");
  });

  it("advances approval to application and rejection to a terminal workflow", async () => {
    const { repository, lot, sourceTask } = await createMarkdownDueLot();
    const workflow = await repository.requestMarkdown({
      lotId: lot.id,
      sourceTaskId: sourceTask.id,
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: currentTimestamp,
      reason: "rule_window",
    });
    const approvalTask = (await repository.listActiveTodayTasks())[0];

    if (approvalTask === undefined) {
      throw new Error("Expected approval task.");
    }

    await repository.decideMarkdown({
      workflowId: workflow.id,
      taskId: approvalTask.id,
      actorLabel: "Lideranca FICTICIA",
      occurredAt: "2030-01-10T12:10:00.000Z",
      decision: "approved",
    });

    await expect(repository.listActiveTodayTasks()).resolves.toEqual([
      expect.objectContaining({
        requiredResolution: "apply_markdown",
        ownerLabel: "Equipe do turno",
        markdownStage: "approved",
      }),
    ]);

    const rejectedRepo = createRepository();
    await rejectedRepo.initialize();
    const rejectedLot = await saveFormalLot({
      repository: rejectedRepo,
      displayName: "Iogurte FICTICIO",
      lotCode: "LOTE-IOGURTE-REJEICAO-FICTICIO",
      expiresAt: "2030-01-20",
    });
    const rejectedWorkflow = await rejectedRepo.requestMarkdown({
      lotId: rejectedLot.id,
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: currentTimestamp,
      reason: "rule_window",
    });
    const rejectionTask = (await rejectedRepo.listActiveTodayTasks())[0];

    if (rejectionTask === undefined) {
      throw new Error("Expected rejection approval task.");
    }

    await rejectedRepo.decideMarkdown({
      workflowId: rejectedWorkflow.id,
      taskId: rejectionTask.id,
      actorLabel: "Lideranca FICTICIA",
      occurredAt: "2030-01-10T12:15:00.000Z",
      decision: "rejected",
      rejectionReason: "Rebaixa nao autorizada",
    });

    await expect(rejectedRepo.listActiveTodayTasks()).resolves.toEqual([]);
    await expect(rejectedRepo.listActiveMarkdownWorkflows()).resolves.toEqual([]);
    await expect(rejectedRepo.loadMarkdownWorkflowForLot(rejectedLot.id)).resolves.toMatchObject({
      status: "rejected",
      rejectionReason: "Rebaixa nao autorizada",
    });
  });

  it("requires evidence for application and final shelf confirmation", async () => {
    const { repository, lot, sourceTask } = await createMarkdownDueLot();
    const workflow = await repository.requestMarkdown({
      lotId: lot.id,
      sourceTaskId: sourceTask.id,
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: currentTimestamp,
      reason: "rule_window",
    });
    const approvalTask = (await repository.listActiveTodayTasks())[0];

    if (approvalTask === undefined) {
      throw new Error("Expected approval task.");
    }

    await repository.decideMarkdown({
      workflowId: workflow.id,
      taskId: approvalTask.id,
      actorLabel: "Lideranca FICTICIA",
      occurredAt: "2030-01-10T12:10:00.000Z",
      decision: "approved",
    });
    const applicationTask = (await repository.listActiveTodayTasks())[0];

    if (applicationTask === undefined) {
      throw new Error("Expected application task.");
    }

    await expect(
      repository.recordMarkdownApplication({
        workflowId: workflow.id,
        taskId: applicationTask.id,
        actorLabel: "Equipe do turno",
        occurredAt: "2030-01-10T12:20:00.000Z",
      } as Parameters<typeof repository.recordMarkdownApplication>[0]),
    ).rejects.toThrow();

    await repository.recordMarkdownApplication({
      workflowId: workflow.id,
      taskId: applicationTask.id,
      actorLabel: "Equipe do turno",
      occurredAt: "2030-01-10T12:20:00.000Z",
      evidence: { kind: "photo_recorded_placeholder" },
    });
    const finalTask = (await repository.listActiveTodayTasks())[0];

    if (finalTask === undefined) {
      throw new Error("Expected final shelf confirmation task.");
    }

    await repository.confirmMarkdownOnShelf({
      workflowId: workflow.id,
      taskId: finalTask.id,
      actorLabel: "Equipe do turno",
      occurredAt: "2030-01-10T12:30:00.000Z",
      evidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
    });

    await expect(repository.listActiveTodayTasks()).resolves.toEqual([]);
    await expect(repository.loadMarkdownWorkflowForLot(lot.id)).resolves.toMatchObject({
      status: "shelf_confirmed",
      shelfConfirmationEvidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
    });
  });

  it("reports presence-required and already-active entry states for lot detail", async () => {
    const { repository, lot } = await createMarkdownDueLot();

    await repository.appendObservation(lot.id, {
      status: "not_found",
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: "2030-01-10T12:05:00.000Z",
      location: { kind: "area_de_venda" },
      quantityState: "not_estimable",
      isCorrection: false,
    });

    await expect(
      repository.loadMarkdownEntryState({
        lotId: lot.id,
        currentDate,
        currentTimestamp: "2030-01-10T12:10:00.000Z",
      }),
    ).resolves.toMatchObject({
      status: "presence_required",
      label: "Conferir presenca antes da rebaixa",
    });

    await repository.appendObservation(lot.id, {
      status: "present",
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: "2030-01-10T12:15:00.000Z",
      location: { kind: "area_de_venda" },
      quantityState: "estimated",
      approximateQuantity: 8,
      isCorrection: false,
    });
    const workflow = await repository.requestMarkdown({
      lotId: lot.id,
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: "2030-01-10T12:20:00.000Z",
      reason: "rule_window",
    });

    await expect(
      repository.loadMarkdownEntryState({
        lotId: lot.id,
        currentDate,
        currentTimestamp: "2030-01-10T12:25:00.000Z",
      }),
    ).resolves.toMatchObject({
      status: "already_active",
      workflowId: workflow.id,
      currentStage: "requested",
    });
  });

  it("blocks lot-detail markdown for lots expiring today or already finalized", async () => {
    const repository = createRepository();
    await repository.initialize();
    const lot = await saveFormalLot({
      repository,
      displayName: "Iogurte Vence Hoje FICTICIO",
      lotCode: "LOTE-VENCE-HOJE-FICTICIO",
      expiresAt: currentDate,
    });

    await expect(
      repository.loadMarkdownEntryState({
        lotId: lot.id,
        currentDate,
        currentTimestamp,
      }),
    ).resolves.toMatchObject({
      status: "withdrawal_required",
      label: "Retirar da area ou registrar perda",
    });
    await expect(
      repository.requestMarkdown({
        lotId: lot.id,
        actorLabel: "Colaboradora FICTICIA",
        occurredAt: currentTimestamp,
        reason: "rule_window",
      }),
    ).rejects.toThrow("retirada da area ou perda");

    await repository.appendObservation(lot.id, {
      status: "loss",
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: "2030-01-10T12:05:00.000Z",
      location: { kind: "retirada_perda" },
      quantityState: "estimated",
      approximateQuantity: 12,
      isCorrection: false,
    });

    await expect(
      repository.loadMarkdownEntryState({
        lotId: lot.id,
        currentDate,
        currentTimestamp: "2030-01-10T12:10:00.000Z",
      }),
    ).resolves.toMatchObject({
      status: "terminal_finalized",
      label: "Finalizado: perda registrada",
    });
  });

  it("keeps delayed markdown stage tasks alertable and acknowledgement-only", async () => {
    const { repository, lot, sourceTask } = await createMarkdownDueLot();
    await repository.registerAlertDevice({
      deviceId: "aparelho-ficticio-markdown",
      deviceLabel: "Celular do turno FICTICIO",
      audienceRole: "shift_team",
      permissionStatus: "granted",
      expoPushToken: "ExpoPushToken-FICTICIO-MARKDOWN",
      registeredAt: "2030-01-10T08:55:00.000Z",
    });
    const workflow = await repository.requestMarkdown({
      lotId: lot.id,
      sourceTaskId: sourceTask.id,
      actorLabel: "Colaboradora FICTICIA",
      occurredAt: "2030-01-10T09:00:00.000Z",
      reason: "rule_window",
    });
    const approvalTask = (await repository.listActiveTodayTasks())[0];

    if (approvalTask === undefined) {
      throw new Error("Expected approval task.");
    }

    await repository.decideMarkdown({
      workflowId: workflow.id,
      taskId: approvalTask.id,
      actorLabel: "Lideranca FICTICIA",
      occurredAt: "2030-01-10T09:10:00.000Z",
      decision: "approved",
    });
    const applicationTask = (await repository.listActiveTodayTasks())[0];

    if (applicationTask === undefined) {
      throw new Error("Expected application task.");
    }

    await expect(
      repository.refreshTaskAlertStates({
        referenceTime: "2030-01-10T11:20:00.000Z",
        isWithinShift: true,
        overdueTaskIds: [applicationTask.id],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        taskId: applicationTask.id,
        taskActiveKey: applicationTask.activeKey,
        escalationState: "escalated",
        audience: "responsible_and_leadership",
      }),
    ]);
    await repository.acknowledgeEscalation({
      taskId: applicationTask.id,
      taskActiveKey: applicationTask.activeKey,
      actorLabel: "Lideranca FICTICIA",
      acknowledgedAt: "2030-01-10T11:25:00.000Z",
    });
    await expect(repository.loadTodayTask(applicationTask.id)).resolves.toMatchObject({
      status: "active",
      requiredResolution: "apply_markdown",
    });
    await expect(repository.loadMarkdownWorkflowForLot(lot.id)).resolves.toMatchObject({
      status: "approved",
    });
  });

  it("keeps SQLite markdown storage indexed and metadata-only", () => {
    const sqlitePath = fileURLToPath(new URL("./sqlite-repository.ts", import.meta.url));
    const source = readFileSync(sqlitePath, "utf8");

    expect(source).toContain("CREATE TABLE IF NOT EXISTS markdown_workflows");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS markdown_workflows_lot_status_idx");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS markdown_workflows_current_stage_idx");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS markdown_workflows_updated_at_idx");
    expect(source).toContain("stage_history_json");
    expect(source).not.toContain("R2");
    expect(source).not.toContain("object_key");
    expect(source).not.toContain("base64");
    expect(source).not.toContain("photo_uri");
    expect(source).not.toContain("image_bytes");
  });

  it("migrates legacy Today task tables with markdown columns idempotently", async () => {
    const columns = ["id", "active_key", "resolution_history_json"];
    const statements: string[] = [];
    const database = {
      getAllAsync: <T>() => Promise.resolve(columns.map((name) => ({ name })) as T[]),
      execAsync: (source: string) => {
        statements.push(source);

        for (const column of ["markdown_workflow_id", "markdown_stage"]) {
          if (source.includes(column)) {
            columns.push(column);
          }
        }

        return Promise.resolve();
      },
    };

    await ensureTodayTaskMarkdownColumns(database);

    expect(statements).toEqual([
      "ALTER TABLE today_tasks ADD COLUMN markdown_workflow_id TEXT;",
      "ALTER TABLE today_tasks ADD COLUMN markdown_stage TEXT;",
    ]);

    await ensureTodayTaskMarkdownColumns(database);

    expect(statements).toHaveLength(2);
  });
});
