import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { AlertChannelState } from "@validade-zero/domain";
import type {
  DevicePushRegistrationCommand,
  OfflineCacheStatus,
  PrepareTurnCacheStatus,
  SessionContextResponse,
  SyncCommandSummary,
  SyncConflictRecord,
  SyncQueueSummary,
} from "@validade-zero/contracts";
import type { AuthGateReadyControls } from "../auth/AuthGate";
import type { MobileBuildInfo } from "../build-info";
import { createFakePushAlertChannel, type PushAlertChannel } from "./alert-channel";
import { AjustesScreen } from "./AjustesScreen";
import { PendingCentralLotSyncError } from "./repository";
import type { CaptureRepository } from "./repository";
import type { SyncEngine } from "./sync-engine";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");
  return {
    StyleSheet: { create: <T extends Record<string, unknown>>(styles: T) => styles },
    Text: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Text", props, children),
    View: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("View", props, children),
    ScrollView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", props, children),
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

const ajustesSensitiveDenylist =
  /ExpoPushToken|googleServicesFile|firebase|providerTicket|providerReceipt|rawDeviceId|buildUrl|https:\/\/expo|expo\.dev|eas:\/\/|secret|password|token/i;

function registration(
  permissionStatus: DevicePushRegistrationCommand["permissionStatus"],
): DevicePushRegistrationCommand {
  return {
    deviceId: "aparelho-ajustes-ficticio",
    deviceLabel: "Celular FICTICIO",
    audienceRole: "shift_team",
    permissionStatus,
    ...(permissionStatus === "granted" ? { expoPushToken: "ExpoPushToken-FICTICIO" } : {}),
    registeredAt: "2030-01-10T09:00:00.000Z",
  };
}

function activeSession(overrides: Partial<SessionContextResponse> = {}): SessionContextResponse {
  return {
    actor: { subjectId: "worker-ficticio", displayName: "Colaborador FICTICIO" },
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    activeRole: "lead",
    capabilities: ["task.act", "command_center.read_store"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    actions: {
      canReadCommandCenter: true,
      canActOnTask: true,
      canReviewProductDrafts: false,
      canCloseShift: true,
      canReadStoreAudit: false,
      canManageUsers: false,
    },
    ...overrides,
  };
}

function buildInfo(overrides: Partial<MobileBuildInfo> = {}): MobileBuildInfo {
  return {
    appVersion: "0.12.0",
    appBuild: "138",
    environment: "staging",
    apiTarget: "https://api.ficticia.invalid",
    packageId: "com.validadezero.app",
    approvedArtifactLabel: "uat15-sync-debug-apk-138",
    approvedAppVersion: "0.12.0",
    approvedBuild: "138",
    buildRef: "sync-debug-138",
    buildCompatibility: "atual",
    ...overrides,
  };
}

function offlineReadyStatus(overrides: Partial<OfflineCacheStatus> = {}): OfflineCacheStatus {
  return {
    state: "offline_ready",
    lastRefreshedAt: "2030-01-10T09:00:00.000Z",
    activeTaskCount: 0,
    requiredLotSnippetCount: 0,
    staleAfterHours: 4,
    source: "today_open",
    updatedAt: "2030-01-10T09:00:00.000Z",
    ...overrides,
  };
}

function emptySyncQueue(overrides: Partial<SyncQueueSummary> = {}): SyncQueueSummary {
  return {
    state: "empty",
    totalCount: 0,
    conflictCount: 0,
    hasCriticalConflict: false,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    commands: [],
    updatedAt: "2030-01-10T09:05:00.000Z",
    ...overrides,
  };
}

function readyPrepareTurnCacheStatus(
  overrides: Partial<PrepareTurnCacheStatus> = {},
): PrepareTurnCacheStatus {
  return {
    state: "ready",
    source: "central",
    updatedAt: "2030-01-10T09:00:00.000Z",
    lastCentralReadAt: "2030-01-10T09:00:00.000Z",
    staleAfterHours: 4,
    productCount: 3,
    lotCount: 2,
    activeTaskCount: 1,
    conflictCount: 0,
    resolvedHistoryCount: 0,
    ...overrides,
  };
}

function prepareTurnWithoutCentralRead(): PrepareTurnCacheStatus {
  const { lastCentralReadAt, ...cache } = readyPrepareTurnCacheStatus();
  void lastCentralReadAt;
  return cache;
}

function syncCommandSummary(overrides: Partial<SyncCommandSummary> = {}): SyncCommandSummary {
  return {
    id: "sync-cmd-ajustes-001",
    kind: "resolve_task",
    state: "pending_sync",
    urgency: "high",
    productDisplayName: "Maca FICTICIA",
    lotIdentity: { identitySource: "printed", value: "MACA-AJUSTES-001" },
    currentLocation: { kind: "area_de_venda" },
    savedAt: "2030-01-10T10:00:00.000Z",
    ...overrides,
  };
}

function conflictRecord(overrides: Partial<SyncConflictRecord> = {}): SyncConflictRecord {
  return {
    id: "conflict-ajustes-001",
    commandId: "sync-cmd-conflito-ajustes",
    severity: "critical",
    reason: "Tarefa critica mudou antes do envio offline.",
    localAction: {
      commandId: "sync-cmd-conflito-ajustes",
      kind: "resolve_task",
      label: "Confirmar retirada",
      actorLabel: "Colaborador local",
      occurredAt: "2030-01-10T10:30:00.000Z",
      productDisplayName: "Maca FICTICIA",
      lotIdentity: { identitySource: "printed", value: "MACA-CONFLITO-001" },
      currentLocation: { kind: "area_de_venda" },
    },
    remoteChange: {
      kind: "task_changed",
      summary: "A tarefa atual exige reconferencia da area de venda.",
      changedAt: "2030-01-10T11:00:00.000Z",
    },
    allowedActions: ["keep_local_and_retry", "use_current_task", "discard_offline_action"],
    createdAt: "2030-01-10T11:05:00.000Z",
    ...overrides,
  };
}

function createAjustesRepository(
  input: {
    channel?: DevicePushRegistrationCommand | null;
    offlineStatus?: OfflineCacheStatus | undefined;
    queue?: SyncQueueSummary | (() => SyncQueueSummary) | undefined;
    conflict?: SyncConflictRecord | null | undefined;
    syncPendingCentralLots?: CaptureRepository["syncPendingCentralLots"] | undefined;
  } = {},
) {
  let channel = input.channel ?? null;
  const registerAlertDevice = vi.fn((command: DevicePushRegistrationCommand) => {
    channel = command;
    return Promise.resolve(command);
  });
  const resolveTodayTask = vi.fn();
  const resolveSyncConflict = vi.fn(
    (resolution: Parameters<CaptureRepository["resolveSyncConflict"]>[0]) =>
      Promise.resolve(
        conflictRecord({
          id: resolution.conflictId,
          resolutionAction: resolution.action,
          ...(resolution.reason === undefined ? {} : { resolutionReason: resolution.reason }),
          resolvedAt: resolution.resolvedAt,
        }),
      ),
  );
  const repository = {
    loadAlertChannelState: () => Promise.resolve(channel),
    registerAlertDevice,
    resolveTodayTask,
    loadOfflineCacheStatus: () => Promise.resolve(input.offlineStatus ?? offlineReadyStatus()),
    listSyncQueue: () =>
      Promise.resolve(
        typeof input.queue === "function" ? input.queue() : (input.queue ?? emptySyncQueue()),
      ),
    loadSyncConflict: () => Promise.resolve(input.conflict ?? null),
    resolveSyncConflict,
    ...(input.syncPendingCentralLots === undefined
      ? {}
      : { syncPendingCentralLots: input.syncPendingCentralLots }),
  } as unknown as CaptureRepository;

  return { repository, registerAlertDevice, resolveTodayTask, resolveSyncConflict };
}

function channelWithPermission(state: AlertChannelState): PushAlertChannel {
  return {
    getPermissionState: () => Promise.resolve({ state }),
    requestPermission: () => Promise.resolve({ state }),
    getExpoPushToken: () => Promise.resolve({ state: "unavailable" }),
    scheduleTaskNotification: () => Promise.resolve({ attemptState: "retry_pending" }),
    cancelTaskNotification: () => Promise.resolve(),
    subscribeToNotificationResponses: () => ({ remove: () => undefined }),
  };
}

async function renderAjustes(input: {
  alertChannel?: PushAlertChannel | undefined;
  authControls?: AuthGateReadyControls | undefined;
  buildInfo?: MobileBuildInfo | undefined;
  channel?: DevicePushRegistrationCommand | null | undefined;
  conflict?: SyncConflictRecord | null | undefined;
  offlineStatus?: OfflineCacheStatus | undefined;
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  onRequestCentralRefresh?: (() => void) | undefined;
  onConfirmCentralDeviceState?: (() => Promise<void>) | undefined;
  queue?: SyncQueueSummary | (() => SyncQueueSummary) | undefined;
  session?: SessionContextResponse | undefined;
  syncEngine?: SyncEngine | undefined;
  syncPendingCentralLots?: CaptureRepository["syncPendingCentralLots"] | undefined;
}): Promise<{
  tree: ReactTestRenderer;
  registerAlertDevice: ReturnType<typeof vi.fn>;
  resolveTodayTask: ReturnType<typeof vi.fn>;
  resolveSyncConflict: ReturnType<typeof vi.fn>;
}> {
  const { repository, registerAlertDevice, resolveSyncConflict, resolveTodayTask } =
    createAjustesRepository({
      channel: input.channel ?? null,
      conflict: input.conflict,
      offlineStatus: input.offlineStatus,
      queue: input.queue,
      syncPendingCentralLots: input.syncPendingCentralLots,
    });
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <AjustesScreen
        alertChannel={input.alertChannel ?? createFakePushAlertChannel()}
        authControls={input.authControls}
        buildInfo={input.buildInfo}
        onBack={() => undefined}
        onConfirmCentralDeviceState={input.onConfirmCentralDeviceState}
        onRequestCentralRefresh={input.onRequestCentralRefresh}
        prepareTurnCacheStatus={input.prepareTurnCacheStatus ?? readyPrepareTurnCacheStatus()}
        prepareTurnSource={input.prepareTurnSource ?? "central"}
        pushDeviceIdentity={{
          deviceId: "validade-zero-mobile:loja-ficticia",
          deviceLabel: "Android piloto - com.validadezero.app",
          audienceRole: "shift_team",
        }}
        repository={repository}
        session={input.session}
        syncEngine={input.syncEngine}
        now={() => new Date("2030-01-10T09:00:00.000Z")}
      />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  if (tree === undefined) throw new Error("Ajustes did not render.");
  return { tree, registerAlertDevice, resolveSyncConflict, resolveTodayTask };
}

async function press(tree: ReactTestRenderer, label: string): Promise<void> {
  const action = tree.root
    .findAllByType("Pressable")
    .find((candidate) => candidate.props.accessibilityLabel === label);
  if (action === undefined || typeof action.props.onPress !== "function") {
    throw new Error(`Expected action ${label}.`);
  }

  await act(async () => {
    action.props.onPress();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function findActionButtons(tree: ReactTestRenderer, label: string) {
  return tree.root
    .findAllByType("Pressable")
    .filter((candidate) => candidate.props.accessibilityLabel === label);
}

function renderedText(tree: ReactTestRenderer): string {
  return flattenText(tree.toJSON());
}

function flattenText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(flattenText).join("");
  }

  if (value !== null && typeof value === "object" && "children" in value) {
    return flattenText((value as { children?: unknown }).children);
  }

  return "";
}

describe("AjustesScreen push controls", () => {
  it.each([
    ["not_requested", null, "Atencao"],
    ["active", registration("granted"), "Apto"],
    ["local_only", registration("local_only"), "Atencao"],
    ["denied", registration("denied"), "Atencao"],
    ["unavailable", registration("unavailable"), "Atencao"],
    ["failed", null, "Atencao"],
  ] as const)("renders %s push state as %s", async (state, stored, verdict) => {
    const { tree } = await renderAjustes({
      alertChannel: channelWithPermission(state),
      channel: stored,
    });
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Push e lembretes");
    expect(rendered).toContain(verdict);
  });

  it("activates alerts by requesting permission and registering this device", async () => {
    const alertChannel = createFakePushAlertChannel({ permissionState: "not_requested" });
    const { tree, registerAlertDevice } = await renderAjustes({ alertChannel });

    await press(tree, "Ativar alertas do turno");

    expect(alertChannel.requestedPermissionCount).toBe(1);
    expect(registerAlertDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: "validade-zero-mobile:loja-ficticia",
        permissionStatus: "granted",
      }),
    );
  });

  it("disables only this-device alerts without hiding Hoje tasks", async () => {
    const { tree, registerAlertDevice } = await renderAjustes({
      channel: registration("granted"),
    });

    await press(tree, "Desativar neste aparelho");

    expect(registerAlertDevice).toHaveBeenCalledWith(
      expect.objectContaining({ permissionStatus: "denied" }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain("As tarefas continuam ativas em Hoje");
  });

  it("sends a this-device safe test without resolving tasks", async () => {
    const alertChannel = createFakePushAlertChannel({ permissionState: "active" });
    const { tree, resolveTodayTask } = await renderAjustes({
      alertChannel,
      channel: registration("granted"),
    });

    await press(tree, "Enviar teste neste aparelho");

    expect(alertChannel.scheduledNotifications).toHaveLength(1);
    expect(resolveTodayTask).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("prova apenas este aparelho");
  });

  it("keeps sensitive provider, token, build, and raw device copy out of Ajustes", async () => {
    const { tree } = await renderAjustes({
      alertChannel: channelWithPermission("failed"),
      channel: registration("local_only"),
    });

    expect(JSON.stringify(tree.toJSON())).not.toMatch(ajustesSensitiveDenylist);
  });
});

describe("AjustesScreen sync controls", () => {
  it("renders an empty sync queue as safe for sync close", async () => {
    const { tree } = await renderAjustes({});
    const text = renderedText(tree);

    expect(text).toContain("Sincronizacao");
    expect(text).toContain("Ultima leitura central");
    expect(text).toContain("10/01/2030");
    expect(text).toContain("06:00");
    expect(text).not.toContain("2030-01-10T09:00:00.000Z");
    expect(text).toContain("Fila local conferida");
    expect(text).toContain("Sync nao bloqueia o fechamento seguro nesta leitura.");
  });

  it("explains stale central reads with local time and a central refresh action", async () => {
    const onRequestCentralRefresh = vi.fn();
    const { tree } = await renderAjustes({
      onRequestCentralRefresh,
      prepareTurnCacheStatus: readyPrepareTurnCacheStatus({
        lastCentralReadAt: "2030-01-10T04:30:00.000Z",
        staleAfterHours: 4,
      }),
      queue: emptySyncQueue({ updatedAt: "2030-01-10T09:00:00.000Z" }),
    });
    const text = renderedText(tree);

    expect(text).toContain("Leitura central vencida");
    expect(text).toContain("10/01/2030");
    expect(text).toContain("01:30");
    expect(text).toContain("vale por ate 4h");
    expect(text).toContain("sincronizar pendencias nao renova esta leitura");
    expect(text).not.toContain("2030-01-10T04:30:00.000Z");

    await press(tree, "Atualizar leitura central");
    expect(onRequestCentralRefresh).toHaveBeenCalledOnce();
  });

  it("keeps non-critical pending sync as attention without blocking safe-close copy", async () => {
    const { tree } = await renderAjustes({
      queue: emptySyncQueue({
        state: "has_pending",
        totalCount: 1,
        highCount: 1,
        commands: [syncCommandSummary({ urgency: "high" })],
      }),
    });
    const text = renderedText(tree);

    expect(text).toContain("Atencao");
    expect(text).toContain("Ha pendencias nao criticas neste aparelho");
    expect(text).toContain("Sync nao bloqueia o fechamento seguro nesta leitura.");
    expect(text).not.toContain("Este estado bloqueia fechamento seguro");
  });

  it("blocks safe close when a critical command is pending central confirmation", async () => {
    const { tree } = await renderAjustes({
      queue: emptySyncQueue({
        state: "has_pending",
        totalCount: 1,
        criticalCount: 1,
        commands: [syncCommandSummary({ urgency: "critical" })],
      }),
    });
    const text = renderedText(tree);

    expect(text).toContain("Pendencia critica ainda nao confirmada pela central");
    expect(text).toContain("Este estado bloqueia fechamento seguro");
  });

  it("blocks safe close when there is a critical sync conflict", async () => {
    const { tree } = await renderAjustes({
      queue: emptySyncQueue({
        state: "has_conflict",
        totalCount: 1,
        conflictCount: 1,
        hasCriticalConflict: true,
        criticalCount: 1,
        commands: [
          syncCommandSummary({
            id: "sync-cmd-conflito-ajustes",
            state: "sync_conflict",
            urgency: "critical",
            conflictId: "conflict-ajustes-001",
          }),
        ],
      }),
    });
    const text = renderedText(tree);

    expect(text).toContain("Conflito critico de sincronizacao");
    expect(text).toContain("Revisar conflito");
    expect(text).toContain("Este estado bloqueia fechamento seguro");
  });

  it("blocks safe close when no central read is confirmed", async () => {
    const { tree } = await renderAjustes({
      prepareTurnCacheStatus: prepareTurnWithoutCentralRead(),
    });

    expect(renderedText(tree)).toContain("Sem leitura central confirmada");
  });

  it("shows only the central refresh action when the central read is missing", async () => {
    const onRequestCentralRefresh = vi.fn();
    const { tree } = await renderAjustes({
      onRequestCentralRefresh,
      prepareTurnCacheStatus: prepareTurnWithoutCentralRead(),
      queue: emptySyncQueue({
        state: "has_pending",
        totalCount: 1,
        highCount: 1,
        commands: [syncCommandSummary({ urgency: "high" })],
      }),
      syncEngine: {
        syncPendingCommands: vi.fn().mockResolvedValue({
          state: "empty",
          network: { kind: "online" },
          selectedCommandIds: [],
          attemptedCommandIds: [],
          appliedResults: [],
        }),
      },
    });

    expect(findActionButtons(tree, "Atualizar leitura central")).toHaveLength(1);
    expect(findActionButtons(tree, "Sincronizar pendencias")).toHaveLength(0);
    expect(renderedText(tree)).toContain("Fila local neste aparelho");
    expect(renderedText(tree)).not.toContain("Tentar sincronizar novamente");
  });

  it("blocks safe close for a local-cache-only prepare state", async () => {
    const { tree } = await renderAjustes({
      prepareTurnCacheStatus: readyPrepareTurnCacheStatus({ source: "local_cache" }),
      prepareTurnSource: "local_cache",
    });
    const text = renderedText(tree);

    expect(text).toContain("Leitura local em uso");
    expect(text).toContain("Este estado bloqueia fechamento seguro");
  });

  it("shows a single pending-sync action while the queue details stay read-only", async () => {
    const syncPendingCommands = vi.fn().mockResolvedValue({
      state: "empty",
      network: { kind: "online" },
      selectedCommandIds: [],
      attemptedCommandIds: [],
      appliedResults: [],
    });
    const { tree } = await renderAjustes({
      queue: emptySyncQueue({
        state: "has_pending",
        totalCount: 1,
        highCount: 1,
        commands: [syncCommandSummary({ urgency: "high" })],
      }),
      syncEngine: { syncPendingCommands },
    });

    expect(findActionButtons(tree, "Sincronizar pendencias")).toHaveLength(1);
    expect(renderedText(tree)).toContain("Fila local neste aparelho");
    expect(renderedText(tree)).not.toContain("Tentar sincronizar novamente");
  });

  it("runs manual sync from Ajustes with the manual flag", async () => {
    const syncPendingCommands = vi.fn().mockResolvedValue({
      state: "empty",
      network: { kind: "online" },
      selectedCommandIds: [],
      attemptedCommandIds: [],
      appliedResults: [],
    });
    const { tree } = await renderAjustes({
      queue: emptySyncQueue({
        state: "has_pending",
        totalCount: 1,
        highCount: 1,
        commands: [syncCommandSummary({ urgency: "high" })],
      }),
      syncEngine: { syncPendingCommands },
    });

    await press(tree, "Sincronizar pendencias");

    expect(syncPendingCommands).toHaveBeenCalledWith({ manual: true });
  });

  it("skips pending lot replay when central refresh already reconciled the queue", async () => {
    let queue = emptySyncQueue({
      state: "has_pending",
      totalCount: 1,
      mediumCount: 1,
      commands: [],
    });
    const onConfirmCentralDeviceState = vi.fn().mockImplementation(() => {
      queue = emptySyncQueue();
      return Promise.resolve();
    });
    const syncPendingCentralLots = vi.fn().mockResolvedValue([]);
    const { tree } = await renderAjustes({
      queue: () => queue,
      onConfirmCentralDeviceState,
      syncPendingCentralLots,
    });

    await press(tree, "Sincronizar pendencias");

    expect(onConfirmCentralDeviceState).toHaveBeenCalledTimes(1);
    expect(syncPendingCentralLots).not.toHaveBeenCalled();
    expect(renderedText(tree)).toContain(
      "Leitura central conferida. A fila local foi reconciliada.",
    );
  });

  it("syncs pending central lots from Ajustes even when command queue is empty", async () => {
    const syncPendingCentralLots = vi
      .fn()
      .mockResolvedValue([{ id: "lote-melancia-centralizado" }]);
    const { tree } = await renderAjustes({
      queue: emptySyncQueue(),
      syncEngine: {
        syncPendingCommands: vi.fn().mockResolvedValue({
          state: "empty",
          network: { kind: "online" },
          selectedCommandIds: [],
          attemptedCommandIds: [],
          appliedResults: [],
        }),
      },
      syncPendingCentralLots,
    });

    await press(tree, "Conferir fila local");

    expect(syncPendingCentralLots).toHaveBeenCalledTimes(1);
    expect(renderedText(tree)).toContain("Lote enviado para a central");
  });

  it("explains pending central lots from Ajustes when command sync is absent", async () => {
    const syncPendingCentralLots = vi.fn().mockResolvedValue([]);
    const onConfirmCentralDeviceState = vi.fn().mockResolvedValue(undefined);
    const { tree } = await renderAjustes({
      queue: emptySyncQueue({
        state: "has_pending",
        totalCount: 1,
        mediumCount: 1,
        commands: [],
      }),
      onConfirmCentralDeviceState,
      syncPendingCentralLots,
    });

    await press(tree, "Sincronizar pendencias");

    expect(onConfirmCentralDeviceState).toHaveBeenCalledTimes(2);
    expect(syncPendingCentralLots).toHaveBeenCalledTimes(1);
    expect(renderedText(tree)).toContain("Ainda existe lote salvo neste aparelho");
  });

  it("shows the central blocker when Ajustes replay is rejected", async () => {
    const syncPendingCentralLots = vi
      .fn()
      .mockRejectedValue(new PendingCentralLotSyncError("central_lot_write_failed"));
    const { tree } = await renderAjustes({
      queue: emptySyncQueue({
        state: "has_pending",
        totalCount: 1,
        mediumCount: 1,
        commands: [],
      }),
      syncPendingCentralLots,
    });

    await press(tree, "Sincronizar pendencias");

    expect(syncPendingCentralLots).toHaveBeenCalledTimes(1);
    expect(renderedText(tree)).toContain("A central ainda nao confirmou o envio do lote");
  });

  it("sends an explicit reason when discarding an offline conflict", async () => {
    const { tree, resolveSyncConflict } = await renderAjustes({
      conflict: conflictRecord(),
      queue: emptySyncQueue({
        state: "has_conflict",
        totalCount: 1,
        conflictCount: 1,
        hasCriticalConflict: true,
        criticalCount: 1,
        commands: [
          syncCommandSummary({
            id: "sync-cmd-conflito-ajustes",
            state: "sync_conflict",
            urgency: "critical",
            conflictId: "conflict-ajustes-001",
            productDisplayName: "Maca FICTICIA",
            lotIdentity: { identitySource: "printed", value: "MACA-CONFLITO-001" },
          }),
        ],
      }),
    });

    await press(tree, "Revisar conflito");

    const reasonInput = tree.root.findByProps({
      accessibilityLabel: "Motivo para descartar a acao offline",
    });

    await act(async () => {
      reasonInput.props.onChangeText("Tarefa atual exige nova conferencia fisica.");
      await Promise.resolve();
    });

    await press(tree, "Descartar acao offline");

    expect(resolveSyncConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        conflictId: "conflict-ajustes-001",
        action: "discard_offline_action",
        reason: "Tarefa atual exige nova conferencia fisica.",
      }),
    );
  });
});

describe("AjustesScreen account, build, privacy, and sign-out controls", () => {
  it("renders public-safe installed and approved build truth", async () => {
    const { tree } = await renderAjustes({ buildInfo: buildInfo() });
    const text = renderedText(tree);

    expect(text).toContain("Atualizacao do app");
    expect(text).toContain("uat15-sync-debug-apk-138");
    expect(text).toContain("0.12.0");
    expect(text).toContain("138");
    expect(text).toContain("API:");
    expect(text).toContain("Pacote:");
    expect(JSON.stringify(tree.toJSON())).not.toMatch(ajustesSensitiveDenylist);
  });

  it("opens the manual update step without rendering private artifact links", async () => {
    const { tree } = await renderAjustes({
      buildInfo: buildInfo({ buildCompatibility: "desatualizado" }),
    });

    await press(tree, "Ver passo de atualizacao");

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain("Instale manualmente o APK aprovado do piloto");
    expect(rendered).not.toMatch(ajustesSensitiveDenylist);
  });

  it("renders account and store as read-only and opens privacy through AuthGate controls", async () => {
    const openPrivacyCenter = vi.fn();
    const requestLogout = vi.fn();
    const { tree } = await renderAjustes({
      authControls: { openPrivacyCenter, requestLogout },
      session: activeSession(),
    });
    const text = renderedText(tree);

    expect(text).toContain("Conta e loja");
    expect(text).toContain("Colaborador FICTICIO");
    expect(text).toContain("Loja Ficticia Piloto");
    expect(text).toContain("loja-ficticia");
    expect(text).toContain("Lideranca");
    expect(text).toContain("Conta ativa");
    expect(text).toContain("2030-01-11T12:00:00.000Z");
    expect(text).toContain(
      "Se loja ou papel estiver errado, fale com lideranca ou administracao. Esta fase nao troca loja manualmente.",
    );
    expect(text).not.toMatch(/trocar loja|alterar loja|mudar papel/i);

    await press(tree, "Abrir Centro de Privacidade");

    expect(openPrivacyCenter).toHaveBeenCalledOnce();
  });

  it("requires sign-out confirmation and keeps pending work untouched", async () => {
    const openPrivacyCenter = vi.fn();
    const requestLogout = vi.fn();
    const syncPendingCommands = vi.fn().mockResolvedValue({
      state: "empty",
      network: { kind: "online" },
      selectedCommandIds: [],
      attemptedCommandIds: [],
      appliedResults: [],
    });
    const { resolveSyncConflict, resolveTodayTask, tree } = await renderAjustes({
      authControls: { openPrivacyCenter, requestLogout },
      queue: emptySyncQueue({
        state: "has_conflict",
        totalCount: 2,
        conflictCount: 1,
        hasCriticalConflict: true,
        criticalCount: 1,
        highCount: 1,
        commands: [
          syncCommandSummary({
            id: "sync-cmd-conflito-ajustes",
            state: "sync_conflict",
            urgency: "critical",
            conflictId: "conflict-ajustes-001",
          }),
          syncCommandSummary({ id: "sync-cmd-pendente-ajustes", urgency: "high" }),
        ],
      }),
      syncEngine: { syncPendingCommands },
    });

    await press(tree, "Sair da conta");

    expect(requestLogout).not.toHaveBeenCalled();
    expect(renderedText(tree)).toContain(
      "Sair encerra a sessao neste aparelho. Pendencias locais ou conflitos continuam pendentes e nenhuma tarefa sera resolvida.",
    );
    expect(renderedText(tree)).toContain("Pendencias: 2. Conflitos: 1.");

    await press(tree, "Continuar nos Ajustes");

    expect(renderedText(tree)).toContain("Ajustes");
    expect(renderedText(tree)).not.toContain("Pendencias locais ou conflitos continuam pendentes");

    await press(tree, "Sair da conta");
    await press(tree, "Confirmar saida da conta");

    expect(requestLogout).toHaveBeenCalledOnce();
    expect(resolveTodayTask).not.toHaveBeenCalled();
    expect(resolveSyncConflict).not.toHaveBeenCalled();
    expect(syncPendingCommands).not.toHaveBeenCalled();
  });
});
