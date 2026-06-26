import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
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
import type { TodayTaskRecord } from "@validade-zero/contracts";
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
  activeRole = "lead",
  actorLabel = todayCopy.fallbackActor,
  storeId = "loja-local",
}: {
  repository: CaptureRepository;
  alertChannel?: PushAlertChannel;
  syncEngine?: SyncEngine | undefined;
  activeRole?: "collaborator" | "lead" | "admin" | undefined;
  actorLabel?: string | undefined;
  storeId?: string | undefined;
}) {
  const [routeStack, setRouteStack] = useState<readonly CaptureRoute[]>(initialRouteStack);
  const [initializationError, setInitializationError] = useState<string | undefined>();
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
    void repository.initialize().catch(() => {
      setInitializationError("Não foi possível preparar o registro local neste aparelho.");
    });
  }, [repository]);

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

    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader title="Produto confirmado" body="Revise o perfil antes de informar o lote." />
        <Text style={styles.productName}>{currentRoute.product.displayName}</Text>
        <Text style={styles.metadata}>Categoria: {currentRoute.product.categoryId}</Text>
        <Text style={styles.metadata}>Perfil operacional: {productModeLabels[mode]}</Text>
        <PrimaryAction
          label={captureCopy.confirmProduct}
          onPress={() => navigate({ name: "lot-registration", product: currentRoute.product })}
        />
        <SecondaryAction label={captureCopy.backAndReview} onPress={goBack} />
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
});
