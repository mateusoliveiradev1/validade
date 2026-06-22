import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type AuditEventType =
  | "access.denied"
  | "task.changed"
  | "markdown.changed"
  | "sync.changed"
  | "evidence.changed"
  | "shift.changed";

export type AuditActorRoleSnapshot = "collaborator" | "lead" | "admin";

export interface AppendAuditEventInput {
  eventId: string;
  idempotencyKey: string;
  type: AuditEventType;
  storeId: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: AuditActorRoleSnapshot;
  occurredAt: Date;
  targetType: string;
  targetId: string;
  summary: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditRepository {
  append(event: AppendAuditEventInput): Promise<void>;
}

export function createNeonAuditRepository(input: { connectionString: string }): AuditRepository {
  return createAuditRepositoryFromQuery(neon(input.connectionString));
}

export function createAuditRepositoryFromQuery(sql: NeonQueryFunction<false, false>): AuditRepository {
  return {
    async append(event) {
      await sql`
        insert into audit_events (
          event_id,
          idempotency_key,
          type,
          store_id,
          actor_id,
          actor_display_name,
          actor_role_snapshot,
          occurred_at,
          target_type,
          target_id,
          summary,
          reason,
          metadata,
          sanitized
        ) values (
          ${event.eventId},
          ${event.idempotencyKey},
          ${event.type},
          ${event.storeId},
          ${event.actorId},
          ${event.actorDisplayName},
          ${event.actorRoleSnapshot},
          ${event.occurredAt.toISOString()},
          ${event.targetType},
          ${event.targetId},
          ${event.summary},
          ${event.reason ?? null},
          ${JSON.stringify(event.metadata ?? {})},
          true
        )
      `;
    },
  };
}
