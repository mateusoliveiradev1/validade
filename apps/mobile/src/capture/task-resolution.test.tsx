import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { TaskResolutionCommand, TodayTaskRecord } from "@validade-zero/contracts";
import type { CaptureRepository } from "./repository";
import { TaskResolutionPanel } from "./TaskResolutionPanel";

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

function expiredTask(): TodayTaskRecord {
  return {
    id: "tarefa-vencida-ficticia",
    activeKey: "lote-ovos:expired:withdraw_or_loss:root",
    lotId: "lote-ovos",
    productDisplayName: "Ovos FICTICIOS",
    lotIdentity: {
      identitySource: "printed",
      value: "OVOS-001",
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

function createRepository(resolveTodayTask = vi.fn()): CaptureRepository {
  return {
    initialize: () => Promise.resolve(),
    createProduct: () => Promise.reject(new Error("not used")),
    findProducts: () => Promise.resolve([]),
    saveLot: () => Promise.reject(new Error("not used")),
    appendObservation: () => Promise.reject(new Error("not used")),
    listRecentLots: () => Promise.resolve([]),
    loadLotDetail: () => Promise.resolve(null),
    refreshTodayTasks: () =>
      Promise.resolve({
        metadata: {
          refreshedAt: "2030-01-10T09:00:00.000Z",
          activeTaskCount: 0,
          futureAttentionCount: 0,
          source: "today_open",
        },
        tasks: [],
        futureAttention: [],
      }),
    listActiveTodayTasks: () => Promise.resolve([]),
    listFutureAttention: () => Promise.resolve([]),
    resolveTodayTask,
    loadTodayTask: () => Promise.resolve(null),
  };
}

async function renderPanel(repository: CaptureRepository): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <TaskResolutionPanel
        repository={repository}
        task={expiredTask()}
        onDone={() => undefined}
        onBack={() => undefined}
        now={() => new Date("2030-01-10T12:00:00.000Z")}
      />,
    );
    await Promise.resolve();
  });

  if (tree === undefined) {
    throw new Error("TaskResolutionPanel did not render.");
  }

  return tree;
}

describe("TaskResolutionPanel", () => {
  it("blocks presence confirmation for an expired task without mutating state", async () => {
    const resolveTodayTask = vi.fn();
    const tree = await renderPanel(createRepository(resolveTodayTask));
    const presence = tree.root.findByProps({ accessibilityLabel: "Conferir presenca" });

    act(() => {
      presence.props.onPress();
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain(
      "Este lote esta vencido. Para proteger a area de venda, retire ou registre perda.",
    );
    expect(resolveTodayTask).not.toHaveBeenCalled();
    expect(rendered).not.toContain("Confirme antes de registrar");
  });

  it("allows withdrawal/loss actions through a typed repository command", async () => {
    const resolveTodayTask = vi.fn((command: TaskResolutionCommand) =>
      Promise.resolve({ ...expiredTask(), status: "resolved", resolvedAt: command.occurredAt }),
    );
    const onDone = vi.fn();
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <TaskResolutionPanel
          repository={createRepository(resolveTodayTask)}
          task={expiredTask()}
          onDone={onDone}
          onBack={() => undefined}
          now={() => new Date("2030-01-10T12:00:00.000Z")}
        />,
      );
      await Promise.resolve();
    });

    if (tree === undefined) {
      throw new Error("TaskResolutionPanel did not render.");
    }

    const withdraw = tree.root.findAllByProps({ accessibilityLabel: "Retirar agora" })[0];

    await act(async () => {
      withdraw.props.onPress();
      await Promise.resolve();
    });

    const submit = tree.root
      .findAllByProps({ accessibilityLabel: "Retirar agora" })
      .find((node) => node.props.accessibilityState?.disabled === false);

    if (submit === undefined) {
      throw new Error("Enabled withdrawal submit button was not rendered.");
    }

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });

    expect(resolveTodayTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "tarefa-vencida-ficticia",
        action: "withdraw",
        actorLabel: "Colaborador local",
        destination: { kind: "retirada_perda" },
      }),
    );
    expect(onDone).toHaveBeenCalledOnce();
  });
});
