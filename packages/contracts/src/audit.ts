import { AUTHORIZATION_ROLES } from "@validade-zero/domain";
import { z } from "zod";

const RequiredIdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(280);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

const ForbiddenAuditMetadataKeys = [
  "authorization",
  "headers",
  "jwt",
  "objectKey",
  "payload",
  "rawPayload",
  "request",
  "signedUrl",
  "token",
  "url",
  "uri",
  "base64",
  "imageBytes",
  "photoUri",
] as const;

const AuditMetadataPrimitiveSchema = z.union([
  z.string().trim().min(1).max(240),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const AuditEventTypeSchema = z.enum([
  "access.denied",
  "task.changed",
  "markdown.changed",
  "sync.changed",
  "evidence.changed",
  "shift.changed",
]);

export const AuditEventStatusSchema = z.enum([
  "received",
  "pending_ack",
  "conflict",
  "denied",
  "invalidated",
]);

export const AuditTargetTypeSchema = z.enum([
  "task",
  "lot",
  "evidence",
  "shift",
  "markdown",
  "sync_command",
  "access_request",
]);

export const AuditStoreScopeSchema = z
  .object({
    storeId: RequiredIdentifierSchema,
    storeName: RequiredTextSchema,
  })
  .strict();

export const AuditActorSnapshotSchema = z
  .object({
    actorId: RequiredIdentifierSchema,
    displayName: RequiredTextSchema,
    roleSnapshot: z.enum(AUTHORIZATION_ROLES),
  })
  .strict();

export const AuditTargetSchema = z
  .object({
    type: AuditTargetTypeSchema,
    id: RequiredIdentifierSchema,
    label: RequiredTextSchema.optional(),
  })
  .strict();

export const AuditMetadataSchema = z
  .record(z.string().trim().min(1).max(64), AuditMetadataPrimitiveSchema)
  .superRefine((metadata, context) => {
    for (const key of Object.keys(metadata)) {
      const normalizedKey = key.trim().toLocaleLowerCase("en-US");

      if (
        ForbiddenAuditMetadataKeys.some(
          (forbidden) => normalizedKey === forbidden.toLocaleLowerCase("en-US"),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Audit metadata must only expose allowlisted operational fields.",
        });
      }
    }
  });

export const AuditEventRecordSchema = z
  .object({
    eventId: RequiredIdentifierSchema,
    idempotencyKey: RequiredIdentifierSchema,
    type: AuditEventTypeSchema,
    store: AuditStoreScopeSchema,
    actor: AuditActorSnapshotSchema,
    target: AuditTargetSchema,
    occurredAt: IsoDateTimeSchema,
    receivedAt: IsoDateTimeSchema,
    summary: RequiredTextSchema,
    reason: RequiredTextSchema.optional(),
    status: AuditEventStatusSchema.default("received"),
    linkedEventId: RequiredIdentifierSchema.optional(),
    metadata: AuditMetadataSchema.default({}),
  })
  .strict();

export const AuditTimelineItemSchema = AuditEventRecordSchema.omit({
  idempotencyKey: true,
}).strict();

export const AuditQuerySchema = z
  .object({
    storeId: RequiredIdentifierSchema,
    from: IsoDateTimeSchema.optional(),
    to: IsoDateTimeSchema.optional(),
    actorId: RequiredIdentifierSchema.optional(),
    type: AuditEventTypeSchema.optional(),
    targetType: AuditTargetTypeSchema.optional(),
    targetId: RequiredIdentifierSchema.optional(),
    cursor: RequiredIdentifierSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict()
  .superRefine((query, context) => {
    if (query.targetId !== undefined && query.targetType === undefined) {
      context.addIssue({
        code: "custom",
        path: ["targetType"],
        message: "Target id filters must include a target type.",
      });
    }

    if (
      query.from !== undefined &&
      query.to !== undefined &&
      Date.parse(query.from) > Date.parse(query.to)
    ) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "Audit start time must be before the end time.",
      });
    }
  });

export const AuditCursorPageSchema = z
  .object({
    items: z.array(AuditTimelineItemSchema),
    nextCursor: RequiredIdentifierSchema.optional(),
  })
  .strict();

export const AuditContract = {
  event: AuditEventRecordSchema,
  timelineItem: AuditTimelineItemSchema,
  target: AuditTargetSchema,
  query: AuditQuerySchema,
  cursorPage: AuditCursorPageSchema,
} as const;

export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;
export type AuditEventStatus = z.infer<typeof AuditEventStatusSchema>;
export type AuditTargetType = z.infer<typeof AuditTargetTypeSchema>;
export type AuditStoreScope = z.infer<typeof AuditStoreScopeSchema>;
export type AuditActorSnapshot = z.infer<typeof AuditActorSnapshotSchema>;
export type AuditTarget = z.infer<typeof AuditTargetSchema>;
export type AuditMetadata = z.infer<typeof AuditMetadataSchema>;
export type AuditEventRecord = z.infer<typeof AuditEventRecordSchema>;
export type AuditTimelineItem = z.infer<typeof AuditTimelineItemSchema>;
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
export type AuditCursorPage = z.infer<typeof AuditCursorPageSchema>;
