import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditEventStatusEnum,
  auditEvents,
  authAccountStatusEnum,
  authCredentials,
  authInvites,
  authLoginAttempts,
  authRecoveryTokens,
  authSessions,
  centralCategories,
  evidenceAssets,
  evidenceAssetStateEnum,
  membershipRoleEnum,
  membershipStatusEnum,
  membershipMutations,
  privacyRequests,
  shiftClosures,
  shiftCloseEligibilityEnum,
  shiftCloseVerdictEnum,
  shiftHandoffs,
  storeMemberships,
} from "./schema";

const migrationSql = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0001_phase_08_identity_audit.sql"),
  "utf8",
);
const evidenceMigrationSql = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0002_phase_08_evidence.sql"),
  "utf8",
);
const shiftCloseMigrationSql = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0003_phase_08_shift_close.sql"),
  "utf8",
);
const membershipMigrationSql = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0004_phase_08_memberships.sql"),
  "utf8",
);
const authMigrationSql = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0005_phase_09_auth.sql"),
  "utf8",
);
const productionHardeningMigrationSql = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0008_phase_10_production_hardening.sql"),
  "utf8",
);
const productionOpsMigrationSql = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0009_phase_10_categories_retention.sql"),
  "utf8",
);

describe("phase 08 database schema", () => {
  it("defines membership roles and active status vocabulary", () => {
    expect(membershipRoleEnum.enumValues).toEqual(["collaborator", "lead", "admin"]);
    expect(membershipStatusEnum.enumValues).toEqual(["active", "inactive"]);
    expect(auditEventStatusEnum.enumValues).toEqual([
      "received",
      "pending_ack",
      "conflict",
      "denied",
      "invalidated",
    ]);
  });

  it("keeps memberships and audit events store scoped", () => {
    expect(storeMemberships.storeId.name).toBe("store_id");
    expect(auditEvents.storeId.name).toBe("store_id");
  });

  it("tracks audit idempotency, actor snapshot, target, and sanitized metadata", () => {
    expect(auditEvents.idempotencyKey.name).toBe("idempotency_key");
    expect(auditEvents.storeName.name).toBe("store_name");
    expect(auditEvents.actorRoleSnapshot.name).toBe("actor_role_snapshot");
    expect(auditEvents.targetType.name).toBe("target_type");
    expect(auditEvents.targetId.name).toBe("target_id");
    expect(auditEvents.targetLabel.name).toBe("target_label");
    expect(auditEvents.status.name).toBe("status");
    expect(auditEvents.linkedEventId.name).toBe("linked_event_id");
    expect(auditEvents.metadata.name).toBe("metadata");
    expect(auditEvents.sanitized.name).toBe("sanitized");
  });

  it("migration includes indexes, idempotency, and append-only guard", () => {
    expect(migrationSql).toContain("store_memberships_active_subject_store_role_uidx");
    expect(migrationSql).toContain("audit_events_idempotency_key_uidx");
    expect(migrationSql).toContain("audit_event_status");
    expect(migrationSql).toContain("store_name text NOT NULL");
    expect(migrationSql).toContain("audit_events_store_occurred_idx");
    expect(migrationSql).toContain("audit_events_target_occurred_idx");
    expect(migrationSql).toContain("prevent_audit_events_mutation");
    expect(migrationSql).toContain("audit_events_append_only_guard");
  });

  it("migration documents Phase 8 threat mitigations", () => {
    expect(migrationSql).toContain("T8-01");
    expect(migrationSql).toContain("T8-04");
    expect(migrationSql).toContain("T8-05");
  });

  it("stores evidence metadata and an opaque object reference without binary or URL columns", () => {
    expect(evidenceAssetStateEnum.enumValues).toEqual([
      "upload_requested",
      "uploading",
      "uploaded",
      "failed",
      "invalidated",
      "expired",
    ]);
    expect(evidenceAssets.storeId.name).toBe("store_id");
    expect(evidenceAssets.targetId.name).toBe("target_id");
    expect(evidenceAssets.objectKey.name).toBe("object_key");
    expect(evidenceAssets.sha256.name).toBe("sha256");
    expect(evidenceAssets.retentionDays.name).toBe("retention_days");

    expect(Object.keys(evidenceAssets)).not.toEqual(
      expect.arrayContaining(["bytes", "base64", "uri", "localUri", "signedUrl", "url"]),
    );
  });

  it("migration scopes evidence access and retention reconciliation with explicit indexes", () => {
    expect(evidenceMigrationSql).toContain("evidence_assets_store_target_idx");
    expect(evidenceMigrationSql).toContain("evidence_assets_store_state_idx");
    expect(evidenceMigrationSql).toContain("evidence_assets_retention_idx");
    expect(evidenceMigrationSql).toContain("retention_days integer NOT NULL DEFAULT 90");
    expect(evidenceMigrationSql).toContain("CHECK (size_bytes > 0)");
    expect(evidenceMigrationSql).toContain("CHECK (sha256 ~ '^[0-9a-fA-F]{64}$')");
    expect(evidenceMigrationSql).not.toMatch(/\b(uri|base64|signed_url|binary|bytea)\b/i);
  });

  it("stores immutable, store-scoped close and handoff snapshots", () => {
    expect(shiftCloseVerdictEnum.enumValues).toEqual(["safe", "unsafe"]);
    expect(shiftCloseEligibilityEnum.enumValues).toEqual([
      "eligible_safe",
      "must_close_unsafe",
      "cannot_evaluate",
    ]);
    expect(shiftClosures.storeId.name).toBe("store_id");
    expect(shiftClosures.blockers.name).toBe("blockers");
    expect(shiftClosures.revisionOfClosureId.name).toBe("revision_of_closure_id");
    expect(shiftHandoffs.closureId.name).toBe("closure_id");
    expect(shiftHandoffs.storeId.name).toBe("store_id");
  });

  it("migration preserves unsafe continuity, idempotency, and append-only history", () => {
    expect(shiftCloseMigrationSql).toContain("shift_closures_unsafe_continuity_check");
    expect(shiftCloseMigrationSql).toContain("shift_closures_idempotency_key_uidx");
    expect(shiftCloseMigrationSql).toContain("shift_handoffs_idempotency_key_uidx");
    expect(shiftCloseMigrationSql).toContain("shift_closures_append_only_guard");
    expect(shiftCloseMigrationSql).toContain("shift_handoffs_append_only_guard");
    expect(shiftCloseMigrationSql).toContain("shift_closures_store_occurred_idx");
  });

  it("keeps membership changes versioned, idempotent, and auditable", () => {
    expect(storeMemberships.version.name).toBe("version");
    expect(membershipMutations.idempotencyKey.name).toBe("idempotency_key");
    expect(membershipMutations.storeId.name).toBe("store_id");
    expect(membershipMigrationSql).toContain("store_memberships_version_positive_check");
    expect(membershipMigrationSql).toContain("membership_mutations_store_occurred_idx");
    expect(membershipMigrationSql).toContain("membership_mutations_append_only_guard");
    expect(membershipMigrationSql).toContain("membership.changed");
  });

  it("defines durable account, invite, session, recovery, and privacy records", () => {
    expect(authAccountStatusEnum.enumValues).toEqual([
      "invited",
      "active",
      "blocked",
      "revoked",
      "recovery_pending",
    ]);
    expect(authInvites.tokenHash.name).toBe("token_hash");
    expect(authCredentials.passwordHash.name).toBe("password_hash");
    expect(authCredentials.passwordSalt.name).toBe("password_salt");
    expect(authSessions.tokenHash.name).toBe("token_hash");
    expect(authRecoveryTokens.tokenHash.name).toBe("token_hash");
    expect(authLoginAttempts.identifierHash.name).toBe("identifier_hash");
    expect(privacyRequests.requestBody.name).toBe("request_body");
  });

  it("indexes auth scope and never declares raw token, password, or evidence columns", () => {
    expect(authMigrationSql).toContain("auth_invites_subject_store_idx");
    expect(authMigrationSql).toContain("auth_invites_expires_status_idx");
    expect(authMigrationSql).toContain("auth_sessions_subject_store_revoked_idx");
    expect(authMigrationSql).toContain("auth_recovery_tokens_expires_consumed_idx");
    expect(authMigrationSql).toContain("privacy_requests_subject_store_idx");
    expect(authMigrationSql).not.toMatch(
      /\b(raw_token|raw_password|signed_url|device_uri|base64|bytea)\b/i,
    );
  });

  it("hardens staging auth throttling and central relational integrity", () => {
    expect(productionHardeningMigrationSql).toContain("auth_login_attempts");
    expect(productionHardeningMigrationSql).toContain("identifier_hash text NOT NULL");
    expect(productionHardeningMigrationSql).toContain("central_product_drafts_review_status_check");
    expect(productionHardeningMigrationSql).toContain("'validated'");
    expect(productionHardeningMigrationSql).toContain("'discarded'");
    expect(productionHardeningMigrationSql).toContain("central_lots_product_fkey");
    expect(productionHardeningMigrationSql).toContain("central_observations_lot_fkey");
    expect(productionHardeningMigrationSql).toContain("central_projected_tasks_lot_fkey");
    expect(productionHardeningMigrationSql).not.toMatch(
      /\b(raw_token|raw_password|signed_url|device_uri|base64|bytea)\b/i,
    );
  });

  it("models store-scoped central categories before products depend on them", () => {
    expect(centralCategories.storeId.name).toBe("store_id");
    expect(centralCategories.categoryId.name).toBe("category_id");
    expect(centralCategories.categoryName.name).toBe("category_name");
    expect(centralCategories.categoryRuleProfile.name).toBe("category_rule_profile");
    expect(productionOpsMigrationSql).toContain("CREATE TABLE IF NOT EXISTS central_categories");
    expect(productionOpsMigrationSql).toContain("PRIMARY KEY (store_id, category_id)");
    expect(productionOpsMigrationSql).toContain("INSERT INTO central_categories");
    expect(productionOpsMigrationSql).toContain("central_products_category_fkey");
    expect(productionOpsMigrationSql).not.toMatch(
      /\b(raw_token|raw_password|signed_url|device_uri|base64|bytea)\b/i,
    );
  });
});
