import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const membershipRoleEnum = pgEnum("membership_role", ["collaborator", "lead", "admin"]);

export const membershipStatusEnum = pgEnum("membership_status", ["active", "inactive"]);

export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "access.denied",
  "task.changed",
  "markdown.changed",
  "sync.changed",
  "evidence.changed",
  "shift.changed",
]);

export const auditEventStatusEnum = pgEnum("audit_event_status", [
  "received",
  "pending_ack",
  "conflict",
  "denied",
  "invalidated",
]);

export const evidenceAssetStateEnum = pgEnum("evidence_asset_state", [
  "upload_requested",
  "uploading",
  "uploaded",
  "failed",
  "invalidated",
  "expired",
]);

export const storeMemberships = pgTable(
  "store_memberships",
  {
    membershipId: text("membership_id").primaryKey(),
    subjectId: text("subject_id").notNull(),
    actorDisplayName: text("actor_display_name").notNull(),
    role: membershipRoleEnum("role").notNull(),
    storeId: text("store_id").notNull(),
    storeName: text("store_name").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("store_memberships_active_subject_store_role_uidx")
      .on(table.subjectId, table.storeId, table.role)
      .where(sql`${table.status} = 'active'`),
    index("store_memberships_subject_store_status_idx").on(
      table.subjectId,
      table.storeId,
      table.status,
    ),
    index("store_memberships_store_role_idx").on(table.storeId, table.role),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    eventId: text("event_id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    type: auditEventTypeEnum("type").notNull(),
    storeId: text("store_id").notNull(),
    storeName: text("store_name").notNull(),
    actorId: text("actor_id").notNull(),
    actorDisplayName: text("actor_display_name").notNull(),
    actorRoleSnapshot: membershipRoleEnum("actor_role_snapshot").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetLabel: text("target_label"),
    summary: text("summary").notNull(),
    reason: text("reason"),
    status: auditEventStatusEnum("status").notNull().default("received"),
    linkedEventId: text("linked_event_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    sanitized: boolean("sanitized").notNull().default(true),
  },
  (table) => [
    uniqueIndex("audit_events_idempotency_key_uidx").on(table.idempotencyKey),
    index("audit_events_store_occurred_idx").on(table.storeId, table.occurredAt),
    index("audit_events_target_occurred_idx").on(
      table.targetType,
      table.targetId,
      table.occurredAt,
    ),
    index("audit_events_actor_type_idx").on(table.actorId, table.type),
    index("audit_events_subject_store_status_idx").on(
      table.actorId,
      table.storeId,
      table.sanitized,
    ),
  ],
);

export const evidenceAssets = pgTable(
  "evidence_assets",
  {
    assetId: text("asset_id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    localEvidenceId: text("local_evidence_id").notNull(),
    storeId: text("store_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetLabel: text("target_label"),
    objectKey: text("object_key").notNull(),
    state: evidenceAssetStateEnum("state").notNull().default("upload_requested"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    authorId: text("author_id").notNull(),
    authorDisplayName: text("author_display_name").notNull(),
    authorRoleSnapshot: membershipRoleEnum("author_role_snapshot").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" }).notNull(),
    uploadRequestedAt: timestamp("upload_requested_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: "date" }),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true, mode: "date" }),
    invalidatedBy: text("invalidated_by"),
    invalidationReason: text("invalidation_reason"),
    replacementAssetId: text("replacement_asset_id"),
    retentionDays: integer("retention_days").notNull().default(90),
    retentionExpiresAt: timestamp("retention_expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    expiredAt: timestamp("expired_at", { withTimezone: true, mode: "date" }),
    lastError: text("last_error"),
  },
  (table) => [
    uniqueIndex("evidence_assets_idempotency_key_uidx").on(table.idempotencyKey),
    uniqueIndex("evidence_assets_object_key_uidx").on(table.objectKey),
    index("evidence_assets_store_target_idx").on(table.storeId, table.targetType, table.targetId),
    index("evidence_assets_store_state_idx").on(table.storeId, table.state),
    index("evidence_assets_retention_idx").on(table.state, table.retentionExpiresAt),
  ],
);

export type StoreMembershipRecord = typeof storeMemberships.$inferSelect;
export type NewStoreMembershipRecord = typeof storeMemberships.$inferInsert;
export type AuditEventRecord = typeof auditEvents.$inferSelect;
export type NewAuditEventRecord = typeof auditEvents.$inferInsert;
export type EvidenceAssetRecord = typeof evidenceAssets.$inferSelect;
export type NewEvidenceAssetRecord = typeof evidenceAssets.$inferInsert;
