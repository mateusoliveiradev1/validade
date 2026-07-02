import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { ShiftCloseEligibility, ShiftCloseVerdict } from "@validade-zero/domain";

export interface ShiftClosurePersistenceRecord {
  closureId: string;
  idempotencyKey: string;
  storeId: string;
  storeName: string;
  verdict: ShiftCloseVerdict;
  eligibility: ShiftCloseEligibility;
  blockers: readonly Record<string, unknown>[];
  checklist: readonly string[];
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: "collaborator" | "lead" | "admin";
  occurredAt: Date;
  receivedAt: Date;
  ruleVersion: string;
  reason?: string;
  continuityOwner?: string;
  continuityDeadline?: Date;
  note?: string;
  revisionOfClosureId?: string;
  reopenReason?: string;
  reopenSummary?: string;
}

export interface ShiftHandoffPersistenceRecord {
  handoffId: string;
  idempotencyKey: string;
  closureId: string;
  storeId: string;
  acknowledgedBy: string;
  acknowledgedDisplayName: string;
  acknowledgedRoleSnapshot: "collaborator" | "lead" | "admin";
  acknowledgedAt: Date;
  receivedAt: Date;
}

export interface ShiftCloseRepository {
  createClosure(input: ShiftClosurePersistenceRecord): Promise<{
    closure: ShiftClosurePersistenceRecord;
    replayed: boolean;
  }>;
  findActiveClosureForStore(input: {
    storeId: string;
  }): Promise<ShiftClosurePersistenceRecord | undefined>;
  findClosure(input: {
    closureId: string;
    storeId: string;
  }): Promise<ShiftClosurePersistenceRecord | undefined>;
  recordTurnStart(input: {
    storeId: string;
    idempotencyKey: string;
    startedAt: Date;
    createdAt: Date;
  }): Promise<void>;
  createHandoff(input: ShiftHandoffPersistenceRecord): Promise<{
    handoff: ShiftHandoffPersistenceRecord;
    replayed: boolean;
  }>;
}

interface ShiftClosureRow {
  closure_id: string;
  idempotency_key: string;
  store_id: string;
  store_name: string;
  verdict: ShiftCloseVerdict;
  eligibility: ShiftCloseEligibility;
  blockers: readonly Record<string, unknown>[];
  checklist: readonly string[];
  actor_id: string;
  actor_display_name: string;
  actor_role_snapshot: ShiftClosurePersistenceRecord["actorRoleSnapshot"];
  occurred_at: string | Date;
  received_at: string | Date;
  rule_version: string;
  reason: string | null;
  continuity_owner: string | null;
  continuity_deadline: string | Date | null;
  note: string | null;
  revision_of_closure_id: string | null;
  reopen_reason: string | null;
  reopen_summary: string | null;
}

interface ShiftHandoffRow {
  handoff_id: string;
  idempotency_key: string;
  closure_id: string;
  store_id: string;
  acknowledged_by: string;
  acknowledged_display_name: string;
  acknowledged_role_snapshot: ShiftHandoffPersistenceRecord["acknowledgedRoleSnapshot"];
  acknowledged_at: string | Date;
  received_at: string | Date;
}

const SHIFT_CLOSURE_COLUMNS = `
  closure_id, idempotency_key, store_id, store_name, verdict, eligibility, blockers, checklist,
  actor_id, actor_display_name, actor_role_snapshot, occurred_at, received_at, rule_version,
  reason, continuity_owner, continuity_deadline, note, revision_of_closure_id, reopen_reason,
  reopen_summary
`;

const SHIFT_HANDOFF_COLUMNS = `
  handoff_id, idempotency_key, closure_id, store_id, acknowledged_by, acknowledged_display_name,
  acknowledged_role_snapshot, acknowledged_at, received_at
`;

export function createNeonShiftCloseRepository(input: {
  connectionString: string;
}): ShiftCloseRepository {
  return createShiftCloseRepositoryFromQuery(neon(input.connectionString));
}

export function createShiftCloseRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
): ShiftCloseRepository {
  let turnStartsTableEnsured: Promise<void> | undefined;

  function ensureTurnStartsTable(): Promise<void> {
    turnStartsTableEnsured ??= sql
      .query(
        `
      create table if not exists shift_turn_starts (
        start_id text primary key,
        idempotency_key text not null,
        store_id text not null,
        started_at timestamptz not null,
        created_at timestamptz not null default now()
      );
      create unique index if not exists shift_turn_starts_idempotency_key_uidx
        on shift_turn_starts (idempotency_key);
      create index if not exists shift_turn_starts_store_started_idx
        on shift_turn_starts (store_id, started_at desc);
    `,
      )
      .then(() => undefined);

    return turnStartsTableEnsured;
  }

  async function findClosure(input: { closureId: string; storeId: string }) {
    const rows = (await sql.query(
      `select ${SHIFT_CLOSURE_COLUMNS} from shift_closures where closure_id = $1 and store_id = $2 limit 1`,
      [input.closureId, input.storeId],
    )) as ShiftClosureRow[];

    return rows[0] === undefined ? undefined : mapClosure(rows[0]);
  }

  return {
    async createClosure(input) {
      const existingRows = (await sql.query(
        `select ${SHIFT_CLOSURE_COLUMNS} from shift_closures where idempotency_key = $1 and store_id = $2 limit 1`,
        [input.idempotencyKey, input.storeId],
      )) as ShiftClosureRow[];
      if (existingRows[0] !== undefined) {
        return { closure: mapClosure(existingRows[0]), replayed: true };
      }

      await sql.query(
        `insert into shift_closures (
          closure_id, idempotency_key, store_id, store_name, verdict, eligibility, blockers, checklist,
          actor_id, actor_display_name, actor_role_snapshot, occurred_at, received_at, rule_version,
          reason, continuity_owner, continuity_deadline, note, revision_of_closure_id, reopen_reason,
          reopen_summary
        ) values (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12::timestamptz,
          $13::timestamptz, $14, $15, $16, $17::timestamptz, $18, $19, $20, $21
        ) on conflict (idempotency_key) do nothing`,
        [
          input.closureId,
          input.idempotencyKey,
          input.storeId,
          input.storeName,
          input.verdict,
          input.eligibility,
          JSON.stringify(input.blockers),
          JSON.stringify(input.checklist),
          input.actorId,
          input.actorDisplayName,
          input.actorRoleSnapshot,
          input.occurredAt.toISOString(),
          input.receivedAt.toISOString(),
          input.ruleVersion,
          input.reason ?? null,
          input.continuityOwner ?? null,
          input.continuityDeadline?.toISOString() ?? null,
          input.note ?? null,
          input.revisionOfClosureId ?? null,
          input.reopenReason ?? null,
          input.reopenSummary ?? null,
        ],
      );

      const closure = await findClosure({ closureId: input.closureId, storeId: input.storeId });
      if (closure === undefined)
        throw new Error("Shift close snapshot was not persisted in the authorized store.");
      return { closure, replayed: false };
    },
    async findActiveClosureForStore(input) {
      await ensureTurnStartsTable();
      const rows = (await sql.query(
        `select ${SHIFT_CLOSURE_COLUMNS}
        from shift_closures c
        where c.store_id = $1
          and not exists (
            select 1 from shift_turn_starts s
            where s.store_id = c.store_id
              and s.started_at > c.occurred_at
          )
        order by c.occurred_at desc, c.received_at desc
        limit 1`,
        [input.storeId],
      )) as ShiftClosureRow[];

      return rows[0] === undefined ? undefined : mapClosure(rows[0]);
    },
    findClosure,
    async recordTurnStart(input) {
      await ensureTurnStartsTable();
      const startId = `shift-turn-start-${sanitizeIdentifier(input.idempotencyKey)}`;
      await sql.query(
        `insert into shift_turn_starts (
          start_id, idempotency_key, store_id, started_at, created_at
        ) values ($1, $2, $3, $4::timestamptz, $5::timestamptz)
        on conflict (idempotency_key) do nothing`,
        [
          startId,
          input.idempotencyKey,
          input.storeId,
          input.startedAt.toISOString(),
          input.createdAt.toISOString(),
        ],
      );
    },
    async createHandoff(input) {
      const existingRows = (await sql.query(
        `select ${SHIFT_HANDOFF_COLUMNS} from shift_handoffs where idempotency_key = $1 and store_id = $2 limit 1`,
        [input.idempotencyKey, input.storeId],
      )) as ShiftHandoffRow[];
      if (existingRows[0] !== undefined)
        return { handoff: mapHandoff(existingRows[0]), replayed: true };

      await sql.query(
        `insert into shift_handoffs (
          handoff_id, idempotency_key, closure_id, store_id, acknowledged_by, acknowledged_display_name,
          acknowledged_role_snapshot, acknowledged_at, received_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz)
        on conflict (idempotency_key) do nothing`,
        [
          input.handoffId,
          input.idempotencyKey,
          input.closureId,
          input.storeId,
          input.acknowledgedBy,
          input.acknowledgedDisplayName,
          input.acknowledgedRoleSnapshot,
          input.acknowledgedAt.toISOString(),
          input.receivedAt.toISOString(),
        ],
      );
      const rows = (await sql.query(
        `select ${SHIFT_HANDOFF_COLUMNS} from shift_handoffs where handoff_id = $1 and store_id = $2 limit 1`,
        [input.handoffId, input.storeId],
      )) as ShiftHandoffRow[];
      if (rows[0] === undefined)
        throw new Error("Shift handoff acknowledgement was not persisted.");
      return { handoff: mapHandoff(rows[0]), replayed: false };
    },
  };
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 120);
  if (sanitized.length === 0) {
    throw new Error("Shift turn start identifier cannot be empty after sanitization.");
  }
  return sanitized;
}

function mapClosure(row: ShiftClosureRow): ShiftClosurePersistenceRecord {
  return {
    closureId: row.closure_id,
    idempotencyKey: row.idempotency_key,
    storeId: row.store_id,
    storeName: row.store_name,
    verdict: row.verdict,
    eligibility: row.eligibility,
    blockers: row.blockers,
    checklist: row.checklist,
    actorId: row.actor_id,
    actorDisplayName: row.actor_display_name,
    actorRoleSnapshot: row.actor_role_snapshot,
    occurredAt: toDate(row.occurred_at),
    receivedAt: toDate(row.received_at),
    ruleVersion: row.rule_version,
    ...(row.reason === null ? {} : { reason: row.reason }),
    ...(row.continuity_owner === null ? {} : { continuityOwner: row.continuity_owner }),
    ...(row.continuity_deadline === null
      ? {}
      : { continuityDeadline: toDate(row.continuity_deadline) }),
    ...(row.note === null ? {} : { note: row.note }),
    ...(row.revision_of_closure_id === null
      ? {}
      : { revisionOfClosureId: row.revision_of_closure_id }),
    ...(row.reopen_reason === null ? {} : { reopenReason: row.reopen_reason }),
    ...(row.reopen_summary === null ? {} : { reopenSummary: row.reopen_summary }),
  };
}

function mapHandoff(row: ShiftHandoffRow): ShiftHandoffPersistenceRecord {
  return {
    handoffId: row.handoff_id,
    idempotencyKey: row.idempotency_key,
    closureId: row.closure_id,
    storeId: row.store_id,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedDisplayName: row.acknowledged_display_name,
    acknowledgedRoleSnapshot: row.acknowledged_role_snapshot,
    acknowledgedAt: toDate(row.acknowledged_at),
    receivedAt: toDate(row.received_at),
  };
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
