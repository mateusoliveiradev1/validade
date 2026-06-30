import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { PrepareTurnRequest, PrepareTurnResponse } from "@validade-zero/contracts";
import { createFakePushAlertChannel, type PushAlertChannel } from "./alert-channel";
import { CaptureApp } from "./CaptureApp";
import { createMemoryCaptureRepository } from "./memory-repository";
import type { MobileBuildInfo } from "../build-info";
import type { SyncEngine } from "./sync-engine";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(name, props, children);

  return {
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: host("Text"),
    View: host("View"),
    ScrollView: host("ScrollView"),
    TextInput: host("TextInput"),
    Pressable: host("Pressable"),
    BackHandler: {
      addEventListener: () => ({ remove: () => undefined }),
    },
  };
});

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
  getExpoPushTokenAsync: () => Promise.resolve({ data: "ExpoPushToken-FICTICIO-PREPARE" }),
  getPermissionsAsync: () => Promise.resolve({ status: "undetermined" }),
  requestPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  scheduleNotificationAsync: () => Promise.resolve("notificacao-ficticia-prepare"),
}));
vi.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: () => ({}),
}));
vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: { open: () => undefined },
}));

describe("prepare-turn gate", () => {
  it("hydrates the central package before opening Hoje", async () => {
    const repository = createRepository();
    const prepareTurnClient = vi.fn((request: PrepareTurnRequest) => {
      void request;
      return Promise.resolve(preparedTurnResponse());
    });
    const tree = await renderApp(repository, prepareTurnClient);

    expect(textContent(tree)).toContain("Preparar turno");
    expect(textContent(tree)).not.toContain("Hoje");
    await press(tree, "Preparar turno");

    expect(prepareTurnClient).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: "validade-zero-mobile:loja-piloto",
        deviceLabel: "Android piloto - com.validadezero.app",
        appVersion: "0.12.0",
        appBuild: "136",
        environment: "staging",
        apiTarget: "https://api.ficticia.invalid",
        lastForegroundAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        localSnapshot: expect.objectContaining({ pendingCommandCount: 0 }),
      }),
    );
    expect(textContent(tree)).not.toContain("Build do piloto");
    expect(textContent(tree)).toContain("Area de venda com risco agora");
    expect(textContent(tree)).toContain("Morango FICTICIO");
  });

  it("opens Hoje from a ready central cache and checks in silently on app reentry", async () => {
    const repository = createRepository();
    await repository.hydratePrepareTurn?.(preparedTurnResponse());
    const prepareTurnClient = vi.fn(() => Promise.resolve(preparedTurnResponse()));
    const tree = await renderApp(repository, prepareTurnClient);

    expect(prepareTurnClient).toHaveBeenCalledWith(
      expect.objectContaining({
        appBuild: "136",
        lastForegroundAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
    expect(findButton(tree, "Preparar turno")).toBeUndefined();
    expect(textContent(tree)).not.toContain("Build do piloto");
    expect(textContent(tree)).toContain("Morango FICTICIO");
  });

  it("reports remote push readiness during the automatic device check-in", async () => {
    const repository = createRepository();
    await repository.hydratePrepareTurn?.(preparedTurnResponse());
    const alertChannel = createFakePushAlertChannel({
      permissionState: "active",
      tokenResult: {
        state: "active",
        expoPushToken: "ExpoPushToken-FICTICIO-AUTO",
      },
    });
    const prepareTurnClient = vi.fn(() => Promise.resolve(preparedTurnResponse()));

    await renderApp(repository, prepareTurnClient, { alertChannel });

    expect(prepareTurnClient).toHaveBeenCalledWith(
      expect.objectContaining({
        pushPermission: "granted",
        pushProviderState: "token_registered",
      }),
    );
  });

  it("drains existing local sync commands automatically after opening with central cache", async () => {
    const repository = createRepository();
    await repository.hydratePrepareTurn?.(preparedTurnResponse());
    const prepareTurnClient = vi.fn(() => Promise.resolve(preparedTurnResponse()));
    const syncPendingCommands = vi.fn<SyncEngine["syncPendingCommands"]>(() =>
      Promise.resolve({
        state: "sent",
        network: {
          kind: "online",
          isConnected: true,
          isInternetReachable: true,
          checkedAt: "2030-01-10T12:30:00.000Z",
          source: "fake",
        },
        selectedCommandIds: ["sync-melao-ficticio"],
        attemptedCommandIds: ["sync-melao-ficticio"],
        appliedResults: [
          {
            status: "ack",
            commandId: "sync-melao-ficticio",
            idempotencyKey: "sync-melao-ficticio-key",
            syncedAt: "2030-01-10T12:30:00.000Z",
          },
        ],
      }),
    );

    await renderApp(repository, prepareTurnClient, {
      syncEngine: { syncPendingCommands },
    });

    expect(syncPendingCommands).toHaveBeenCalledWith({
      deviceId: "validade-zero-mobile:loja-piloto",
    });
    expect(prepareTurnClient).toHaveBeenCalledTimes(2);
  });

  it("keeps the loading decision copy visible before Hoje is ready", async () => {
    const repository = createRepository();
    const prepareTurnClient = vi.fn(() => new Promise<PrepareTurnResponse>(() => undefined));
    const tree = await renderApp(repository, prepareTurnClient);

    await press(tree, "Preparar turno");

    expect(textContent(tree)).toContain("Baixando a leitura central da loja...");
    expect(textContent(tree)).not.toContain("Hoje");
    expect(findButton(tree, "Preparar turno")?.props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it("lets a real empty store start product setup without claiming safe area", async () => {
    const repository = createRepository();
    const tree = await renderApp(repository, () =>
      Promise.resolve(
        preparedTurnResponse({
          readiness: "needs_review",
          products: [],
          lots: [],
          activeTasks: [],
          cacheState: "needs_first_central_read",
        }),
      ),
    );

    await press(tree, "Preparar turno");

    expect(textContent(tree)).toContain("Registrar primeiro lote");
    expect(textContent(tree)).toContain("Loja pronta para o primeiro lote");
    expect(textContent(tree)).toContain("Leitura central sem fatos");
    expect(textContent(tree)).not.toContain("Turno nao preparado");
    expect(textContent(tree)).not.toContain("Area de venda segura");

    await press(tree, "Registrar lote");

    expect(textContent(tree)).toContain("Produto do lote");
    expect(textContent(tree)).not.toContain("Area de venda segura");

    await changeText(tree, "Buscar produto por nome, codigo ou categoria", "banana prata");
    await press(tree, "Buscar manualmente");
    await press(tree, "Cadastrar produto novo");
    await changeText(tree, "Nome do produto", "Banana Prata");
    await press(tree, "Embalado pelo fornecedor");
    await press(tree, "Frutas");
    await press(tree, "Cadastrar produto novo");

    expect(textContent(tree)).toContain("Produto salvo na central");
    expect(textContent(tree)).toContain("Preparar turno novamente");
    expect(textContent(tree)).not.toContain("Area de venda segura");

    await press(tree, "Preparar turno novamente");

    expect(textContent(tree)).toContain("Preparar turno");
    expect(textContent(tree)).not.toContain("Area de venda segura");
  });

  it("labels local-cache fallback as not safe when central is unavailable", async () => {
    const repository = createRepository();
    await repository.hydratePrepareTurn?.(preparedTurnResponse({ cacheSource: "local_cache" }));
    const tree = await renderApp(repository, () => Promise.reject(new Error("network")));

    await press(tree, "Preparar turno");
    expect(textContent(tree)).toContain("Central indisponivel");

    await press(tree, "Entrar com leitura local");

    expect(textContent(tree)).toContain("Local");
    expect(textContent(tree)).toContain("Nao declare area segura");
  });
});

function createRepository() {
  let nextIdentifier = 1;

  return createMemoryCaptureRepository({
    clock: () => "2030-01-10T12:30:00.000Z",
    createId: () => `prepare-turn-local-${nextIdentifier++}`,
    listCentralCategories: () =>
      Promise.resolve({
        categories: [
          {
            categoryId: "frutas",
            categoryName: "Frutas",
            categoryRuleProfile: {
              categoryId: "frutas",
              mode: "formal_validity",
              windows: {
                radarDays: 60,
                markdownDays: 15,
                criticalDays: 3,
                expiredDays: 0,
              },
            },
          },
        ],
      }),
  });
}

async function renderApp(
  repository: ReturnType<typeof createRepository>,
  prepareTurnClient: (request: PrepareTurnRequest) => Promise<PrepareTurnResponse>,
  input: {
    alertChannel?: PushAlertChannel | undefined;
    syncEngine?: SyncEngine | undefined;
  } = {},
): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <CaptureApp
        alertChannel={input.alertChannel ?? createFakePushAlertChannel()}
        prepareTurnClient={prepareTurnClient}
        buildInfo={pilotBuildInfo()}
        repository={repository}
        syncEngine={input.syncEngine}
        storeId="loja-piloto"
      />,
    );
    await flush();
  });

  if (tree === undefined) {
    throw new Error("CaptureApp did not render.");
  }

  return tree;
}

function pilotBuildInfo(): MobileBuildInfo {
  return {
    appVersion: "0.12.0",
    appBuild: "136",
    environment: "staging",
    apiTarget: "https://api.ficticia.invalid",
    packageId: "com.validadezero.app",
    approvedArtifactLabel: "uat15-sync-debug-apk-136",
    approvedAppVersion: "0.12.0",
    approvedBuild: "136",
    buildRef: "sync-debug-136",
    buildCompatibility: "atual",
  };
}

async function press(tree: ReactTestRenderer, label: string): Promise<void> {
  const button = findButton(tree, label);
  const onPress = button?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error(`Expected a pressable action named ${label}.`);
  }

  await act(async () => {
    onPress();
    await flush();
  });
}

function findButton(tree: ReactTestRenderer, label: string) {
  return tree.root
    .findAllByType("Pressable")
    .find((candidate) => candidate.props.accessibilityLabel === label);
}

async function changeText(tree: ReactTestRenderer, label: string, value: string): Promise<void> {
  const input = tree.root
    .findAllByType("TextInput")
    .find((candidate) =>
      normalized(candidate.props.accessibilityLabel).includes(normalized(label)),
    );
  const onChangeText = input?.props.onChangeText;

  if (typeof onChangeText !== "function") {
    throw new Error(`Expected a text input named ${label}.`);
  }

  await act(async () => {
    onChangeText(value);
    await flush();
  });
}

function normalized(value: unknown): string {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";

  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function textContent(tree: ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .map((node) => flattenText(node.props.children))
    .join("\n");
}

function flattenText(value: unknown): string {
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function preparedTurnResponse(
  input: {
    readiness?: PrepareTurnResponse["store"]["readiness"];
    cacheState?: PrepareTurnResponse["cache"]["state"];
    cacheSource?: PrepareTurnResponse["cache"]["source"];
    products?: PrepareTurnResponse["products"];
    lots?: PrepareTurnResponse["lots"];
    activeTasks?: PrepareTurnResponse["activeTasks"];
  } = {},
): PrepareTurnResponse {
  const products = input.products ?? [
    {
      centralProductId: "product-morango",
      displayName: "Morango FICTICIO",
      categoryId: "frutas",
      categoryName: "Frutas",
      status: "validated",
      state: "synchronized",
      source: "central",
      updatedAt: "2030-01-10T12:00:00.000Z",
      categoryRuleProfile: {
        categoryId: "frutas",
        mode: "formal_validity",
        windows: {
          radarDays: 60,
          markdownDays: 15,
          criticalDays: 3,
          expiredDays: 0,
        },
      },
    },
  ];
  const lots = input.lots ?? [
    {
      centralLotId: "lot-morango",
      centralProductId: "product-morango",
      productDisplayName: "Morango FICTICIO",
      lotIdentity: {
        identitySource: "printed",
        value: "LOTE-MORANGO-FICTICIO",
      },
      mode: "formal_validity",
      currentLocation: { kind: "area_de_venda" },
      state: "synchronized",
      source: "central",
      riskState: "expired",
      expiresAt: "2030-01-09",
      approximateQuantity: 8,
      updatedAt: "2030-01-10T12:00:00.000Z",
    },
  ];
  const activeTasks = input.activeTasks ?? [
    {
      centralTaskId: "task-morango",
      activeKey: "lot-morango:expired:withdraw_or_loss:root",
      centralLotId: "lot-morango",
      productDisplayName: "Morango FICTICIO",
      currentLocation: { kind: "area_de_venda" },
      riskState: "expired",
      severity: "critical",
      requiredResolution: "withdraw_or_loss",
      state: "synchronized",
      source: "central",
      ownerLabel: "Equipe do turno",
      dueAt: "2030-01-10T12:00:00.000Z",
      updatedAt: "2030-01-10T12:00:00.000Z",
    },
  ];
  const centralFactCount = products.length + lots.length + activeTasks.length;
  const readiness = input.readiness ?? (centralFactCount === 0 ? "needs_review" : "prepared");

  return {
    requestId: "prepare-turn-test",
    store: {
      storeId: "loja-piloto",
      storeName: "Loja Piloto",
      centralVersion: 1,
      generatedAt: "2030-01-10T12:30:00.000Z",
      ...(centralFactCount === 0 ? {} : { centralReadAt: "2030-01-10T12:30:00.000Z" }),
      source: "central",
      readiness,
      blockers: readiness === "prepared" ? [] : ["Leitura central sem fatos"],
    },
    device: {
      deviceId: "validade-zero-mobile:loja-piloto",
      preparedAt: "2030-01-10T12:30:00.000Z",
      lastCentralReadAt: "2030-01-10T12:30:00.000Z",
      lastHydratedAt: "2030-01-10T12:30:00.000Z",
      pendingCommandCount: 0,
      conflictCount: 0,
      source: "central",
    },
    cache: {
      state: input.cacheState ?? "ready",
      source: input.cacheSource ?? "central",
      updatedAt: "2030-01-10T12:30:00.000Z",
      ...(centralFactCount === 0 ? {} : { lastCentralReadAt: "2030-01-10T12:30:00.000Z" }),
      staleAfterHours: 4,
      productCount: products.length,
      lotCount: lots.length,
      activeTaskCount: activeTasks.length,
      conflictCount: 0,
      resolvedHistoryCount: 0,
    },
    products,
    lots,
    activeTasks,
    resolvedHistory: [],
    conflicts: [],
  };
}
