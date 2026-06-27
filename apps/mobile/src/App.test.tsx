import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileAuthClient } from "./auth/AuthGate";
import type {
  MarkdownWorkflowRecord,
  OfflineCacheStatus,
  PrepareTurnResponse,
  SyncCommandSummary,
  SyncQueueSummary,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import type { CaptureLotDetail, CaptureRepository, MarkdownEntryState } from "./capture/repository";

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
    ScrollView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", props, children),
    Image: (props: Record<string, unknown>) => React.createElement("Image", props),
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
vi.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: () => ({ remove: () => undefined }),
  cancelScheduledNotificationAsync: () => Promise.resolve(undefined),
  getExpoPushTokenAsync: () => Promise.resolve({ data: "ExpoPushToken-FICTICIO-SMOKE" }),
  getPermissionsAsync: () => Promise.resolve({ status: "undetermined" }),
  requestPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  scheduleNotificationAsync: () => Promise.resolve("notificacao-ficticia-smoke"),
}));
vi.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: () => ({}),
}));
vi.mock("expo-constants", () => ({
  default: {
    easConfig: { projectId: "projeto-ficticio-smoke" },
    expoConfig: { extra: { eas: { projectId: "projeto-ficticio-smoke" } } },
  },
}));
vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: { open: () => undefined },
}));

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

function syncCommandSummary(overrides: Partial<SyncCommandSummary> = {}): SyncCommandSummary {
  return {
    id: "sync-cmd-smoke-001",
    kind: "resolve_task",
    state: "pending_sync",
    urgency: "critical",
    productDisplayName: "Produto Rebaixa FICTICIO",
    lotIdentity: { identitySource: "printed", value: "REB-001" },
    currentLocation: { kind: "area_de_venda" },
    savedAt: "2030-01-10T10:00:00.000Z",
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

const authenticatedMobileClient: MobileAuthClient = {
  authHeaders: () => ({ Authorization: "Bearer fake-session" }),
  readSession: () =>
    Promise.resolve({
      actor: { subjectId: "collaborator-local", displayName: "Colaborador FICTICIO" },
      store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
      activeRole: "collaborator",
      capabilities: ["task.act", "command_center.read_store"],
      sessionExpiresAt: "2030-01-11T12:00:00.000Z",
      accountStatus: "active",
      canRequestRecovery: true,
      privacyCenterUrl: "/privacy",
      actions: {
        canReadCommandCenter: true,
        canActOnTask: true,
        canReviewProductDrafts: false,
        canCloseShift: false,
        canReadStoreAudit: false,
        canManageUsers: false,
      },
    }),
  login: () => Promise.reject(new Error("not used")),
  validateInvite: () => Promise.resolve({ status: "invalid" }),
  activateInvite: () => Promise.reject(new Error("not used")),
  requestRecovery: () => Promise.resolve(),
  submitPrivacyRequest: () => Promise.resolve(),
  prepareTurn: () => Promise.resolve(preparedTurnResponse()),
  searchCentralProducts: () => Promise.reject(new Error("not used")),
  createProductDraft: () => Promise.reject(new Error("not used")),
  createCentralLot: () => Promise.reject(new Error("not used")),
  logout: () => Promise.resolve(),
};

function preparedTurnResponse(): PrepareTurnResponse {
  return {
    requestId: "prepare-turn-smoke",
    store: {
      storeId: "loja-ficticia",
      storeName: "Loja Ficticia Piloto",
      centralVersion: 1,
      generatedAt: "2030-01-10T09:00:00.000Z",
      centralReadAt: "2030-01-10T09:00:00.000Z",
      source: "central",
      readiness: "prepared",
      blockers: [],
    },
    device: {
      deviceId: "validade-zero-mobile:loja-ficticia",
      preparedAt: "2030-01-10T09:00:00.000Z",
      lastCentralReadAt: "2030-01-10T09:00:00.000Z",
      lastHydratedAt: "2030-01-10T09:00:00.000Z",
      pendingCommandCount: 0,
      conflictCount: 0,
      source: "central",
    },
    cache: {
      state: "ready",
      source: "central",
      updatedAt: "2030-01-10T09:00:00.000Z",
      lastCentralReadAt: "2030-01-10T09:00:00.000Z",
      staleAfterHours: 4,
      productCount: 1,
      lotCount: 1,
      activeTaskCount: 1,
      conflictCount: 0,
      resolvedHistoryCount: 0,
    },
    products: [
      {
        centralProductId: "product-smoke",
        displayName: "Produto Smoke FICTICIO",
        categoryId: "categoria-smoke",
        categoryName: "Categoria Smoke",
        status: "validated",
        state: "synchronized",
        source: "central",
        updatedAt: "2030-01-10T09:00:00.000Z",
        categoryRuleProfile: {
          categoryId: "categoria-smoke",
          mode: "formal_validity",
          windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
        },
      },
    ],
    lots: [
      {
        centralLotId: "lot-smoke",
        centralProductId: "product-smoke",
        productDisplayName: "Produto Smoke FICTICIO",
        lotIdentity: { identitySource: "printed", value: "LOTE-SMOKE-FICTICIO" },
        mode: "formal_validity",
        currentLocation: { kind: "area_de_venda" },
        state: "synchronized",
        source: "central",
        riskState: "expired",
        expiresAt: "2030-01-09",
        approximateQuantity: 1,
        updatedAt: "2030-01-10T09:00:00.000Z",
      },
    ],
    activeTasks: [
      {
        centralTaskId: "task-smoke",
        activeKey: "lot-smoke:expired:withdraw_or_loss:root",
        centralLotId: "lot-smoke",
        productDisplayName: "Produto Smoke FICTICIO",
        currentLocation: { kind: "area_de_venda" },
        riskState: "expired",
        severity: "critical",
        requiredResolution: "withdraw_or_loss",
        state: "synchronized",
        source: "central",
        ownerLabel: "Equipe do turno",
        dueAt: "2030-01-10T09:00:00.000Z",
        updatedAt: "2030-01-10T09:00:00.000Z",
      },
    ],
    resolvedHistory: [],
    conflicts: [],
  };
}

function lotDetailFixture(): CaptureLotDetail {
  const currentObservation = {
    id: "observacao-rebaixa",
    lotId: "lote-rebaixa",
    status: "present" as const,
    actorLabel: "Colaborador FICTICIO",
    occurredAt: "2030-01-10T09:00:00.000Z",
    location: { kind: "area_de_venda" as const },
    quantityState: "estimated" as const,
    approximateQuantity: 12,
    isCorrection: false,
  };

  return {
    id: "lote-rebaixa",
    productId: "produto-rebaixa",
    productDisplayName: "Produto Rebaixa FICTICIO",
    identity: { identitySource: "printed", value: "REB-001" },
    mode: "formal_validity",
    expiresAt: "2030-01-15",
    approximateQuantity: 12,
    initialLocation: { kind: "area_de_venda" },
    currentObservation,
    product: {
      id: "produto-rebaixa",
      displayName: "Produto Rebaixa FICTICIO",
      categoryId: "categoria-rebaixa",
      categoryRuleProfile: {
        categoryId: "categoria-rebaixa",
        mode: "formal_validity",
      },
      normalizedName: "produto rebaixa ficticio",
      createdAt: "2030-01-10T08:00:00.000Z",
    },
    observations: [currentObservation],
  };
}

function markdownWorkflowFixture(status: MarkdownWorkflowRecord["status"]): MarkdownWorkflowRecord {
  return {
    id: "workflow-rebaixa",
    lotId: "lote-rebaixa",
    status,
    currentStage: status,
    requestedAt: "2030-01-10T10:00:00.000Z",
    requestedBy: "Colaborador local",
    requestReason: "rule_window",
    stageHistory: [
      {
        stage: "requested",
        action: "request_markdown",
        actorLabel: "Colaborador local",
        occurredAt: "2030-01-10T10:00:00.000Z",
      },
    ],
    createdAt: "2030-01-10T10:00:00.000Z",
    updatedAt: "2030-01-10T10:00:00.000Z",
  };
}

function markdownTodayTask(): TodayTaskRecord {
  return {
    id: "tarefa-aplicar-rebaixa",
    activeKey: "markdown:workflow-rebaixa:approved",
    lotId: "lote-rebaixa",
    productDisplayName: "Produto Rebaixa FICTICIO",
    lotIdentity: { identitySource: "printed", value: "REB-001" },
    currentLocation: { kind: "area_de_venda" },
    riskState: "markdown_due",
    severity: "high",
    dueBucket: "shift",
    requiredResolution: "apply_markdown",
    section: "request_markdown",
    ownerLabel: "Equipe do turno",
    status: "active",
    sourceRisk: {
      state: "markdown_due",
      reasons: [{ code: "expires_in_15_days", field: "markdownWorkflow" }],
    },
    priority: 2,
    createdAt: "2030-01-10T10:00:00.000Z",
    updatedAt: "2030-01-10T10:00:00.000Z",
    markdownWorkflowId: "workflow-rebaixa",
    markdownStage: "approved",
  };
}

function createRepositoryForDetail(
  entryState: MarkdownEntryState,
  overrides: Partial<CaptureRepository> = {},
): CaptureRepository {
  const detail = lotDetailFixture();

  return {
    initialize: () => Promise.resolve(),
    createProduct: () => Promise.reject(new Error("not used")),
    findProducts: () => Promise.resolve([]),
    saveLot: () => Promise.reject(new Error("not used")),
    appendObservation: () => Promise.resolve(detail.currentObservation),
    listRecentLots: () => Promise.resolve([detail]),
    loadLotDetail: () => Promise.resolve(detail),
    refreshTodayTasks: (input) =>
      Promise.resolve({
        metadata: {
          refreshedAt: input.currentTimestamp,
          activeTaskCount: 0,
          futureAttentionCount: 0,
          source: input.source,
        },
        tasks: [],
        futureAttention: [],
      }),
    listActiveTodayTasks: () => Promise.resolve([]),
    listFutureAttention: () => Promise.resolve([]),
    resolveTodayTask: () => Promise.reject(new Error("not used")),
    loadTodayTask: () => Promise.resolve(null),
    requestMarkdown: () => Promise.resolve(markdownWorkflowFixture("requested")),
    decideMarkdown: () => Promise.reject(new Error("not used")),
    recordMarkdownApplication: () => Promise.reject(new Error("not used")),
    confirmMarkdownOnShelf: () => Promise.reject(new Error("not used")),
    loadMarkdownWorkflowForLot: () => Promise.resolve(null),
    listActiveMarkdownWorkflows: () => Promise.resolve([]),
    loadMarkdownEntryState: () => Promise.resolve(entryState),
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

async function renderCaptureApp(repository: CaptureRepository): Promise<ReactTestRenderer> {
  const { CaptureApp } = await import("./capture/CaptureApp");
  const { createFakePushAlertChannel } = await import("./capture/alert-channel");
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <CaptureApp repository={repository} alertChannel={createFakePushAlertChannel()} />,
    );
    await Promise.resolve();
  });

  if (tree === undefined) {
    throw new Error("CaptureApp did not render.");
  }

  return tree;
}

async function press(tree: ReactTestRenderer, label: string): Promise<void> {
  const button = tree.root
    .findAllByType("Pressable")
    .find((candidate) => String(candidate.props.accessibilityLabel ?? "").includes(label));

  if (button === undefined || typeof button.props.onPress !== "function") {
    throw new Error(`Expected a pressable action named ${label}.`);
  }

  await act(async () => {
    button.props.onPress();
    await Promise.resolve();
  });
}

function disabledButton(tree: ReactTestRenderer, label: string) {
  return tree.root
    .findAllByType("Pressable")
    .find(
      (candidate) =>
        candidate.props.accessibilityLabel === label &&
        candidate.props.accessibilityState?.disabled === true,
    );
}

function inputByLabel(tree: ReactTestRenderer, label: string) {
  const input = tree.root
    .findAllByType("TextInput")
    .find((candidate) => candidate.props.accessibilityLabel === label);

  if (input === undefined) {
    throw new Error(`Expected an input named ${label}.`);
  }

  return input;
}

async function openLotDetail(tree: ReactTestRenderer): Promise<void> {
  await press(tree, "Conferir lotes recentes");
  await press(tree, "Produto Rebaixa FICTICIO");
}

describe("Validade Zero mobile smoke", () => {
  it("renders the Hoje first entry point with registration reachable", async () => {
    const { default: App } = await import("../App");
    const { createFakePushAlertChannel } = await import("./capture/alert-channel");
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <App alertChannel={createFakePushAlertChannel()} authClient={authenticatedMobileClient} />,
      );
      await Promise.resolve();
    });

    expect(tree).toBeDefined();
    if (tree === undefined) throw new Error("App did not render.");
    expect(JSON.stringify(tree.toJSON())).toContain("Preparar turno");

    await press(tree, "Preparar turno");
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Hoje");
    expect(rendered).toContain("Area de venda segura");
    expect(rendered).toContain("Ativar alertas do turno");
    expect(rendered).toContain("Atualizar tarefas");
    expect(rendered).toContain("Registrar lote");
  });

  it("renders Hoje with offline sync status and a pending local action marker", async () => {
    const pendingTask: TodayTaskRecord = {
      ...markdownTodayTask(),
      sync: {
        state: "pending_sync",
        savedAt: "2030-01-10T10:00:00.000Z",
        pendingCommandId: "sync-cmd-smoke-001",
        attemptCount: 0,
      },
    };
    const tree = await renderCaptureApp(
      createRepositoryForDetail(
        {
          status: "presence_required",
          label: "Conferir presenca antes da rebaixa",
          lotId: "lote-rebaixa",
        },
        {
          refreshTodayTasks: (input) =>
            Promise.resolve({
              metadata: {
                refreshedAt: input.currentTimestamp,
                activeTaskCount: 1,
                futureAttentionCount: 0,
                source: input.source,
              },
              tasks: [pendingTask],
              futureAttention: [],
            }),
          loadOfflineCacheStatus: () =>
            Promise.resolve(
              offlineReadyStatus({
                state: "offline_mode",
                activeTaskCount: 1,
                requiredLotSnippetCount: 1,
              }),
            ),
          listSyncQueue: () =>
            Promise.resolve(
              emptySyncQueue({
                state: "has_pending",
                totalCount: 1,
                criticalCount: 1,
                commands: [syncCommandSummary()],
              }),
            ),
        },
      ),
    );
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Hoje");
    expect(rendered).toContain("Area de venda segura");
    expect(rendered).toContain("Sem internet agora. Usando tarefas salvas neste aparelho.");
    expect(rendered).toContain("Atualizar tarefas");
    expect(rendered).toContain("Registrar lote");
    expect(rendered).toContain("Pendente de sincronizacao");
  });

  it("requests eligible markdown from lot detail with the rule-window reason", async () => {
    const requestMarkdown = vi.fn(() => Promise.resolve(markdownWorkflowFixture("requested")));
    const tree = await renderCaptureApp(
      createRepositoryForDetail(
        {
          status: "eligible_rule_window",
          label: "Solicitar rebaixa",
          lotId: "lote-rebaixa",
        },
        { requestMarkdown },
      ),
    );

    await openLotDetail(tree);
    expect(JSON.stringify(tree.toJSON())).toContain("Solicitar rebaixa");

    await press(tree, "Solicitar rebaixa");

    expect(requestMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        lotId: "lote-rebaixa",
        reason: "rule_window",
      }),
    );
    expect(JSON.stringify(requestMarkdown.mock.calls[0]?.[0])).not.toContain("earlyJustification");
  });

  it("requires early markdown reason and justification from lot detail", async () => {
    const requestMarkdown = vi.fn(() => Promise.resolve(markdownWorkflowFixture("requested")));
    const tree = await renderCaptureApp(
      createRepositoryForDetail(
        {
          status: "early_exception_available",
          label: "Solicitar rebaixa antecipada",
          lotId: "lote-rebaixa",
          reasons: [
            "excess_stock",
            "quality_issue",
            "package_damage",
            "operational_guidance",
            "other",
          ],
        },
        { requestMarkdown },
      ),
    );

    await openLotDetail(tree);
    expect(disabledButton(tree, "Solicitar rebaixa antecipada")).toBeDefined();

    await press(tree, "Qualidade ruim");
    expect(disabledButton(tree, "Solicitar rebaixa antecipada")).toBeDefined();

    await act(async () => {
      inputByLabel(
        tree,
        "Por que esta rebaixa esta sendo pedida antes da janela?",
      ).props.onChangeText("Maturacao acelerada no lote");
      await Promise.resolve();
    });
    await press(tree, "Solicitar rebaixa antecipada");

    expect(requestMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "quality_issue",
        earlyJustification: "Maturacao acelerada no lote",
      }),
    );
  });

  it("routes presence-required markdown entry to observation without creating a request", async () => {
    const requestMarkdown = vi.fn(() => Promise.resolve(markdownWorkflowFixture("requested")));
    const tree = await renderCaptureApp(
      createRepositoryForDetail(
        {
          status: "presence_required",
          label: "Conferir presenca antes da rebaixa",
          lotId: "lote-rebaixa",
        },
        { requestMarkdown },
      ),
    );

    await openLotDetail(tree);
    await press(tree, "Conferir presenca antes da rebaixa");

    expect(requestMarkdown).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Registrar observa");
  });

  it("uses the Android back gesture to return from observation to lot detail", async () => {
    const tree = await renderCaptureApp(
      createRepositoryForDetail({
        status: "eligible_rule_window",
        label: "Solicitar rebaixa",
        lotId: "lote-rebaixa",
      }),
    );

    await openLotDetail(tree);
    await press(tree, "Registrar observacao");
    expect(JSON.stringify(tree.toJSON())).toContain("Registrar observa");

    await act(async () => {
      const backHandler = latestHardwareBackHandler();
      expect(backHandler?.()).toBe(true);
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Produto Rebaixa FICTICIO");
    expect(rendered).toContain("Estado fisico atual disponivel");
    expect(rendered).not.toContain("Quantidade confirmada");
  });

  it("opens the active markdown stage from lot detail without creating a duplicate request", async () => {
    const requestMarkdown = vi.fn(() => Promise.resolve(markdownWorkflowFixture("requested")));
    const activeTask = markdownTodayTask();
    const tree = await renderCaptureApp(
      createRepositoryForDetail(
        {
          status: "already_active",
          label: "Aplicar rebaixa",
          lotId: "lote-rebaixa",
          workflowId: "workflow-rebaixa",
          currentStage: "approved",
        },
        {
          requestMarkdown,
          listActiveTodayTasks: () => Promise.resolve([activeTask]),
        },
      ),
    );

    await openLotDetail(tree);
    expect(JSON.stringify(tree.toJSON())).toContain("Rebaixa em andamento");
    expect(JSON.stringify(tree.toJSON())).toContain("Aplicar rebaixa");

    await press(tree, "Aplicar rebaixa");

    expect(requestMarkdown).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Comprove a etiqueta aplicada");
  });
});
