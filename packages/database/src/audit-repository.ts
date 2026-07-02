import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type AuditEventType =
  | "access.denied"
  | "task.changed"
  | "markdown.changed"
  | "sync.changed"
  | "evidence.changed"
  | "shift.changed"
  | "membership.changed"
  | "gpp.changed";

export type AuditActorRoleSnapshot = "collaborator" | "lead" | "admin" | "gpp";

export type AuditEventStatus = "received" | "pending_ack" | "conflict" | "denied" | "invalidated";

export type AuditTargetType =
  | "task"
  | "lot"
  | "evidence"
  | "shift"
  | "markdown"
  | "sync_command"
  | "access_request"
  | "membership"
  | "product"
  | "gpp_avaria"
  | "gpp_movement"
  | "gpp_purchase_request";

export interface AppendAuditEventInput {
  eventId: string;
  idempotencyKey: string;
  type: AuditEventType;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: AuditActorRoleSnapshot;
  occurredAt: Date;
  receivedAt?: Date;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
  summary: string;
  reason?: string;
  status?: AuditEventStatus;
  linkedEventId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEventProjection {
  eventId: string;
  idempotencyKey: string;
  type: AuditEventType;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: AuditActorRoleSnapshot;
  occurredAt: Date;
  receivedAt: Date;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel?: string;
  summary: string;
  reason?: string;
  status: AuditEventStatus;
  linkedEventId?: string;
  metadata: Record<string, unknown>;
}

export interface AuditQueryInput {
  storeId: string;
  from?: Date;
  to?: Date;
  actorId?: string;
  type?: AuditEventType;
  targetType?: AuditTargetType;
  targetId?: string;
  cursor?: string;
  limit?: number;
}

export interface AuditCursorPage {
  items: readonly AuditEventProjection[];
  nextCursor?: string;
}

export type AppendWithMutationResult<TMutationResult> =
  | {
      replayed: true;
      event: AuditEventProjection;
    }
  | {
      replayed: false;
      event: AuditEventProjection;
      mutationResult: TMutationResult;
    };

export interface AuditRepository {
  append(event: AppendAuditEventInput): Promise<AuditEventProjection>;
  appendWithMutation<TMutationResult>(input: {
    event: AppendAuditEventInput;
    mutate: () => Promise<TMutationResult>;
  }): Promise<AppendWithMutationResult<TMutationResult>>;
  listByTarget(input: {
    storeId: string;
    targetType: AuditTargetType;
    targetId: string;
    limit?: number;
  }): Promise<readonly AuditEventProjection[]>;
  queryStore(input: AuditQueryInput): Promise<AuditCursorPage>;
}

interface AuditEventRow {
  event_id: string;
  idempotency_key: string;
  type: AuditEventType;
  store_id: string;
  store_name: string;
  actor_id: string;
  actor_display_name: string;
  actor_role_snapshot: AuditActorRoleSnapshot;
  occurred_at: string | Date;
  received_at: string | Date;
  target_type: AuditTargetType;
  target_id: string;
  target_label: string | null;
  summary: string;
  reason: string | null;
  status: AuditEventStatus;
  linked_event_id: string | null;
  metadata: Record<string, unknown> | string | null;
}

export function createNeonAuditRepository(input: { connectionString: string }): AuditRepository {
  return createAuditRepositoryFromQuery(neon(input.connectionString));
}

export function createAuditRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
): AuditRepository {
  async function findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<AuditEventProjection | undefined> {
    const rows = (await sql`
      select
        event_id,
        idempotency_key,
        type,
        store_id,
        store_name,
        actor_id,
        actor_display_name,
        actor_role_snapshot,
        occurred_at,
        received_at,
        target_type,
        target_id,
        target_label,
        summary,
        reason,
        status,
        linked_event_id,
        metadata
      from audit_events
      where idempotency_key = ${idempotencyKey}
      limit 1
    `) as AuditEventRow[];

    return rows[0] === undefined ? undefined : mapAuditRow(rows[0]);
  }

  async function append(event: AppendAuditEventInput): Promise<AuditEventProjection> {
    const receivedAt = event.receivedAt ?? new Date();

    await sql`
      insert into audit_events (
        event_id,
        idempotency_key,
        type,
        store_id,
        store_name,
        actor_id,
        actor_display_name,
        actor_role_snapshot,
        occurred_at,
        received_at,
        target_type,
        target_id,
        target_label,
        summary,
        reason,
        status,
        linked_event_id,
        metadata,
        sanitized
      ) values (
        ${event.eventId},
        ${event.idempotencyKey},
        ${event.type},
        ${event.storeId},
        ${event.storeName},
        ${event.actorId},
        ${event.actorDisplayName},
        ${event.actorRoleSnapshot},
        ${event.occurredAt.toISOString()},
        ${receivedAt.toISOString()},
        ${event.targetType},
        ${event.targetId},
        ${event.targetLabel ?? null},
        ${event.summary},
        ${event.reason ?? null},
        ${event.status ?? "received"},
        ${event.linkedEventId ?? null},
        ${JSON.stringify(event.metadata ?? {})},
        true
      )
      on conflict (idempotency_key) do nothing
    `;

    const stored = await findByIdempotencyKey(event.idempotencyKey);

    if (stored === undefined) {
      throw new Error("Audit event append did not return the stored idempotency record.");
    }

    return stored;
  }

  async function queryStore(input: AuditQueryInput): Promise<AuditCursorPage> {
    const limit = input.limit ?? 25;
    const cursor = decodeCursor(input.cursor);
    const rows = (await sql`
      select
        event_id,
        idempotency_key,
        type,
        store_id,
        store_name,
        actor_id,
        actor_display_name,
        actor_role_snapshot,
        occurred_at,
        received_at,
        target_type,
        target_id,
        target_label,
        summary,
        reason,
        status,
        linked_event_id,
        metadata
      from audit_events
      where store_id = ${input.storeId}
        and (${input.type ?? null}::audit_event_type is null or type = ${input.type ?? null}::audit_event_type)
        and (${input.actorId ?? null}::text is null or actor_id = ${input.actorId ?? null})
        and (${input.targetType ?? null}::text is null or target_type = ${input.targetType ?? null})
        and (${input.targetId ?? null}::text is null or target_id = ${input.targetId ?? null})
        and (${input.from?.toISOString() ?? null}::timestamptz is null or occurred_at >= ${input.from?.toISOString() ?? null}::timestamptz)
        and (${input.to?.toISOString() ?? null}::timestamptz is null or occurred_at <= ${input.to?.toISOString() ?? null}::timestamptz)
        and (${cursor?.occurredAt ?? null}::timestamptz is null or occurred_at < ${cursor?.occurredAt ?? null}::timestamptz)
      order by occurred_at desc, event_id desc
      limit ${limit + 1}
    `) as AuditEventRow[];
    const hasNextPage = rows.length > limit;
    const visibleRows = hasNextPage ? rows.slice(0, limit) : rows;
    const items = visibleRows.map(mapAuditRow);
    const lastItem = items[items.length - 1];

    return {
      items,
      ...(hasNextPage && lastItem !== undefined ? { nextCursor: encodeCursor(lastItem) } : {}),
    };
  }

  return {
    append,
    async appendWithMutation(input) {
      const existing = await findByIdempotencyKey(input.event.idempotencyKey);

      if (existing !== undefined) {
        return {
          replayed: true,
          event: existing,
        };
      }

      const mutationResult = await input.mutate();
      const event = await append(input.event);

      return {
        replayed: false,
        event,
        mutationResult,
      };
    },
    async listByTarget(input) {
      const page = await queryStore({
        storeId: input.storeId,
        targetType: input.targetType,
        targetId: input.targetId,
        limit: input.limit ?? 25,
      });

      return page.items;
    },
    queryStore,
  };
}

function mapAuditRow(row: AuditEventRow): AuditEventProjection {
  return {
    eventId: row.event_id,
    idempotencyKey: row.idempotency_key,
    type: row.type,
    storeId: row.store_id,
    storeName: row.store_name,
    actorId: row.actor_id,
    actorDisplayName: row.actor_display_name,
    actorRoleSnapshot: row.actor_role_snapshot,
    occurredAt: toDate(row.occurred_at),
    receivedAt: toDate(row.received_at),
    targetType: row.target_type,
    targetId: row.target_id,
    ...(row.target_label === null ? {} : { targetLabel: row.target_label }),
    summary: row.summary,
    ...(row.reason === null ? {} : { reason: row.reason }),
    status: row.status,
    ...(row.linked_event_id === null ? {} : { linkedEventId: row.linked_event_id }),
    metadata: parseMetadata(row.metadata),
  };
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function parseMetadata(value: AuditEventRow["metadata"]): Record<string, unknown> {
  if (value === null) {
    return {};
  }

  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, unknown>;
  }

  return value;
}

function encodeCursor(event: Pick<AuditEventProjection, "occurredAt" | "eventId">): string {
  return `${event.occurredAt.toISOString()}__${event.eventId}`;
}

function decodeCursor(
  cursor: string | undefined,
): { occurredAt: string; eventId: string } | undefined {
  if (cursor === undefined) {
    return undefined;
  }

  const [occurredAt, eventId] = cursor.split("__");

  if (occurredAt === undefined || eventId === undefined || Number.isNaN(Date.parse(occurredAt))) {
    return undefined;
  }

  return { occurredAt, eventId };
}
