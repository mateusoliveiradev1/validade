import {
  OFFLINE_CACHE_STATES,
  SYNC_COMMAND_KINDS,
  SYNC_COMMAND_STATES,
  SYNC_COMMAND_URGENCIES,
  SYNC_CONFLICT_RESOLUTION_ACTIONS,
  TODAY_ACTIONABLE_RISK_STATES,
} from "@validade-zero/domain";
import { z } from "zod";
import {
  LotIdentitySchema,
  OperationalLocationSchema,
  VisibleCentralSyncStateSchema,
} from "./capture";
import {
  MarkdownApplicationCommandSchema,
  MarkdownApprovalCommandSchema,
  MarkdownRequestCommandSchema,
  MarkdownShelfConfirmationCommandSchema,
} from "./markdown";
import {
  CentralResolvedTaskHistorySchema,
  RequiredResolutionSchema,
  TaskResolutionCommandSchema,
  TodayTaskRecordSchema,
} from "./tasks";

const RequiredTextSchema = z.string().trim().min(1).max(240);
const IdentifierSchema = z.string().trim().min(1).max(160);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

const ForbiddenSyncPayloadFields = [
  "uri",
  "base64",
  "objectKey",
  "photoUri",
  "imageBytes",
] as const;

export const OfflineCacheStatusSchema = z
  .object({
    state: z.enum(OFFLINE_CACHE_STATES),
    lastRefreshedAt: IsoDateTimeSchema.optional(),
    activeTaskCount: z.number().int().nonnegative(),
    requiredLotSnippetCount: z.number().int().nonnegative(),
    staleAfterHours: z.number().positive(),
    source: z.enum(["today_open", "manual_refresh", "lot_change", "observation_change", "startup"]),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const OfflineActionCommandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("resolve_task"),
      payload: TaskResolutionCommandSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("request_markdown"),
      payload: MarkdownRequestCommandSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("decide_markdown"),
      payload: MarkdownApprovalCommandSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("record_markdown_application"),
      payload: MarkdownApplicationCommandSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("confirm_markdown_on_shelf"),
      payload: MarkdownShelfConfirmationCommandSchema,
    })
    .strict(),
]);

export const SyncCommandRecordSchema = z
  .object({
    id: IdentifierSchema,
    idempotencyKey: IdentifierSchema,
    kind: z.enum(SYNC_COMMAND_KINDS),
    state: z.enum(SYNC_COMMAND_STATES),
    urgency: z.enum(SYNC_COMMAND_URGENCIES),
    payload: OfflineActionCommandSchema,
    taskId: IdentifierSchema,
    taskActiveKey: IdentifierSchema,
    lotId: IdentifierSchema,
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    currentLocation: OperationalLocationSchema,
    riskState: z.enum(TODAY_ACTIONABLE_RISK_STATES),
    requiredResolution: RequiredResolutionSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    savedAt: IsoDateTimeSchema,
    firstAttemptedAt: IsoDateTimeSchema.optional(),
    lastAttemptedAt: IsoDateTimeSchema.optional(),
    attemptCount: z.number().int().nonnegative(),
    nextRetryAt: IsoDateTimeSchema.optional(),
    lastError: RequiredTextSchema.optional(),
    ackedAt: IsoDateTimeSchema.optional(),
    conflictId: IdentifierSchema.optional(),
    discardedAt: IsoDateTimeSchema.optional(),
    discardReason: RequiredTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    rejectForbiddenSyncPayloadFields(value, context);

    if (value.kind !== value.payload.kind) {
      context.addIssue({
        code: "custom",
        path: ["payload", "kind"],
        message: "Sync command kind must match payload kind.",
      });
    }

    if (value.state === "sync_conflict" && value.conflictId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["conflictId"],
        message: "Conflicted commands require a conflict id.",
      });
    }

    if (value.state === "discarded" && value.discardReason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["discardReason"],
        message: "Discarded offline commands require an explicit reason.",
      });
    }
  });

export const SyncCommandSummarySchema = z
  .object({
    id: IdentifierSchema,
    kind: z.enum(SYNC_COMMAND_KINDS),
    state: z.enum(SYNC_COMMAND_STATES),
    urgency: z.enum(SYNC_COMMAND_URGENCIES),
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    currentLocation: OperationalLocationSchema,
    savedAt: IsoDateTimeSchema,
    lastError: RequiredTextSchema.optional(),
    conflictId: IdentifierSchema.optional(),
  })
  .strict();

export const SyncQueueSummarySchema = z
  .object({
    state: z.enum(["empty", "has_pending", "syncing", "has_failed", "has_conflict"]),
    totalCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
    hasCriticalConflict: z.boolean(),
    criticalCount: z.number().int().nonnegative(),
    highCount: z.number().int().nonnegative(),
    mediumCount: z.number().int().nonnegative(),
    lowCount: z.number().int().nonnegative(),
    oldestPendingCritical: SyncCommandSummarySchema.optional(),
    commands: z.array(SyncCommandSummarySchema),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const SyncConflictLocalActionSchema = z
  .object({
    commandId: IdentifierSchema,
    kind: z.enum(SYNC_COMMAND_KINDS),
    label: RequiredTextSchema,
    actorLabel: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    currentLocation: OperationalLocationSchema,
  })
  .strict();

export const SyncConflictRemoteChangeSchema = z
  .object({
    kind: z.enum([
      "task_changed",
      "lot_moved",
      "task_already_resolved",
      "markdown_stage_changed",
      "critical_command_blocked",
    ]),
    summary: RequiredTextSchema,
    changedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export const SyncConflictRecordSchema = z
  .object({
    id: IdentifierSchema,
    commandId: IdentifierSchema,
    severity: z.enum(SYNC_COMMAND_URGENCIES),
    reason: RequiredTextSchema,
    localAction: SyncConflictLocalActionSchema,
    remoteChange: SyncConflictRemoteChangeSchema,
    allowedActions: z.array(z.enum(SYNC_CONFLICT_RESOLUTION_ACTIONS)).min(1),
    createdAt: IsoDateTimeSchema,
    resolvedAt: IsoDateTimeSchema.optional(),
    resolutionAction: z.enum(SYNC_CONFLICT_RESOLUTION_ACTIONS).optional(),
    resolutionReason: RequiredTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    rejectForbiddenSyncPayloadFields(value, context);

    if (
      value.resolutionAction === "discard_offline_action" &&
      value.resolutionReason === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["resolutionReason"],
        message: "Discarding an offline conflict requires an explicit reason.",
      });
    }
  });

export const SyncTransportBatchSchema = z
  .object({
    batchId: IdentifierSchema,
    deviceId: IdentifierSchema,
    commands: z.array(SyncCommandRecordSchema).min(1),
    sentAt: IsoDateTimeSchema,
  })
  .strict();

export const CentralDiscardedSyncRecordSchema = z
  .object({
    commandId: IdentifierSchema,
    idempotencyKey: IdentifierSchema,
    taskId: IdentifierSchema,
    activeKey: IdentifierSchema,
    lotId: IdentifierSchema,
    reason: RequiredTextSchema,
    discardedAt: IsoDateTimeSchema,
    actorLabel: RequiredTextSchema,
    state: z.literal("discarded"),
  })
  .strict();

export const CentralSyncApplicationResultSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("active_task"),
      task: TodayTaskRecordSchema.refine(
        (task) => task.status === "active",
        "Central active-task results must keep an active task.",
      ),
    })
    .strict(),
  z
    .object({
      kind: z.literal("resolved_history"),
      history: CentralResolvedTaskHistorySchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("discarded"),
      record: CentralDiscardedSyncRecordSchema,
    })
    .strict(),
]);

export const SyncTransportResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("ack"),
      commandId: IdentifierSchema,
      idempotencyKey: IdentifierSchema,
      syncedAt: IsoDateTimeSchema,
      centralResult: CentralSyncApplicationResultSchema.optional(),
    })
    .strict(),
  z
    .object({
      status: z.literal("retry"),
      commandId: IdentifierSchema,
      idempotencyKey: IdentifierSchema,
      retryAfterSeconds: z.number().int().positive().optional(),
      error: RequiredTextSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("conflict"),
      commandId: IdentifierSchema,
      idempotencyKey: IdentifierSchema,
      conflict: SyncConflictRecordSchema,
    })
    .strict(),
]);

export const CentralAcknowledgementSchema = z
  .object({
    commandId: IdentifierSchema,
    idempotencyKey: IdentifierSchema,
    acceptedAt: IsoDateTimeSchema,
    state: VisibleCentralSyncStateSchema.exclude(["local"]),
    centralVersion: z.number().int().positive(),
    resolvedTaskId: IdentifierSchema.optional(),
    conflictId: IdentifierSchema.optional(),
    centralResult: CentralSyncApplicationResultSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.state === "conflict" && value.conflictId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["conflictId"],
        message: "Conflicted central acknowledgements require a conflict id.",
      });
    }

    if (value.state === "resolved" && value.resolvedTaskId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["resolvedTaskId"],
        message: "Resolved central acknowledgements require the resolved task id.",
      });
    }
  });

export type OfflineCacheStatus = z.infer<typeof OfflineCacheStatusSchema>;
export type OfflineActionCommand = z.infer<typeof OfflineActionCommandSchema>;
export type SyncCommandRecord = z.infer<typeof SyncCommandRecordSchema>;
export type SyncCommandSummary = z.infer<typeof SyncCommandSummarySchema>;
export type SyncQueueSummary = z.infer<typeof SyncQueueSummarySchema>;
export type SyncConflictRecord = z.infer<typeof SyncConflictRecordSchema>;
export type SyncTransportBatch = z.infer<typeof SyncTransportBatchSchema>;
export type SyncTransportResult = z.infer<typeof SyncTransportResultSchema>;
export type CentralAcknowledgement = z.infer<typeof CentralAcknowledgementSchema>;
export type CentralDiscardedSyncRecord = z.infer<typeof CentralDiscardedSyncRecordSchema>;
export type CentralSyncApplicationResult = z.infer<typeof CentralSyncApplicationResultSchema>;

function rejectForbiddenSyncPayloadFields(
  value: unknown,
  context: z.RefinementCtx,
  path: (string | number)[] = [],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      rejectForbiddenSyncPayloadFields(item, context, [...path, index]),
    );
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];

    if (ForbiddenSyncPayloadFields.includes(key as (typeof ForbiddenSyncPayloadFields)[number])) {
      context.addIssue({
        code: "custom",
        path: nextPath,
        message: `Sync payloads must not carry raw evidence/storage field '${key}'.`,
      });
    }

    rejectForbiddenSyncPayloadFields(nestedValue, context, nextPath);
  }
}
