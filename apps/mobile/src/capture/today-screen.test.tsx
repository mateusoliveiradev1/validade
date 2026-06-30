import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type {
  OfflineCacheStatus,
  PrepareTurnCacheStatus,
  SyncConflictRecord,
  SyncCommandSummary,
  SyncQueueSummary,
  FutureAttentionRecord,
  TaskAlertStateRecord,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import type { CaptureRepository, TodayTaskRefreshResult } from "./repository";
import type { SyncEngine } from "./sync-engine";
import { TodayScreen } from "./TodayScreen";
import { createMemoryCaptureRepository } from "./memory-repository";

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
    updatedAt: "2030-01-10T09:00:00.000Z",
    ...overrides,
  };
}

function createRepository(
  refreshTodayTasks: CaptureRepository["refreshTodayTasks"],
  overrides: Partial<CaptureRepository> = {},
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
        lotId: "lote-ficticio",
      }),
    registerAlertDevice: (input) => Promise.resolve(input),
    loadAlertChannelState: () => Promise.resolve(null),
    refreshTaskAlertStates: () => Promise.resolve([]),
    listTaskAlertStates: () => Promise.resolve([]),
    recordAlertAttempt: () => Promise.reject(new Error("not used")),
    acknowledgeEscalation: () => Promise.reject(new Error("not used")),
    resolvePushOpenIntent: (input) => Promise.resolve({ ...input, result: "task_missing" }),
    loadOfflineCacheStatus: () => Promise.resolve(offlineReadyStatus()),
    listSyncQueue: () => Promise.resolve(emptySyncQueue()),
    saveOfflineAction: () => Promise.reject(new Error("not used")),
    markSyncCommandAttempt: () => Promise.resolve([]),
    applySyncTransportResult: () => Promise.reject(new Error("not used")),
    resolveSyncConflict: () => Promise.reject(new Error("not used")),
    loadSyncConflict: () => Promise.resolve(null),
    ...overrides,
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

function markdownStageTask(
  requiredResolution: Extract<
    TodayTaskRecord["requiredResolution"],
    "approve_markdown" | "apply_markdown" | "confirm_markdown_on_shelf"
  >,
  createdAt = "2030-01-10T09:00:00.000Z",
): TodayTaskRecord {
  const stage =
    requiredResolution === "approve_markdown"
      ? "requested"
      : requiredResolution === "apply_markdown"
        ? "approved"
        : "applied";

  return taskFixture({
    id: `tarefa-${requiredResolution}`,
    activeKey: `markdown:workflow-${requiredResolution}:${stage}`,
    lotId: `lote-${requiredResolution}`,
    productDisplayName: "Queijo FICTICIO",
    lotIdentity: { identitySource: "printed", value: `QUEIJO-${stage}` },
    currentLocation: { kind: "area_de_venda" },
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
    priority: requiredResolution === "confirm_markdown_on_shelf" ? 1 : 2,
    createdAt,
    markdownWorkflowId: `workflow-${requiredResolution}`,
    markdownStage: stage,
  });
}

function escalatedAlertState(task: TodayTaskRecord): TaskAlertStateRecord {
  return {
    taskId: task.id,
    taskActiveKey: task.activeKey,
    channelState: "active",
    attemptState: "sent",
    audience: "leadership",
    escalationState: "escalated",
    createdAt: "2030-01-10T09:00:00.000Z",
    updatedAt: "2030-01-10T12:00:00.000Z",
    escalatedAt: "2030-01-10T12:00:00.000Z",
  };
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

function syncCommandSummary(overrides: Partial<SyncCommandSummary> = {}): SyncCommandSummary {
  return {
    id: "sync-cmd-ficticio-001",
    kind: "resolve_task",
    state: "pending_sync",
    urgency: "critical",
    productDisplayName: "Ovos FICTICIOS",
    lotIdentity: { identitySource: "printed", value: "OVOS-FICTICIOS-001" },
    currentLocation: { kind: "area_de_venda" },
    savedAt: "2030-01-10T10:00:00.000Z",
    ...overrides,
  };
}

function conflictRecord(overrides: Partial<SyncConflictRecord> = {}): SyncConflictRecord {
  return {
    id: "conflict-ficticio-001",
    commandId: "sync-cmd-conflito",
    severity: "critical",
    reason: "Tarefa critica mudou antes do envio offline.",
    localAction: {
      commandId: "sync-cmd-conflito",
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

function findButton(tree: ReactTestRenderer, label: string): ReactTestInstance {
  return tree.root.findByProps({ accessibilityLabel: label });
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

async function renderTodayScreen(
  repository: CaptureRepository,
  syncEngine?: SyncEngine,
  prepareTurn?: {
    status: PrepareTurnCacheStatus;
    source: "central" | "local_cache";
  },
  options: {
    onConfirmCentralDeviceState?: (() => Promise<void>) | undefined;
    onRequestCentralRefresh?: (() => void) | undefined;
  } = {},
): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <TodayScreen
        repository={repository}
        onRegisterLot={() => undefined}
        onOpenRecentLots={() => undefined}
        syncEngine={syncEngine}
        prepareTurnCacheStatus={prepareTurn?.status}
        prepareTurnSource={prepareTurn?.source}
        onConfirmCentralDeviceState={options.onConfirmCentralDeviceState}
        onRequestCentralRefresh={options.onRequestCentralRefresh}
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

describe("TodayScreen", () => {
  it("renders the safe empty Hoje entry with registration and recent-lot paths", async () => {
    const repository = createRepository(() => Promise.resolve(emptyRefresh()));
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Hoje");
    expect(rendered).toContain("Nenhum bloqueio ativo na leitura central");
    expect(rendered).toContain("Registrar lote");
    expect(rendered).toContain("Conferir lotes recentes");
  });

  it("keeps healthy sync and offline diagnostics out of the default Hoje scan", async () => {
    const repository = createRepository(() => Promise.resolve(emptyRefresh()));
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Nenhum bloqueio ativo na leitura central");
    expect(rendered).not.toContain("Alertas ajudam a cobrar");
    expect(rendered).not.toContain("Pronto para operar sem internet");
    expect(rendered).not.toContain("Tudo sincronizado neste aparelho");
  });

  it("keeps Hoje as the task execution surface after Ajustes control extraction", async () => {
    const repository = createRepository(() =>
      Promise.resolve(refreshWith({ tasks: [expiredTask()] })),
    );
    const tree = await renderTodayScreen(repository);
    const text = renderedText(tree);

    expect(text).toContain("Area de venda com risco agora");
    expect(text).toContain("Retirar agora");
    expect(text).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
    expect(text).not.toContain("Sair com pendencias visiveis");
  });

  it("renders local-cache prepare state near the verdict without safe styling", async () => {
    const repository = createRepository(() => Promise.resolve(emptyRefresh()));
    const tree = await renderTodayScreen(repository, undefined, {
      status: readyPrepareTurnCacheStatus({ source: "local_cache" }),
      source: "local_cache",
    });
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered.indexOf("Leitura central local ou pendente")).toBeLessThan(
      rendered.indexOf("Local"),
    );
    expect(rendered).toContain("Leitura local em uso desde");
    expect(rendered).toContain("Nao declare area segura sem preparar a central.");
    expect(rendered).not.toContain("Area segura com leitura central");
  });

  it("renders stale central read as a Today blocker with a refresh action", async () => {
    const requestCentralRefresh = vi.fn();
    const repository = createRepository(() => Promise.resolve(emptyRefresh()));
    const tree = await renderTodayScreen(
      repository,
      undefined,
      {
        status: readyPrepareTurnCacheStatus({
          lastCentralReadAt: "2030-01-10T06:00:00.000Z",
          staleAfterHours: 2,
        }),
        source: "central",
      },
      { onRequestCentralRefresh: requestCentralRefresh },
    );
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Leitura central");
    expect(rendered).toContain("Atualizar leitura central");

    await act(async () => {
      findButton(tree, "Atualizar leitura central").props.onPress();
      await Promise.resolve();
    });

    expect(requestCentralRefresh).toHaveBeenCalledOnce();
  });

  it("renders offline mode with cached tasks and keeps task paths available", async () => {
    const repository = createRepository(
      () => Promise.resolve(refreshWith({ tasks: [expiredTask()] })),
      {
        loadOfflineCacheStatus: () =>
          Promise.resolve(
            offlineReadyStatus({
              state: "offline_mode",
              activeTaskCount: 1,
              requiredLotSnippetCount: 1,
            }),
          ),
      },
    );
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Sem internet agora. Usando tarefas salvas neste aparelho.");
    expect(rendered).toContain("Retirar agora");
    expect(rendered).toContain("Ovos FICTICIOS - lote OVOS-FICTICIOS-001");
  });

  it("renders offline unavailable copy when this device has no cache", async () => {
    const repository = createRepository(() => Promise.resolve(emptyRefresh()), {
      loadOfflineCacheStatus: () =>
        Promise.resolve(
          offlineReadyStatus({
            state: "offline_unavailable",
            lastRefreshedAt: undefined,
            activeTaskCount: 0,
            requiredLotSnippetCount: 0,
          }),
        ),
    });
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Conecte uma vez para preparar o trabalho offline");
    expect(rendered).toContain(
      "Ainda nao ha tarefas salvas neste aparelho. Conecte para baixar as tarefas do turno e os dados essenciais dos lotes.",
    );
  });

  it("warns when cached tasks may be stale", async () => {
    const repository = createRepository(() => Promise.resolve(emptyRefresh()), {
      loadOfflineCacheStatus: () =>
        Promise.resolve(
          offlineReadyStatus({
            state: "offline_stale",
            lastRefreshedAt: "2030-01-10T04:00:00.000Z",
          }),
        ),
    });
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain(
      "Tarefas salvas podem estar desatualizadas. Sincronize antes de marcar a area como segura.",
    );
  });

  it("renders pending sync text in a task row", async () => {
    const repository = createRepository(() =>
      Promise.resolve(
        refreshWith({
          tasks: [
            taskFixture({
              id: "tarefa-pendente-sync",
              sync: {
                state: "pending_sync",
                savedAt: "2030-01-10T10:00:00.000Z",
                pendingCommandId: "sync-cmd-ficticio-001",
                attemptCount: 0,
              },
            }),
          ],
        }),
      ),
    );
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Pendente central. Ainda nao use como confirmacao da loja.");
  });

  it("renders critical conflicts before pending commands in the compact queue", async () => {
    const repository = createRepository(() => Promise.resolve(emptyRefresh()), {
      listSyncQueue: () =>
        Promise.resolve(
          emptySyncQueue({
            state: "has_conflict",
            totalCount: 2,
            conflictCount: 1,
            hasCriticalConflict: true,
            criticalCount: 1,
            highCount: 1,
            commands: [
              syncCommandSummary({
                id: "sync-cmd-pendente",
                state: "pending_sync",
                urgency: "high",
                productDisplayName: "Banana FICTICIA",
                lotIdentity: { identitySource: "printed", value: "BANANA-PENDENTE-001" },
              }),
              syncCommandSummary({
                id: "sync-cmd-conflito",
                state: "sync_conflict",
                urgency: "critical",
                productDisplayName: "Maca FICTICIA",
                lotIdentity: { identitySource: "printed", value: "MACA-CONFLITO-001" },
                conflictId: "conflict-ficticio-001",
              }),
            ],
          }),
        ),
    });
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());
    const text = renderedText(tree);

    expect(text).toContain("1 criticas, 1 altas, 0 medias");
    expect(rendered.indexOf("MACA-CONFLITO-001")).toBeLessThan(
      rendered.indexOf("BANANA-PENDENTE-001"),
    );
    expect(rendered).toContain("Conflito de sincronizacao. Revise antes de confirmar esta acao.");
  });

  it("disables the manual sync CTA while queue sync is already running", async () => {
    const repository = createRepository(() => Promise.resolve(emptyRefresh()), {
      listSyncQueue: () =>
        Promise.resolve(
          emptySyncQueue({
            state: "syncing",
            totalCount: 1,
            criticalCount: 1,
            commands: [syncCommandSummary({ state: "syncing" })],
          }),
        ),
    });
    const tree = await renderTodayScreen(repository);
    const syncingButtons = tree.root.findAllByProps({
      accessibilityLabel: "Sincronizando pendencias",
    });

    expect(
      syncingButtons.some((button) => button.props.accessibilityState?.disabled === true),
    ).toBe(true);
  });

  it("runs manual sync from Hoje and refreshes queue state", async () => {
    const syncPendingCommands = vi.fn().mockResolvedValue({
      state: "sent",
      network: { kind: "online" },
      selectedCommandIds: ["sync-cmd-ficticio-001"],
      attemptedCommandIds: ["sync-cmd-ficticio-001"],
      appliedResults: [
        {
          status: "ack",
          commandId: "sync-cmd-ficticio-001",
          idempotencyKey: "sync-cmd-ficticio-001",
          syncedAt: "2030-01-10T12:00:00.000Z",
        },
      ],
    });
    const repository = createRepository(() => Promise.resolve(emptyRefresh()), {
      listSyncQueue: () =>
        Promise.resolve(
          emptySyncQueue({
            state: "has_pending",
            totalCount: 1,
            criticalCount: 1,
            commands: [syncCommandSummary()],
          }),
        ),
    });
    const tree = await renderTodayScreen(repository, { syncPendingCommands });
    const syncButton = findButton(tree, "Sincronizar pendencias");

    await act(async () => {
      syncButton.props.onPress();
      await Promise.resolve();
    });

    expect(syncPendingCommands).toHaveBeenCalledWith({ manual: true });
  });

  it("syncs pending central lots from Hoje when manual sync is visible", async () => {
    const syncPendingCentralLots = vi.fn().mockResolvedValue([
      {
        id: "lote-centralizado-ficticio",
        productId: "produto-melancia-ficticia",
        productDisplayName: "Melancia FICTICIA",
        identity: { identitySource: "printed", value: "MELANCIA-001" },
        mode: "processed_repack_loss",
        expiresAt: "2030-01-10",
        approximateQuantity: 1,
        initialLocation: { kind: "area_de_venda" },
        currentObservation: {
          id: "obs-melancia-001",
          lotId: "lote-centralizado-ficticio",
          status: "present",
          actorLabel: "Colaborador local",
          occurredAt: "2030-01-10T09:00:00.000Z",
          location: { kind: "area_de_venda" },
          quantityState: "estimated",
          approximateQuantity: 1,
          isCorrection: false,
        },
      },
    ]);
    const refreshTodayTasks = vi
      .fn()
      .mockResolvedValueOnce(emptyRefresh())
      .mockResolvedValueOnce(
        refreshWith({
          tasks: [
            taskFixture({
              id: "task-melancia-presenca",
              activeKey: "lote-melancia:presence_missing:check_presence:root",
              lotId: "lote-melancia",
              productDisplayName: "Melancia FICTICIA",
              lotIdentity: { identitySource: "printed", value: "MELANCIA-001" },
              riskState: "uncertain",
              severity: "attention",
              dueBucket: "today",
              requiredResolution: "check_presence",
              section: "follow_up",
              sourceRisk: {
                state: "uncertain",
                reasons: [{ code: "presence_missing", field: "lastPhysicalConfirmation" }],
              },
            }),
          ],
        }),
      );
    const repository = createRepository(refreshTodayTasks, {
      syncPendingCentralLots,
      listSyncQueue: () =>
        Promise.resolve(
          emptySyncQueue({
            state: "has_pending",
            totalCount: 1,
            commands: [syncCommandSummary()],
          }),
        ),
    });
    const syncPendingCommands = vi.fn().mockResolvedValue({
      state: "empty",
      network: { kind: "online" },
      selectedCommandIds: [],
      attemptedCommandIds: [],
      appliedResults: [],
    });
    const tree = await renderTodayScreen(repository, { syncPendingCommands });

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: "Sincronizar pendencias" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(syncPendingCentralLots).toHaveBeenCalledTimes(1);
    expect(refreshTodayTasks).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(tree.toJSON())).toContain("Melancia FICTICIA");
  });

  it("shows feedback when only a pending central lot remains without command sync", async () => {
    const syncPendingCentralLots = vi.fn().mockResolvedValue([]);
    const onConfirmCentralDeviceState = vi.fn().mockResolvedValue(undefined);
    const repository = createRepository(() => Promise.resolve(emptyRefresh()), {
      syncPendingCentralLots,
      listSyncQueue: () =>
        Promise.resolve(
          emptySyncQueue({
            state: "has_pending",
            totalCount: 1,
            mediumCount: 1,
            commands: [],
          }),
        ),
    });
    const tree = await renderTodayScreen(repository, undefined, undefined, {
      onConfirmCentralDeviceState,
    });

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: "Sincronizar pendencias" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onConfirmCentralDeviceState).toHaveBeenCalledTimes(1);
    expect(syncPendingCentralLots).toHaveBeenCalledTimes(1);
    expect(renderedText(tree)).toContain("Ainda existe lote salvo neste aparelho");
  });

  it("requires a reason before discarding an offline conflict", async () => {
    const resolveSyncConflict = vi.fn().mockResolvedValue(conflictRecord());
    const repository = createRepository(() => Promise.resolve(emptyRefresh()), {
      listSyncQueue: () =>
        Promise.resolve(
          emptySyncQueue({
            state: "has_conflict",
            totalCount: 1,
            conflictCount: 1,
            hasCriticalConflict: true,
            criticalCount: 1,
            commands: [
              syncCommandSummary({
                id: "sync-cmd-conflito",
                state: "sync_conflict",
                conflictId: "conflict-ficticio-001",
                productDisplayName: "Maca FICTICIA",
                lotIdentity: { identitySource: "printed", value: "MACA-CONFLITO-001" },
              }),
            ],
          }),
        ),
      loadSyncConflict: () => Promise.resolve(conflictRecord()),
      resolveSyncConflict,
    });
    const tree = await renderTodayScreen(repository);
    const reviewButton = findButton(tree, "Revisar conflito");

    await act(async () => {
      reviewButton.props.onPress();
      await Promise.resolve();
    });

    const renderedConflict = JSON.stringify(tree.toJSON());
    const conflictText = renderedText(tree);
    const disabledDiscard = tree.root
      .findAllByProps({ accessibilityLabel: "Descartar acao offline" })
      .find((button) => button.props.accessibilityState?.disabled === true);

    expect(renderedConflict).toContain("Confirmar retirada");
    expect(renderedConflict).toContain("Maca FICTICIA - lote MACA-CONFLITO-001");
    expect(conflictText).toContain("Local:");
    expect(conflictText).toContain("venda");
    expect(conflictText).toContain("Acao local as");
    expect(conflictText).toContain("A tarefa atual exige reconferencia da area de venda.");
    expect(disabledDiscard).toBeDefined();

    const reasonInput = tree.root.findByProps({
      accessibilityLabel: "Motivo para descartar a acao offline",
    });

    await act(async () => {
      reasonInput.props.onChangeText("Tarefa atual exige nova conferencia fisica.");
      await Promise.resolve();
    });

    const enabledDiscard = tree.root
      .findAllByProps({ accessibilityLabel: "Descartar acao offline" })
      .find((button) => button.props.accessibilityState?.disabled === false);

    await act(async () => {
      enabledDiscard?.props.onPress();
      await Promise.resolve();
    });

    expect(resolveSyncConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        conflictId: "conflict-ficticio-001",
        action: "discard_offline_action",
        reason: "Tarefa atual exige nova conferencia fisica.",
      }),
    );
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

  it("renders markdown stage labels and keeps escalation status visible", async () => {
    const finalTask = markdownStageTask("confirm_markdown_on_shelf", "2030-01-09T18:00:00.000Z");
    const repository = createRepository(
      () =>
        Promise.resolve(
          refreshWith({
            tasks: [
              markdownStageTask("approve_markdown"),
              markdownStageTask("apply_markdown"),
              finalTask,
            ],
          }),
        ),
      {
        refreshTaskAlertStates: () => Promise.resolve([escalatedAlertState(finalTask)]),
      },
    );
    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Aprovar rebaixa");
    expect(rendered).toContain("Aplicar rebaixa");
    expect(rendered).toContain("Conferir etiqueta na area de venda");
    expect(rendered).toContain("Conferencia da etiqueta atrasada");
    expect(rendered).toContain("Lideranca avisada as");
    expect(rendered).toContain("Cobrando responsavel e lideranca");
  });

  it("keeps pre-Phase-15 formal lots visible and task-producing without classifier metadata", async () => {
    let nextIdentifier = 1;
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => `pre-phase-15-${nextIdentifier++}`,
    });
    await repository.initialize();
    const product = await repository.createProduct({
      displayName: "Queijo Minas PRE-PHASE-15 FICTICIO",
      categoryId: "categoria-pre-phase-15",
      categoryRuleProfile: {
        categoryId: "categoria-pre-phase-15",
        mode: "formal_validity",
        windows: {
          radarDays: 60,
          markdownDays: 15,
          criticalDays: 3,
          expiredDays: 0,
        },
      },
    });
    await repository.saveLot({
      actorLabel: "Colaboradora PRE-PHASE-15",
      lot: {
        productId: product.id,
        identity: { identitySource: "printed", value: "QUEIJO-PRE15-001" },
        mode: "formal_validity",
        expiresAt: "2030-01-20",
        approximateQuantity: 6,
        initialLocation: { kind: "area_de_venda" },
      },
    });

    const tree = await renderTodayScreen(repository);
    const rendered = JSON.stringify(tree.toJSON());
    const tasks = await repository.listActiveTodayTasks();

    expect(rendered).toContain("Pedir rebaixa");
    expect(rendered).toContain("Queijo Minas PRE-PHASE-15 FICTICIO");
    expect(rendered).toContain("QUEIJO-PRE15-001");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.requiredResolution).toBe("request_markdown");
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

    expect(rendered).toContain("Area de venda com risco agora");
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

    expect(rendered.indexOf("Monitoramento futuro")).toBeGreaterThan(
      rendered.indexOf("Retirar agora"),
    );
    expect(rendered).toContain(
      "Sem tarefa ativa agora. Estes lotes ficam no radar para a proxima leitura central.",
    );
    expect(rendered).toContain("Banana FICTICIA - lote BANANA-RADAR-FICTICIO");

    act(() => {
      taskButton.props.onPress();
    });

    expect(openTask).toHaveBeenCalledWith(expect.objectContaining({ id: "tarefa-ficticia-001" }));
  });
});
