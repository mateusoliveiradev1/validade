import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { TodayTaskRecord } from "@validade-zero/contracts";
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
  return {
    id: "tarefa-ficticia-001",
    activeKey: "lote-ficticio-001:expired:withdraw_or_loss:root",
    lotId: "lote-ficticio-001",
    productDisplayName: "Ovos FICTICIOS",
    lotIdentity: {
      identitySource: "printed",
      value: "OVOS-FICTICIOS-001",
    },
    currentLocation: { kind: "area_de_venda" },
    riskState: "expired",
    severity: "critical",
    dueBucket: "now",
    requiredResolution: "withdraw_or_loss",
    section: "withdraw_now",
    ownerLabel: "Equipe do turno",
    status: "active",
    sourceRisk: {
      state: "expired",
      reasons: [{ code: "expired", field: "expiresAt" }],
    },
    priority: 0,
    createdAt: "2030-01-10T09:00:00.000Z",
    updatedAt: "2030-01-10T09:00:00.000Z",
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
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Retirar agora");
    expect(rendered).toContain("Ovos FICTICIOS");
    expect(rendered).toContain("Nao foi possivel atualizar agora. Confira a conexao e tente novamente.");
  });
});
