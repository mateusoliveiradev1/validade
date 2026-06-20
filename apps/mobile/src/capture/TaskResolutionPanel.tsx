import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { TodayTaskRecord } from "@validade-zero/contracts";
import { isResolutionCompatible, type TaskResolutionAction } from "@validade-zero/domain";
import { formatLocation } from "./capture-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, SelectionRow, StatusNotice } from "./capture-ui";
import type { CaptureRepository } from "./repository";
import { todayActionLabel, todayCopy } from "./today-copy";

const RESOLUTION_ACTIONS = [
  "withdraw",
  "record_loss",
  "confirm_presence",
  "request_markdown",
  "mark_not_found",
  "mark_probably_sold_out",
  "move_lot",
] as const satisfies readonly TaskResolutionAction[];

export function TaskResolutionPanel({
  repository,
  task,
  onDone,
  onBack,
  now = () => new Date(),
}: {
  repository: CaptureRepository;
  task: TodayTaskRecord;
  onDone: () => void;
  onBack: () => void;
  now?: () => Date;
}) {
  const [selectedAction, setSelectedAction] = useState<TaskResolutionAction | undefined>();
  const [blockingNotice, setBlockingNotice] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const compatible = selectedAction
    ? isResolutionCompatible(task.requiredResolution, selectedAction)
    : false;

  function selectAction(action: TaskResolutionAction): void {
    setSelectedAction(action);

    if (!isResolutionCompatible(task.requiredResolution, action)) {
      setBlockingNotice(task.requiredResolution === "withdraw_or_loss" ? todayCopy.expiredAction : todayCopy.incompatibleAction);
      return;
    }

    setBlockingNotice(undefined);
  }

  async function submit(): Promise<void> {
    if (selectedAction === undefined || !compatible) {
      setBlockingNotice(
        task.requiredResolution === "withdraw_or_loss"
          ? todayCopy.expiredAction
          : todayCopy.incompatibleAction,
      );
      return;
    }

    setSubmitting(true);
    await repository.resolveTodayTask({
      taskId: task.id,
      action: selectedAction,
      actorLabel: todayCopy.localActor,
      occurredAt: now().toISOString(),
      ...(selectedAction === "withdraw" || selectedAction === "record_loss"
        ? { destination: { kind: "retirada_perda" as const } }
        : {}),
    });
    setSubmitting(false);
    onDone();
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={todayActionLabel(task)} body={`${task.productDisplayName} - lote ${task.lotIdentity.value}`} />
      <View style={styles.summary}>
        <Text style={styles.summaryLine}>Local atual: {formatLocation(task.currentLocation)}</Text>
        <Text style={styles.summaryLine}>Responsavel: {task.ownerLabel}</Text>
        <Text style={styles.summaryLine}>Acao exigida: {todayActionLabel(task)}</Text>
      </View>

      {RESOLUTION_ACTIONS.map((action) => {
        const actionCompatible = isResolutionCompatible(task.requiredResolution, action);

        return (
          <SelectionRow
            key={action}
            label={todayCopy.resolutionOptions[action]}
            detail={actionCompatible ? "Compativel com este risco" : "Nao resolve este risco"}
            selected={selectedAction === action}
            onPress={() => selectAction(action)}
          />
        );
      })}

      {blockingNotice === undefined ? null : (
        <StatusNotice tone="error">{blockingNotice}</StatusNotice>
      )}

      <PrimaryAction
        label={
          selectedAction === undefined
            ? todayCopy.openTask
            : todayCopy.resolutionOptions[selectedAction]
        }
        disabled={selectedAction === undefined || !compatible || submitting}
        onPress={() => void submit()}
      />
      <SecondaryAction label="Voltar e revisar" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F5F7EF",
    flexGrow: 1,
    gap: 16,
    padding: 16,
  },
  summary: {
    backgroundColor: "#E6EEE4",
    gap: 8,
    padding: 16,
  },
  summaryLine: {
    color: "#112016",
    fontSize: 16,
    lineHeight: 24,
  },
});
