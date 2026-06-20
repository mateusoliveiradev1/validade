import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { EvidencePromptMetadata, TodayTaskRecord } from "@validade-zero/contracts";
import { isResolutionCompatible, type TaskResolutionAction } from "@validade-zero/domain";
import { ConfirmationSheet } from "./ConfirmationSheet";
import { formatLocation } from "./capture-copy";
import {
  Field,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";
import type { CaptureRepository } from "./repository";
import { todayActionLabel, todayCopy } from "./today-copy";

const STANDARD_RESOLUTION_ACTIONS = [
  "withdraw",
  "record_loss",
  "confirm_presence",
  "request_markdown",
  "mark_not_found",
  "mark_probably_sold_out",
  "move_lot",
] as const satisfies readonly TaskResolutionAction[];

const RECHECK_ACTIONS = ["complete_recheck"] as const satisfies readonly TaskResolutionAction[];

type NoPhotoReason = keyof typeof todayCopy.noPhotoReasons;

const noPhotoReasonKeys = Object.keys(todayCopy.noPhotoReasons) as NoPhotoReason[];

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
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  const [photoRecorded, setPhotoRecorded] = useState(false);
  const [noPhotoReason, setNoPhotoReason] = useState<NoPhotoReason | undefined>();
  const [customNoPhotoReason, setCustomNoPhotoReason] = useState("");
  const compatible = selectedAction
    ? isResolutionCompatible(task.requiredResolution, selectedAction)
    : false;
  const actions = actionsForTask(task);

  function selectAction(action: TaskResolutionAction): void {
    setSelectedAction(action);
    setConfirming(false);
    setFeedback(undefined);

    if (!isResolutionCompatible(task.requiredResolution, action)) {
      setBlockingNotice(
        task.requiredResolution === "withdraw_or_loss"
          ? todayCopy.expiredAction
          : todayCopy.incompatibleAction,
      );
      return;
    }

    setBlockingNotice(undefined);
  }

  function selectPhotoEvidence(): void {
    setPhotoRecorded(true);
    setNoPhotoReason(undefined);
    setBlockingNotice(undefined);
  }

  function selectNoPhotoReason(reason: NoPhotoReason): void {
    setPhotoRecorded(false);
    setNoPhotoReason(reason);
    setBlockingNotice(undefined);

    if (reason !== "other") {
      setCustomNoPhotoReason("");
    }
  }

  function requestSubmit(): void {
    if (selectedAction === undefined || !compatible) {
      setBlockingNotice(
        task.requiredResolution === "withdraw_or_loss"
          ? todayCopy.expiredAction
          : todayCopy.incompatibleAction,
      );
      return;
    }

    if (selectedAction === "complete_recheck" && evidenceForRecheck() === undefined) {
      setBlockingNotice(todayCopy.evidenceRequired);
      return;
    }

    if (actionNeedsConfirmation(selectedAction)) {
      setConfirming(true);
      return;
    }

    void submit();
  }

  async function submit(): Promise<void> {
    if (selectedAction === undefined || !compatible) {
      return;
    }

    const evidence =
      selectedAction === "complete_recheck" ? evidenceForRecheck() : undefined;

    if (selectedAction === "complete_recheck" && evidence === undefined) {
      setBlockingNotice(todayCopy.evidenceRequired);
      setConfirming(false);
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
      ...(evidence === undefined ? {} : { evidence }),
      ...(task.recheckParentId === undefined ? {} : { recheckParentId: task.recheckParentId }),
    });
    setSubmitting(false);
    setConfirming(false);

    if (createsSalesAreaRecheck(task, selectedAction)) {
      setFeedback(todayCopy.recheckFeedback);
    }

    onDone();
  }

  function evidenceForRecheck(): EvidencePromptMetadata | undefined {
    if (photoRecorded) {
      return { kind: "photo_recorded_placeholder" };
    }

    if (noPhotoReason === undefined) {
      return undefined;
    }

    const reason =
      noPhotoReason === "other"
        ? customNoPhotoReason.trim()
        : todayCopy.noPhotoReasons[noPhotoReason];

    if (reason.length === 0) {
      return undefined;
    }

    return { kind: "no_photo_reason", reason };
  }

  if (confirming && selectedAction !== undefined) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ConfirmationSheet
          title={todayCopy.confirmationTitle}
          summary={confirmationSummary(task, selectedAction, evidenceForRecheck())}
          confirmLabel={todayCopy.confirmLabels[selectedAction]}
          onConfirm={() => void submit()}
          onBack={() => setConfirming(false)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title={todayActionLabel(task)}
        body={`${task.productDisplayName} - lote ${task.lotIdentity.value}`}
      />
      <View style={styles.summary}>
        <Text style={styles.summaryLine}>Local atual: {formatLocation(task.currentLocation)}</Text>
        <Text style={styles.summaryLine}>Responsavel: {task.ownerLabel}</Text>
        <Text style={styles.summaryLine}>Acao exigida: {todayActionLabel(task)}</Text>
        {task.recheckParentId === undefined ? null : (
          <Text style={styles.summaryLine}>Origem: reconferencia apos retirada/perda</Text>
        )}
      </View>

      <View style={styles.group}>
        {actions.map((action) => {
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
      </View>

      {task.requiredResolution === "sales_area_recheck" ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{todayCopy.evidenceRequired}</Text>
          <SelectionRow
            label={todayCopy.photoEvidence}
            selected={photoRecorded}
            onPress={selectPhotoEvidence}
          />
          <Text style={styles.groupTitle}>{todayCopy.noPhotoReasonsTitle}</Text>
          {noPhotoReasonKeys.map((reason) => (
            <SelectionRow
              key={reason}
              label={todayCopy.noPhotoReasons[reason]}
              selected={noPhotoReason === reason}
              onPress={() => selectNoPhotoReason(reason)}
            />
          ))}
          {noPhotoReason === "other" ? (
            <Field
              label={todayCopy.customNoPhotoReason}
              value={customNoPhotoReason}
              onChangeText={setCustomNoPhotoReason}
            />
          ) : null}
        </View>
      ) : null}

      {blockingNotice === undefined ? null : (
        <StatusNotice tone="error">{blockingNotice}</StatusNotice>
      )}
      {feedback === undefined ? null : <StatusNotice>{feedback}</StatusNotice>}

      <PrimaryAction
        label={
          selectedAction === undefined
            ? todayCopy.openTask
            : todayCopy.confirmLabels[selectedAction]
        }
        disabled={selectedAction === undefined || !compatible || submitting}
        onPress={requestSubmit}
      />
      <SecondaryAction label="Voltar e revisar" onPress={onBack} />
    </ScrollView>
  );
}

function actionsForTask(task: TodayTaskRecord): readonly TaskResolutionAction[] {
  if (task.requiredResolution === "sales_area_recheck") {
    return RECHECK_ACTIONS;
  }

  return STANDARD_RESOLUTION_ACTIONS;
}

function actionNeedsConfirmation(action: TaskResolutionAction): boolean {
  return (
    action === "withdraw" ||
    action === "record_loss" ||
    action === "mark_not_found" ||
    action === "mark_probably_sold_out" ||
    action === "move_lot" ||
    action === "complete_recheck"
  );
}

function createsSalesAreaRecheck(task: TodayTaskRecord, action: TaskResolutionAction): boolean {
  return (
    task.currentLocation.kind === "area_de_venda" &&
    (task.riskState === "expired" || task.riskState === "critical") &&
    (action === "withdraw" || action === "record_loss")
  );
}

function confirmationSummary(
  task: TodayTaskRecord,
  action: TaskResolutionAction,
  evidence: EvidencePromptMetadata | undefined,
): string {
  const lines = [
    `Produto: ${task.productDisplayName}`,
    `Lote: ${task.lotIdentity.value}`,
    `Local atual: ${formatLocation(task.currentLocation)}`,
    "Quantidade: nao informada nesta tarefa",
    `Acao: ${todayCopy.resolutionOptions[action]}`,
  ];

  if (action === "withdraw" || action === "record_loss") {
    lines.push(todayCopy.destinationLoss);
  }

  if (evidence !== undefined) {
    lines.push(
      evidence.kind === "no_photo_reason"
        ? `Evidencia: ${evidence.reason}`
        : `Evidencia: ${todayCopy.photoEvidence}`,
    );
  }

  if (createsSalesAreaRecheck(task, action)) {
    lines.push(`Consequencia: ${todayCopy.recheckConsequence}`);
  }

  return lines.join("\n");
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
  group: {
    gap: 8,
  },
  groupTitle: {
    color: "#112016",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
});
