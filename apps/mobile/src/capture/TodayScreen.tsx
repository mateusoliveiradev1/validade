import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  AlertDeliveryResult,
  FutureAttentionRecord,
  OfflineCacheStatus,
  PrepareTurnCacheStatus,
  SyncConflictRecord,
  SyncQueueSummary as SyncQueueSummaryRecord,
  TaskAlertStateRecord,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import {
  createPrivacySafeNotificationContent,
  type AlertChannelState,
} from "@validade-zero/domain";
import { formatLocation } from "./capture-copy";
import { PrimaryAction, SecondaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import type { PushAlertChannel } from "./alert-channel";
import type { SyncEngine } from "./sync-engine";
import {
  OfflineCacheNotice,
  OfflineStatusBand,
  SyncConflictPanel,
  SyncQueueSummary,
} from "./offline-sync-ui";
import {
  alertChannelStateForRegistration,
  type CaptureRepository,
  type TodayTaskRefreshSource,
} from "./repository";
import {
  dueLabel,
  formatAlertTime,
  isOverdueTask,
  relativeReminderLabel,
  riskReasonLabel,
  severityLabel,
  todayActionLabel,
  todayCopy,
} from "./today-copy";
import { mobileStatusDescriptorFor, type MobileStatusDescriptor } from "./mobile-status";
import type { MobileBuildInfo } from "../build-info";

const ACTIVE_SECTION_ORDER = [
  "withdraw_now",
  "check_sales_area",
  "request_markdown",
  "follow_up",
] as const satisfies readonly TodayTaskRecord["section"][];

function prepareTurnNotice(
  status: PrepareTurnCacheStatus,
  source: "central" | "local_cache" | undefined,
): MobileStatusDescriptor {
  const readAt = status.lastCentralReadAt ?? status.updatedAt;

  if (status.conflictCount > 0) {
    return {
      ...mobileStatusDescriptorFor("conflict"),
      body: `${status.conflictCount} conflito(s) na leitura central. Revise antes de declarar area segura.`,
    };
  }

  if (source === "central" && status.state === "ready") {
    return {
      ...mobileStatusDescriptorFor("synced_transport"),
      body: `Pronto para operar com a leitura central. Ultima leitura: ${readAt}. ${status.activeTaskCount} tarefas ativas.`,
    };
  }

  if (source === "local_cache") {
    return {
      ...mobileStatusDescriptorFor("local_only"),
      body: `Leitura local em uso desde ${readAt}. Nao declare area segura sem preparar a central.`,
    };
  }

  return {
    ...mobileStatusDescriptorFor("pending_central"),
    body: `Leitura central pendente. Atualize antes de declarar area segura. Ultima leitura conhecida: ${readAt}.`,
  };
}

export function TodayScreen({
  repository,
  onRegisterLot,
  onOpenRecentLots,
  onOpenTask,
  onOpenShiftClose,
  canCloseShift = false,
  actorLabel = todayCopy.fallbackActor,
  alertChannel,
  syncEngine,
  pushFallbackNotice,
  highlightedTaskId,
  prepareTurnCacheStatus,
  prepareTurnSource,
  buildInfo,
  now = () => new Date(),
}: {
  repository: CaptureRepository;
  onRegisterLot: () => void;
  onOpenRecentLots: () => void;
  onOpenTask?: (task: TodayTaskRecord) => void;
  onOpenShiftClose?: (() => void) | undefined;
  canCloseShift?: boolean | undefined;
  actorLabel?: string | undefined;
  alertChannel?: PushAlertChannel;
  syncEngine?: SyncEngine | undefined;
  pushFallbackNotice?: string | undefined;
  highlightedTaskId?: string | undefined;
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  buildInfo?: MobileBuildInfo | undefined;
  now?: () => Date;
}) {
  const [tasks, setTasks] = useState<readonly TodayTaskRecord[]>([]);
  const [futureAttention, setFutureAttention] = useState<readonly FutureAttentionRecord[]>([]);
  const [offlineStatus, setOfflineStatus] = useState<OfflineCacheStatus | undefined>();
  const [syncQueue, setSyncQueue] = useState<SyncQueueSummaryRecord | undefined>();
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictRecord | undefined>();
  const [alertStates, setAlertStates] = useState<readonly TaskAlertStateRecord[]>([]);
  const [alertChannelState, setAlertChannelState] = useState<AlertChannelState>("not_requested");
  const [alertChannelFeedback, setAlertChannelFeedback] = useState<string | undefined>();
  const [acknowledgementFeedback, setAcknowledgementFeedback] = useState<string | undefined>();
  const [refreshError, setRefreshError] = useState<string | undefined>();
  const [refreshFeedback, setRefreshFeedback] = useState<string | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRequestingAlerts, setIsRequestingAlerts] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  async function refreshAlertChannelState(): Promise<void> {
    const registration = await repository.loadAlertChannelState();
    setAlertChannelState(alertChannelStateForRegistration(registration));
  }

  async function refreshSyncState(): Promise<void> {
    const [cacheStatus, queue] = await Promise.all([
      repository.loadOfflineCacheStatus(),
      repository.listSyncQueue(),
    ]);

    setOfflineStatus(cacheStatus);
    setSyncQueue(queue);
  }

  async function refreshTasks(source: TodayTaskRefreshSource): Promise<void> {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setRefreshError(undefined);

    if (source === "manual_refresh") {
      setRefreshFeedback(undefined);
    }

    try {
      const current = now();
      const result = await repository.refreshTodayTasks({
        currentDate: current.toISOString().slice(0, 10),
        currentTimestamp: current.toISOString(),
        source,
      });

      setTasks(result.tasks);
      setFutureAttention(result.futureAttention);
      await refreshAlertChannelState();
      const refreshedAlertStates = await repository.refreshTaskAlertStates({
        referenceTime: current.toISOString(),
        isWithinShift: true,
        overdueTaskIds: result.tasks
          .filter((task) => isOverdueTask(task, current))
          .map((task) => task.id),
      });
      setAlertStates(refreshedAlertStates);
      await schedulePendingAlerts(result.tasks, refreshedAlertStates, current);
      await refreshSyncState();

      if (source === "manual_refresh") {
        setRefreshFeedback(todayCopy.refreshSuccess(result.metadata.activeTaskCount));
      }
    } catch {
      setRefreshFeedback(undefined);
      setRefreshError(todayCopy.refreshError);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }

  useEffect(() => {
    void refreshTasks("today_open");
  }, []);

  async function manualSync(): Promise<void> {
    if (syncEngine === undefined || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setRefreshError(undefined);
    setRefreshFeedback(undefined);

    try {
      const result = await syncEngine.syncPendingCommands({ manual: true });
      await refreshSyncState();

      if (result.state === "sent" && result.appliedResults.length > 0) {
        setRefreshFeedback(todayCopy.sync.retryHelper);
      } else if (result.state === "empty") {
        setRefreshFeedback(todayCopy.sync.allSynced);
      } else if (result.state === "transport_failed") {
        setRefreshError(todayCopy.sync.failed);
      }
    } catch {
      setRefreshError(todayCopy.sync.failed);
    } finally {
      setIsSyncing(false);
    }
  }

  async function reviewConflict(conflictId: string): Promise<void> {
    const conflict = await repository.loadSyncConflict(conflictId);
    setSelectedConflict(conflict ?? undefined);
  }

  async function resolveConflict(input: {
    action: SyncConflictRecord["allowedActions"][number];
    reason?: string | undefined;
  }): Promise<void> {
    if (selectedConflict === undefined) {
      return;
    }

    await repository.resolveSyncConflict({
      conflictId: selectedConflict.id,
      action: input.action,
      resolvedAt: now().toISOString(),
      ...(input.reason === undefined ? {} : { reason: input.reason }),
    });
    setSelectedConflict(undefined);
    await refreshSyncState();
  }

  async function activateAlerts(): Promise<void> {
    if (alertChannel === undefined || isRequestingAlerts) {
      return;
    }

    setIsRequestingAlerts(true);
    setAlertChannelFeedback(undefined);

    try {
      const permission = await alertChannel.requestPermission();

      if (permission.state !== "active") {
        setAlertChannelState(permission.state);
        await repository.registerAlertDevice({
          deviceId: "local-alert-device",
          deviceLabel: "Celular do turno",
          audienceRole: "shift_team",
          permissionStatus: permission.state === "denied" ? "denied" : "unavailable",
          registeredAt: now().toISOString(),
        });
        return;
      }

      const token = await alertChannel.getExpoPushToken();

      if (token.state !== "active" || token.expoPushToken === undefined) {
        setAlertChannelState("local_only");
        setAlertChannelFeedback(todayCopy.push.localOnly);
        await repository.registerAlertDevice({
          deviceId: "local-alert-device",
          deviceLabel: "Celular do turno",
          audienceRole: "shift_team",
          permissionStatus: "local_only",
          registeredAt: now().toISOString(),
        });
        await refreshTasks("manual_refresh");
        return;
      }

      await repository.registerAlertDevice({
        deviceId: "local-alert-device",
        deviceLabel: "Celular do turno",
        audienceRole: "shift_team",
        permissionStatus: "granted",
        expoPushToken: token.expoPushToken,
        registeredAt: now().toISOString(),
      });
      setAlertChannelState("active");
      setAlertChannelFeedback(todayCopy.push.active);
      await refreshTasks("manual_refresh");
    } catch {
      setAlertChannelState("failed");
      setAlertChannelFeedback(todayCopy.push.failed);
    } finally {
      setIsRequestingAlerts(false);
    }
  }

  async function schedulePendingAlerts(
    activeTasks: readonly TodayTaskRecord[],
    states: readonly TaskAlertStateRecord[],
    referenceTime: Date,
  ): Promise<void> {
    if (alertChannel === undefined) {
      return;
    }

    const registration = await repository.loadAlertChannelState();

    if (
      registration?.permissionStatus !== "granted" &&
      registration?.permissionStatus !== "local_only"
    ) {
      return;
    }

    const activeTaskById = new Map(activeTasks.map((task) => [task.id, task]));
    const updatedStates: TaskAlertStateRecord[] = [];

    for (const state of states) {
      if (state.attemptState !== "pending") {
        continue;
      }

      const task = activeTaskById.get(state.taskId);

      if (task === undefined || task.status !== "active") {
        continue;
      }

      const content = createPrivacySafeNotificationContent(task);
      const attemptedAt = referenceTime.toISOString();
      const attemptId = `local-alert-${referenceTime.getTime()}-${state.taskId.slice(0, 48)}`;
      const scheduleResult = await alertChannel.scheduleTaskNotification({
        command: {
          attemptId,
          taskId: state.taskId,
          taskActiveKey: state.taskActiveKey,
          audience: state.audience,
          title: content.title,
          body: content.body,
          data: {
            taskId: state.taskId,
            taskActiveKey: state.taskActiveKey,
          },
          createdAt: attemptedAt,
        },
      });
      const deliveryResult: AlertDeliveryResult =
        scheduleResult.attemptState === "pending"
          ? { status: "ok" }
          : {
              status: "retryable_error",
              failureReason: scheduleResult.failureReason ?? todayCopy.push.failed,
            };

      updatedStates.push(
        await repository.recordAlertAttempt({
          attemptId,
          taskId: state.taskId,
          taskActiveKey: state.taskActiveKey,
          attemptedAt,
          result: deliveryResult,
        }),
      );
    }

    if (updatedStates.length === 0) {
      return;
    }

    const updatedByTaskId = new Map(updatedStates.map((state) => [state.taskId, state]));
    setAlertStates((current) => current.map((state) => updatedByTaskId.get(state.taskId) ?? state));
  }

  async function acknowledgeEscalation(task: TodayTaskRecord): Promise<void> {
    const alertState = alertStates.find((state) => state.taskId === task.id);

    if (alertState === undefined) {
      return;
    }

    const acknowledgedAt = now().toISOString();
    const acknowledged = await repository.acknowledgeEscalation({
      taskId: task.id,
      taskActiveKey: task.activeKey,
      actorLabel,
      acknowledgedAt,
    });

    setAlertStates((current) =>
      current.map((state) => (state.taskId === acknowledged.taskId ? acknowledged : state)),
    );
    setAcknowledgementFeedback(todayCopy.push.acknowledged(formatAlertTime(acknowledgedAt)));
  }

  const salesAreaRiskCount = tasks.filter(isSalesAreaBlockingTask).length;
  const renderedAt = now();
  const overdueTasks = tasks.filter((task) => isOverdueTask(task, renderedAt));
  const currentTasks = tasks.filter((task) => !isOverdueTask(task, renderedAt));
  const firstPriorityTask = overdueTasks[0] ?? currentTasks[0];
  const canOpenPriorityTask = firstPriorityTask !== undefined && onOpenTask !== undefined;
  const centralPackageReady =
    prepareTurnSource === undefined ||
    (prepareTurnSource === "central" && prepareTurnCacheStatus?.state === "ready");
  const centralNotice =
    prepareTurnCacheStatus === undefined || prepareTurnCacheStatus === null
      ? undefined
      : prepareTurnNotice(prepareTurnCacheStatus, prepareTurnSource);
  const heroPrimaryLabel =
    firstPriorityTask === undefined || onOpenTask === undefined
      ? todayCopy.registerLot
      : todayActionLabel(firstPriorityTask);
  const heroSecondaryLabel = canOpenPriorityTask ? todayCopy.registerLot : todayCopy.recentLots;
  const verdict = isInitialLoading
    ? "Carregando riscos da area de venda"
    : !centralPackageReady
      ? "Leitura central local ou pendente"
      : refreshError !== undefined
        ? "Riscos precisam ser atualizados"
        : salesAreaRiskCount > 0
          ? todayCopy.criticalHeader(salesAreaRiskCount)
          : tasks.length > 0
            ? todayCopy.safeWithWorkHeader
            : todayCopy.safeHeader;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View
        style={[
          styles.safetyHeader,
          salesAreaRiskCount > 0 ? styles.safetyHeaderCritical : undefined,
        ]}
      >
        <Text style={styles.heroKicker}>{todayCopy.title}</Text>
        <Text style={styles.safetyVerdict}>{verdict}</Text>
        <View style={styles.heroStatusStack}>
          {centralNotice === undefined ? null : (
            <StatusNotice title={centralNotice.label} tone={centralNotice.tone}>
              {centralNotice.body}
            </StatusNotice>
          )}
          <OfflineStatusBand
            disabled={isSyncing || syncEngine === undefined}
            queue={syncQueue}
            status={offlineStatus}
            onRetry={() => void manualSync()}
          />
          <OfflineCacheNotice status={offlineStatus} />
        </View>
        <Text style={styles.safetyBody}>
          {!centralPackageReady
            ? "Continue o trabalho visivel, mas nao trate a area como segura sem uma leitura central preparada."
            : salesAreaRiskCount > 0
              ? "Comece pelo primeiro risco da area de venda."
              : isInitialLoading
                ? "Aguarde a leitura das tarefas antes de concluir que a area esta segura."
                : refreshError !== undefined
                  ? "As tarefas anteriores permanecem visiveis quando existirem. Atualize antes de tomar uma decisao."
                  : "Continue conferindo os lotes do turno sem esconder pendencias."}
        </Text>
        <View style={styles.heroMetrics}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{salesAreaRiskCount}</Text>
            <Text style={styles.heroMetricLabel}>riscos na area</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{tasks.length}</Text>
            <Text style={styles.heroMetricLabel}>tarefas ativas</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{syncQueue?.totalCount ?? 0}</Text>
            <Text style={styles.heroMetricLabel}>a sincronizar</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <View style={styles.heroActionPrimary}>
            <PrimaryAction
              label={heroPrimaryLabel}
              onPress={() => {
                if (firstPriorityTask !== undefined && onOpenTask !== undefined) {
                  onOpenTask(firstPriorityTask);
                  return;
                }
                onRegisterLot();
              }}
            />
          </View>
          <View style={styles.heroActionSecondary}>
            <SecondaryAction
              accessibilityLabel={heroSecondaryLabel}
              label={canOpenPriorityTask ? heroSecondaryLabel : "Recentes"}
              onPress={canOpenPriorityTask ? onRegisterLot : onOpenRecentLots}
            />
          </View>
        </View>
        <SecondaryAction
          label={isRefreshing ? "Atualizando tarefas" : todayCopy.refresh}
          disabled={isRefreshing}
          onPress={() => void refreshTasks("manual_refresh")}
        />
        {canOpenPriorityTask ? (
          <SecondaryAction label={todayCopy.recentLots} onPress={onOpenRecentLots} />
        ) : null}
      </View>

      {buildInfo === undefined ? null : <PilotBuildInfoCard buildInfo={buildInfo} />}

      <View style={styles.shiftCloseEntry}>
        <Text style={styles.shiftCloseTitle}>Fechamento do turno</Text>
        <Text style={styles.shiftCloseBody}>
          {canCloseShift
            ? "Revise riscos, sincronização e a conferência física antes de encerrar o turno."
            : "O fechamento exige liderança autorizada nesta loja."}
        </Text>
        {canCloseShift && onOpenShiftClose !== undefined ? (
          <SecondaryAction label="Revisar fechamento do turno" onPress={onOpenShiftClose} />
        ) : null}
      </View>

      {refreshError === undefined ? null : <StatusNotice tone="error">{refreshError}</StatusNotice>}
      {refreshFeedback === undefined ? null : (
        <StatusNotice tone="success">{refreshFeedback}</StatusNotice>
      )}
      {pushFallbackNotice === undefined ? null : (
        <StatusNotice tone="info">{pushFallbackNotice}</StatusNotice>
      )}
      {acknowledgementFeedback === undefined ? null : (
        <StatusNotice tone="success">{acknowledgementFeedback}</StatusNotice>
      )}
      <AlertChannelSurface
        channelState={alertChannelState}
        feedback={alertChannelFeedback}
        isRequesting={isRequestingAlerts}
        onActivate={() => void activateAlerts()}
      />

      {selectedConflict === undefined ? null : (
        <SyncConflictPanel
          conflict={selectedConflict}
          onClose={() => setSelectedConflict(undefined)}
          onResolve={(input) => void resolveConflict(input)}
        />
      )}

      <SyncQueueSummary
        disabled={isSyncing || syncEngine === undefined}
        queue={syncQueue}
        onRetry={() => void manualSync()}
        onReviewConflict={(conflictId) => void reviewConflict(conflictId)}
      />

      {isInitialLoading ? (
        <TodayLoadingState />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{todayCopy.emptyHeading}</Text>
          <Text style={styles.emptyBody}>{todayCopy.emptyBody}</Text>
          <PrimaryAction label={todayCopy.registerLot} onPress={onRegisterLot} />
          <SecondaryAction label={todayCopy.recentLots} onPress={onOpenRecentLots} />
        </View>
      ) : (
        <View style={styles.taskList}>
          {overdueTasks.length === 0 ? null : (
            <View style={styles.taskSection}>
              <SectionHeading count={overdueTasks.length} title={todayCopy.sections.overdue} />
              {overdueTasks.map((task) => (
                <TodayTaskRow
                  key={task.id}
                  referenceTime={renderedAt}
                  alertState={alertStates.find((state) => state.taskId === task.id)}
                  highlighted={highlightedTaskId === task.id}
                  task={task}
                  onAcknowledgeEscalation={() => void acknowledgeEscalation(task)}
                  onPress={() => {
                    if (onOpenTask === undefined) {
                      return;
                    }

                    onOpenTask(task);
                  }}
                />
              ))}
            </View>
          )}
          {ACTIVE_SECTION_ORDER.map((section) => {
            const sectionTasks = currentTasks.filter((task) => task.section === section);

            if (sectionTasks.length === 0) {
              return null;
            }

            return (
              <View key={section} style={styles.taskSection}>
                <SectionHeading count={sectionTasks.length} title={todayCopy.sections[section]} />
                {sectionTasks.map((task) => (
                  <TodayTaskRow
                    key={task.id}
                    referenceTime={renderedAt}
                    alertState={alertStates.find((state) => state.taskId === task.id)}
                    highlighted={highlightedTaskId === task.id}
                    task={task}
                    onAcknowledgeEscalation={() => void acknowledgeEscalation(task)}
                    onPress={() => {
                      if (onOpenTask === undefined) {
                        return;
                      }

                      onOpenTask(task);
                    }}
                  />
                ))}
              </View>
            );
          })}
        </View>
      )}

      {futureAttention.length === 0 ? null : (
        <View style={styles.futureSection}>
          <Text style={styles.sectionTitle}>{todayCopy.sections.future_attention}</Text>
          {futureAttention.map((item) => {
            const label = `${item.productDisplayName} - lote ${item.lotIdentity.value}`;

            return (
              <Text key={item.id} style={styles.futureItem}>
                {label}
              </Text>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function PilotBuildInfoCard({ buildInfo }: { buildInfo: MobileBuildInfo }) {
  return (
    <View style={styles.buildInfoCard}>
      <View style={styles.buildInfoHeader}>
        <Text style={styles.buildInfoTitle}>Build do piloto</Text>
        <View
          style={[
            styles.buildInfoBadge,
            buildInfo.buildCompatibility === "atual"
              ? styles.buildInfoBadgeSuccess
              : buildInfo.buildCompatibility === "incompativel"
                ? styles.buildInfoBadgeCritical
                : styles.buildInfoBadgeWarning,
          ]}
        >
          <Text
            style={[
              styles.buildInfoBadgeText,
              buildInfo.buildCompatibility === "atual"
                ? styles.buildInfoBadgeSuccessText
                : buildInfo.buildCompatibility === "incompativel"
                  ? styles.buildInfoBadgeCriticalText
                  : undefined,
            ]}
          >
            {pilotBuildCompatibilityLabel(buildInfo.buildCompatibility)}
          </Text>
        </View>
      </View>
      <Text style={styles.buildInfoBody}>
        Versao {buildInfo.appVersion} ({buildInfo.appBuild}) - {buildInfo.environment}
      </Text>
      <View style={styles.buildInfoGrid}>
        <Text style={styles.buildInfoMeta}>APK aprovado: {buildInfo.approvedArtifactLabel}</Text>
        <Text style={styles.buildInfoMeta}>
          Alvo aprovado: {buildInfo.approvedAppVersion} ({buildInfo.approvedBuild})
        </Text>
        <Text style={styles.buildInfoMeta}>API: {buildInfo.apiTarget}</Text>
        <Text style={styles.buildInfoMeta}>Pacote: {buildInfo.packageId}</Text>
      </View>
    </View>
  );
}

function pilotBuildCompatibilityLabel(state: MobileBuildInfo["buildCompatibility"]): string {
  if (state === "atual") return "Aprovado";
  if (state === "desatualizado") return "Atualizar";
  if (state === "incompativel") return "Incompativel";
  return "Conferir";
}

export function TodayTaskRow({
  task,
  onPress,
  onAcknowledgeEscalation,
  alertState,
  highlighted = false,
  referenceTime = new Date(),
}: {
  task: TodayTaskRecord;
  onPress: () => void;
  onAcknowledgeEscalation?: (() => void) | undefined;
  alertState?: TaskAlertStateRecord | undefined;
  highlighted?: boolean;
  referenceTime?: Date;
}) {
  const action = todayActionLabel(task);
  const title = `${task.productDisplayName} - lote ${task.lotIdentity.value}`;
  const location = `Local: ${formatLocation(task.currentLocation)}`;
  const due = `${dueLabel(task, referenceTime)} - Severidade ${severityLabel(task)} - ${task.ownerLabel}`;
  const isCritical = task.severity === "critical" || task.severity === "high";
  const isWarningMarkdownDelay =
    task.requiredResolution === "approve_markdown" && isOverdueTask(task, referenceTime);

  return (
    <Pressable
      accessibilityHint="Abre a tarefa para resolver este risco"
      accessibilityRole="button"
      accessibilityLabel={`${action}: ${task.productDisplayName}, lote ${task.lotIdentity.value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.taskRow,
        isWarningMarkdownDelay ? styles.taskRowWarning : undefined,
        isCritical ? styles.taskRowCritical : undefined,
        highlighted ? styles.taskRowHighlighted : undefined,
        pressed
          ? isCritical
            ? styles.taskRowCriticalPressed
            : isWarningMarkdownDelay
              ? styles.taskRowWarningPressed
              : styles.taskRowPressed
          : undefined,
      ]}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskAction}>{action}</Text>
        <View
          style={[
            styles.riskTag,
            isWarningMarkdownDelay ? styles.riskTagWarning : undefined,
            isCritical ? styles.riskTagCritical : undefined,
          ]}
        >
          <Text
            style={[
              styles.taskReason,
              isWarningMarkdownDelay ? styles.taskReasonWarning : undefined,
              isCritical ? styles.taskReasonCritical : undefined,
            ]}
          >
            {riskReasonLabel(task)}
          </Text>
        </View>
      </View>
      <Text style={styles.taskTitle}>{title}</Text>
      <View style={styles.taskMetaGroup}>
        <Text style={styles.taskMeta}>{location}</Text>
        <Text style={styles.taskMeta}>{due}</Text>
      </View>
      {alertState === undefined ? null : (
        <TaskAlertStatus
          alertState={alertState}
          onAcknowledgeEscalation={onAcknowledgeEscalation}
          referenceTime={referenceTime}
          task={task}
        />
      )}
      <TaskSyncStatus task={task} />
    </Pressable>
  );
}

function TaskSyncStatus({ task }: { task: TodayTaskRecord }) {
  if (task.sync === undefined) {
    return null;
  }

  const descriptor = syncStatusDescriptor(task.sync.state);
  const label =
    task.sync.state === "synced"
      ? todayCopy.sync.syncedAt(formatAlertTime(task.sync.lastSyncedAt ?? task.updatedAt))
      : task.sync.state === "sync_failed"
        ? todayCopy.sync.failed
        : task.sync.state === "sync_conflict"
          ? todayCopy.sync.conflict
          : task.sync.state === "syncing"
            ? todayCopy.sync.syncing
            : todayCopy.sync.pending;

  return (
    <View
      style={[
        styles.syncMarker,
        descriptor.tone === "critical" ? styles.syncMarkerCritical : undefined,
        descriptor.tone === "warning" ? styles.syncMarkerWarning : undefined,
        descriptor.tone === "success" ? styles.syncMarkerSuccess : undefined,
      ]}
    >
      <Text
        style={[
          styles.syncMarkerText,
          descriptor.tone === "critical" ? styles.syncMarkerTextCritical : undefined,
          descriptor.tone === "warning" ? styles.syncMarkerTextWarning : undefined,
          descriptor.tone === "success" ? styles.syncMarkerTextSuccess : undefined,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function syncStatusDescriptor(
  state: NonNullable<TodayTaskRecord["sync"]>["state"],
): MobileStatusDescriptor {
  if (state === "synced") {
    return mobileStatusDescriptorFor("synced_transport");
  }

  if (state === "sync_failed" || state === "sync_conflict") {
    return mobileStatusDescriptorFor("conflict");
  }

  if (state === "syncing") {
    return mobileStatusDescriptorFor("syncing");
  }

  return mobileStatusDescriptorFor("pending_central");
}

function TodayLoadingState() {
  return (
    <View accessibilityLabel="Carregando tarefas operacionais" style={styles.loadingState}>
      <Text style={styles.loadingTitle}>Carregando tarefas do turno</Text>
      <Text style={styles.loadingBody}>
        A seguranca da area de venda ainda esta sendo conferida. Nenhuma confirmacao foi concluida.
      </Text>
      <View style={styles.loadingLine} />
      <View style={styles.loadingLine} />
    </View>
  );
}

function AlertChannelSurface({
  channelState,
  feedback,
  isRequesting,
  onActivate,
}: {
  channelState: AlertChannelState;
  feedback?: string | undefined;
  isRequesting: boolean;
  onActivate: () => void;
}) {
  if (channelState === "not_requested" || channelState === "requesting") {
    return (
      <View style={styles.pushPermissionCard}>
        <Text style={styles.pushPermissionTitle}>{todayCopy.push.educationTitle}</Text>
        <Text style={styles.pushPermissionBody}>{todayCopy.push.educationBody}</Text>
        <PrimaryAction
          disabled={isRequesting}
          label={isRequesting ? "Preparando alertas" : todayCopy.push.activate}
          onPress={onActivate}
        />
        <Text style={styles.pushPermissionBody}>{todayCopy.push.notNow}</Text>
      </View>
    );
  }

  const notice = channelNoticeFor(channelState, feedback);
  const isError =
    channelState === "denied" || channelState === "unavailable" || channelState === "failed";

  return (
    <View style={[styles.alertNotice, isError ? styles.alertNoticeWarning : undefined]}>
      <Text style={[styles.alertNoticeText, isError ? styles.alertNoticeWarningText : undefined]}>
        {notice}
      </Text>
      {channelState === "active" ? null : (
        <SecondaryAction
          label={channelState === "denied" ? todayCopy.push.openSettings : todayCopy.push.retry}
          onPress={onActivate}
        />
      )}
    </View>
  );
}

function TaskAlertStatus({
  task,
  alertState,
  referenceTime,
  onAcknowledgeEscalation,
}: {
  task: TodayTaskRecord;
  alertState: TaskAlertStateRecord;
  referenceTime: Date;
  onAcknowledgeEscalation?: (() => void) | undefined;
}) {
  const isEscalated =
    alertState.escalationState === "escalated" ||
    alertState.escalationState === "leadership_acknowledged";
  const status = alertStatusLabel(alertState, referenceTime);

  return (
    <View
      style={[
        styles.alertStatus,
        isEscalated ? styles.alertStatusCritical : undefined,
        alertState.attemptState === "retry_pending" ? styles.alertStatusWarning : undefined,
      ]}
    >
      <Text
        style={[styles.alertStatusText, isEscalated ? styles.alertStatusCriticalText : undefined]}
      >
        {status}
      </Text>
      {isEscalated ? (
        <Text style={styles.alertStatusText}>{todayCopy.push.escalatedAudience}</Text>
      ) : null}
      {alertState.escalationState === "escalated" ? (
        <View style={styles.acknowledgementPanel}>
          <Text style={styles.acknowledgementText}>
            {task.productDisplayName} - lote {task.lotIdentity.value}
          </Text>
          <Text style={styles.acknowledgementText}>Responsavel: {task.ownerLabel}</Text>
          {alertState.escalatedAt === undefined ? null : (
            <Text style={styles.acknowledgementText}>
              Escalada as {formatAlertTime(alertState.escalatedAt)}
            </Text>
          )}
          <SecondaryAction
            label={todayCopy.push.acknowledge}
            onPress={() => {
              onAcknowledgeEscalation?.();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function channelNoticeFor(channelState: AlertChannelState, feedback: string | undefined): string {
  if (feedback !== undefined) {
    return operatorSafePushFeedback(feedback);
  }

  if (channelState === "active") {
    return todayCopy.push.active;
  }

  if (channelState === "local_only") {
    return todayCopy.push.localOnly;
  }

  if (channelState === "denied") {
    return todayCopy.push.denied;
  }

  if (channelState === "failed") {
    return todayCopy.push.failed;
  }

  return todayCopy.push.unavailable;
}

function operatorSafePushFeedback(reason: string | undefined): string {
  if (reason === undefined || reason.trim().length === 0) {
    return todayCopy.push.unavailable;
  }

  const approvedOperationalMessages: readonly string[] = [
    todayCopy.push.active,
    todayCopy.push.denied,
    todayCopy.push.unavailable,
    todayCopy.push.localOnly,
    todayCopy.push.nativeSetupRequired,
    todayCopy.push.failed,
  ];

  if (approvedOperationalMessages.includes(reason)) {
    return reason;
  }

  const technicalMarkers = [
    "firebase",
    "fcm",
    "google-services",
    "googleservicesfile",
    "default firebaseapp",
    "expopushtokenmanager",
    "native push token",
  ];
  const normalized = reason.toLocaleLowerCase("en-US");

  if (technicalMarkers.some((marker) => normalized.includes(marker))) {
    return todayCopy.push.nativeSetupRequired;
  }

  return todayCopy.push.unavailable;
}

function alertStatusLabel(alertState: TaskAlertStateRecord, referenceTime: Date): string {
  if (alertState.escalationState === "leadership_acknowledged") {
    const acknowledgedAt = alertState.leadershipAcknowledgedAt ?? alertState.updatedAt;

    return todayCopy.push.acknowledged(formatAlertTime(acknowledgedAt));
  }

  if (alertState.escalationState === "escalated") {
    const escalatedAt = alertState.escalatedAt ?? alertState.updatedAt;

    return todayCopy.push.escalatedAt(formatAlertTime(escalatedAt));
  }

  if (alertState.attemptState === "retry_pending") {
    return todayCopy.push.retryPending;
  }

  if (alertState.attemptState === "failed" || alertState.attemptState === "exhausted") {
    return todayCopy.push.failedStatus;
  }

  if (alertState.attemptState === "pending") {
    return todayCopy.push.pending;
  }

  if (alertState.nextReminderAt !== undefined) {
    return todayCopy.push.nextReminder(
      relativeReminderLabel(alertState.nextReminderAt, referenceTime),
    );
  }

  return todayCopy.push.alertActive;
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count === 1 ? "1 tarefa" : `${count} tarefas`}</Text>
    </View>
  );
}

function isSalesAreaBlockingTask(task: TodayTaskRecord): boolean {
  return (
    task.currentLocation.kind === "area_de_venda" &&
    (task.riskState === "expired" ||
      task.riskState === "critical" ||
      task.riskState === "uncertain")
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
    paddingBottom: captureSpacing.xxlarge,
  },
  safetyHeader: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.large,
    minHeight: 176,
    padding: captureSpacing.large,
  },
  safetyHeaderCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  safetyVerdict: {
    color: captureColors.ink,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34,
  },
  heroKicker: {
    color: captureColors.accent,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  safetyBody: {
    color: captureColors.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
  },
  heroMetric: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 92,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.small,
  },
  heroMetricValue: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  heroMetricLabel: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  heroStatusStack: {
    gap: captureSpacing.small,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
  },
  heroActionPrimary: {
    flexBasis: 180,
    flexGrow: 1,
  },
  heroActionSecondary: {
    flexBasis: 132,
    flexGrow: 1,
  },
  emptyState: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  emptyTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  emptyBody: {
    color: captureColors.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  buildInfoCard: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  buildInfoHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
    justifyContent: "space-between",
  },
  buildInfoTitle: {
    color: captureColors.ink,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  buildInfoBadge: {
    borderRadius: captureRadii.small,
    minHeight: 28,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.xsmall,
  },
  buildInfoBadgeSuccess: {
    backgroundColor: captureColors.accentSoft,
  },
  buildInfoBadgeWarning: {
    backgroundColor: captureColors.warningSurface,
  },
  buildInfoBadgeCritical: {
    backgroundColor: captureColors.criticalTag,
  },
  buildInfoBadgeText: {
    color: captureColors.warningInk,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  buildInfoBadgeSuccessText: {
    color: captureColors.accent,
  },
  buildInfoBadgeCriticalText: {
    color: captureColors.critical,
  },
  buildInfoBody: {
    color: captureColors.ink,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  buildInfoGrid: {
    gap: captureSpacing.xsmall,
  },
  buildInfoMeta: {
    color: captureColors.mutedInk,
    fontSize: 13,
    lineHeight: 19,
  },
  taskList: {
    gap: captureSpacing.xlarge,
  },
  taskSection: {
    gap: captureSpacing.small,
  },
  sectionHeading: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: captureSpacing.small,
    justifyContent: "space-between",
  },
  taskRow: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    minHeight: 48,
    padding: captureSpacing.large,
  },
  taskRowCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  taskRowWarning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  taskRowHighlighted: {
    borderColor: captureColors.accent,
    borderWidth: 2,
  },
  taskRowPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  taskRowCriticalPressed: {
    backgroundColor: captureColors.criticalSurfacePressed,
  },
  taskRowWarningPressed: {
    backgroundColor: captureColors.warningSurface,
  },
  taskHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
    justifyContent: "space-between",
  },
  taskAction: {
    color: captureColors.ink,
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  taskTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  taskMeta: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  taskMetaGroup: {
    gap: captureSpacing.xsmall,
  },
  riskTag: {
    backgroundColor: captureColors.surfaceMuted,
    borderRadius: captureRadii.small,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.xsmall,
  },
  riskTagCritical: {
    backgroundColor: captureColors.criticalTag,
  },
  riskTagWarning: {
    backgroundColor: captureColors.warningSurface,
  },
  taskReason: {
    color: captureColors.mutedInk,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  taskReasonCritical: {
    color: captureColors.critical,
  },
  taskReasonWarning: {
    color: captureColors.warningInk,
  },
  futureSection: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
  },
  pushPermissionCard: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.warningBorder,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.medium,
  },
  pushPermissionTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  pushPermissionBody: {
    color: captureColors.warningInk,
    fontSize: 14,
    lineHeight: 20,
  },
  alertNotice: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  alertNoticeWarning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  alertNoticeText: {
    color: captureColors.accent,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  alertNoticeWarningText: {
    color: captureColors.warningInk,
  },
  alertStatus: {
    backgroundColor: captureColors.surfaceMuted,
    borderRadius: captureRadii.small,
    gap: captureSpacing.xsmall,
    padding: captureSpacing.small,
  },
  alertStatusWarning: {
    backgroundColor: captureColors.warningSurface,
  },
  alertStatusCritical: {
    backgroundColor: captureColors.criticalTag,
  },
  alertStatusText: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  alertStatusCriticalText: {
    color: captureColors.critical,
    fontWeight: "600",
  },
  syncMarker: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    padding: captureSpacing.small,
  },
  syncMarkerCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  syncMarkerWarning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  syncMarkerSuccess: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
  },
  syncMarkerText: {
    color: captureColors.mutedInk,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  syncMarkerTextCritical: {
    color: captureColors.critical,
  },
  syncMarkerTextWarning: {
    color: captureColors.warningInk,
  },
  syncMarkerTextSuccess: {
    color: captureColors.accent,
  },
  acknowledgementPanel: {
    gap: captureSpacing.xsmall,
    paddingTop: captureSpacing.xsmall,
  },
  acknowledgementText: {
    color: captureColors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: captureColors.ink,
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  sectionCount: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  shiftCloseEntry: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.medium,
  },
  shiftCloseTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  shiftCloseBody: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  futureItem: {
    color: captureColors.warningInk,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingState: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  loadingTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  loadingBody: {
    color: captureColors.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  loadingLine: {
    backgroundColor: captureColors.surfacePressed,
    borderRadius: captureRadii.small,
    height: 16,
    width: "100%",
  },
});
