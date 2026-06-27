import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { CaptureProductRecord, CaptureRepository, MarkdownEntryState } from "./repository";
import { captureCopy, productModeLabels } from "./capture-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { ProductDiscoveryScreen } from "./ProductDiscoveryScreen";
import { ProductFormScreen } from "./ProductFormScreen";
import { LotRegistrationScreen } from "./LotRegistrationScreen";
import { RecentLotList } from "./RecentLotList";
import { LotDetailScreen, type LotDetailMarkdownRequest } from "./LotDetailScreen";
import { ObservationComposer } from "./ObservationComposer";
import { BarcodeLookupAssistant } from "./BarcodeLookupAssistant";
import type { CaptureLotDetail } from "./repository";
import { TodayScreen } from "./TodayScreen";
import { TaskResolutionPanel } from "./TaskResolutionPanel";
import { ShiftCloseScreen } from "./ShiftCloseScreen";
import type {
  PrepareTurnCacheStatus,
  PrepareTurnRequest,
  PrepareTurnResponse,
  ShiftCloseSafeRequest,
  ShiftClosureSnapshot,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import { createExpoPushAlertChannel, type PushAlertChannel } from "./alert-channel";
import type { SyncEngine } from "./sync-engine";
import { todayCopy } from "./today-copy";
import { captureColors } from "./capture-theme";
import { addHardwareBackPressListener } from "../system/hardware-back";

type CaptureRoute =
  | { name: "today" }
  | { name: "discovery"; initialLookup?: string | undefined }
  | { name: "product-form"; initialGtin?: string | undefined }
  | { name: "confirmed"; product: CaptureProductRecord }
  | { name: "lot-registration"; product: CaptureProductRecord }
  | { name: "recent" }
  | {
      name: "detail";
      detail: CaptureLotDetail;
      markdownEntryState?: MarkdownEntryState | undefined;
    }
  | { name: "task-resolution"; task: TodayTaskRecord }
  | { name: "shift-close" }
  | { name: "observation"; detail: CaptureLotDetail }
  | { name: "barcode" };

const initialRouteStack: readonly CaptureRoute[] = [{ name: "today" }];

export function CaptureApp({
  repository,
  alertChannel,
  syncEngine,
  prepareTurnClient,
  closeShiftClient,
  activeRole = "lead",
  actorLabel = todayCopy.fallbackActor,
  storeId = "loja-local",
}: {
  repository: CaptureRepository;
  alertChannel?: PushAlertChannel;
  syncEngine?: SyncEngine | undefined;
  prepareTurnClient?: ((request: PrepareTurnRequest) => Promise<PrepareTurnResponse>) | undefined;
  closeShiftClient?:
    | ((request: ShiftCloseSafeRequest) => Promise<ShiftClosureSnapshot>)
    | undefined;
  activeRole?: "collaborator" | "lead" | "admin" | undefined;
  actorLabel?: string | undefined;
  storeId?: string | undefined;
}) {
  const [routeStack, setRouteStack] = useState<readonly CaptureRoute[]>(initialRouteStack);
  const [initializationError, setInitializationError] = useState<string | undefined>();
  const [prepareTurnState, setPrepareTurnState] = useState<
    "checking" | "needs_prepare" | "preparing" | "ready" | "needs_review" | "cache_only" | "error"
  >(prepareTurnClient === undefined ? "ready" : "checking");
  const [prepareTurnCache, setPrepareTurnCache] = useState<PrepareTurnCacheStatus | null>(null);
  const [prepareTurnError, setPrepareTurnError] = useState<string | undefined>();
  const [prepareTurnSource, setPrepareTurnSource] = useState<"central" | "local_cache" | undefined>(
    prepareTurnClient === undefined ? undefined : "local_cache",
  );
  const [pushFallbackNotice, setPushFallbackNotice] = useState<string | undefined>();
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | undefined>();
  const resolvedAlertChannel = useMemo(
    () => alertChannel ?? createExpoPushAlertChannel(),
    [alertChannel],
  );
  const currentRoute = routeStack[routeStack.length - 1] ?? { name: "today" };

  const navigate = useCallback((route: CaptureRoute): void => {
    setRouteStack((current) => [...current, route]);
  }, []);

  const replace = useCallback((route: CaptureRoute): void => {
    setRouteStack((current) => [...current.slice(0, -1), route]);
  }, []);

  const resetToToday = useCallback(
    (input?: { notice?: string | undefined; highlightedTaskId?: string | undefined }): void => {
      setPushFallbackNotice(input?.notice);
      setHighlightedTaskId(input?.highlightedTaskId);
      setRouteStack(initialRouteStack);
    },
    [],
  );

  const goBack = useCallback((): void => {
    if (routeStack.length <= 1) {
      setPushFallbackNotice(todayCopy.navigation.alreadyHome);
      return;
    }

    setPushFallbackNotice(undefined);
    setRouteStack((current) => current.slice(0, -1));
  }, [routeStack.length]);

  useEffect(() => {
    let current = true;
    void repository
      .initialize()
      .then(async () => {
        const cache = await loadPrepareTurnCache(repository);
        if (!current) return;
        setPrepareTurnCache(cache);
        setPrepareTurnState(prepareTurnClient === undefined ? "ready" : "needs_prepare");
      })
      .catch(() => {
        if (!current) return;
        setInitializationError("Nao foi possivel preparar o registro local neste aparelho.");
        setPrepareTurnState(prepareTurnClient === undefined ? "ready" : "error");
      });

    return () => {
      current = false;
    };
  }, [prepareTurnClient, repository]);

  useEffect(() => {
    const subscription = addHardwareBackPressListener(() => {
      goBack();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [goBack]);

  useEffect(() => {
    const subscription = resolvedAlertChannel.subscribeToNotificationResponses((payload) => {
      void repository.resolvePushOpenIntent(payload).then(async (intent) => {
        setPushFallbackNotice(undefined);
        setHighlightedTaskId(undefined);

        if (intent.result === "current_task") {
          const task = await repository.loadTodayTask(intent.taskId);

          if (
            task !== null &&
            task.status === "active" &&
            task.activeKey === intent.taskActiveKey
          ) {
            setHighlightedTaskId(task.id);
            setRouteStack([{ name: "today" }, { name: "task-resolution", task }]);
          }

          return;
        }

        if (intent.result === "task_updated") {
          setPushFallbackNotice("Esta pendencia foi atualizada. Abra a tarefa atual em Hoje.");
        } else if (intent.result === "task_resolved") {
          setPushFallbackNotice(
            "Esta pendencia ja foi resolvida fisicamente. Confira as tarefas restantes.",
          );
        } else {
          setPushFallbackNotice(
            "Nao foi possivel abrir esta notificacao. Confira as tarefas ativas em Hoje.",
          );
        }

        setRouteStack(initialRouteStack);
      });
    });

    return () => {
      subscription.remove();
    };
  }, [repository, resolvedAlertChannel]);

  async function prepareTurn(): Promise<void> {
    if (prepareTurnClient === undefined) {
      setPrepareTurnState("ready");
      return;
    }

    setPrepareTurnError(undefined);
    setPrepareTurnState("preparing");

    try {
      const [cache, queue] = await Promise.all([
        loadPrepareTurnCache(repository),
        repository.listSyncQueue(),
      ]);
      const response = await prepareTurnClient({
        deviceId: `validade-zero-mobile:${storeId}`,
        requestedAt: new Date().toISOString(),
        appVersion: "phase-10-pilot",
        localSnapshot: {
          ...(cache?.lastCentralReadAt === undefined
            ? {}
            : { lastCentralReadAt: cache.lastCentralReadAt }),
          knownProductCount: cache?.productCount ?? 0,
          knownLotCount: cache?.lotCount ?? 0,
          pendingCommandCount: queue.totalCount,
        },
      });

      await hydratePrepareTurn(repository, response);
      setPrepareTurnCache(response.cache);

      if (response.store.readiness === "prepared") {
        setPrepareTurnSource("central");
        setPrepareTurnState("ready");
        return;
      }

      setPrepareTurnError(response.store.blockers[0] ?? "A leitura central exige revisao.");
      setPrepareTurnState("needs_review");
    } catch {
      const cache = await loadPrepareTurnCache(repository).catch(() => null);
      setPrepareTurnCache(cache);
      setPrepareTurnError("Nao foi possivel baixar a leitura central agora.");
      setPrepareTurnState(cache?.state === "ready" ? "cache_only" : "error");
    }
  }

  function enterWithLocalCache(): void {
    if (prepareTurnCache === null || prepareTurnCache.state !== "ready") {
      setPrepareTurnState("needs_prepare");
      return;
    }

    setPrepareTurnSource("local_cache");
    setPrepareTurnState("ready");
  }

  function startFirstStoreSetup(): void {
    setPrepareTurnError(undefined);
    setPrepareTurnSource("central");
    setPrepareTurnState("ready");
    setRouteStack([{ name: "discovery" }]);
  }

  function requestCentralReprepare(): void {
    setPrepareTurnError(undefined);
    setPrepareTurnSource("local_cache");
    setPrepareTurnState("needs_prepare");
    setRouteStack(initialRouteStack);
  }

  async function loadMarkdownEntryStateFor(lotId: string): Promise<MarkdownEntryState | undefined> {
    const current = new Date();
    const currentTimestamp = current.toISOString();

    try {
      return await repository.loadMarkdownEntryState({
        lotId,
        currentDate: currentTimestamp.slice(0, 10),
        currentTimestamp,
      });
    } catch {
      return undefined;
    }
  }

  async function openLotDetail(lotId: string): Promise<void> {
    const loaded = await repository.loadLotDetail(lotId);

    if (loaded !== null) {
      navigate({
        name: "detail",
        detail: loaded,
        markdownEntryState: await loadMarkdownEntryStateFor(loaded.id),
      });
    }
  }

  async function refreshCurrentDetail(lotId: string): Promise<CaptureRoute | undefined> {
    const refreshed = await repository.loadLotDetail(lotId);

    if (refreshed !== null) {
      return {
        name: "detail",
        detail: refreshed,
        markdownEntryState: await loadMarkdownEntryStateFor(refreshed.id),
      };
    }

    return undefined;
  }

  async function requestMarkdownFromDetail(
    detail: CaptureLotDetail,
    request: LotDetailMarkdownRequest,
  ): Promise<void> {
    const occurredAt = new Date().toISOString();

    await repository.requestMarkdown({
      lotId: detail.id,
      actorLabel,
      occurredAt,
      reason: request.reason,
      ...(request.earlyJustification === undefined
        ? {}
        : { earlyJustification: request.earlyJustification }),
    });
    resetToToday();
  }

  async function openActiveMarkdownTask(
    route: Extract<CaptureRoute, { name: "detail" }>,
  ): Promise<void> {
    const entryState = route.markdownEntryState;
    if (entryState?.status !== "already_active") {
      resetToToday();
      return;
    }

    const activeTasks = await repository.listActiveTodayTasks();
    const task = activeTasks.find(
      (candidate) =>
        candidate.status === "active" && candidate.markdownWorkflowId === entryState.workflowId,
    );

    if (task === undefined) {
      resetToToday();
      return;
    }

    setHighlightedTaskId(task.id);
    navigate({ name: "task-resolution", task });
  }

  if (prepareTurnState !== "ready") {
    return (
      <PrepareTurnScreen
        cache={prepareTurnCache}
        error={initializationError ?? prepareTurnError}
        state={prepareTurnState}
        onPrepare={() => void prepareTurn()}
        onStartFirstSetup={
          isFirstStoreSetupState(prepareTurnCache) ? startFirstStoreSetup : undefined
        }
        onUseCache={prepareTurnCache?.state === "ready" ? enterWithLocalCache : undefined}
      />
    );
  }

  if (currentRoute.name === "today") {
    return (
      <>
        {initializationError === undefined ? null : (
          <StatusNotice tone="error">{initializationError}</StatusNotice>
        )}
        <TodayScreen
          alertChannel={resolvedAlertChannel}
          highlightedTaskId={highlightedTaskId}
          pushFallbackNotice={pushFallbackNotice}
          repository={repository}
          syncEngine={syncEngine}
          prepareTurnCacheStatus={prepareTurnCache}
          prepareTurnSource={prepareTurnSource}
          onRegisterLot={() => navigate({ name: "discovery" })}
          onOpenRecentLots={() => navigate({ name: "recent" })}
          onOpenTask={(task) => {
            setPushFallbackNotice(undefined);
            navigate({ name: "task-resolution", task });
          }}
          canCloseShift={activeRole === "lead"}
          actorLabel={actorLabel}
          onOpenShiftClose={() => navigate({ name: "shift-close" })}
        />
      </>
    );
  }

  if (currentRoute.name === "task-resolution") {
    return (
      <TaskResolutionPanel
        repository={repository}
        task={currentRoute.task}
        actorLabel={actorLabel}
        onBack={goBack}
        onDone={() => resetToToday()}
        onLocalSave={() => {
          resetToToday({
            notice: todayCopy.sync.localSaved,
            highlightedTaskId: currentRoute.task.id,
          });
        }}
      />
    );
  }

  if (currentRoute.name === "shift-close") {
    return (
      <ShiftCloseScreen
        repository={repository}
        canCloseShift={activeRole === "lead"}
        storeId={storeId}
        prepareTurnCacheStatus={prepareTurnCache}
        prepareTurnSource={prepareTurnSource}
        onSafeClose={closeShiftClient}
        onBack={goBack}
      />
    );
  }

  if (currentRoute.name === "product-form") {
    return (
      <ProductFormScreen
        repository={repository}
        {...(currentRoute.initialGtin === undefined
          ? {}
          : { initialGtin: currentRoute.initialGtin })}
        onBack={goBack}
        onCreated={(product) => {
          replace({ name: "confirmed", product });
        }}
      />
    );
  }

  if (currentRoute.name === "confirmed") {
    const mode =
      currentRoute.product.productRuleOverride?.mode ??
      currentRoute.product.categoryRuleProfile.mode;
    const needsCentralReprepareBeforeLot =
      prepareTurnClient !== undefined && prepareTurnCache?.state !== "ready";

    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader
          title="Produto confirmado"
          body="Produto pronto para o proximo passo. Registrar lote e opcional neste momento."
        />
        <Text style={styles.productName}>{currentRoute.product.displayName}</Text>
        <Text style={styles.metadata}>Categoria: {currentRoute.product.categoryId}</Text>
        <Text style={styles.metadata}>Perfil operacional: {productModeLabels[mode]}</Text>
        {currentRoute.product.reviewStatus === "pending_review" ? (
          <StatusNotice>
            Produto em rascunho. O lote entra com risco conservador ate a validacao.
          </StatusNotice>
        ) : null}
        {needsCentralReprepareBeforeLot ? (
          <>
            <StatusNotice>
              Produto salvo na central. Prepare o turno novamente para baixar a base da loja antes
              de registrar lote.
            </StatusNotice>
            <PrimaryAction label="Preparar turno novamente" onPress={requestCentralReprepare} />
          </>
        ) : (
          <PrimaryAction
            label={captureCopy.registerLot}
            onPress={() => navigate({ name: "lot-registration", product: currentRoute.product })}
          />
        )}
        <SecondaryAction label={captureCopy.backAndReview} onPress={goBack} />
        <SecondaryAction label="Voltar para Hoje" onPress={() => resetToToday()} />
      </ScrollView>
    );
  }

  if (currentRoute.name === "lot-registration") {
    return (
      <LotRegistrationScreen
        repository={repository}
        product={currentRoute.product}
        onBack={goBack}
        onSaved={() => resetToToday()}
      />
    );
  }

  if (currentRoute.name === "detail")
    return (
      <LotDetailScreen
        detail={currentRoute.detail}
        markdownEntryState={currentRoute.markdownEntryState}
        onObserve={() => navigate({ name: "observation", detail: currentRoute.detail })}
        onOpenActiveMarkdown={() => void openActiveMarkdownTask(currentRoute)}
        onRequestMarkdown={(request) => requestMarkdownFromDetail(currentRoute.detail, request)}
        onBack={goBack}
      />
    );
  if (currentRoute.name === "observation")
    return (
      <ObservationComposer
        repository={repository}
        detail={currentRoute.detail}
        onBack={goBack}
        onDone={() => {
          void refreshCurrentDetail(currentRoute.detail.id).then((route) => {
            if (route === undefined) {
              resetToToday();
              return;
            }

            setRouteStack((current) => [...current.slice(0, -2), route]);
          });
        }}
      />
    );
  if (currentRoute.name === "recent")
    return (
      <RecentLotList
        repository={repository}
        onRegister={() => navigate({ name: "discovery" })}
        onOpen={(lot) => {
          void openLotDetail(lot.id);
        }}
      />
    );
  if (currentRoute.name === "barcode")
    return (
      <BarcodeLookupAssistant
        onBack={goBack}
        onLookup={(value) => {
          replace({ name: "discovery", initialLookup: value });
        }}
      />
    );

  return (
    <>
      {initializationError === undefined ? null : (
        <StatusNotice tone="error">{initializationError}</StatusNotice>
      )}
      <ProductDiscoveryScreen
        repository={repository}
        onConfirmProduct={(product) => {
          navigate({ name: "confirmed", product });
        }}
        onCreateProduct={(gtin) => {
          navigate({ name: "product-form", initialGtin: gtin });
        }}
        onScanCode={() => navigate({ name: "barcode" })}
        onOpenRecent={() => navigate({ name: "recent" })}
        {...(currentRoute.name !== "discovery" || currentRoute.initialLookup === undefined
          ? {}
          : { initialLookup: currentRoute.initialLookup })}
      />
    </>
  );
}

async function loadPrepareTurnCache(
  repository: CaptureRepository,
): Promise<PrepareTurnCacheStatus | null> {
  return repository.loadPrepareTurnCacheStatus === undefined
    ? null
    : repository.loadPrepareTurnCacheStatus();
}

async function hydratePrepareTurn(
  repository: CaptureRepository,
  response: PrepareTurnResponse,
): Promise<void> {
  if (repository.hydratePrepareTurn === undefined) {
    throw new Error("Prepare-turn hydration is not available in this repository.");
  }

  await repository.hydratePrepareTurn(response);
}

function PrepareTurnScreen({
  cache,
  error,
  state,
  onPrepare,
  onStartFirstSetup,
  onUseCache,
}: {
  cache: PrepareTurnCacheStatus | null;
  error?: string | undefined;
  state: "checking" | "needs_prepare" | "preparing" | "needs_review" | "cache_only" | "error";
  onPrepare: () => void;
  onStartFirstSetup?: (() => void) | undefined;
  onUseCache?: (() => void) | undefined;
}) {
  const preparing = state === "checking" || state === "preparing";

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title="Preparar turno" body={prepareTurnBodyFor(state)} />
      <View style={styles.preparePanel}>
        <Text style={styles.prepareTitle}>{prepareTurnTitleFor(state)}</Text>
        <Text style={styles.prepareBody}>{prepareTurnDetailFor(state, cache)}</Text>
      </View>
      {cache === null ? null : (
        <View style={styles.prepareMetrics}>
          <Text style={styles.prepareMetric}>{cache.productCount} produtos centrais</Text>
          <Text style={styles.prepareMetric}>{cache.lotCount} lotes centrais</Text>
          <Text style={styles.prepareMetric}>{cache.activeTaskCount} tarefas ativas</Text>
          <Text style={styles.prepareMetric}>{cache.conflictCount} conflitos</Text>
        </View>
      )}
      {error === undefined ? null : <StatusNotice tone="error">{error}</StatusNotice>}
      <PrimaryAction
        disabled={preparing}
        label={state === "preparing" ? "Baixando leitura" : "Preparar turno"}
        onPress={onPrepare}
      />
      {onStartFirstSetup === undefined ? null : (
        <PrimaryAction label="Iniciar cadastro da loja" onPress={onStartFirstSetup} />
      )}
      {onUseCache === undefined ? null : (
        <SecondaryAction label="Entrar com leitura local" onPress={onUseCache} />
      )}
    </ScrollView>
  );
}

function isFirstStoreSetupState(cache: PrepareTurnCacheStatus | null): boolean {
  return (
    cache?.source === "central" &&
    cache.state === "needs_first_central_read" &&
    cache.productCount === 0 &&
    cache.lotCount === 0 &&
    cache.activeTaskCount === 0 &&
    cache.conflictCount === 0
  );
}

function prepareTurnTitleFor(state: Parameters<typeof PrepareTurnScreen>[0]["state"]): string {
  if (state === "checking") return "Conferindo este aparelho";
  if (state === "preparing") return "Baixando leitura central";
  if (state === "needs_review") return "Leitura central exige revisao";
  if (state === "cache_only") return "Central indisponivel";
  if (state === "error") return "Turno nao preparado";
  return "Leitura central obrigatoria";
}

function prepareTurnBodyFor(state: Parameters<typeof PrepareTurnScreen>[0]["state"]): string {
  if (state === "checking") return "Aguarde a verificacao local antes de abrir Hoje.";
  if (state === "preparing") return "Baixando a leitura central da loja...";
  if (state === "needs_review") {
    return "A central respondeu, mas ainda nao ha base suficiente para tratar a area como segura.";
  }
  if (state === "cache_only") {
    return "Use a leitura local apenas para continuar o trabalho visivel. Ela nao declara area segura.";
  }
  if (state === "error") return "Tente preparar novamente antes de operar o turno.";
  return "Baixe a leitura central da loja antes de abrir Hoje.";
}

function prepareTurnDetailFor(
  state: Parameters<typeof PrepareTurnScreen>[0]["state"],
  cache: PrepareTurnCacheStatus | null,
): string {
  if (cache === null) {
    return "Nenhuma leitura central esta salva neste aparelho.";
  }

  const lastRead =
    cache.lastCentralReadAt === undefined
      ? "sem leitura central confirmada"
      : cache.lastCentralReadAt;
  if (state === "cache_only") {
    return `Ultima leitura local: ${lastRead}. Confira pendencias antes de qualquer decisao.`;
  }

  return `Ultima leitura central: ${lastRead}. Estado do cache: ${cache.state}.`;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: 16,
    padding: 16,
  },
  productName: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  metadata: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  preparePanel: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  prepareTitle: {
    color: captureColors.ink,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 23,
  },
  prepareBody: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  prepareMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prepareMetric: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: captureColors.ink,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
