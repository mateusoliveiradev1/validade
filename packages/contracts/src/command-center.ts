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

export const CommandCenterProductDraftSchema = z
  .object({
    draftId: IdentifierSchema,
    label: RequiredTextSchema,
    reviewStatus: z.enum(["pending_review", "rejected", "discarded"]),
    detail: RequiredTextSchema,
    similarCount: z.number().int().nonnegative(),
    requestedByLabel: RequiredTextSchema,
    createdAt: IsoDateTimeSchema,
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

export const CommandCenterDiscardedActionSchema = z
  .object({
    commandId: IdentifierSchema,
    label: RequiredTextSchema,
    reason: RequiredTextSchema,
    discardedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export const CommandCenterResolvedHistorySchema = z
  .object({
    taskId: IdentifierSchema,
    label: RequiredTextSchema,
    actionLabel: RequiredTextSchema,
    actorLabel: RequiredTextSchema,
    resolvedAt: IsoDateTimeSchema,
    detail: RequiredTextSchema,
  })
  .strict();

export const CommandCenterCentralSnapshotSchema = z
  .object({
    source: z.enum(["central", "local_cache", "pending_central"]),
    readiness: z.enum(["needs_review", "cache_ready", "prepared", "blocked"]),
    cacheState: z.enum(["needs_first_central_read", "ready", "stale", "unavailable"]),
    productCount: z.number().int().nonnegative(),
    draftProductCount: z.number().int().nonnegative(),
    lotCount: z.number().int().nonnegative(),
    activeTaskCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
    discardedActionCount: z.number().int().nonnegative(),
    resolvedHistoryCount: z.number().int().nonnegative(),
    pendingCommandCount: z.number().int().nonnegative(),
    lastCentralReadAt: IsoDateTimeSchema.optional(),
    lastHydratedAt: IsoDateTimeSchema.optional(),
    blockers: z.array(RequiredTextSchema),
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
    centralSnapshot: CommandCenterCentralSnapshotSchema,
    criticalLots: z.array(CommandCenterCriticalLotSchema),
    overdueTasks: z.array(CommandCenterTaskSchema),
    pendingMarkdowns: z.array(CommandCenterMarkdownSchema),
    pendingProductDrafts: z.array(CommandCenterProductDraftSchema),
    pendingEvidence: z.array(CommandCenterEvidenceSchema),
    syncConflicts: z.array(CommandCenterSyncConflictSchema),
    discardedActions: z.array(CommandCenterDiscardedActionSchema),
    resolvedHistory: z.array(CommandCenterResolvedHistorySchema),
    pendingShiftCloses: z.array(CommandCenterPendingShiftSchema),
    shiftHistory: z.array(CommandCenterShiftHistorySchema),
  })
  .strict();

export type CommandCenterProjection = z.infer<typeof CommandCenterProjectionSchema>;
