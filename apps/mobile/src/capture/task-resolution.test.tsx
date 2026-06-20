import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type {
  MarkdownApplicationCommand,
  MarkdownApprovalCommand,
  MarkdownShelfConfirmationCommand,
  TaskResolutionCommand,
  TodayTaskRecord,
} from "@validade-zero/contracts";
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
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
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

function markdownTask(
  requiredResolution: Extract<
    TodayTaskRecord["requiredResolution"],
    "approve_markdown" | "apply_markdown" | "confirm_markdown_on_shelf"
  >,
): TodayTaskRecord {
  const stage =
    requiredResolution === "approve_markdown"
      ? "requested"
      : requiredResolution === "apply_markdown"
        ? "approved"
        : "applied";

  return {
    ...expiredTask(),
    id: `tarefa-${requiredResolution}-ficticia`,
    activeKey: `markdown:workflow-rebaixa-ficticio:${stage}`,
    riskState: "markdown_due",
    severity: requiredResolution === "approve_markdown" ? "medium" : "high",
    dueBucket: requiredResolution === "approve_markdown" ? "today" : "shift",
    requiredResolution,
    section: "request_markdown",
    ownerLabel: requiredResolution === "approve_markdown" ? "Lideranca local" : "Equipe do turno",
    sourceRisk: {
      state: "markdown_due",
      reasons: [{ code: "expires_in_15_days", field: "markdownWorkflow" }],
    },
    priority: requiredResolution === "approve_markdown" ? 3 : 2,
    markdownWorkflowId: "workflow-rebaixa-ficticio",
    markdownStage: stage,
  };
}

function createRepository(overrides: Partial<CaptureRepository> = {}): CaptureRepository {
  const resolveTodayTask = overrides.resolveTodayTask ?? vi.fn();

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
    requestMarkdown: () => Promise.reject(new Error("not used")),
    decideMarkdown: () => Promise.reject(new Error("not used")),
    recordMarkdownApplication: () => Promise.reject(new Error("not used")),
    confirmMarkdownOnShelf: () => Promise.reject(new Error("not used")),
    loadMarkdownWorkflowForLot: () => Promise.resolve(null),
    listActiveMarkdownWorkflows: () => Promise.resolve([]),
    loadMarkdownEntryState: () =>
      Promise.resolve({
        status: "presence_required",
        label: "Conferir presenca antes da rebaixa",
        lotId: "lote-ovos",
      }),
    registerAlertDevice: (input) => Promise.resolve(input),
    loadAlertChannelState: () => Promise.resolve(null),
    refreshTaskAlertStates: () => Promise.resolve([]),
    listTaskAlertStates: () => Promise.resolve([]),
    recordAlertAttempt: () => Promise.reject(new Error("not used")),
    acknowledgeEscalation: () => Promise.reject(new Error("not used")),
    resolvePushOpenIntent: (input) => Promise.resolve({ ...input, result: "task_missing" }),
    ...overrides,
  };
}

async function renderPanel(
  repository: CaptureRepository,
  task: TodayTaskRecord = expiredTask(),
): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <TaskResolutionPanel
        repository={repository}
        task={task}
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

function findDisabledButton(tree: ReactTestRenderer, label: string): ReactTestInstance {
  const button = tree.root
    .findAllByProps({ accessibilityLabel: label })
    .find((node) => node.props.accessibilityState?.disabled === true);

  if (button === undefined) {
    throw new Error(`Disabled button "${label}" was not rendered.`);
  }

  return button;
}

function findInput(tree: ReactTestRenderer, label: string): ReactTestInstance {
  const input = tree.root
    .findAllByType("TextInput")
    .find((node) => node.props.accessibilityLabel === label);

  if (input === undefined) {
    throw new Error(`Input "${label}" was not rendered.`);
  }

  return input;
}

describe("TaskResolutionPanel", () => {
  it("blocks presence confirmation for an expired task without mutating state", async () => {
    const resolveTodayTask = vi.fn();
    const tree = await renderPanel(createRepository({ resolveTodayTask }));
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
          repository={createRepository({ resolveTodayTask })}
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
          repository={createRepository({ resolveTodayTask })}
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

    const noPhotoReason = tree.root.findByProps({ accessibilityLabel: "Camera indisponivel" });

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
          reason: "Camera indisponivel",
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
          repository={createRepository({ resolveTodayTask })}
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

  it("approves markdown through the workflow command without resolving the task directly", async () => {
    const decideMarkdown = vi.fn((command: MarkdownApprovalCommand) =>
      Promise.resolve({
        id: command.workflowId,
        lotId: "lote-ovos",
        status: "approved" as const,
        currentStage: "approved" as const,
        requestedAt: "2030-01-10T09:00:00.000Z",
        requestedBy: "Colaborador local",
        requestReason: "rule_window" as const,
        approvedAt: command.occurredAt,
        approvedBy: command.actorLabel,
        stageHistory: [
          {
            stage: "requested" as const,
            action: "request_markdown" as const,
            actorLabel: "Colaborador local",
            occurredAt: "2030-01-10T09:00:00.000Z",
          },
          {
            stage: "approved" as const,
            action: "approve_markdown" as const,
            actorLabel: command.actorLabel,
            occurredAt: command.occurredAt,
          },
        ],
        createdAt: "2030-01-10T09:00:00.000Z",
        updatedAt: command.occurredAt,
      }),
    );
    const resolveTodayTask = vi.fn();
    const tree = await renderPanel(
      createRepository({ decideMarkdown, resolveTodayTask }),
      markdownTask("approve_markdown"),
    );

    await act(async () => {
      tree.root.findAllByProps({ accessibilityLabel: "Aprovar rebaixa" })[0]?.props.onPress();
      await Promise.resolve();
    });

    const submit = findEnabledButton(tree, "Aprovar rebaixa");

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });

    expect(decideMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "workflow-rebaixa-ficticio",
        taskId: "tarefa-approve_markdown-ficticia",
        decision: "approved",
      }),
    );
    expect(resolveTodayTask).not.toHaveBeenCalled();
  });

  it("requires a rejection reason before rejecting markdown", async () => {
    const decideMarkdown = vi.fn((command: MarkdownApprovalCommand) =>
      Promise.resolve({
        id: command.workflowId,
        lotId: "lote-ovos",
        status: "rejected" as const,
        currentStage: "rejected" as const,
        requestedAt: "2030-01-10T09:00:00.000Z",
        requestedBy: "Colaborador local",
        requestReason: "rule_window" as const,
        rejectedAt: command.occurredAt,
        rejectedBy: command.actorLabel,
        rejectionReason: command.rejectionReason,
        stageHistory: [
          {
            stage: "requested" as const,
            action: "request_markdown" as const,
            actorLabel: "Colaborador local",
            occurredAt: "2030-01-10T09:00:00.000Z",
          },
          {
            stage: "rejected" as const,
            action: "reject_markdown" as const,
            actorLabel: command.actorLabel,
            occurredAt: command.occurredAt,
            reason: command.rejectionReason,
          },
        ],
        createdAt: "2030-01-10T09:00:00.000Z",
        updatedAt: command.occurredAt,
      }),
    );
    const tree = await renderPanel(
      createRepository({ decideMarkdown }),
      markdownTask("approve_markdown"),
    );

    await act(async () => {
      tree.root.findAllByProps({ accessibilityLabel: "Reprovar rebaixa" })[0]?.props.onPress();
      await Promise.resolve();
    });

    expect(findDisabledButton(tree, "Reprovar rebaixa")).toBeDefined();
    expect(decideMarkdown).not.toHaveBeenCalled();

    await act(async () => {
      findInput(tree, "Motivo da reprovacao").props.onChangeText("Preco nao autorizado");
      await Promise.resolve();
    });

    const submit = findEnabledButton(tree, "Reprovar rebaixa");

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });

    expect(decideMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "rejected",
        rejectionReason: "Preco nao autorizado",
      }),
    );
  });

  it("requires safe evidence metadata before recording markdown application", async () => {
    const recordMarkdownApplication = vi.fn((command: MarkdownApplicationCommand) =>
      Promise.resolve({
        id: command.workflowId,
        lotId: "lote-ovos",
        status: "applied" as const,
        currentStage: "applied" as const,
        requestedAt: "2030-01-10T09:00:00.000Z",
        requestedBy: "Colaborador local",
        requestReason: "rule_window" as const,
        approvedAt: "2030-01-10T10:00:00.000Z",
        approvedBy: "Lideranca local",
        appliedAt: command.occurredAt,
        appliedBy: command.actorLabel,
        applicationEvidence: command.evidence,
        stageHistory: [
          {
            stage: "requested" as const,
            action: "request_markdown" as const,
            actorLabel: "Colaborador local",
            occurredAt: "2030-01-10T09:00:00.000Z",
          },
          {
            stage: "approved" as const,
            action: "approve_markdown" as const,
            actorLabel: "Lideranca local",
            occurredAt: "2030-01-10T10:00:00.000Z",
          },
          {
            stage: "applied" as const,
            action: "apply_markdown" as const,
            actorLabel: command.actorLabel,
            occurredAt: command.occurredAt,
            evidence: command.evidence,
          },
        ],
        createdAt: "2030-01-10T09:00:00.000Z",
        updatedAt: command.occurredAt,
      }),
    );
    const tree = await renderPanel(
      createRepository({ recordMarkdownApplication }),
      markdownTask("apply_markdown"),
    );

    expect(JSON.stringify(tree.toJSON())).toContain("Comprove a etiqueta aplicada");
    expect(findDisabledButton(tree, "Registrar etiqueta aplicada")).toBeDefined();

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: "Camera indisponivel" }).props.onPress();
      await Promise.resolve();
    });

    const submit = findEnabledButton(tree, "Registrar etiqueta aplicada");

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });

    const command = recordMarkdownApplication.mock.calls[0]?.[0];

    expect(command?.evidence).toEqual({
      kind: "no_photo_reason",
      reason: "Camera indisponivel",
    });
    expect(JSON.stringify(command)).not.toContain("uri");
    expect(JSON.stringify(command)).not.toContain("base64");
    expect(JSON.stringify(command)).not.toContain("objectKey");
  });

  it("requires safe evidence metadata before confirming markdown on shelf", async () => {
    const confirmMarkdownOnShelf = vi.fn((command: MarkdownShelfConfirmationCommand) =>
      Promise.resolve({
        id: command.workflowId,
        lotId: "lote-ovos",
        status: "shelf_confirmed" as const,
        currentStage: "shelf_confirmed" as const,
        requestedAt: "2030-01-10T09:00:00.000Z",
        requestedBy: "Colaborador local",
        requestReason: "rule_window" as const,
        approvedAt: "2030-01-10T10:00:00.000Z",
        approvedBy: "Lideranca local",
        appliedAt: "2030-01-10T11:00:00.000Z",
        appliedBy: "Colaborador local",
        applicationEvidence: { kind: "photo_recorded_placeholder" as const },
        shelfConfirmedAt: command.occurredAt,
        shelfConfirmedBy: command.actorLabel,
        shelfConfirmationEvidence: command.evidence,
        stageHistory: [
          {
            stage: "requested" as const,
            action: "request_markdown" as const,
            actorLabel: "Colaborador local",
            occurredAt: "2030-01-10T09:00:00.000Z",
          },
          {
            stage: "approved" as const,
            action: "approve_markdown" as const,
            actorLabel: "Lideranca local",
            occurredAt: "2030-01-10T10:00:00.000Z",
          },
          {
            stage: "applied" as const,
            action: "apply_markdown" as const,
            actorLabel: "Colaborador local",
            occurredAt: "2030-01-10T11:00:00.000Z",
            evidence: { kind: "photo_recorded_placeholder" as const },
          },
          {
            stage: "shelf_confirmed" as const,
            action: "confirm_markdown_on_shelf" as const,
            actorLabel: command.actorLabel,
            occurredAt: command.occurredAt,
            evidence: command.evidence,
          },
        ],
        createdAt: "2030-01-10T09:00:00.000Z",
        updatedAt: command.occurredAt,
      }),
    );
    const tree = await renderPanel(
      createRepository({ confirmMarkdownOnShelf }),
      markdownTask("confirm_markdown_on_shelf"),
    );

    expect(JSON.stringify(tree.toJSON())).toContain("Comprove na area de venda");
    expect(findDisabledButton(tree, "Confirmar etiqueta na area de venda")).toBeDefined();

    await act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: "Registrar foto da etiqueta na area de venda" })
        .props.onPress();
      await Promise.resolve();
    });

    const submit = findEnabledButton(tree, "Confirmar etiqueta na area de venda");

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });

    const command = confirmMarkdownOnShelf.mock.calls[0]?.[0];

    expect(command?.evidence).toEqual({ kind: "photo_recorded_placeholder" });
    expect(JSON.stringify(command)).not.toContain("uri");
    expect(JSON.stringify(command)).not.toContain("base64");
    expect(JSON.stringify(command)).not.toContain("objectKey");
  });
});
