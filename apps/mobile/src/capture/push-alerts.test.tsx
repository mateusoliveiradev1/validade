import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  DevicePushRegistrationCommand,
  FutureAttentionRecord,
  PushOpenIntent,
  TaskAlertStateRecord,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import { createFakePushAlertChannel, type PushAlertChannel } from "./alert-channel";
import {
  applyAlertDeliveryResult,
  type CaptureRepository,
  type TodayTaskRefreshResult,
} from "./repository";
import { CaptureApp } from "./CaptureApp";
import { TodayScreen } from "./TodayScreen";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const hardwareBackHandlers = vi.hoisted(() => new Set<() => boolean>());

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
    BackHandler: {
      addEventListener: (_eventName: "hardwareBackPress", handler: () => boolean) => {
        hardwareBackHandlers.add(handler);
        return {
          remove: () => {
            hardwareBackHandlers.delete(handler);
          },
        };
      },
    },
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
  PermissionStatus: {
    DENIED: "denied",
    GRANTED: "granted",
    UNDETERMINED: "undetermined",
  },
  useCameraPermissions: () => [{ granted: false }, () => Promise.resolve(false)],
}));
vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: { open: () => undefined },
}));
vi.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: () => ({ remove: () => undefined }),
  cancelScheduledNotificationAsync: () => Promise.resolve(undefined),
  getExpoPushTokenAsync: () => Promise.resolve({ data: "ExpoPushToken-FICTICIO-PUSH" }),
  getPermissionsAsync: () => Promise.resolve({ status: "undetermined" }),
  requestPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  scheduleNotificationAsync: () => Promise.resolve("notificacao-ficticia-push"),
}));
vi.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: () => ({}),
}));
vi.mock("expo-constants", () => ({
  default: {
    easConfig: { projectId: "projeto-ficticio-push" },
    expoConfig: { extra: { eas: { projectId: "projeto-ficticio-push" } } },
  },
}));

const now = new Date("2030-01-10T09:00:00.000Z");

afterEach(() => {
  hardwareBackHandlers.clear();
  vi.unstubAllGlobals();
});

function latestHardwareBackHandler(): () => boolean {
  const handlers = Array.from(hardwareBackHandlers);
  const handler = handlers[handlers.length - 1];
  if (handler === undefined) throw new Error("Expected a registered Android back handler.");
  return handler;
}

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

function createRepository(
  input: {
    tasks?: readonly TodayTaskRecord[];
    alertStates?: readonly TaskAlertStateRecord[];
    channel?: DevicePushRegistrationCommand | null;
    resolveIntent?: (payload: {
      taskId: string;
      taskActiveKey: string;
      openedAt: string;
    }) => PushOpenIntent;
  } = {},
) {
  const tasks = [...(input.tasks ?? [expiredTask()])];
  let channel = input.channel ?? null;
  let states = [...(input.alertStates ?? [])];
  const resolveTodayTask = vi.fn();
  const recordAlertAttempt = vi.fn((command) => {
    const existing =
      states.find((state) => state.taskId === command.taskId) ??
      alertState(tasks.find((task) => task.id === command.taskId) ?? tasks[0]);
    const recorded = applyAlertDeliveryResult({
      existing,
      attemptId: command.attemptId,
      attemptedAt: command.attemptedAt,
      result: command.result,
    });

    states = states.some((state) => state.taskId === recorded.taskId)
      ? states.map((state) => (state.taskId === recorded.taskId ? recorded : state))
      : [...states, recorded];

    return Promise.resolve(recorded);
  });
  const acknowledgeEscalation = vi.fn((command) => {
    const existing =
      states.find((state) => state.taskId === command.taskId) ?? alertState(tasks[0]);
    const acknowledged = {
      ...existing,
      escalationState: "leadership_acknowledged",
      leadershipAcknowledgedAt: command.acknowledgedAt,
      updatedAt: command.acknowledgedAt,
    } satisfies TaskAlertStateRecord;
    states = states.map((state) => (state.taskId === acknowledged.taskId ? acknowledged : state));

    return Promise.resolve(acknowledged);
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
    recordAlertAttempt,
    acknowledgeEscalation,
    resolvePushOpenIntent: (payload) =>
      Promise.resolve(
        input.resolveIntent?.(payload) ?? {
          ...payload,
          result: "task_missing",
        },
      ),
  };

  return { repository, resolveTodayTask, recordAlertAttempt, acknowledgeEscalation };
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

    expect(rendered.indexOf("Area de venda com risco agora")).toBeLessThan(
      rendered.indexOf("Alertas ajudam a cobrar"),
    );
    expect(channel.requestedPermissionCount).toBe(0);

    const activate = tree.root.findByProps({ accessibilityLabel: "Ativar alertas do turno" });

    await act(async () => {
      activate.props.onPress();
      await Promise.resolve();
    });

    expect(channel.requestedPermissionCount).toBe(1);
    expect(JSON.stringify(tree.toJSON())).not.toContain("Alertas do turno ativos neste aparelho.");
    expect(JSON.stringify(tree.toJSON())).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
  });

  it("hides the healthy active-alert state from Hoje without hiding tasks", async () => {
    const { repository } = createRepository({ channel: registration("granted") });
    const tree = await renderToday({ repository });
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).not.toContain("Alertas do turno ativos neste aparelho.");
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
    expect(rendered).toContain("Retirar agora");
  });

  it("schedules the initial alert when a now task appears on opening Hoje", async () => {
    const task = expiredTask();
    const channel = createFakePushAlertChannel({
      permissionState: "active",
      clock: () => "2030-01-10T09:00:00.000Z",
    });
    const { repository, recordAlertAttempt } = createRepository({
      channel: registration("granted"),
      tasks: [task],
      alertStates: [
        alertState(task, {
          attemptState: "pending",
          channelState: "active",
          lastReminderAt: undefined,
        }),
      ],
    });

    await renderToday({ repository, alertChannel: channel });

    expect(channel.scheduledNotifications).toHaveLength(1);
    expect(channel.scheduledNotifications[0]?.command.title).toBe("Retirar agora: Ovos FICTICIOS");
    expect(channel.scheduledNotifications[0]?.command.data).toEqual({
      taskId: task.id,
      taskActiveKey: task.activeKey,
    });
    expect(recordAlertAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: task.id,
        taskActiveKey: task.activeKey,
        result: { status: "ok" },
      }),
    );
  });

  it.each([
    ["denied", "Alertas desativados neste aparelho. As tarefas continuam ativas em Hoje."],
    [
      "unavailable",
      "Alertas remotos ainda nao estao prontos neste aparelho. As tarefas continuam ativas em Hoje.",
    ],
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

  it("keeps native Firebase setup errors out of the operator UI", async () => {
    const { repository } = createRepository({ channel: null });
    const firebaseFailure: PushAlertChannel = {
      getPermissionState: () => Promise.resolve({ state: "not_requested" }),
      requestPermission: () => Promise.resolve({ state: "active" }),
      getExpoPushToken: () =>
        Promise.resolve({
          state: "failed",
          reason:
            "Unable to get Firebase Messaging instance. Did you configure googleServicesFile?",
        }),
      scheduleTaskNotification: () => Promise.resolve({ attemptState: "retry_pending" }),
      cancelTaskNotification: () => Promise.resolve(),
      subscribeToNotificationResponses: () => ({ remove: () => undefined }),
    };
    const tree = await renderToday({ repository, alertChannel: firebaseFailure });
    const activate = tree.root.findByProps({ accessibilityLabel: "Ativar alertas do turno" });

    await act(async () => {
      activate.props.onPress();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain(
      "Lembretes locais do turno ativos neste aparelho. O push remoto ainda precisa do Firebase no APK.",
    );
    expect(rendered).not.toContain("Unable to get Firebase Messaging");
    expect(rendered).not.toContain("googleServicesFile");
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
  });

  it("falls back to local-only reminders when the native build has no Firebase token", async () => {
    const task = expiredTask();
    const localChannel = createFakePushAlertChannel({
      permissionState: "active",
      tokenResult: {
        state: "failed",
        reason: "Unable to get Firebase Messaging instance. Did you configure googleServicesFile?",
      },
      clock: () => "2030-01-10T09:00:00.000Z",
    });
    const { repository, recordAlertAttempt } = createRepository({
      channel: null,
      tasks: [task],
      alertStates: [
        alertState(task, {
          attemptState: "pending",
          channelState: "active",
          lastReminderAt: undefined,
        }),
      ],
    });
    const tree = await renderToday({ repository, alertChannel: localChannel });
    const activate = tree.root.findByProps({ accessibilityLabel: "Ativar alertas do turno" });

    await act(async () => {
      activate.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    const registrationState = await repository.loadAlertChannelState();
    const rendered = JSON.stringify(tree.toJSON());

    expect(registrationState).toMatchObject({ permissionStatus: "local_only" });
    expect(localChannel.scheduledNotifications).toHaveLength(1);
    expect(localChannel.scheduledNotifications[0]?.command.data).toEqual({
      taskId: task.id,
      taskActiveKey: task.activeKey,
    });
    expect(recordAlertAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: task.id,
        taskActiveKey: task.activeKey,
        result: { status: "ok" },
      }),
    );
    expect(rendered).toContain(
      "Lembretes locais do turno ativos neste aparelho. O push remoto ainda precisa do Firebase no APK.",
    );
    expect(rendered).not.toContain("Unable to get Firebase Messaging");
    expect(rendered).not.toContain("googleServicesFile");
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
  it("registers remote push with the operational device id when the app opens", async () => {
    const { repository } = createRepository();
    const registerPushDeviceClient = vi.fn(() => Promise.resolve());
    const channel = createFakePushAlertChannel({ permissionState: "active" });

    await act(async () => {
      create(
        <CaptureApp
          repository={repository}
          alertChannel={channel}
          registerPushDeviceClient={registerPushDeviceClient}
          storeId="loja-18"
          deviceId="validade-zero-mobile:loja-18:install-ficticio"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(registerPushDeviceClient).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: "validade-zero-mobile:loja-18:install-ficticio",
        deviceLabel: expect.stringContaining("Android piloto"),
        permissionStatus: "granted",
        expoPushToken: "ExpoPushToken-FICTICIO-001",
      }),
    );
    expect(registerPushDeviceClient).not.toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: "local-alert-device" }),
    );
  });

  it("uses the Android back gesture to return from task resolution to Hoje", async () => {
    const task = expiredTask();
    const { repository } = createRepository({ tasks: [task] });
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <CaptureApp repository={repository} alertChannel={createFakePushAlertChannel()} />,
      );
      await Promise.resolve();
    });

    const taskButton = tree?.root.findByProps({
      accessibilityLabel: "Retirar agora: Ovos FICTICIOS, lote OVOS-FICTICIOS-001",
    });

    await act(async () => {
      taskButton?.props.onPress();
      await Promise.resolve();
    });

    expect(JSON.stringify(tree?.toJSON())).toContain("Acao exigida:");

    await act(async () => {
      const backHandler = latestHardwareBackHandler();
      expect(backHandler?.()).toBe(true);
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree?.toJSON());

    expect(rendered).toContain("Hoje");
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
    expect(rendered).not.toContain("Acao exigida:");
  });

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
    ["task_resolved", "Esta pendencia ja foi resolvida fisicamente. Confira as tarefas restantes."],
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
