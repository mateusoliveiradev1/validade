import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ExpoCamera from "expo-camera";
import type {
  CaptureProductRecord,
  CaptureRepository,
  MarkdownEntryState,
  OnboardingProgressKey,
  TodayTaskRefreshSource,
} from "./repository";
import { MOBILE_FIRST_TURN_ONBOARDING } from "./repository";
import { captureCopy } from "./capture-copy";
import { productPolicyPreviewForProduct } from "./product-policy-copy";
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
import { OperationalOnboardingScreen } from "./OperationalOnboardingScreen";
import { TaskResolutionPanel } from "./TaskResolutionPanel";
import { ShiftCloseScreen } from "./ShiftCloseScreen";
import { AjustesScreen } from "./AjustesScreen";
import { ControleGppScreen } from "./ControleGppScreen";
import { GppAvariaFlow } from "./GppAvariaFlow";
import { GppPurchaseFlow } from "./GppPurchaseFlow";
import { GppPendingScreen } from "./GppPendingScreen";
import type { GppClient } from "./gpp-client";
import {
  sendGppPendingRecord,
  type GppPendingRecord,
  type GppSentTodayRecord,
} from "./gpp-offline-queue";
import type { ShiftCloseCompletion } from "./shift-close";
import type {
  PrepareTurnCacheStatus,
  PrepareTurnRequest,
  PrepareTurnResponse,
  DevicePushRegistrationCommand,
  ProductIdentifierInput,
  OnboardingProgressMutationRequest,
  OnboardingProgressQuery,
  OnboardingProgressResponse,
  SessionContextResponse,
  ShiftCloseSafeRequest,
  ShiftClosureSnapshot,
  SyncQueueSummary,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import type { ShiftCloseDeviceAuthorization, StoreOperatingHours } from "@validade-zero/domain";
import { createExpoPushAlertChannel, type PushAlertChannel } from "./alert-channel";
import type { SyncEngine, SyncEngineRunResult } from "./sync-engine";
import { todayCopy } from "./today-copy";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import { addHardwareBackPressListener } from "../system/hardware-back";
import { mobileStatusDescriptorFor, type MobileStatusDescriptor } from "./mobile-status";
import { readMobileBuildInfo, type MobileBuildInfo } from "../build-info";
import type { AuthGateReadyControls } from "../auth/AuthGate";
import { deviceIdForStore } from "./device-identity";
import { operationalDateKey } from "./operational-date";

export type CaptureRoute =
  | { name: "today" }
  | { name: "gpp-control" }
  | { name: "gpp-avaria" }
  | { name: "gpp-purchase" }
  | { name: "gpp-pending" }
  | { name: "gpp-sent-today" }
  | { name: "onboarding"; mode?: "review" | "first_turn" }
  | { name: "discovery"; initialLookup?: string | undefined; initialLookupSource?: "scan" }
  | {
      name: "product-form";
      initialGtin?: string | undefined;
      initialIdentifier?: ProductIdentifierInput | undefined;
    }
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
  | { name: "barcode" }
  | { name: "settings" };

const initialRouteStack: readonly CaptureRoute[] = [{ name: "today" }];
type PrepareTurnMode = "manual" | "silent";
type PrepareTurnIntent = NonNullable<PrepareTurnRequest["turnIntent"]>;
type RegisterPushDeviceClient = (request: DevicePushRegistrationCommand) => Promise<void>;
const PREPARE_TURN_DIAGNOSTIC_TIMEOUT_MS = 1500;
type OnboardingProgressClient = {
  loadOnboardingProgress(input: OnboardingProgressQuery): Promise<OnboardingProgressResponse>;
  saveOnboardingProgress(
    input: OnboardingProgressMutationRequest,
  ): Promise<OnboardingProgressResponse>;
};
type FirstTurnOnboardingDecision = "checking" | "show" | "hidden";
type PushDeviceIdentity = Pick<
  DevicePushRegistrationCommand,
  "deviceId" | "deviceLabel" | "audienceRole"
>;
type MobileActiveRole = SessionContextResponse["activeRole"];

export function canUseControleGppSession(session: SessionContextResponse | undefined): boolean {
  return (
    session?.featureFlags?.controle_gpp_enabled === true &&
    (session.actions?.canCreateGppEntry === true || session.actions?.canReadGppQueue === true)
  );
}

export function initialRouteForSession(
  session: SessionContextResponse | undefined,
  activeRole: MobileActiveRole | undefined,
): CaptureRoute {
  const resolvedRole = session?.activeRole ?? activeRole;
  return resolvedRole === "gpp" && canUseControleGppSession(session)
    ? { name: "gpp-control" }
    : { name: "today" };
}

export function CaptureApp({
  repository,
  alertChannel,
  gppClient,
  syncEngine,
  prepareTurnClient,
  onboardingClient,
  registerPushDeviceClient,
  closeShiftClient,
  buildInfo,
  authControls,
  session,
  activeRole = "lead",
  actorLabel = todayCopy.fallbackActor,
  storeId = "loja-local",
  deviceId,
  storeOperatingHours,
}: {
  repository: CaptureRepository;
  alertChannel?: PushAlertChannel;
  gppClient?: GppClient | undefined;
  syncEngine?: SyncEngine | undefined;
  prepareTurnClient?: ((request: PrepareTurnRequest) => Promise<PrepareTurnResponse>) | undefined;
  onboardingClient?: OnboardingProgressClient | undefined;
  registerPushDeviceClient?: RegisterPushDeviceClient | undefined;
  closeShiftClient?:
    | ((request: ShiftCloseSafeRequest) => Promise<ShiftClosureSnapshot>)
    | undefined;
  buildInfo?: MobileBuildInfo | undefined;
  authControls?: AuthGateReadyControls | undefined;
  session?: SessionContextResponse | undefined;
  activeRole?: MobileActiveRole | undefined;
  actorLabel?: string | undefined;
  storeId?: string | undefined;
  deviceId?: string | undefined;
  storeOperatingHours?: StoreOperatingHours | undefined;
}) {
  const [routeStack, setRouteStack] = useState<readonly CaptureRoute[]>(() => [
    initialRouteForSession(session, activeRole),
  ]);
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
  const [onboardingDecision, setOnboardingDecision] =
    useState<FirstTurnOnboardingDecision>("checking");
  const [firstTurnAssistActive, setFirstTurnAssistActive] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | undefined>();
  const [todayRefreshRequest, setTodayRefreshRequest] = useState<
    { id: number; source: TodayTaskRefreshSource } | undefined
  >();
  const [shiftCloseCompletion, setShiftCloseCompletion] = useState<
    ShiftCloseCompletion | undefined
  >();
  const [gppPendingRecords, setGppPendingRecords] = useState<readonly GppPendingRecord[]>([]);
  const [gppSentToday, setGppSentToday] = useState<readonly GppSentTodayRecord[]>([]);
  const [gppSyncNotice, setGppSyncNotice] = useState<
    { tone: "info" | "success" | "warning" | "critical"; title: string; body: string } | undefined
  >();
  const autoPrepareTurnAttemptedRef = useRef(false);
  const autoSyncAttemptedRef = useRef(false);
  const resolvedAlertChannel = useMemo(
    () => alertChannel ?? createExpoPushAlertChannel(),
    [alertChannel],
  );
  const resolvedBuildInfo = useMemo(() => buildInfo ?? readMobileBuildInfo(), [buildInfo]);
  const pushDeviceIdentity = useMemo(
    (): PushDeviceIdentity => ({
      deviceId: deviceId ?? deviceIdForStore(storeId, "local-preview"),
      deviceLabel: deviceLabelFor(resolvedBuildInfo.packageId),
      audienceRole: "shift_team",
    }),
    [deviceId, resolvedBuildInfo.packageId, storeId],
  );
  const firstTurnOnboardingKey = useMemo(
    (): OnboardingProgressKey => ({
      subjectId: session?.actor.subjectId ?? `local:${actorLabel}`,
      storeId: session?.store.storeId ?? storeId,
      ...MOBILE_FIRST_TURN_ONBOARDING,
    }),
    [actorLabel, session?.actor.subjectId, session?.store.storeId, storeId],
  );
  const currentRoute = routeStack[routeStack.length - 1] ?? { name: "today" };
  const canUseControleGpp = canUseControleGppSession(session);
  const isCentralGpp = (session?.activeRole ?? activeRole) === "gpp";
  const shiftCloseDeviceAuthorization = shiftCloseDeviceAuthorizationFor({
    activeRole,
    session,
    storeId,
  });
  const canCloseShiftSafely =
    session === undefined ? activeRole === "lead" : shiftCloseDeviceAuthorization === "valid";
  const refreshGppLists = useCallback(async (): Promise<void> => {
    const [localPending, sentToday] = await Promise.all([
      repository.listGppPending(),
      repository.listGppSentToday?.() ?? Promise.resolve([]),
    ]);
    setGppPendingRecords(localPending);
    setGppSentToday(sentToday);
  }, [repository]);

  const discardGppConflict = useCallback(
    async (localId: string, justification: string): Promise<void> => {
      const trimmedJustification = justification.trim();
      if (trimmedJustification.length === 0) return;

      await repository.discardGppPending({
        localId,
        justification: trimmedJustification,
        discardedAt: new Date().toISOString(),
      });
      await refreshGppLists();
      setGppSyncNotice({
        tone: "success",
        title: "Conflito descartado neste aparelho",
        body: "O registro local saiu da fila ativa com justificativa. Nenhuma baixa foi enviada para a central.",
      });
    },
    [refreshGppLists, repository],
  );

  const syncGppPendingNow = useCallback(async (): Promise<void> => {
    if (gppClient === undefined) {
      setGppSyncNotice({
        tone: "warning",
        title: "Sincronizacao GPP indisponivel",
        body: "Este app ainda nao recebeu o cliente GPP central. As pendencias continuam neste aparelho.",
      });
      return;
    }

    const pending = await repository.listGppPending();
    if (pending.length === 0) {
      setGppSyncNotice({
        tone: "success",
        title: "Sem pendencias GPP",
        body: "Nao ha registros locais aguardando envio para a central.",
      });
      await refreshGppLists();
      return;
    }

    setGppSyncNotice({
      tone: "info",
      title: "Sincronizando pendencias GPP",
      body: "Tentando enviar os registros locais para a central.",
    });

    let confirmedCount = 0;
    let conflictCount = 0;
    let stillPendingCount = 0;

    for (const record of pending) {
      const attemptedAt = new Date().toISOString();
      try {
        const result = await sendGppPendingRecord(gppClient, record);
        if (result.state === "central_success") {
          await repository.markGppPendingConfirmed({
            localId: record.localId,
            confirmedAt:
              result.response.state === "replayed"
                ? result.response.replayedAt
                : result.response.confirmedAt,
            centralRequestId: result.response.requestId,
          });
          confirmedCount += 1;
        } else if (result.state === "central_failure") {
          await repository.markGppPendingConflict({
            localId: record.localId,
            occurredAt: attemptedAt,
            reason: result.message,
          });
          conflictCount += 1;
        } else {
          stillPendingCount += 1;
        }
      } catch {
        stillPendingCount += 1;
      }
    }

    await refreshGppLists();
    if (conflictCount > 0) {
      setGppSyncNotice({
        tone: "critical",
        title: "Conflito de GPP",
        body: `${conflictCount} registro(s) foram recusados pela central e precisam de revisao.`,
      });
      return;
    }
    if (stillPendingCount > 0) {
      setGppSyncNotice({
        tone: "warning",
        title: "Ainda pendente neste aparelho",
        body: `${stillPendingCount} registro(s) nao chegaram na central. Tente novamente com internet estavel.`,
      });
      return;
    }
    setGppSyncNotice({
      tone: "success",
      title: "Pendencias sincronizadas",
      body: `${confirmedCount} registro(s) confirmados pela central e movidos para Enviadas hoje.`,
    });
  }, [gppClient, refreshGppLists, repository]);

  useEffect(() => {
    if (
      currentRoute.name === "gpp-control" ||
      currentRoute.name === "gpp-pending" ||
      currentRoute.name === "gpp-sent-today"
    ) {
      void refreshGppLists();
    }
  }, [currentRoute.name, refreshGppLists]);

  useEffect(() => {
    void refreshLocalPushRegistration(
      repository,
      resolvedAlertChannel,
      () => new Date().toISOString(),
      pushDeviceIdentity,
      registerPushDeviceClient,
    ).catch(() => undefined);
  }, [pushDeviceIdentity, registerPushDeviceClient, repository, resolvedAlertChannel]);

  const navigate = useCallback((route: CaptureRoute): void => {
    setRouteStack((current) => [...current, route]);
  }, []);

  const replace = useCallback((route: CaptureRoute): void => {
    setRouteStack((current) => [...current.slice(0, -1), route]);
  }, []);

  const resetToToday = useCallback(
    (input?: {
      notice?: string | undefined;
      highlightedTaskId?: string | undefined;
      refreshSource?: TodayTaskRefreshSource | undefined;
    }): void => {
      setPushFallbackNotice(input?.notice);
      setHighlightedTaskId(input?.highlightedTaskId);
      const refreshSource = input?.refreshSource;
      if (refreshSource !== undefined) {
        setTodayRefreshRequest((current) => ({
          id: (current?.id ?? 0) + 1,
          source: refreshSource,
        }));
      }
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

  const rememberShiftCloseCompletion = useCallback(
    (completion: ShiftCloseCompletion): void => {
      setShiftCloseCompletion(completion);
      void repository.saveShiftCloseCompletion?.(completion).catch(() => undefined);
    },
    [repository],
  );

  const rememberFirstTurnOnboarding = useCallback(
    async (status: OnboardingProgressMutationRequest["status"]): Promise<void> => {
      const occurredAt = new Date().toISOString();
      await repository
        .saveOnboardingProgress?.({
          ...firstTurnOnboardingKey,
          status,
          occurredAt,
        })
        .catch(() => undefined);
      await onboardingClient
        ?.saveOnboardingProgress({
          flowId: firstTurnOnboardingKey.flowId,
          version: firstTurnOnboardingKey.version,
          status,
          occurredAt,
          deviceId: pushDeviceIdentity.deviceId,
        })
        .catch(() => undefined);
      setOnboardingDecision("hidden");
    },
    [firstTurnOnboardingKey, onboardingClient, pushDeviceIdentity.deviceId, repository],
  );

  const skipFirstTurnOnboarding = useCallback(async (): Promise<void> => {
    setFirstTurnAssistActive(false);
    await rememberFirstTurnOnboarding("skipped");
    resetToToday();
  }, [rememberFirstTurnOnboarding, resetToToday]);

  const completeFirstTurnOnboarding = useCallback(
    async (notice?: string): Promise<void> => {
      setFirstTurnAssistActive(false);
      await rememberFirstTurnOnboarding("completed");
      resetToToday({
        notice:
          notice ??
          "Primeiro lote registrado. Hoje agora mostra tarefas, radar futuro ou historico do turno.",
        refreshSource: "lot_change",
      });
    },
    [rememberFirstTurnOnboarding, resetToToday],
  );

  useEffect(() => {
    let current = true;

    if (prepareTurnState !== "ready") {
      setOnboardingDecision("checking");
      return () => {
        current = false;
      };
    }

    setOnboardingDecision("checking");
    void resolveFirstTurnOnboardingDecision({
      repository,
      onboardingClient,
      key: firstTurnOnboardingKey,
    })
      .then((decision) => {
        if (current) {
          setOnboardingDecision(decision);
        }
      })
      .catch(() => {
        if (current) {
          setOnboardingDecision("show");
        }
      });

    return () => {
      current = false;
    };
  }, [firstTurnOnboardingKey, onboardingClient, prepareTurnState, repository]);

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

  const prepareTurn = useCallback(
    async (
      mode: PrepareTurnMode = "manual",
      turnIntent: PrepareTurnIntent = "refresh",
    ): Promise<void> => {
      const isSilent = mode === "silent";

      if (prepareTurnClient === undefined) {
        if (!isSilent) {
          setPrepareTurnState("ready");
        }
        return;
      }

      autoPrepareTurnAttemptedRef.current = true;
      if (!isSilent) {
        setPrepareTurnError(undefined);
        setPrepareTurnState("preparing");
      }

      try {
        const [cache, queue, pushReadiness, cameraPermission] = await Promise.all([
          bestEffortPrepareTurnValue(
            loadPrepareTurnCache(repository),
            null,
            PREPARE_TURN_DIAGNOSTIC_TIMEOUT_MS,
          ),
          bestEffortPrepareTurnValue(
            repository.listSyncQueue(),
            emptySyncQueueSummary(),
            PREPARE_TURN_DIAGNOSTIC_TIMEOUT_MS,
          ),
          bestEffortPrepareTurnValue(
            resolvePrepareTurnPushReadiness(
              repository,
              resolvedAlertChannel,
              () => new Date().toISOString(),
              pushDeviceIdentity,
              registerPushDeviceClient,
            ),
            {
              pushPermission: "unknown",
              pushProviderState: "not_configured",
            },
            PREPARE_TURN_DIAGNOSTIC_TIMEOUT_MS,
          ),
          bestEffortPrepareTurnValue(
            readCameraPermissionState(),
            undefined,
            PREPARE_TURN_DIAGNOSTIC_TIMEOUT_MS,
          ),
        ]);
        const requestedAt = new Date().toISOString();
        const response = await prepareTurnClient({
          deviceId: pushDeviceIdentity.deviceId,
          deviceLabel: pushDeviceIdentity.deviceLabel,
          requestedAt,
          turnIntent,
          appVersion: resolvedBuildInfo.appVersion,
          appBuild: resolvedBuildInfo.appBuild,
          environment: resolvedBuildInfo.environment,
          apiTarget: resolvedBuildInfo.apiTarget,
          lastForegroundAt: requestedAt,
          ...pushReadiness,
          ...(cameraPermission === undefined ? {} : { cameraPermission }),
          localSnapshot: {
            ...(cache?.lastCentralReadAt === undefined
              ? {}
              : { lastCentralReadAt: cache.lastCentralReadAt }),
            lastSyncedAt: queue.updatedAt,
            knownProductCount: cache?.productCount ?? 0,
            knownLotCount: cache?.lotCount ?? 0,
            pendingCommandCount: queue.totalCount,
          },
        });

        await hydratePrepareTurn(repository, response);
        const centralShiftCloseCompletion = shiftCloseCompletionFromPrepareTurn(response);
        if (centralShiftCloseCompletion === undefined) {
          setShiftCloseCompletion(undefined);
          await repository.clearShiftCloseCompletion?.().catch(() => undefined);
        } else {
          setShiftCloseCompletion(centralShiftCloseCompletion);
          await repository
            .saveShiftCloseCompletion?.(centralShiftCloseCompletion)
            .catch(() => undefined);
        }
        setPrepareTurnCache(response.cache);
        setPrepareTurnSource("central");

        if (response.store.readiness === "prepared" || response.store.readiness === "cache_ready") {
          setPrepareTurnState("ready");
          if (isSilent) {
            setTodayRefreshRequest((current) => ({
              id: (current?.id ?? 0) + 1,
              source: "today_open",
            }));
          }
          return;
        }

        if (isSilent) {
          setPrepareTurnState("ready");
          setTodayRefreshRequest((current) => ({
            id: (current?.id ?? 0) + 1,
            source: "today_open",
          }));
          return;
        }

        setPrepareTurnError(response.store.blockers[0] ?? "A leitura central exige revisao.");
        setPrepareTurnState("needs_review");
      } catch {
        const cache = await loadPrepareTurnCache(repository).catch(() => null);
        setPrepareTurnCache(cache);
        if (isSilent) {
          if (cache?.state === "ready") {
            setPrepareTurnSource(cache.source === "central" ? "central" : "local_cache");
            setPrepareTurnState("ready");
          }
          return;
        }

        setPrepareTurnError("Nao foi possivel baixar a leitura central agora.");
        setPrepareTurnState(cache?.state === "ready" ? "cache_only" : "error");
      }
    },
    [
      prepareTurnClient,
      pushDeviceIdentity,
      registerPushDeviceClient,
      repository,
      resolvedAlertChannel,
      resolvedBuildInfo,
    ],
  );

  useEffect(() => {
    let current = true;
    void repository
      .initialize()
      .then(async () => {
        const [cache, storedShiftCloseCompletion] = await Promise.all([
          loadPrepareTurnCache(repository),
          repository.loadShiftCloseCompletion?.() ?? Promise.resolve(null),
        ]);
        if (!current) return;
        setPrepareTurnCache(cache);
        setShiftCloseCompletion(storedShiftCloseCompletion ?? undefined);
        if (prepareTurnClient === undefined) {
          setPrepareTurnState("ready");
          return;
        }

        if (cache?.state === "ready") {
          setPrepareTurnSource(cache.source === "central" ? "central" : "local_cache");
          setPrepareTurnState("ready");
          if (!autoPrepareTurnAttemptedRef.current) {
            void prepareTurn("silent");
          }
          return;
        }

        setPrepareTurnState("needs_prepare");
      })
      .catch(() => {
        if (!current) return;
        setInitializationError("Nao foi possivel preparar o registro local neste aparelho.");
        setPrepareTurnState(prepareTurnClient === undefined ? "ready" : "error");
      });

    return () => {
      current = false;
    };
  }, [prepareTurn, prepareTurnClient, repository]);

  const syncPendingCommandsAutomatically = useCallback(async (): Promise<void> => {
    const [syncedLots, result] = await Promise.all([
      repository.syncPendingCentralLots === undefined
        ? Promise.resolve([])
        : repository.syncPendingCentralLots().catch(() => []),
      syncEngine === undefined
        ? Promise.resolve(undefined)
        : syncEngine.syncPendingCommands({
            deviceId: pushDeviceIdentity.deviceId,
          }),
    ]);

    if (syncedLots.length > 0 || (result?.state === "sent" && result.appliedResults.length > 0)) {
      await prepareTurn("silent");
    }
  }, [prepareTurn, pushDeviceIdentity.deviceId, repository, syncEngine]);

  const syncPendingCommandsNow = useCallback(async (): Promise<SyncEngineRunResult | undefined> => {
    if (syncEngine === undefined) {
      return undefined;
    }

    const result = await syncEngine.syncPendingCommands({
      deviceId: pushDeviceIdentity.deviceId,
      manual: true,
      maxBatchSize: 50,
    });

    if (result.state === "sent" && result.appliedResults.length > 0) {
      await prepareTurn("silent");
    }

    return result;
  }, [prepareTurn, pushDeviceIdentity.deviceId, syncEngine]);

  useEffect(() => {
    if (
      autoPrepareTurnAttemptedRef.current ||
      prepareTurnClient === undefined ||
      prepareTurnState !== "ready" ||
      prepareTurnCache?.state !== "ready"
    ) {
      return;
    }

    void prepareTurn("silent");
  }, [
    prepareTurn,
    prepareTurnCache?.source,
    prepareTurnCache?.state,
    prepareTurnClient,
    prepareTurnState,
  ]);

  useEffect(() => {
    if (
      autoSyncAttemptedRef.current ||
      (syncEngine === undefined && repository.syncPendingCentralLots === undefined) ||
      prepareTurnState !== "ready" ||
      prepareTurnCache?.state !== "ready" ||
      prepareTurnCache.source !== "central"
    ) {
      return;
    }

    autoSyncAttemptedRef.current = true;
    void syncPendingCommandsAutomatically().catch(() => undefined);
  }, [
    prepareTurnCache?.source,
    prepareTurnCache?.state,
    prepareTurnState,
    repository,
    syncEngine,
    syncPendingCommandsAutomatically,
  ]);

  function enterWithLocalCache(): void {
    if (prepareTurnCache === null || prepareTurnCache.state !== "ready") {
      setPrepareTurnState("needs_prepare");
      return;
    }

    setPrepareTurnSource("local_cache");
    setPrepareTurnState("ready");
  }

  async function startFirstStoreSetup(): Promise<void> {
    setPrepareTurnError(undefined);
    setShiftCloseCompletion(undefined);
    await repository.clearShiftCloseCompletion?.().catch(() => undefined);
    setPrepareTurnSource("central");
    setPrepareTurnState("ready");
    const decision = await resolveFirstTurnOnboardingDecision({
      repository,
      onboardingClient,
      key: firstTurnOnboardingKey,
    }).catch((): FirstTurnOnboardingDecision => "show");
    setOnboardingDecision(decision);
    setRouteStack(
      decision === "hidden" ? [{ name: "today" }, { name: "discovery" }] : [{ name: "today" }],
    );
  }

  function openGuidedLotRegistration(input?: { firstTurnAssist?: boolean | undefined }): void {
    setFirstTurnAssistActive(input?.firstTurnAssist === true);
    setRouteStack([{ name: "today" }, { name: "discovery" }]);
  }

  async function completeLotRegistration(): Promise<void> {
    if (firstTurnAssistActive) {
      await completeFirstTurnOnboarding();
      return;
    }

    resetToToday({ refreshSource: "lot_change" });
  }

  function requestCentralReprepare(): void {
    setPrepareTurnError(undefined);
    setRouteStack(initialRouteStack);
    void prepareTurn("manual", "refresh");
  }

  function requestNextTurnPrepare(): void {
    setPrepareTurnError(undefined);
    setRouteStack(initialRouteStack);
    void prepareTurn("manual", "start_next_turn");
  }

  async function loadMarkdownEntryStateFor(lotId: string): Promise<MarkdownEntryState | undefined> {
    const current = new Date();
    const currentTimestamp = current.toISOString();

    try {
      return await repository.loadMarkdownEntryState({
        lotId,
        currentDate: operationalDateKey(current),
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
    await syncPendingCommandsAutomatically().catch(() => undefined);
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

  function withSessionBar(content: ReactNode): ReactNode {
    return (
      <View style={styles.appShell}>
        <CaptureSessionBar
          activeRouteName={currentRoute.name}
          actorLabel={session?.actor.displayName ?? actorLabel}
          canUseControleGpp={canUseControleGpp}
          onOpenControleGpp={() => navigate({ name: "gpp-control" })}
          role={session?.activeRole ?? activeRole}
          storeName={session?.store.storeName ?? storeId}
          onOpenSettings={() => navigate({ name: "settings" })}
        />
        <View style={styles.appContent}>{content}</View>
      </View>
    );
  }

  if (currentRoute.name === "settings") {
    return withSessionBar(
      <AjustesScreen
        alertChannel={resolvedAlertChannel}
        authControls={authControls}
        buildInfo={resolvedBuildInfo}
        onBack={goBack}
        onRequestCentralRefresh={requestCentralReprepare}
        prepareTurnCacheStatus={prepareTurnCache}
        prepareTurnSource={prepareTurnSource}
        pushDeviceIdentity={pushDeviceIdentity}
        repository={repository}
        session={session}
        syncEngine={syncEngine}
        onOpenOnboarding={() => navigate({ name: "onboarding", mode: "review" })}
        onConfirmCentralDeviceState={() => prepareTurn("silent")}
        {...(registerPushDeviceClient === undefined
          ? {}
          : { onRegisterPushDevice: registerPushDeviceClient })}
      />,
    );
  }

  if (currentRoute.name === "gpp-control") {
    return withSessionBar(
      <ControleGppScreen
        mode={isCentralGpp ? "central" : "sector"}
        pendingCount={gppPendingRecords.length}
        sentTodayCount={gppSentToday.length}
        lastCentralAckAt={gppSentToday[0]?.confirmedAt}
        onBack={resetToToday}
        onRegisterAvaria={() => navigate({ name: "gpp-avaria" })}
        onRequestPurchase={() => navigate({ name: "gpp-purchase" })}
        onOpenPending={() => navigate({ name: "gpp-pending" })}
        onOpenSentToday={() => navigate({ name: "gpp-sent-today" })}
      />,
    );
  }

  if (currentRoute.name === "gpp-avaria") {
    return withSessionBar(
      <GppAvariaFlow
        client={gppClient}
        repository={repository}
        storeId={session?.store.storeId ?? storeId}
        onBack={() => replace({ name: "gpp-control" })}
      />,
    );
  }

  if (currentRoute.name === "gpp-purchase") {
    return withSessionBar(
      <GppPurchaseFlow
        client={gppClient}
        repository={repository}
        storeId={session?.store.storeId ?? storeId}
        onBack={() => replace({ name: "gpp-control" })}
      />,
    );
  }

  if (currentRoute.name === "gpp-pending" || currentRoute.name === "gpp-sent-today") {
    if (isCentralGpp) {
      return withSessionBar(
        <GppCentralUnavailableScreen onBack={() => replace({ name: "gpp-control" })} />,
      );
    }

    return withSessionBar(
      <GppPendingScreen
        localPending={gppPendingRecords}
        sentToday={gppSentToday}
        mode={currentRoute.name === "gpp-sent-today" ? "sent" : "pending"}
        syncNotice={gppSyncNotice}
        onBack={() => replace({ name: "gpp-control" })}
        onDiscardConflict={(localId, justification) => {
          void discardGppConflict(localId, justification);
        }}
        onSyncPending={() => void syncGppPendingNow()}
      />,
    );
  }

  if (prepareTurnState !== "ready") {
    return withSessionBar(
      <PrepareTurnScreen
        cache={prepareTurnCache}
        error={initializationError ?? prepareTurnError}
        state={prepareTurnState}
        onPrepare={() => void prepareTurn("manual")}
        onStartFirstSetup={
          isFirstStoreSetupState(prepareTurnCache) ? () => void startFirstStoreSetup() : undefined
        }
        onUseCache={prepareTurnCache?.state === "ready" ? enterWithLocalCache : undefined}
      />,
    );
  }

  if (currentRoute.name === "today") {
    if (onboardingDecision === "checking") {
      return withSessionBar(<FirstTurnOnboardingLoadingScreen />);
    }

    if (onboardingDecision === "show") {
      return withSessionBar(
        <OperationalOnboardingScreen
          mode="first_turn"
          prepareTurnCacheStatus={prepareTurnCache}
          prepareTurnSource={prepareTurnSource}
          storeName={session?.store.storeName ?? storeId}
          onBack={() => void skipFirstTurnOnboarding()}
          onOpenToday={() => void skipFirstTurnOnboarding()}
          onRegisterLot={() => openGuidedLotRegistration({ firstTurnAssist: true })}
          onSkip={() => void skipFirstTurnOnboarding()}
        />,
      );
    }

    return withSessionBar(
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
          pushDeviceIdentity={pushDeviceIdentity}
          refreshRequest={todayRefreshRequest}
          shiftCloseCompletion={shiftCloseCompletion}
          storeOperatingHours={storeOperatingHours}
          {...(registerPushDeviceClient === undefined
            ? {}
            : { onRegisterPushDevice: registerPushDeviceClient })}
          onRegisterLot={() => navigate({ name: "discovery" })}
          onOpenRecentLots={() => navigate({ name: "recent" })}
          onOpenTask={(task) => {
            setPushFallbackNotice(undefined);
            navigate({ name: "task-resolution", task });
          }}
          onConfirmCentralDeviceState={() => prepareTurn("silent")}
          onRequestCentralRefresh={requestCentralReprepare}
          onPrepareNextTurn={requestNextTurnPrepare}
          canCloseShift={canCloseShiftSafely}
          actorLabel={actorLabel}
          onOpenShiftClose={() => navigate({ name: "shift-close" })}
        />
      </>,
    );
  }

  if (currentRoute.name === "onboarding") {
    return withSessionBar(
      <OperationalOnboardingScreen
        mode={currentRoute.mode ?? "review"}
        prepareTurnCacheStatus={prepareTurnCache}
        prepareTurnSource={prepareTurnSource}
        storeName={session?.store.storeName ?? storeId}
        onBack={goBack}
        onOpenToday={() => resetToToday()}
        onRegisterLot={() =>
          openGuidedLotRegistration({ firstTurnAssist: currentRoute.mode === "first_turn" })
        }
      />,
    );
  }

  if (currentRoute.name === "task-resolution") {
    return withSessionBar(
      <TaskResolutionPanel
        repository={repository}
        task={currentRoute.task}
        actorLabel={actorLabel}
        onBack={goBack}
        onDone={() => resetToToday()}
        onCentralSave={() =>
          resetToToday({
            notice: todayCopy.sync.centralSaved,
          })
        }
        onSyncCentralAction={syncPendingCommandsNow}
        onLocalSave={() => {
          resetToToday({
            notice: todayCopy.sync.localSaved,
            highlightedTaskId: currentRoute.task.id,
          });
          void syncPendingCommandsAutomatically().catch(() => undefined);
        }}
      />,
    );
  }

  if (currentRoute.name === "shift-close") {
    return withSessionBar(
      <ShiftCloseScreen
        repository={repository}
        canCloseShift={canCloseShiftSafely}
        storeId={storeId}
        prepareTurnCacheStatus={prepareTurnCache}
        prepareTurnSource={prepareTurnSource}
        buildInfo={resolvedBuildInfo}
        deviceAuthorization={shiftCloseDeviceAuthorization}
        onSafeClose={closeShiftClient}
        onShiftCloseComplete={rememberShiftCloseCompletion}
        onBack={goBack}
      />,
    );
  }

  if (currentRoute.name === "product-form") {
    return withSessionBar(
      <ProductFormScreen
        repository={repository}
        {...(currentRoute.initialGtin === undefined
          ? {}
          : { initialGtin: currentRoute.initialGtin })}
        {...(currentRoute.initialIdentifier === undefined
          ? {}
          : { initialIdentifier: currentRoute.initialIdentifier })}
        onBack={goBack}
        onCreated={(product) => {
          replace({ name: "confirmed", product });
        }}
      />,
    );
  }

  if (currentRoute.name === "confirmed") {
    const needsCentralReprepareBeforeLot =
      prepareTurnClient !== undefined && prepareTurnCache?.state !== "ready";

    return withSessionBar(
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader
          title="Produto escolhido"
          body="Agora registre o lote fisico deste produto: validade, quantidade e local."
        />
        <Text style={styles.productName}>{currentRoute.product.displayName}</Text>
        <Text style={styles.metadata}>Categoria: {currentRoute.product.categoryId}</Text>
        <StatusNotice title="Politica do lote">
          {productPolicyPreviewForProduct(currentRoute.product)}
        </StatusNotice>
        {currentRoute.product.reviewStatus === "pending_review" ? (
          <StatusNotice title="Cadastro em revisao central" tone="warning">
            O lote pode ser registrado e sincronizado, mas este produto ainda aparece no painel como
            cadastro em revisao ate a validacao central.
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
      </ScrollView>,
    );
  }

  if (currentRoute.name === "lot-registration") {
    return withSessionBar(
      <LotRegistrationScreen
        repository={repository}
        product={currentRoute.product}
        onBack={goBack}
        onDone={() => void completeLotRegistration()}
      />,
    );
  }

  if (currentRoute.name === "detail")
    return withSessionBar(
      <LotDetailScreen
        detail={currentRoute.detail}
        markdownEntryState={currentRoute.markdownEntryState}
        onObserve={() => navigate({ name: "observation", detail: currentRoute.detail })}
        onOpenActiveMarkdown={() => void openActiveMarkdownTask(currentRoute)}
        onRequestMarkdown={(request) => requestMarkdownFromDetail(currentRoute.detail, request)}
        onBack={goBack}
      />,
    );
  if (currentRoute.name === "observation")
    return withSessionBar(
      <ObservationComposer
        repository={repository}
        detail={currentRoute.detail}
        onBack={goBack}
        onAfterSave={() => syncPendingCommandsAutomatically()}
        onDone={() => {
          void refreshCurrentDetail(currentRoute.detail.id).then((route) => {
            if (route === undefined) {
              resetToToday();
              return;
            }

            setRouteStack((current) => [...current.slice(0, -2), route]);
          });
        }}
      />,
    );
  if (currentRoute.name === "recent")
    return withSessionBar(
      <RecentLotList
        repository={repository}
        onRegister={() => navigate({ name: "discovery" })}
        onOpen={(lot) => {
          void openLotDetail(lot.id);
        }}
      />,
    );
  if (currentRoute.name === "barcode")
    return withSessionBar(
      <BarcodeLookupAssistant
        onBack={goBack}
        onLookup={(value) => {
          replace({ name: "discovery", initialLookup: value, initialLookupSource: "scan" });
        }}
      />,
    );

  return withSessionBar(
    <>
      {initializationError === undefined ? null : (
        <StatusNotice tone="error">{initializationError}</StatusNotice>
      )}
      <ProductDiscoveryScreen
        repository={repository}
        onConfirmProduct={(product) => {
          navigate({ name: "confirmed", product });
        }}
        onCreateProduct={(initial) => {
          navigate({
            name: "product-form",
            ...(initial?.gtin === undefined ? {} : { initialGtin: initial.gtin }),
            ...(initial?.identifier === undefined ? {} : { initialIdentifier: initial.identifier }),
          });
        }}
        onScanCode={() => navigate({ name: "barcode" })}
        onOpenRecent={() => navigate({ name: "recent" })}
        {...(currentRoute.name !== "discovery" || currentRoute.initialLookup === undefined
          ? {}
          : {
              initialLookup: currentRoute.initialLookup,
              ...(currentRoute.initialLookupSource === undefined
                ? {}
                : { initialLookupSource: currentRoute.initialLookupSource }),
            })}
      />
    </>,
  );
}

function GppCentralUnavailableScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Fila central em preparacao"
        body="Esta conta GPP ainda nao tem a tela completa de atendimento neste aparelho."
      />
      <StatusNotice title="Nada para atender aqui por enquanto" tone="info">
        Envios confirmados pelo setor continuam aparecendo em Enviadas hoje no aparelho do setor. A
        baixa de avaria, atendimento de compra e resposta de divergencia entram na proxima tela
        central.
      </StatusNotice>
      <SecondaryAction label="Voltar para Fila GPP" onPress={onBack} />
    </ScrollView>
  );
}

function CaptureSessionBar({
  activeRouteName,
  actorLabel,
  canUseControleGpp,
  onOpenControleGpp,
  role,
  storeName,
  onOpenSettings,
}: {
  activeRouteName: CaptureRoute["name"];
  actorLabel: string;
  canUseControleGpp: boolean;
  onOpenControleGpp: () => void;
  role: MobileActiveRole;
  storeName: string;
  onOpenSettings: () => void;
}) {
  const isGppRoute = isControleGppRoute(activeRouteName);
  const isSettingsRoute = activeRouteName === "settings";
  const areaLabel = sessionAreaLabel(activeRouteName, role);

  const sessionSubtitle = `${roleLabel(role)}: ${actorLabel}`;

  return (
    <View style={styles.sessionBar}>
      <View style={styles.sessionTopRow}>
        <View style={styles.sessionIdentity}>
          <Text numberOfLines={1} style={styles.sessionStore}>
            {storeName}
          </Text>
          <View style={styles.sessionMetaRow}>
            <Text numberOfLines={1} style={styles.sessionArea}>
              {areaLabel}
            </Text>
            <View style={styles.sessionMetaDivider} />
            <Text numberOfLines={1} style={styles.sessionLabel}>
              {sessionSubtitle}
            </Text>
          </View>
        </View>

        <View style={styles.sessionActions}>
          {canUseControleGpp && !isGppRoute ? (
            <Pressable
              accessibilityLabel="Abrir Controle GPP"
              accessibilityRole="button"
              hitSlop={4}
              onPress={onOpenControleGpp}
              style={({ pressed }) => [
                styles.sessionSecondaryAction,
                pressed ? styles.sessionActionPressed : null,
              ]}
            >
              <Text style={styles.sessionSecondaryActionLabel}>GPP</Text>
            </Pressable>
          ) : null}

          {isSettingsRoute ? null : (
            <Pressable
              accessibilityLabel="Abrir Ajustes do aparelho"
              accessibilityRole="button"
              hitSlop={4}
              onPress={onOpenSettings}
              style={({ pressed }) => [
                styles.sessionIconAction,
                pressed ? styles.sessionActionPressed : null,
              ]}
            >
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={styles.sessionIconActionLabel}
              >
                ⚙
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function isControleGppRoute(routeName: CaptureRoute["name"]): boolean {
  return (
    routeName === "gpp-control" ||
    routeName === "gpp-avaria" ||
    routeName === "gpp-purchase" ||
    routeName === "gpp-pending" ||
    routeName === "gpp-sent-today"
  );
}

function sessionAreaLabel(routeName: CaptureRoute["name"], role: MobileActiveRole): string {
  if (routeName === "gpp-control") return role === "gpp" ? "Fila GPP" : "Controle GPP";
  if (routeName === "gpp-avaria") return "Avaria GPP";
  if (routeName === "gpp-purchase") return "Compra interna";
  if (routeName === "gpp-pending") return "Pendencias GPP";
  if (routeName === "gpp-sent-today") return "Enviadas GPP";
  if (routeName === "settings") return "Ajustes";
  if (routeName === "today") return "Turno";
  if (routeName === "shift-close") return "Fechamento";
  return "Turno";
}

function roleLabel(role: MobileActiveRole): string {
  if (role === "gpp") return "GPP";
  if (role === "admin") return "Administracao";
  if (role === "lead") return "Lideranca";
  return "Setor";
}

function FirstTurnOnboardingLoadingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Abrindo turno"
        body="Conferindo se este usuario ja concluiu os primeiros passos nesta loja."
      />
      <StatusNotice title="Verificacao rapida">
        Se o app nao conseguir confirmar online agora, o guia aparece com opcao de pular e abrir
        Hoje.
      </StatusNotice>
    </ScrollView>
  );
}

async function resolveFirstTurnOnboardingDecision(input: {
  repository: CaptureRepository;
  onboardingClient?: OnboardingProgressClient | undefined;
  key: OnboardingProgressKey;
}): Promise<FirstTurnOnboardingDecision> {
  const localProgress = await input.repository
    .loadOnboardingProgress?.(input.key)
    .catch(() => null);

  if (localProgress !== null && localProgress !== undefined) {
    return "hidden";
  }

  if (await hasLocalOnboardingActivationSignal(input.repository)) {
    return "hidden";
  }

  const centralProgress = await input.onboardingClient
    ?.loadOnboardingProgress({
      flowId: input.key.flowId,
      version: input.key.version,
    })
    .catch(() => undefined);

  if (centralProgress !== undefined && !centralProgress.shouldShow) {
    return "hidden";
  }

  return "show";
}

async function hasLocalOnboardingActivationSignal(repository: CaptureRepository): Promise<boolean> {
  const [lots, activeTasks] = await Promise.all([
    repository.listRecentLots({ limit: 1 }).catch(() => []),
    repository.listActiveTodayTasks().catch(() => []),
  ]);

  return lots.length > 0 || activeTasks.length > 0;
}

async function loadPrepareTurnCache(
  repository: CaptureRepository,
): Promise<PrepareTurnCacheStatus | null> {
  return repository.loadPrepareTurnCacheStatus === undefined
    ? null
    : repository.loadPrepareTurnCacheStatus();
}

function shiftCloseCompletionFromPrepareTurn(
  response: PrepareTurnResponse,
): ShiftCloseCompletion | undefined {
  const close = response.shiftClose;

  if (close === undefined) {
    return undefined;
  }

  if (close.verdict === "safe") {
    return {
      verdict: "safe",
      occurredAt: close.occurredAt,
    };
  }

  return {
    verdict: "unsafe",
    occurredAt: close.occurredAt,
    continuityOwner: close.continuityOwner ?? todayCopy.fallbackActor,
    continuityDeadline: close.continuityDeadline ?? close.occurredAt,
    pendingSync: false,
  };
}

async function bestEffortPrepareTurnValue<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise.catch(() => fallback),
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

function emptySyncQueueSummary(): SyncQueueSummary {
  const now = new Date().toISOString();

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
    updatedAt: now,
  };
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

async function resolvePrepareTurnPushReadiness(
  repository: CaptureRepository,
  alertChannel: PushAlertChannel,
  now: () => string,
  pushDeviceIdentity: PushDeviceIdentity,
  registerPushDeviceClient?: RegisterPushDeviceClient,
): Promise<Partial<Pick<PrepareTurnRequest, "pushPermission" | "pushProviderState">>> {
  const registration = await refreshLocalPushRegistration(
    repository,
    alertChannel,
    now,
    pushDeviceIdentity,
    registerPushDeviceClient,
  ).catch(async () => repository.loadAlertChannelState().catch(() => null));

  return prepareTurnPushFieldsFor(registration);
}

async function refreshLocalPushRegistration(
  repository: CaptureRepository,
  alertChannel: PushAlertChannel,
  now: () => string,
  pushDeviceIdentity: PushDeviceIdentity,
  registerPushDeviceClient?: RegisterPushDeviceClient,
): Promise<DevicePushRegistrationCommand | null> {
  const permission = await alertChannel.getPermissionState();
  const registeredAt = now();

  if (permission.state === "active") {
    const token = await alertChannel.getExpoPushToken();

    if (token.state === "active" && token.expoPushToken !== undefined) {
      return registerPushDevice(repository, registerPushDeviceClient, {
        ...pushDeviceIdentity,
        permissionStatus: "granted",
        expoPushToken: token.expoPushToken,
        registeredAt,
      });
    }

    return registerPushDevice(repository, registerPushDeviceClient, {
      ...pushDeviceIdentity,
      permissionStatus: "local_only",
      registeredAt,
    });
  }

  return registerPushDevice(repository, registerPushDeviceClient, {
    ...pushDeviceIdentity,
    permissionStatus: pushPermissionStatusFor(permission.state),
    registeredAt,
  });
}

async function registerPushDevice(
  repository: CaptureRepository,
  registerPushDeviceClient: RegisterPushDeviceClient | undefined,
  command: DevicePushRegistrationCommand,
): Promise<DevicePushRegistrationCommand> {
  const registration = await repository.registerAlertDevice(command);
  if (registerPushDeviceClient !== undefined) {
    await registerPushDeviceClient(registration).catch(() => undefined);
  }

  return registration;
}

function pushPermissionStatusFor(
  state: Awaited<ReturnType<PushAlertChannel["getPermissionState"]>>["state"],
): DevicePushRegistrationCommand["permissionStatus"] {
  if (state === "denied" || state === "not_requested" || state === "unavailable") {
    return state;
  }

  return "unavailable";
}

function deviceLabelFor(packageId: string): string {
  const constants = safePlatformConstants();
  const manufacturer = textFromUnknown(constants?.Manufacturer ?? constants?.Brand);
  const model = textFromUnknown(constants?.Model ?? constants?.model);
  const deviceNameParts = ["Android", manufacturer, model].filter(
    (part): part is string => part !== undefined && part.trim().length > 0,
  );
  const deviceName =
    manufacturer === undefined && model === undefined
      ? "Android piloto"
      : deviceNameParts.join(" ");

  return `${deviceName} - ${packageId}`;
}

function shiftCloseDeviceAuthorizationFor({
  activeRole,
  session,
  storeId,
}: {
  activeRole: MobileActiveRole | undefined;
  session: SessionContextResponse | undefined;
  storeId: string;
}): ShiftCloseDeviceAuthorization {
  if (session === undefined) {
    return "unknown";
  }

  if (
    session.accountStatus !== "active" ||
    session.store.storeId !== storeId ||
    activeRole !== "lead" ||
    session.actions.canCloseShift !== true
  ) {
    return "invalid";
  }

  return "valid";
}

function safePlatformConstants():
  | {
      Brand?: unknown;
      Manufacturer?: unknown;
      Model?: unknown;
      model?: unknown;
    }
  | undefined {
  try {
    return (
      Platform as unknown as
        | {
            constants?: {
              Brand?: unknown;
              Manufacturer?: unknown;
              Model?: unknown;
              model?: unknown;
            };
          }
        | undefined
    )?.constants;
  } catch {
    return undefined;
  }
}

async function readCameraPermissionState(): Promise<PrepareTurnRequest["cameraPermission"]> {
  const cameraModule = safeCameraModule();

  if (cameraModule.getCameraPermissionsAsync === undefined) {
    return undefined;
  }

  try {
    const permission = await cameraModule.getCameraPermissionsAsync();
    return cameraPermissionStatusFor(permission);
  } catch {
    return undefined;
  }
}

function safeCameraModule(): {
  getCameraPermissionsAsync?: () => Promise<{
    granted?: unknown;
    status?: unknown;
  }>;
} {
  try {
    const cameraModule = ExpoCamera as unknown as {
      getCameraPermissionsAsync?: () => Promise<{
        granted?: unknown;
        status?: unknown;
      }>;
    };
    const getCameraPermissionsAsync = cameraModule.getCameraPermissionsAsync;

    if (typeof getCameraPermissionsAsync !== "function") {
      return {};
    }

    return { getCameraPermissionsAsync };
  } catch {
    return {};
  }
}

function cameraPermissionStatusFor(input: {
  granted?: unknown;
  status?: unknown;
}): PrepareTurnRequest["cameraPermission"] {
  if (input.granted === true || input.status === "granted") return "granted";
  if (input.status === "denied") return "denied";
  if (input.status === "undetermined") return "not_requested";
  return "unknown";
}

function textFromUnknown(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function prepareTurnPushFieldsFor(
  registration: DevicePushRegistrationCommand | null,
): Partial<Pick<PrepareTurnRequest, "pushPermission" | "pushProviderState">> {
  if (registration === null) {
    return {
      pushPermission: "not_requested",
      pushProviderState: "not_configured",
    };
  }

  if (registration.permissionStatus === "granted") {
    return {
      pushPermission: "granted",
      pushProviderState:
        registration.expoPushToken === undefined ? "local_only" : "token_registered",
    };
  }

  if (registration.permissionStatus === "local_only") {
    return {
      pushPermission: "granted",
      pushProviderState: "local_only",
    };
  }

  if (registration.permissionStatus === "denied") {
    return {
      pushPermission: "denied",
      pushProviderState: "not_configured",
    };
  }

  if (registration.permissionStatus === "not_requested") {
    return {
      pushPermission: "not_requested",
      pushProviderState: "not_configured",
    };
  }

  return {
    pushPermission: "unknown",
    pushProviderState: "not_configured",
  };
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
  const firstStoreSetup = onStartFirstSetup !== undefined;
  const status = prepareTurnStatusFor(state, cache, firstStoreSetup);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title={firstStoreSetup ? "Registrar primeiro lote" : "Preparar turno"}
        body={prepareTurnBodyFor(state, firstStoreSetup)}
      />
      <StatusNotice title={prepareTurnTitleFor(state, firstStoreSetup)} tone={status.tone}>
        {status.body}
      </StatusNotice>
      <Text style={styles.prepareBody}>{prepareTurnDetailFor(state, cache, firstStoreSetup)}</Text>
      {cache === null ? null : (
        <View style={styles.prepareMetrics}>
          <Text style={styles.prepareMetric}>{cache.productCount} produtos centrais</Text>
          <Text style={styles.prepareMetric}>{cache.lotCount} lotes centrais</Text>
          <Text style={styles.prepareMetric}>{cache.activeTaskCount} tarefas ativas</Text>
          <Text style={styles.prepareMetric}>{cache.conflictCount} conflitos</Text>
        </View>
      )}
      {error === undefined ? null : <StatusNotice tone="error">{error}</StatusNotice>}
      {firstStoreSetup ? (
        <PrimaryAction label={captureCopy.registerLot} onPress={onStartFirstSetup} />
      ) : (
        <PrimaryAction disabled={preparing} label="Preparar turno" onPress={onPrepare} />
      )}
      {firstStoreSetup ? (
        <SecondaryAction disabled={preparing} label="Preparar turno" onPress={onPrepare} />
      ) : null}
      {onUseCache === undefined ? null : (
        <SecondaryAction label="Entrar com leitura local" onPress={onUseCache} />
      )}
    </ScrollView>
  );
}

function prepareTurnStatusFor(
  state: Parameters<typeof PrepareTurnScreen>[0]["state"],
  cache: PrepareTurnCacheStatus | null,
  firstStoreSetup = false,
): MobileStatusDescriptor {
  if (firstStoreSetup) {
    return {
      ...mobileStatusDescriptorFor("synced_transport"),
      label: "Primeiro lote da loja",
      body: "Leitura central vazia e esperada no primeiro uso. Registre o primeiro lote fisico; zero tarefas nao comprova area segura.",
    };
  }

  if (state === "checking" || state === "preparing") {
    return {
      ...mobileStatusDescriptorFor("syncing"),
      label: "Preparar turno",
      body:
        state === "preparing"
          ? "Baixando a leitura central da loja..."
          : "Conferindo se este aparelho ja tem uma leitura central valida.",
    };
  }

  if (state === "needs_review") {
    return {
      ...mobileStatusDescriptorFor("pending_central"),
      body: "Leitura central pendente. Atualize antes de declarar area segura.",
    };
  }

  if (state === "cache_only") {
    return {
      ...mobileStatusDescriptorFor("local_only"),
      body: "Leitura local disponivel neste aparelho. Ela nao e leitura central segura; atualize antes de declarar area segura.",
    };
  }

  if (cache?.state === "ready") {
    return {
      ...mobileStatusDescriptorFor("pending_central"),
      body: "Leitura central pendente. Atualize antes de declarar area segura.",
    };
  }

  return mobileStatusDescriptorFor("prepare_blocker");
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

function prepareTurnTitleFor(
  state: Parameters<typeof PrepareTurnScreen>[0]["state"],
  firstStoreSetup = false,
): string {
  if (firstStoreSetup) return "Loja pronta para o primeiro lote";
  if (state === "checking") return "Conferindo este aparelho";
  if (state === "preparing") return "Baixando leitura central";
  if (state === "needs_review") return "Leitura central exige revisao";
  if (state === "cache_only") return "Central indisponivel";
  if (state === "error") return "Turno nao preparado";
  return "Leitura central obrigatoria";
}

function prepareTurnBodyFor(
  state: Parameters<typeof PrepareTurnScreen>[0]["state"],
  firstStoreSetup = false,
): string {
  if (firstStoreSetup) {
    return "A leitura central voltou vazia. Comece registrando o lote fisico encontrado na loja.";
  }

  if (state === "checking") return "Aguarde a verificacao local antes de abrir Hoje.";
  if (state === "preparing") return "Baixando a leitura central da loja...";
  if (state === "needs_review") {
    return "A central respondeu, mas ainda nao ha base suficiente para tratar a area como segura.";
  }
  if (state === "cache_only") {
    return "Use a leitura local apenas para continuar o trabalho visivel. Ela nao declara area segura.";
  }
  if (state === "needs_prepare") {
    return "Qualquer pessoa autorizada pode preparar a leitura central para trabalhar. Isso nao declara a area segura.";
  }
  if (state === "error") return "Conecte uma vez para preparar o turno neste aparelho.";
  return "Conecte uma vez para preparar o turno neste aparelho.";
}

function prepareTurnDetailFor(
  state: Parameters<typeof PrepareTurnScreen>[0]["state"],
  cache: PrepareTurnCacheStatus | null,
  firstStoreSetup = false,
): string {
  if (firstStoreSetup) {
    return "Zero produtos, lotes, tarefas e conflitos e um estado inicial esperado. Fechamento seguro ainda depende de leitura central, tarefas, sincronizacao e checklist fisico.";
  }

  if (cache === null) {
    return "Nenhuma leitura central esta salva neste aparelho. Preparar turno abre o trabalho visivel; fechamento seguro continua exigindo lideranca, central atual e checklist fisico.";
  }

  const lastRead =
    cache.lastCentralReadAt === undefined
      ? "sem leitura central confirmada"
      : formatOperationalTimestamp(cache.lastCentralReadAt);
  if (state === "cache_only") {
    return `Ultima leitura local: ${lastRead}. Entrar com leitura local nao e leitura central segura. Nao declare area segura.`;
  }

  return `Ultima leitura central: ${lastRead}. Estado do cache: ${cache.state}.`;
}

function formatOperationalTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

const styles = StyleSheet.create({
  appShell: {
    backgroundColor: captureColors.background,
    flex: 1,
  },
  appContent: {
    flex: 1,
  },
  sessionBar: {
    backgroundColor: captureColors.surface,
    borderBottomColor: captureColors.border,
    borderBottomWidth: 1,
    paddingHorizontal: captureSpacing.large,
    paddingVertical: captureSpacing.small,
  },
  sessionTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: captureSpacing.small,
    minHeight: 52,
  },
  sessionIdentity: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  sessionActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: captureSpacing.xsmall,
  },
  sessionMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
    minWidth: 0,
  },
  sessionArea: {
    color: captureColors.ink,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  sessionMetaDivider: {
    backgroundColor: captureColors.borderStrong,
    borderRadius: 2,
    height: 3,
    width: 3,
  },
  sessionStore: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 21,
  },
  sessionLabel: {
    color: captureColors.mutedInk,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  sessionIconAction: {
    alignItems: "center",
    backgroundColor: captureColors.surfaceRaised,
    borderColor: captureColors.borderStrong,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 40,
  },
  sessionSecondaryAction: {
    alignItems: "center",
    backgroundColor: captureColors.accentSurface,
    borderColor: captureColors.accent,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 48,
    paddingHorizontal: captureSpacing.small,
  },
  sessionActionPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  sessionIconActionLabel: {
    color: captureColors.ink,
    fontSize: 19,
    fontWeight: "600",
    lineHeight: 22,
  },
  sessionSecondaryActionLabel: {
    color: captureColors.accent,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
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
  prepareBody: {
    color: captureColors.mutedInk,
    fontSize: 16,
    lineHeight: 24,
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
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
