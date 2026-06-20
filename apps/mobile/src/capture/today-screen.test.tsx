import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { FutureAttentionRecord, TodayTaskRecord } from "@validade-zero/contracts";
import type { CaptureRepository, TodayTaskRefreshResult } from "./repository";
import { TodayScreen } from "./TodayScreen";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");

  return {
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Text", props, children),
    View: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("View", props, children),
    ScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", null, children),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

function createRepository(
  refreshTodayTasks: CaptureRepository["refreshTodayTasks"],
): CaptureRepository {
  return {
    initialize: () => Promise.resolve(),
    createProduct: () => Promise.reject(new Error("not used")),
    findProducts: () => Promise.resolve([]),
    saveLot: () => Promise.reject(new Error("not used")),
    appendObservation: () => Promise.reject(new Error("not used")),
    listRecentLots: () => Promise.resolve([]),
    loadLotDetail: () => Promise.resolve(null),
    refreshTodayTasks,
    listActiveTodayTasks: () => Promise.resolve([]),
    listFutureAttention: () => Promise.resolve([]),
    resolveTodayTask: () => Promise.reject(new Error("not used")),
    loadTodayTask: () => Promise.resolve(null),
    registerAlertDevice: (input) => Promise.resolve(input),
    loadAlertChannelState: () => Promise.resolve(null),
    refreshTaskAlertStates: () => Promise.resolve([]),
    listTaskAlertStates: () => Promise.resolve([]),
    recordAlertAttempt: () => Promise.reject(new Error("not used")),
    acknowledgeEscalation: () => Promise.reject(new Error("not used")),
    resolvePushOpenIntent: (input) => Promise.resolve({ ...input, result: "task_missing" }),
  };
}

function emptyRefresh(): TodayTaskRefreshResult {
  return {
    metadata: {
      refreshedAt: "2030-01-10T09:00:00.000Z",
      activeTaskCount: 0,
      futureAttentionCount: 0,
      source: "today_open",
    },
    tasks: [],
    futureAttention: [],
  };
}

function expiredTask(): TodayTaskRecord {
  return taskFixture({
    id: "tarefa-ficticia-001",
    activeKey: "lote-ficticio-001:expired:withdraw_or_loss:root",
    lotId: "lote-ficticio-001",
    productDisplayName: "Ovos FICTICIOS",
    lotIdentity: {
      identitySource: "printed",
      value: "OVOS-FICTICIOS-001",
    },
    riskState: "expired",
    severity: "critical",
    dueBucket: "now",
    requiredResolution: "withdraw_or_loss",
    section: "withdraw_now",
    sourceRisk: {
      state: "expired",
      reasons: [{ code: "expired", field: "expiresAt" }],
    },
  });
}

function taskFixture(overrides: Partial<TodayTaskRecord>): TodayTaskRecord {
  return {
    id: "tarefa-ficticia-generica",
    activeKey: "lote-ficticio-generico:critical:check_presence:root",
    lotId: "lote-ficticio-generico",
    productDisplayName: "Produto FICTICIO",
    lotIdentity: {
      identitySource: "printed",
      value: "LOTE-FICTICIO",
    },
    currentLocation: { kind: "area_de_venda" },
    riskState: "critical",
    severity: "high",
    dueBucket: "shift",
    requiredResolution: "check_presence",
    section: "check_sales_area",
    ownerLabel: "Equipe do turno",
    status: "active",
    sourceRisk: {
      state: "critical",
      reasons: [{ code: "expires_in_3_days", field: "expiresAt" }],
    },
    priority: 1,
    createdAt: "2030-01-10T09:00:00.000Z",
    updatedAt: "2030-01-10T09:00:00.000Z",
    ...overrides,
  };
}

function radarAttention(): FutureAttentionRecord {
  return {
    id: "future:lote-banana-ficticio:radar",
    lotId: "lote-banana-ficticio",
    productDisplayName: "Banana FICTICIA",
    lotIdentity: {
      identitySource: "printed",
      value: "BANANA-RADAR-FICTICIO",
    },
    currentLocation: { kind: "estoque" },
    riskState: "radar",
    section: "future_attention",
    sourceRiskReasons: [{ code: "expires_in_60_days", field: "expiresAt" }],
    observedAt: "2030-01-10T12:00:00.000Z",
  };
}

function refreshWith(input: {
  tasks: readonly TodayTaskRecord[];
  futureAttention?: readonly FutureAttentionRecord[];
}): TodayTaskRefreshResult {
  return {
    ...emptyRefresh(),
    metadata: {
      ...emptyRefresh().metadata,
      activeTaskCount: input.tasks.length,
      futureAttentionCount: input.futureAttention?.length ?? 0,
    },
    tasks: input.tasks,
    futureAttention: input.futureAttention ?? [],
  };
}

async function renderTodayScreen(repository: CaptureRepository): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <TodayScreen
        repository={repository}
        onRegisterLot={() => undefined}
        onOpenRecentLots={() => undefined}
        now={() => new Date("2030-01-10T12:00:00.000Z")}
      />,
    );
    await Promise.resolve();
  });

  if (tree === undefined) {
    throw new Error("TodayScreen did not render.");
  }

  return tree;
}

describe("TodayScreen", () => {
  it("renders the safe empty Hoje entry with registration and recent-lot paths", async () => {
    const repository = createRepository(() => Promise.resolve(emptyRefresh()));
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Hoje");
    expect(rendered).toContain("Area de venda segura");
    expect(rendered).toContain("Area de venda segura agora");
    expect(rendered).toContain("Registrar lote");
    expect(rendered).toContain("Conferir lotes recentes");
  });

  it("keeps the previous task list visible when manual refresh fails", async () => {
    let refreshCount = 0;
    const repository = createRepository(() => {
      refreshCount += 1;

      if (refreshCount === 1) {
        return Promise.resolve({
          ...emptyRefresh(),
          metadata: {
            ...emptyRefresh().metadata,
            activeTaskCount: 1,
          },
          tasks: [expiredTask()],
        });
      }

      return Promise.reject(new Error("offline"));
    });
    const tree = await renderTodayScreen(repository);
    const refreshButton = tree.root.findByProps({ accessibilityLabel: "Atualizar tarefas" });

    await act(async () => {
      refreshButton.props.onPress();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Retirar agora");
    expect(rendered).toContain("Ovos FICTICIOS");
    expect(rendered).toContain(
      "Nao foi possivel atualizar agora. Confira a conexao e tente novamente.",
    );
  });

  it("shows pending and completion feedback for a successful manual refresh", async () => {
    let refreshCount = 0;
    let finishManualRefresh: ((result: TodayTaskRefreshResult) => void) | undefined;
    const manualRefresh = new Promise<TodayTaskRefreshResult>((resolve) => {
      finishManualRefresh = resolve;
    });
    const repository = createRepository(() => {
      refreshCount += 1;

      return refreshCount === 1 ? Promise.resolve(emptyRefresh()) : manualRefresh;
    });
    const tree = await renderTodayScreen(repository);
    const refreshButton = tree.root.findByProps({ accessibilityLabel: "Atualizar tarefas" });

    act(() => {
      refreshButton.props.onPress();
    });

    const loadingButton = tree.root.findByProps({ accessibilityLabel: "Atualizando tarefas" });

    expect(loadingButton.props.accessibilityState).toEqual({ disabled: true });

    await act(async () => {
      finishManualRefresh?.(refreshWith({ tasks: [expiredTask()] }));
      await manualRefresh;
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Atualizacao concluida. 1 tarefa ativa.");
    expect(rendered).toContain("Ovos FICTICIOS");
  });

  it("renders active sections in operational order with complete row anatomy", async () => {
    const repository = createRepository(() =>
      Promise.resolve(
        refreshWith({
          tasks: [
            taskFixture({
              id: "tarefa-rebaixa",
              activeKey: "lote-queijo:markdown_due:request_markdown:root",
              lotId: "lote-queijo",
              productDisplayName: "Queijo FICTICIO",
              lotIdentity: { identitySource: "printed", value: "QUEIJO-001" },
              currentLocation: { kind: "estoque" },
              riskState: "markdown_due",
              severity: "medium",
              dueBucket: "today",
              requiredResolution: "request_markdown",
              section: "request_markdown",
              sourceRisk: {
                state: "markdown_due",
                reasons: [{ code: "expires_in_15_days", field: "expiresAt" }],
              },
              priority: 3,
            }),
            taskFixture({
              id: "tarefa-conferir",
              activeKey: "lote-iogurte:critical:check_presence:root",
              lotId: "lote-iogurte",
              productDisplayName: "Iogurte FICTICIO",
              lotIdentity: { identitySource: "printed", value: "IOGURTE-001" },
              riskState: "critical",
              requiredResolution: "check_presence",
              section: "check_sales_area",
              priority: 1,
            }),
            expiredTask(),
          ],
        }),
      ),
    );
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered.indexOf("Retirar agora")).toBeLessThan(
      rendered.indexOf("Conferir na area de venda"),
    );
    expect(rendered.indexOf("Conferir na area de venda")).toBeLessThan(
      rendered.indexOf("Pedir rebaixa"),
    );
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
    expect(rendered).toContain("Local:");
    expect(rendered).toContain("venda");
    expect(rendered).toContain("Agora - Severidade Critica - Equipe do turno");
    expect(rendered).toContain("Validade vencida");
  });

  it("pins overdue tasks above non-overdue active work with visible Atrasada copy", async () => {
    const repository = createRepository(() =>
      Promise.resolve(
        refreshWith({
          tasks: [
            expiredTask(),
            taskFixture({
              id: "tarefa-atrasada-ficticia",
              activeKey: "lote-folhas:uncertain:check_presence:root",
              lotId: "lote-folhas",
              productDisplayName: "Folhas FICTICIAS",
              lotIdentity: { identitySource: "printed", value: "FOLHAS-001" },
              currentLocation: { kind: "estoque" },
              riskState: "uncertain",
              dueBucket: "follow_up",
              requiredResolution: "check_presence",
              section: "follow_up",
              sourceRisk: {
                state: "uncertain",
                reasons: [{ code: "presence_stale", field: "lastPhysicalConfirmation" }],
              },
              priority: 6,
              createdAt: "2030-01-09T18:00:00.000Z",
            }),
          ],
        }),
      ),
    );
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered.indexOf("Atrasadas")).toBeLessThan(rendered.indexOf("Retirar agora"));
    expect(rendered).toContain("Atrasada - Severidade Alta - Equipe do turno");
  });

  it("keeps per-lot duplicate product tasks visible as separate rows", async () => {
    const repository = createRepository(() =>
      Promise.resolve(
        refreshWith({
          tasks: [
            taskFixture({
              id: "tarefa-alface-001",
              activeKey: "lote-alface-001:critical:check_presence:root",
              lotId: "lote-alface-001",
              productDisplayName: "Alface FICTICIA",
              lotIdentity: { identitySource: "printed", value: "ALFACE-001" },
            }),
            taskFixture({
              id: "tarefa-alface-002",
              activeKey: "lote-alface-002:critical:check_presence:root",
              lotId: "lote-alface-002",
              productDisplayName: "Alface FICTICIA",
              lotIdentity: { identitySource: "printed", value: "ALFACE-002" },
            }),
          ],
        }),
      ),
    );
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Alface FICTICIA - lote ALFACE-001");
    expect(rendered).toContain("Alface FICTICIA - lote ALFACE-002");
  });

  it("keeps the sales-area header unsafe while a recheck task is open", async () => {
    const repository = createRepository(() =>
      Promise.resolve(
        refreshWith({
          tasks: [
            taskFixture({
              id: "tarefa-reconferencia",
              activeKey: "recheck:tarefa-vencida",
              lotId: "lote-ovos",
              productDisplayName: "Ovos FICTICIOS",
              lotIdentity: { identitySource: "printed", value: "OVOS-001" },
              riskState: "uncertain",
              severity: "high",
              dueBucket: "now",
              requiredResolution: "sales_area_recheck",
              section: "check_sales_area",
              sourceRisk: {
                state: "uncertain",
                reasons: [{ code: "presence_conditionally_resolved", field: "sales_area_recheck" }],
              },
              priority: 1,
              recheckParentId: "tarefa-vencida",
            }),
          ],
        }),
      ),
    );
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Area de venda com 1 risco(s) agora");
    expect(rendered).toContain("Reconferir area de venda");
  });

  it("renders radar only under future attention and opens active tasks through callback", async () => {
    const openTask = vi.fn();
    const repository = createRepository(() =>
      Promise.resolve(refreshWith({ tasks: [expiredTask()], futureAttention: [radarAttention()] })),
    );
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <TodayScreen
          repository={repository}
          onRegisterLot={() => undefined}
          onOpenRecentLots={() => undefined}
          onOpenTask={openTask}
          now={() => new Date("2030-01-10T12:00:00.000Z")}
        />,
      );
      await Promise.resolve();
    });

    if (tree === undefined) {
      throw new Error("TodayScreen did not render.");
    }

    const rendered = JSON.stringify(tree.toJSON());
    const taskButton = tree.root.findByProps({
      accessibilityLabel: "Retirar agora: Ovos FICTICIOS, lote OVOS-FICTICIOS-001",
    });

    expect(rendered.indexOf("Atencao futura")).toBeGreaterThan(rendered.indexOf("Retirar agora"));
    expect(rendered).toContain("Banana FICTICIA - lote BANANA-RADAR-FICTICIO");

    act(() => {
      taskButton.props.onPress();
    });

    expect(openTask).toHaveBeenCalledWith(expect.objectContaining({ id: "tarefa-ficticia-001" }));
  });
});
