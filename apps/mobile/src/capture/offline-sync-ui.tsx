import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  OfflineCacheStatus,
  SyncCommandSummary,
  SyncConflictRecord,
  SyncQueueSummary as SyncQueueSummaryRecord,
} from "@validade-zero/contracts";
import { formatLocation } from "./capture-copy";
import {
  DestructiveAction,
  Field,
  PrimaryAction,
  SecondaryAction,
  SelectionRow,
  StatusNotice,
} from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import { mobileStatusDescriptorFor } from "./mobile-status";
import { formatAlertTime, todayCopy } from "./today-copy";

export function OfflineStatusBand({
  status,
  queue,
  onRetry,
  disabled = false,
  hideWhenReady = false,
  showRetryAction = true,
}: {
  status: OfflineCacheStatus | undefined;
  queue: SyncQueueSummaryRecord | undefined;
  onRetry?: (() => void) | undefined;
  disabled?: boolean;
  hideWhenReady?: boolean;
  showRetryAction?: boolean | undefined;
}) {
  if (status === undefined) {
    return null;
  }

  const hasPending = queue !== undefined && queue.totalCount > 0;
  if (hideWhenReady && status.state === "offline_ready" && !hasPending) {
    return null;
  }

  const tone =
    status.state === "offline_unavailable"
      ? "critical"
      : status.state === "offline_stale"
        ? "warning"
        : "info";
  const title = offlineTitle(status);
  const body = offlineBody(status);
  return (
    <View
      style={[
        styles.band,
        tone === "warning" ? styles.bandWarning : undefined,
        tone === "critical" ? styles.bandCritical : undefined,
      ]}
    >
      <Text style={styles.bandTitle}>{title}</Text>
      <Text style={styles.bandBody}>{body}</Text>
      {hasPending ? (
        <Text style={styles.bandMeta}>
          {queue.totalCount} pendencia(s), {queue.conflictCount} conflito(s).
        </Text>
      ) : (
        <Text style={styles.bandMeta}>{todayCopy.sync.allSynced}</Text>
      )}
      {hasPending && showRetryAction && onRetry !== undefined ? (
        <SecondaryAction
          disabled={disabled || queue?.state === "syncing"}
          label={queue?.state === "syncing" ? todayCopy.sync.syncing : todayCopy.sync.primary}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

export function OfflineCacheNotice({ status }: { status: OfflineCacheStatus | undefined }) {
  if (status === undefined || status.state !== "offline_unavailable") {
    return null;
  }

  return (
    <StatusNotice tone="error">
      {todayCopy.sync.unavailable}. {todayCopy.sync.unavailableBody}
    </StatusNotice>
  );
}

export function PendingSyncNotice() {
  const local = mobileStatusDescriptorFor("local_only");

  return (
    <StatusNotice tone={local.tone} title={local.label}>
      {todayCopy.sync.localSaved}
    </StatusNotice>
  );
}

export function SyncRetryNotice() {
  return (
    <StatusNotice tone="error">
      {todayCopy.sync.failed} {todayCopy.sync.retryHelper}
    </StatusNotice>
  );
}

export function SyncQueueSummary({
  queue,
  onRetry,
  onReviewConflict,
  disabled = false,
  hideWhenEmpty = false,
  showRetryAction = true,
  title,
}: {
  queue: SyncQueueSummaryRecord | undefined;
  onRetry?: (() => void) | undefined;
  onReviewConflict: (conflictId: string) => void;
  disabled?: boolean;
  hideWhenEmpty?: boolean;
  showRetryAction?: boolean | undefined;
  title?: string | undefined;
}) {
  if (queue === undefined) {
    return null;
  }

  if (hideWhenEmpty && queue.totalCount === 0) {
    return null;
  }

  const conflicts = queue.commands.filter((command) => command.state === "sync_conflict");
  const pending = queue.commands.filter((command) => command.state !== "sync_conflict");
  const pendingCentralLotCount = Math.max(0, queue.totalCount - queue.commands.length);

  return (
    <View style={styles.queue}>
      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>
          {title ?? (queue.totalCount === 0 ? todayCopy.sync.allSynced : todayCopy.sync.primary)}
        </Text>
        <Text style={styles.queueMeta}>
          {queue.criticalCount} criticas, {queue.highCount} altas, {queue.mediumCount} medias
        </Text>
      </View>
      {queue.totalCount === 0 ? (
        <Text style={styles.queueBody}>{todayCopy.sync.allSyncedBody}</Text>
      ) : (
        <>
          {conflicts.length > 0 ? (
            <StatusNotice tone="critical" title={mobileStatusDescriptorFor("conflict").label}>
              {todayCopy.sync.conflict}
            </StatusNotice>
          ) : null}
          {pendingCentralLotCount > 0 ? (
            <StatusNotice tone="warning" title="Lote salvo aguardando a central">
              {pendingCentralLotCount === 1
                ? "1 lote salvo neste aparelho ainda depende de validacao do produto, leitura central ou conexao estavel."
                : `${pendingCentralLotCount} lotes salvos neste aparelho ainda dependem de validacao do produto, leitura central ou conexao estavel.`}
            </StatusNotice>
          ) : null}
          {[...conflicts, ...pending].map((command) => (
            <CommandSyncStatusRow
              key={command.id}
              command={command}
              onReviewConflict={onReviewConflict}
            />
          ))}
          {showRetryAction && onRetry !== undefined ? (
            <PrimaryAction
              disabled={disabled || queue.state === "syncing"}
              label={queue.state === "syncing" ? todayCopy.sync.syncing : todayCopy.sync.retry}
              onPress={onRetry}
            />
          ) : null}
          {queue.state === "has_failed" ? <SyncRetryNotice /> : null}
        </>
      )}
    </View>
  );
}

export function CommandSyncStatusRow({
  command,
  onReviewConflict,
}: {
  command: SyncCommandSummary;
  onReviewConflict: (conflictId: string) => void;
}) {
  const isConflict = command.state === "sync_conflict";
  const isWarning =
    command.state === "pending_sync" ||
    command.state === "sync_failed" ||
    command.state === "syncing";

  return (
    <View
      style={[
        styles.commandRow,
        isWarning ? styles.commandRowWarning : undefined,
        isConflict ? styles.commandRowConflict : undefined,
      ]}
    >
      <Text style={styles.commandState}>{syncCommandLabel(command)}</Text>
      <Text style={styles.commandTitle}>
        {command.productDisplayName} - lote {command.lotIdentity.value}
      </Text>
      <Text style={styles.commandMeta}>Local: {formatLocation(command.currentLocation)}</Text>
      {command.lastError === undefined ? null : (
        <Text style={styles.commandMeta}>{command.lastError}</Text>
      )}
      <ConflictReviewAction command={command} isConflict={isConflict} onReview={onReviewConflict} />
    </View>
  );
}

function ConflictReviewAction({
  command,
  isConflict,
  onReview,
}: {
  command: SyncCommandSummary;
  isConflict: boolean;
  onReview: (conflictId: string) => void;
}) {
  const conflictId = command.conflictId;

  if (!isConflict || conflictId === undefined) {
    return null;
  }

  return (
    <SecondaryAction label={todayCopy.sync.reviewConflict} onPress={() => onReview(conflictId)} />
  );
}

export function SyncConflictPanel({
  conflict,
  onResolve,
  onClose,
}: {
  conflict: SyncConflictRecord;
  onResolve: (input: {
    action: SyncConflictRecord["allowedActions"][number];
    reason?: string | undefined;
  }) => void;
  onClose: () => void;
}) {
  const [discardReason, setDiscardReason] = useState("");
  const canDiscard = discardReason.trim().length > 0;

  return (
    <View style={styles.conflictPanel}>
      <Text style={styles.conflictTitle}>{todayCopy.sync.conflict}</Text>
      <Text style={styles.conflictBody}>{conflict.reason}</Text>
      <SelectionRow
        label={conflict.localAction.label}
        detail={`${conflict.localAction.productDisplayName} - lote ${conflict.localAction.lotIdentity.value}`}
        selected
        onPress={() => undefined}
      />
      <Text style={styles.conflictBody}>
        Local: {formatLocation(conflict.localAction.currentLocation)}
      </Text>
      <Text style={styles.conflictBody}>
        Acao local as {formatAlertTime(conflict.localAction.occurredAt)} por{" "}
        {conflict.localAction.actorLabel}
      </Text>
      <Text style={styles.conflictBody}>{remoteChangeCopy(conflict)}</Text>
      {conflict.allowedActions.includes("keep_local_and_retry") ? (
        <SecondaryAction
          label={todayCopy.sync.keepLocal}
          onPress={() => onResolve({ action: "keep_local_and_retry" })}
        />
      ) : null}
      {conflict.allowedActions.includes("use_current_task") ? (
        <SecondaryAction
          label={todayCopy.sync.useCurrent}
          onPress={() => onResolve({ action: "use_current_task" })}
        />
      ) : null}
      {conflict.allowedActions.includes("discard_offline_action") ? (
        <View style={styles.discardGroup}>
          <StatusNotice tone="critical" title={todayCopy.sync.discardOffline}>
            {todayCopy.sync.discardConfirmation}
          </StatusNotice>
          <Field
            label={todayCopy.sync.discardReason}
            value={discardReason}
            onChangeText={setDiscardReason}
          />
          <DestructiveAction
            disabled={!canDiscard}
            label={todayCopy.sync.discardOffline}
            onPress={() =>
              onResolve({
                action: "discard_offline_action",
                reason: discardReason.trim(),
              })
            }
          />
        </View>
      ) : null}
      <SecondaryAction label="Voltar e revisar" onPress={onClose} />
    </View>
  );
}

function offlineTitle(status: OfflineCacheStatus): string {
  if (status.state === "offline_unavailable") {
    return todayCopy.sync.unavailable;
  }

  if (status.state === "offline_mode") {
    return todayCopy.sync.offlineMode;
  }

  if (status.state === "offline_stale") {
    return todayCopy.sync.stale;
  }

  return todayCopy.sync.offlineReady;
}

function offlineBody(status: OfflineCacheStatus): string {
  const refreshed =
    status.lastRefreshedAt === undefined
      ? "Ainda sem atualizacao salva."
      : `Atualizado as ${formatAlertTime(status.lastRefreshedAt)}.`;

  return `${refreshed} ${status.activeTaskCount} tarefa(s) e ${status.requiredLotSnippetCount} lote(s) essenciais neste aparelho.`;
}

function syncCommandLabel(command: SyncCommandSummary): string {
  if (command.state === "sync_conflict") {
    return todayCopy.sync.conflict;
  }

  if (command.state === "sync_failed") {
    return todayCopy.sync.failed;
  }

  if (command.state === "syncing") {
    return todayCopy.sync.syncing;
  }

  return todayCopy.sync.pending;
}

function remoteChangeCopy(conflict: SyncConflictRecord): string {
  return `${conflict.remoteChange.summary}${
    conflict.remoteChange.changedAt === undefined
      ? ""
      : ` Alterado as ${formatAlertTime(conflict.remoteChange.changedAt)}.`
  }`;
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.medium,
  },
  bandWarning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  bandCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  bandTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  bandBody: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  bandMeta: {
    color: captureColors.ink,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  queue: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.medium,
  },
  queueHeader: {
    gap: captureSpacing.xsmall,
  },
  queueTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  queueMeta: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  queueBody: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  commandRow: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    minHeight: 48,
    padding: captureSpacing.medium,
  },
  commandRowConflict: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  commandRowWarning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  commandState: {
    color: captureColors.warningInk,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  commandTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  commandMeta: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  conflictPanel: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  conflictTitle: {
    color: captureColors.critical,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  conflictBody: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  discardGroup: {
    gap: captureSpacing.medium,
  },
});
