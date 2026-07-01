import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  CompletedEvidenceMetadata,
  EvidencePromptMetadata,
  OfflineActionCommand,
  AuditTimelineItem,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import { isResolutionCompatible, type TaskResolutionAction } from "@validade-zero/domain";
import { AuditTimeline } from "./AuditTimeline";
import { ConfirmationSheet } from "./ConfirmationSheet";
import { EvidenceStatus } from "./EvidenceStatus";
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
import type { EvidenceUploadQueueRecord } from "./repository";
import { todayActionLabel, todayCopy } from "./today-copy";
import { captureColors, captureSpacing } from "./capture-theme";
import { mobileStatusDescriptorFor } from "./mobile-status";

const STANDARD_RESOLUTION_ACTIONS = [
  "withdraw",
  "repack",
  "record_loss",
  "confirm_presence",
  "request_markdown",
  "mark_not_found",
  "mark_probably_sold_out",
  "move_lot",
] as const satisfies readonly TaskResolutionAction[];

const RECHECK_ACTIONS = ["complete_recheck"] as const satisfies readonly TaskResolutionAction[];
const REPACK_OR_LOSS_ACTIONS = [
  "repack",
  "record_loss",
] as const satisfies readonly TaskResolutionAction[];
const MARKDOWN_STAGE_RESOLUTIONS = [
  "approve_markdown",
  "apply_markdown",
  "confirm_markdown_on_shelf",
] as const satisfies readonly TodayTaskRecord["requiredResolution"][];

type NoPhotoReason = keyof typeof todayCopy.noPhotoReasons;
type MarkdownDecision = "approved" | "rejected";

const noPhotoReasonKeys = Object.keys(todayCopy.noPhotoReasons) as NoPhotoReason[];

export function TaskResolutionPanel({
  repository,
  task,
  onDone,
  onBack,
  onLocalSave,
  auditEvents = [],
  evidenceUploads = [],
  onRetryEvidenceUpload,
  actorLabel = todayCopy.fallbackActor,
  now = () => new Date(),
}: {
  repository: CaptureRepository;
  task: TodayTaskRecord;
  onDone: () => void;
  onBack: () => void;
  onLocalSave?: (() => void) | undefined;
  auditEvents?: readonly AuditTimelineItem[] | undefined;
  evidenceUploads?: readonly EvidenceUploadQueueRecord[] | undefined;
  onRetryEvidenceUpload?: ((localEvidenceId: string) => void) | undefined;
  actorLabel?: string | undefined;
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
  const [markdownDecision, setMarkdownDecision] = useState<MarkdownDecision | undefined>();
  const [rejectionReason, setRejectionReason] = useState("");
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
          : task.requiredResolution === "repack_or_loss"
            ? todayCopy.processedExpiredAction
            : todayCopy.incompatibleAction,
      );
      return;
    }

    setBlockingNotice(undefined);
  }

  function selectMarkdownDecision(decision: MarkdownDecision): void {
    setMarkdownDecision(decision);
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
          : task.requiredResolution === "repack_or_loss"
            ? todayCopy.processedExpiredAction
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

  async function submitMarkdownStage(): Promise<void> {
    if (!isMarkdownStageTask(task)) {
      return;
    }

    const workflowId = task.markdownWorkflowId;

    if (workflowId === undefined) {
      setBlockingNotice(todayCopy.markdown.missingWorkflow);
      return;
    }

    setSubmitting(true);

    try {
      if (task.requiredResolution === "approve_markdown") {
        if (markdownDecision === undefined) {
          setBlockingNotice(todayCopy.incompatibleAction);
          return;
        }

        const trimmedReason = rejectionReason.trim();

        if (markdownDecision === "rejected" && trimmedReason.length === 0) {
          setBlockingNotice(todayCopy.markdown.rejectionReason);
          return;
        }

        const command = {
          workflowId,
          taskId: task.id,
          actorLabel,
          occurredAt: now().toISOString(),
          decision: markdownDecision,
          ...(markdownDecision === "rejected" ? { rejectionReason: trimmedReason } : {}),
        } satisfies OfflineActionCommand["payload"];

        if (await shouldSaveOffline()) {
          await repository.saveOfflineAction({ kind: "decide_markdown", payload: command });
          handleLocalSave();
          return;
        }

        await repository.decideMarkdown(command);
        onDone();
        return;
      }

      const evidence = evidenceForCompletedStage();

      if (evidence === undefined) {
        setBlockingNotice(markdownEvidenceRequiredCopy(task));
        return;
      }

      if (task.requiredResolution === "apply_markdown") {
        const command = {
          workflowId,
          taskId: task.id,
          actorLabel,
          occurredAt: now().toISOString(),
          evidence,
        };

        if (await shouldSaveOffline()) {
          await repository.saveOfflineAction({
            kind: "record_markdown_application",
            payload: command,
          });
          handleLocalSave();
          return;
        }

        await repository.recordMarkdownApplication(command);
      } else {
        const command = {
          workflowId,
          taskId: task.id,
          actorLabel,
          occurredAt: now().toISOString(),
          evidence,
        };

        if (await shouldSaveOffline()) {
          await repository.saveOfflineAction({
            kind: "confirm_markdown_on_shelf",
            payload: command,
          });
          handleLocalSave();
          return;
        }

        await repository.confirmMarkdownOnShelf(command);
      }

      onDone();
    } catch {
      setBlockingNotice(todayCopy.markdown.missingWorkflow);
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(): Promise<void> {
    if (selectedAction === undefined || !compatible) {
      return;
    }

    const evidence = selectedAction === "complete_recheck" ? evidenceForRecheck() : undefined;

    if (selectedAction === "complete_recheck" && evidence === undefined) {
      setBlockingNotice(todayCopy.evidenceRequired);
      setConfirming(false);
      return;
    }

    setSubmitting(true);

    if (selectedAction === "request_markdown" && task.requiredResolution === "request_markdown") {
      try {
        const command = {
          lotId: task.lotId,
          sourceTaskId: task.id,
          actorLabel,
          occurredAt: now().toISOString(),
          reason: "rule_window",
        } satisfies OfflineActionCommand["payload"];

        if (await shouldSaveOffline()) {
          await repository.saveOfflineAction({ kind: "request_markdown", payload: command });
          setConfirming(false);
          handleLocalSave();
          return;
        }

        await repository.requestMarkdown(command);
        setConfirming(false);
        onDone();
      } catch {
        setBlockingNotice(todayCopy.markdown.missingWorkflow);
      } finally {
        setSubmitting(false);
      }

      return;
    }

    const command = {
      taskId: task.id,
      action: selectedAction,
      actorLabel,
      occurredAt: now().toISOString(),
      ...(selectedAction === "withdraw" || selectedAction === "record_loss"
        ? { destination: { kind: "retirada_perda" as const } }
        : {}),
      ...(evidence === undefined ? {} : { evidence }),
      ...(task.recheckParentId === undefined ? {} : { recheckParentId: task.recheckParentId }),
    } satisfies OfflineActionCommand["payload"];

    if (shouldSaveResolutionThroughSync(task) || (await shouldSaveOffline())) {
      await repository.saveOfflineAction({ kind: "resolve_task", payload: command });
      await repository.resolveTodayTask(command);
      setSubmitting(false);
      setConfirming(false);
      handleLocalSave();
      return;
    }

    await repository.resolveTodayTask(command);
    setSubmitting(false);
    setConfirming(false);

    if (createsSalesAreaRecheck(task, selectedAction)) {
      setFeedback(todayCopy.recheckFeedback);
    }

    onDone();
  }

  async function shouldSaveOffline(): Promise<boolean> {
    const status = await repository.loadOfflineCacheStatus();

    return status.state !== "offline_ready";
  }

  function handleLocalSave(): void {
    setFeedback(todayCopy.sync.localSaved);
    onLocalSave?.();
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

  function evidenceForCompletedStage(): CompletedEvidenceMetadata | undefined {
    const evidence = evidenceForRecheck();

    if (evidence === undefined || evidence.kind === "photo_pending") {
      return undefined;
    }

    return evidence;
  }

  if (confirming && selectedAction !== undefined) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ConfirmationSheet
          title={todayCopy.confirmationTitle}
          summary={confirmationSummary(task, selectedAction, evidenceForRecheck(), actorLabel)}
          confirmLabel={todayCopy.confirmLabels[selectedAction]}
          onConfirm={() => void submit()}
          onBack={() => setConfirming(false)}
        />
      </ScrollView>
    );
  }

  if (isMarkdownStageTask(task)) {
    const markdownCanSubmit = canSubmitMarkdownStage({
      task,
      decision: markdownDecision,
      rejectionReason,
      evidence: evidenceForCompletedStage(),
      submitting,
    });

    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader
          title={todayActionLabel(task)}
          body={`${task.productDisplayName} - lote ${task.lotIdentity.value}`}
        />
        <View style={styles.summary}>
          <Text style={styles.summaryLine}>
            Local atual: {formatLocation(task.currentLocation)}
          </Text>
          <Text style={styles.summaryLine}>Responsavel: {task.ownerLabel}</Text>
          <Text style={styles.summaryLine}>Etapa: {todayActionLabel(task)}</Text>
        </View>
        <EvidenceUploadList
          taskId={task.id}
          uploads={evidenceUploads}
          onRetry={onRetryEvidenceUpload}
        />

        {task.requiredResolution === "approve_markdown" ? (
          <View style={styles.group}>
            <SelectionRow
              label={todayCopy.markdown.approve}
              detail="Cria a tarefa para aplicar a etiqueta."
              selected={markdownDecision === "approved"}
              onPress={() => selectMarkdownDecision("approved")}
            />
            <SelectionRow
              label={todayCopy.markdown.reject}
              detail="Encerra esta rebaixa e volta o lote ao monitoramento."
              selected={markdownDecision === "rejected"}
              onPress={() => selectMarkdownDecision("rejected")}
            />
            {markdownDecision === "rejected" ? (
              <>
                <Field
                  label={todayCopy.markdown.rejectionReason}
                  value={rejectionReason}
                  onChangeText={(value) => {
                    setRejectionReason(value);
                    setBlockingNotice(undefined);
                  }}
                />
                <StatusNotice>{todayCopy.markdown.rejectionWarning}</StatusNotice>
              </>
            ) : null}
          </View>
        ) : (
          <EvidenceSection
            task={task}
            photoRecorded={photoRecorded}
            noPhotoReason={noPhotoReason}
            customNoPhotoReason={customNoPhotoReason}
            onSelectPhoto={selectPhotoEvidence}
            onSelectNoPhotoReason={selectNoPhotoReason}
            onUpdateCustomReason={(value) => {
              setCustomNoPhotoReason(value);
              setBlockingNotice(undefined);
            }}
          />
        )}

        {blockingNotice === undefined ? null : (
          <StatusNotice tone="error">{blockingNotice}</StatusNotice>
        )}
        <LocalSaveFeedback feedback={feedback} />

        <PrimaryAction
          label={markdownPrimaryLabel(task, markdownDecision)}
          disabled={!markdownCanSubmit}
          onPress={() => void submitMarkdownStage()}
        />
        <SecondaryAction label="Voltar e revisar" onPress={onBack} />
        {auditEvents.length === 0 ? null : <AuditTimeline events={auditEvents} />}
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
      <EvidenceUploadList
        taskId={task.id}
        uploads={evidenceUploads}
        onRetry={onRetryEvidenceUpload}
      />

      {blockingNotice === undefined ? null : (
        <StatusNotice tone="error">{blockingNotice}</StatusNotice>
      )}
      <LocalSaveFeedback feedback={feedback} />

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
      {auditEvents.length === 0 ? null : <AuditTimeline events={auditEvents} />}
    </ScrollView>
  );
}

function EvidenceUploadList({
  taskId,
  uploads,
  onRetry,
}: {
  taskId: string;
  uploads: readonly EvidenceUploadQueueRecord[];
  onRetry?: ((localEvidenceId: string) => void) | undefined;
}) {
  const taskUploads = uploads.filter((upload) => upload.taskId === taskId);

  if (taskUploads.length === 0) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>Evidências desta tarefa</Text>
      {taskUploads.map((upload) => (
        <EvidenceStatus key={upload.localEvidenceId} evidence={upload} onRetry={onRetry} />
      ))}
    </View>
  );
}

function LocalSaveFeedback({ feedback }: { feedback: string | undefined }) {
  if (feedback === undefined) {
    return null;
  }

  const local = mobileStatusDescriptorFor("local_only");
  const pending = mobileStatusDescriptorFor("pending_central");
  const isLocalSave = feedback === todayCopy.sync.localSaved;

  return (
    <>
      <StatusNotice
        tone={isLocalSave ? local.tone : "warning"}
        title={isLocalSave ? local.label : "Area ainda bloqueada"}
      >
        {feedback}
      </StatusNotice>
      {isLocalSave ? (
        <StatusNotice tone={pending.tone} title={pending.label}>
          {todayCopy.sync.pending}
        </StatusNotice>
      ) : null}
    </>
  );
}

function EvidenceSection({
  task,
  photoRecorded,
  noPhotoReason,
  customNoPhotoReason,
  onSelectPhoto,
  onSelectNoPhotoReason,
  onUpdateCustomReason,
}: {
  task: TodayTaskRecord;
  photoRecorded: boolean;
  noPhotoReason: NoPhotoReason | undefined;
  customNoPhotoReason: string;
  onSelectPhoto: () => void;
  onSelectNoPhotoReason: (reason: NoPhotoReason) => void;
  onUpdateCustomReason: (value: string) => void;
}) {
  const isApplication = task.requiredResolution === "apply_markdown";

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        {isApplication
          ? todayCopy.markdown.applicationEvidenceTitle
          : todayCopy.markdown.finalEvidenceTitle}
      </Text>
      <SelectionRow
        label={isApplication ? todayCopy.markdown.applicationPhoto : todayCopy.markdown.finalPhoto}
        selected={photoRecorded}
        onPress={onSelectPhoto}
      />
      <Text style={styles.groupTitle}>{todayCopy.markdown.noPhotoGroup}</Text>
      {noPhotoReasonKeys.map((reason) => (
        <SelectionRow
          key={reason}
          label={todayCopy.noPhotoReasons[reason]}
          selected={noPhotoReason === reason}
          onPress={() => onSelectNoPhotoReason(reason)}
        />
      ))}
      {noPhotoReason === "other" ? (
        <Field
          label={todayCopy.markdown.noPhotoCustomField}
          value={customNoPhotoReason}
          onChangeText={onUpdateCustomReason}
        />
      ) : null}
    </View>
  );
}

function actionsForTask(task: TodayTaskRecord): readonly TaskResolutionAction[] {
  if (task.requiredResolution === "sales_area_recheck") {
    return RECHECK_ACTIONS;
  }

  if (task.requiredResolution === "repack_or_loss") {
    return REPACK_OR_LOSS_ACTIONS;
  }

  return STANDARD_RESOLUTION_ACTIONS;
}

function isMarkdownStageTask(task: TodayTaskRecord): task is TodayTaskRecord & {
  requiredResolution: (typeof MARKDOWN_STAGE_RESOLUTIONS)[number];
} {
  return MARKDOWN_STAGE_RESOLUTIONS.some(
    (requiredResolution) => task.requiredResolution === requiredResolution,
  );
}

function canSubmitMarkdownStage(input: {
  task: TodayTaskRecord;
  decision: MarkdownDecision | undefined;
  rejectionReason: string;
  evidence: CompletedEvidenceMetadata | undefined;
  submitting: boolean;
}): boolean {
  if (input.submitting) {
    return false;
  }

  if (input.task.requiredResolution === "approve_markdown") {
    return (
      input.decision === "approved" ||
      (input.decision === "rejected" && input.rejectionReason.trim().length > 0)
    );
  }

  if (
    input.task.requiredResolution === "apply_markdown" ||
    input.task.requiredResolution === "confirm_markdown_on_shelf"
  ) {
    return input.evidence !== undefined;
  }

  return false;
}

function markdownPrimaryLabel(
  task: TodayTaskRecord,
  decision: MarkdownDecision | undefined,
): string {
  if (task.requiredResolution === "approve_markdown") {
    return decision === "rejected" ? todayCopy.markdown.reject : todayCopy.markdown.approve;
  }

  if (task.requiredResolution === "apply_markdown") {
    return todayCopy.markdown.application;
  }

  return todayCopy.markdown.finalConfirmation;
}

function markdownEvidenceRequiredCopy(task: TodayTaskRecord): string {
  if (task.requiredResolution === "apply_markdown") {
    return todayCopy.markdown.applicationEvidenceTitle;
  }

  return todayCopy.markdown.finalEvidenceTitle;
}

function actionNeedsConfirmation(action: TaskResolutionAction): boolean {
  return (
    action === "withdraw" ||
    action === "repack" ||
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
    (action === "withdraw" || action === "repack" || action === "record_loss")
  );
}

function shouldSaveResolutionThroughSync(task: TodayTaskRecord): boolean {
  return task.sync?.state === "synced";
}

function confirmationSummary(
  task: TodayTaskRecord,
  action: TaskResolutionAction,
  evidence: EvidencePromptMetadata | undefined,
  actorLabel: string,
): string {
  const local = mobileStatusDescriptorFor("local_only");
  const synced = mobileStatusDescriptorFor("synced_transport");
  const resolved = mobileStatusDescriptorFor("resolved_central");
  const lines = [
    `Produto: ${task.productDisplayName}`,
    `Lote: ${task.lotIdentity.value}`,
    `Local atual: ${formatLocation(task.currentLocation)}`,
    `Responsavel: ${actorLabel}`,
    `Acao: ${todayCopy.resolutionOptions[action]}`,
    evidenceSummary(action, evidence),
    consequenceSummary(task, action),
    `Se ficar local: ${local.body}`,
    `Transporte central: ${synced.label}. ${synced.body}`,
    `Resolucao terminal: ${resolved.label}. ${resolved.body}`,
  ];

  if (action === "withdraw" || action === "record_loss") {
    lines.push(todayCopy.destinationLoss);
  }

  if (action === "repack") {
    lines.push("Destino: reembalagem com nova identificacao do processado.");
  }

  return lines.join("\n");
}

function evidenceSummary(
  action: TaskResolutionAction,
  evidence: EvidencePromptMetadata | undefined,
): string {
  if (evidence?.kind === "no_photo_reason") {
    return `Evidencia sem foto: ${evidence.reason}`;
  }

  if (evidence !== undefined) {
    return `Evidencia: ${todayCopy.photoEvidence}`;
  }

  if (action === "complete_recheck") {
    return `Evidencia: ${todayCopy.evidenceRequired}`;
  }

  return "Evidencia: sem foto obrigatoria nesta acao; use motivo sem foto quando a etapa exigir.";
}

function consequenceSummary(task: TodayTaskRecord, action: TaskResolutionAction): string {
  if (createsSalesAreaRecheck(task, action)) {
    return `Consequencia: ${todayCopy.recheckConsequence}`;
  }

  if (action === "mark_not_found" || action === "mark_probably_sold_out") {
    return "Consequencia: presenca incerta continua exigindo revisao fisica.";
  }

  if (action === "complete_recheck") {
    return "Consequencia: a reconferencia fisica sera enviada antes de sair da fila ativa.";
  }

  if (action === "move_lot") {
    return "Consequencia: o local do lote muda, mas riscos ativos continuam visiveis.";
  }

  return "Consequencia: esta acao nao deve esconder risco ativo sem criterio operacional.";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  summary: {
    backgroundColor: captureColors.surfaceMuted,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
  },
  summaryLine: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  group: {
    gap: captureSpacing.small,
  },
  groupTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
});
