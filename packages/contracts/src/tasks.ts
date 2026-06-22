import {
  REQUIRED_RESOLUTIONS,
  TASK_RESOLUTION_ACTIONS,
  TODAY_ACTIONABLE_RISK_STATES,
  TODAY_DUE_BUCKETS,
  TODAY_TASK_SECTIONS,
  TODAY_TASK_SEVERITIES,
  RISK_REASON_CODES,
  MARKDOWN_WORKFLOW_STATUSES,
  SYNC_COMMAND_STATES,
  type RequiredResolution,
} from "@validade-zero/domain";
import { z } from "zod";
import { LotIdentitySchema, OperationalLocationSchema } from "./capture";

const RequiredTextSchema = z.string().trim().min(1).max(240);
const IdentifierSchema = z.string().trim().min(1).max(160);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const TodayTaskStatusSchema = z.enum(["active", "resolved", "blocked"]);

export const TodayTaskSeveritySchema = z.enum(TODAY_TASK_SEVERITIES);

export const TodayTaskSectionSchema = z.enum(TODAY_TASK_SECTIONS);

export const TodayDueBucketSchema = z.enum(TODAY_DUE_BUCKETS);

export const RequiredResolutionSchema = z.enum(REQUIRED_RESOLUTIONS);

export const TaskResolutionActionSchema = z.enum(TASK_RESOLUTION_ACTIONS);

export const MarkdownTaskStageSchema = z
  .enum(MARKDOWN_WORKFLOW_STATUSES)
  .exclude(["rejected", "shelf_confirmed"]);

export const SourceRiskReasonSchema = z
  .object({
    code: z.enum(RISK_REASON_CODES),
    field: RequiredTextSchema.optional(),
  })
  .strict();

export const SourceRiskSchema = z
  .object({
    state: z.enum(TODAY_ACTIONABLE_RISK_STATES),
    reasons: z.array(SourceRiskReasonSchema).min(1),
  })
  .strict();

export const EvidencePromptMetadataSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("photo_pending") }).strict(),
  z.object({ kind: z.literal("photo_recorded_placeholder") }).strict(),
  z
    .object({
      kind: z.literal("no_photo_reason"),
      reason: RequiredTextSchema,
    })
    .strict(),
]);

export const ResolutionQuantitySchema = z.discriminatedUnion("quantityState", [
  z
    .object({
      quantityState: z.literal("estimated"),
      approximateQuantity: z.number().nonnegative(),
    })
    .strict(),
  z.object({ quantityState: z.literal("not_estimable") }).strict(),
]);

export const TaskRefreshMetadataSchema = z
  .object({
    refreshedAt: IsoDateTimeSchema,
    activeTaskCount: z.number().int().nonnegative(),
    futureAttentionCount: z.number().int().nonnegative(),
    source: z.enum(["today_open", "manual_refresh", "lot_change", "observation_change"]),
  })
  .strict();

export const TodayTaskSyncMetadataSchema = z
  .object({
    state: z.enum(SYNC_COMMAND_STATES),
    savedAt: IsoDateTimeSchema,
    pendingCommandId: IdentifierSchema.optional(),
    conflictId: IdentifierSchema.optional(),
    lastSyncedAt: IsoDateTimeSchema.optional(),
    lastError: RequiredTextSchema.optional(),
    attemptCount: z.number().int().nonnegative().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["command_saved_local", "pending_sync", "syncing", "sync_failed", "sync_conflict"].includes(
        value.state,
      ) &&
      value.pendingCommandId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["pendingCommandId"],
        message: "Pending sync metadata requires the command id saved on this device.",
      });
    }

    if (value.state === "sync_conflict" && value.conflictId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["conflictId"],
        message: "Conflict sync metadata requires a conflict id.",
      });
    }

    if (value.state === "synced" && value.lastSyncedAt === undefined) {
      context.addIssue({
        code: "custom",
        path: ["lastSyncedAt"],
        message: "Synced task metadata requires the sync acknowledgement time.",
      });
    }
  });

export const TodayTaskRecordSchema = z
  .object({
    id: IdentifierSchema,
    activeKey: IdentifierSchema,
    lotId: IdentifierSchema,
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    currentLocation: OperationalLocationSchema,
    riskState: z.enum(TODAY_ACTIONABLE_RISK_STATES),
    severity: TodayTaskSeveritySchema,
    dueBucket: TodayDueBucketSchema,
    requiredResolution: RequiredResolutionSchema,
    section: TodayTaskSectionSchema.exclude(["future_attention"]),
    ownerLabel: RequiredTextSchema,
    status: TodayTaskStatusSchema,
    sourceRisk: SourceRiskSchema,
    priority: z.number().int().nonnegative(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    resolvedAt: IsoDateTimeSchema.optional(),
    recheckParentId: IdentifierSchema.optional(),
    markdownWorkflowId: IdentifierSchema.optional(),
    markdownStage: MarkdownTaskStageSchema.optional(),
    responsibleActorLabel: RequiredTextSchema.optional(),
    sync: TodayTaskSyncMetadataSchema.optional(),
    resolutionHistory: z
      .array(
        z
          .object({
            action: TaskResolutionActionSchema,
            actorLabel: RequiredTextSchema,
            occurredAt: IsoDateTimeSchema,
            evidence: EvidencePromptMetadataSchema.optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.section === "withdraw_now" && value.requiredResolution !== "withdraw_or_loss") {
      context.addIssue({
        code: "custom",
        path: ["requiredResolution"],
        message: "Withdraw-now tasks must require withdrawal or loss.",
      });
    }
  });

export const FutureAttentionRecordSchema = z
  .object({
    id: IdentifierSchema,
    lotId: IdentifierSchema,
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    currentLocation: OperationalLocationSchema,
    riskState: z.literal("radar"),
    section: z.literal("future_attention"),
    sourceRiskReasons: z.array(SourceRiskReasonSchema).min(1),
    observedAt: IsoDateTimeSchema,
  })
  .strict();

export const TaskResolutionCommandSchema = z
  .object({
    taskId: IdentifierSchema,
    action: TaskResolutionActionSchema,
    actorLabel: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    destination: OperationalLocationSchema.optional(),
    quantity: ResolutionQuantitySchema.optional(),
    evidence: EvidencePromptMetadataSchema.optional(),
    recheckParentId: IdentifierSchema.optional(),
  })
  .strict();

export function parseRequiredResolution(value: RequiredResolution): RequiredResolution {
  return RequiredResolutionSchema.parse(value);
}

export type TodayTaskStatus = z.infer<typeof TodayTaskStatusSchema>;
export type TodayTaskRecord = z.infer<typeof TodayTaskRecordSchema>;
export type FutureAttentionRecord = z.infer<typeof FutureAttentionRecordSchema>;
export type TaskRefreshMetadata = z.infer<typeof TaskRefreshMetadataSchema>;
export type TodayTaskSyncMetadata = z.infer<typeof TodayTaskSyncMetadataSchema>;
export type TaskResolutionCommand = z.infer<typeof TaskResolutionCommandSchema>;
export type EvidencePromptMetadata = z.infer<typeof EvidencePromptMetadataSchema>;
