import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const membershipRoleEnum = pgEnum("membership_role", ["collaborator", "lead", "admin"]);

export const membershipStatusEnum = pgEnum("membership_status", ["active", "inactive"]);

export const authAccountStatusEnum = pgEnum("auth_account_status", [
  "invited",
  "active",
  "blocked",
  "revoked",
  "recovery_pending",
]);

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

export const centralPackageSourceEnum = pgEnum("central_package_source", [
  "central",
  "local_cache",
  "pending_central",
]);

export const centralSyncStateEnum = pgEnum("central_sync_state", [
  "local",
  "pending_central",
  "synchronized",
  "conflict",
  "discarded",
  "resolved",
]);

export const centralProductStatusEnum = pgEnum("central_product_status", [
  "validated",
  "draft",
  "rejected",
  "archived",
]);

export const productIdentifierTypeEnum = pgEnum("product_identifier_type", [
  "gtin",
  "ean",
  "barcode",
  "plu",
  "internal",
  "supplier_code",
]);

export const centralTaskStatusEnum = pgEnum("central_task_status", [
  "active",
  "resolved",
  "blocked",
]);

export const stores = pgTable(
  "stores",
  {
    storeId: text("store_id").primaryKey(),
    storeCode: text("store_code").notNull(),
    storeName: text("store_name").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("stores_code_uidx").on(table.storeCode),
    index("stores_status_name_idx").on(table.status, table.storeName),
  ],
);

export const centralCategories = pgTable(
  "central_categories",
  {
    categoryId: text("category_id").notNull(),
    storeId: text("store_id").notNull(),
    categoryName: text("category_name").notNull(),
    categoryRuleProfile: jsonb("category_rule_profile").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.categoryId] }),
    index("central_categories_store_status_idx").on(
      table.storeId,
      table.status,
      table.categoryName,
    ),
  ],
);

export const centralCategoryCatalog = pgTable(
  "central_category_catalog",
  {
    categoryId: text("category_id").primaryKey(),
    categoryName: text("category_name").notNull(),
    categoryRuleProfile: jsonb("category_rule_profile").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("central_category_catalog_status_name_idx").on(table.status, table.categoryName),
  ],
);

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

export const authInvites = pgTable(
  "auth_invites",
  {
    inviteId: text("invite_id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    tokenHash: text("token_hash").notNull(),
    identifier: text("identifier").notNull(),
    subjectId: text("subject_id").notNull(),
    displayName: text("display_name").notNull(),
    storeId: text("store_id").notNull(),
    storeName: text("store_name").notNull(),
    role: membershipRoleEnum("role").notNull(),
    status: authAccountStatusEnum("status").notNull().default("invited"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true, mode: "date" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_invites_idempotency_key_uidx").on(table.idempotencyKey),
    uniqueIndex("auth_invites_token_hash_uidx").on(table.tokenHash),
    index("auth_invites_subject_store_idx").on(table.subjectId, table.storeId),
    index("auth_invites_identifier_idx").on(table.identifier),
    index("auth_invites_expires_status_idx").on(table.expiresAt, table.status),
  ],
);

export const authCredentials = pgTable(
  "auth_credentials",
  {
    subjectId: text("subject_id").notNull(),
    storeId: text("store_id").notNull(),
    identifier: text("identifier").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordAlgorithm: text("password_algorithm").notNull(),
    status: authAccountStatusEnum("status").notNull().default("active"),
    passwordUpdatedAt: timestamp("password_updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subjectId, table.storeId] }),
    uniqueIndex("auth_credentials_identifier_uidx").on(table.identifier),
    index("auth_credentials_subject_store_status_idx").on(
      table.subjectId,
      table.storeId,
      table.status,
    ),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    sessionId: text("session_id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    subjectId: text("subject_id").notNull(),
    storeId: text("store_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    rotatedFromSessionId: text("rotated_from_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_uidx").on(table.tokenHash),
    index("auth_sessions_subject_store_revoked_idx").on(
      table.subjectId,
      table.storeId,
      table.revokedAt,
    ),
    index("auth_sessions_expires_revoked_idx").on(table.expiresAt, table.revokedAt),
  ],
);

export const authRecoveryTokens = pgTable(
  "auth_recovery_tokens",
  {
    recoveryId: text("recovery_id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    tokenHash: text("token_hash").notNull(),
    subjectId: text("subject_id").notNull(),
    storeId: text("store_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("auth_recovery_tokens_idempotency_key_uidx").on(table.idempotencyKey),
    uniqueIndex("auth_recovery_tokens_token_hash_uidx").on(table.tokenHash),
    index("auth_recovery_tokens_subject_store_idx").on(table.subjectId, table.storeId),
    index("auth_recovery_tokens_expires_consumed_idx").on(table.expiresAt, table.consumedAt),
  ],
);

export const authLoginAttempts = pgTable(
  "auth_login_attempts",
  {
    attemptId: text("attempt_id").primaryKey(),
    identifierHash: text("identifier_hash").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("auth_login_attempts_identifier_attempted_idx").on(
      table.identifierHash,
      table.attemptedAt,
    ),
    index("auth_login_attempts_attempted_idx").on(table.attemptedAt),
  ],
);

export const privacyRequests = pgTable(
  "privacy_requests",
  {
    requestId: text("request_id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    subjectId: text("subject_id").notNull(),
    storeId: text("store_id").notNull(),
    requestType: text("request_type").notNull(),
    contactChannel: text("contact_channel").notNull(),
    contactValue: text("contact_value").notNull(),
    dataCategories: jsonb("data_categories").$type<readonly string[]>().notNull(),
    requestBody: text("request_body").notNull(),
    status: text("status").notNull().default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("privacy_requests_idempotency_key_uidx").on(table.idempotencyKey),
    index("privacy_requests_subject_store_idx").on(table.subjectId, table.storeId),
    index("privacy_requests_store_received_idx").on(table.storeId, table.receivedAt),
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

export const centralProducts = pgTable(
  "central_products",
  {
    centralProductId: text("central_product_id").primaryKey(),
    storeId: text("store_id").notNull(),
    displayName: text("display_name").notNull(),
    normalizedKey: text("normalized_key").notNull(),
    categoryId: text("category_id").notNull(),
    categoryName: text("category_name").notNull(),
    status: centralProductStatusEnum("status").notNull().default("validated"),
    state: centralSyncStateEnum("state").notNull().default("synchronized"),
    gtin: text("gtin"),
    categoryRuleProfile: jsonb("category_rule_profile").$type<Record<string, unknown>>().notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("central_products_store_name_idx").on(table.storeId, table.displayName),
    uniqueIndex("central_products_store_normalized_key_uidx").on(
      table.storeId,
      table.normalizedKey,
    ),
    index("central_products_store_category_idx").on(table.storeId, table.categoryId),
    index("central_products_store_status_idx").on(table.storeId, table.status),
    uniqueIndex("central_products_store_gtin_uidx")
      .on(table.storeId, table.gtin)
      .where(sql`${table.gtin} is not null`),
  ],
);

export const centralProductIdentifiers = pgTable(
  "central_product_identifiers",
  {
    identifierId: text("identifier_id").primaryKey(),
    storeId: text("store_id").notNull(),
    centralProductId: text("central_product_id").notNull(),
    identifierType: productIdentifierTypeEnum("identifier_type").notNull(),
    identifierValue: text("identifier_value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("central"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("central_product_identifiers_product_idx").on(table.storeId, table.centralProductId),
    index("central_product_identifiers_lookup_idx").on(
      table.storeId,
      table.identifierType,
      table.normalizedValue,
    ),
    uniqueIndex("central_product_identifiers_active_uidx")
      .on(table.storeId, table.identifierType, table.normalizedValue)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const centralProductDrafts = pgTable(
  "central_product_drafts",
  {
    draftId: text("draft_id").primaryKey(),
    storeId: text("store_id").notNull(),
    centralProductId: text("central_product_id").notNull(),
    requestedBy: text("requested_by").notNull(),
    requestedByLabel: text("requested_by_label").notNull(),
    reviewStatus: text("review_status").notNull().default("pending"),
    similarProductIds: jsonb("similar_product_ids")
      .$type<readonly string[]>()
      .notNull()
      .default([]),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("central_product_drafts_store_status_idx").on(table.storeId, table.reviewStatus),
    index("central_product_drafts_store_created_idx").on(table.storeId, table.createdAt),
    index("central_product_drafts_product_idx").on(table.centralProductId),
  ],
);

export const centralLots = pgTable(
  "central_lots",
  {
    centralLotId: text("central_lot_id").primaryKey(),
    storeId: text("store_id").notNull(),
    centralProductId: text("central_product_id").notNull(),
    productDisplayName: text("product_display_name").notNull(),
    lotIdentity: jsonb("lot_identity").$type<Record<string, unknown>>().notNull(),
    lotIdentityKey: text("lot_identity_key").notNull(),
    mode: text("mode").notNull(),
    currentLocation: jsonb("current_location").$type<Record<string, unknown>>().notNull(),
    state: centralSyncStateEnum("state").notNull().default("synchronized"),
    source: centralPackageSourceEnum("source").notNull().default("central"),
    riskState: text("risk_state"),
    expiresAt: text("expires_at"),
    receivedAt: text("received_at"),
    qualityInspectionDueAt: text("quality_inspection_due_at"),
    approximateQuantity: doublePrecision("approximate_quantity"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("central_lots_store_product_idx").on(table.storeId, table.centralProductId),
    index("central_lots_store_identity_idx").on(table.storeId, table.lotIdentityKey),
    index("central_lots_store_risk_idx").on(table.storeId, table.riskState),
    index("central_lots_store_state_idx").on(table.storeId, table.state),
  ],
);

export const centralObservations = pgTable(
  "central_observations",
  {
    observationId: text("observation_id").primaryKey(),
    storeId: text("store_id").notNull(),
    centralLotId: text("central_lot_id").notNull(),
    actorId: text("actor_id").notNull(),
    actorDisplayName: text("actor_display_name").notNull(),
    status: text("status").notNull(),
    location: jsonb("location").$type<Record<string, unknown>>().notNull(),
    quantity: jsonb("quantity").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("central_observations_store_lot_idx").on(table.storeId, table.centralLotId),
    index("central_observations_store_occurred_idx").on(table.storeId, table.occurredAt),
  ],
);

export const centralProjectedTasks = pgTable(
  "central_projected_tasks",
  {
    centralTaskId: text("central_task_id").primaryKey(),
    activeKey: text("active_key").notNull(),
    storeId: text("store_id").notNull(),
    centralLotId: text("central_lot_id").notNull(),
    productDisplayName: text("product_display_name").notNull(),
    currentLocation: jsonb("current_location").$type<Record<string, unknown>>().notNull(),
    riskState: text("risk_state").notNull(),
    severity: text("severity").notNull(),
    requiredResolution: text("required_resolution").notNull(),
    status: centralTaskStatusEnum("status").notNull().default("active"),
    state: centralSyncStateEnum("state").notNull().default("synchronized"),
    ownerLabel: text("owner_label").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "date" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolutionAction: text("resolution_action"),
    resolutionReason: text("resolution_reason"),
    actorLabel: text("actor_label"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("central_projected_tasks_store_active_key_uidx").on(table.storeId, table.activeKey),
    index("central_projected_tasks_store_status_idx").on(table.storeId, table.status),
    index("central_projected_tasks_store_lot_idx").on(table.storeId, table.centralLotId),
    index("central_projected_tasks_store_resolved_idx").on(table.storeId, table.resolvedAt),
  ],
);

export const centralSyncCommands = pgTable(
  "central_sync_commands",
  {
    commandId: text("command_id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    storeId: text("store_id").notNull(),
    deviceId: text("device_id").notNull(),
    kind: text("kind").notNull(),
    state: centralSyncStateEnum("state").notNull().default("pending_central"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    centralVersion: integer("central_version").notNull().default(1),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
    discardedAt: timestamp("discarded_at", { withTimezone: true, mode: "date" }),
    discardReason: text("discard_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("central_sync_commands_idempotency_key_uidx").on(table.idempotencyKey),
    index("central_sync_commands_store_state_idx").on(table.storeId, table.state),
    index("central_sync_commands_store_device_idx").on(table.storeId, table.deviceId),
  ],
);

export const centralSyncConflicts = pgTable(
  "central_sync_conflicts",
  {
    conflictId: text("conflict_id").primaryKey(),
    commandId: text("command_id").notNull(),
    storeId: text("store_id").notNull(),
    productDisplayName: text("product_display_name").notNull(),
    lotIdentity: jsonb("lot_identity").$type<Record<string, unknown>>().notNull(),
    currentLocation: jsonb("current_location").$type<Record<string, unknown>>().notNull(),
    reason: text("reason").notNull(),
    state: centralSyncStateEnum("state").notNull().default("conflict"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolutionReason: text("resolution_reason"),
  },
  (table) => [
    index("central_sync_conflicts_store_state_idx").on(table.storeId, table.state),
    index("central_sync_conflicts_command_idx").on(table.commandId),
  ],
);

export const centralDeviceSnapshots = pgTable(
  "central_device_snapshots",
  {
    deviceId: text("device_id").notNull(),
    storeId: text("store_id").notNull(),
    deviceLabel: text("device_label"),
    activeUserLabel: text("active_user_label"),
    storeName: text("store_name"),
    appVersion: text("app_version"),
    appBuild: text("app_build"),
    environment: text("environment"),
    apiTarget: text("api_target"),
    preparedAt: timestamp("prepared_at", { withTimezone: true, mode: "date" }),
    lastForegroundAt: timestamp("last_foreground_at", { withTimezone: true, mode: "date" }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true, mode: "date" }),
    lastCentralReadAt: timestamp("last_central_read_at", { withTimezone: true, mode: "date" }),
    lastHydratedAt: timestamp("last_hydrated_at", { withTimezone: true, mode: "date" }),
    pendingCommandCount: integer("pending_command_count").notNull().default(0),
    conflictCount: integer("conflict_count").notNull().default(0),
    source: centralPackageSourceEnum("source").notNull().default("central"),
    pushPermission: text("push_permission").notNull().default("unknown"),
    pushProviderState: text("push_provider_state").notNull().default("unknown"),
    expoPushToken: text("expo_push_token"),
    cameraPermission: text("camera_permission").notNull().default("unknown"),
    readinessVerdict: text("readiness_verdict"),
    readinessBlockers: jsonb("readiness_blockers")
      .$type<readonly Record<string, unknown>[]>()
      .notNull()
      .default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.deviceId, table.storeId] }),
    index("central_device_snapshots_store_updated_idx").on(table.storeId, table.updatedAt),
    index("central_device_snapshots_store_readiness_idx").on(
      table.storeId,
      table.readinessVerdict,
      table.updatedAt,
    ),
  ],
);

export type StoreMembershipRecord = typeof storeMemberships.$inferSelect;
export type StoreRecord = typeof stores.$inferSelect;
export type NewStoreRecord = typeof stores.$inferInsert;
export type NewStoreMembershipRecord = typeof storeMemberships.$inferInsert;
export type MembershipMutationRecord = typeof membershipMutations.$inferSelect;
export type NewMembershipMutationRecord = typeof membershipMutations.$inferInsert;
export type AuthInviteDatabaseRecord = typeof authInvites.$inferSelect;
export type NewAuthInviteDatabaseRecord = typeof authInvites.$inferInsert;
export type AuthCredentialDatabaseRecord = typeof authCredentials.$inferSelect;
export type NewAuthCredentialDatabaseRecord = typeof authCredentials.$inferInsert;
export type AuthSessionDatabaseRecord = typeof authSessions.$inferSelect;
export type NewAuthSessionDatabaseRecord = typeof authSessions.$inferInsert;
export type AuthRecoveryTokenDatabaseRecord = typeof authRecoveryTokens.$inferSelect;
export type NewAuthRecoveryTokenDatabaseRecord = typeof authRecoveryTokens.$inferInsert;
export type AuthLoginAttemptDatabaseRecord = typeof authLoginAttempts.$inferSelect;
export type NewAuthLoginAttemptDatabaseRecord = typeof authLoginAttempts.$inferInsert;
export type PrivacyRequestDatabaseRecord = typeof privacyRequests.$inferSelect;
export type NewPrivacyRequestDatabaseRecord = typeof privacyRequests.$inferInsert;
export type CentralCategoryRecord = typeof centralCategories.$inferSelect;
export type NewCentralCategoryRecord = typeof centralCategories.$inferInsert;
export type AuditEventRecord = typeof auditEvents.$inferSelect;
export type NewAuditEventRecord = typeof auditEvents.$inferInsert;
export type EvidenceAssetRecord = typeof evidenceAssets.$inferSelect;
export type NewEvidenceAssetRecord = typeof evidenceAssets.$inferInsert;
export type ShiftClosureRecord = typeof shiftClosures.$inferSelect;
export type NewShiftClosureRecord = typeof shiftClosures.$inferInsert;
export type ShiftHandoffRecord = typeof shiftHandoffs.$inferSelect;
export type NewShiftHandoffRecord = typeof shiftHandoffs.$inferInsert;
export type CentralProductRecord = typeof centralProducts.$inferSelect;
export type NewCentralProductRecord = typeof centralProducts.$inferInsert;
export type CentralProductIdentifierRecord = typeof centralProductIdentifiers.$inferSelect;
export type NewCentralProductIdentifierRecord = typeof centralProductIdentifiers.$inferInsert;
export type CentralProductDraftRecord = typeof centralProductDrafts.$inferSelect;
export type NewCentralProductDraftRecord = typeof centralProductDrafts.$inferInsert;
export type CentralLotRecord = typeof centralLots.$inferSelect;
export type NewCentralLotRecord = typeof centralLots.$inferInsert;
export type CentralObservationRecord = typeof centralObservations.$inferSelect;
export type NewCentralObservationRecord = typeof centralObservations.$inferInsert;
export type CentralProjectedTaskRecord = typeof centralProjectedTasks.$inferSelect;
export type NewCentralProjectedTaskRecord = typeof centralProjectedTasks.$inferInsert;
export type CentralSyncCommandRecord = typeof centralSyncCommands.$inferSelect;
export type NewCentralSyncCommandRecord = typeof centralSyncCommands.$inferInsert;
export type CentralSyncConflictRecord = typeof centralSyncConflicts.$inferSelect;
export type NewCentralSyncConflictRecord = typeof centralSyncConflicts.$inferInsert;
export type CentralDeviceSnapshotRecord = typeof centralDeviceSnapshots.$inferSelect;
export type NewCentralDeviceSnapshotRecord = typeof centralDeviceSnapshots.$inferInsert;
