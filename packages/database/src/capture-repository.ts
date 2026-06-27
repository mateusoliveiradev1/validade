import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  PrepareTurnResponseSchema,
  type ActiveTaskSnippet,
  type CentralConflictSnippet,
  type CentralLotSnippet,
  type CentralProductSnippet,
  type PrepareTurnRequest,
  type PrepareTurnResponse,
  type ResolvedTaskHistorySnippet,
  type VisibleCentralSyncState,
} from "@validade-zero/contracts";

export type CaptureActorRoleSnapshot = "collaborator" | "lead" | "admin";

export interface PrepareTurnInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  request: PrepareTurnRequest;
}

export interface PrepareTurnDeniedInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  reason: "unauthenticated" | "inactive_membership" | "capability_not_allowed" | "outside_store_scope";
  occurredAt: Date;
}

export interface DeviceSnapshotInput {
  deviceId: string;
  storeId: string;
  preparedAt?: Date;
  lastCentralReadAt?: Date;
  lastHydratedAt?: Date;
  pendingCommandCount: number;
  conflictCount: number;
  source: "central" | "local_cache" | "pending_central";
  updatedAt: Date;
}

export interface CaptureRepository {
  prepareTurn(input: PrepareTurnInput): Promise<PrepareTurnResponse>;
  upsertDeviceSnapshot(input: DeviceSnapshotInput): Promise<void>;
  recordPrepareTurnRejected(input: PrepareTurnDeniedInput): Promise<void>;
}

interface ProductRow {
  central_product_id: string;
  display_name: string;
  category_id: string;
  category_name: string;
  status: CentralProductSnippet["status"];
  state: VisibleCentralSyncState;
  gtin: string | null;
  category_rule_profile: Record<string, unknown> | string;
  updated_at: string | Date;
}

interface LotRow {
  central_lot_id: string;
  central_product_id: string;
  product_display_name: string;
  lot_identity: Record<string, unknown> | string;
  mode: CentralLotSnippet["mode"];
  current_location: Record<string, unknown> | string;
  state: VisibleCentralSyncState;
  source: CentralLotSnippet["source"];
  risk_state: CentralLotSnippet["riskState"] | null;
  expires_at: string | null;
  received_at: string | null;
  quality_inspection_due_at: string | null;
  approximate_quantity: number | null;
  updated_at: string | Date;
}

interface TaskRow {
  central_task_id: string;
  active_key: string;
  central_lot_id: string;
  product_display_name: string;
  current_location: Record<string, unknown> | string;
  risk_state: ActiveTaskSnippet["riskState"];
  severity: ActiveTaskSnippet["severity"];
  required_resolution: ActiveTaskSnippet["requiredResolution"];
  state: VisibleCentralSyncState;
  owner_label: string;
  due_at: string | Date | null;
  updated_at: string | Date;
}

interface ResolvedTaskRow {
  central_task_id: string;
  central_lot_id: string;
  product_display_name: string;
  lot_identity: Record<string, unknown> | string;
  current_location: Record<string, unknown> | string;
  resolution_action: ResolvedTaskHistorySnippet["action"];
  actor_label: string;
  resolution_reason: string | null;
  resolved_at: string | Date;
}

interface ConflictRow {
  conflict_id: string;
  command_id: string;
  product_display_name: string;
  lot_identity: Record<string, unknown> | string;
  current_location: Record<string, unknown> | string;
  reason: string;
  created_at: string | Date;
  state: "conflict";
}

type StoredProduct = CentralProductSnippet & { storeId: string };
type StoredLot = CentralLotSnippet & { storeId: string };
type StoredTask = ActiveTaskSnippet & {
  storeId: string;
  taskStatus?: "active" | "resolved" | "blocked";
};
type StoredResolved = ResolvedTaskHistorySnippet & { storeId: string };
type StoredConflict = CentralConflictSnippet & { storeId: string };

export function createNeonCaptureRepository(input: { connectionString: string }): CaptureRepository {
  return createCaptureRepositoryFromQuery(neon(input.connectionString));
}

export function createCaptureRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
): CaptureRepository {
  async function upsertDeviceSnapshot(input: DeviceSnapshotInput): Promise<void> {
    await sql.query(
      `insert into central_device_snapshots (
        device_id, store_id, prepared_at, last_central_read_at, last_hydrated_at,
        pending_command_count, conflict_count, source, updated_at
      ) values ($1, $2, $3::timestamptz, $4::timestamptz, $5::timestamptz, $6, $7, $8, $9::timestamptz)
      on conflict (device_id, store_id) do update set
        prepared_at = excluded.prepared_at,
        last_central_read_at = excluded.last_central_read_at,
        last_hydrated_at = excluded.last_hydrated_at,
        pending_command_count = excluded.pending_command_count,
        conflict_count = excluded.conflict_count,
        source = excluded.source,
        updated_at = excluded.updated_at`,
      [
        input.deviceId,
        input.storeId,
        input.preparedAt?.toISOString() ?? null,
        input.lastCentralReadAt?.toISOString() ?? null,
        input.lastHydratedAt?.toISOString() ?? null,
        input.pendingCommandCount,
        input.conflictCount,
        input.source,
        input.updatedAt.toISOString(),
      ],
    );
  }

  async function appendPrepareTurnAudit(input: PrepareTurnInput, response: PrepareTurnResponse) {
    await sql.query(
      `insert into audit_events (
        event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
        actor_role_snapshot, occurred_at, target_type, target_id, target_label, summary,
        status, metadata, sanitized
      ) values ($1, $2, 'sync.changed', $3, $4, $5, $6, $7, $8::timestamptz,
        'sync_command', $9, $10, $11, 'received', $12::jsonb, true
      ) on conflict (idempotency_key) do nothing`,
      [
        `${input.requestId}:audit`,
        `prepare-turn:${input.requestId}`,
        input.storeId,
        input.storeName,
        input.actorId,
        input.actorDisplayName,
        input.actorRoleSnapshot,
        input.request.requestedAt,
        input.requestId,
        "Preparar turno",
        "Leitura central servida para o aparelho autorizado.",
        JSON.stringify({
          deviceId: input.request.deviceId,
          readiness: response.store.readiness,
          activeTaskCount: response.activeTasks.length,
          conflictCount: response.conflicts.length,
        }),
      ],
    );
  }

  async function recordPrepareTurnRejected(input: PrepareTurnDeniedInput): Promise<void> {
    await sql.query(
      `insert into audit_events (
        event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
        actor_role_snapshot, occurred_at, target_type, target_id, target_label, summary,
        reason, status, metadata, sanitized
      ) values ($1, $2, 'access.denied', $3, $4, $5, $6, $7, $8::timestamptz,
        'access_request', $9, $10, $11, $12, 'denied', $13::jsonb, true
      ) on conflict (idempotency_key) do nothing`,
      [
        `${input.requestId}:denied`,
        `prepare-turn-denied:${input.requestId}`,
        input.storeId,
        input.storeName,
        input.actorId,
        input.actorDisplayName,
        input.actorRoleSnapshot,
        input.occurredAt.toISOString(),
        input.requestId,
        "Preparar turno negado",
        "Leitura central negada sem vazar dados da loja.",
        input.reason,
        JSON.stringify({ reason: input.reason }),
      ],
    );
  }

  return {
    async prepareTurn(input) {
      const [productRows, lotRows, taskRows, resolvedRows, conflictRows] = await Promise.all([
        sql.query(
          `select central_product_id, display_name, category_id, category_name, status, state,
            gtin, category_rule_profile, updated_at
          from central_products
          where store_id = $1 and status <> 'archived'
          order by updated_at desc, display_name asc
          limit 100`,
          [input.storeId],
        ) as unknown as Promise<ProductRow[]>,
        sql.query(
          `select central_lot_id, central_product_id, product_display_name, lot_identity, mode,
            current_location, state, source, risk_state, expires_at, received_at,
            quality_inspection_due_at, approximate_quantity, updated_at
          from central_lots
          where store_id = $1 and state <> 'discarded'
          order by updated_at desc
          limit 150`,
          [input.storeId],
        ) as unknown as Promise<LotRow[]>,
        sql.query(
          `select central_task_id, active_key, central_lot_id, product_display_name,
            current_location, risk_state, severity, required_resolution, state, owner_label,
            due_at, updated_at
          from central_projected_tasks
          where store_id = $1 and status = 'active'
          order by due_at asc nulls last, updated_at desc
          limit 100`,
          [input.storeId],
        ) as unknown as Promise<TaskRow[]>,
        sql.query(
          `select t.central_task_id, t.central_lot_id, t.product_display_name, l.lot_identity,
            t.current_location, t.resolution_action, t.actor_label, t.resolution_reason,
            t.resolved_at
          from central_projected_tasks t
          join central_lots l on l.central_lot_id = t.central_lot_id and l.store_id = t.store_id
          where t.store_id = $1 and t.status = 'resolved'
          order by t.resolved_at desc
          limit 40`,
          [input.storeId],
        ) as unknown as Promise<ResolvedTaskRow[]>,
        sql.query(
          `select conflict_id, command_id, product_display_name, lot_identity, current_location,
            reason, created_at, state
          from central_sync_conflicts
          where store_id = $1 and state = 'conflict'
          order by created_at desc
          limit 40`,
          [input.storeId],
        ) as unknown as Promise<ConflictRow[]>,
      ]);

      const response = buildPrepareTurnResponse({
        input,
        products: productRows.map(mapProductRow),
        lots: lotRows.map(mapLotRow),
        activeTasks: taskRows.map(mapTaskRow),
        resolvedHistory: resolvedRows.map(mapResolvedRow),
        conflicts: conflictRows.map(mapConflictRow),
      });

      await upsertDeviceSnapshot({
        deviceId: input.request.deviceId,
        storeId: input.storeId,
        preparedAt: new Date(input.request.requestedAt),
        lastCentralReadAt: new Date(input.request.requestedAt),
        lastHydratedAt: new Date(input.request.requestedAt),
        pendingCommandCount: input.request.localSnapshot?.pendingCommandCount ?? 0,
        conflictCount: response.conflicts.length,
        source: "central",
        updatedAt: new Date(input.request.requestedAt),
      });
      await appendPrepareTurnAudit(input, response);

      return response;
    },
    upsertDeviceSnapshot,
    recordPrepareTurnRejected,
  };
}

export function createInMemoryCaptureRepository(input?: {
  products?: readonly StoredProduct[];
  lots?: readonly StoredLot[];
  tasks?: readonly StoredTask[];
  resolvedHistory?: readonly StoredResolved[];
  conflicts?: readonly StoredConflict[];
}): CaptureRepository & {
  readAuditEvents(): readonly Record<string, unknown>[];
  readDeviceSnapshots(): readonly DeviceSnapshotInput[];
} {
  const products = [...(input?.products ?? [])];
  const lots = [...(input?.lots ?? [])];
  const tasks = [...(input?.tasks ?? [])];
  const resolvedHistory = [...(input?.resolvedHistory ?? [])];
  const conflicts = [...(input?.conflicts ?? [])];
  const auditEvents: Record<string, unknown>[] = [];
  const deviceSnapshots = new Map<string, DeviceSnapshotInput>();
  const upsertDeviceSnapshot = async (snapshot: DeviceSnapshotInput): Promise<void> => {
    deviceSnapshots.set(`${snapshot.storeId}:${snapshot.deviceId}`, snapshot);
  };

  return {
    async prepareTurn(prepareInput) {
      const response = buildPrepareTurnResponse({
        input: prepareInput,
        products: products.filter((item) => item.storeId === prepareInput.storeId),
        lots: lots.filter((item) => item.storeId === prepareInput.storeId),
        activeTasks: tasks.filter(
          (item) =>
            item.storeId === prepareInput.storeId && (item.taskStatus ?? "active") === "active",
        ),
        resolvedHistory: resolvedHistory.filter((item) => item.storeId === prepareInput.storeId),
        conflicts: conflicts.filter((item) => item.storeId === prepareInput.storeId),
      });

      await upsertDeviceSnapshot({
        deviceId: prepareInput.request.deviceId,
        storeId: prepareInput.storeId,
        preparedAt: new Date(prepareInput.request.requestedAt),
        lastCentralReadAt: new Date(prepareInput.request.requestedAt),
        lastHydratedAt: new Date(prepareInput.request.requestedAt),
        pendingCommandCount: prepareInput.request.localSnapshot?.pendingCommandCount ?? 0,
        conflictCount: response.conflicts.length,
        source: "central",
        updatedAt: new Date(prepareInput.request.requestedAt),
      });
      auditEvents.push({
        type: "sync.changed",
        storeId: prepareInput.storeId,
        targetId: prepareInput.requestId,
        summary: "Leitura central servida para o aparelho autorizado.",
        sanitized: true,
      });

      return response;
    },
    upsertDeviceSnapshot,
    async recordPrepareTurnRejected(denied) {
      auditEvents.push({
        type: "access.denied",
        storeId: denied.storeId,
        targetId: denied.requestId,
        reason: denied.reason,
        sanitized: true,
      });
    },
    readAuditEvents() {
      return auditEvents;
    },
    readDeviceSnapshots() {
      return [...deviceSnapshots.values()];
    },
  };
}

function buildPrepareTurnResponse(input: {
  input: PrepareTurnInput;
  products: readonly CentralProductSnippet[];
  lots: readonly CentralLotSnippet[];
  activeTasks: readonly ActiveTaskSnippet[];
  resolvedHistory: readonly ResolvedTaskHistorySnippet[];
  conflicts: readonly CentralConflictSnippet[];
}): PrepareTurnResponse {
  const centralFactCount =
    input.products.length +
    input.lots.length +
    input.activeTasks.length +
    input.resolvedHistory.length +
    input.conflicts.length;
  const requestedAt = input.input.request.requestedAt;
  const readiness =
    centralFactCount === 0 ? "needs_review" : input.conflicts.length > 0 ? "blocked" : "prepared";
  const blockers =
    centralFactCount === 0
      ? ["Leitura central sem fatos do turno. Confira a loja antes de declarar area segura."]
      : input.conflicts.length > 0
        ? ["Conflito de sincronizacao exige revisao antes da operacao normal."]
        : [];

  return PrepareTurnResponseSchema.parse({
    requestId: input.input.requestId,
    store: {
      storeId: input.input.storeId,
      storeName: input.input.storeName,
      centralVersion: 1,
      generatedAt: requestedAt,
      ...(centralFactCount > 0 ? { centralReadAt: requestedAt } : {}),
      source: "central",
      readiness,
      blockers,
    },
    device: {
      deviceId: input.input.request.deviceId,
      preparedAt: requestedAt,
      lastCentralReadAt: requestedAt,
      lastHydratedAt: requestedAt,
      pendingCommandCount: input.input.request.localSnapshot?.pendingCommandCount ?? 0,
      conflictCount: input.conflicts.length,
      source: "central",
    },
    cache: {
      state: centralFactCount > 0 ? "ready" : "needs_first_central_read",
      source: "central",
      updatedAt: requestedAt,
      ...(centralFactCount > 0 ? { lastCentralReadAt: requestedAt } : {}),
      staleAfterHours: 4,
      productCount: input.products.length,
      lotCount: input.lots.length,
      activeTaskCount: input.activeTasks.length,
      conflictCount: input.conflicts.length,
      resolvedHistoryCount: input.resolvedHistory.length,
    },
    products: input.products.map(stripStoreId),
    lots: input.lots.map(stripStoreId),
    activeTasks: input.activeTasks.map(stripStoreId),
    resolvedHistory: input.resolvedHistory.map(stripStoreId),
    conflicts: input.conflicts.map(stripStoreId),
  });
}

function mapProductRow(row: ProductRow): CentralProductSnippet {
  return {
    centralProductId: row.central_product_id,
    displayName: row.display_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    status: row.status,
    state: row.state,
    source: "central",
    updatedAt: toIso(row.updated_at),
    ...(row.gtin === null ? {} : { gtin: row.gtin }),
    categoryRuleProfile: parseJson(row.category_rule_profile),
  } as CentralProductSnippet;
}

function mapLotRow(row: LotRow): CentralLotSnippet {
  return {
    centralLotId: row.central_lot_id,
    centralProductId: row.central_product_id,
    productDisplayName: row.product_display_name,
    lotIdentity: parseJson(row.lot_identity),
    mode: row.mode,
    currentLocation: parseJson(row.current_location),
    state: row.state,
    source: row.source,
    ...(row.risk_state === null ? {} : { riskState: row.risk_state }),
    ...(row.expires_at === null ? {} : { expiresAt: row.expires_at }),
    ...(row.received_at === null ? {} : { receivedAt: row.received_at }),
    ...(row.quality_inspection_due_at === null
      ? {}
      : { qualityInspectionDueAt: row.quality_inspection_due_at }),
    ...(row.approximate_quantity === null ? {} : { approximateQuantity: row.approximate_quantity }),
    updatedAt: toIso(row.updated_at),
  } as CentralLotSnippet;
}

function mapTaskRow(row: TaskRow): ActiveTaskSnippet {
  return {
    centralTaskId: row.central_task_id,
    activeKey: row.active_key,
    centralLotId: row.central_lot_id,
    productDisplayName: row.product_display_name,
    currentLocation: parseJson(row.current_location),
    riskState: row.risk_state,
    severity: row.severity,
    requiredResolution: row.required_resolution,
    state: row.state,
    source: "central",
    ownerLabel: row.owner_label,
    ...(row.due_at === null ? {} : { dueAt: toIso(row.due_at) }),
    updatedAt: toIso(row.updated_at),
  } as ActiveTaskSnippet;
}

function mapResolvedRow(row: ResolvedTaskRow): ResolvedTaskHistorySnippet {
  return {
    centralTaskId: row.central_task_id,
    centralLotId: row.central_lot_id,
    productDisplayName: row.product_display_name,
    lotIdentity: parseJson(row.lot_identity),
    currentLocation: parseJson(row.current_location),
    action: row.resolution_action,
    actorLabel: row.actor_label,
    ...(row.resolution_reason === null ? {} : { reason: row.resolution_reason }),
    resolvedAt: toIso(row.resolved_at),
    state: "resolved",
    source: "central",
  } as ResolvedTaskHistorySnippet;
}

function mapConflictRow(row: ConflictRow): CentralConflictSnippet {
  return {
    conflictId: row.conflict_id,
    commandId: row.command_id,
    productDisplayName: row.product_display_name,
    lotIdentity: parseJson(row.lot_identity),
    currentLocation: parseJson(row.current_location),
    reason: row.reason,
    createdAt: toIso(row.created_at),
    state: "conflict",
    source: "central",
  } as CentralConflictSnippet;
}

function stripStoreId<TItem>(item: TItem): Omit<TItem, "storeId"> {
  const rest = { ...(item as Record<string, unknown>) };
  delete rest.storeId;
  delete rest.taskStatus;

  return rest as Omit<TItem, "storeId">;
}

function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
