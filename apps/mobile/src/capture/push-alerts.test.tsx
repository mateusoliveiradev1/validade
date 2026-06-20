import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type {
  DevicePushRegistrationCommand,
  FutureAttentionRecord,
  PushOpenIntent,
  TaskAlertStateRecord,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import { createFakePushAlertChannel, type PushAlertChannel } from "./alert-channel";
import type { CaptureRepository, TodayTaskRefreshResult } from "./repository";
import { CaptureApp } from "./CaptureApp";
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
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
    StatusBar: (props: Record<string, unknown>) => React.createElement("StatusBar", props),
  };
});

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: () =>
    Promise.resolve({
      execAsync: () => Promise.resolve(undefined),
      getAllAsync: () => Promise.resolve([]),
      getFirstAsync: () => Promise.resolve(null),
      runAsync: () => Promise.resolve(undefined),
      withTransactionAsync: (task: () => Promise<void>) => task(),
    }),
}));
vi.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false }, () => Promise.resolve(false)],
}));
vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: { open: () => undefined },
}));

const now = new Date("2030-01-10T09:00:00.000Z");

function expiredTask(overrides: Partial<TodayTaskRecord> = {}): TodayTaskRecord {
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
    ...overrides,
  };
}

function refreshWith(tasks: readonly TodayTaskRecord[]): TodayTaskRefreshResult {
  return {
    metadata: {
      refreshedAt: now.toISOString(),
      activeTaskCount: tasks.length,
      futureAttentionCount: 0,
      source: "today_open",
    },
    tasks,
    futureAttention: [] satisfies readonly FutureAttentionRecord[],
  };
}

function alertState(
  task: TodayTaskRecord,
  overrides: Partial<TaskAlertStateRecord> = {},
): TaskAlertStateRecord {
  return {
    taskId: task.id,
    taskActiveKey: task.activeKey,
    channelState: "active",
    attemptState: "sent",
    audience: "shift_team",
    escalationState: "not_escalated",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    nextReminderAt: "2030-01-10T09:15:00.000Z",
    ...overrides,
  };
}

function registration(
  permissionStatus: DevicePushRegistrationCommand["permissionStatus"],
): DevicePushRegistrationCommand {
  return {
    deviceId: "aparelho-ficticio-alertas",
    deviceLabel: "Celular do turno FICTICIO",
    audienceRole: "shift_team",
    permissionStatus,
    ...(permissionStatus === "granted" ? { expoPushToken: "ExpoPushToken-FICTICIO-UI" } : {}),
    registeredAt: "2030-01-10T08:55:00.000Z",
  };
}

function createRepository(input: {
  tasks?: readonly TodayTaskRecord[];
  alertStates?: readonly TaskAlertStateRecord[];
  channel?: DevicePushRegistrationCommand | null;
  resolveIntent?: (payload: { taskId: string; taskActiveKey: string; openedAt: string }) => PushOpenIntent;
} = {}) {
  const tasks = [...(input.tasks ?? [expiredTask()])];
  let channel = input.channel ?? null;
  let states = [...(input.alertStates ?? [])];
  const resolveTodayTask = vi.fn();
  const acknowledgeEscalation = vi.fn(async (command) => {
    const existing = states.find((state) => state.taskId === command.taskId) ?? alertState(tasks[0]);
    const acknowledged = {
      ...existing,
      escalationState: "leadership_acknowledged",
      leadershipAcknowledgedAt: command.acknowledgedAt,
      updatedAt: command.acknowledgedAt,
    } satisfies TaskAlertStateRecord;
    states = states.map((state) => (state.taskId === acknowledged.taskId ? acknowledged : state));

    return acknowledged;
  });
  const repository: CaptureRepository = {
    initialize: () => Promise.resolve(),
    createProduct: () => Promise.reject(new Error("not used")),
    findProducts: () => Promise.resolve([]),
    saveLot: () => Promise.reject(new Error("not used")),
    appendObservation: () => Promise.reject(new Error("not used")),
    listRecentLots: () => Promise.resolve([]),
    loadLotDetail: () => Promise.resolve(null),
    refreshTodayTasks: () => Promise.resolve(refreshWith(tasks)),
    listActiveTodayTasks: () => Promise.resolve(tasks.filter((task) => task.status === "active")),
    listFutureAttention: () => Promise.resolve([]),
    resolveTodayTask,
    loadTodayTask: (taskId) => Promise.resolve(tasks.find((task) => task.id === taskId) ?? null),
    registerAlertDevice: (command) => {
      channel = command;
      return Promise.resolve(command);
    },
    loadAlertChannelState: () => Promise.resolve(channel),
    refreshTaskAlertStates: () => Promise.resolve(states),
    listTaskAlertStates: () => Promise.resolve(states),
    recordAlertAttempt: () => Promise.reject(new Error("not used")),
    acknowledgeEscalation,
    resolvePushOpenIntent: (payload) =>
      Promise.resolve(
        input.resolveIntent?.(payload) ?? {
          ...payload,
          result: "task_missing",
        },
      ),
  };

  return { repository, resolveTodayTask, acknowledgeEscalation };
}

async function renderToday(input: {
  repository: CaptureRepository;
  alertChannel?: PushAlertChannel;
}): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <TodayScreen
        alertChannel={input.alertChannel}
        repository={input.repository}
        onRegisterLot={() => undefined}
        onOpenRecentLots={() => undefined}
        now={() => now}
      />,
    );
    await Promise.resolve();
  });

  if (tree === undefined) {
    throw new Error("TodayScreen did not render.");
  }

  return tree;
}

describe("Hoje push alert UI", () => {
  it("keeps safety verdict first and requests permission only from the alert CTA", async () => {
    const { repository } = createRepository({ channel: null });
    const channel = createFakePushAlertChannel({ permissionState: "not_requested" });
    const tree = await renderToday({ repository, alertChannel: channel });
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered.indexOf("Area de venda com 1 risco(s) agora")).toBeLessThan(
      rendered.indexOf("Alertas ajudam a cobrar"),
    );
    expect(channel.requestedPermissionCount).toBe(0);

    const activate = tree.root.findByProps({ accessibilityLabel: "Ativar alertas do turno" });

    await act(async () => {
      activate.props.onPress();
      await Promise.resolve();
    });

    expect(channel.requestedPermissionCount).toBe(1);
    expect(JSON.stringify(tree.toJSON())).toContain("Alertas do turno ativos neste aparelho.");
  });

  it.each([
    ["granted", "Alertas do turno ativos neste aparelho."],
    ["denied", "Alertas desativados neste aparelho. As tarefas continuam ativas em Hoje."],
    ["unavailable", "Nao foi possivel preparar alertas agora. Confira a conexao e tente novamente."],
  ] as const)("renders %s channel state without hiding tasks", async (permissionStatus, copy) => {
    const { repository } = createRepository({ channel: registration(permissionStatus) });
    const tree = await renderToday({ repository });
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain(copy);
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
    expect(rendered).toContain("Retirar agora");
  });

  it("renders failed and retry-pending states without resolving or dimming tasks", async () => {
    const task = expiredTask();
    const { repository } = createRepository({
      alertStates: [alertState(task, { attemptState: "retry_pending" })],
    });
    const failingChannel: PushAlertChannel = {
      getPermissionState: () => Promise.resolve({ state: "not_requested" }),
      requestPermission: () => Promise.reject(new Error("native failure")),
      getExpoPushToken: () => Promise.resolve({ state: "failed", reason: "native failure" }),
      scheduleTaskNotification: () => Promise.resolve({ attemptState: "retry_pending" }),
      cancelTaskNotification: () => Promise.resolve(),
      subscribeToNotificationResponses: () => ({ remove: () => undefined }),
    };
    const tree = await renderToday({ repository, alertChannel: failingChannel });

    expect(JSON.stringify(tree.toJSON())).toContain(
      "Alerta pendente. Vamos tentar novamente sem esconder a tarefa.",
    );

    const activate = tree.root.findByProps({ accessibilityLabel: "Ativar alertas do turno" });

    await act(async () => {
      activate.props.onPress();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain(
      "Alerta falhou. A tarefa continua ativa em Hoje e precisa ser cobrada manualmente se necessario.",
    );
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
  });

  it("shows escalation acknowledgement while keeping the task visible", async () => {
    const task = expiredTask();
    const { repository, resolveTodayTask, acknowledgeEscalation } = createRepository({
      alertStates: [
        alertState(task, {
          attemptState: "pending",
          audience: "responsible_and_leadership",
          escalationState: "escalated",
          escalatedAt: "2030-01-10T09:30:00.000Z",
        }),
      ],
    });
    const tree = await renderToday({ repository });
    const acknowledge = tree.root.findByProps({
      accessibilityLabel: "Confirmar recebimento da cobranca",
    });

    expect(JSON.stringify(tree.toJSON())).toContain("Cobrando responsavel e lideranca");

    await act(async () => {
      acknowledge.props.onPress();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(acknowledgeEscalation).toHaveBeenCalledOnce();
    expect(resolveTodayTask).not.toHaveBeenCalled();
    expect(rendered).toContain("Recebimento confirmado pela lideranca as");
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
  });
});

describe("push notification routing", () => {
  it("opens only a current matching active task", async () => {
    const task = expiredTask();
    const channel = createFakePushAlertChannel({
      clock: () => "2030-01-10T09:05:00.000Z",
    });
    const { repository } = createRepository({
      tasks: [task],
      resolveIntent: (payload) => ({ ...payload, result: "current_task" }),
    });
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(<CaptureApp repository={repository} alertChannel={channel} />);
      await Promise.resolve();
    });

    await act(async () => {
      channel.emitNotificationResponse({ taskId: task.id, taskActiveKey: task.activeKey });
      await Promise.resolve();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree?.toJSON());

    expect(rendered).toContain("Acao exigida:");
    expect(rendered).toContain("Retirar agora");
  });

  it.each([
    ["task_updated", "Esta pendencia foi atualizada. Abra a tarefa atual em Hoje."],
    [
      "task_resolved",
      "Esta pendencia ja foi resolvida fisicamente. Confira as tarefas restantes.",
    ],
    ["task_missing", "Nao foi possivel abrir esta notificacao. Confira as tarefas ativas em Hoje."],
  ] as const)("shows %s fallback in Hoje", async (result, copy) => {
    const task = expiredTask();
    const channel = createFakePushAlertChannel({
      clock: () => "2030-01-10T09:05:00.000Z",
    });
    const { repository } = createRepository({
      tasks: [task],
      resolveIntent: (payload) => ({ ...payload, result }),
    });
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(<CaptureApp repository={repository} alertChannel={channel} />);
      await Promise.resolve();
    });

    await act(async () => {
      channel.emitNotificationResponse({ taskId: task.id, taskActiveKey: task.activeKey });
      await Promise.resolve();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree?.toJSON());

    expect(rendered).toContain(copy);
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
  });

  it("ignores malformed payloads and keeps manual task opening working", async () => {
    const task = expiredTask();
    const channel = createFakePushAlertChannel();
    const { repository } = createRepository({ tasks: [task] });
    const openTask = vi.fn();
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <TodayScreen
          alertChannel={channel}
          repository={repository}
          onRegisterLot={() => undefined}
          onOpenRecentLots={() => undefined}
          onOpenTask={openTask}
          now={() => now}
        />,
      );
      await Promise.resolve();
    });

    channel.emitNotificationResponse({
      taskId: task.id,
      taskActiveKey: task.activeKey,
      lotIdentity: "OVOS-FICTICIOS-001",
    });

    const taskButton = tree?.root.findByProps({
      accessibilityLabel: "Retirar agora: Ovos FICTICIOS, lote OVOS-FICTICIOS-001",
    });

    act(() => {
      taskButton?.props.onPress();
    });

    expect(openTask).toHaveBeenCalledWith(expect.objectContaining({ id: task.id }));
  });
});
