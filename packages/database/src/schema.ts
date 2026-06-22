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
  "membership.changed",
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

export const shiftCloseVerdictEnum = pgEnum("shift_close_verdict", ["safe", "unsafe"]);

export const shiftCloseEligibilityEnum = pgEnum("shift_close_eligibility", [
  "eligible_safe",
  "must_close_unsafe",
  "cannot_evaluate",
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
    version: integer("version").notNull().default(1),
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

export const membershipMutations = pgTable(
  "membership_mutations",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    membershipId: text("membership_id").notNull(),
    storeId: text("store_id").notNull(),
    operation: text("operation").notNull(),
    response: jsonb("response").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("membership_mutations_store_occurred_idx").on(table.storeId, table.occurredAt),
    index("membership_mutations_membership_idx").on(table.membershipId),
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

export const shiftClosures = pgTable(
  "shift_closures",
  {
    closureId: text("closure_id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    storeId: text("store_id").notNull(),
    storeName: text("store_name").notNull(),
    verdict: shiftCloseVerdictEnum("verdict").notNull(),
    eligibility: shiftCloseEligibilityEnum("eligibility").notNull(),
    blockers: jsonb("blockers").$type<readonly Record<string, unknown>[]>().notNull().default([]),
    checklist: jsonb("checklist").$type<readonly string[]>().notNull().default([]),
    actorId: text("actor_id").notNull(),
    actorDisplayName: text("actor_display_name").notNull(),
    actorRoleSnapshot: membershipRoleEnum("actor_role_snapshot").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    ruleVersion: text("rule_version").notNull(),
    reason: text("reason"),
    continuityOwner: text("continuity_owner"),
    continuityDeadline: timestamp("continuity_deadline", { withTimezone: true, mode: "date" }),
    note: text("note"),
    revisionOfClosureId: text("revision_of_closure_id"),
    reopenReason: text("reopen_reason"),
    reopenSummary: text("reopen_summary"),
  },
  (table) => [
    uniqueIndex("shift_closures_idempotency_key_uidx").on(table.idempotencyKey),
    index("shift_closures_store_occurred_idx").on(table.storeId, table.occurredAt),
    index("shift_closures_store_verdict_idx").on(table.storeId, table.verdict),
    index("shift_closures_revision_idx").on(table.revisionOfClosureId),
  ],
);

export const shiftHandoffs = pgTable(
  "shift_handoffs",
  {
    handoffId: text("handoff_id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    closureId: text("closure_id").notNull(),
    storeId: text("store_id").notNull(),
    acknowledgedBy: text("acknowledged_by").notNull(),
    acknowledgedDisplayName: text("acknowledged_display_name").notNull(),
    acknowledgedRoleSnapshot: membershipRoleEnum("acknowledged_role_snapshot").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: "date" }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("shift_handoffs_idempotency_key_uidx").on(table.idempotencyKey),
    index("shift_handoffs_closure_idx").on(table.closureId),
    index("shift_handoffs_store_acknowledged_idx").on(table.storeId, table.acknowledgedAt),
  ],
);

export type StoreMembershipRecord = typeof storeMemberships.$inferSelect;
export type NewStoreMembershipRecord = typeof storeMemberships.$inferInsert;
export type MembershipMutationRecord = typeof membershipMutations.$inferSelect;
export type NewMembershipMutationRecord = typeof membershipMutations.$inferInsert;
export type AuditEventRecord = typeof auditEvents.$inferSelect;
export type NewAuditEventRecord = typeof auditEvents.$inferInsert;
export type EvidenceAssetRecord = typeof evidenceAssets.$inferSelect;
export type NewEvidenceAssetRecord = typeof evidenceAssets.$inferInsert;
export type ShiftClosureRecord = typeof shiftClosures.$inferSelect;
export type NewShiftClosureRecord = typeof shiftClosures.$inferInsert;
export type ShiftHandoffRecord = typeof shiftHandoffs.$inferSelect;
export type NewShiftHandoffRecord = typeof shiftHandoffs.$inferInsert;
