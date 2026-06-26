import { z } from "zod";

const IdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(240);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const CommandCenterVerdictSchema = z
  .object({
    state: z.enum(["safe", "blocked", "needs_review"]),
    title: RequiredTextSchema,
    detail: RequiredTextSchema,
  })
  .strict();

export const CommandCenterCriticalLotCauseSchema = z
  .object({
    code: z.enum([
      "formal_expiry_passed",
      "quality_window_expired",
      "sync_conflict",
      "sync_retry",
      "critical_unresolved",
    ]),
    label: RequiredTextSchema,
    detail: RequiredTextSchema,
    actionLabel: RequiredTextSchema,
    riskState: z.enum(["expired", "critical"]).optional(),
    requiredResolution: RequiredTextSchema.optional(),
    responsibleLabel: RequiredTextSchema.optional(),
    sourceEventId: IdentifierSchema.optional(),
    sourceEventSummary: RequiredTextSchema.optional(),
    firstDetectedAt: IsoDateTimeSchema.optional(),
    lastObservedAt: IsoDateTimeSchema.optional(),
    lastAttemptedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export const CommandCenterCriticalLotSchema = z
  .object({
    lotId: IdentifierSchema,
    label: RequiredTextSchema,
    locationLabel: RequiredTextSchema,
    reason: RequiredTextSchema,
    cause: CommandCenterCriticalLotCauseSchema,
  })
  .strict();

export const CommandCenterTaskSchema = z
  .object({
    taskId: IdentifierSchema,
    label: RequiredTextSchema,
    ownerLabel: RequiredTextSchema,
    dueLabel: RequiredTextSchema,
  })
  .strict();

export const CommandCenterMarkdownSchema = z
  .object({
    markdownId: IdentifierSchema,
    label: RequiredTextSchema,
    stage: RequiredTextSchema,
  })
  .strict();

export const CommandCenterEvidenceSchema = z
  .object({
    assetId: IdentifierSchema,
    label: RequiredTextSchema,
    state: z.enum(["upload_requested", "uploading", "failed"]),
    detail: RequiredTextSchema,
  })
  .strict();

export const CommandCenterSyncConflictSchema = z
  .object({
    conflictId: IdentifierSchema,
    label: RequiredTextSchema,
    detail: RequiredTextSchema,
  })
  .strict();

export const CommandCenterPendingShiftSchema = z
  .object({
    closureId: IdentifierSchema,
    label: RequiredTextSchema,
    blockerCount: z.number().int().nonnegative(),
  })
  .strict();

export const CommandCenterShiftHistorySchema = z
  .object({
    closureId: IdentifierSchema,
    label: RequiredTextSchema,
    verdict: z.enum(["safe", "unsafe"]),
    occurredAt: IsoDateTimeSchema,
  })
  .strict();

export const CommandCenterProjectionSchema = z
  .object({
    storeId: IdentifierSchema,
    storeName: RequiredTextSchema,
    refreshedAt: IsoDateTimeSchema,
    freshness: z.enum(["current", "stale"]),
    verdict: CommandCenterVerdictSchema,
    criticalLots: z.array(CommandCenterCriticalLotSchema),
    overdueTasks: z.array(CommandCenterTaskSchema),
    pendingMarkdowns: z.array(CommandCenterMarkdownSchema),
    pendingEvidence: z.array(CommandCenterEvidenceSchema),
    syncConflicts: z.array(CommandCenterSyncConflictSchema),
    pendingShiftCloses: z.array(CommandCenterPendingShiftSchema),
    shiftHistory: z.array(CommandCenterShiftHistorySchema),
  })
  .strict();

export type CommandCenterProjection = z.infer<typeof CommandCenterProjectionSchema>;
