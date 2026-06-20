import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CaptureProductInput, TaskResolutionCommand } from "@validade-zero/contracts";
import { createMemoryCaptureRepository } from "./memory-repository";

const currentDate = "2030-01-10";
const currentTimestamp = "2030-01-10T12:00:00.000Z";

function createRepository() {
  let idCounter = 0;

  return createMemoryCaptureRepository({
    clock: () => "2030-01-10T09:00:00.000Z",
    createId: () => `identificador-ficticio-${++idCounter}`,
  });
}

function formalProduct(displayName: string, maxPhysicalConfirmationAgeHours?: number) {
  return {
    displayName,
    categoryId: `categoria-ficticia-${displayName.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`,
    categoryRuleProfile: {
      categoryId: `categoria-ficticia-${displayName.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`,
      mode: "formal_validity",
      ...(maxPhysicalConfirmationAgeHours === undefined
        ? {}
        : { maxPhysicalConfirmationAgeHours }),
    },
  } satisfies CaptureProductInput;
}

async function saveFormalLot(input: {
  repository: ReturnType<typeof createRepository>;
  product: Awaited<ReturnType<ReturnType<typeof createRepository>["createProduct"]>>;
  lotCode: string;
  expiresAt: string;
  location?: { kind: "area_de_venda" | "estoque" };
}) {
  return input.repository.saveLot({
    lot: {
      productId: input.product.id,
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

describe("today task repository", () => {
  it("refreshes active tasks idempotently and separates future radar attention", async () => {
    const repository = createRepository();
    await repository.initialize();
    const expiredProduct = await repository.createProduct(formalProduct("Ovos FICTICIOS"));
    const criticalProduct = await repository.createProduct(formalProduct("Iogurte FICTICIO"));
    const markdownProduct = await repository.createProduct(formalProduct("Queijo FICTICIO"));
    const uncertainProduct = await repository.createProduct(formalProduct("Folhas FICTICIAS", 1));
    const radarProduct = await repository.createProduct(formalProduct("Banana FICTICIA"));
    const safeProduct = await repository.createProduct(formalProduct("Maca FICTICIA"));

    await saveFormalLot({
      repository,
      product: expiredProduct,
      lotCode: "LOTE-OVOS-VENCIDO-FICTICIO",
      expiresAt: "2030-01-09",
    });
    await saveFormalLot({
      repository,
      product: criticalProduct,
      lotCode: "LOTE-IOGURTE-CRITICO-FICTICIO",
      expiresAt: "2030-01-11",
    });
    await saveFormalLot({
      repository,
      product: markdownProduct,
      lotCode: "LOTE-QUEIJO-REBAIXA-FICTICIO",
      expiresAt: "2030-01-20",
      location: { kind: "estoque" },
    });
    await saveFormalLot({
      repository,
      product: uncertainProduct,
      lotCode: "LOTE-FOLHAS-INCERTO-FICTICIO",
      expiresAt: "2030-01-20",
    });
    await saveFormalLot({
      repository,
      product: radarProduct,
      lotCode: "LOTE-BANANA-RADAR-FICTICIO",
      expiresAt: "2030-03-01",
    });
    await saveFormalLot({
      repository,
      product: safeProduct,
      lotCode: "LOTE-MACA-SEGURA-FICTICIO",
      expiresAt: "2030-04-01",
    });

    const firstRefresh = await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp,
      source: "today_open",
    });
    const firstTaskIds = firstRefresh.tasks.map((task) => task.id);
    const secondRefresh = await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp,
      source: "manual_refresh",
    });

    expect(firstRefresh.metadata).toMatchObject({
      activeTaskCount: 4,
      futureAttentionCount: 1,
      source: "today_open",
    });
    expect(secondRefresh.tasks.map((task) => task.id)).toEqual(firstTaskIds);
    expect(secondRefresh.tasks.map((task) => task.riskState)).toEqual([
      "expired",
      "critical",
      "uncertain",
      "markdown_due",
    ]);
    expect(secondRefresh.tasks[0]).toMatchObject({
      ownerLabel: "Equipe do turno",
      status: "active",
      severity: "critical",
      dueBucket: "now",
      requiredResolution: "withdraw_or_loss",
      sourceRisk: expect.objectContaining({ state: "expired" }),
    });
    expect(secondRefresh.futureAttention).toEqual([
      expect.objectContaining({
        riskState: "radar",
        section: "future_attention",
        productDisplayName: "Banana FICTICIA",
      }),
    ]);
    expect(secondRefresh.tasks.some((task) => task.productDisplayName === "Maca FICTICIA")).toBe(
      false,
    );
  });

  it("preserves resolved task state and resolution history across refreshes", async () => {
    const repository = createRepository();
    await repository.initialize();
    const product = await repository.createProduct(formalProduct("Ovos FICTICIOS"));

    await saveFormalLot({
      repository,
      product,
      lotCode: "LOTE-OVOS-VENCIDO-FICTICIO",
      expiresAt: "2030-01-09",
    });

    const refresh = await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp,
      source: "today_open",
    });
    const task = refresh.tasks[0];

    expect(task).toBeDefined();

    const resolved = await repository.resolveTodayTask({
      taskId: task.id,
      action: "withdraw",
      actorLabel: "Ana FICTICIA",
      occurredAt: "2030-01-10T12:10:00.000Z",
      destination: { kind: "retirada_perda" },
    });

    await repository.refreshTodayTasks({
      currentDate,
      currentTimestamp,
      source: "observation_change",
    });

    await expect(repository.listActiveTodayTasks()).resolves.toEqual([
      expect.objectContaining({
        activeKey: `recheck:${task.id}`,
        requiredResolution: "sales_area_recheck",
        riskState: "uncertain",
        status: "active",
        recheckParentId: task.id,
      }),
    ]);
    await expect(repository.loadTodayTask(task.id)).resolves.toMatchObject({
      status: "resolved",
      responsibleActorLabel: "Ana FICTICIA",
      resolutionHistory: [
        expect.objectContaining({
          action: "withdraw",
          actorLabel: "Ana FICTICIA",
        }),
      ],
    });
    expect(resolved.resolvedAt).toBe("2030-01-10T12:10:00.000Z");

    const recheck = (await repository.listActiveTodayTasks())[0];

    expect(recheck).toBeDefined();

    if (recheck === undefined) {
      throw new Error("Expected a sales-area recheck task after withdrawal.");
    }

    await expect(
      repository.resolveTodayTask({
        taskId: recheck.id,
        action: "complete_recheck",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:20:00.000Z",
      }),
    ).rejects.toThrow("requires photo metadata");

    await repository.resolveTodayTask({
      taskId: recheck.id,
      action: "complete_recheck",
      actorLabel: "Ana FICTICIA",
      occurredAt: "2030-01-10T12:25:00.000Z",
      evidence: { kind: "photo_recorded_placeholder" },
    });

    await expect(repository.listActiveTodayTasks()).resolves.toEqual([]);
    await expect(repository.loadTodayTask(recheck.id)).resolves.toMatchObject({
      status: "resolved",
      responsibleActorLabel: "Ana FICTICIA",
      resolutionHistory: [
        expect.objectContaining({
          action: "complete_recheck",
          evidence: { kind: "photo_recorded_placeholder" },
        }),
      ],
    });
  });

  it("rejects malformed task resolution commands at the repository boundary", async () => {
    const repository = createRepository();

    await expect(
      repository.resolveTodayTask({
        taskId: "tarefa-ficticia-inexistente",
        action: "resolved",
        actorLabel: "Ana FICTICIA",
        occurredAt: "2030-01-10T12:10:00.000Z",
      } as unknown as TaskResolutionCommand),
    ).rejects.toThrow();
  });

  it("keeps SQLite task storage local, indexed, and out of remote evidence scope", () => {
    const sqlitePath = fileURLToPath(new URL("./sqlite-repository.ts", import.meta.url));
    const source = readFileSync(sqlitePath, "utf8");

    expect(source).toContain("CREATE TABLE IF NOT EXISTS today_tasks");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS today_tasks_status_priority_due_idx");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS today_future_attention");
    expect(source).not.toContain("R2");
    expect(source).not.toContain("object_key");
    expect(source).not.toContain("push");
  });
});
