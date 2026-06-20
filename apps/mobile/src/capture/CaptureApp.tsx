import { useEffect, useMemo, useState } from "react";
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
import type { TodayTaskRecord } from "@validade-zero/contracts";
import { createExpoPushAlertChannel, type PushAlertChannel } from "./alert-channel";

type CaptureScreen =
  | "today"
  | "discovery"
  | "product-form"
  | "confirmed"
  | "lot-registration"
  | "recent"
  | "detail"
  | "task-resolution"
  | "observation"
  | "barcode";

export function CaptureApp({
  repository,
  alertChannel,
}: {
  repository: CaptureRepository;
  alertChannel?: PushAlertChannel;
}) {
  const [screen, setScreen] = useState<CaptureScreen>("today");
  const [selectedProduct, setSelectedProduct] = useState<CaptureProductRecord | undefined>();
  const [initialGtin, setInitialGtin] = useState<string | undefined>();
  const [initializationError, setInitializationError] = useState<string | undefined>();
  const [detail, setDetail] = useState<CaptureLotDetail | undefined>();
  const [markdownEntryState, setMarkdownEntryState] = useState<MarkdownEntryState | undefined>();
  const [scannedLookup, setScannedLookup] = useState<string | undefined>();
  const [selectedTask, setSelectedTask] = useState<TodayTaskRecord | undefined>();
  const [pushFallbackNotice, setPushFallbackNotice] = useState<string | undefined>();
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | undefined>();
  const resolvedAlertChannel = useMemo(
    () => alertChannel ?? createExpoPushAlertChannel(),
    [alertChannel],
  );

  useEffect(() => {
    void repository.initialize().catch(() => {
      setInitializationError("Não foi possível preparar o registro local neste aparelho.");
    });
  }, [repository]);

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
            setSelectedTask(task);
            setHighlightedTaskId(task.id);
            setScreen("task-resolution");
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

        setScreen("today");
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
    setMarkdownEntryState(undefined);
    const loaded = await repository.loadLotDetail(lotId);

    if (loaded !== null) {
      setDetail(loaded);
      setMarkdownEntryState(await loadMarkdownEntryStateFor(loaded.id));
      setScreen("detail");
    }
  }

  async function refreshCurrentDetail(lotId: string): Promise<void> {
    const refreshed = await repository.loadLotDetail(lotId);

    if (refreshed !== null) {
      setDetail(refreshed);
      setMarkdownEntryState(await loadMarkdownEntryStateFor(refreshed.id));
    }
  }

  async function requestMarkdownFromDetail(request: LotDetailMarkdownRequest): Promise<void> {
    if (detail === undefined) {
      return;
    }

    const occurredAt = new Date().toISOString();

    await repository.requestMarkdown({
      lotId: detail.id,
      actorLabel: "Colaborador local",
      occurredAt,
      reason: request.reason,
      ...(request.earlyJustification === undefined
        ? {}
        : { earlyJustification: request.earlyJustification }),
    });
    setMarkdownEntryState(undefined);
    setScreen("today");
  }

  async function openActiveMarkdownTask(): Promise<void> {
    if (markdownEntryState?.status !== "already_active") {
      setScreen("today");
      return;
    }

    const activeTasks = await repository.listActiveTodayTasks();
    const task = activeTasks.find(
      (candidate) =>
        candidate.status === "active" &&
        candidate.markdownWorkflowId === markdownEntryState.workflowId,
    );

    if (task === undefined) {
      setScreen("today");
      return;
    }

    setSelectedTask(task);
    setHighlightedTaskId(task.id);
    setScreen("task-resolution");
  }

  if (screen === "today") {
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
          onRegisterLot={() => setScreen("discovery")}
          onOpenRecentLots={() => setScreen("recent")}
          onOpenTask={(task) => {
            setPushFallbackNotice(undefined);
            setSelectedTask(task);
            setScreen("task-resolution");
          }}
        />
      </>
    );
  }

  if (screen === "task-resolution" && selectedTask !== undefined) {
    return (
      <TaskResolutionPanel
        repository={repository}
        task={selectedTask}
        onBack={() => setScreen("today")}
        onDone={() => setScreen("today")}
      />
    );
  }

  if (screen === "product-form") {
    return (
      <ProductFormScreen
        repository={repository}
        {...(initialGtin === undefined ? {} : { initialGtin })}
        onBack={() => setScreen("discovery")}
        onCreated={(product) => {
          setSelectedProduct(product);
          setScreen("confirmed");
        }}
      />
    );
  }

  if (screen === "confirmed" && selectedProduct !== undefined) {
    const mode =
      selectedProduct.productRuleOverride?.mode ?? selectedProduct.categoryRuleProfile.mode;

    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader title="Produto confirmado" body="Revise o perfil antes de informar o lote." />
        <Text style={styles.productName}>{selectedProduct.displayName}</Text>
        <Text style={styles.metadata}>Categoria: {selectedProduct.categoryId}</Text>
        <Text style={styles.metadata}>Perfil operacional: {productModeLabels[mode]}</Text>
        <PrimaryAction
          label={captureCopy.confirmProduct}
          onPress={() => setScreen("lot-registration")}
        />
        <SecondaryAction label={captureCopy.backAndReview} onPress={() => setScreen("discovery")} />
      </ScrollView>
    );
  }

  if (screen === "lot-registration" && selectedProduct !== undefined) {
    return (
      <LotRegistrationScreen
        repository={repository}
        product={selectedProduct}
        onBack={() => setScreen("today")}
        onSaved={() => setScreen("today")}
      />
    );
  }

  if (screen === "detail" && detail !== undefined)
    return (
      <LotDetailScreen
        detail={detail}
        markdownEntryState={markdownEntryState}
        onObserve={() => setScreen("observation")}
        onOpenActiveMarkdown={() => void openActiveMarkdownTask()}
        onRequestMarkdown={(request) => requestMarkdownFromDetail(request)}
        onBack={() => setScreen("recent")}
      />
    );
  if (screen === "observation" && detail !== undefined)
    return (
      <ObservationComposer
        repository={repository}
        detail={detail}
        onBack={() => setScreen("detail")}
        onDone={() => {
          void refreshCurrentDetail(detail.id).then(() => {
            setScreen("detail");
          });
        }}
      />
    );
  if (screen === "recent")
    return (
      <RecentLotList
        repository={repository}
        onRegister={() => setScreen("discovery")}
        onOpen={(lot) => {
          void openLotDetail(lot.id);
        }}
      />
    );
  if (screen === "barcode")
    return (
      <BarcodeLookupAssistant
        onBack={() => setScreen("discovery")}
        onLookup={(value) => {
          setScannedLookup(value);
          setScreen("discovery");
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
          setSelectedProduct(product);
          setScreen("confirmed");
        }}
        onCreateProduct={(gtin) => {
          setInitialGtin(gtin);
          setScreen("product-form");
        }}
        onScanCode={() => setScreen("barcode")}
        onOpenRecent={() => setScreen("recent")}
        {...(scannedLookup === undefined ? {} : { initialLookup: scannedLookup })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F5F7EF",
    flexGrow: 1,
    gap: 16,
    padding: 16,
  },
  productName: {
    color: "#112016",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  metadata: {
    color: "#3F5546",
    fontSize: 14,
    lineHeight: 20,
  },
});
