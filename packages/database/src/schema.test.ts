import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditEventStatusEnum,
  auditEvents,
  membershipRoleEnum,
  membershipStatusEnum,
  storeMemberships,
} from "./schema";

const migrationSql = readFileSync(
  join(process.cwd(), "packages/database/drizzle/0001_phase_08_identity_audit.sql"),
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
});
