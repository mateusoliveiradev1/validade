import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  FutureAttentionRecord,
  TaskAlertStateRecord,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import type { AlertChannelState } from "@validade-zero/domain";
import { formatLocation } from "./capture-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import type { PushAlertChannel } from "./alert-channel";
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

const ACTIVE_SECTION_ORDER = [
  "withdraw_now",
  "check_sales_area",
  "request_markdown",
  "follow_up",
] as const satisfies readonly TodayTaskRecord["section"][];

export function TodayScreen({
  repository,
  onRegisterLot,
  onOpenRecentLots,
  onOpenTask,
  alertChannel,
  pushFallbackNotice,
  highlightedTaskId,
  now = () => new Date(),
}: {
  repository: CaptureRepository;
  onRegisterLot: () => void;
  onOpenRecentLots: () => void;
  onOpenTask?: (task: TodayTaskRecord) => void;
  alertChannel?: PushAlertChannel;
  pushFallbackNotice?: string | undefined;
  highlightedTaskId?: string | undefined;
  now?: () => Date;
}) {
  const [tasks, setTasks] = useState<readonly TodayTaskRecord[]>([]);
  const [futureAttention, setFutureAttention] = useState<readonly FutureAttentionRecord[]>([]);
  const [alertStates, setAlertStates] = useState<readonly TaskAlertStateRecord[]>([]);
  const [alertChannelState, setAlertChannelState] = useState<AlertChannelState>("not_requested");
  const [alertChannelFeedback, setAlertChannelFeedback] = useState<string | undefined>();
  const [acknowledgementFeedback, setAcknowledgementFeedback] = useState<string | undefined>();
  const [refreshError, setRefreshError] = useState<string | undefined>();
  const [refreshFeedback, setRefreshFeedback] = useState<string | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRequestingAlerts, setIsRequestingAlerts] = useState(false);

  async function refreshAlertChannelState(): Promise<void> {
    const registration = await repository.loadAlertChannelState();
    setAlertChannelState(alertChannelStateForRegistration(registration));
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
      setAlertStates(
        await repository.refreshTaskAlertStates({
          referenceTime: current.toISOString(),
          isWithinShift: true,
          overdueTaskIds: result.tasks
            .filter((task) => isOverdueTask(task, current))
            .map((task) => task.id),
        }),
      );

      if (source === "manual_refresh") {
        setRefreshFeedback(todayCopy.refreshSuccess(result.metadata.activeTaskCount));
      }
    } catch {
      setRefreshFeedback(undefined);
      setRefreshError(todayCopy.refreshError);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshTasks("today_open");
  }, []);

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
        setAlertChannelState(token.state);
        setAlertChannelFeedback(token.reason ?? todayCopy.push.unavailable);
        await repository.registerAlertDevice({
          deviceId: "local-alert-device",
          deviceLabel: "Celular do turno",
          audienceRole: "shift_team",
          permissionStatus: "unavailable",
          registeredAt: now().toISOString(),
        });
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
    } catch {
      setAlertChannelState("failed");
      setAlertChannelFeedback(todayCopy.push.failed);
    } finally {
      setIsRequestingAlerts(false);
    }
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
      actorLabel: "Lideranca local",
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
  const verdict =
    salesAreaRiskCount > 0
      ? todayCopy.criticalHeader(salesAreaRiskCount)
      : tasks.length > 0
        ? todayCopy.safeWithWorkHeader
        : todayCopy.safeHeader;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={todayCopy.title} />
      <View
        style={[
          styles.safetyHeader,
          salesAreaRiskCount > 0 ? styles.safetyHeaderCritical : undefined,
        ]}
      >
        <Text style={styles.safetyVerdict}>{verdict}</Text>
        <Text style={styles.safetyBody}>
          {salesAreaRiskCount > 0
            ? "Comece pelo primeiro risco da area de venda."
            : "Continue conferindo os lotes do turno sem esconder pendencias."}
        </Text>
        <SecondaryAction
          label={isRefreshing ? "Atualizando tarefas" : todayCopy.refresh}
          disabled={isRefreshing}
          onPress={() => void refreshTasks("manual_refresh")}
        />
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

      {tasks.length === 0 ? (
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
    </Pressable>
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
    return feedback;
  }

  if (channelState === "active") {
    return todayCopy.push.active;
  }

  if (channelState === "denied") {
    return todayCopy.push.denied;
  }

  if (channelState === "failed") {
    return todayCopy.push.failed;
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
    gap: captureSpacing.medium,
    minHeight: 156,
    padding: 18,
  },
  safetyHeaderCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  safetyVerdict: {
    color: captureColors.ink,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  safetyBody: {
    color: captureColors.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  emptyState: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.large,
    padding: 20,
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
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
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
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
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
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  pushPermissionTitle: {
    color: captureColors.ink,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
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
    fontWeight: "700",
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
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  sectionCount: {
    color: captureColors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
  },
  futureItem: {
    color: captureColors.warningInk,
    fontSize: 14,
    lineHeight: 20,
  },
});
