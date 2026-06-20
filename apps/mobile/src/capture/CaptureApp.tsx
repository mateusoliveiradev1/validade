import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { CaptureProductRecord, CaptureRepository } from "./repository";
import { captureCopy, productModeLabels } from "./capture-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { ProductDiscoveryScreen } from "./ProductDiscoveryScreen";
import { ProductFormScreen } from "./ProductFormScreen";
import { LotRegistrationScreen } from "./LotRegistrationScreen";
import { RecentLotList } from "./RecentLotList";
import { LotDetailScreen } from "./LotDetailScreen";
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

          if (task !== null && task.status === "active" && task.activeKey === intent.taskActiveKey) {
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
        onObserve={() => setScreen("observation")}
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
          void repository.loadLotDetail(detail.id).then((refreshed) => {
            if (refreshed !== null) setDetail(refreshed);
            setScreen("recent");
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
          void repository.loadLotDetail(lot.id).then((loaded) => {
            if (loaded !== null) {
              setDetail(loaded);
              setScreen("detail");
            }
          });
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
