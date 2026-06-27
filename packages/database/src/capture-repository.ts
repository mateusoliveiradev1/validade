import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  CentralProductAcknowledgementSchema,
  PrepareTurnResponseSchema,
  ProductCatalogItemSchema,
  ProductDraftCreateResponseSchema,
  ProductDraftReviewResponseSchema,
  ProductSearchResponseSchema,
  type ActiveTaskSnippet,
  type CentralProductAcknowledgement,
  type CentralConflictSnippet,
  type CentralLotSnippet,
  type CentralProductSnippet,
  type PrepareTurnRequest,
  type PrepareTurnResponse,
  type ProductCatalogItem,
  type ProductDraftCreateRequest,
  type ProductDraftCreateResponse,
  type ProductDraftReviewRequest,
  type ProductDraftReviewResponse,
  type ProductDraftReviewState,
  type ProductDuplicateReason,
  type ProductReviewStatus,
  type ProductSearchCandidate,
  type ProductSearchRequest,
  type ProductSearchResponse,
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
  reason:
    | "unauthenticated"
    | "inactive_membership"
    | "capability_not_allowed"
    | "outside_store_scope";
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

export interface ProductSearchInput {
  requestId: string;
  storeId: string;
  request: ProductSearchRequest;
}

export interface ProductDraftCreateInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  request: ProductDraftCreateRequest;
}

export interface ProductDraftReviewInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  request: ProductDraftReviewRequest;
}

export interface CaptureRepository {
  prepareTurn(input: PrepareTurnInput): Promise<PrepareTurnResponse>;
  searchProducts(input: ProductSearchInput): Promise<ProductSearchResponse>;
  createProductDraft(input: ProductDraftCreateInput): Promise<ProductDraftCreateResponse>;
  reviewProductDraft(input: ProductDraftReviewInput): Promise<ProductDraftReviewResponse>;
  upsertDeviceSnapshot(input: DeviceSnapshotInput): Promise<void>;
  recordPrepareTurnRejected(input: PrepareTurnDeniedInput): Promise<void>;
}

interface ProductRow {
  store_id?: string;
  central_product_id: string;
  display_name: string;
  normalized_key: string;
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

type StoredProduct = CentralProductSnippet & { storeId: string; normalizedKey?: string };
type StoredProductDraft = ProductDraftReviewState & { storeId: string };
type StoredLot = CentralLotSnippet & { storeId: string };
type StoredTask = ActiveTaskSnippet & {
  storeId: string;
  taskStatus?: "active" | "resolved" | "blocked";
};
type StoredResolved = ResolvedTaskHistorySnippet & { storeId: string };
type StoredConflict = CentralConflictSnippet & { storeId: string };

export function createNeonCaptureRepository(input: {
  connectionString: string;
}): CaptureRepository {
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

  async function appendProductAudit(input: {
    requestId: string;
    storeId: string;
    storeName: string;
    actorId: string;
    actorDisplayName: string;
    actorRoleSnapshot: CaptureActorRoleSnapshot;
    productId: string;
    productLabel: string;
    action: "product.reused" | "product.draft_created" | "product.reviewed";
    summary: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
    reason?: string;
  }): Promise<void> {
    await sql.query(
      `insert into audit_events (
        event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
        actor_role_snapshot, occurred_at, target_type, target_id, target_label, summary,
        reason, status, metadata, sanitized
      ) values ($1, $2, 'sync.changed', $3, $4, $5, $6, $7, $8::timestamptz,
        'product', $9, $10, $11, $12, 'received', $13::jsonb, true
      ) on conflict (idempotency_key) do nothing`,
      [
        `${input.requestId}:audit`,
        `product:${input.action}:${input.requestId}`,
        input.storeId,
        input.storeName,
        input.actorId,
        input.actorDisplayName,
        input.actorRoleSnapshot,
        input.occurredAt,
        input.productId,
        input.productLabel,
        input.summary,
        input.reason ?? null,
        JSON.stringify({
          action: input.action,
          ...sanitizeProductAuditMetadata(input.metadata ?? {}),
        }),
      ],
    );
  }

  async function selectCatalogProducts(input: {
    storeId: string;
    normalizedKey?: string;
    gtin?: string;
    categoryId?: string;
    limit?: number;
  }): Promise<readonly ProductCatalogItem[]> {
    const rows = (await sql.query(
      `select central_product_id, store_id, display_name, normalized_key, category_id,
        category_name, status, state, gtin, category_rule_profile, updated_at
      from central_products
      where store_id = $1
        and status <> 'archived'
        and (
          ($2::text is null and $3::text is null and $4::text is null)
          or ($2::text is not null and (normalized_key = $2 or normalized_key like $5))
          or ($3::text is not null and gtin = $3)
          or ($4::text is not null and category_id = $4)
        )
      order by
        case when normalized_key = $2 then 0 else 1 end,
        case when gtin = $3 then 0 else 1 end,
        updated_at desc,
        display_name asc
      limit $6`,
      [
        input.storeId,
        input.normalizedKey ?? null,
        input.gtin ?? null,
        input.categoryId ?? null,
        input.normalizedKey === undefined ? null : `%${input.normalizedKey}%`,
        input.limit ?? 20,
      ],
    )) as ProductRow[];

    return rows.map(mapCatalogProductRow);
  }

  async function searchProducts(input: ProductSearchInput): Promise<ProductSearchResponse> {
    const normalizedKey = input.request.query && normalizeProductKey(input.request.query);
    const candidates = await selectCatalogProducts({
      storeId: input.storeId,
      ...(normalizedKey === undefined ? {} : { normalizedKey }),
      ...(input.request.gtin === undefined ? {} : { gtin: input.request.gtin }),
      ...(input.request.categoryId === undefined ? {} : { categoryId: input.request.categoryId }),
      limit: 20,
    });

    return buildProductSearchResponse({
      requestId: input.requestId,
      request: input.request,
      products: candidates,
    });
  }

  async function createProductDraft(
    input: ProductDraftCreateInput,
  ): Promise<ProductDraftCreateResponse> {
    const normalizedKey = normalizeProductKey(input.request.displayName);
    const exactMatches = await selectCatalogProducts({
      storeId: input.storeId,
      normalizedKey,
      ...(input.request.gtin === undefined ? {} : { gtin: input.request.gtin }),
      limit: 10,
    });
    const exact = exactMatches.find(
      (candidate) =>
        candidate.normalizedKey === normalizedKey ||
        (input.request.gtin !== undefined && candidate.gtin === input.request.gtin),
    );

    if (exact !== undefined) {
      const response = buildExistingProductCreateResponse({
        requestId: input.requestId,
        normalizedKey,
        product: exact,
        duplicateReason:
          input.request.gtin !== undefined && exact.gtin === input.request.gtin
            ? "gtin"
            : "normalized_name",
      });
      await appendProductAudit({
        requestId: input.requestId,
        storeId: input.storeId,
        storeName: input.storeName,
        actorId: input.actorId,
        actorDisplayName: input.actorDisplayName,
        actorRoleSnapshot: input.actorRoleSnapshot,
        productId: exact.centralProductId,
        productLabel: exact.displayName,
        action: "product.reused",
        summary: "Produto central reutilizado durante criacao de rascunho.",
        occurredAt: input.request.requestedAt,
        metadata: { duplicateReason: response.duplicateReason ?? "normalized_name" },
      });

      return response;
    }

    const similarCandidates = buildSimilarCandidates({
      request: input.request,
      products: await selectCatalogProducts({
        storeId: input.storeId,
        normalizedKey,
        categoryId: input.request.categoryId,
        limit: 10,
      }),
    });
    const acknowledgedSimilarCandidates = new Set(input.request.similarCandidateIds ?? []);

    if (
      similarCandidates.length > 0 &&
      !similarCandidates.every((candidate) =>
        acknowledgedSimilarCandidates.has(candidate.centralProductId),
      )
    ) {
      return ProductDraftCreateResponseSchema.parse({
        requestId: input.requestId,
        normalizedKey,
        outcome: "similar_found",
        similarCandidates,
      });
    }

    const centralProductId = createStableId("product", input.storeId, normalizedKey);
    const draftId = createStableId("draft", input.storeId, normalizedKey);
    const requestedAt = new Date(input.request.requestedAt).toISOString();
    const categoryRuleProfile = JSON.stringify(input.request.categoryRuleProfile);

    await sql.query(
      `insert into central_products (
        central_product_id, store_id, display_name, normalized_key, category_id,
        category_name, status, state, gtin, category_rule_profile, version, created_at, updated_at
      ) values ($1, $2, $3, $4, $5, $6, 'draft', 'pending_central', $7, $8::jsonb, 1, $9::timestamptz, $9::timestamptz)
      on conflict (store_id, normalized_key) do nothing`,
      [
        centralProductId,
        input.storeId,
        input.request.displayName,
        normalizedKey,
        input.request.categoryId,
        input.request.categoryName,
        input.request.gtin ?? null,
        categoryRuleProfile,
        requestedAt,
      ],
    );
    await sql.query(
      `insert into central_product_drafts (
        draft_id, store_id, central_product_id, requested_by, requested_by_label,
        review_status, similar_product_ids, reason, created_at
      ) values ($1, $2, $3, $4, $5, 'pending', $6::jsonb, $7, $8::timestamptz)
      on conflict (draft_id) do nothing`,
      [
        draftId,
        input.storeId,
        centralProductId,
        input.actorId,
        input.actorDisplayName,
        JSON.stringify(similarCandidates.map((candidate) => candidate.centralProductId)),
        input.request.reason ?? null,
        requestedAt,
      ],
    );

    const draft = buildDraftState({
      draftId,
      centralProductId,
      request: input.request,
      normalizedKey,
      requestedByLabel: input.actorDisplayName,
      requestedAt,
      similarCandidates,
    });
    const acknowledgement = buildProductAcknowledgement({
      requestId: input.requestId,
      centralProductId,
      state: "draft_pending_review",
      syncState: "pending_central",
      reviewStatus: "pending_review",
      acknowledgedAt: requestedAt,
      message: "Produto em rascunho. O lote entra com risco conservador ate a validacao.",
    });

    await appendProductAudit({
      requestId: input.requestId,
      storeId: input.storeId,
      storeName: input.storeName,
      actorId: input.actorId,
      actorDisplayName: input.actorDisplayName,
      actorRoleSnapshot: input.actorRoleSnapshot,
      productId: centralProductId,
      productLabel: input.request.displayName,
      action: "product.draft_created",
      summary: "Rascunho operacional de produto criado para revisao central.",
      occurredAt: requestedAt,
      metadata: {
        reviewStatus: "pending_review",
        similarCandidateCount: similarCandidates.length,
      },
    });

    return ProductDraftCreateResponseSchema.parse({
      requestId: input.requestId,
      normalizedKey,
      outcome: "draft_pending_review",
      similarCandidates,
      draft,
      acknowledgement,
    });
  }

  async function reviewProductDraft(
    input: ProductDraftReviewInput,
  ): Promise<ProductDraftReviewResponse> {
    const rows = (await sql.query(
      `select p.central_product_id, p.store_id, p.display_name, p.normalized_key, p.category_id,
        p.category_name, p.status, p.state, p.gtin, p.category_rule_profile, p.updated_at,
        d.draft_id, d.requested_by_label, d.created_at
      from central_product_drafts d
      join central_products p on p.central_product_id = d.central_product_id and p.store_id = d.store_id
      where d.store_id = $1 and d.draft_id = $2
      limit 1`,
      [input.storeId, input.request.draftId],
    )) as (ProductRow & {
      draft_id: string;
      requested_by_label: string;
      created_at: string | Date;
    })[];
    const row = rows[0];

    if (row === undefined) {
      throw new Error("product_draft_not_found");
    }

    const nextReviewStatus = reviewStatusForDecision(input.request.decision);
    const nextProductStatus =
      nextReviewStatus === "validated"
        ? "validated"
        : nextReviewStatus === "discarded"
          ? "archived"
          : "rejected";
    const reviewedAt = new Date(input.request.reviewedAt).toISOString();

    await sql.query(
      `update central_products
      set status = $1, state = $2, updated_at = $3::timestamptz
      where store_id = $4 and central_product_id = $5`,
      [
        nextProductStatus,
        nextReviewStatus === "validated" ? "synchronized" : "discarded",
        reviewedAt,
        input.storeId,
        row.central_product_id,
      ],
    );
    await sql.query(
      `update central_product_drafts
      set review_status = $1, reason = $2, reviewed_at = $3::timestamptz
      where store_id = $4 and draft_id = $5`,
      [
        nextReviewStatus,
        input.request.reason ?? null,
        reviewedAt,
        input.storeId,
        input.request.draftId,
      ],
    );

    const product = mapCatalogProductRow({
      ...row,
      status: nextProductStatus,
      state: nextReviewStatus === "validated" ? "synchronized" : "discarded",
      updated_at: reviewedAt,
    });
    const draft = buildDraftStateFromProduct({
      draftId: input.request.draftId,
      product,
      requestedByLabel: row.requested_by_label,
      requestedAt: toIso(row.created_at),
      reviewStatus: nextReviewStatus,
      ...(input.request.reason === undefined ? {} : { reviewReason: input.request.reason }),
      reviewedAt,
    });
    const acknowledgement = buildProductAcknowledgement({
      requestId: input.requestId,
      centralProductId: product.centralProductId,
      state: nextReviewStatus === "validated" ? "validated" : "discarded",
      syncState: nextReviewStatus === "validated" ? "synchronized" : "discarded",
      reviewStatus: nextReviewStatus,
      acknowledgedAt: reviewedAt,
      message:
        nextReviewStatus === "validated"
          ? "Produto validado para operacao central."
          : "Rascunho de produto encerrado com motivo registrado.",
    });

    await appendProductAudit({
      requestId: input.requestId,
      storeId: input.storeId,
      storeName: input.storeName,
      actorId: input.actorId,
      actorDisplayName: input.actorDisplayName,
      actorRoleSnapshot: input.actorRoleSnapshot,
      productId: product.centralProductId,
      productLabel: product.displayName,
      action: "product.reviewed",
      summary: "Rascunho operacional de produto revisado pela lideranca.",
      occurredAt: reviewedAt,
      ...(input.request.reason === undefined ? {} : { reason: input.request.reason }),
      metadata: {
        decision: input.request.decision,
        reviewStatus: nextReviewStatus,
        mergeIntoCentralProductId: input.request.mergeIntoCentralProductId ?? null,
      },
    });

    return ProductDraftReviewResponseSchema.parse({ draft, acknowledgement });
  }

  return {
    async prepareTurn(input) {
      const [productRows, lotRows, taskRows, resolvedRows, conflictRows] = await Promise.all([
        sql.query(
          `select central_product_id, display_name, normalized_key, category_id, category_name, status, state,
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
    searchProducts,
    createProductDraft,
    reviewProductDraft,
    upsertDeviceSnapshot,
    recordPrepareTurnRejected,
  };
}

export function createInMemoryCaptureRepository(input?: {
  products?: readonly StoredProduct[];
  productDrafts?: readonly StoredProductDraft[];
  lots?: readonly StoredLot[];
  tasks?: readonly StoredTask[];
  resolvedHistory?: readonly StoredResolved[];
  conflicts?: readonly StoredConflict[];
}): CaptureRepository & {
  readAuditEvents(): readonly Record<string, unknown>[];
  readDeviceSnapshots(): readonly DeviceSnapshotInput[];
  readProductDrafts(): readonly StoredProductDraft[];
} {
  const products = [...(input?.products ?? [])];
  const productDrafts = [...(input?.productDrafts ?? [])];
  const lots = [...(input?.lots ?? [])];
  const tasks = [...(input?.tasks ?? [])];
  const resolvedHistory = [...(input?.resolvedHistory ?? [])];
  const conflicts = [...(input?.conflicts ?? [])];
  const auditEvents: Record<string, unknown>[] = [];
  const deviceSnapshots = new Map<string, DeviceSnapshotInput>();
  const upsertDeviceSnapshot = (snapshot: DeviceSnapshotInput): Promise<void> => {
    deviceSnapshots.set(`${snapshot.storeId}:${snapshot.deviceId}`, snapshot);
    return Promise.resolve();
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
    searchProducts(searchInput) {
      const storeProducts = products
        .filter((item) => item.storeId === searchInput.storeId)
        .map(toCatalogItem);

      return Promise.resolve(
        buildProductSearchResponse({
          requestId: searchInput.requestId,
          request: searchInput.request,
          products: storeProducts,
        }),
      );
    },
    createProductDraft(createInput) {
      const normalizedKey = normalizeProductKey(createInput.request.displayName);
      const storeProducts = products.filter((item) => item.storeId === createInput.storeId);
      const exact = storeProducts
        .map(toCatalogItem)
        .find(
          (candidate) =>
            candidate.normalizedKey === normalizedKey ||
            (createInput.request.gtin !== undefined && candidate.gtin === createInput.request.gtin),
        );

      if (exact !== undefined) {
        const response = buildExistingProductCreateResponse({
          requestId: createInput.requestId,
          normalizedKey,
          product: exact,
          duplicateReason:
            createInput.request.gtin !== undefined && exact.gtin === createInput.request.gtin
              ? "gtin"
              : "normalized_name",
        });
        auditEvents.push(
          productAuditEvent(createInput, {
            productId: exact.centralProductId,
            productLabel: exact.displayName,
            action: "product.reused",
            summary: "Produto central reutilizado durante criacao de rascunho.",
            metadata: { duplicateReason: response.duplicateReason ?? "normalized_name" },
          }),
        );

        return Promise.resolve(response);
      }

      const similarCandidates = buildSimilarCandidates({
        request: createInput.request,
        products: storeProducts.map(toCatalogItem),
      });
      const acknowledgedSimilarCandidates = new Set(createInput.request.similarCandidateIds ?? []);

      if (
        similarCandidates.length > 0 &&
        !similarCandidates.every((candidate) =>
          acknowledgedSimilarCandidates.has(candidate.centralProductId),
        )
      ) {
        return Promise.resolve(
          ProductDraftCreateResponseSchema.parse({
            requestId: createInput.requestId,
            normalizedKey,
            outcome: "similar_found",
            similarCandidates,
          }),
        );
      }

      const centralProductId = createStableId("product", createInput.storeId, normalizedKey);
      const draftId = createStableId("draft", createInput.storeId, normalizedKey);
      const requestedAt = new Date(createInput.request.requestedAt).toISOString();
      const existingDraft = productDrafts.find(
        (draft) =>
          draft.storeId === createInput.storeId &&
          (draft.normalizedKey === normalizedKey ||
            (createInput.request.gtin !== undefined && draft.gtin === createInput.request.gtin)),
      );
      const draft =
        existingDraft ??
        buildDraftState({
          draftId,
          centralProductId,
          request: createInput.request,
          normalizedKey,
          requestedByLabel: createInput.actorDisplayName,
          requestedAt,
          similarCandidates,
        });

      if (existingDraft === undefined) {
        productDrafts.push({ ...draft, storeId: createInput.storeId });
        products.push({
          storeId: createInput.storeId,
          centralProductId,
          displayName: createInput.request.displayName,
          categoryId: createInput.request.categoryId,
          categoryName: createInput.request.categoryName,
          status: "draft",
          state: "pending_central",
          source: "central",
          updatedAt: requestedAt,
          ...(createInput.request.gtin === undefined ? {} : { gtin: createInput.request.gtin }),
          categoryRuleProfile: createInput.request.categoryRuleProfile,
          normalizedKey,
        });
      }

      const acknowledgement = buildProductAcknowledgement({
        requestId: createInput.requestId,
        centralProductId: draft.centralProductId,
        state: "draft_pending_review",
        syncState: "pending_central",
        reviewStatus: "pending_review",
        acknowledgedAt: requestedAt,
        message: "Produto em rascunho. O lote entra com risco conservador ate a validacao.",
      });
      auditEvents.push(
        productAuditEvent(createInput, {
          productId: draft.centralProductId,
          productLabel: draft.displayName,
          action: "product.draft_created",
          summary: "Rascunho operacional de produto criado para revisao central.",
          metadata: {
            reviewStatus: "pending_review",
            similarCandidateCount: similarCandidates.length,
          },
        }),
      );

      return Promise.resolve(
        ProductDraftCreateResponseSchema.parse({
          requestId: createInput.requestId,
          normalizedKey,
          outcome: "draft_pending_review",
          similarCandidates,
          draft,
          acknowledgement,
        }),
      );
    },
    reviewProductDraft(reviewInput) {
      const draftIndex = productDrafts.findIndex(
        (draft) =>
          draft.storeId === reviewInput.storeId && draft.draftId === reviewInput.request.draftId,
      );

      if (draftIndex === -1) {
        return Promise.reject(new Error("product_draft_not_found"));
      }

      const currentDraft = productDrafts[draftIndex] as StoredProductDraft;
      const reviewStatus = reviewStatusForDecision(reviewInput.request.decision);
      const reviewedAt = new Date(reviewInput.request.reviewedAt).toISOString();
      const reviewReason = reviewInput.request.reason ?? currentDraft.reviewReason;
      const reviewedDraft = buildDraftStateFromProduct({
        draftId: currentDraft.draftId,
        product: {
          centralProductId: currentDraft.centralProductId,
          displayName: currentDraft.displayName,
          normalizedKey: currentDraft.normalizedKey,
          categoryId: currentDraft.categoryId,
          categoryName: currentDraft.categoryName,
          categoryRuleProfile: currentDraft.categoryRuleProfile,
          source: "draft_pending_review",
          reviewStatus,
          syncState: reviewStatus === "validated" ? "synchronized" : "discarded",
          updatedAt: reviewedAt,
          ...(currentDraft.gtin === undefined ? {} : { gtin: currentDraft.gtin }),
        },
        requestedByLabel: currentDraft.requestedByLabel,
        requestedAt: currentDraft.requestedAt,
        reviewStatus,
        ...(reviewReason === undefined ? {} : { reviewReason }),
        reviewedAt,
      });
      productDrafts[draftIndex] = { ...reviewedDraft, storeId: reviewInput.storeId };

      const productIndex = products.findIndex(
        (product) =>
          product.storeId === reviewInput.storeId &&
          product.centralProductId === currentDraft.centralProductId,
      );

      if (productIndex !== -1) {
        const currentProduct = products[productIndex] as StoredProduct;
        products[productIndex] = {
          ...currentProduct,
          status:
            reviewStatus === "validated"
              ? "validated"
              : reviewStatus === "discarded"
                ? "archived"
                : "rejected",
          state: reviewStatus === "validated" ? "synchronized" : "discarded",
          updatedAt: reviewedAt,
        };
      }

      const acknowledgement = buildProductAcknowledgement({
        requestId: reviewInput.requestId,
        centralProductId: currentDraft.centralProductId,
        state: reviewStatus === "validated" ? "validated" : "discarded",
        syncState: reviewStatus === "validated" ? "synchronized" : "discarded",
        reviewStatus,
        acknowledgedAt: reviewedAt,
        message:
          reviewStatus === "validated"
            ? "Produto validado para operacao central."
            : "Rascunho de produto encerrado com motivo registrado.",
      });
      auditEvents.push(
        productAuditEvent(reviewInput, {
          productId: currentDraft.centralProductId,
          productLabel: currentDraft.displayName,
          action: "product.reviewed",
          summary: "Rascunho operacional de produto revisado pela lideranca.",
          ...(reviewInput.request.reason === undefined
            ? {}
            : { reason: reviewInput.request.reason }),
          metadata: {
            decision: reviewInput.request.decision,
            reviewStatus,
            mergeIntoCentralProductId: reviewInput.request.mergeIntoCentralProductId ?? null,
          },
        }),
      );

      return Promise.resolve(
        ProductDraftReviewResponseSchema.parse({
          draft: reviewedDraft,
          acknowledgement,
        }),
      );
    },
    upsertDeviceSnapshot,
    recordPrepareTurnRejected(denied) {
      auditEvents.push({
        type: "access.denied",
        storeId: denied.storeId,
        targetId: denied.requestId,
        reason: denied.reason,
        sanitized: true,
      });
      return Promise.resolve();
    },
    readAuditEvents() {
      return auditEvents;
    },
    readDeviceSnapshots() {
      return [...deviceSnapshots.values()];
    },
    readProductDrafts() {
      return productDrafts;
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

function mapCatalogProductRow(row: ProductRow): ProductCatalogItem {
  return ProductCatalogItemSchema.parse({
    centralProductId: row.central_product_id,
    displayName: row.display_name,
    normalizedKey: row.normalized_key,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryRuleProfile: parseJson(row.category_rule_profile),
    source: row.status === "draft" ? "draft_pending_review" : "central",
    reviewStatus: productReviewStatusFromCentralStatus(row.status),
    syncState: row.state,
    updatedAt: toIso(row.updated_at),
    ...(row.gtin === null ? {} : { gtin: row.gtin }),
  });
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

function buildProductSearchResponse(input: {
  requestId: string;
  request: ProductSearchRequest;
  products: readonly ProductCatalogItem[];
}): ProductSearchResponse {
  const normalizedQuery =
    input.request.query === undefined ? undefined : normalizeProductKey(input.request.query);
  const exactMatches = input.products.filter((product) =>
    isExactCatalogMatch(product, {
      ...input.request,
      ...(normalizedQuery === undefined ? {} : { normalizedQuery }),
    }),
  );
  const draftMatch = exactMatches.find((product) => product.reviewStatus === "pending_review");
  const reusableProducts = exactMatches
    .filter((product) => product.reviewStatus === "validated")
    .map((product) =>
      productSearchCandidate(
        product,
        "reusable_central",
        exactMatchReasons(product, input.request),
      ),
    );
  const similarCandidates = buildSimilarCandidates({
    request: input.request,
    products: input.products.filter(
      (product) =>
        !exactMatches.some((exact) => exact.centralProductId === product.centralProductId),
    ),
  });
  const draft =
    draftMatch === undefined
      ? undefined
      : buildDraftStateFromProduct({
          draftId: createStableId("draft", "catalog", draftMatch.centralProductId),
          product: draftMatch,
          requestedByLabel: "Catalogo central",
          requestedAt: draftMatch.updatedAt,
          reviewStatus: "pending_review",
        });

  return ProductSearchResponseSchema.parse({
    requestId: input.requestId,
    ...(normalizedQuery === undefined ? {} : { normalizedQuery }),
    resultState:
      reusableProducts.length > 0
        ? "reuse_available"
        : draft !== undefined
          ? "draft_pending_review"
          : similarCandidates.length > 0
            ? "similar_requires_review"
            : "no_safe_reuse",
    reusableProducts,
    similarCandidates,
    ...(draft === undefined ? {} : { draft }),
  });
}

function buildSimilarCandidates(input: {
  request: ProductDraftCreateRequest | ProductSearchRequest;
  products: readonly ProductCatalogItem[];
}): readonly ProductSearchCandidate[] {
  const normalizedQuery =
    "displayName" in input.request
      ? normalizeProductKey(input.request.displayName)
      : input.request.query === undefined
        ? undefined
        : normalizeProductKey(input.request.query);
  const categoryId = input.request.categoryId;
  const tokens = normalizedQuery?.split(" ").filter((token) => token.length >= 3) ?? [];

  return input.products
    .filter((product) => {
      if (normalizedQuery !== undefined && product.normalizedKey === normalizedQuery) return false;
      if (
        "gtin" in input.request &&
        input.request.gtin !== undefined &&
        product.gtin === input.request.gtin
      ) {
        return false;
      }

      const sharesToken = tokens.some((token) => product.normalizedKey.includes(token));
      const sharesCategory =
        categoryId !== undefined && product.categoryId === categoryId && sharesToken;

      return sharesToken || sharesCategory;
    })
    .slice(0, 10)
    .map((product) =>
      productSearchCandidate(
        product,
        "similar_candidate",
        similarMatchReasons(product, {
          ...(normalizedQuery === undefined ? {} : { normalizedQuery }),
          ...(categoryId === undefined ? {} : { categoryId }),
        }),
        {
          similarityScore: estimateSimilarity(product.normalizedKey, normalizedQuery),
          warning: "Produto parecido encontrado. Reutilize se for o mesmo item.",
        },
      ),
    );
}

function buildExistingProductCreateResponse(input: {
  requestId: string;
  normalizedKey: string;
  product: ProductCatalogItem;
  duplicateReason: ProductDuplicateReason;
}): ProductDraftCreateResponse {
  if (input.product.reviewStatus === "pending_review") {
    const draft = buildDraftStateFromProduct({
      draftId: createStableId("draft", "catalog", input.product.centralProductId),
      product: input.product,
      requestedByLabel: "Catalogo central",
      requestedAt: input.product.updatedAt,
      reviewStatus: "pending_review",
    });

    return ProductDraftCreateResponseSchema.parse({
      requestId: input.requestId,
      normalizedKey: input.normalizedKey,
      outcome: "draft_pending_review",
      similarCandidates: [],
      draft,
      acknowledgement: buildProductAcknowledgement({
        requestId: input.requestId,
        centralProductId: input.product.centralProductId,
        state: "draft_pending_review",
        syncState: "pending_central",
        reviewStatus: "pending_review",
        acknowledgedAt: input.product.updatedAt,
        message: "Produto em rascunho ja existe e segue pendente de validacao.",
      }),
    });
  }

  return ProductDraftCreateResponseSchema.parse({
    requestId: input.requestId,
    normalizedKey: input.normalizedKey,
    outcome: "reuse_existing",
    duplicateReason: input.duplicateReason,
    reusableProduct: input.product,
    similarCandidates: [],
  });
}

function buildDraftState(input: {
  draftId: string;
  centralProductId: string;
  request: ProductDraftCreateRequest;
  normalizedKey: string;
  requestedByLabel: string;
  requestedAt: string;
  similarCandidates: readonly ProductSearchCandidate[];
}): ProductDraftReviewState {
  return {
    draftId: input.draftId,
    centralProductId: input.centralProductId,
    displayName: input.request.displayName,
    normalizedKey: input.normalizedKey,
    categoryId: input.request.categoryId,
    categoryName: input.request.categoryName,
    categoryRuleProfile: input.request.categoryRuleProfile,
    source: "draft_pending_review",
    reviewStatus: "pending_review",
    syncState: "pending_central",
    requestedByLabel: input.requestedByLabel,
    requestedAt: input.requestedAt,
    similarCandidates: [...input.similarCandidates],
    ...(input.request.gtin === undefined ? {} : { gtin: input.request.gtin }),
  };
}

function buildDraftStateFromProduct(input: {
  draftId: string;
  product: ProductCatalogItem;
  requestedByLabel: string;
  requestedAt: string;
  reviewStatus: ProductReviewStatus;
  reviewReason?: string;
  reviewedAt?: string;
}): ProductDraftReviewState {
  return {
    draftId: input.draftId,
    centralProductId: input.product.centralProductId,
    displayName: input.product.displayName,
    normalizedKey: input.product.normalizedKey,
    categoryId: input.product.categoryId,
    categoryName: input.product.categoryName,
    categoryRuleProfile: input.product.categoryRuleProfile,
    source: "draft_pending_review",
    reviewStatus: input.reviewStatus,
    syncState: input.product.syncState,
    requestedByLabel: input.requestedByLabel,
    requestedAt: input.requestedAt,
    similarCandidates: [],
    ...(input.product.gtin === undefined ? {} : { gtin: input.product.gtin }),
    ...(input.reviewStatus === "pending_review"
      ? {}
      : {
          reviewReason:
            input.reviewReason ??
            (input.reviewStatus === "validated"
              ? "Produto validado para operacao central."
              : "Rascunho encerrado pela revisao central."),
        }),
    ...(input.reviewedAt === undefined ? {} : { reviewedAt: input.reviewedAt }),
  };
}

function buildProductAcknowledgement(input: {
  requestId: string;
  centralProductId: string;
  state: CentralProductAcknowledgement["state"];
  syncState: VisibleCentralSyncState;
  reviewStatus: ProductReviewStatus;
  acknowledgedAt: string;
  message: string;
}): CentralProductAcknowledgement {
  return CentralProductAcknowledgementSchema.parse({
    acknowledgementId: `${input.requestId}:ack`,
    centralProductId: input.centralProductId,
    state: input.state,
    syncState: input.syncState,
    reviewStatus: input.reviewStatus,
    acknowledgedAt: input.acknowledgedAt,
    message: input.message,
  });
}

function toCatalogItem(product: StoredProduct): ProductCatalogItem {
  return ProductCatalogItemSchema.parse({
    centralProductId: product.centralProductId,
    displayName: product.displayName,
    normalizedKey: product.normalizedKey ?? normalizeProductKey(product.displayName),
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    categoryRuleProfile: product.categoryRuleProfile,
    source: product.status === "draft" ? "draft_pending_review" : "central",
    reviewStatus: productReviewStatusFromCentralStatus(product.status),
    syncState: product.state,
    updatedAt: product.updatedAt,
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
  });
}

function productSearchCandidate(
  product: ProductCatalogItem,
  matchKind: ProductSearchCandidate["matchKind"],
  matchReasons: readonly ProductSearchCandidate["matchReasons"][number][],
  extras: Partial<ProductSearchCandidate> = {},
): ProductSearchCandidate {
  return {
    ...product,
    matchKind,
    matchReasons: [...matchReasons],
    ...extras,
  };
}

function isExactCatalogMatch(
  product: ProductCatalogItem,
  request: ProductSearchRequest & { normalizedQuery?: string },
): boolean {
  return (
    (request.normalizedQuery !== undefined && product.normalizedKey === request.normalizedQuery) ||
    (request.gtin !== undefined && product.gtin === request.gtin)
  );
}

function exactMatchReasons(
  product: ProductCatalogItem,
  request: ProductSearchRequest,
): ProductSearchCandidate["matchReasons"] {
  const normalizedQuery =
    request.query === undefined ? undefined : normalizeProductKey(request.query);
  const reasons: ProductSearchCandidate["matchReasons"] = [];

  if (normalizedQuery !== undefined && product.normalizedKey === normalizedQuery) {
    reasons.push("exact_normalized_name");
  }

  if (request.gtin !== undefined && product.gtin === request.gtin) {
    reasons.push("exact_gtin");
  }

  return reasons.length === 0 ? ["exact_normalized_name"] : reasons;
}

function similarMatchReasons(
  product: ProductCatalogItem,
  input: { normalizedQuery?: string; categoryId?: string },
): ProductSearchCandidate["matchReasons"] {
  const reasons: ProductSearchCandidate["matchReasons"] = ["similar_name"];

  if (input.categoryId !== undefined && product.categoryId === input.categoryId) {
    reasons.push("similar_category");
  }

  return reasons;
}

function estimateSimilarity(
  productKey: string,
  requestedKey: string | undefined,
): number | undefined {
  if (requestedKey === undefined) return undefined;
  const productTokens = new Set(productKey.split(" "));
  const requestedTokens = requestedKey.split(" ");
  const overlap = requestedTokens.filter((token) => productTokens.has(token)).length;

  return Math.min(1, Math.max(0.1, overlap / Math.max(1, requestedTokens.length)));
}

function productReviewStatusFromCentralStatus(
  status: CentralProductSnippet["status"],
): ProductReviewStatus {
  if (status === "draft") return "pending_review";
  if (status === "rejected") return "rejected";
  if (status === "archived") return "discarded";
  return "validated";
}

function reviewStatusForDecision(
  decision: ProductDraftReviewRequest["decision"],
): ProductReviewStatus {
  if (decision === "approve") return "validated";
  if (decision === "reject") return "rejected";
  return "discarded";
}

function normalizeProductKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .slice(0, 160);
}

function createStableId(prefix: string, storeId: string, value: string): string {
  return `${prefix}:${storeId}:${value}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function productAuditEvent(
  input: ProductDraftCreateInput | ProductDraftReviewInput,
  event: {
    productId: string;
    productLabel: string;
    action: "product.reused" | "product.draft_created" | "product.reviewed";
    summary: string;
    metadata?: Record<string, unknown>;
    reason?: string;
  },
): Record<string, unknown> {
  return {
    type: "sync.changed",
    storeId: input.storeId,
    targetType: "product",
    targetId: event.productId,
    targetLabel: event.productLabel,
    action: event.action,
    summary: event.summary,
    ...(event.reason === undefined ? {} : { reason: event.reason }),
    metadata: sanitizeProductAuditMetadata(event.metadata ?? {}),
    sanitized: true,
  };
}

function sanitizeProductAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (
      key.toLocaleLowerCase("en-US").includes("token") ||
      key.toLocaleLowerCase("en-US").includes("authorization") ||
      key.toLocaleLowerCase("en-US").includes("payload")
    ) {
      continue;
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
