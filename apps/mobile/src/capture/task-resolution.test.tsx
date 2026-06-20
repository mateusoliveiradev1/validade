import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
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

function recheckTask(): TodayTaskRecord {
  return {
    ...expiredTask(),
    id: "tarefa-reconferencia-ficticia",
    activeKey: "recheck:tarefa-vencida-ficticia",
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
    recheckParentId: "tarefa-vencida-ficticia",
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

function findEnabledButton(tree: ReactTestRenderer, label: string): ReactTestInstance {
  const button = tree.root
    .findAllByProps({ accessibilityLabel: label })
    .find((node) => node.props.accessibilityState?.disabled === false);

  if (button === undefined) {
    throw new Error(`Enabled button "${label}" was not rendered.`);
  }

  return button;
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

    const submit = findEnabledButton(tree, "Confirmar retirada");

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("Confirme antes de registrar");
    expect(JSON.stringify(tree.toJSON())).toContain("Destino: Retirada/perda");
    expect(JSON.stringify(tree.toJSON())).toContain(
      "A area de venda continuara bloqueada ate a reconferencia ser concluida.",
    );

    const confirm = findEnabledButton(tree, "Confirmar retirada");

    await act(async () => {
      confirm.props.onPress();
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
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Retirada registrada. Reconferir a area de venda antes de marcar como segura.",
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Responsavel");
    expect(JSON.stringify(tree.toJSON())).toContain("Equipe do turno");
  });

  it("requires a no-photo reason before completing a sales-area recheck", async () => {
    const resolveTodayTask = vi.fn((command: TaskResolutionCommand) =>
      Promise.resolve({ ...recheckTask(), status: "resolved", resolvedAt: command.occurredAt }),
    );
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <TaskResolutionPanel
          repository={createRepository(resolveTodayTask)}
          task={recheckTask()}
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

    const recheck = tree.root.findByProps({ accessibilityLabel: "Confirmar reconferencia" });

    await act(async () => {
      recheck.props.onPress();
      await Promise.resolve();
    });

    const submitWithoutEvidence = findEnabledButton(tree, "Confirmar reconferencia");

    await act(async () => {
      submitWithoutEvidence.props.onPress();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree.toJSON())).toContain(
      "Registre foto da area ou informe por que a foto nao foi feita antes de concluir.",
    );
    expect(resolveTodayTask).not.toHaveBeenCalled();

    const noPhotoReason = tree.root.findByProps({
      accessibilityLabel: "Prioridade foi retirar o risco primeiro",
    });

    await act(async () => {
      noPhotoReason.props.onPress();
      await Promise.resolve();
    });

    const submitWithReason = findEnabledButton(tree, "Confirmar reconferencia");

    await act(async () => {
      submitWithReason.props.onPress();
      await Promise.resolve();
    });

    const confirm = findEnabledButton(tree, "Confirmar reconferencia");

    await act(async () => {
      confirm.props.onPress();
      await Promise.resolve();
    });

    expect(resolveTodayTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "tarefa-reconferencia-ficticia",
        action: "complete_recheck",
        evidence: {
          kind: "no_photo_reason",
          reason: "Prioridade foi retirar o risco primeiro",
        },
        recheckParentId: "tarefa-vencida-ficticia",
      }),
    );
  });

  it("records photo placeholder evidence without local binary fields", async () => {
    const resolveTodayTask = vi.fn((command: TaskResolutionCommand) =>
      Promise.resolve({ ...recheckTask(), status: "resolved", resolvedAt: command.occurredAt }),
    );
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <TaskResolutionPanel
          repository={createRepository(resolveTodayTask)}
          task={recheckTask()}
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

    const recheck = tree.root.findByProps({ accessibilityLabel: "Confirmar reconferencia" });
    const photo = tree.root.findByProps({ accessibilityLabel: "Registrar foto da area" });

    await act(async () => {
      recheck.props.onPress();
      photo.props.onPress();
      await Promise.resolve();
    });

    const submit = findEnabledButton(tree, "Confirmar reconferencia");

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });

    const confirm = findEnabledButton(tree, "Confirmar reconferencia");

    await act(async () => {
      confirm.props.onPress();
      await Promise.resolve();
    });

    const command = resolveTodayTask.mock.calls[0]?.[0];

    expect(command?.evidence).toEqual({ kind: "photo_recorded_placeholder" });
    expect(JSON.stringify(command)).not.toContain("uri");
    expect(JSON.stringify(command)).not.toContain("base64");
    expect(JSON.stringify(command)).not.toContain("objectKey");
  });
});
