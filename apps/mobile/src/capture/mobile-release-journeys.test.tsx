import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type {
  CaptureLotInput,
  OfflineCacheStatus,
  PrepareTurnCacheStatus,
  PrepareTurnResponse,
  SessionContextResponse,
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
    refreshTodayTasks: (request) =>
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
  };
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

  it("prepares central truth, reuses a central product, and registers a lot in the native chain", async () => {
    const { CaptureApp } = await import("./CaptureApp");
    const { createFakePushAlertChannel } = await import("./alert-channel");
    const savedLots: CaptureLotSnapshot[] = [];
    const hydratedCaches: PrepareTurnCacheStatus[] = [];
    const repository = createPilotJourneyRepository({
      saveLot: (snapshot) => savedLots.push(snapshot),
      hydratePrepareTurn: (cache) => hydratedCaches.push(cache),
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
    expect(JSON.stringify(tree.toJSON())).toContain(
      "Pronto para operar com a leitura central.",
    );

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
    expect(JSON.stringify(tree.toJSON())).toContain("Hoje");
  });
});
