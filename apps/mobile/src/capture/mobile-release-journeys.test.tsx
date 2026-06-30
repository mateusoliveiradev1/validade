import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type {
  CaptureLotInput,
  OfflineCacheStatus,
  PrepareTurnCacheStatus,
  PrepareTurnResponse,
  SessionContextResponse,
  TodayTaskRecord,
  SyncCommandSummary,
  SyncQueueSummary,
} from "@validade-zero/contracts";
import { AuthGate, type MobileAuthClient } from "../auth/AuthGate";
import { MobileAuthError } from "../auth/auth-errors";
import type { CaptureLotSnapshot, CaptureProductRecord, CaptureRepository } from "./repository";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

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
    Image: (props: Record<string, unknown>) => React.createElement("Image", props),
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
    Platform: { OS: "android" },
    BackHandler: {
      addEventListener: () => ({ remove: () => undefined }),
    },
  };
});

vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: {
    open: (input: { onValueChange: (event: unknown, date: Date) => void }) => {
      input.onValueChange({ type: "set" }, new Date("2030-01-09T12:00:00.000Z"));
    },
  },
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
  getExpoPushTokenAsync: () => Promise.resolve({ data: "ExpoPushToken-FICTICIO-RELEASE" }),
  getPermissionsAsync: () => Promise.resolve({ status: "undetermined" }),
  requestPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  scheduleNotificationAsync: () => Promise.resolve("notificacao-ficticia-release"),
}));

vi.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: () => ({}),
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        EXPO_PUBLIC_API_URL: "https://validade-zero-api-staging.validadezero.workers.dev/",
      },
    },
  },
}));

function activeSession(): SessionContextResponse {
  return {
    actor: { subjectId: "worker-ficticio", displayName: "Colaborador FICTICIO" },
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
  };
}

function authClient(overrides: Partial<MobileAuthClient> = {}): MobileAuthClient {
  return {
    authHeaders: () => ({}),
    readSession: () => Promise.reject(new MobileAuthError("session_expired")),
    login: () => Promise.resolve(activeSession()),
    validateInvite: () => Promise.resolve({ status: "invalid" }),
    activateInvite: () => Promise.resolve(activeSession()),
    requestRecovery: () => Promise.resolve(),
    submitPrivacyRequest: () => Promise.resolve(),
    prepareTurn: () => Promise.reject(new Error("not used")),
    searchCentralProducts: () => Promise.reject(new Error("not used")),
    createProductDraft: () => Promise.reject(new Error("not used")),
    createCentralLot: () => Promise.reject(new Error("not used")),
    closeShift: () => Promise.reject(new Error("not used")),
    logout: () => Promise.resolve(),
    ...overrides,
  };
}

async function renderJourney(client: MobileAuthClient): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(
      <AuthGate authClient={client}>
        {() => <>Hoje - Nenhum bloqueio ativo na leitura central</>}
      </AuthGate>,
    );
    await Promise.resolve();
  });
  if (tree === undefined) throw new Error("Mobile release journey did not render.");
  return tree;
}

async function press(tree: ReactTestRenderer, label: string): Promise<void> {
  const action = tree.root.findAllByType("Pressable").find((candidate) =>
    String(candidate.props.accessibilityLabel ?? "")
      .toLocaleLowerCase("pt-BR")
      .includes(label.toLocaleLowerCase("pt-BR")),
  );

  if (action === undefined || typeof action.props.onPress !== "function") {
    throw new Error(`Expected an action named ${label}.`);
  }

  await act(async () => {
    action.props.onPress();
    await Promise.resolve();
  });
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

function expectTextInOrder(text: string, expected: readonly string[]): void {
  let cursor = -1;

  for (const value of expected) {
    const next = text.indexOf(value, cursor + 1);
    expect(next).toBeGreaterThan(cursor);
    cursor = next;
  }
}

function inputByLabel(tree: ReactTestRenderer, label: string) {
  const input = tree.root.findAllByType("TextInput").find((candidate) =>
    String(candidate.props.accessibilityLabel ?? "")
      .toLocaleLowerCase("pt-BR")
      .includes(label.toLocaleLowerCase("pt-BR")),
  );

  if (input === undefined || typeof input.props.onChangeText !== "function") {
    throw new Error(`Expected an input named ${label}.`);
  }

  return input;
}

const pilotProduct: CaptureProductRecord = {
  id: "product-pilot-central",
  centralProductId: "product-pilot-central",
  displayName: "Banana Prata FICTICIA",
  normalizedName: "banana prata ficticia",
  categoryId: "cat-flv",
  categoryName: "FLV",
  categoryRuleProfile: {
    categoryId: "cat-flv",
    mode: "formal_validity",
    windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
  },
  catalogSource: "central",
  reviewStatus: "validated",
  centralSyncState: "synchronized",
  createdAt: "2030-01-10T09:00:00.000Z",
};

function emptyOfflineCache(): OfflineCacheStatus {
  return {
    state: "offline_ready",
    lastRefreshedAt: "2030-01-10T09:00:00.000Z",
    activeTaskCount: 0,
    requiredLotSnippetCount: 0,
    staleAfterHours: 4,
    source: "today_open",
    updatedAt: "2030-01-10T09:00:00.000Z",
  };
}

function emptySyncQueue(): SyncQueueSummary {
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
  };
}

function pilotPrepareTurnResponse(): PrepareTurnResponse {
  return {
    requestId: "prepare-turn-release-journey",
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
      lotCount: 0,
      activeTaskCount: 0,
      conflictCount: 0,
      resolvedHistoryCount: 0,
    },
    products: [
      {
        centralProductId: pilotProduct.centralProductId,
        displayName: pilotProduct.displayName,
        normalizedKey: pilotProduct.normalizedName,
        categoryId: pilotProduct.categoryId,
        categoryName: pilotProduct.categoryName ?? "FLV",
        categoryRuleProfile: pilotProduct.categoryRuleProfile,
        source: "central",
        reviewStatus: "validated",
        syncState: "synchronized",
        updatedAt: "2030-01-10T09:00:00.000Z",
      },
    ],
    lots: [],
    activeTasks: [],
    resolvedHistory: [],
    conflicts: [],
  };
}

function createPilotJourneyRepository(input: {
  saveLot: (snapshot: CaptureLotSnapshot) => void;
  hydratePrepareTurn: (cache: PrepareTurnCacheStatus) => void;
  refreshTodayTasks?: CaptureRepository["refreshTodayTasks"] | undefined;
}): CaptureRepository {
  let prepareCache: PrepareTurnCacheStatus | null = null;

  return {
    initialize: () => Promise.resolve(),
    hydratePrepareTurn: (response) => {
      prepareCache = response.cache;
      input.hydratePrepareTurn(response.cache);
      return Promise.resolve();
    },
    loadPrepareTurnCacheStatus: () => Promise.resolve(prepareCache),
    searchCentralProducts: () =>
      Promise.resolve({
        requestId: "product-search-release-journey",
        normalizedQuery: "banana",
        resultState: "reuse_available",
        reusableProducts: [
          {
            centralProductId: pilotProduct.centralProductId,
            displayName: pilotProduct.displayName,
            normalizedKey: pilotProduct.normalizedName,
            categoryId: pilotProduct.categoryId,
            categoryName: pilotProduct.categoryName ?? "FLV",
            categoryRuleProfile: pilotProduct.categoryRuleProfile,
            source: "central",
            reviewStatus: "validated",
            syncState: "synchronized",
            updatedAt: "2030-01-10T09:00:00.000Z",
            matchKind: "reusable_central",
            matchReasons: ["exact_normalized_name"],
          },
        ],
        similarCandidates: [],
      }),
    createProduct: () => Promise.reject(new Error("not used")),
    findProducts: () => Promise.resolve([]),
    saveLot: ({ lot }) => {
      const snapshot: CaptureLotSnapshot = {
        ...lot,
        id: "lot-release-journey",
        productDisplayName: pilotProduct.displayName,
        currentObservation: {
          id: "observation-release-journey",
          lotId: "lot-release-journey",
          status: "present",
          actorLabel: "Colaborador local",
          occurredAt: "2030-01-10T09:30:00.000Z",
          location: lot.initialLocation,
          quantityState: "estimated",
          approximateQuantity: lot.approximateQuantity,
          isCorrection: false,
        },
        centralLotId: "lot-release-journey",
        centralSyncState: "synchronized",
        centralSource: "central",
        centralAcknowledgementMessage:
          "Sincronizado com a central. Outro aparelho ve este lote apos preparar turno.",
      };
      input.saveLot(snapshot);
      return Promise.resolve(snapshot);
    },
    appendObservation: () => Promise.reject(new Error("not used")),
    listRecentLots: () => Promise.resolve([]),
    loadLotDetail: () => Promise.resolve(null),
    refreshTodayTasks:
      input.refreshTodayTasks ??
      ((request) =>
        Promise.resolve({
          metadata: {
            refreshedAt: request.currentTimestamp,
            activeTaskCount: 0,
            futureAttentionCount: 0,
            source: request.source,
          },
          tasks: [],
          futureAttention: [],
        })),
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
    loadMarkdownEntryState: () => Promise.reject(new Error("not used")),
    registerAlertDevice: (request) => Promise.resolve(request),
    loadAlertChannelState: () => Promise.resolve(null),
    refreshTaskAlertStates: () => Promise.resolve([]),
    listTaskAlertStates: () => Promise.resolve([]),
    recordAlertAttempt: () => Promise.reject(new Error("not used")),
    acknowledgeEscalation: () => Promise.reject(new Error("not used")),
    resolvePushOpenIntent: (request) => Promise.resolve({ ...request, result: "task_missing" }),
    loadOfflineCacheStatus: () => Promise.resolve(emptyOfflineCache()),
    queueEvidenceUpload: () => Promise.reject(new Error("not used")),
    listEvidenceUploads: () => Promise.resolve([]),
    markEvidenceUploadAttempt: () => Promise.reject(new Error("not used")),
    applyEvidenceUploadIntent: () => Promise.reject(new Error("not used")),
    applyEvidenceUploadAck: () => Promise.reject(new Error("not used")),
    markEvidenceUploadFailed: () => Promise.reject(new Error("not used")),
    listShiftCloseOutbox: () => Promise.resolve([]),
    listSyncQueue: () => Promise.resolve(emptySyncQueue()),
    saveOfflineAction: () => Promise.reject(new Error("not used")),
    markSyncCommandAttempt: () => Promise.resolve([]),
    applySyncTransportResult: () => Promise.reject(new Error("not used")),
    resolveSyncConflict: () => Promise.reject(new Error("not used")),
    loadSyncConflict: () => Promise.resolve(null),
  } as CaptureRepository;
}

function expiredReleaseTask(): TodayTaskRecord {
  return {
    id: "task-release-expired-ficticio",
    activeKey: "lot-release-expired:expired:withdraw_or_loss:root",
    lotId: "lot-release-expired",
    productDisplayName: "Iogurte FICTICIO",
    lotIdentity: { identitySource: "printed", value: "IOG-LOTE-FICTICIO" },
    currentLocation: { kind: "area_de_venda" },
    riskState: "expired",
    severity: "critical",
    dueBucket: "now",
    requiredResolution: "withdraw_or_loss",
    section: "withdraw_now",
    ownerLabel: "Equipe FICTICIA do turno",
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

function releaseSyncCommand(overrides: Partial<SyncCommandSummary> = {}): SyncCommandSummary {
  return {
    id: "sync-release-command-ficticio",
    kind: "resolve_task",
    state: "pending_sync",
    urgency: "high",
    productDisplayName: "Iogurte FICTICIO",
    lotIdentity: { identitySource: "printed", value: "IOG-LOTE-FICTICIO" },
    currentLocation: { kind: "area_de_venda" },
    savedAt: "2030-01-10T12:00:00.000Z",
    ...overrides,
  };
}

function releaseQueue(): SyncQueueSummary {
  const conflict = releaseSyncCommand({
    id: "sync-release-conflict-ficticio",
    state: "sync_conflict",
    urgency: "critical",
    conflictId: "sync-conflict-release-ficticio",
  });
  const pending = releaseSyncCommand();

  return {
    state: "has_conflict",
    totalCount: 2,
    conflictCount: 1,
    hasCriticalConflict: true,
    criticalCount: 1,
    highCount: 1,
    mediumCount: 0,
    lowCount: 0,
    oldestPendingCritical: conflict,
    commands: [pending, conflict],
    updatedAt: "2030-01-10T12:02:00.000Z",
  };
}

function releaseOfflineRepository(
  input: {
    saveOfflineAction?: ((command: unknown) => Promise<unknown>) | undefined;
  } = {},
): CaptureRepository {
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
          refreshedAt: "2030-01-10T12:00:00.000Z",
          activeTaskCount: 1,
          futureAttentionCount: 0,
          source: "today_open",
        },
        tasks: [expiredReleaseTask()],
        futureAttention: [],
      }),
    listActiveTodayTasks: () => Promise.resolve([expiredReleaseTask()]),
    listFutureAttention: () => Promise.resolve([]),
    resolveTodayTask: () => Promise.reject(new Error("not used")),
    loadTodayTask: () => Promise.resolve(expiredReleaseTask()),
    requestMarkdown: () => Promise.reject(new Error("not used")),
    decideMarkdown: () => Promise.reject(new Error("not used")),
    recordMarkdownApplication: () => Promise.reject(new Error("not used")),
    confirmMarkdownOnShelf: () => Promise.reject(new Error("not used")),
    loadMarkdownWorkflowForLot: () => Promise.resolve(null),
    listActiveMarkdownWorkflows: () => Promise.resolve([]),
    loadMarkdownEntryState: () => Promise.reject(new Error("not used")),
    registerAlertDevice: (request) => Promise.resolve(request),
    loadAlertChannelState: () => Promise.resolve(null),
    refreshTaskAlertStates: () => Promise.resolve([]),
    listTaskAlertStates: () => Promise.resolve([]),
    recordAlertAttempt: () => Promise.reject(new Error("not used")),
    acknowledgeEscalation: () => Promise.reject(new Error("not used")),
    resolvePushOpenIntent: (request) => Promise.resolve({ ...request, result: "task_missing" }),
    loadOfflineCacheStatus: () =>
      Promise.resolve({
        ...emptyOfflineCache(),
        state: "offline_mode",
        activeTaskCount: 1,
        requiredLotSnippetCount: 1,
      }),
    queueEvidenceUpload: () => Promise.reject(new Error("not used")),
    listEvidenceUploads: () => Promise.resolve([]),
    markEvidenceUploadAttempt: () => Promise.reject(new Error("not used")),
    applyEvidenceUploadIntent: () => Promise.reject(new Error("not used")),
    applyEvidenceUploadAck: () => Promise.reject(new Error("not used")),
    markEvidenceUploadFailed: () => Promise.reject(new Error("not used")),
    queueUnsafeShiftClose: (request) =>
      Promise.resolve({
        localCloseId: request.localCloseId,
        request: request.request,
        state: "pending_sync",
        createdAt: "2030-01-10T18:00:00.000Z",
        updatedAt: "2030-01-10T18:00:00.000Z",
        attemptCount: 0,
      }),
    listShiftCloseOutbox: () => Promise.resolve([]),
    listSyncQueue: () => Promise.resolve(releaseQueue()),
    saveOfflineAction: (command) => input.saveOfflineAction?.(command) ?? Promise.resolve({}),
    markSyncCommandAttempt: () => Promise.resolve([]),
    applySyncTransportResult: () => Promise.reject(new Error("not used")),
    resolveSyncConflict: () => Promise.reject(new Error("not used")),
    loadSyncConflict: () => Promise.resolve(null),
  } as CaptureRepository;
}

describe("mobile release journeys", () => {
  it("keeps Hoje behind the auth gate and exposes the privacy path before authentication", async () => {
    const tree = await renderJourney(authClient());
    expect(JSON.stringify(tree.toJSON())).toContain("Entrar no Validade Zero");
    expect(JSON.stringify(tree.toJSON())).not.toContain(
      "Hoje - Nenhum bloqueio ativo na leitura central",
    );

    const privacy = tree.root
      .findAllByType("Pressable")
      .find((candidate) => candidate.props.accessibilityLabel === "Abrir Centro de Privacidade");
    if (privacy === undefined || typeof privacy.props.onPress !== "function") {
      throw new Error("Privacy action is missing from the release path.");
    }
    await act(async () => {
      privacy.props.onPress();
      await Promise.resolve();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Centro de Privacidade");
  });

  it("opens Hoje after the server-owned active session resolves", async () => {
    const tree = await renderJourney(
      authClient({ readSession: () => Promise.resolve(activeSession()) }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Hoje - Nenhum bloqueio ativo na leitura central",
    );
  });

  it("keeps Ajustes complete and route-preserving across Hoje and task resolution", async () => {
    const { CaptureApp } = await import("./CaptureApp");
    const { createFakePushAlertChannel } = await import("./alert-channel");
    const openPrivacyCenter = vi.fn();
    const requestLogout = vi.fn();
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <CaptureApp
          repository={releaseOfflineRepository()}
          alertChannel={createFakePushAlertChannel()}
          authControls={{ openPrivacyCenter, requestLogout }}
          session={activeSession()}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    if (tree === undefined) throw new Error("Integrated Ajustes journey did not render.");

    expect(renderedText(tree)).toContain("Area de venda com risco agora");

    await press(tree, "Abrir Ajustes do aparelho");

    expectTextInOrder(renderedText(tree), [
      "Conta e loja",
      "Push e lembretes",
      "Sincronizacao",
      "Atualizacao do app",
      "Privacidade",
      "Sair com pendencias visiveis",
    ]);

    await press(tree, "Voltar para operacao");

    expect(renderedText(tree)).toContain("Hoje");
    expect(renderedText(tree)).toContain("Area de venda com risco agora");

    await press(tree, "Retirar agora");

    expect(renderedText(tree)).toContain("Acao exigida:");
    expect(renderedText(tree)).toContain("Iogurte FICTICIO");

    await press(tree, "Abrir Ajustes do aparelho");

    expect(renderedText(tree)).toContain("Sair com pendencias visiveis");

    await press(tree, "Voltar para operacao");

    expect(renderedText(tree)).toContain("Acao exigida:");
    expect(renderedText(tree)).toContain("Iogurte FICTICIO");
  });

  it("opens Ajustes after authenticated session without dropping session identity", async () => {
    const { CaptureApp } = await import("./CaptureApp");
    const { createFakePushAlertChannel } = await import("./alert-channel");
    const repository = releaseOfflineRepository();
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <AuthGate authClient={authClient({ readSession: () => Promise.resolve(activeSession()) })}>
          {(session, _client, controls) => (
            <CaptureApp
              repository={repository}
              alertChannel={createFakePushAlertChannel()}
              authControls={controls}
              session={session}
            />
          )}
        </AuthGate>,
      );
      await Promise.resolve();
    });

    if (tree === undefined) throw new Error("Authenticated Ajustes journey did not render.");

    const settings = tree.root.findByProps({
      accessibilityLabel: "Abrir Ajustes do aparelho",
    });

    await act(async () => {
      settings.props.onPress();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain("Ajustes");
    expect(rendered).toContain("Loja Ficticia Piloto");
    expect(rendered).toContain("Colaborador FICTICIO");
  });

  it("opens Ajustes from Hoje and returns to Hoje without resetting operation", async () => {
    const { CaptureApp } = await import("./CaptureApp");
    const { createFakePushAlertChannel } = await import("./alert-channel");
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <CaptureApp
          repository={releaseOfflineRepository()}
          alertChannel={createFakePushAlertChannel()}
        />,
      );
      await Promise.resolve();
    });

    if (tree === undefined) throw new Error("Ajustes from Hoje did not render.");

    await press(tree, "Abrir Ajustes do aparelho");
    expect(JSON.stringify(tree.toJSON())).toContain("Ajustes");

    await press(tree, "Voltar para operacao");

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain("Hoje");
    expect(rendered).toContain("Area de venda com risco agora");
  });

  it("opens Ajustes from task resolution and returns to the same task", async () => {
    const { CaptureApp } = await import("./CaptureApp");
    const { createFakePushAlertChannel } = await import("./alert-channel");
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <CaptureApp
          repository={releaseOfflineRepository()}
          alertChannel={createFakePushAlertChannel()}
        />,
      );
      await Promise.resolve();
    });

    if (tree === undefined) throw new Error("Ajustes from task did not render.");

    await press(tree, "Retirar agora");
    expect(JSON.stringify(tree.toJSON())).toContain("Acao exigida:");

    await press(tree, "Abrir Ajustes do aparelho");
    expect(JSON.stringify(tree.toJSON())).toContain("Ajustes");

    await press(tree, "Voltar para operacao");

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain("Acao exigida:");
    expect(rendered).toContain("Iogurte FICTICIO");
  });

  it("prepares central truth, reuses a central product, and registers a lot in the native chain", async () => {
    const { CaptureApp } = await import("./CaptureApp");
    const { createFakePushAlertChannel } = await import("./alert-channel");
    const savedLots: CaptureLotSnapshot[] = [];
    const hydratedCaches: PrepareTurnCacheStatus[] = [];
    const refreshTodayTasks = vi.fn<CaptureRepository["refreshTodayTasks"]>((request) =>
      Promise.resolve({
        metadata: {
          refreshedAt: request.currentTimestamp,
          activeTaskCount: 0,
          futureAttentionCount: 0,
          source: request.source,
        },
        tasks: [],
        futureAttention: [],
      }),
    );
    const repository = createPilotJourneyRepository({
      saveLot: (snapshot) => savedLots.push(snapshot),
      hydratePrepareTurn: (cache) => hydratedCaches.push(cache),
      refreshTodayTasks,
    });
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <CaptureApp
          repository={repository}
          alertChannel={createFakePushAlertChannel()}
          prepareTurnClient={() => Promise.resolve(pilotPrepareTurnResponse())}
          activeRole="lead"
          actorLabel="Lideranca FICTICIA"
          storeId="loja-ficticia"
        />,
      );
      await Promise.resolve();
    });

    if (tree === undefined) throw new Error("Pilot journey did not render.");
    expect(JSON.stringify(tree.toJSON())).toContain("Preparar turno");

    await press(tree, "Preparar turno");
    expect(hydratedCaches).toHaveLength(1);
    expect(JSON.stringify(tree.toJSON())).toContain("Nenhum bloqueio ativo na leitura central");

    await press(tree, "Registrar lote");
    await act(async () => {
      inputByLabel(tree!, "Buscar produto").props.onChangeText("banana");
      await Promise.resolve();
    });
    await press(tree, "Buscar manualmente");
    await press(tree, "Banana Prata FICTICIA");
    await press(tree, "Usar este produto");
    await press(tree, "Registrar lote");

    await act(async () => {
      inputByLabel(tree!, "Identificação impressa").props.onChangeText("BAN-LOTE-001");
      inputByLabel(tree!, "Quantidade aproximada").props.onChangeText("4");
      await Promise.resolve();
    });
    await press(tree, "Área de venda");
    await press(tree, "Data de validade");
    await press(tree, "Registrar lote");

    expect(savedLots).toHaveLength(1);
    expect(savedLots[0]?.productId).toBe("product-pilot-central");
    expect((savedLots[0] as CaptureLotInput | undefined)?.identity).toEqual({
      identitySource: "printed",
      value: "BAN-LOTE-001",
    });
    expect(refreshTodayTasks).toHaveBeenCalledWith(
      expect.objectContaining({ source: "lot_change" }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Hoje");
  });

  it("keeps terminal local save and pending-central truth visible in the release fixture", async () => {
    const { TaskResolutionPanel } = await import("./TaskResolutionPanel");
    const saveOfflineAction = vi.fn().mockResolvedValue({});
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <TaskResolutionPanel
          repository={releaseOfflineRepository({ saveOfflineAction })}
          task={expiredReleaseTask()}
          actorLabel="Colaborador FICTICIO"
          onDone={() => undefined}
          onBack={() => undefined}
          now={() => new Date("2030-01-10T12:00:00.000Z")}
        />,
      );
      await Promise.resolve();
    });

    if (tree === undefined) throw new Error("Terminal release journey did not render.");

    await press(tree, "Retirar agora");
    await press(tree, "Confirmar retirada");

    expect(JSON.stringify(tree.toJSON())).toContain("Responsavel: Colaborador FICTICIO");
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Transporte central: Sincronizado com a central",
    );
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Resolucao terminal: Resolvido com criterio operacional e confirmacao central",
    );

    await press(tree, "Confirmar retirada");

    expect(saveOfflineAction).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "resolve_task",
        payload: expect.objectContaining({
          taskId: "task-release-expired-ficticio",
          action: "withdraw",
        }),
      }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.",
    );
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Pendente central. Ainda nao use como confirmacao da loja.",
    );
  });

  it("puts conflict sync ahead of ordinary pending work in the release fixture", async () => {
    const { SyncQueueSummary: SyncQueueSummaryView } = await import("./offline-sync-ui");
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <SyncQueueSummaryView
          queue={releaseQueue()}
          onRetry={() => undefined}
          onReviewConflict={() => undefined}
        />,
      );
    });

    if (tree === undefined) throw new Error("Sync release journey did not render.");

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered.indexOf("Conflito de sincronizacao")).toBeLessThan(
      rendered.indexOf("Pendente central"),
    );
    expect(rendered).toContain("Revisar conflito");
  });

  it("keeps safe and unsafe shift close paths explicit in the release fixture", async () => {
    const { ShiftCloseScreen } = await import("./ShiftCloseScreen");
    const repository = releaseOfflineRepository();
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(
        <ShiftCloseScreen
          repository={repository}
          canCloseShift
          onBack={() => undefined}
          now={() => new Date("2030-01-10T18:00:00.000Z")}
        />,
      );
      await Promise.resolve();
    });

    if (tree === undefined) throw new Error("Shift-close release journey did not render.");

    expect(JSON.stringify(tree.toJSON())).toContain("Encerrar turno com area segura");
    expect(JSON.stringify(tree.toJSON())).toContain("Encerrar turno com pendencias");
    expect(JSON.stringify(tree.toJSON())).toContain(
      "A area nao esta segura; o trabalho continua no proximo turno.",
    );

    await act(async () => {
      inputByLabel(tree!, "Motivo").props.onChangeText("Risco FICTICIO ainda em retirada");
      inputByLabel(tree!, "Respons").props.onChangeText("Lideranca FICTICIA Noturna");
      inputByLabel(tree!, "Prazo").props.onChangeText("2030-01-10T19:00:00.000Z");
      inputByLabel(tree!, "Nota").props.onChangeText("Continuar retirada FICTICIA");
      await Promise.resolve();
    });

    await press(tree, "Encerrar turno com pendencias");
    expect(JSON.stringify(tree.toJSON())).toContain("Fechamento inseguro pendente");
  });
});
