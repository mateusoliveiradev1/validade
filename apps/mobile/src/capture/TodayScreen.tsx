import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { FutureAttentionRecord, TodayTaskRecord } from "@validade-zero/contracts";
import { formatLocation } from "./capture-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import type { CaptureRepository, TodayTaskRefreshSource } from "./repository";
import {
  dueLabel,
  isOverdueTask,
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
  now = () => new Date(),
}: {
  repository: CaptureRepository;
  onRegisterLot: () => void;
  onOpenRecentLots: () => void;
  onOpenTask?: (task: TodayTaskRecord) => void;
  now?: () => Date;
}) {
  const [tasks, setTasks] = useState<readonly TodayTaskRecord[]>([]);
  const [futureAttention, setFutureAttention] = useState<readonly FutureAttentionRecord[]>([]);
  const [refreshError, setRefreshError] = useState<string | undefined>();
  const [refreshFeedback, setRefreshFeedback] = useState<string | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
                  task={task}
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
                    task={task}
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
  referenceTime = new Date(),
}: {
  task: TodayTaskRecord;
  onPress: () => void;
  referenceTime?: Date;
}) {
  const action = todayActionLabel(task);
  const title = `${task.productDisplayName} - lote ${task.lotIdentity.value}`;
  const location = `Local: ${formatLocation(task.currentLocation)}`;
  const due = `${dueLabel(task, referenceTime)} - Severidade ${severityLabel(task)} - ${task.ownerLabel}`;
  const isCritical = task.severity === "critical" || task.severity === "high";

  return (
    <Pressable
      accessibilityHint="Abre a tarefa para resolver este risco"
      accessibilityRole="button"
      accessibilityLabel={`${action}: ${task.productDisplayName}, lote ${task.lotIdentity.value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.taskRow,
        isCritical ? styles.taskRowCritical : undefined,
        pressed ? (isCritical ? styles.taskRowCriticalPressed : styles.taskRowPressed) : undefined,
      ]}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskAction}>{action}</Text>
        <View style={[styles.riskTag, isCritical ? styles.riskTagCritical : undefined]}>
          <Text style={[styles.taskReason, isCritical ? styles.taskReasonCritical : undefined]}>
            {riskReasonLabel(task)}
          </Text>
        </View>
      </View>
      <Text style={styles.taskTitle}>{title}</Text>
      <View style={styles.taskMetaGroup}>
        <Text style={styles.taskMeta}>{location}</Text>
        <Text style={styles.taskMeta}>{due}</Text>
      </View>
    </Pressable>
  );
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
  taskRowPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  taskRowCriticalPressed: {
    backgroundColor: captureColors.criticalSurfacePressed,
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
  taskReason: {
    color: captureColors.mutedInk,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  taskReasonCritical: {
    color: captureColors.critical,
  },
  futureSection: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
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
