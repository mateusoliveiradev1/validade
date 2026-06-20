import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { FutureAttentionRecord, TodayTaskRecord } from "@validade-zero/contracts";
import { formatLocation } from "./capture-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refreshTasks(source: TodayTaskRefreshSource): Promise<void> {
    setIsRefreshing(true);
    setRefreshError(undefined);

    try {
      const current = now();
      const result = await repository.refreshTodayTasks({
        currentDate: current.toISOString().slice(0, 10),
        currentTimestamp: current.toISOString(),
        source,
      });

      setTasks(result.tasks);
      setFutureAttention(result.futureAttention);
    } catch {
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
          onPress={() => void refreshTasks("manual_refresh")}
        />
      </View>

      {refreshError === undefined ? null : <StatusNotice tone="error">{refreshError}</StatusNotice>}

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
              <Text style={styles.sectionTitle}>{todayCopy.sections.overdue}</Text>
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
                <Text style={styles.sectionTitle}>{todayCopy.sections[section]}</Text>
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${action}: ${task.productDisplayName}, lote ${task.lotIdentity.value}`}
      onPress={onPress}
      style={[
        styles.taskRow,
        task.severity === "critical" || task.severity === "high"
          ? styles.taskRowCritical
          : undefined,
      ]}
    >
      <Text style={styles.taskAction}>{action}</Text>
      <Text style={styles.taskTitle}>{title}</Text>
      <Text style={styles.taskMeta}>{location}</Text>
      <Text style={styles.taskMeta}>{due}</Text>
      <Text style={styles.taskReason}>{riskReasonLabel(task)}</Text>
    </Pressable>
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
    backgroundColor: "#F5F7EF",
    flexGrow: 1,
    gap: 16,
    padding: 16,
  },
  safetyHeader: {
    backgroundColor: "#E6EEE4",
    gap: 16,
    minHeight: 156,
    padding: 16,
  },
  safetyHeaderCritical: {
    backgroundColor: "#FCE8E6",
  },
  safetyVerdict: {
    color: "#112016",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34,
  },
  safetyBody: {
    color: "#3F5546",
    fontSize: 16,
    lineHeight: 24,
  },
  emptyState: {
    gap: 16,
    paddingVertical: 32,
  },
  emptyTitle: {
    color: "#112016",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  emptyBody: {
    color: "#3F5546",
    fontSize: 16,
    lineHeight: 24,
  },
  taskList: {
    gap: 24,
  },
  taskSection: {
    gap: 8,
  },
  taskRow: {
    backgroundColor: "#E6EEE4",
    gap: 8,
    minHeight: 48,
    padding: 16,
  },
  taskRowCritical: {
    backgroundColor: "#FCE8E6",
  },
  taskAction: {
    color: "#112016",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  taskTitle: {
    color: "#112016",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  taskMeta: {
    color: "#3F5546",
    fontSize: 14,
    lineHeight: 20,
  },
  taskReason: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  futureSection: {
    backgroundColor: "#FFF4D7",
    gap: 8,
    padding: 16,
  },
  sectionTitle: {
    color: "#112016",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  futureItem: {
    color: "#3F5546",
    fontSize: 14,
    lineHeight: 20,
  },
});
