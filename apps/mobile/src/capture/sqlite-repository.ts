import {
  AlertDeliveryResultSchema,
  AuditTimelineItemSchema,
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  DevicePushRegistrationCommandSchema,
  FutureAttentionRecordSchema,
  MarkdownWorkflowRecordSchema,
  OperationalLocationSchema,
  PhysicalObservationInputSchema,
  PrepareTurnCacheStatusSchema,
  ProductDraftCreateResponseSchema,
  ProductSearchResponseSchema,
  PushOpenIntentSchema,
  TaskAlertStateRecordSchema,
  type ActiveTaskSnippet,
  type AuditTimelineItem,
  type CaptureLotInput,
  type CaptureProductInput,
  type CentralResolvedTaskHistory,
  type CentralLotSnapshot,
  type CentralLotSnippet,
  type CentralLotTaskProjectionSummary,
  type CentralLotWriteResponse,
  type CentralProductSnippet,
  type DevicePushRegistrationCommand,
  type FutureAttentionRecord,
  type MarkdownWorkflowRecord,
  type OfflineActionCommand,
  type OfflineCacheStatus,
  type OperationalLocation,
  type PhysicalObservationInput,
  type PrepareTurnCacheStatus,
  type PrepareTurnResponse,
  type ProductCatalogItem,
  type ProductDraftCreateRequest,
  type ProductDraftReviewState,
  type ProductIdentifier,
  type ProductIdentifierInput,
  type ProductSearchCandidate,
  type ProductSearchRequest,
  type ProductSearchResponse,
  type PushOpenIntent,
  type SyncCommandRecord,
  type SyncConflictRecord,
  type SyncQueueSummary,
  type SyncTransportResult,
  type ResolvedTaskHistorySnippet,
  type ShiftCloseUnsafeRequest,
  type TaskAlertStateRecord,
  type TaskResolutionCommand,
  type TodayTaskRecord,
} from "@validade-zero/contracts";
import * as SQLite from "expo-sqlite";
import type {
  AcknowledgeEscalationInput,
  CaptureLotDetail,
  CaptureLotSnapshot,
  CaptureObservationRecord,
  CaptureProductCategory,
  CaptureProductRecord,
  CaptureRepository,
  CaptureRepositoryDependencies,
  EvidenceUploadQueueRecord,
  RecordAlertAttemptInput,
  QueueEvidenceUploadInput,
  QueueUnsafeShiftCloseInput,
  RecentLotsQuery,
  RefreshTaskAlertStatesInput,
  ResolvePushOpenIntentInput,
  ResolveSyncConflictInput,
  RefreshTodayTasksInput,
  LocalOnboardingProgressRecord,
  OnboardingProgressKey,
  SaveLotInput,
  SaveLocalOnboardingProgressInput,
  TodayTaskRefreshResult,
  ShiftCloseOutboxRecord,
} from "./repository";
import {
  assertRecheckResolutionHasEvidence,
  appendTaskResolutionHistoryEntry,
  alertChannelStateForRegistration,
  applyAlertDeliveryResult,
  calculateAssessmentForLot,
  createFutureAttentionRecord,
  createInitialObservation,
  createMarkdownStageTodayTaskRecord,
  createSalesAreaRecheckTask,
  createTodayTaskRecord,
  deriveMarkdownEntryState,
  deriveRefreshedTaskAlertState,
  deriveTaskCandidateFromLot,
  maxPhysicalConfirmationAgeHoursForLot,
  isPendingCentralProduct,
  localLotCentralSyncMetadata,
  nextGeneratedId,
  normalizeProductLookup,
  PendingCentralLotSyncError,
  pendingCentralLotWriteBlocker,
  categoryCatalogItemToLocalCategory,
  parseMarkdownApplicationCommand,
  parseMarkdownApprovalCommand,
  parseMarkdownRequestCommand,
  parseMarkdownShelfConfirmationCommand,
  parseOfflineActionCommand,
  parseOfflineCacheStatus,
  parseLocalOnboardingProgressRecord,
  parsePrepareTurnCacheStatus,
  parsePrepareTurnResponse,
  parseProductDraftCreateRequest,
  parseLotId,
  parseLotInput,
  parseCentralLotCreateRequest,
  parseCentralLotTaskProjectionSummary,
  parseCentralLotWriteResponse,
  parseObservationInput,
  parseProductCategoryId,
  parseProductInput,
  parseProductSearchRequest,
  parseRecentLotsQuery,
  parseTaskResolutionCommand,
  parsePushOpenIntent,
  parseSyncCommandRecord,
  parseSyncConflictRecord,
  parseSyncQueueSummary,
  parseSyncTransportResult,
  parseAuditTimelineItem,
  parseTodayTaskRecord,
  shouldPreserveLocalResolutionProjection,
  shouldCreateSalesAreaRecheck,
  sortTodayTasks,
} from "./repository";
import {
  canStartMarkdownWorkflow,
  classifySyncCommandUrgency,
  deriveOfflineCacheState,
  sortSyncQueueItems,
} from "@validade-zero/domain";
import { createDeviceInstallId } from "./device-identity";
import {
  ensureCaptureLotCentralColumns,
  ensureProductCatalogColumns,
  ensureTodayTaskMarkdownColumns,
  ensureTodayTaskSyncColumns,
} from "./sqlite-migrations";

const OFFLINE_CACHE_STALE_AFTER_HOURS = 4;

interface ProductRow {
  id: string;
  display_name: string;
  normalized_name: string;
  category_id: string;
  category_name: string | null;
  category_profile_json: string;
  supplier_name: string | null;
  gtin: string | null;
  identifiers_json: string | null;
  product_override_json: string | null;
  central_product_id: string | null;
  catalog_source: string | null;
  review_status: string | null;
  central_sync_state: string | null;
  draft_id: string | null;
  draft_review_message: string | null;
  similar_candidate_count: number | null;
  created_at: string;
}

interface ProductCategoryRow {
  category_id: string;
  category_name: string;
  category_profile_json: string;
  product_count: number;
}

interface LotRow {
  id: string;
  product_id: string;
  product_display_name: string;
  identity_source: string;
  identity_value: string;
  mode: string;
  expires_at: string | null;
  received_at: string | null;
  quality_inspection_due_at: string | null;
  quality_window_days: number | null;
  approximate_quantity: number;
  initial_location_kind: string;
  initial_location_custom_name: string | null;
  current_observation_id: string;
  current_status: string;
  current_actor_label: string;
  current_occurred_at: string;
  current_location_kind: string;
  current_location_custom_name: string | null;
  current_quantity_state: string;
  current_approximate_quantity: number | null;
  current_is_correction: number;
  current_correction_reason: string | null;
  central_lot_id: string | null;
  central_sync_state: string | null;
  central_source: string | null;
  task_projection_json: string | null;
  central_ack_message: string | null;
}

interface ObservationRow {
  id: string;
  lot_id: string;
  status: string;
  actor_label: string;
  occurred_at: string;
  location_kind: string;
  location_custom_name: string | null;
  quantity_state: string;
  approximate_quantity: number | null;
  is_correction: number;
  correction_reason: string | null;
}

interface TodayTaskRow {
  id: string;
  active_key: string;
  lot_id: string;
  product_display_name: string;
  lot_identity_source: string;
  lot_identity_value: string;
  current_location_kind: string;
  current_location_custom_name: string | null;
  risk_state: string;
  severity: string;
  due_bucket: string;
  required_resolution: string;
  section: string;
  owner_label: string;
  status: string;
  source_risk_json: string;
  priority: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  recheck_parent_id: string | null;
  markdown_workflow_id: string | null;
  markdown_stage: string | null;
  responsible_actor_label: string | null;
  resolution_history_json: string | null;
  sync_json: string | null;
}

interface MarkdownWorkflowRow {
  id: string;
  lot_id: string;
  status: string;
  current_stage: string;
  request_reason: string;
  early_justification: string | null;
  requested_at: string;
  requested_by: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  applied_at: string | null;
  applied_by: string | null;
  application_evidence_json: string | null;
  shelf_confirmed_at: string | null;
  shelf_confirmed_by: string | null;
  shelf_confirmation_evidence_json: string | null;
  stage_history_json: string;
  created_at: string;
  updated_at: string;
}

interface FutureAttentionRow {
  id: string;
  lot_id: string;
  product_display_name: string;
  lot_identity_source: string;
  lot_identity_value: string;
  current_location_kind: string;
  current_location_custom_name: string | null;
  source_risk_reasons_json: string;
  observed_at: string;
}

interface DeviceInstallationRow {
  scope: string;
  install_id: string;
  created_at: string;
  updated_at: string;
}

interface AlertDeviceRow {
  device_id: string;
  device_label: string;
  audience_role: string;
  permission_status: string;
  expo_push_token: string | null;
  registered_at: string;
  updated_at: string;
}

interface TaskAlertStateRow {
  task_id: string;
  task_active_key: string;
  channel_state: string;
  attempt_state: string;
  audience: string;
  escalation_state: string;
  created_at: string;
  updated_at: string;
  last_reminder_at: string | null;
  next_reminder_at: string | null;
  escalated_at: string | null;
  leadership_acknowledged_at: string | null;
  retry_count: number | null;
  failure_reason: string | null;
  last_attempt_id: string | null;
}

interface OfflineCacheStatusRow {
  id: string;
  state: string;
  last_refreshed_at: string | null;
  active_task_count: number;
  required_lot_snippet_count: number;
  stale_after_hours: number;
  source: string;
  updated_at: string;
}

interface PrepareTurnCacheStatusRow {
  id: string;
  state: string;
  source: string;
  updated_at: string;
  last_central_read_at: string | null;
  stale_after_hours: number;
  product_count: number;
  lot_count: number;
  active_task_count: number;
  conflict_count: number;
  resolved_history_count: number;
}

interface OnboardingProgressRow {
  subject_id: string;
  store_id: string;
  flow_id: string;
  version: string;
  status: string;
  completed_at: string | null;
  skipped_at: string | null;
  updated_at: string;
}

interface EvidenceUploadRow {
  local_evidence_id: string;
  task_id: string;
  store_id: string;
  target_json: string;
  local_uri: string;
  mime_type: EvidenceUploadQueueRecord["mimeType"];
  size_bytes: number;
  sha256: string;
  captured_at: string;
  state: EvidenceUploadQueueRecord["state"];
  created_at: string;
  updated_at: string;
  attempt_count: number;
  asset_id: string | null;
  upload_path: string | null;
  uploaded_at: string | null;
  retention_expires_at: string | null;
  last_error: string | null;
}

interface ShiftCloseOutboxRow {
  local_close_id: string;
  request_json: string;
  state: ShiftCloseOutboxRecord["state"];
  created_at: string;
  updated_at: string;
  attempt_count: number;
  server_closure_id: string | null;
  last_error: string | null;
}

interface SyncCommandRow {
  id: string;
  idempotency_key: string;
  kind: string;
  state: string;
  urgency: string;
  payload_json: string;
  task_id: string;
  task_active_key: string;
  lot_id: string;
  product_display_name: string;
  lot_identity_source: string;
  lot_identity_value: string;
  current_location_kind: string;
  current_location_custom_name: string | null;
  risk_state: string;
  required_resolution: string;
  created_at: string;
  updated_at: string;
  saved_at: string;
  first_attempted_at: string | null;
  last_attempted_at: string | null;
  attempt_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  acked_at: string | null;
  conflict_id: string | null;
  discarded_at: string | null;
  discard_reason: string | null;
}

interface SyncConflictRow {
  id: string;
  command_id: string;
  severity: string;
  reason: string;
  local_action_json: string;
  remote_change_json: string;
  allowed_actions_json: string;
  created_at: string;
  resolved_at: string | null;
  resolution_action: string | null;
  resolution_reason: string | null;
}

interface LocalAuditEventRow {
  event_id: string;
  idempotency_key: string;
  type: string;
  store_id: string;
  store_name: string;
  actor_id: string;
  actor_display_name: string;
  actor_role_snapshot: string;
  target_type: string;
  target_id: string;
  target_label: string | null;
  occurred_at: string;
  received_at: string | null;
  summary: string;
  reason: string | null;
  status: string;
  linked_event_id: string | null;
  metadata_json: string;
}

const LOT_SELECT = `
  SELECT
    l.id,
    l.product_id,
    p.display_name AS product_display_name,
    l.identity_source,
    l.identity_value,
    l.mode,
    l.expires_at,
    l.received_at,
    l.quality_inspection_due_at,
    l.quality_window_days,
    l.approximate_quantity,
    l.initial_location_kind,
    l.initial_location_custom_name,
    l.current_observation_id,
    l.current_status,
    l.current_actor_label,
    l.current_occurred_at,
    l.current_location_kind,
    l.current_location_custom_name,
    l.current_quantity_state,
    l.current_approximate_quantity,
    l.current_is_correction,
    l.current_correction_reason,
    l.central_lot_id,
    l.central_sync_state,
    l.central_source,
    l.task_projection_json,
    l.central_ack_message
  FROM capture_lots l
  INNER JOIN capture_products p ON p.id = l.product_id
`;

export function createSQLiteCaptureRepository(
  dependencies: CaptureRepositoryDependencies,
  databaseName = "validade-zero-capture.db",
): CaptureRepository {
  let database: SQLite.SQLiteDatabase | undefined;
  let initialization: Promise<void> | undefined;

  async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    database ??= await SQLite.openDatabaseAsync(databaseName);

    return database;
  }

  async function initialize(): Promise<void> {
    initialization ??= initializeDatabase(getDatabase);

    return initialization;
  }

  async function getOrCreateDeviceInstallId(): Promise<string> {
    await initialize();
    const db = await getDatabase();
    const scope = "app";
    const existing = await db.getFirstAsync<DeviceInstallationRow>(
      "SELECT * FROM device_installations WHERE scope = ?",
      scope,
    );

    if (existing !== null) {
      return existing.install_id;
    }

    const timestamp = dependencies.clock();
    const installId = createDeviceInstallId(dependencies.createId);
    await db.runAsync(
      `INSERT OR IGNORE INTO device_installations (scope, install_id, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      scope,
      installId,
      timestamp,
      timestamp,
    );
    const saved = await db.getFirstAsync<DeviceInstallationRow>(
      "SELECT * FROM device_installations WHERE scope = ?",
      scope,
    );

    return saved?.install_id ?? installId;
  }

  async function hydratePrepareTurn(response: PrepareTurnResponse): Promise<void> {
    await initialize();
    const prepared = parsePrepareTurnResponse(response);
    const db = await getDatabase();
    const lotsById = new Map(prepared.lots.map((lot) => [lot.centralLotId, lot]));
    const activeCentralTaskIds = new Set(prepared.activeTasks.map((task) => task.centralTaskId));
    const activeCentralLotIds = new Set(prepared.activeTasks.map((task) => task.centralLotId));
    const preparedCentralLotIds = new Set(prepared.lots.map((lot) => lot.centralLotId));
    const resolvedByTaskId = new Map(
      prepared.resolvedHistory.map((history) => [history.centralTaskId, history]),
    );
    const resolvedByLotId = resolvedHistoryByLotId(prepared.resolvedHistory, activeCentralLotIds);

    await db.withTransactionAsync(async () => {
      for (const product of prepared.products) {
        await upsertCentralProduct(db, product);
      }

      for (const lot of prepared.lots) {
        await upsertCentralLot(db, lot, resolvedByLotId.get(lot.centralLotId));
        await deletePendingLocalDuplicateLotsForCentralLot(db, lot);
      }

      for (const task of prepared.activeTasks) {
        const record = mapCentralActiveTask(task, lotsById);
        const existingRow = await db.getFirstAsync<TodayTaskRow>(
          "SELECT * FROM today_tasks WHERE id = ?",
          record.id,
        );
        const existing = existingRow === null ? undefined : mapTodayTask(existingRow);
        if (shouldPreserveLocalResolutionProjection(existing)) {
          continue;
        }
        await upsertTodayTask(db, record);
      }

      await reconcilePreparedCentralTasks(
        db,
        activeCentralTaskIds,
        preparedCentralLotIds,
        resolvedByTaskId,
        prepared.store.generatedAt,
      );
      await upsertPrepareTurnCacheStatus(db, prepared.cache);
    });
  }

  async function loadPrepareTurnCacheStatus(): Promise<PrepareTurnCacheStatus | null> {
    await initialize();
    const db = await getDatabase();
    const row = await db.getFirstAsync<PrepareTurnCacheStatusRow>(
      "SELECT * FROM prepare_turn_cache_status WHERE id = 'prepare-turn'",
    );

    return row === null ? null : mapPrepareTurnCacheStatus(row);
  }

  async function loadOnboardingProgress(
    key: OnboardingProgressKey,
  ): Promise<LocalOnboardingProgressRecord | null> {
    await initialize();
    const db = await getDatabase();
    const row = await db.getFirstAsync<OnboardingProgressRow>(
      `SELECT * FROM onboarding_progress
       WHERE subject_id = ? AND store_id = ? AND flow_id = ? AND version = ?
       LIMIT 1`,
      key.subjectId,
      key.storeId,
      key.flowId,
      key.version,
    );

    return row === null ? null : mapOnboardingProgress(row);
  }

  async function saveOnboardingProgress(
    input: SaveLocalOnboardingProgressInput,
  ): Promise<LocalOnboardingProgressRecord> {
    await initialize();
    const db = await getDatabase();
    const completedAt = input.status === "completed" ? input.occurredAt : null;
    const skippedAt = input.status === "skipped" ? input.occurredAt : null;
    await db.runAsync(
      `INSERT INTO onboarding_progress (
        subject_id, store_id, flow_id, version, status, completed_at, skipped_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(subject_id, store_id, flow_id, version) DO UPDATE SET
        status = excluded.status,
        completed_at = excluded.completed_at,
        skipped_at = excluded.skipped_at,
        updated_at = excluded.updated_at`,
      input.subjectId,
      input.storeId,
      input.flowId,
      input.version,
      input.status,
      completedAt,
      skippedAt,
      input.occurredAt,
    );

    return parseLocalOnboardingProgressRecord({
      subjectId: input.subjectId,
      storeId: input.storeId,
      flowId: input.flowId,
      version: input.version,
      status: input.status,
      ...(completedAt === null ? {} : { completedAt }),
      ...(skippedAt === null ? {} : { skippedAt }),
      updatedAt: input.occurredAt,
    });
  }

  async function createProduct(input: CaptureProductInput): Promise<CaptureProductRecord> {
    await initialize();
    const product = parseProductInput(input);
    const normalizedName = normalizeProductLookup(product.displayName);
    const db = await getDatabase();
    const existing = await findExistingProduct(db, normalizedName, product.gtin);

    if (existing !== null) {
      return mapProduct(existing);
    }

    const record: CaptureProductRecord = {
      ...product,
      id: nextGeneratedId(dependencies),
      normalizedName,
      createdAt: dependencies.clock(),
      catalogSource: "local",
      centralSyncState: "local",
    };

    await db.runAsync(
      `INSERT INTO capture_products (
        id, display_name, normalized_name, category_id, category_name, category_profile_json,
        supplier_name, gtin, identifiers_json, product_override_json, central_product_id, catalog_source,
        review_status, central_sync_state, draft_id, draft_review_message,
        similar_candidate_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.displayName,
      record.normalizedName,
      record.categoryId,
      record.categoryName ?? null,
      JSON.stringify(record.categoryRuleProfile),
      record.supplierName ?? null,
      record.gtin ?? null,
      stringifyProductIdentifiers(record),
      record.productRuleOverride === undefined ? null : JSON.stringify(record.productRuleOverride),
      record.centralProductId ?? null,
      record.catalogSource ?? "local",
      record.reviewStatus ?? null,
      record.centralSyncState ?? "local",
      record.draftId ?? null,
      record.draftReviewMessage ?? null,
      record.similarCandidateCount ?? null,
      record.createdAt,
    );

    return record;
  }

  async function searchCentralProducts(input: ProductSearchRequest) {
    await initialize();
    const request = parseProductSearchRequest(input);
    if (dependencies.searchCentralProducts !== undefined) {
      const response = ProductSearchResponseSchema.parse(
        await dependencies.searchCentralProducts(request),
      );
      const db = await getDatabase();

      await db.withTransactionAsync(async () => {
        for (const product of response.reusableProducts) {
          await upsertProductRecord(db, productCatalogItemToRecord(product));
        }

        for (const product of response.similarCandidates) {
          await upsertProductRecord(db, productCatalogItemToRecord(product));
        }

        if (response.draft !== undefined) {
          await upsertProductRecord(db, productDraftToRecord(response.draft));
        }
      });

      return response;
    }

    const normalizedQuery =
      request.query === undefined ? undefined : normalizeProductLookup(request.query);
    const lookupIdentifiers = requestIdentifierInputs({
      ...(request.gtin === undefined ? {} : { gtin: request.gtin }),
      ...(request.identifier === undefined ? {} : { identifiers: [request.identifier] }),
    });
    const db = await getDatabase();
    const rows = await db.getAllAsync<ProductRow>(
      `SELECT * FROM capture_products
       WHERE (? IS NOT NULL AND normalized_name LIKE ?)
          OR (? IS NOT NULL AND gtin = ?)
          OR (? IS NOT NULL AND category_id = ?)
          OR (? IS NOT NULL)
       ORDER BY display_name COLLATE NOCASE ASC`,
      normalizedQuery ?? null,
      normalizedQuery === undefined ? null : `%${normalizedQuery}%`,
      request.gtin ?? null,
      request.gtin ?? null,
      request.categoryId ?? null,
      request.categoryId ?? null,
      lookupIdentifiers.length === 0 ? null : "identifier",
    );
    const catalogProducts = rows.map(mapProduct).map(localProductToCatalogItem);
    const exact = catalogProducts.filter(
      (product) =>
        (normalizedQuery !== undefined && product.normalizedKey === normalizedQuery) ||
        (request.gtin !== undefined && product.gtin === request.gtin) ||
        productHasAnyIdentifier(product, lookupIdentifiers),
    );
    const reusableProducts = exact
      .filter((product) => product.reviewStatus === "validated")
      .map((product) => productSearchCandidate(product, "reusable_central"));
    const draft = exact.find((product) => product.reviewStatus === "pending_review");
    const similarCandidates = catalogProducts
      .filter(
        (product) =>
          !exact.some((candidate) => candidate.centralProductId === product.centralProductId) &&
          isSimilarProduct(product.normalizedKey, normalizedQuery),
      )
      .slice(0, 10)
      .map((product) => productSearchCandidate(product, "similar_candidate"));

    return ProductSearchResponseSchema.parse({
      requestId: `mobile-search-${dependencies.clock()}`,
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
      ...(draft === undefined ? {} : { draft: catalogItemToDraft(draft) }),
    });
  }

  async function createProductDraft(input: ProductDraftCreateRequest) {
    await initialize();
    const request = parseProductDraftCreateRequest(input);
    if (dependencies.createProductDraft !== undefined) {
      const response = ProductDraftCreateResponseSchema.parse(
        await dependencies.createProductDraft(request),
      );
      const db = await getDatabase();

      await db.withTransactionAsync(async () => {
        if (response.reusableProduct !== undefined) {
          await upsertProductRecord(db, productCatalogItemToRecord(response.reusableProduct));
        }

        for (const product of response.similarCandidates) {
          await upsertProductRecord(db, productCatalogItemToRecord(product));
        }

        if (response.draft !== undefined) {
          await upsertProductRecord(db, productDraftToRecord(response.draft));
        }
      });

      return response;
    }

    const normalizedName = normalizeProductLookup(request.displayName);
    const identifiers = requestIdentifierInputs(request);
    const db = await getDatabase();
    const existing = await findExistingProduct(db, normalizedName, request.gtin, identifiers);

    if (existing !== null) {
      const existingProduct = mergeProductIdentifiersLocal(mapProduct(existing), identifiers);
      await upsertProductRecord(db, existingProduct);
      const catalogProduct = localProductToCatalogItem(existingProduct);

      if (catalogProduct.reviewStatus === "pending_review") {
        const draft = catalogItemToDraft(catalogProduct);

        return ProductDraftCreateResponseSchema.parse({
          requestId: `mobile-draft-${dependencies.clock()}`,
          normalizedKey: normalizedName,
          outcome: "draft_pending_review",
          similarCandidates: [],
          draft,
          acknowledgement: {
            acknowledgementId: `ack-${catalogProduct.centralProductId}`,
            centralProductId: catalogProduct.centralProductId,
            state: "draft_pending_review",
            syncState: "pending_central",
            reviewStatus: "pending_review",
            acknowledgedAt: draft.requestedAt,
          },
        });
      }

      return ProductDraftCreateResponseSchema.parse({
        requestId: `mobile-draft-${dependencies.clock()}`,
        normalizedKey: normalizedName,
        outcome: "reuse_existing",
        duplicateReason:
          request.gtin !== undefined && catalogProduct.gtin === request.gtin
            ? "gtin"
            : productHasAnyIdentifier(catalogProduct, identifiers)
              ? "identifier"
              : "normalized_name",
        reusableProduct: catalogProduct,
        similarCandidates: [],
      });
    }

    const candidateRows = await db.getAllAsync<ProductRow>(
      `SELECT * FROM capture_products
       WHERE normalized_name LIKE ?
       ORDER BY display_name COLLATE NOCASE ASC
       LIMIT 10`,
      `%${normalizedName}%`,
    );
    const acknowledged = new Set(request.similarCandidateIds ?? []);
    const similarCandidates = candidateRows
      .map(mapProduct)
      .map(localProductToCatalogItem)
      .filter((product) => isSimilarProduct(product.normalizedKey, normalizedName))
      .map((product) => productSearchCandidate(product, "similar_candidate"));

    if (
      similarCandidates.length > 0 &&
      !similarCandidates.every((candidate) => acknowledged.has(candidate.centralProductId))
    ) {
      return ProductDraftCreateResponseSchema.parse({
        requestId: `mobile-draft-${dependencies.clock()}`,
        normalizedKey: normalizedName,
        outcome: "similar_found",
        similarCandidates,
      });
    }

    const record: CaptureProductRecord = {
      displayName: request.displayName,
      categoryId: request.categoryId,
      categoryName: request.categoryName,
      categoryRuleProfile: request.categoryRuleProfile,
      ...(request.gtin === undefined ? {} : { gtin: request.gtin }),
      ...(requestIdentifiersForLocal(request).length === 0
        ? {}
        : { identifiers: requestIdentifiersForLocal(request) }),
      id: nextGeneratedId(dependencies),
      normalizedName,
      createdAt: request.requestedAt,
      centralProductId: `draft:${normalizedName}`,
      catalogSource: "draft_pending_review",
      reviewStatus: "pending_review",
      centralSyncState: "pending_central",
      draftId: `draft:${normalizedName}`,
      draftReviewMessage:
        "Cadastro do produto em revisao. O lote entra com risco conservador ate a validacao.",
      similarCandidateCount: similarCandidates.length,
    };

    await db.runAsync(
      `INSERT INTO capture_products (
        id, display_name, normalized_name, category_id, category_name, category_profile_json,
        supplier_name, gtin, identifiers_json, product_override_json, central_product_id, catalog_source,
        review_status, central_sync_state, draft_id, draft_review_message,
        similar_candidate_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.displayName,
      record.normalizedName,
      record.categoryId,
      record.categoryName ?? null,
      JSON.stringify(record.categoryRuleProfile),
      record.supplierName ?? null,
      record.gtin ?? null,
      stringifyProductIdentifiers(record),
      record.productRuleOverride === undefined ? null : JSON.stringify(record.productRuleOverride),
      record.centralProductId ?? null,
      "draft_pending_review",
      record.reviewStatus ?? null,
      record.centralSyncState ?? null,
      record.draftId ?? null,
      record.draftReviewMessage ?? null,
      record.similarCandidateCount ?? null,
      record.createdAt,
    );

    const draft = localProductToDraft(record, similarCandidates);

    return ProductDraftCreateResponseSchema.parse({
      requestId: `mobile-draft-${dependencies.clock()}`,
      normalizedKey: normalizedName,
      outcome: "draft_pending_review",
      similarCandidates,
      draft,
      acknowledgement: {
        acknowledgementId: `ack-${record.id}`,
        centralProductId: draft.centralProductId,
        state: "draft_pending_review",
        syncState: "pending_central",
        reviewStatus: "pending_review",
        acknowledgedAt: request.requestedAt,
        message: record.draftReviewMessage,
      },
    });
  }

  async function findProducts(query: string): Promise<readonly CaptureProductRecord[]> {
    await initialize();
    const normalizedQuery = normalizeProductLookup(query);

    if (normalizedQuery.length === 0) {
      return [];
    }

    const db = await getDatabase();
    const rows = await db.getAllAsync<ProductRow>(
      `SELECT * FROM capture_products
       WHERE normalized_name LIKE ? OR gtin LIKE ?
       ORDER BY display_name COLLATE NOCASE ASC`,
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
    );

    return rows.map(mapProduct);
  }

  async function listFrequentProducts(): Promise<readonly CaptureProductRecord[]> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<ProductRow>(
      `SELECT products.* FROM capture_products AS products
       INNER JOIN capture_lots AS lots ON lots.product_id = products.id
       GROUP BY products.id
       ORDER BY COUNT(lots.id) DESC, products.display_name COLLATE NOCASE ASC`,
    );

    return rows.map(mapProduct);
  }

  async function listProductCategories(): Promise<readonly CaptureProductCategory[]> {
    await initialize();
    const db = await getDatabase();

    if (dependencies.listCentralCategories !== undefined) {
      try {
        const response = await dependencies.listCentralCategories();
        const fetchedAt = dependencies.clock();

        await db.withTransactionAsync(async () => {
          for (const category of response.categories) {
            await upsertCategoryRecord(db, categoryCatalogItemToLocalCategory(category), fetchedAt);
          }
        });
      } catch {
        // Keep the local catalog cache available during unstable store connectivity.
      }
    }

    const catalogRows = await db.getAllAsync<ProductCategoryRow>(
      `SELECT
         c.category_id,
         c.category_name,
         c.category_profile_json,
         COUNT(p.id) AS product_count
       FROM capture_categories c
       LEFT JOIN capture_products p ON p.category_id = c.category_id
       GROUP BY c.category_id, c.category_name, c.category_profile_json
       ORDER BY c.category_name COLLATE NOCASE ASC`,
    );
    const productRows = await db.getAllAsync<ProductCategoryRow>(
      `SELECT
         category_id,
         COALESCE(MAX(category_name), category_id) AS category_name,
         MAX(category_profile_json) AS category_profile_json,
         COUNT(*) AS product_count
       FROM capture_products
       GROUP BY category_id
       ORDER BY category_name COLLATE NOCASE ASC`,
    );
    const categories = new Map<string, CaptureProductCategory>();

    for (const row of catalogRows) {
      categories.set(row.category_id, mapCategory(row));
    }

    for (const row of productRows) {
      if (!categories.has(row.category_id)) {
        categories.set(row.category_id, mapCategory(row));
      }
    }

    return [...categories.values()].sort((left, right) =>
      left.categoryName.localeCompare(right.categoryName, "pt-BR"),
    );
  }

  async function findProductsByCategory(
    categoryId: string,
  ): Promise<readonly CaptureProductRecord[]> {
    await initialize();
    const parsedCategoryId = parseProductCategoryId(categoryId);
    const db = await getDatabase();
    const rows = await db.getAllAsync<ProductRow>(
      `SELECT * FROM capture_products
       WHERE category_id = ?
       ORDER BY display_name COLLATE NOCASE ASC`,
      parsedCategoryId,
    );

    return rows.map(mapProduct);
  }

  async function saveLot(input: SaveLotInput): Promise<CaptureLotSnapshot> {
    await initialize();
    const lot = parseLotInput(input.lot);
    const db = await getDatabase();
    const productRow = await db.getFirstAsync<ProductRow>(
      `SELECT * FROM capture_products
       WHERE id = ? OR central_product_id = ?
       ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END
       LIMIT 1`,
      lot.productId,
      lot.productId,
      lot.productId,
    );

    if (productRow === null) {
      throw new Error(`Cannot save a lot for an unknown product: ${lot.productId}`);
    }

    const product = mapProduct(productRow);
    const centrallySaved = await trySaveLotCentrally(db, lot, product, input.actorLabel);

    if (centrallySaved !== null) {
      return centrallySaved;
    }

    const storedLot = parseLotInput({ ...lot, productId: product.id });
    const syncMetadata = localLotCentralSyncMetadata(product);
    const lotId = nextGeneratedId(dependencies);
    const observation: CaptureObservationRecord = {
      ...createInitialObservation(storedLot, input.actorLabel, dependencies.clock()),
      id: nextGeneratedId(dependencies),
      lotId,
    };
    const snapshot: CaptureLotSnapshot = {
      ...storedLot,
      id: lotId,
      productDisplayName: product.displayName,
      currentObservation: observation,
      ...syncMetadata,
    };

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO capture_lots (
          id, product_id, identity_source, identity_value, mode, expires_at, received_at,
          quality_inspection_due_at, quality_window_days, approximate_quantity,
          initial_location_kind, initial_location_custom_name, current_observation_id,
          current_status, current_actor_label, current_occurred_at, current_location_kind,
          current_location_custom_name, current_quantity_state, current_approximate_quantity,
          current_is_correction, current_correction_reason, central_lot_id, central_sync_state,
          central_source, task_projection_json, central_ack_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        lotId,
        storedLot.productId,
        storedLot.identity.identitySource,
        storedLot.identity.value,
        storedLot.mode,
        storedLot.mode === "formal_validity" || storedLot.mode === "processed_repack_loss"
          ? storedLot.expiresAt
          : null,
        storedLot.mode === "formal_validity" ||
          storedLot.mode === "processed_repack_loss" ||
          storedLot.mode === "flv_inspection" ||
          storedLot.mode === "receiving_monitored"
          ? (storedLot.receivedAt ?? null)
          : null,
        storedLot.mode === "flv_inspection" ? (storedLot.qualityInspectionDueAt ?? null) : null,
        storedLot.mode === "flv_inspection" ? (storedLot.qualityWindowDays ?? null) : null,
        storedLot.approximateQuantity,
        storedLot.initialLocation.kind,
        storedLot.initialLocation.kind === "other" ? storedLot.initialLocation.customName : null,
        observation.id,
        observation.status,
        observation.actorLabel,
        observation.occurredAt,
        observation.location.kind,
        observation.location.kind === "other" ? observation.location.customName : null,
        observation.quantityState,
        observation.quantityState === "estimated" ? observation.approximateQuantity : null,
        observation.isCorrection ? 1 : 0,
        observation.correctionReason ?? null,
        null,
        syncMetadata.centralSyncState,
        syncMetadata.centralSource,
        null,
        syncMetadata.centralAcknowledgementMessage,
      );
      await insertObservation(db, observation);
    });

    return snapshot;
  }

  async function trySaveLotCentrally(
    db: SQLite.SQLiteDatabase,
    lot: CaptureLotInput,
    product: CaptureProductRecord,
    actorLabel: string,
  ): Promise<CaptureLotSnapshot | null> {
    if (dependencies.createCentralLot === undefined) {
      return null;
    }

    if (isPendingCentralProduct(product)) {
      return null;
    }

    if (product.centralProductId === undefined) {
      return null;
    }

    const cache = await loadPrepareTurnCacheStatus().catch(() => null);

    if (cache?.state !== "ready" || cache.source !== "central") {
      return null;
    }

    const occurredAt = dependencies.clock();
    const centralLot = parseLotInput({ ...lot, productId: product.centralProductId });
    const request = parseCentralLotCreateRequest({
      lot: centralLot,
      actorLabel,
      occurredAt,
      idempotencyKey: centralLotIdempotencyKey(product.centralProductId, lot),
    });

    try {
      const response = parseCentralLotWriteResponse(await dependencies.createCentralLot(request));
      const lotsById = new Map<CentralLotSnippet["centralLotId"], CentralLotSnippet>([
        [response.lot.centralLotId, centralLotSnapshotToSnippet(response.lot)],
      ]);

      await db.withTransactionAsync(async () => {
        await upsertCentralLotSnapshot(
          db,
          response.lot,
          response.taskProjection,
          response.acknowledgement.message,
        );

        if (response.taskProjection.attention === "active_task") {
          await upsertTodayTask(
            db,
            mapCentralActiveTask(centralActiveTaskSnippetFromWriteResponse(response), lotsById),
          );
        }
      });

      return centralLotSnapshotToLocal(response.lot, response.acknowledgement.message);
    } catch {
      return null;
    }
  }

  async function syncPendingCentralLots(): Promise<readonly CaptureLotSnapshot[]> {
    await initialize();

    const db = await getDatabase();
    const rows = await db.getAllAsync<LotRow>(
      `${LOT_SELECT}
       WHERE l.central_sync_state IN ('pending_central', 'local')
       ORDER BY l.current_occurred_at ASC
       LIMIT 20`,
    );

    if (rows.length === 0) {
      return [];
    }

    if (dependencies.createCentralLot === undefined) {
      throw new PendingCentralLotSyncError("central_write_unavailable");
    }

    const cache = await loadPrepareTurnCacheStatus().catch(() => null);

    if (cache?.state !== "ready" || cache.source !== "central") {
      throw new PendingCentralLotSyncError("central_read_required");
    }

    const syncedLots: CaptureLotSnapshot[] = [];
    let blockedByProduct = false;
    let writeFailure: unknown;

    for (const row of rows) {
      const localLot = mapLotSnapshot(row);
      const detail = await loadLotDetail(localLot.id);

      if (detail === null) {
        continue;
      }

      const product = await resolveCentralProductForPendingLot(db, detail.product);

      if (product?.centralProductId === undefined) {
        blockedByProduct = true;
        continue;
      }

      try {
        const centralLot = centralLotInputForReplay(detail, product.centralProductId);
        const request = parseCentralLotCreateRequest({
          lot: centralLot,
          actorLabel: detail.currentObservation.actorLabel,
          occurredAt: detail.currentObservation.occurredAt,
          idempotencyKey: centralLotIdempotencyKey(product.centralProductId, centralLot),
        });
        const response = parseCentralLotWriteResponse(await dependencies.createCentralLot(request));
        const lotsById = new Map<CentralLotSnippet["centralLotId"], CentralLotSnippet>([
          [response.lot.centralLotId, centralLotSnapshotToSnippet(response.lot)],
        ]);

        await db.withTransactionAsync(async () => {
          await db.runAsync("DELETE FROM capture_observations WHERE lot_id = ?", detail.id);
          await db.runAsync("DELETE FROM capture_lots WHERE id = ?", detail.id);
          await upsertCentralLotSnapshot(
            db,
            response.lot,
            response.taskProjection,
            response.acknowledgement.message,
          );

          if (response.taskProjection.attention === "active_task") {
            await upsertTodayTask(
              db,
              mapCentralActiveTask(centralActiveTaskSnippetFromWriteResponse(response), lotsById),
            );
          }
        });

        syncedLots.push(centralLotSnapshotToLocal(response.lot, response.acknowledgement.message));
      } catch (error) {
        writeFailure = error;
        continue;
      }
    }

    if (syncedLots.length === 0) {
      if (writeFailure !== undefined) {
        const blocker = pendingCentralLotWriteBlocker(writeFailure);
        throw new PendingCentralLotSyncError(blocker, blocker, {
          cause: writeFailure,
        });
      }
      if (blockedByProduct) {
        throw new PendingCentralLotSyncError("central_product_not_ready");
      }
    }

    return syncedLots;
  }

  async function resolveCentralProductForPendingLot(
    db: SQLite.SQLiteDatabase,
    product: CaptureProductRecord,
  ): Promise<CaptureProductRecord | undefined> {
    const cachedProduct = await centralProductForPendingLot(db, product);

    if (cachedProduct?.centralProductId !== undefined) {
      return cachedProduct;
    }

    if (dependencies.searchCentralProducts === undefined) {
      return undefined;
    }

    const response = await searchCentralProducts(
      productSearchRequestForPendingLot(product, dependencies.clock(), {
        includeCategory: true,
      }),
    );
    const reusableProduct =
      reusableCentralProductForPendingLot(product, response) ??
      (await searchReusableCentralProductWithoutCategory(product));

    return reusableProduct === undefined
      ? centralProductIdFallbackForPendingLot(product)
      : productCatalogItemToRecord(reusableProduct);
  }

  function centralProductIdFallbackForPendingLot(
    product: CaptureProductRecord,
  ): CaptureProductRecord | undefined {
    const centralProductId = product.centralProductId;

    return centralProductId === undefined
      ? undefined
      : {
          ...product,
          centralProductId,
        };
  }

  async function searchReusableCentralProductWithoutCategory(
    product: CaptureProductRecord,
  ): Promise<ProductSearchCandidate | undefined> {
    const response = await searchCentralProducts(
      productSearchRequestForPendingLot(product, dependencies.clock(), {
        includeCategory: false,
      }),
    );

    return reusableCentralProductForPendingLot(product, response);
  }

  async function appendObservation(
    lotId: string,
    input: PhysicalObservationInput,
  ): Promise<CaptureObservationRecord> {
    await initialize();
    const validatedLotId = parseLotId(lotId);
    const observation: CaptureObservationRecord = {
      ...parseObservationInput(input),
      id: nextGeneratedId(dependencies),
      lotId: validatedLotId,
    };
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM capture_lots WHERE id = ?",
        validatedLotId,
      );

      if (existing === null) {
        throw new Error(`Cannot append an observation for an unknown lot: ${validatedLotId}`);
      }

      await insertObservation(db, observation);
      await db.runAsync(
        `UPDATE capture_lots SET
          current_observation_id = ?, current_status = ?, current_actor_label = ?,
          current_occurred_at = ?, current_location_kind = ?, current_location_custom_name = ?,
          current_quantity_state = ?, current_approximate_quantity = ?, current_is_correction = ?,
          current_correction_reason = ?
        WHERE id = ?`,
        observation.id,
        observation.status,
        observation.actorLabel,
        observation.occurredAt,
        observation.location.kind,
        observation.location.kind === "other" ? observation.location.customName : null,
        observation.quantityState,
        observation.quantityState === "estimated" ? observation.approximateQuantity : null,
        observation.isCorrection ? 1 : 0,
        observation.correctionReason ?? null,
        validatedLotId,
      );
    });

    return observation;
  }

  async function listRecentLots(query?: RecentLotsQuery): Promise<readonly CaptureLotSnapshot[]> {
    await initialize();
    const parsedQuery = parseRecentLotsQuery(query);
    const db = await getDatabase();
    const limit = parsedQuery.limit ?? 20;
    const normalizedQuery =
      parsedQuery.query === undefined
        ? undefined
        : `%${normalizeProductLookup(parsedQuery.query)}%`;
    const location = parsedQuery.location;
    let rows: LotRow[];

    if (normalizedQuery !== undefined && location !== undefined) {
      rows = await db.getAllAsync<LotRow>(
        `${LOT_SELECT}
         WHERE (p.normalized_name LIKE ? OR p.gtin LIKE ? OR l.identity_value LIKE ?)
           AND l.current_location_kind = ?
           AND (l.current_location_kind <> 'other' OR l.current_location_custom_name = ?)
         ORDER BY l.current_occurred_at DESC LIMIT ?`,
        normalizedQuery,
        normalizedQuery,
        normalizedQuery,
        location.kind,
        location.kind === "other" ? location.customName : null,
        limit,
      );
    } else if (normalizedQuery !== undefined) {
      rows = await db.getAllAsync<LotRow>(
        `${LOT_SELECT}
         WHERE p.normalized_name LIKE ? OR p.gtin LIKE ? OR l.identity_value LIKE ?
         ORDER BY l.current_occurred_at DESC LIMIT ?`,
        normalizedQuery,
        normalizedQuery,
        normalizedQuery,
        limit,
      );
    } else if (location !== undefined) {
      rows = await db.getAllAsync<LotRow>(
        `${LOT_SELECT}
         WHERE l.current_location_kind = ?
           AND (l.current_location_kind <> 'other' OR l.current_location_custom_name = ?)
         ORDER BY l.current_occurred_at DESC LIMIT ?`,
        location.kind,
        location.kind === "other" ? location.customName : null,
        limit,
      );
    } else {
      rows = await db.getAllAsync<LotRow>(
        `${LOT_SELECT} ORDER BY l.current_occurred_at DESC LIMIT ?`,
        limit,
      );
    }

    return rows.map(mapLotSnapshot);
  }

  async function loadLotDetail(lotId: string): Promise<CaptureLotDetail | null> {
    await initialize();
    const validatedLotId = parseLotId(lotId);
    const db = await getDatabase();
    const lotRow = await db.getFirstAsync<LotRow>(`${LOT_SELECT} WHERE l.id = ?`, validatedLotId);

    if (lotRow === null) {
      return null;
    }

    const snapshot = mapLotSnapshot(lotRow);
    const productRow = await db.getFirstAsync<ProductRow>(
      "SELECT * FROM capture_products WHERE id = ?",
      snapshot.productId,
    );

    if (productRow === null) {
      throw new Error(`Lot ${validatedLotId} has no stored product.`);
    }

    const observationRows = await db.getAllAsync<ObservationRow>(
      "SELECT * FROM capture_observations WHERE lot_id = ? ORDER BY occurred_at ASC",
      validatedLotId,
    );

    return {
      ...snapshot,
      product: mapProduct(productRow),
      observations: observationRows.map(mapObservation),
    };
  }

  async function refreshTodayTasks(input: RefreshTodayTasksInput): Promise<TodayTaskRefreshResult> {
    await initialize();
    const refreshedAt = dependencies.clock();
    const db = await getDatabase();
    const lots = await listRecentLots({ limit: 100 });

    await db.runAsync("DELETE FROM today_future_attention");

    for (const lot of lots) {
      const detail = await loadLotDetail(lot.id);

      if (detail === null) {
        continue;
      }

      const future = createFutureAttentionRecord({
        lot: detail,
        id: `future:${detail.id}:radar`,
        observedAt: input.currentTimestamp,
        currentDate: input.currentDate,
        currentTimestamp: input.currentTimestamp,
      });

      if (future !== null) {
        await upsertFutureAttention(db, future);
      }

      const centralProjectedTask = centralProjectedTaskFromLot(detail);

      if (centralProjectedTask !== null) {
        const existingCentralTaskRow = await db.getFirstAsync<TodayTaskRow>(
          "SELECT * FROM today_tasks WHERE id = ?",
          centralProjectedTask.id,
        );
        const existingCentralTask =
          existingCentralTaskRow === null ? undefined : mapTodayTask(existingCentralTaskRow);

        if (shouldPreserveLocalResolutionProjection(existingCentralTask)) {
          continue;
        }
        await resolveActiveLotTasksExcept(db, centralProjectedTask, refreshedAt);
        await upsertTodayTask(
          db,
          existingCentralTask?.resolutionHistory === undefined
            ? centralProjectedTask
            : {
                ...centralProjectedTask,
                resolutionHistory: existingCentralTask.resolutionHistory,
              },
        );
        continue;
      }

      if (shouldTrustPreparedCentralLotForRefresh(detail)) {
        continue;
      }

      const candidate = deriveTaskCandidateFromLot({
        lot: detail,
        currentDate: input.currentDate,
        currentTimestamp: input.currentTimestamp,
      });

      if (candidate === null) {
        continue;
      }

      if (
        candidate.requiredResolution === "request_markdown" &&
        (await findActiveMarkdownWorkflow(db, detail.id)) !== null
      ) {
        continue;
      }

      const existing = await db.getFirstAsync<TodayTaskRow>(
        "SELECT * FROM today_tasks WHERE active_key = ?",
        candidate.activeKey,
      );

      if (existing !== null && existing.status !== "active") {
        continue;
      }

      const existingTask = existing === null ? undefined : mapTodayTask(existing);
      const record = createTodayTaskRecord({
        candidate,
        lotIdentity: detail.identity,
        id: existingTask?.id ?? nextGeneratedId(dependencies),
        createdAt: existingTask?.createdAt ?? refreshedAt,
        updatedAt: refreshedAt,
      });

      await upsertTodayTask(
        db,
        existingTask?.resolutionHistory === undefined
          ? record
          : { ...record, resolutionHistory: existingTask.resolutionHistory },
      );
    }

    const tasks = await listActiveTodayTasks();
    const futureAttention = await listFutureAttention();
    await upsertOfflineCacheStatus(
      db,
      parseOfflineCacheStatus({
        state: deriveOfflineCacheState({
          activeTaskCount: tasks.length,
          requiredLotSnippetCount: tasks.length,
          lastRefreshedAt: refreshedAt,
          staleAfterHours: OFFLINE_CACHE_STALE_AFTER_HOURS,
          referenceTime: refreshedAt,
          isConnected: true,
        }),
        lastRefreshedAt: refreshedAt,
        activeTaskCount: tasks.length,
        requiredLotSnippetCount: tasks.length,
        staleAfterHours: OFFLINE_CACHE_STALE_AFTER_HOURS,
        source: input.source,
        updatedAt: refreshedAt,
      }),
    );

    return {
      metadata: {
        refreshedAt,
        activeTaskCount: tasks.length,
        futureAttentionCount: futureAttention.length,
        source: input.source,
      },
      tasks,
      futureAttention,
    };
  }

  async function listActiveTodayTasks(): Promise<readonly TodayTaskRecord[]> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE status = 'active' ORDER BY priority ASC, created_at ASC",
    );

    return sortTodayTasks(rows.map(mapTodayTask));
  }

  async function listFutureAttention(): Promise<readonly FutureAttentionRecord[]> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<FutureAttentionRow>(
      "SELECT * FROM today_future_attention ORDER BY observed_at ASC, lot_id ASC",
    );

    return rows.map(mapFutureAttention);
  }

  async function resolveTodayTask(input: TaskResolutionCommand): Promise<TodayTaskRecord> {
    await initialize();
    const command = parseTaskResolutionCommand(input);
    const db = await getDatabase();
    let resolved: TodayTaskRecord | undefined;

    await db.withTransactionAsync(async () => {
      resolved = await resolveTaskInTransaction(db, command, { allowSalesAreaRecheck: true });
    });

    if (resolved === undefined) {
      throw new Error("Today task resolution did not complete.");
    }

    return resolved;
  }

  async function loadTodayTask(taskId: string): Promise<TodayTaskRecord | null> {
    await initialize();
    const validatedTaskId = parseLotId(taskId);
    const db = await getDatabase();
    const row = await db.getFirstAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE id = ?",
      validatedTaskId,
    );

    return row === null ? null : mapTodayTask(row);
  }

  async function requestMarkdown(input: Parameters<CaptureRepository["requestMarkdown"]>[0]) {
    await initialize();
    const command = parseMarkdownRequestCommand(input);
    const detail = await requireLotDetail(command.lotId);
    const assessment = calculateAssessmentForLot({
      lot: detail,
      currentDate: command.occurredAt.slice(0, 10),
      currentTimestamp: command.occurredAt,
    });
    const eligibility = canStartMarkdownWorkflow({
      riskState: assessment.state,
      physicalConfirmation: {
        status: detail.currentObservation.status,
        confirmedAt: detail.currentObservation.occurredAt,
        ...(detail.currentObservation.quantityState === "estimated"
          ? { approximateQuantity: detail.currentObservation.approximateQuantity }
          : {}),
      },
      currentTimestamp: command.occurredAt,
      maxPhysicalConfirmationAgeHours: maxPhysicalConfirmationAgeHoursForLot(detail),
      requestReason: command.reason,
      ...(command.earlyJustification === undefined
        ? {}
        : { earlyJustification: command.earlyJustification }),
    });

    if (eligibility.status === "blocked") {
      throw new Error(eligibility.blocker.label);
    }

    const db = await getDatabase();
    const existing = await findActiveMarkdownWorkflow(db, command.lotId);

    if (existing !== null) {
      throw new Error(`An active markdown workflow already exists for lot ${command.lotId}.`);
    }

    const workflow = MarkdownWorkflowRecordSchema.parse({
      id: nextGeneratedId(dependencies),
      lotId: command.lotId,
      status: "requested",
      currentStage: "requested",
      requestedAt: command.occurredAt,
      requestedBy: command.actorLabel,
      requestReason: command.reason,
      ...(command.earlyJustification === undefined
        ? {}
        : { earlyJustification: command.earlyJustification }),
      stageHistory: [
        {
          stage: "requested",
          action: "request_markdown",
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          reason:
            command.reason === "rule_window" ? "Janela de rebaixa" : command.earlyJustification,
        },
      ],
      createdAt: command.occurredAt,
      updatedAt: command.occurredAt,
    });
    const task = createMarkdownStageTodayTaskRecord({
      workflow,
      lot: detail,
      assessment,
      id: nextGeneratedId(dependencies),
      createdAt: command.occurredAt,
      updatedAt: command.occurredAt,
    });

    await db.withTransactionAsync(async () => {
      if (command.sourceTaskId !== undefined) {
        await resolveTaskInTransaction(
          db,
          {
            taskId: command.sourceTaskId,
            action: "request_markdown",
            actorLabel: command.actorLabel,
            occurredAt: command.occurredAt,
          },
          { allowSalesAreaRecheck: false },
        );
      }

      await upsertMarkdownWorkflow(db, workflow);
      await upsertTodayTask(db, task);
    });

    return workflow;
  }

  async function decideMarkdown(input: Parameters<CaptureRepository["decideMarkdown"]>[0]) {
    await initialize();
    const command = parseMarkdownApprovalCommand(input);
    const db = await getDatabase();
    const workflow = await requireWorkflow(db, command.workflowId, "requested");
    const detail = await requireLotDetail(workflow.lotId);
    const updated =
      command.decision === "approved"
        ? MarkdownWorkflowRecordSchema.parse({
            ...workflow,
            status: "approved",
            currentStage: "approved",
            approvedAt: command.occurredAt,
            approvedBy: command.actorLabel,
            updatedAt: command.occurredAt,
            stageHistory: [
              ...workflow.stageHistory,
              {
                stage: "approved",
                action: "approve_markdown",
                actorLabel: command.actorLabel,
                occurredAt: command.occurredAt,
              },
            ],
          })
        : MarkdownWorkflowRecordSchema.parse({
            ...workflow,
            status: "rejected",
            currentStage: "rejected",
            rejectedAt: command.occurredAt,
            rejectedBy: command.actorLabel,
            rejectionReason: command.rejectionReason,
            updatedAt: command.occurredAt,
            stageHistory: [
              ...workflow.stageHistory,
              {
                stage: "rejected",
                action: "reject_markdown",
                actorLabel: command.actorLabel,
                occurredAt: command.occurredAt,
                reason: command.rejectionReason,
              },
            ],
          });
    const nextTask =
      updated.currentStage === "approved"
        ? createMarkdownStageTodayTaskRecord({
            workflow: updated,
            lot: detail,
            assessment: calculateAssessmentForLot({
              lot: detail,
              currentDate: command.occurredAt.slice(0, 10),
              currentTimestamp: command.occurredAt,
            }),
            id: nextGeneratedId(dependencies),
            createdAt: command.occurredAt,
            updatedAt: command.occurredAt,
          })
        : undefined;

    await db.withTransactionAsync(async () => {
      await resolveMarkdownTaskInTransaction(db, command.taskId, workflow.id, "approve_markdown", {
        taskId: command.taskId,
        action: command.decision === "approved" ? "approve_markdown" : "reject_markdown",
        actorLabel: command.actorLabel,
        occurredAt: command.occurredAt,
      });
      await upsertMarkdownWorkflow(db, updated);

      if (nextTask !== undefined) {
        await upsertTodayTask(db, nextTask);
      }
    });

    return updated;
  }

  async function recordMarkdownApplication(
    input: Parameters<CaptureRepository["recordMarkdownApplication"]>[0],
  ) {
    await initialize();
    const command = parseMarkdownApplicationCommand(input);
    const db = await getDatabase();
    const workflow = await requireWorkflow(db, command.workflowId, "approved");
    const detail = await requireLotDetail(workflow.lotId);
    const updated = MarkdownWorkflowRecordSchema.parse({
      ...workflow,
      status: "applied",
      currentStage: "applied",
      appliedAt: command.occurredAt,
      appliedBy: command.actorLabel,
      applicationEvidence: command.evidence,
      updatedAt: command.occurredAt,
      stageHistory: [
        ...workflow.stageHistory,
        {
          stage: "applied",
          action: "apply_markdown",
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          evidence: command.evidence,
        },
      ],
    });
    const nextTask = createMarkdownStageTodayTaskRecord({
      workflow: updated,
      lot: detail,
      assessment: calculateAssessmentForLot({
        lot: detail,
        currentDate: command.occurredAt.slice(0, 10),
        currentTimestamp: command.occurredAt,
      }),
      id: nextGeneratedId(dependencies),
      createdAt: command.occurredAt,
      updatedAt: command.occurredAt,
    });

    await db.withTransactionAsync(async () => {
      await resolveMarkdownTaskInTransaction(db, command.taskId, workflow.id, "apply_markdown", {
        taskId: command.taskId,
        action: "apply_markdown",
        actorLabel: command.actorLabel,
        occurredAt: command.occurredAt,
        evidence: command.evidence,
      });
      await upsertMarkdownWorkflow(db, updated);
      await upsertTodayTask(db, nextTask);
    });

    return updated;
  }

  async function confirmMarkdownOnShelf(
    input: Parameters<CaptureRepository["confirmMarkdownOnShelf"]>[0],
  ) {
    await initialize();
    const command = parseMarkdownShelfConfirmationCommand(input);
    const db = await getDatabase();
    const workflow = await requireWorkflow(db, command.workflowId, "applied");
    const updated = MarkdownWorkflowRecordSchema.parse({
      ...workflow,
      status: "shelf_confirmed",
      currentStage: "shelf_confirmed",
      shelfConfirmedAt: command.occurredAt,
      shelfConfirmedBy: command.actorLabel,
      shelfConfirmationEvidence: command.evidence,
      updatedAt: command.occurredAt,
      stageHistory: [
        ...workflow.stageHistory,
        {
          stage: "shelf_confirmed",
          action: "confirm_markdown_on_shelf",
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          evidence: command.evidence,
        },
      ],
    });

    await db.withTransactionAsync(async () => {
      await resolveMarkdownTaskInTransaction(
        db,
        command.taskId,
        workflow.id,
        "confirm_markdown_on_shelf",
        {
          taskId: command.taskId,
          action: "confirm_markdown_on_shelf",
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          evidence: command.evidence,
        },
      );
      await upsertMarkdownWorkflow(db, updated);
    });

    return updated;
  }

  async function loadMarkdownWorkflowForLot(lotId: string): Promise<MarkdownWorkflowRecord | null> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<MarkdownWorkflowRow>(
      `SELECT * FROM markdown_workflows
       WHERE lot_id = ?
       ORDER BY updated_at DESC`,
      parseLotId(lotId),
    );
    const workflows = rows.map(mapMarkdownWorkflow);

    return workflows.find(isActiveMarkdownWorkflow) ?? workflows[0] ?? null;
  }

  async function listActiveMarkdownWorkflows(): Promise<readonly MarkdownWorkflowRecord[]> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<MarkdownWorkflowRow>(
      `SELECT * FROM markdown_workflows
       WHERE status NOT IN ('rejected', 'shelf_confirmed')
       ORDER BY updated_at ASC`,
    );

    return rows.map(mapMarkdownWorkflow);
  }

  async function loadMarkdownEntryState(
    input: Parameters<CaptureRepository["loadMarkdownEntryState"]>[0],
  ) {
    await initialize();
    const lot = await requireLotDetail(input.lotId);
    const db = await getDatabase();
    const activeWorkflow = await findActiveMarkdownWorkflow(db, lot.id);

    return deriveMarkdownEntryState({
      lot,
      assessment: calculateAssessmentForLot({
        lot,
        currentDate: input.currentDate,
        currentTimestamp: input.currentTimestamp,
      }),
      ...(activeWorkflow === null ? {} : { activeWorkflow }),
      currentTimestamp: input.currentTimestamp,
    });
  }

  async function requireLotDetail(lotId: string): Promise<CaptureLotDetail> {
    const detail = await loadLotDetail(lotId);

    if (detail === null) {
      throw new Error(`Cannot load markdown workflow for an unknown lot: ${lotId}`);
    }

    return detail;
  }

  async function findActiveMarkdownWorkflow(
    db: SQLite.SQLiteDatabase,
    lotId: string,
  ): Promise<MarkdownWorkflowRecord | null> {
    const row = await db.getFirstAsync<MarkdownWorkflowRow>(
      `SELECT * FROM markdown_workflows
       WHERE lot_id = ? AND status NOT IN ('rejected', 'shelf_confirmed')
       ORDER BY updated_at DESC
       LIMIT 1`,
      parseLotId(lotId),
    );

    return row === null ? null : mapMarkdownWorkflow(row);
  }

  async function requireWorkflow(
    db: SQLite.SQLiteDatabase,
    workflowId: string,
    expectedStage: MarkdownWorkflowRecord["currentStage"],
  ): Promise<MarkdownWorkflowRecord> {
    const row = await db.getFirstAsync<MarkdownWorkflowRow>(
      "SELECT * FROM markdown_workflows WHERE id = ?",
      parseLotId(workflowId),
    );

    if (row === null) {
      throw new Error(`Cannot advance an unknown markdown workflow: ${workflowId}`);
    }

    const workflow = mapMarkdownWorkflow(row);

    if (workflow.currentStage !== expectedStage || !isActiveMarkdownWorkflow(workflow)) {
      throw new Error(`Markdown workflow ${workflowId} is not waiting at stage ${expectedStage}.`);
    }

    return workflow;
  }

  async function resolveMarkdownTaskInTransaction(
    db: SQLite.SQLiteDatabase,
    taskId: string,
    workflowId: string,
    requiredResolution: TodayTaskRecord["requiredResolution"],
    command: TaskResolutionCommand,
  ): Promise<TodayTaskRecord> {
    const row = await db.getFirstAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE id = ?",
      parseLotId(taskId),
    );

    if (row === null) {
      throw new Error(`Cannot resolve an unknown markdown task: ${taskId}`);
    }

    const task = mapTodayTask(row);

    if (
      task.status !== "active" ||
      task.markdownWorkflowId !== workflowId ||
      task.requiredResolution !== requiredResolution
    ) {
      throw new Error(`Task ${taskId} is not the active ${requiredResolution} markdown task.`);
    }

    return resolveTaskInTransaction(db, command, { allowSalesAreaRecheck: false });
  }

  async function resolveTaskInTransaction(
    db: SQLite.SQLiteDatabase,
    command: TaskResolutionCommand,
    options: { allowSalesAreaRecheck: boolean },
  ): Promise<TodayTaskRecord> {
    const existingRow = await db.getFirstAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE id = ?",
      command.taskId,
    );

    if (existingRow === null) {
      throw new Error(`Cannot resolve an unknown Today task: ${command.taskId}`);
    }

    const existing = mapTodayTask(existingRow);
    assertRecheckResolutionHasEvidence(existing, command);

    const resolutionHistory = appendTaskResolutionHistoryEntry(existing.resolutionHistory, {
      action: command.action,
      actorLabel: command.actorLabel,
      occurredAt: command.occurredAt,
      ...(command.evidence === undefined ? {} : { evidence: command.evidence }),
    });
    const resolved = parseTodayTaskRecord({
      ...existing,
      status: "resolved",
      updatedAt: command.occurredAt,
      resolvedAt: command.occurredAt,
      responsibleActorLabel: command.actorLabel,
      resolutionHistory,
    });

    await upsertTodayTask(db, resolved);

    if (options.allowSalesAreaRecheck && shouldCreateSalesAreaRecheck(existing, command)) {
      await upsertTodayTask(
        db,
        createSalesAreaRecheckTask({
          parentTask: existing,
          id: nextGeneratedId(dependencies),
          occurredAt: command.occurredAt,
        }),
      );
    }

    return resolved;
  }

  async function registerAlertDevice(
    input: DevicePushRegistrationCommand,
  ): Promise<DevicePushRegistrationCommand> {
    await initialize();
    const registration = DevicePushRegistrationCommandSchema.parse(input);
    const db = await getDatabase();

    await db.runAsync(
      `INSERT INTO device_alert_channels (
        device_id, device_label, audience_role, permission_status, expo_push_token,
        registered_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        device_label = excluded.device_label,
        audience_role = excluded.audience_role,
        permission_status = excluded.permission_status,
        expo_push_token = excluded.expo_push_token,
        registered_at = excluded.registered_at,
        updated_at = excluded.updated_at`,
      registration.deviceId,
      registration.deviceLabel,
      registration.audienceRole,
      registration.permissionStatus,
      registration.expoPushToken ?? null,
      registration.registeredAt,
      dependencies.clock(),
    );

    return registration;
  }

  async function loadAlertChannelState(): Promise<DevicePushRegistrationCommand | null> {
    await initialize();
    const db = await getDatabase();
    const row = await db.getFirstAsync<AlertDeviceRow>(
      "SELECT * FROM device_alert_channels ORDER BY registered_at DESC LIMIT 1",
    );

    return row === null ? null : mapAlertDevice(row);
  }

  async function refreshTaskAlertStates(
    input: RefreshTaskAlertStatesInput,
  ): Promise<readonly TaskAlertStateRecord[]> {
    await initialize();
    const db = await getDatabase();
    const registration = await loadAlertChannelState();
    const channelState = alertChannelStateForRegistration(registration);
    const activeTasks = await listActiveTodayTasks();

    for (const task of activeTasks) {
      const existingRow = await db.getFirstAsync<TaskAlertStateRow>(
        "SELECT * FROM task_alert_states WHERE task_id = ?",
        task.id,
      );
      const existing = existingRow === null ? undefined : mapTaskAlertState(existingRow);
      const refreshed = deriveRefreshedTaskAlertState({
        task,
        ...(existing === undefined ? {} : { existing }),
        channelState,
        referenceTime: input.referenceTime,
        ...(input.isWithinShift === undefined ? {} : { isWithinShift: input.isWithinShift }),
        ...(input.allowOffShiftCriticalAlerts === undefined
          ? {}
          : { allowOffShiftCriticalAlerts: input.allowOffShiftCriticalAlerts }),
        isOverdue: input.overdueTaskIds?.includes(task.id) === true,
      });

      await upsertTaskAlertState(db, refreshed);
    }

    return listTaskAlertStates();
  }

  async function listTaskAlertStates(): Promise<readonly TaskAlertStateRecord[]> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<TaskAlertStateRow>(
      "SELECT * FROM task_alert_states ORDER BY updated_at ASC, task_id ASC",
    );

    return rows.map(mapTaskAlertState);
  }

  async function recordAlertAttempt(input: RecordAlertAttemptInput): Promise<TaskAlertStateRecord> {
    await initialize();
    const result = AlertDeliveryResultSchema.parse(input.result);
    const db = await getDatabase();
    const task = await loadTodayTask(input.taskId);

    if (task === null) {
      throw new Error(`Cannot record an alert attempt for an unknown task: ${input.taskId}`);
    }

    const existingRow = await db.getFirstAsync<TaskAlertStateRow>(
      "SELECT * FROM task_alert_states WHERE task_id = ?",
      input.taskId,
    );
    const existing =
      existingRow === null
        ? deriveRefreshedTaskAlertState({
            task,
            channelState: alertChannelStateForRegistration(await loadAlertChannelState()),
            referenceTime: input.attemptedAt,
          })
        : mapTaskAlertState(existingRow);
    const updated = applyAlertDeliveryResult({
      existing,
      attemptId: input.attemptId,
      attemptedAt: input.attemptedAt,
      result,
    });

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO alert_attempts (
          attempt_id, task_id, task_active_key, delivery_status, failure_reason,
          provider_ticket_id, provider_receipt_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        input.attemptId,
        input.taskId,
        input.taskActiveKey,
        result.status,
        result.status === "ok" || result.status === "device_not_registered"
          ? null
          : result.failureReason,
        "providerTicketId" in result ? (result.providerTicketId ?? null) : null,
        "providerReceiptId" in result ? (result.providerReceiptId ?? null) : null,
        input.attemptedAt,
      );
      await upsertTaskAlertState(db, updated);
    });

    return updated;
  }

  async function acknowledgeEscalation(
    input: AcknowledgeEscalationInput,
  ): Promise<TaskAlertStateRecord> {
    await initialize();
    const db = await getDatabase();
    const task = await loadTodayTask(input.taskId);

    if (task === null) {
      throw new Error(`Cannot acknowledge escalation for an unknown task: ${input.taskId}`);
    }

    const existingRow = await db.getFirstAsync<TaskAlertStateRow>(
      "SELECT * FROM task_alert_states WHERE task_id = ?",
      input.taskId,
    );
    const existing =
      existingRow === null
        ? deriveRefreshedTaskAlertState({
            task,
            channelState: alertChannelStateForRegistration(await loadAlertChannelState()),
            referenceTime: input.acknowledgedAt,
          })
        : mapTaskAlertState(existingRow);
    const acknowledged = TaskAlertStateRecordSchema.parse({
      ...existing,
      escalationState: "leadership_acknowledged",
      leadershipAcknowledgedAt: input.acknowledgedAt,
      updatedAt: input.acknowledgedAt,
    });

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO escalation_receipts (
          id, task_id, task_active_key, actor_label, acknowledged_at
        ) VALUES (?, ?, ?, ?, ?)`,
        nextGeneratedId(dependencies),
        input.taskId,
        input.taskActiveKey,
        input.actorLabel,
        input.acknowledgedAt,
      );
      await upsertTaskAlertState(db, acknowledged);
    });

    return acknowledged;
  }

  async function resolvePushOpenIntent(input: ResolvePushOpenIntentInput): Promise<PushOpenIntent> {
    await initialize();
    const db = await getDatabase();
    const task = await loadTodayTask(input.taskId);
    const recheckRow = await db.getFirstAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE recheck_parent_id = ? AND status = 'active'",
      input.taskId,
    );

    if (recheckRow !== null) {
      return PushOpenIntentSchema.parse({ ...input, result: "task_updated" });
    }

    if (task === null) {
      return parsePushOpenIntent({ ...input, result: "task_missing" });
    }

    if (task.status === "resolved") {
      return parsePushOpenIntent({ ...input, result: "task_resolved" });
    }

    if (task.activeKey !== input.taskActiveKey) {
      return parsePushOpenIntent({ ...input, result: "task_updated" });
    }

    return parsePushOpenIntent({ ...input, result: "current_task" });
  }

  async function loadOfflineCacheStatus(): Promise<OfflineCacheStatus> {
    await initialize();
    const db = await getDatabase();
    const row = await db.getFirstAsync<OfflineCacheStatusRow>(
      "SELECT * FROM offline_cache_status WHERE id = 'today'",
    );
    const referenceTime = dependencies.clock();

    if (row === null) {
      return parseOfflineCacheStatus({
        state: "offline_unavailable",
        activeTaskCount: 0,
        requiredLotSnippetCount: 0,
        staleAfterHours: OFFLINE_CACHE_STALE_AFTER_HOURS,
        source: "startup",
        updatedAt: referenceTime,
      });
    }

    const status = mapOfflineCacheStatus(row);

    return parseOfflineCacheStatus({
      ...status,
      state: deriveOfflineCacheState({
        activeTaskCount: status.activeTaskCount,
        requiredLotSnippetCount: status.requiredLotSnippetCount,
        ...(status.lastRefreshedAt === undefined
          ? {}
          : { lastRefreshedAt: status.lastRefreshedAt }),
        staleAfterHours: status.staleAfterHours,
        referenceTime,
        isConnected: true,
      }),
      updatedAt: referenceTime,
    });
  }

  async function queueEvidenceUpload(
    input: QueueEvidenceUploadInput,
  ): Promise<EvidenceUploadQueueRecord> {
    await initialize();
    const db = await getDatabase();
    const existing = await db.getFirstAsync<EvidenceUploadRow>(
      "SELECT * FROM evidence_uploads WHERE local_evidence_id = ?",
      input.localEvidenceId,
    );

    if (existing !== null) {
      return mapEvidenceUpload(existing);
    }

    const now = dependencies.clock();
    const record: EvidenceUploadQueueRecord = {
      ...input,
      state: "waiting_upload",
      createdAt: now,
      updatedAt: now,
      attemptCount: 0,
    };

    await upsertEvidenceUpload(db, record);

    return record;
  }

  async function listEvidenceUploads(): Promise<readonly EvidenceUploadQueueRecord[]> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<EvidenceUploadRow>(
      `SELECT * FROM evidence_uploads
       WHERE state IN ('waiting_upload', 'failed', 'uploading')
       ORDER BY created_at ASC`,
    );

    return rows.map(mapEvidenceUpload);
  }

  async function markEvidenceUploadAttempt(
    localEvidenceId: string,
    attemptedAt: string,
  ): Promise<EvidenceUploadQueueRecord> {
    await initialize();
    const db = await getDatabase();
    const existing = await requireEvidenceUpload(db, localEvidenceId);
    const updated: EvidenceUploadQueueRecord = {
      ...withoutEvidenceUploadError(existing),
      state: "uploading",
      updatedAt: attemptedAt,
      attemptCount: existing.attemptCount + 1,
    };

    await upsertEvidenceUpload(db, updated);

    return updated;
  }

  async function applyEvidenceUploadIntent(
    localEvidenceId: string,
    response: Parameters<CaptureRepository["applyEvidenceUploadIntent"]>[1],
    updatedAt: string,
  ): Promise<EvidenceUploadQueueRecord> {
    await initialize();
    const db = await getDatabase();
    const existing = await requireEvidenceUpload(db, localEvidenceId);
    const updated: EvidenceUploadQueueRecord = {
      ...existing,
      assetId: response.evidence.assetId,
      uploadPath: response.uploadPath,
      state: response.evidence.state === "uploaded" ? "uploaded" : "uploading",
      updatedAt,
      ...(response.evidence.uploadedAt === undefined
        ? {}
        : { uploadedAt: response.evidence.uploadedAt }),
      retentionExpiresAt: response.evidence.retentionExpiresAt,
    };

    await upsertEvidenceUpload(db, updated);

    return updated;
  }

  async function applyEvidenceUploadAck(
    localEvidenceId: string,
    ack: Parameters<CaptureRepository["applyEvidenceUploadAck"]>[1],
    updatedAt: string,
  ): Promise<EvidenceUploadQueueRecord> {
    await initialize();
    const db = await getDatabase();
    const existing = await requireEvidenceUpload(db, localEvidenceId);
    const updated: EvidenceUploadQueueRecord = {
      ...withoutEvidenceUploadError(existing),
      assetId: ack.assetId,
      state: "uploaded",
      uploadedAt: ack.uploadedAt,
      retentionExpiresAt: ack.retentionExpiresAt,
      updatedAt,
    };

    await upsertEvidenceUpload(db, updated);

    return updated;
  }

  async function markEvidenceUploadFailed(
    localEvidenceId: string,
    error: string,
    failedAt: string,
  ): Promise<EvidenceUploadQueueRecord> {
    await initialize();
    const db = await getDatabase();
    const existing = await requireEvidenceUpload(db, localEvidenceId);
    const updated: EvidenceUploadQueueRecord = {
      ...existing,
      state: "failed",
      lastError: error,
      updatedAt: failedAt,
    };

    await upsertEvidenceUpload(db, updated);

    return updated;
  }

  async function queueUnsafeShiftClose(
    input: QueueUnsafeShiftCloseInput,
  ): Promise<ShiftCloseOutboxRecord> {
    await initialize();
    const db = await getDatabase();
    const existing = await db.getFirstAsync<ShiftCloseOutboxRow>(
      "SELECT * FROM shift_close_outbox WHERE local_close_id = ?",
      input.localCloseId,
    );
    if (existing !== null) return mapShiftCloseOutbox(existing);

    const now = dependencies.clock();
    const record: ShiftCloseOutboxRecord = {
      localCloseId: input.localCloseId,
      request: input.request,
      state: "pending_sync",
      createdAt: now,
      updatedAt: now,
      attemptCount: 0,
    };
    await upsertShiftCloseOutbox(db, record);
    return record;
  }

  async function listShiftCloseOutbox(): Promise<readonly ShiftCloseOutboxRecord[]> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<ShiftCloseOutboxRow>(
      "SELECT * FROM shift_close_outbox ORDER BY created_at ASC",
    );
    return rows.map(mapShiftCloseOutbox);
  }

  async function listSyncQueue(): Promise<SyncQueueSummary> {
    await initialize();
    const db = await getDatabase();
    const [rows, pendingLotCountRow] = await Promise.all([
      db.getAllAsync<SyncCommandRow>(
        `SELECT * FROM sync_commands
         WHERE state NOT IN ('synced', 'discarded')
         ORDER BY created_at ASC`,
      ),
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count
         FROM capture_lots
         WHERE central_sync_state IN ('pending_central', 'local')`,
      ),
    ]);
    const queueCommands = sortSyncQueueItems(rows.map(mapSyncCommand));
    const summaries = queueCommands.map((command) => ({
      id: command.id,
      kind: command.kind,
      state: command.state,
      urgency: command.urgency,
      productDisplayName: command.productDisplayName,
      lotIdentity: command.lotIdentity,
      currentLocation: command.currentLocation,
      savedAt: command.savedAt,
      ...(command.lastError === undefined ? {} : { lastError: command.lastError }),
      ...(command.conflictId === undefined ? {} : { conflictId: command.conflictId }),
    }));
    const conflictCount = queueCommands.filter(
      (command) => command.state === "sync_conflict",
    ).length;
    const hasCriticalConflict = queueCommands.some(
      (command) => command.state === "sync_conflict" && command.urgency === "critical",
    );
    const oldestPendingCritical = summaries.find((command) => command.urgency === "critical");
    const hasFailed = queueCommands.some((command) => command.state === "sync_failed");
    const hasSyncing = queueCommands.some((command) => command.state === "syncing");
    const pendingCentralLotCount =
      dependencies.createCentralLot === undefined ? 0 : (pendingLotCountRow?.count ?? 0);
    const totalCount = summaries.length + pendingCentralLotCount;

    return parseSyncQueueSummary({
      state:
        conflictCount > 0
          ? "has_conflict"
          : hasSyncing
            ? "syncing"
            : hasFailed
              ? "has_failed"
              : totalCount > 0
                ? "has_pending"
                : "empty",
      totalCount,
      conflictCount,
      hasCriticalConflict,
      criticalCount: queueCommands.filter((command) => command.urgency === "critical").length,
      highCount: queueCommands.filter((command) => command.urgency === "high").length,
      mediumCount:
        queueCommands.filter((command) => command.urgency === "medium").length +
        pendingCentralLotCount,
      lowCount: queueCommands.filter((command) => command.urgency === "low").length,
      ...(oldestPendingCritical === undefined ? {} : { oldestPendingCritical }),
      commands: summaries,
      updatedAt: dependencies.clock(),
    });
  }

  async function saveOfflineAction(input: OfflineActionCommand): Promise<SyncCommandRecord> {
    await initialize();
    const action = parseOfflineActionCommand(input);
    const db = await getDatabase();
    let savedCommand: SyncCommandRecord | undefined;

    await db.withTransactionAsync(async () => {
      const snapshot = await snapshotForOfflineAction(db, action);
      const existing = await db.getFirstAsync<SyncCommandRow>(
        "SELECT * FROM sync_commands WHERE idempotency_key = ?",
        snapshot.idempotencyKey,
      );

      if (existing !== null) {
        savedCommand = mapSyncCommand(existing);
        return;
      }

      const savedAt = dependencies.clock();
      const command = parseSyncCommandRecord({
        id: nextGeneratedId(dependencies),
        idempotencyKey: snapshot.idempotencyKey,
        kind: action.kind,
        state: "pending_sync",
        urgency: classifySyncCommandUrgency({
          kind: action.kind,
          ...(snapshot.taskAction === undefined ? {} : { action: snapshot.taskAction }),
          requiredResolution: snapshot.task.requiredResolution,
          riskState: snapshot.task.riskState,
          currentLocation: snapshot.task.currentLocation,
        }),
        payload: action,
        taskId: snapshot.task.id,
        taskActiveKey: snapshot.task.activeKey,
        lotId: snapshot.task.lotId,
        productDisplayName: snapshot.task.productDisplayName,
        lotIdentity: snapshot.task.lotIdentity,
        currentLocation: snapshot.task.currentLocation,
        riskState: snapshot.task.riskState,
        requiredResolution: snapshot.task.requiredResolution,
        createdAt: savedAt,
        updatedAt: savedAt,
        savedAt,
        attemptCount: 0,
      });

      await upsertSyncCommand(db, command);
      await upsertLocalAuditEvent(db, createLocalAuditEventForCommand(command, "pending_ack"));
      await attachSyncMetadata(db, command);
      savedCommand = command;
    });

    if (savedCommand === undefined) {
      throw new Error("Offline action was not saved.");
    }

    return savedCommand;
  }

  async function markSyncCommandAttempt(
    commandIds: readonly string[],
    attemptedAt: string,
  ): Promise<readonly SyncCommandRecord[]> {
    await initialize();
    const db = await getDatabase();
    const updatedCommands: SyncCommandRecord[] = [];

    await db.withTransactionAsync(async () => {
      for (const commandId of commandIds) {
        const existing = await requireSyncCommand(db, commandId);
        const updated = parseSyncCommandRecord({
          ...existing,
          state: "syncing",
          updatedAt: attemptedAt,
          firstAttemptedAt: existing.firstAttemptedAt ?? attemptedAt,
          lastAttemptedAt: attemptedAt,
          attemptCount: existing.attemptCount + 1,
        });

        await upsertSyncCommand(db, updated);
        await attachSyncMetadata(db, updated);
        updatedCommands.push(updated);
      }
    });

    return updatedCommands;
  }

  async function applySyncTransportResult(result: SyncTransportResult): Promise<SyncCommandRecord> {
    await initialize();
    const parsed = parseSyncTransportResult(result);
    const db = await getDatabase();
    let savedCommand: SyncCommandRecord | undefined;

    await db.withTransactionAsync(async () => {
      const existing = await requireSyncCommand(db, parsed.commandId);
      const updatedAt = "syncedAt" in parsed ? parsed.syncedAt : dependencies.clock();
      const updated =
        parsed.status === "ack"
          ? parseSyncCommandRecord({
              ...existing,
              state: "synced",
              updatedAt,
              ackedAt: parsed.syncedAt,
              lastError: undefined,
              nextRetryAt: undefined,
              conflictId: undefined,
            })
          : parsed.status === "retry"
            ? parseSyncCommandRecord({
                ...existing,
                state: "sync_failed",
                updatedAt,
                lastError: parsed.error,
                ackedAt: undefined,
                conflictId: undefined,
                ...(parsed.retryAfterSeconds === undefined
                  ? {}
                  : {
                      nextRetryAt: new Date(
                        Date.parse(updatedAt) + parsed.retryAfterSeconds * 1000,
                      ).toISOString(),
                    }),
              })
            : parseSyncCommandRecord({
                ...existing,
                state: "sync_conflict",
                updatedAt,
                conflictId: parsed.conflict.id,
                ackedAt: undefined,
                nextRetryAt: undefined,
              });

      if (parsed.status === "conflict") {
        await upsertSyncConflict(db, parseSyncConflictRecord(parsed.conflict));
      }

      await upsertSyncCommand(db, updated);
      await reconcileLocalAuditEvent(db, parsed, updated);
      await applyCentralSyncApplicationResult(db, parsed, updated);
      await attachSyncMetadata(db, updated);
      savedCommand = updated;
    });

    if (savedCommand === undefined) {
      throw new Error("Sync result was not applied.");
    }

    return savedCommand;
  }

  async function resolveSyncConflict(input: ResolveSyncConflictInput): Promise<SyncConflictRecord> {
    await initialize();
    const db = await getDatabase();
    let resolvedConflict: SyncConflictRecord | undefined;

    await db.withTransactionAsync(async () => {
      const existingRow = await db.getFirstAsync<SyncConflictRow>(
        "SELECT * FROM sync_conflicts WHERE id = ?",
        parseLotId(input.conflictId),
      );

      if (existingRow === null) {
        throw new Error(`Cannot resolve an unknown sync conflict: ${input.conflictId}`);
      }

      const existing = mapSyncConflict(existingRow);
      const resolved = parseSyncConflictRecord({
        ...existing,
        resolvedAt: input.resolvedAt,
        resolutionAction: input.action,
        ...(input.reason === undefined ? {} : { resolutionReason: input.reason }),
      });
      const command = await requireSyncCommand(db, existing.commandId);
      const commandState = input.action === "keep_local_and_retry" ? "pending_sync" : "discarded";
      const updatedCommand = parseSyncCommandRecord({
        ...command,
        state: commandState,
        updatedAt: input.resolvedAt,
        ...(commandState === "discarded"
          ? {
              discardedAt: input.resolvedAt,
              discardReason: input.reason ?? "Atualizado pela tarefa atual",
            }
          : { conflictId: undefined }),
      });

      await upsertSyncConflict(db, resolved);
      await upsertSyncCommand(db, updatedCommand);
      await upsertLocalAuditEvent(db, createConflictResolutionAuditEvent(resolved, updatedCommand));
      await attachSyncMetadata(db, updatedCommand);
      resolvedConflict = resolved;
    });

    if (resolvedConflict === undefined) {
      throw new Error("Sync conflict was not resolved.");
    }

    return resolvedConflict;
  }

  async function loadSyncConflict(conflictId: string): Promise<SyncConflictRecord | null> {
    await initialize();
    const db = await getDatabase();
    const row = await db.getFirstAsync<SyncConflictRow>(
      "SELECT * FROM sync_conflicts WHERE id = ?",
      parseLotId(conflictId),
    );

    return row === null ? null : mapSyncConflict(row);
  }

  async function listAuditTimeline(input: {
    targetType: AuditTimelineItem["target"]["type"];
    targetId: string;
    limit?: number;
  }): Promise<readonly AuditTimelineItem[]> {
    await initialize();
    const db = await getDatabase();
    const rows = await db.getAllAsync<LocalAuditEventRow>(
      `SELECT * FROM local_audit_events
       WHERE target_type = ? AND target_id = ?
       ORDER BY occurred_at DESC
       LIMIT ?`,
      input.targetType,
      parseLotId(input.targetId),
      input.limit ?? 25,
    );

    return rows.map((row) => {
      const { idempotencyKey: _idempotencyKey, ...event } = mapLocalAuditEvent(row);
      void _idempotencyKey;

      return event;
    });
  }

  async function snapshotForOfflineAction(
    db: SQLite.SQLiteDatabase,
    action: OfflineActionCommand,
  ): Promise<{
    idempotencyKey: string;
    task: TodayTaskRecord;
    taskAction?: TaskResolutionCommand["action"];
  }> {
    if (action.kind === "resolve_task") {
      const task = await requireTodayTask(db, action.payload.taskId);

      return {
        idempotencyKey: `${action.kind}:${action.payload.taskId}:${action.payload.action}:${action.payload.occurredAt}`,
        task,
        taskAction: action.payload.action,
      };
    }

    if (action.kind === "request_markdown") {
      const task =
        action.payload.sourceTaskId === undefined
          ? await findTaskForLot(db, action.payload.lotId, action.payload.occurredAt)
          : await requireTodayTask(db, action.payload.sourceTaskId);

      return {
        idempotencyKey: `${action.kind}:${action.payload.lotId}:${action.payload.sourceTaskId ?? "lot"}:${action.payload.occurredAt}`,
        task,
      };
    }

    const task = await requireTodayTask(db, action.payload.taskId);

    return {
      idempotencyKey: `${action.kind}:${action.payload.workflowId}:${action.payload.taskId}:${action.payload.occurredAt}`,
      task,
      taskAction:
        action.kind === "decide_markdown"
          ? action.payload.decision === "approved"
            ? "approve_markdown"
            : "reject_markdown"
          : action.kind === "record_markdown_application"
            ? "apply_markdown"
            : "confirm_markdown_on_shelf",
    };
  }

  async function findTaskForLot(
    db: SQLite.SQLiteDatabase,
    lotId: string,
    occurredAt: string,
  ): Promise<TodayTaskRecord> {
    const row = await db.getFirstAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE lot_id = ? AND status = 'active' ORDER BY priority ASC LIMIT 1",
      parseLotId(lotId),
    );

    if (row !== null) {
      return mapTodayTask(row);
    }

    const lotRow = await db.getFirstAsync<LotRow>(
      `${LOT_SELECT} WHERE l.id = ?`,
      parseLotId(lotId),
    );

    if (lotRow === null) {
      throw new Error(`Cannot save an offline action for an unknown lot: ${lotId}`);
    }

    const lot = mapLotSnapshot(lotRow);

    return parseTodayTaskRecord({
      id: `offline:${lot.id}:request_markdown`,
      activeKey: `offline:${lot.id}:request_markdown`,
      lotId: lot.id,
      productDisplayName: lot.productDisplayName,
      lotIdentity: lot.identity,
      currentLocation: lot.currentObservation.location,
      riskState: "markdown_due",
      severity: "medium",
      dueBucket: "today",
      requiredResolution: "request_markdown",
      section: "request_markdown",
      ownerLabel: "Equipe do turno",
      status: "active",
      sourceRisk: {
        state: "markdown_due",
        reasons: [{ code: "expires_in_15_days", field: "offlineMarkdown" }],
      },
      priority: 3,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  async function requireTodayTask(
    db: SQLite.SQLiteDatabase,
    taskId: string,
  ): Promise<TodayTaskRecord> {
    const row = await db.getFirstAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE id = ?",
      parseLotId(taskId),
    );

    if (row === null) {
      throw new Error(`Cannot save an offline action for an unknown Today task: ${taskId}`);
    }

    return mapTodayTask(row);
  }

  async function requireEvidenceUpload(
    db: SQLite.SQLiteDatabase,
    localEvidenceId: string,
  ): Promise<EvidenceUploadQueueRecord> {
    const row = await db.getFirstAsync<EvidenceUploadRow>(
      "SELECT * FROM evidence_uploads WHERE local_evidence_id = ?",
      parseLotId(localEvidenceId),
    );

    if (row === null) {
      throw new Error(`Cannot load an unknown evidence upload: ${localEvidenceId}`);
    }

    return mapEvidenceUpload(row);
  }

  async function requireSyncCommand(
    db: SQLite.SQLiteDatabase,
    commandId: string,
  ): Promise<SyncCommandRecord> {
    const row = await db.getFirstAsync<SyncCommandRow>(
      "SELECT * FROM sync_commands WHERE id = ?",
      parseLotId(commandId),
    );

    if (row === null) {
      throw new Error(`Cannot load an unknown sync command: ${commandId}`);
    }

    return mapSyncCommand(row);
  }

  async function reconcilePreparedCentralTasks(
    db: SQLite.SQLiteDatabase,
    activeCentralTaskIds: ReadonlySet<string>,
    preparedCentralLotIds: ReadonlySet<string>,
    resolvedByTaskId: ReadonlyMap<string, ResolvedTaskHistorySnippet>,
    reconciledAt: string,
  ): Promise<void> {
    const rows = await db.getAllAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE status = 'active'",
    );

    for (const row of rows) {
      const task = mapTodayTask(row);
      if (activeCentralTaskIds.has(task.id)) {
        continue;
      }

      if (task.recheckParentId !== undefined) {
        const parentRow = await db.getFirstAsync<TodayTaskRow>(
          "SELECT * FROM today_tasks WHERE id = ?",
          task.recheckParentId,
        );
        const parentTask = parentRow === null ? undefined : mapTodayTask(parentRow);
        if (shouldPreserveLocalResolutionProjection(parentTask)) {
          continue;
        }
      }

      const lotRow = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM capture_lots WHERE id = ? LIMIT 1",
        task.lotId,
      );
      const shouldResolveStaleTask =
        task.sync?.state === "synced" || preparedCentralLotIds.has(task.lotId) || lotRow === null;

      if (!shouldResolveStaleTask) {
        continue;
      }

      await upsertTodayTask(
        db,
        resolvedTaskFromCentralHistory(task, resolvedByTaskId.get(task.id), reconciledAt),
      );
    }
  }

  async function applyCentralSyncApplicationResult(
    db: SQLite.SQLiteDatabase,
    result: SyncTransportResult,
    command: SyncCommandRecord,
  ): Promise<void> {
    if (result.status !== "ack" || result.centralResult === undefined) {
      return;
    }

    if (result.centralResult.kind === "active_task") {
      await upsertTodayTask(db, result.centralResult.task);
      return;
    }

    if (result.centralResult.kind !== "resolved_history") {
      return;
    }

    const row = await db.getFirstAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE id = ?",
      command.taskId,
    );
    if (row === null) {
      return;
    }

    await upsertTodayTask(
      db,
      resolvedTaskFromCentralHistory(
        mapTodayTask(row),
        result.centralResult.history,
        result.syncedAt,
      ),
    );
  }

  function resolvedTaskFromCentralHistory(
    task: TodayTaskRecord,
    history: CentralResolvedTaskHistory | ResolvedTaskHistorySnippet | undefined,
    resolvedAt: string,
  ): TodayTaskRecord {
    const historyAt = history === undefined ? resolvedAt : resolvedHistoryOccurredAt(history);
    const updatedAt = history === undefined ? resolvedAt : resolvedHistoryUpdatedAt(history);
    const historyEntry =
      history === undefined
        ? undefined
        : {
            action: history.action,
            actorLabel: history.actorLabel,
            occurredAt: historyAt,
            ...("evidence" in history && history.evidence !== undefined
              ? { evidence: history.evidence }
              : {}),
          };

    return parseTodayTaskRecord({
      ...task,
      status: "resolved",
      ...(history === undefined ? {} : { currentLocation: history.currentLocation }),
      resolvedAt: historyAt,
      updatedAt,
      resolutionHistory:
        historyEntry === undefined
          ? task.resolutionHistory
          : appendTaskResolutionHistoryEntry(task.resolutionHistory, historyEntry),
    });
  }

  function resolvedHistoryOccurredAt(
    history: CentralResolvedTaskHistory | ResolvedTaskHistorySnippet,
  ): string {
    return "resolvedAt" in history ? history.resolvedAt : history.occurredAt;
  }

  function resolvedHistoryUpdatedAt(
    history: CentralResolvedTaskHistory | ResolvedTaskHistorySnippet,
  ): string {
    return "updatedAt" in history ? history.updatedAt : resolvedHistoryOccurredAt(history);
  }

  async function attachSyncMetadata(
    db: SQLite.SQLiteDatabase,
    command: SyncCommandRecord,
  ): Promise<void> {
    const row = await db.getFirstAsync<TodayTaskRow>(
      "SELECT * FROM today_tasks WHERE id = ?",
      command.taskId,
    );

    if (row === null) {
      return;
    }

    const task = mapTodayTask(row);
    const sync =
      command.state === "synced"
        ? {
            state: command.state,
            savedAt: command.savedAt,
            lastSyncedAt: command.ackedAt ?? command.updatedAt,
            attemptCount: command.attemptCount,
          }
        : command.state === "discarded"
          ? {
              state: command.state,
              savedAt: command.savedAt,
              attemptCount: command.attemptCount,
            }
          : {
              state: command.state,
              savedAt: command.savedAt,
              pendingCommandId: command.id,
              ...(command.conflictId === undefined ? {} : { conflictId: command.conflictId }),
              ...(command.lastError === undefined ? {} : { lastError: command.lastError }),
              attemptCount: command.attemptCount,
            };

    await upsertTodayTask(
      db,
      parseTodayTaskRecord({
        ...task,
        sync,
        updatedAt: command.updatedAt,
      }),
    );
  }

  return {
    initialize,
    getOrCreateDeviceInstallId,
    hydratePrepareTurn,
    loadPrepareTurnCacheStatus,
    loadOnboardingProgress,
    saveOnboardingProgress,
    searchCentralProducts,
    createProductDraft,
    createProduct,
    findProducts,
    listFrequentProducts,
    listProductCategories,
    findProductsByCategory,
    saveLot,
    syncPendingCentralLots,
    appendObservation,
    listRecentLots,
    loadLotDetail,
    refreshTodayTasks,
    listActiveTodayTasks,
    listFutureAttention,
    resolveTodayTask,
    loadTodayTask,
    requestMarkdown,
    decideMarkdown,
    recordMarkdownApplication,
    confirmMarkdownOnShelf,
    loadMarkdownWorkflowForLot,
    listActiveMarkdownWorkflows,
    loadMarkdownEntryState,
    registerAlertDevice,
    loadAlertChannelState,
    refreshTaskAlertStates,
    listTaskAlertStates,
    recordAlertAttempt,
    acknowledgeEscalation,
    resolvePushOpenIntent,
    loadOfflineCacheStatus,
    queueEvidenceUpload,
    listEvidenceUploads,
    markEvidenceUploadAttempt,
    applyEvidenceUploadIntent,
    applyEvidenceUploadAck,
    markEvidenceUploadFailed,
    queueUnsafeShiftClose,
    listShiftCloseOutbox,
    listSyncQueue,
    saveOfflineAction,
    markSyncCommandAttempt,
    applySyncTransportResult,
    resolveSyncConflict,
    loadSyncConflict,
    listAuditTimeline,
  };
}

async function initializeDatabase(
  getDatabase: () => Promise<SQLite.SQLiteDatabase>,
): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS capture_products (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category_name TEXT,
      category_profile_json TEXT NOT NULL,
      supplier_name TEXT,
      gtin TEXT,
      identifiers_json TEXT,
      product_override_json TEXT,
      central_product_id TEXT,
      catalog_source TEXT,
      review_status TEXT,
      central_sync_state TEXT,
      draft_id TEXT,
      draft_review_message TEXT,
      similar_candidate_count INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS capture_categories (
      category_id TEXT PRIMARY KEY NOT NULL,
      category_name TEXT NOT NULL,
      category_profile_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS device_installations (
      scope TEXT PRIMARY KEY NOT NULL,
      install_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS capture_lots (
      id TEXT PRIMARY KEY NOT NULL,
      product_id TEXT NOT NULL,
      identity_source TEXT NOT NULL,
      identity_value TEXT NOT NULL,
      mode TEXT NOT NULL,
      expires_at TEXT,
      received_at TEXT,
      quality_inspection_due_at TEXT,
      quality_window_days INTEGER,
      approximate_quantity REAL NOT NULL,
      initial_location_kind TEXT NOT NULL,
      initial_location_custom_name TEXT,
      current_observation_id TEXT NOT NULL,
      current_status TEXT NOT NULL,
      current_actor_label TEXT NOT NULL,
      current_occurred_at TEXT NOT NULL,
      current_location_kind TEXT NOT NULL,
      current_location_custom_name TEXT,
      current_quantity_state TEXT NOT NULL,
      current_approximate_quantity REAL,
      current_is_correction INTEGER NOT NULL,
      current_correction_reason TEXT,
      central_lot_id TEXT,
      central_sync_state TEXT,
      central_source TEXT,
      task_projection_json TEXT,
      central_ack_message TEXT,
      FOREIGN KEY (product_id) REFERENCES capture_products(id)
    );
    CREATE TABLE IF NOT EXISTS capture_observations (
      id TEXT PRIMARY KEY NOT NULL,
      lot_id TEXT NOT NULL,
      status TEXT NOT NULL,
      actor_label TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      location_kind TEXT NOT NULL,
      location_custom_name TEXT,
      quantity_state TEXT NOT NULL,
      approximate_quantity REAL,
      is_correction INTEGER NOT NULL,
      correction_reason TEXT,
      FOREIGN KEY (lot_id) REFERENCES capture_lots(id)
    );
    CREATE TABLE IF NOT EXISTS today_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      active_key TEXT NOT NULL UNIQUE,
      lot_id TEXT NOT NULL,
      product_display_name TEXT NOT NULL,
      lot_identity_source TEXT NOT NULL,
      lot_identity_value TEXT NOT NULL,
      current_location_kind TEXT NOT NULL,
      current_location_custom_name TEXT,
      risk_state TEXT NOT NULL,
      severity TEXT NOT NULL,
      due_bucket TEXT NOT NULL,
      required_resolution TEXT NOT NULL,
      section TEXT NOT NULL,
      owner_label TEXT NOT NULL,
      status TEXT NOT NULL,
      source_risk_json TEXT NOT NULL,
      priority INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      recheck_parent_id TEXT,
      markdown_workflow_id TEXT,
      markdown_stage TEXT,
      responsible_actor_label TEXT,
      resolution_history_json TEXT,
      sync_json TEXT,
      FOREIGN KEY (lot_id) REFERENCES capture_lots(id)
    );
    CREATE TABLE IF NOT EXISTS offline_cache_status (
      id TEXT PRIMARY KEY NOT NULL,
      state TEXT NOT NULL,
      last_refreshed_at TEXT,
      active_task_count INTEGER NOT NULL,
      required_lot_snippet_count INTEGER NOT NULL,
      stale_after_hours REAL NOT NULL,
      source TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS prepare_turn_cache_status (
      id TEXT PRIMARY KEY NOT NULL,
      state TEXT NOT NULL,
      source TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_central_read_at TEXT,
      stale_after_hours REAL NOT NULL,
      product_count INTEGER NOT NULL,
      lot_count INTEGER NOT NULL,
      active_task_count INTEGER NOT NULL,
      conflict_count INTEGER NOT NULL,
      resolved_history_count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS onboarding_progress (
      subject_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      flow_id TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      completed_at TEXT,
      skipped_at TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (subject_id, store_id, flow_id, version)
    );
    CREATE TABLE IF NOT EXISTS evidence_uploads (
      local_evidence_id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      target_json TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL,
      asset_id TEXT,
      upload_path TEXT,
      uploaded_at TEXT,
      retention_expires_at TEXT,
      last_error TEXT,
      FOREIGN KEY (task_id) REFERENCES today_tasks(id)
    );
    CREATE TABLE IF NOT EXISTS shift_close_outbox (
      local_close_id TEXT PRIMARY KEY NOT NULL,
      request_json TEXT NOT NULL,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL,
      server_closure_id TEXT,
      last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS sync_commands (
      id TEXT PRIMARY KEY NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      state TEXT NOT NULL,
      urgency TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      task_id TEXT NOT NULL,
      task_active_key TEXT NOT NULL,
      lot_id TEXT NOT NULL,
      product_display_name TEXT NOT NULL,
      lot_identity_source TEXT NOT NULL,
      lot_identity_value TEXT NOT NULL,
      current_location_kind TEXT NOT NULL,
      current_location_custom_name TEXT,
      risk_state TEXT NOT NULL,
      required_resolution TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      first_attempted_at TEXT,
      last_attempted_at TEXT,
      attempt_count INTEGER NOT NULL,
      next_retry_at TEXT,
      last_error TEXT,
      acked_at TEXT,
      conflict_id TEXT,
      discarded_at TEXT,
      discard_reason TEXT,
      FOREIGN KEY (task_id) REFERENCES today_tasks(id)
    );
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id TEXT PRIMARY KEY NOT NULL,
      command_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      reason TEXT NOT NULL,
      local_action_json TEXT NOT NULL,
      remote_change_json TEXT NOT NULL,
      allowed_actions_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution_action TEXT,
      resolution_reason TEXT,
      FOREIGN KEY (command_id) REFERENCES sync_commands(id)
    );
    CREATE TABLE IF NOT EXISTS local_audit_events (
      event_id TEXT PRIMARY KEY NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      store_id TEXT NOT NULL,
      store_name TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_display_name TEXT NOT NULL,
      actor_role_snapshot TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_label TEXT,
      occurred_at TEXT NOT NULL,
      received_at TEXT,
      summary TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL,
      linked_event_id TEXT,
      metadata_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS today_future_attention (
      id TEXT PRIMARY KEY NOT NULL,
      lot_id TEXT NOT NULL,
      product_display_name TEXT NOT NULL,
      lot_identity_source TEXT NOT NULL,
      lot_identity_value TEXT NOT NULL,
      current_location_kind TEXT NOT NULL,
      current_location_custom_name TEXT,
      source_risk_reasons_json TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      FOREIGN KEY (lot_id) REFERENCES capture_lots(id)
    );
    CREATE TABLE IF NOT EXISTS markdown_workflows (
      id TEXT PRIMARY KEY NOT NULL,
      lot_id TEXT NOT NULL,
      status TEXT NOT NULL,
      current_stage TEXT NOT NULL,
      request_reason TEXT NOT NULL,
      early_justification TEXT,
      requested_at TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      approved_at TEXT,
      approved_by TEXT,
      rejected_at TEXT,
      rejected_by TEXT,
      rejection_reason TEXT,
      applied_at TEXT,
      applied_by TEXT,
      application_evidence_json TEXT,
      shelf_confirmed_at TEXT,
      shelf_confirmed_by TEXT,
      shelf_confirmation_evidence_json TEXT,
      stage_history_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (lot_id) REFERENCES capture_lots(id)
    );
    CREATE TABLE IF NOT EXISTS device_alert_channels (
      device_id TEXT PRIMARY KEY NOT NULL,
      device_label TEXT NOT NULL,
      audience_role TEXT NOT NULL,
      permission_status TEXT NOT NULL,
      expo_push_token TEXT,
      registered_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS task_alert_states (
      task_id TEXT PRIMARY KEY NOT NULL,
      task_active_key TEXT NOT NULL,
      channel_state TEXT NOT NULL,
      attempt_state TEXT NOT NULL,
      audience TEXT NOT NULL,
      escalation_state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_reminder_at TEXT,
      next_reminder_at TEXT,
      escalated_at TEXT,
      leadership_acknowledged_at TEXT,
      retry_count INTEGER,
      failure_reason TEXT,
      last_attempt_id TEXT,
      FOREIGN KEY (task_id) REFERENCES today_tasks(id)
    );
    CREATE TABLE IF NOT EXISTS alert_attempts (
      attempt_id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      task_active_key TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      failure_reason TEXT,
      provider_ticket_id TEXT,
      provider_receipt_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES today_tasks(id)
    );
    CREATE TABLE IF NOT EXISTS escalation_receipts (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      task_active_key TEXT NOT NULL,
      actor_label TEXT NOT NULL,
      acknowledged_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES today_tasks(id)
    );
    CREATE INDEX IF NOT EXISTS capture_products_normalized_name_idx
      ON capture_products(normalized_name);
    CREATE INDEX IF NOT EXISTS capture_products_gtin_idx ON capture_products(gtin);
    CREATE INDEX IF NOT EXISTS capture_lots_identity_value_idx ON capture_lots(identity_value);
    CREATE INDEX IF NOT EXISTS capture_observations_lot_occurred_at_idx
      ON capture_observations(lot_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS today_tasks_status_priority_due_idx
      ON today_tasks(status, priority, due_bucket, updated_at DESC);
    CREATE INDEX IF NOT EXISTS today_tasks_lot_status_idx ON today_tasks(lot_id, status);
    CREATE INDEX IF NOT EXISTS today_tasks_active_key_idx ON today_tasks(active_key);
    CREATE INDEX IF NOT EXISTS offline_cache_status_state_idx ON offline_cache_status(state);
    CREATE INDEX IF NOT EXISTS prepare_turn_cache_status_state_idx
      ON prepare_turn_cache_status(state);
    CREATE INDEX IF NOT EXISTS onboarding_progress_store_status_idx
      ON onboarding_progress(store_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS evidence_uploads_state_created_idx
      ON evidence_uploads(state, created_at);
    CREATE INDEX IF NOT EXISTS evidence_uploads_task_state_idx
      ON evidence_uploads(task_id, state);
    CREATE INDEX IF NOT EXISTS shift_close_outbox_state_created_idx
      ON shift_close_outbox(state, created_at);
    CREATE INDEX IF NOT EXISTS sync_commands_state_urgency_created_idx
      ON sync_commands(state, urgency, created_at);
    CREATE INDEX IF NOT EXISTS sync_commands_task_state_idx ON sync_commands(task_id, state);
    CREATE UNIQUE INDEX IF NOT EXISTS sync_commands_idempotency_key_idx
      ON sync_commands(idempotency_key);
    CREATE INDEX IF NOT EXISTS sync_conflicts_command_idx ON sync_conflicts(command_id);
    CREATE INDEX IF NOT EXISTS local_audit_events_target_occurred_idx
      ON local_audit_events(target_type, target_id, occurred_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS local_audit_events_idempotency_key_idx
      ON local_audit_events(idempotency_key);
    CREATE INDEX IF NOT EXISTS today_future_attention_lot_idx ON today_future_attention(lot_id);
    CREATE INDEX IF NOT EXISTS markdown_workflows_lot_status_idx
      ON markdown_workflows(lot_id, status);
    CREATE INDEX IF NOT EXISTS markdown_workflows_current_stage_idx
      ON markdown_workflows(current_stage);
    CREATE INDEX IF NOT EXISTS markdown_workflows_updated_at_idx
      ON markdown_workflows(updated_at DESC);
    CREATE INDEX IF NOT EXISTS task_alert_states_task_id_active_key_idx
      ON task_alert_states(task_id, task_active_key);
    CREATE INDEX IF NOT EXISTS task_alert_states_attempt_state_next_reminder_idx
      ON task_alert_states(attempt_state, next_reminder_at);
    CREATE INDEX IF NOT EXISTS alert_attempts_task_created_at_idx
      ON alert_attempts(task_id, created_at DESC);
  `);

  await ensureTodayTaskMarkdownColumns(db);
  await ensureTodayTaskSyncColumns(db);
  await ensureProductCatalogColumns(db);
  await ensureCaptureLotCentralColumns(db);
}

async function findExistingProduct(
  db: SQLite.SQLiteDatabase,
  normalizedName: string,
  gtin: string | undefined,
  identifiers: readonly ProductIdentifierInput[] = [],
): Promise<ProductRow | null> {
  const firstIdentifierValue = identifiers[0]?.value;

  if (gtin === undefined) {
    const rows = await db.getAllAsync<ProductRow>(
      "SELECT * FROM capture_products WHERE normalized_name = ? OR (? IS NOT NULL AND identifiers_json LIKE ?)",
      normalizedName,
      firstIdentifierValue ?? null,
      firstIdentifierValue === undefined ? null : `%${firstIdentifierValue}%`,
    );
    return (
      rows.find((row) =>
        productHasAnyIdentifier(localProductToCatalogItem(mapProduct(row)), identifiers),
      ) ??
      rows[0] ??
      null
    );
  }

  const rows = await db.getAllAsync<ProductRow>(
    "SELECT * FROM capture_products WHERE normalized_name = ? OR gtin = ? OR identifiers_json LIKE ?",
    normalizedName,
    gtin,
    `%${gtin}%`,
  );

  return (
    rows.find((row) =>
      productHasAnyIdentifier(localProductToCatalogItem(mapProduct(row)), identifiers),
    ) ??
    rows[0] ??
    null
  );
}

async function insertObservation(
  db: SQLite.SQLiteDatabase,
  observation: CaptureObservationRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO capture_observations (
      id, lot_id, status, actor_label, occurred_at, location_kind, location_custom_name,
      quantity_state, approximate_quantity, is_correction, correction_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    observation.id,
    observation.lotId,
    observation.status,
    observation.actorLabel,
    observation.occurredAt,
    observation.location.kind,
    observation.location.kind === "other" ? observation.location.customName : null,
    observation.quantityState,
    observation.quantityState === "estimated" ? observation.approximateQuantity : null,
    observation.isCorrection ? 1 : 0,
    observation.correctionReason ?? null,
  );
}

async function upsertTodayTask(db: SQLite.SQLiteDatabase, task: TodayTaskRecord): Promise<void> {
  await db.runAsync(
    `INSERT INTO today_tasks (
      id, active_key, lot_id, product_display_name, lot_identity_source, lot_identity_value,
      current_location_kind, current_location_custom_name, risk_state, severity, due_bucket,
      required_resolution, section, owner_label, status, source_risk_json, priority,
      created_at, updated_at, resolved_at, recheck_parent_id, markdown_workflow_id,
      markdown_stage, responsible_actor_label, resolution_history_json, sync_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      active_key = excluded.active_key,
      lot_id = excluded.lot_id,
      product_display_name = excluded.product_display_name,
      lot_identity_source = excluded.lot_identity_source,
      lot_identity_value = excluded.lot_identity_value,
      current_location_kind = excluded.current_location_kind,
      current_location_custom_name = excluded.current_location_custom_name,
      risk_state = excluded.risk_state,
      severity = excluded.severity,
      due_bucket = excluded.due_bucket,
      required_resolution = excluded.required_resolution,
      section = excluded.section,
      owner_label = excluded.owner_label,
      status = excluded.status,
      source_risk_json = excluded.source_risk_json,
      priority = excluded.priority,
      updated_at = excluded.updated_at,
      resolved_at = excluded.resolved_at,
      recheck_parent_id = excluded.recheck_parent_id,
      markdown_workflow_id = excluded.markdown_workflow_id,
      markdown_stage = excluded.markdown_stage,
      responsible_actor_label = excluded.responsible_actor_label,
      resolution_history_json = excluded.resolution_history_json,
      sync_json = excluded.sync_json`,
    task.id,
    task.activeKey,
    task.lotId,
    task.productDisplayName,
    task.lotIdentity.identitySource,
    task.lotIdentity.value,
    task.currentLocation.kind,
    task.currentLocation.kind === "other" ? task.currentLocation.customName : null,
    task.riskState,
    task.severity,
    task.dueBucket,
    task.requiredResolution,
    task.section,
    task.ownerLabel,
    task.status,
    JSON.stringify(task.sourceRisk),
    task.priority,
    task.createdAt,
    task.updatedAt,
    task.resolvedAt ?? null,
    task.recheckParentId ?? null,
    task.markdownWorkflowId ?? null,
    task.markdownStage ?? null,
    task.responsibleActorLabel ?? null,
    task.resolutionHistory === undefined ? null : JSON.stringify(task.resolutionHistory),
    task.sync === undefined ? null : JSON.stringify(task.sync),
  );
}

async function resolveActiveLotTasksExcept(
  db: SQLite.SQLiteDatabase,
  centralTask: TodayTaskRecord,
  resolvedAt: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE today_tasks
     SET status = 'resolved', resolved_at = ?, updated_at = ?
     WHERE status = 'active' AND lot_id = ? AND id <> ?`,
    resolvedAt,
    resolvedAt,
    centralTask.lotId,
    centralTask.id,
  );
}

async function upsertFutureAttention(
  db: SQLite.SQLiteDatabase,
  record: FutureAttentionRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO today_future_attention (
      id, lot_id, product_display_name, lot_identity_source, lot_identity_value,
      current_location_kind, current_location_custom_name, source_risk_reasons_json, observed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      lot_id = excluded.lot_id,
      product_display_name = excluded.product_display_name,
      lot_identity_source = excluded.lot_identity_source,
      lot_identity_value = excluded.lot_identity_value,
      current_location_kind = excluded.current_location_kind,
      current_location_custom_name = excluded.current_location_custom_name,
      source_risk_reasons_json = excluded.source_risk_reasons_json,
      observed_at = excluded.observed_at`,
    record.id,
    record.lotId,
    record.productDisplayName,
    record.lotIdentity.identitySource,
    record.lotIdentity.value,
    record.currentLocation.kind,
    record.currentLocation.kind === "other" ? record.currentLocation.customName : null,
    JSON.stringify(record.sourceRiskReasons),
    record.observedAt,
  );
}

async function upsertOfflineCacheStatus(
  db: SQLite.SQLiteDatabase,
  status: OfflineCacheStatus,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO offline_cache_status (
      id, state, last_refreshed_at, active_task_count, required_lot_snippet_count,
      stale_after_hours, source, updated_at
    ) VALUES ('today', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      state = excluded.state,
      last_refreshed_at = excluded.last_refreshed_at,
      active_task_count = excluded.active_task_count,
      required_lot_snippet_count = excluded.required_lot_snippet_count,
      stale_after_hours = excluded.stale_after_hours,
      source = excluded.source,
      updated_at = excluded.updated_at`,
    status.state,
    status.lastRefreshedAt ?? null,
    status.activeTaskCount,
    status.requiredLotSnippetCount,
    status.staleAfterHours,
    status.source,
    status.updatedAt,
  );
}

async function upsertPrepareTurnCacheStatus(
  db: SQLite.SQLiteDatabase,
  status: PrepareTurnCacheStatus,
): Promise<void> {
  const prepared = parsePrepareTurnCacheStatus(status);

  await db.runAsync(
    `INSERT INTO prepare_turn_cache_status (
      id, state, source, updated_at, last_central_read_at, stale_after_hours,
      product_count, lot_count, active_task_count, conflict_count, resolved_history_count
    ) VALUES ('prepare-turn', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      state = excluded.state,
      source = excluded.source,
      updated_at = excluded.updated_at,
      last_central_read_at = excluded.last_central_read_at,
      stale_after_hours = excluded.stale_after_hours,
      product_count = excluded.product_count,
      lot_count = excluded.lot_count,
      active_task_count = excluded.active_task_count,
      conflict_count = excluded.conflict_count,
      resolved_history_count = excluded.resolved_history_count`,
    prepared.state,
    prepared.source,
    prepared.updatedAt,
    prepared.lastCentralReadAt ?? null,
    prepared.staleAfterHours,
    prepared.productCount,
    prepared.lotCount,
    prepared.activeTaskCount,
    prepared.conflictCount,
    prepared.resolvedHistoryCount,
  );
}

async function upsertCentralProduct(
  db: SQLite.SQLiteDatabase,
  product: CentralProductSnippet,
): Promise<void> {
  await upsertCategoryRecord(
    db,
    {
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      categoryRuleProfile: product.categoryRuleProfile,
      productCount: 0,
    },
    product.updatedAt,
  );
  await upsertProductRecord(db, centralProductToRecord(product));
}

async function upsertCategoryRecord(
  db: SQLite.SQLiteDatabase,
  category: CaptureProductCategory,
  updatedAt: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO capture_categories (
      category_id, category_name, category_profile_json, updated_at
    ) VALUES (?, ?, ?, ?)
    ON CONFLICT(category_id) DO UPDATE SET
      category_name = excluded.category_name,
      category_profile_json = excluded.category_profile_json,
      updated_at = excluded.updated_at`,
    category.categoryId,
    category.categoryName,
    JSON.stringify(category.categoryRuleProfile),
    updatedAt,
  );
}

async function upsertProductRecord(
  db: SQLite.SQLiteDatabase,
  product: CaptureProductRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO capture_products (
      id, display_name, normalized_name, category_id, category_name, category_profile_json,
      supplier_name, gtin, identifiers_json, product_override_json, central_product_id, catalog_source,
      review_status, central_sync_state, draft_id, draft_review_message,
      similar_candidate_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      normalized_name = excluded.normalized_name,
      category_id = excluded.category_id,
      category_name = excluded.category_name,
      category_profile_json = excluded.category_profile_json,
      supplier_name = excluded.supplier_name,
      gtin = excluded.gtin,
      identifiers_json = excluded.identifiers_json,
      product_override_json = excluded.product_override_json,
      central_product_id = excluded.central_product_id,
      catalog_source = excluded.catalog_source,
      review_status = excluded.review_status,
      central_sync_state = excluded.central_sync_state,
      draft_id = excluded.draft_id,
      draft_review_message = excluded.draft_review_message,
      similar_candidate_count = excluded.similar_candidate_count`,
    product.id,
    product.displayName,
    product.normalizedName,
    product.categoryId,
    product.categoryName ?? null,
    JSON.stringify(product.categoryRuleProfile),
    product.supplierName ?? null,
    product.gtin ?? null,
    stringifyProductIdentifiers(product),
    product.productRuleOverride === undefined ? null : JSON.stringify(product.productRuleOverride),
    product.centralProductId ?? null,
    product.catalogSource ?? null,
    product.reviewStatus ?? null,
    product.centralSyncState ?? null,
    product.draftId ?? null,
    product.draftReviewMessage ?? null,
    product.similarCandidateCount ?? null,
    product.createdAt,
  );
}

function centralProductToRecord(product: CentralProductSnippet): CaptureProductRecord {
  return {
    displayName: product.displayName,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    categoryRuleProfile: product.categoryRuleProfile,
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    ...(product.identifiers === undefined ? {} : { identifiers: [...product.identifiers] }),
    id: product.centralProductId,
    centralProductId: product.centralProductId,
    normalizedName: normalizeProductLookup(product.displayName),
    createdAt: product.updatedAt,
    catalogSource: product.status === "draft" ? "draft_pending_review" : "central",
    reviewStatus: reviewStatusForCentralProduct(product),
    centralSyncState: product.state,
    ...(product.status === "draft" ? { draftId: product.centralProductId } : {}),
    ...(product.status === "draft"
      ? {
          draftReviewMessage:
            "Cadastro do produto em revisao. O lote entra com risco conservador ate a validacao.",
        }
      : {}),
  };
}

function productCatalogItemToRecord(product: ProductCatalogItem): CaptureProductRecord {
  return {
    displayName: product.displayName,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    categoryRuleProfile: product.categoryRuleProfile,
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    id: product.centralProductId,
    centralProductId: product.centralProductId,
    normalizedName: product.normalizedKey,
    createdAt: product.updatedAt,
    catalogSource: product.source === "draft_pending_review" ? "draft_pending_review" : "central",
    reviewStatus: product.reviewStatus,
    centralSyncState: product.syncState,
    ...(product.reviewStatus === "pending_review" ? { draftId: product.centralProductId } : {}),
    ...(product.reviewStatus === "pending_review"
      ? {
          draftReviewMessage:
            "Cadastro do produto em revisao. O lote entra com risco conservador ate a validacao.",
        }
      : {}),
  };
}

function productDraftToRecord(draft: ProductDraftReviewState): CaptureProductRecord {
  return {
    displayName: draft.displayName,
    categoryId: draft.categoryId,
    categoryName: draft.categoryName,
    categoryRuleProfile: draft.categoryRuleProfile,
    ...(draft.gtin === undefined ? {} : { gtin: draft.gtin }),
    ...(draft.identifiers === undefined ? {} : { identifiers: [...draft.identifiers] }),
    id: draft.centralProductId,
    centralProductId: draft.centralProductId,
    normalizedName: draft.normalizedKey,
    createdAt: draft.requestedAt,
    catalogSource: "draft_pending_review",
    reviewStatus: draft.reviewStatus,
    centralSyncState: draft.syncState,
    draftId: draft.draftId,
    draftReviewMessage:
      "Cadastro do produto em revisao. O lote entra com risco conservador ate a validacao.",
    similarCandidateCount: draft.similarCandidates.length,
  };
}

async function upsertCentralLot(
  db: SQLite.SQLiteDatabase,
  lot: CentralLotSnippet,
  resolvedHistory?: ResolvedTaskHistorySnippet,
): Promise<void> {
  const observationId = centralObservationIdFor(lot.centralLotId);
  const occurredAt = lot.updatedAt;
  const centralSyncState = resolvedHistory === undefined ? lot.state : "resolved";
  const acknowledgementMessage =
    resolvedHistory !== undefined
      ? `Resolvido na central por ${resolvedHistory.actorLabel}. O lote segue nos recentes como historico.`
      : lot.state === "synchronized"
        ? "Sincronizado com a central. Outro aparelho ve este lote apos preparar turno."
        : "Leitura central armazenada neste aparelho.";

  await db.runAsync(
    `INSERT INTO capture_lots (
      id, product_id, identity_source, identity_value, mode, expires_at, received_at,
      quality_inspection_due_at, quality_window_days, approximate_quantity,
      initial_location_kind, initial_location_custom_name, current_observation_id,
      current_status, current_actor_label, current_occurred_at, current_location_kind,
      current_location_custom_name, current_quantity_state, current_approximate_quantity,
      current_is_correction, current_correction_reason, central_lot_id, central_sync_state,
      central_source, task_projection_json, central_ack_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'present', 'Leitura central',
      ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, NULL, ?)
    ON CONFLICT(id) DO UPDATE SET
      product_id = excluded.product_id,
      identity_source = excluded.identity_source,
      identity_value = excluded.identity_value,
      mode = excluded.mode,
      expires_at = excluded.expires_at,
      received_at = excluded.received_at,
      quality_inspection_due_at = excluded.quality_inspection_due_at,
      approximate_quantity = excluded.approximate_quantity,
      current_observation_id = excluded.current_observation_id,
      current_status = excluded.current_status,
      current_actor_label = excluded.current_actor_label,
      current_occurred_at = excluded.current_occurred_at,
      current_location_kind = excluded.current_location_kind,
      current_location_custom_name = excluded.current_location_custom_name,
      current_quantity_state = excluded.current_quantity_state,
      current_approximate_quantity = excluded.current_approximate_quantity,
      central_lot_id = excluded.central_lot_id,
      central_sync_state = excluded.central_sync_state,
      central_source = excluded.central_source,
      task_projection_json = excluded.task_projection_json,
      central_ack_message = excluded.central_ack_message`,
    lot.centralLotId,
    lot.centralProductId,
    lot.lotIdentity.identitySource,
    lot.lotIdentity.value,
    lot.mode,
    lot.expiresAt ?? null,
    lot.receivedAt ?? null,
    lot.qualityInspectionDueAt ?? null,
    lot.approximateQuantity ?? 0,
    lot.currentLocation.kind,
    lot.currentLocation.kind === "other" ? lot.currentLocation.customName : null,
    observationId,
    occurredAt,
    lot.currentLocation.kind,
    lot.currentLocation.kind === "other" ? lot.currentLocation.customName : null,
    lot.approximateQuantity === undefined ? "not_estimable" : "estimated",
    lot.approximateQuantity ?? null,
    lot.centralLotId,
    centralSyncState,
    lot.source,
    acknowledgementMessage,
  );

  await db.runAsync(
    `INSERT INTO capture_observations (
      id, lot_id, status, actor_label, occurred_at, location_kind, location_custom_name,
      quantity_state, approximate_quantity, is_correction, correction_reason
    ) VALUES (?, ?, 'present', 'Leitura central', ?, ?, ?, ?, ?, 0, NULL)
    ON CONFLICT(id) DO UPDATE SET
      occurred_at = excluded.occurred_at,
      location_kind = excluded.location_kind,
      location_custom_name = excluded.location_custom_name,
      quantity_state = excluded.quantity_state,
      approximate_quantity = excluded.approximate_quantity`,
    observationId,
    lot.centralLotId,
    occurredAt,
    lot.currentLocation.kind,
    lot.currentLocation.kind === "other" ? lot.currentLocation.customName : null,
    lot.approximateQuantity === undefined ? "not_estimable" : "estimated",
    lot.approximateQuantity ?? null,
  );
}

function resolvedHistoryByLotId(
  resolvedHistory: readonly ResolvedTaskHistorySnippet[],
  activeCentralLotIds: ReadonlySet<string>,
): Map<string, ResolvedTaskHistorySnippet> {
  const resolvedByLotId = new Map<string, ResolvedTaskHistorySnippet>();

  for (const history of resolvedHistory) {
    if (activeCentralLotIds.has(history.centralLotId)) {
      continue;
    }

    const previous = resolvedByLotId.get(history.centralLotId);
    if (previous === undefined || history.resolvedAt > previous.resolvedAt) {
      resolvedByLotId.set(history.centralLotId, history);
    }
  }

  return resolvedByLotId;
}

async function deletePendingLocalDuplicateLotsForCentralLot(
  db: SQLite.SQLiteDatabase,
  lot: CentralLotSnippet,
): Promise<void> {
  const duplicateWhere = `
    FROM capture_lots AS pending
    INNER JOIN capture_products AS pending_product ON pending_product.id = pending.product_id
    INNER JOIN capture_products AS central_product
      ON central_product.id = ? OR central_product.central_product_id = ?
    WHERE pending.id <> ?
      AND pending.central_sync_state IN ('pending_central', 'local')
      AND (
        pending.central_lot_id = ?
        OR (
          pending.identity_source = ?
          AND pending.identity_value = ?
          AND pending.mode = ?
          AND (
            pending.product_id = ?
            OR pending_product.central_product_id = ?
            OR (
              pending_product.normalized_name = central_product.normalized_name
              AND pending_product.category_id = central_product.category_id
            )
          )
        )
      )`;
  const duplicateArgs = [
    lot.centralProductId,
    lot.centralProductId,
    lot.centralLotId,
    lot.centralLotId,
    lot.lotIdentity.identitySource,
    lot.lotIdentity.value,
    lot.mode,
    lot.centralProductId,
    lot.centralProductId,
  ];

  await db.runAsync(
    `UPDATE today_tasks
     SET status = 'resolved', resolved_at = ?, updated_at = ?
     WHERE status = 'active'
       AND lot_id IN (SELECT pending.id ${duplicateWhere})`,
    lot.updatedAt,
    lot.updatedAt,
    ...duplicateArgs,
  );
  await db.runAsync(
    `DELETE FROM capture_observations
     WHERE lot_id IN (SELECT pending.id ${duplicateWhere})`,
    ...duplicateArgs,
  );
  await db.runAsync(
    `DELETE FROM capture_lots WHERE id IN (SELECT pending.id ${duplicateWhere})`,
    ...duplicateArgs,
  );
}

async function upsertCentralLotSnapshot(
  db: SQLite.SQLiteDatabase,
  lot: CentralLotSnapshot,
  taskProjection: CentralLotTaskProjectionSummary,
  acknowledgementMessage: string | undefined,
): Promise<void> {
  const observation = lot.currentObservation;
  const snapshot = centralLotSnapshotToLocal(lot, acknowledgementMessage);

  await db.runAsync(
    `INSERT INTO capture_lots (
      id, product_id, identity_source, identity_value, mode, expires_at, received_at,
      quality_inspection_due_at, quality_window_days, approximate_quantity,
      initial_location_kind, initial_location_custom_name, current_observation_id,
      current_status, current_actor_label, current_occurred_at, current_location_kind,
      current_location_custom_name, current_quantity_state, current_approximate_quantity,
      current_is_correction, current_correction_reason, central_lot_id, central_sync_state,
      central_source, task_projection_json, central_ack_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      product_id = excluded.product_id,
      identity_source = excluded.identity_source,
      identity_value = excluded.identity_value,
      mode = excluded.mode,
      expires_at = excluded.expires_at,
      received_at = excluded.received_at,
      quality_inspection_due_at = excluded.quality_inspection_due_at,
      quality_window_days = excluded.quality_window_days,
      approximate_quantity = excluded.approximate_quantity,
      initial_location_kind = excluded.initial_location_kind,
      initial_location_custom_name = excluded.initial_location_custom_name,
      current_observation_id = excluded.current_observation_id,
      current_status = excluded.current_status,
      current_actor_label = excluded.current_actor_label,
      current_occurred_at = excluded.current_occurred_at,
      current_location_kind = excluded.current_location_kind,
      current_location_custom_name = excluded.current_location_custom_name,
      current_quantity_state = excluded.current_quantity_state,
      current_approximate_quantity = excluded.current_approximate_quantity,
      current_is_correction = excluded.current_is_correction,
      current_correction_reason = excluded.current_correction_reason,
      central_lot_id = excluded.central_lot_id,
      central_sync_state = excluded.central_sync_state,
      central_source = excluded.central_source,
      task_projection_json = excluded.task_projection_json,
      central_ack_message = excluded.central_ack_message`,
    snapshot.id,
    lot.centralProductId,
    lot.lotIdentity.identitySource,
    lot.lotIdentity.value,
    lot.mode,
    lot.mode === "formal_validity" || lot.mode === "processed_repack_loss" ? lot.expiresAt : null,
    lot.mode === "formal_validity" ||
      lot.mode === "processed_repack_loss" ||
      lot.mode === "flv_inspection" ||
      lot.mode === "receiving_monitored"
      ? (lot.receivedAt ?? null)
      : null,
    lot.mode === "flv_inspection" ? (lot.qualityInspectionDueAt ?? null) : null,
    lot.mode === "flv_inspection" ? (lot.qualityWindowDays ?? null) : null,
    lot.approximateQuantity,
    lot.initialLocation.kind,
    lot.initialLocation.kind === "other" ? lot.initialLocation.customName : null,
    observation.centralObservationId,
    observation.status,
    observation.actorLabel,
    observation.occurredAt,
    observation.location.kind,
    observation.location.kind === "other" ? observation.location.customName : null,
    observation.quantityState,
    observation.quantityState === "estimated" ? observation.approximateQuantity : null,
    observation.isCorrection ? 1 : 0,
    observation.correctionReason ?? null,
    lot.centralLotId,
    lot.state,
    lot.source,
    JSON.stringify(taskProjection),
    snapshot.centralAcknowledgementMessage ?? null,
  );

  await db.runAsync(
    `INSERT INTO capture_observations (
      id, lot_id, status, actor_label, occurred_at, location_kind, location_custom_name,
      quantity_state, approximate_quantity, is_correction, correction_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      actor_label = excluded.actor_label,
      occurred_at = excluded.occurred_at,
      location_kind = excluded.location_kind,
      location_custom_name = excluded.location_custom_name,
      quantity_state = excluded.quantity_state,
      approximate_quantity = excluded.approximate_quantity,
      is_correction = excluded.is_correction,
      correction_reason = excluded.correction_reason`,
    observation.centralObservationId,
    lot.centralLotId,
    observation.status,
    observation.actorLabel,
    observation.occurredAt,
    observation.location.kind,
    observation.location.kind === "other" ? observation.location.customName : null,
    observation.quantityState,
    observation.quantityState === "estimated" ? observation.approximateQuantity : null,
    observation.isCorrection ? 1 : 0,
    observation.correctionReason ?? null,
  );
}

async function upsertEvidenceUpload(
  db: SQLite.SQLiteDatabase,
  record: EvidenceUploadQueueRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO evidence_uploads (
      local_evidence_id, task_id, store_id, target_json, local_uri, mime_type,
      size_bytes, sha256, captured_at, state, created_at, updated_at, attempt_count,
      asset_id, upload_path, uploaded_at, retention_expires_at, last_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(local_evidence_id) DO UPDATE SET
      task_id = excluded.task_id,
      store_id = excluded.store_id,
      target_json = excluded.target_json,
      local_uri = excluded.local_uri,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      sha256 = excluded.sha256,
      captured_at = excluded.captured_at,
      state = excluded.state,
      updated_at = excluded.updated_at,
      attempt_count = excluded.attempt_count,
      asset_id = excluded.asset_id,
      upload_path = excluded.upload_path,
      uploaded_at = excluded.uploaded_at,
      retention_expires_at = excluded.retention_expires_at,
      last_error = excluded.last_error`,
    record.localEvidenceId,
    record.taskId,
    record.storeId,
    JSON.stringify(record.target),
    record.localUri,
    record.mimeType,
    record.sizeBytes,
    record.sha256,
    record.capturedAt,
    record.state,
    record.createdAt,
    record.updatedAt,
    record.attemptCount,
    record.assetId ?? null,
    record.uploadPath ?? null,
    record.uploadedAt ?? null,
    record.retentionExpiresAt ?? null,
    record.lastError ?? null,
  );
}

async function upsertShiftCloseOutbox(
  db: SQLite.SQLiteDatabase,
  record: ShiftCloseOutboxRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO shift_close_outbox (
      local_close_id, request_json, state, created_at, updated_at, attempt_count,
      server_closure_id, last_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(local_close_id) DO UPDATE SET
      request_json = excluded.request_json,
      state = excluded.state,
      updated_at = excluded.updated_at,
      attempt_count = excluded.attempt_count,
      server_closure_id = excluded.server_closure_id,
      last_error = excluded.last_error`,
    record.localCloseId,
    JSON.stringify(record.request),
    record.state,
    record.createdAt,
    record.updatedAt,
    record.attemptCount,
    record.serverClosureId ?? null,
    record.lastError ?? null,
  );
}

async function upsertSyncCommand(
  db: SQLite.SQLiteDatabase,
  command: SyncCommandRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_commands (
      id, idempotency_key, kind, state, urgency, payload_json, task_id, task_active_key,
      lot_id, product_display_name, lot_identity_source, lot_identity_value,
      current_location_kind, current_location_custom_name, risk_state, required_resolution,
      created_at, updated_at, saved_at, first_attempted_at, last_attempted_at, attempt_count,
      next_retry_at, last_error, acked_at, conflict_id, discarded_at, discard_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      idempotency_key = excluded.idempotency_key,
      kind = excluded.kind,
      state = excluded.state,
      urgency = excluded.urgency,
      payload_json = excluded.payload_json,
      task_id = excluded.task_id,
      task_active_key = excluded.task_active_key,
      lot_id = excluded.lot_id,
      product_display_name = excluded.product_display_name,
      lot_identity_source = excluded.lot_identity_source,
      lot_identity_value = excluded.lot_identity_value,
      current_location_kind = excluded.current_location_kind,
      current_location_custom_name = excluded.current_location_custom_name,
      risk_state = excluded.risk_state,
      required_resolution = excluded.required_resolution,
      updated_at = excluded.updated_at,
      saved_at = excluded.saved_at,
      first_attempted_at = excluded.first_attempted_at,
      last_attempted_at = excluded.last_attempted_at,
      attempt_count = excluded.attempt_count,
      next_retry_at = excluded.next_retry_at,
      last_error = excluded.last_error,
      acked_at = excluded.acked_at,
      conflict_id = excluded.conflict_id,
      discarded_at = excluded.discarded_at,
      discard_reason = excluded.discard_reason`,
    command.id,
    command.idempotencyKey,
    command.kind,
    command.state,
    command.urgency,
    JSON.stringify(command.payload),
    command.taskId,
    command.taskActiveKey,
    command.lotId,
    command.productDisplayName,
    command.lotIdentity.identitySource,
    command.lotIdentity.value,
    command.currentLocation.kind,
    command.currentLocation.kind === "other" ? command.currentLocation.customName : null,
    command.riskState,
    command.requiredResolution,
    command.createdAt,
    command.updatedAt,
    command.savedAt,
    command.firstAttemptedAt ?? null,
    command.lastAttemptedAt ?? null,
    command.attemptCount,
    command.nextRetryAt ?? null,
    command.lastError ?? null,
    command.ackedAt ?? null,
    command.conflictId ?? null,
    command.discardedAt ?? null,
    command.discardReason ?? null,
  );
}

async function upsertSyncConflict(
  db: SQLite.SQLiteDatabase,
  conflict: SyncConflictRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_conflicts (
      id, command_id, severity, reason, local_action_json, remote_change_json,
      allowed_actions_json, created_at, resolved_at, resolution_action, resolution_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      command_id = excluded.command_id,
      severity = excluded.severity,
      reason = excluded.reason,
      local_action_json = excluded.local_action_json,
      remote_change_json = excluded.remote_change_json,
      allowed_actions_json = excluded.allowed_actions_json,
      resolved_at = excluded.resolved_at,
      resolution_action = excluded.resolution_action,
      resolution_reason = excluded.resolution_reason`,
    conflict.id,
    conflict.commandId,
    conflict.severity,
    conflict.reason,
    JSON.stringify(conflict.localAction),
    JSON.stringify(conflict.remoteChange),
    JSON.stringify(conflict.allowedActions),
    conflict.createdAt,
    conflict.resolvedAt ?? null,
    conflict.resolutionAction ?? null,
    conflict.resolutionReason ?? null,
  );
}

type LocalAuditEventRecord = AuditTimelineItem & { idempotencyKey: string };

async function upsertLocalAuditEvent(
  db: SQLite.SQLiteDatabase,
  event: LocalAuditEventRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO local_audit_events (
      event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
      actor_role_snapshot, target_type, target_id, target_label, occurred_at, received_at,
      summary, reason, status, linked_event_id, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(idempotency_key) DO UPDATE SET
      received_at = excluded.received_at,
      reason = excluded.reason,
      status = excluded.status,
      linked_event_id = excluded.linked_event_id,
      metadata_json = excluded.metadata_json`,
    event.eventId,
    event.idempotencyKey,
    event.type,
    event.store.storeId,
    event.store.storeName,
    event.actor.actorId,
    event.actor.displayName,
    event.actor.roleSnapshot,
    event.target.type,
    event.target.id,
    event.target.label ?? null,
    event.occurredAt,
    event.receivedAt ?? null,
    event.summary,
    event.reason ?? null,
    event.status,
    event.linkedEventId ?? null,
    JSON.stringify(event.metadata ?? {}),
  );
}

async function reconcileLocalAuditEvent(
  db: SQLite.SQLiteDatabase,
  result: SyncTransportResult,
  command: SyncCommandRecord,
): Promise<void> {
  const row = await db.getFirstAsync<LocalAuditEventRow>(
    "SELECT * FROM local_audit_events WHERE idempotency_key = ?",
    result.idempotencyKey,
  );
  const existing =
    row === null
      ? createLocalAuditEventForCommand(command, "pending_ack")
      : mapLocalAuditEvent(row);
  const { idempotencyKey, ...event } = existing;
  const updated = parseAuditTimelineItem({
    ...event,
    status:
      result.status === "ack"
        ? "received"
        : result.status === "conflict"
          ? "conflict"
          : "pending_ack",
    ...(result.status === "ack" ? { receivedAt: result.syncedAt } : {}),
    ...(result.status === "retry" ? { reason: result.error } : {}),
  });

  await upsertLocalAuditEvent(db, { ...updated, idempotencyKey });
}

function createLocalAuditEventForCommand(
  command: SyncCommandRecord,
  status: AuditTimelineItem["status"],
): LocalAuditEventRecord {
  const event = parseAuditTimelineItem({
    eventId: `local-audit:${command.id}`,
    type: auditEventTypeForCommand(command),
    store: {
      storeId: "local-device",
      storeName: "Loja ficticia deste aparelho",
    },
    actor: {
      actorId: command.payload.payload.actorLabel,
      displayName: command.payload.payload.actorLabel,
      roleSnapshot: "collaborator",
    },
    target: {
      type: auditTargetTypeForCommand(command),
      id: auditTargetIdForCommand(command),
      label: `${command.productDisplayName} - lote ${command.lotIdentity.value}`,
    },
    occurredAt: command.payload.payload.occurredAt,
    summary: auditSummaryForCommand(command),
    status,
    metadata: {
      producerKind: auditProducerKindForCommand(command),
      commandKind: command.kind,
      productDisplayName: command.productDisplayName,
      lotCode: command.lotIdentity.value,
    },
  });

  return { ...event, idempotencyKey: command.idempotencyKey };
}

function createConflictResolutionAuditEvent(
  conflict: SyncConflictRecord,
  command: SyncCommandRecord,
): LocalAuditEventRecord {
  const idempotencyKey = `sync-discard:${conflict.id}:${conflict.resolvedAt ?? command.updatedAt}`;
  const event = parseAuditTimelineItem({
    eventId: `local-audit:${idempotencyKey}`,
    type: "sync.changed",
    store: {
      storeId: "local-device",
      storeName: "Loja ficticia deste aparelho",
    },
    actor: {
      actorId: conflict.localAction.actorLabel,
      displayName: conflict.localAction.actorLabel,
      roleSnapshot: "collaborator",
    },
    target: {
      type: "sync_command",
      id: command.id,
      label: `${command.productDisplayName} - lote ${command.lotIdentity.value}`,
    },
    occurredAt: conflict.resolvedAt ?? command.updatedAt,
    summary:
      conflict.resolutionAction === "discard_offline_action"
        ? "Acao offline descartada com motivo."
        : "Conflito de sincronizacao revisado.",
    reason: conflict.resolutionReason ?? conflict.reason,
    status: command.state === "discarded" ? "invalidated" : "pending_ack",
    metadata: {
      producerKind: "sync.discard",
      commandKind: command.kind,
    },
  });

  return { ...event, idempotencyKey };
}

async function upsertMarkdownWorkflow(
  db: SQLite.SQLiteDatabase,
  workflow: MarkdownWorkflowRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO markdown_workflows (
      id, lot_id, status, current_stage, request_reason, early_justification,
      requested_at, requested_by, approved_at, approved_by, rejected_at, rejected_by,
      rejection_reason, applied_at, applied_by, application_evidence_json,
      shelf_confirmed_at, shelf_confirmed_by, shelf_confirmation_evidence_json,
      stage_history_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      lot_id = excluded.lot_id,
      status = excluded.status,
      current_stage = excluded.current_stage,
      request_reason = excluded.request_reason,
      early_justification = excluded.early_justification,
      requested_at = excluded.requested_at,
      requested_by = excluded.requested_by,
      approved_at = excluded.approved_at,
      approved_by = excluded.approved_by,
      rejected_at = excluded.rejected_at,
      rejected_by = excluded.rejected_by,
      rejection_reason = excluded.rejection_reason,
      applied_at = excluded.applied_at,
      applied_by = excluded.applied_by,
      application_evidence_json = excluded.application_evidence_json,
      shelf_confirmed_at = excluded.shelf_confirmed_at,
      shelf_confirmed_by = excluded.shelf_confirmed_by,
      shelf_confirmation_evidence_json = excluded.shelf_confirmation_evidence_json,
      stage_history_json = excluded.stage_history_json,
      updated_at = excluded.updated_at`,
    workflow.id,
    workflow.lotId,
    workflow.status,
    workflow.currentStage,
    workflow.requestReason,
    workflow.earlyJustification ?? null,
    workflow.requestedAt,
    workflow.requestedBy,
    workflow.approvedAt ?? null,
    workflow.approvedBy ?? null,
    workflow.rejectedAt ?? null,
    workflow.rejectedBy ?? null,
    workflow.rejectionReason ?? null,
    workflow.appliedAt ?? null,
    workflow.appliedBy ?? null,
    workflow.applicationEvidence === undefined
      ? null
      : JSON.stringify(workflow.applicationEvidence),
    workflow.shelfConfirmedAt ?? null,
    workflow.shelfConfirmedBy ?? null,
    workflow.shelfConfirmationEvidence === undefined
      ? null
      : JSON.stringify(workflow.shelfConfirmationEvidence),
    JSON.stringify(workflow.stageHistory),
    workflow.createdAt,
    workflow.updatedAt,
  );
}

async function upsertTaskAlertState(
  db: SQLite.SQLiteDatabase,
  state: TaskAlertStateRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO task_alert_states (
      task_id, task_active_key, channel_state, attempt_state, audience, escalation_state,
      created_at, updated_at, last_reminder_at, next_reminder_at, escalated_at,
      leadership_acknowledged_at, retry_count, failure_reason, last_attempt_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id) DO UPDATE SET
      task_active_key = excluded.task_active_key,
      channel_state = excluded.channel_state,
      attempt_state = excluded.attempt_state,
      audience = excluded.audience,
      escalation_state = excluded.escalation_state,
      updated_at = excluded.updated_at,
      last_reminder_at = excluded.last_reminder_at,
      next_reminder_at = excluded.next_reminder_at,
      escalated_at = excluded.escalated_at,
      leadership_acknowledged_at = excluded.leadership_acknowledged_at,
      retry_count = excluded.retry_count,
      failure_reason = excluded.failure_reason,
      last_attempt_id = excluded.last_attempt_id`,
    state.taskId,
    state.taskActiveKey,
    state.channelState,
    state.attemptState,
    state.audience,
    state.escalationState,
    state.createdAt,
    state.updatedAt,
    state.lastReminderAt ?? null,
    state.nextReminderAt ?? null,
    state.escalatedAt ?? null,
    state.leadershipAcknowledgedAt ?? null,
    state.retryCount ?? null,
    state.failureReason ?? null,
    state.lastAttemptId ?? null,
  );
}

function mapProduct(row: ProductRow): CaptureProductRecord {
  const product = CaptureProductInputSchema.parse({
    displayName: row.display_name,
    categoryId: row.category_id,
    categoryRuleProfile: parseJson(row.category_profile_json),
    ...(row.supplier_name === null ? {} : { supplierName: row.supplier_name }),
    ...(row.gtin === null ? {} : { gtin: row.gtin }),
    ...(row.product_override_json === null
      ? {}
      : { productRuleOverride: parseJson(row.product_override_json) }),
  });
  const catalogSource = parseCatalogSource(row.catalog_source);
  const reviewStatus = parseReviewStatus(row.review_status);
  const centralSyncState = parseCentralSyncState(row.central_sync_state);
  const identifiers = parseProductIdentifiers(row);

  return {
    ...product,
    id: row.id,
    normalizedName: row.normalized_name,
    createdAt: row.created_at,
    ...(row.category_name === null ? {} : { categoryName: row.category_name }),
    ...(row.central_product_id === null ? {} : { centralProductId: row.central_product_id }),
    ...(catalogSource === undefined ? {} : { catalogSource }),
    ...(reviewStatus === undefined ? {} : { reviewStatus }),
    ...(centralSyncState === undefined ? {} : { centralSyncState }),
    ...(identifiers.length === 0 ? {} : { identifiers }),
    ...(row.draft_id === null ? {} : { draftId: row.draft_id }),
    ...(row.draft_review_message === null ? {} : { draftReviewMessage: row.draft_review_message }),
    ...(row.similar_candidate_count === null
      ? {}
      : { similarCandidateCount: row.similar_candidate_count }),
  };
}

async function centralProductForPendingLot(
  db: SQLite.SQLiteDatabase,
  product: CaptureProductRecord,
): Promise<CaptureProductRecord | undefined> {
  if (!isPendingCentralProduct(product) && product.centralProductId !== undefined) {
    return product;
  }

  const centralProductId = product.centralProductId ?? product.id;
  const rows = await db.getAllAsync<ProductRow>(
    `SELECT * FROM capture_products
     WHERE id = ? OR central_product_id = ? OR normalized_name = ?
     ORDER BY
       CASE
         WHEN id = ? OR central_product_id = ? THEN 0
         WHEN normalized_name = ? AND category_id = ? THEN 1
         WHEN normalized_name = ? THEN 2
         ELSE 3
       END,
       CASE
         WHEN review_status = 'validated' AND central_sync_state = 'synchronized' THEN 0
         WHEN review_status = 'validated' THEN 1
         WHEN central_sync_state = 'synchronized' THEN 2
         ELSE 3
       END,
       created_at DESC`,
    centralProductId,
    centralProductId,
    product.normalizedName,
    centralProductId,
    centralProductId,
    product.normalizedName,
    product.categoryId,
    product.normalizedName,
  );

  return rows
    .map(mapProduct)
    .find(
      (candidate) =>
        !isPendingCentralProduct(candidate) && candidate.centralProductId !== undefined,
    );
}

function productSearchRequestForPendingLot(
  product: CaptureProductRecord,
  requestedAt: string,
  options: { includeCategory: boolean },
): ProductSearchRequest {
  const identifier = product.identifiers?.[0];

  return parseProductSearchRequest({
    query: product.displayName,
    ...(options.includeCategory ? { categoryId: product.categoryId } : {}),
    requestedAt,
    includeDrafts: true,
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    ...(identifier === undefined
      ? {}
      : { identifier: { type: identifier.type, value: identifier.value } }),
  });
}

function reusableCentralProductForPendingLot(
  product: CaptureProductRecord,
  response: ProductSearchResponse,
): ProductSearchCandidate | undefined {
  const reusableProducts = response.reusableProducts.filter(
    (candidate) =>
      candidate.matchKind === "reusable_central" &&
      candidate.source === "central" &&
      candidate.reviewStatus === "validated" &&
      candidate.syncState === "synchronized",
  );

  return (
    reusableProducts.find((candidate) => candidateMatchesPendingProduct(product, candidate)) ??
    reusableProducts[0]
  );
}

function candidateMatchesPendingProduct(
  product: CaptureProductRecord,
  candidate: ProductSearchCandidate,
): boolean {
  const lookupIdentifiers = requestIdentifierInputs({
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    identifiers: product.identifiers?.map((identifier) => ({
      type: identifier.type,
      value: identifier.value,
    })),
  });

  return (
    candidate.centralProductId === product.centralProductId ||
    productHasAnyIdentifier(candidate, lookupIdentifiers) ||
    (candidate.normalizedKey === product.normalizedName &&
      candidate.categoryId === product.categoryId)
  );
}

function mapCategory(row: ProductCategoryRow): CaptureProductCategory {
  const product = CaptureProductInputSchema.parse({
    displayName: row.category_name,
    categoryId: row.category_id,
    categoryRuleProfile: parseJson(row.category_profile_json),
  });

  return {
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryRuleProfile: product.categoryRuleProfile,
    productCount: row.product_count,
  };
}

function localProductToCatalogItem(product: CaptureProductRecord): ProductCatalogItem {
  return {
    centralProductId: product.centralProductId ?? product.id,
    displayName: product.displayName,
    normalizedKey: product.normalizedName,
    categoryId: product.categoryId,
    categoryName: product.categoryName ?? product.categoryId,
    categoryRuleProfile: product.categoryRuleProfile,
    source: product.catalogSource === "draft_pending_review" ? "draft_pending_review" : "central",
    reviewStatus:
      product.reviewStatus === undefined || product.reviewStatus === "discarded"
        ? "validated"
        : product.reviewStatus,
    syncState:
      product.centralSyncState === undefined || product.centralSyncState === "local"
        ? "synchronized"
        : product.centralSyncState,
    updatedAt: product.createdAt,
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    ...(product.identifiers === undefined ? {} : { identifiers: [...product.identifiers] }),
  };
}

function productSearchCandidate(
  product: ProductCatalogItem,
  matchKind: ProductSearchCandidate["matchKind"],
): ProductSearchCandidate {
  return {
    ...product,
    matchKind,
    matchReasons: matchKind === "similar_candidate" ? ["similar_name"] : ["exact_normalized_name"],
    ...(matchKind === "similar_candidate"
      ? { warning: "Produto parecido encontrado. Reutilize se for o mesmo item." }
      : {}),
  };
}

function isSimilarProduct(productKey: string, requestedKey: string | undefined): boolean {
  if (requestedKey === undefined) {
    return false;
  }
  const tokens = requestedKey.split(" ").filter((token) => token.length >= 3);

  return tokens.some((token) => productKey.includes(token));
}

function normalizeIdentifierValue(value: string): string {
  return value.trim().replace(/\s+/g, "").toLocaleLowerCase("pt-BR").slice(0, 160);
}

function requestIdentifiersForLocal(input: {
  gtin?: string | undefined;
  identifiers?: readonly ProductIdentifierInput[] | undefined;
}): ProductIdentifier[] {
  const identifiers = new Map<string, ProductIdentifier>();

  if (input.gtin !== undefined) {
    const normalizedValue = normalizeIdentifierValue(input.gtin);
    identifiers.set(`gtin:${normalizedValue}`, {
      type: "gtin",
      value: input.gtin,
      normalizedValue,
      source: "scan",
      isPrimary: true,
    });
  }

  for (const identifier of input.identifiers ?? []) {
    const normalizedValue = normalizeIdentifierValue(identifier.value);
    const key = `${identifier.type}:${normalizedValue}`;
    if (identifiers.has(key)) continue;
    identifiers.set(key, {
      ...identifier,
      normalizedValue,
      source: "scan",
      isPrimary: identifiers.size === 0,
    });
  }

  return [...identifiers.values()];
}

function requestIdentifierInputs(input: {
  gtin?: string | undefined;
  identifiers?: readonly ProductIdentifierInput[] | undefined;
}): ProductIdentifierInput[] {
  return requestIdentifiersForLocal(input).map((identifier) => ({
    type: identifier.type,
    value: identifier.value,
  }));
}

function stringifyProductIdentifiers(
  product: Pick<CaptureProductRecord, "gtin" | "identifiers">,
): string | null {
  const identifiers = requestIdentifiersForLocal({
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    ...(product.identifiers === undefined ? {} : { identifiers: product.identifiers }),
  });

  return identifiers.length === 0 ? null : JSON.stringify(identifiers);
}

function parseProductIdentifiers(row: ProductRow): ProductIdentifier[] {
  const raw = row.identifiers_json === null ? [] : parseJson(row.identifiers_json);
  const rawIdentifiers = Array.isArray(raw) ? raw : [];
  const parsed = rawIdentifiers
    .filter((value): value is ProductIdentifier => isProductIdentifier(value))
    .map((identifier) => ({
      ...identifier,
      normalizedValue: normalizeIdentifierValue(identifier.value),
    }));

  if (
    row.gtin !== null &&
    !parsed.some(
      (identifier) =>
        identifier.type === "gtin" &&
        normalizeIdentifierValue(identifier.value) === normalizeIdentifierValue(row.gtin ?? ""),
    )
  ) {
    parsed.unshift({
      type: "gtin",
      value: row.gtin,
      normalizedValue: normalizeIdentifierValue(row.gtin),
      source: "scan",
      isPrimary: true,
    });
  }

  return parsed;
}

function isProductIdentifier(value: unknown): value is ProductIdentifier {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.type === "string" &&
    ["gtin", "ean", "barcode", "plu", "internal", "supplier_code"].includes(candidate.type) &&
    typeof candidate.value === "string" &&
    typeof candidate.normalizedValue === "string"
  );
}

function productHasIdentifier(
  product: ProductCatalogItem,
  identifier: ProductIdentifierInput,
): boolean {
  const normalizedValue = normalizeIdentifierValue(identifier.value);

  if (
    (identifier.type === "gtin" || identifier.type === "ean" || identifier.type === "barcode") &&
    product.gtin !== undefined &&
    normalizeIdentifierValue(product.gtin) === normalizedValue
  ) {
    return true;
  }

  return (product.identifiers ?? []).some(
    (candidate) =>
      candidate.type === identifier.type &&
      normalizeIdentifierValue(candidate.value) === normalizedValue,
  );
}

function productHasAnyIdentifier(
  product: ProductCatalogItem,
  identifiers: readonly ProductIdentifierInput[],
): boolean {
  return identifiers.some((identifier) => productHasIdentifier(product, identifier));
}

function mergeProductIdentifiersLocal(
  product: CaptureProductRecord,
  identifiers: readonly ProductIdentifierInput[],
): CaptureProductRecord {
  const current = [...(product.identifiers ?? [])];
  const seen = new Set(
    current.map((identifier) => `${identifier.type}:${normalizeIdentifierValue(identifier.value)}`),
  );

  for (const identifier of identifiers) {
    const normalizedValue = normalizeIdentifierValue(identifier.value);
    const key = `${identifier.type}:${normalizedValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    current.push({
      ...identifier,
      normalizedValue,
      source: "scan",
      isPrimary: current.length === 0,
    });
  }

  const firstGtin = current.find((identifier) => identifier.type === "gtin")?.value;

  return {
    ...product,
    ...(product.gtin === undefined && firstGtin !== undefined ? { gtin: firstGtin } : {}),
    ...(current.length === 0 ? {} : { identifiers: current }),
  };
}

function catalogItemToDraft(product: ProductCatalogItem): ProductDraftReviewState {
  return {
    draftId: product.centralProductId,
    centralProductId: product.centralProductId,
    displayName: product.displayName,
    normalizedKey: product.normalizedKey,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    categoryRuleProfile: product.categoryRuleProfile,
    source: "draft_pending_review",
    reviewStatus: "pending_review",
    syncState: "pending_central",
    requestedByLabel: "Este aparelho",
    requestedAt: product.updatedAt,
    similarCandidates: [],
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    ...(product.identifiers === undefined ? {} : { identifiers: [...product.identifiers] }),
  };
}

function localProductToDraft(
  product: CaptureProductRecord,
  similarCandidates: readonly ProductSearchCandidate[],
): ProductDraftReviewState {
  return {
    draftId: product.draftId ?? product.centralProductId ?? product.id,
    centralProductId: product.centralProductId ?? product.id,
    displayName: product.displayName,
    normalizedKey: product.normalizedName,
    categoryId: product.categoryId,
    categoryName: product.categoryName ?? product.categoryId,
    categoryRuleProfile: product.categoryRuleProfile,
    source: "draft_pending_review",
    reviewStatus: "pending_review",
    syncState: "pending_central",
    requestedByLabel: "Este aparelho",
    requestedAt: product.createdAt,
    similarCandidates: [...similarCandidates],
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    ...(product.identifiers === undefined ? {} : { identifiers: [...product.identifiers] }),
  };
}

function reviewStatusForCentralProduct(
  product: CentralProductSnippet,
): NonNullable<CaptureProductRecord["reviewStatus"]> {
  if (product.status === "draft") return "pending_review";
  if (product.status === "rejected") return "rejected";
  if (product.status === "archived") return "discarded";

  return "validated";
}

function parseCatalogSource(value: string | null): CaptureProductRecord["catalogSource"] {
  if (value === "central" || value === "draft_pending_review" || value === "local") {
    return value;
  }

  return undefined;
}

function parseReviewStatus(value: string | null): CaptureProductRecord["reviewStatus"] {
  if (
    value === "validated" ||
    value === "pending_review" ||
    value === "rejected" ||
    value === "discarded"
  ) {
    return value;
  }

  return undefined;
}

function parseCentralSyncState(value: string | null): CaptureProductRecord["centralSyncState"] {
  if (
    value === "local" ||
    value === "pending_central" ||
    value === "synchronized" ||
    value === "conflict" ||
    value === "discarded" ||
    value === "resolved"
  ) {
    return value;
  }

  return undefined;
}

function parseCentralPackageSource(value: string | null): CaptureLotSnapshot["centralSource"] {
  if (value === "central" || value === "local_cache" || value === "pending_central") {
    return value;
  }

  return undefined;
}

function parseStoredTaskProjection(value: string | null): CaptureLotSnapshot["taskProjection"] {
  if (value === null) {
    return undefined;
  }

  try {
    return parseCentralLotTaskProjectionSummary(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function mapCentralActiveTask(
  task: ActiveTaskSnippet,
  lotsById: ReadonlyMap<string, CentralLotSnippet>,
): TodayTaskRecord {
  const lot = lotsById.get(task.centralLotId);

  return parseTodayTaskRecord({
    id: task.centralTaskId,
    activeKey: task.activeKey,
    lotId: task.centralLotId,
    productDisplayName: task.productDisplayName,
    lotIdentity: lot?.lotIdentity ?? {
      identitySource: "generated_internal",
      value: task.centralLotId,
    },
    currentLocation: task.currentLocation,
    riskState: task.riskState,
    severity: task.severity,
    dueBucket: dueBucketForCentralRisk(task.riskState),
    requiredResolution: task.requiredResolution,
    section: sectionForCentralRisk(task.riskState, task.currentLocation),
    ownerLabel: task.ownerLabel,
    status: "active",
    sourceRisk: {
      state: task.riskState,
      reasons: [{ code: reasonCodeForCentralRisk(task.riskState), field: "central" }],
    },
    priority: priorityForCentralRisk(task.riskState, task.currentLocation),
    createdAt: task.updatedAt,
    updatedAt: task.updatedAt,
    ...(task.state === "synchronized"
      ? {
          sync: {
            state: "synced",
            savedAt: task.updatedAt,
            lastSyncedAt: task.updatedAt,
          },
        }
      : {}),
  });
}

function centralProjectedTaskFromLot(lot: CaptureLotSnapshot): TodayTaskRecord | null {
  const projection = lot.taskProjection;

  if (
    lot.centralSource !== "central" ||
    lot.centralLotId === undefined ||
    projection?.attention !== "active_task"
  ) {
    return null;
  }

  return parseTodayTaskRecord({
    id: projection.centralTaskId,
    activeKey: projection.activeKey,
    lotId: lot.centralLotId,
    productDisplayName: lot.productDisplayName,
    lotIdentity: lot.identity,
    currentLocation: lot.currentObservation.location,
    riskState: projection.riskState,
    severity: projection.severity,
    dueBucket: dueBucketForCentralRisk(projection.riskState),
    requiredResolution: projection.requiredResolution,
    section: sectionForCentralRisk(projection.riskState, lot.currentObservation.location),
    ownerLabel: projection.ownerLabel,
    status: "active",
    sourceRisk: {
      state: projection.riskState,
      reasons: [{ code: reasonCodeForCentralRisk(projection.riskState), field: "central" }],
    },
    priority: priorityForCentralRisk(projection.riskState, lot.currentObservation.location),
    createdAt: projection.updatedAt,
    updatedAt: projection.updatedAt,
    ...(lot.centralSyncState === "synchronized"
      ? {
          sync: {
            state: "synced",
            savedAt: projection.updatedAt,
            lastSyncedAt: projection.updatedAt,
          },
        }
      : {}),
  });
}

function shouldTrustPreparedCentralLotForRefresh(lot: CaptureLotSnapshot): boolean {
  return lot.centralSource === "central" && lot.centralSyncState === "synchronized";
}

function dueBucketForCentralRisk(
  riskState: ActiveTaskSnippet["riskState"],
): TodayTaskRecord["dueBucket"] {
  if (riskState === "expired") return "now";
  if (riskState === "critical" || riskState === "uncertain") return "shift";
  return "today";
}

function sectionForCentralRisk(
  riskState: ActiveTaskSnippet["riskState"],
  location: ActiveTaskSnippet["currentLocation"],
): TodayTaskRecord["section"] {
  if (riskState === "expired") return "withdraw_now";
  if (riskState === "markdown_due") return "request_markdown";
  if (location.kind === "area_de_venda") return "check_sales_area";
  return "follow_up";
}

function priorityForCentralRisk(
  riskState: ActiveTaskSnippet["riskState"],
  location: ActiveTaskSnippet["currentLocation"],
): number {
  const isSalesArea = location.kind === "area_de_venda";
  if (isSalesArea && riskState === "expired") return 0;
  if (isSalesArea && riskState === "critical") return 1;
  if (isSalesArea && riskState === "uncertain") return 2;
  if (riskState === "markdown_due") return 3;
  if (riskState === "expired") return 4;
  if (riskState === "critical") return 5;
  return 6;
}

function reasonCodeForCentralRisk(
  riskState: ActiveTaskSnippet["riskState"],
): "expired" | "expires_in_15_days" | "expires_in_3_days" | "presence_missing" {
  if (riskState === "expired") return "expired";
  if (riskState === "markdown_due") return "expires_in_15_days";
  if (riskState === "critical") return "expires_in_3_days";
  return "presence_missing";
}

function centralObservationIdFor(centralLotId: string): string {
  return `central-observation:${safeLocalIdentifier(centralLotId, 90)}`;
}

function centralLotIdempotencyKey(productId: string, lot: CaptureLotInput): string {
  const readable = [
    "mobile-lot",
    safeLocalIdentifier(productId, 64),
    lot.identity.identitySource,
    safeLocalIdentifier(lot.identity.value, 48),
    lot.mode,
    lot.initialLocation.kind,
  ].join(":");

  if (readable.length <= 120) {
    return readable;
  }

  return [
    "mobile-lot",
    safeLocalIdentifier(productId, 30),
    safeLocalIdentifier(lot.identity.value, 30),
    lot.mode,
    lot.initialLocation.kind,
    stableIdentifierHash(readable),
  ].join(":");
}

function centralLotInputForReplay(
  lot: CaptureLotDetail,
  centralProductId: string,
): CaptureLotInput {
  const base = {
    productId: centralProductId,
    identity: lot.identity,
    approximateQuantity: lot.approximateQuantity,
    initialLocation: lot.initialLocation,
  };

  if (lot.mode === "formal_validity" || lot.mode === "processed_repack_loss") {
    return parseLotInput({
      ...base,
      mode: lot.mode,
      expiresAt: lot.expiresAt,
      ...(lot.receivedAt === undefined ? {} : { receivedAt: lot.receivedAt }),
    });
  }

  if (lot.mode === "flv_inspection") {
    return parseLotInput({
      ...base,
      mode: lot.mode,
      receivedAt: lot.receivedAt,
      ...(lot.qualityInspectionDueAt === undefined
        ? {}
        : { qualityInspectionDueAt: lot.qualityInspectionDueAt }),
      ...(lot.qualityWindowDays === undefined ? {} : { qualityWindowDays: lot.qualityWindowDays }),
    });
  }

  return parseLotInput({
    ...base,
    mode: lot.mode,
    receivedAt: lot.receivedAt,
  });
}

function centralLotSnapshotToSnippet(lot: CentralLotSnapshot): CentralLotSnippet {
  return {
    centralLotId: lot.centralLotId,
    centralProductId: lot.centralProductId,
    productDisplayName: lot.productDisplayName,
    lotIdentity: lot.lotIdentity,
    mode: lot.mode,
    currentLocation: lot.currentObservation.location,
    state: lot.state,
    source: lot.source,
    ...(lot.riskState === undefined ? {} : { riskState: lot.riskState }),
    ...(lot.mode === "formal_validity" || lot.mode === "processed_repack_loss"
      ? { expiresAt: lot.expiresAt }
      : {}),
    ...(lot.mode === "formal_validity" ||
    lot.mode === "processed_repack_loss" ||
    lot.mode === "flv_inspection" ||
    lot.mode === "receiving_monitored"
      ? { receivedAt: lot.receivedAt }
      : {}),
    ...(lot.mode === "flv_inspection" && lot.qualityInspectionDueAt !== undefined
      ? { qualityInspectionDueAt: lot.qualityInspectionDueAt }
      : {}),
    approximateQuantity: lot.approximateQuantity,
    updatedAt: lot.updatedAt,
  };
}

function centralActiveTaskSnippetFromWriteResponse(
  response: CentralLotWriteResponse,
): ActiveTaskSnippet {
  if (response.taskProjection.attention !== "active_task") {
    throw new Error("Central write response has no active task projection.");
  }

  return {
    centralTaskId: response.taskProjection.centralTaskId,
    activeKey: response.taskProjection.activeKey,
    centralLotId: response.lot.centralLotId,
    productDisplayName: response.lot.productDisplayName,
    currentLocation: response.lot.currentObservation.location,
    riskState: response.taskProjection.riskState,
    severity: response.taskProjection.severity,
    requiredResolution: response.taskProjection.requiredResolution,
    state: response.lot.state,
    source: response.lot.source,
    ownerLabel: response.taskProjection.ownerLabel,
    updatedAt: response.taskProjection.updatedAt,
  };
}

function centralLotSnapshotToLocal(
  lot: CentralLotSnapshot,
  acknowledgementMessage: string | undefined,
): CaptureLotSnapshot {
  return {
    ...centralLotSnapshotInput(lot),
    id: lot.centralLotId,
    productDisplayName: lot.productDisplayName,
    currentObservation: centralObservationToLocal(lot),
    centralLotId: lot.centralLotId,
    centralSyncState: lot.state,
    centralSource: lot.source,
    taskProjection: lot.taskProjection,
    centralAcknowledgementMessage:
      acknowledgementMessage ??
      (lot.state === "synchronized"
        ? "Sincronizado com a central. Outro aparelho ve este lote apos preparar turno."
        : "Lote salvo com estado central visivel apos preparar turno."),
  };
}

function centralLotSnapshotInput(lot: CentralLotSnapshot): CaptureLotInput {
  const base = {
    productId: lot.centralProductId,
    identity: lot.lotIdentity,
    approximateQuantity: lot.approximateQuantity,
    initialLocation: lot.initialLocation,
  };

  if (lot.mode === "formal_validity") {
    return {
      ...base,
      mode: "formal_validity",
      expiresAt: lot.expiresAt,
      ...(lot.receivedAt === undefined ? {} : { receivedAt: lot.receivedAt }),
    };
  }

  if (lot.mode === "processed_repack_loss") {
    return {
      ...base,
      mode: "processed_repack_loss",
      expiresAt: lot.expiresAt,
      ...(lot.receivedAt === undefined ? {} : { receivedAt: lot.receivedAt }),
    };
  }

  if (lot.mode === "flv_inspection") {
    return {
      ...base,
      mode: "flv_inspection",
      receivedAt: lot.receivedAt,
      ...(lot.qualityInspectionDueAt === undefined
        ? {}
        : { qualityInspectionDueAt: lot.qualityInspectionDueAt }),
      ...(lot.qualityWindowDays === undefined ? {} : { qualityWindowDays: lot.qualityWindowDays }),
    };
  }

  return {
    ...base,
    mode: "receiving_monitored",
    receivedAt: lot.receivedAt,
  };
}

function centralObservationToLocal(lot: CentralLotSnapshot): CaptureObservationRecord {
  const base = {
    id: lot.currentObservation.centralObservationId,
    lotId: lot.centralLotId,
    status: lot.currentObservation.status,
    actorLabel: lot.currentObservation.actorLabel,
    occurredAt: lot.currentObservation.occurredAt,
    location: lot.currentObservation.location,
    isCorrection: lot.currentObservation.isCorrection,
    ...(lot.currentObservation.correctionReason === undefined
      ? {}
      : { correctionReason: lot.currentObservation.correctionReason }),
  };

  if (lot.currentObservation.quantityState === "estimated") {
    return {
      ...base,
      quantityState: "estimated",
      approximateQuantity: lot.currentObservation.approximateQuantity,
    };
  }

  return {
    ...base,
    quantityState: "not_estimable",
  };
}

function safeLocalIdentifier(value: string, maxLength: number): string {
  const normalized = value.replace(/[^a-zA-Z0-9:_-]/g, "-");
  return normalized.length === 0 ? "central" : normalized.slice(0, maxLength);
}

function stableIdentifierHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(8, "0").slice(0, 8);
}

function mapLotSnapshot(row: LotRow): CaptureLotSnapshot {
  const initialLocation = mapLocation(row.initial_location_kind, row.initial_location_custom_name);
  const lot = parseStoredLot(row, initialLocation);
  const centralSyncState = parseCentralSyncState(row.central_sync_state);
  const centralSource = parseCentralPackageSource(row.central_source);
  const taskProjection = parseStoredTaskProjection(row.task_projection_json);
  const currentObservation = mapObservation({
    id: row.current_observation_id,
    lot_id: row.id,
    status: row.current_status,
    actor_label: row.current_actor_label,
    occurred_at: row.current_occurred_at,
    location_kind: row.current_location_kind,
    location_custom_name: row.current_location_custom_name,
    quantity_state: row.current_quantity_state,
    approximate_quantity: row.current_approximate_quantity,
    is_correction: row.current_is_correction,
    correction_reason: row.current_correction_reason,
  });

  return {
    ...lot,
    id: row.id,
    productDisplayName: row.product_display_name,
    currentObservation,
    ...(row.central_lot_id === null ? {} : { centralLotId: row.central_lot_id }),
    ...(centralSyncState === undefined ? {} : { centralSyncState }),
    ...(centralSource === undefined ? {} : { centralSource }),
    ...(taskProjection === undefined ? {} : { taskProjection }),
    ...(row.central_ack_message === null
      ? {}
      : { centralAcknowledgementMessage: row.central_ack_message }),
  };
}

function parseStoredLot(row: LotRow, initialLocation: OperationalLocation): CaptureLotInput {
  const base = {
    productId: row.product_id,
    identity: {
      identitySource: row.identity_source,
      value: row.identity_value,
    },
    approximateQuantity: row.approximate_quantity,
    initialLocation,
  };

  if (row.mode === "formal_validity") {
    return CaptureLotInputSchema.parse({
      ...base,
      mode: row.mode,
      expiresAt: row.expires_at,
      ...(row.received_at === null ? {} : { receivedAt: row.received_at }),
    });
  }

  if (row.mode === "processed_repack_loss") {
    return CaptureLotInputSchema.parse({
      ...base,
      mode: row.mode,
      expiresAt: row.expires_at,
      ...(row.received_at === null ? {} : { receivedAt: row.received_at }),
    });
  }

  if (row.mode === "flv_inspection") {
    return CaptureLotInputSchema.parse({
      ...base,
      mode: row.mode,
      receivedAt: row.received_at,
      ...(row.quality_inspection_due_at === null
        ? {}
        : { qualityInspectionDueAt: row.quality_inspection_due_at }),
      ...(row.quality_window_days === null ? {} : { qualityWindowDays: row.quality_window_days }),
    });
  }

  return CaptureLotInputSchema.parse({
    ...base,
    mode: "receiving_monitored",
    receivedAt: row.received_at,
  });
}

function mapObservation(row: ObservationRow): CaptureObservationRecord {
  const observation = PhysicalObservationInputSchema.parse({
    status: row.status,
    actorLabel: row.actor_label,
    occurredAt: row.occurred_at,
    location: mapLocation(row.location_kind, row.location_custom_name),
    quantityState: row.quantity_state,
    ...(row.quantity_state === "estimated"
      ? { approximateQuantity: row.approximate_quantity }
      : {}),
    isCorrection: row.is_correction === 1,
    ...(row.correction_reason === null ? {} : { correctionReason: row.correction_reason }),
  });

  return { ...observation, id: row.id, lotId: row.lot_id };
}

function mapTodayTask(row: TodayTaskRow): TodayTaskRecord {
  return parseTodayTaskRecord({
    id: row.id,
    activeKey: row.active_key,
    lotId: row.lot_id,
    productDisplayName: row.product_display_name,
    lotIdentity: {
      identitySource: row.lot_identity_source,
      value: row.lot_identity_value,
    },
    currentLocation: mapLocation(row.current_location_kind, row.current_location_custom_name),
    riskState: row.risk_state,
    severity: row.severity,
    dueBucket: row.due_bucket,
    requiredResolution: row.required_resolution,
    section: row.section,
    ownerLabel: row.owner_label,
    status: row.status,
    sourceRisk: parseJson(row.source_risk_json),
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.resolved_at === null ? {} : { resolvedAt: row.resolved_at }),
    ...(row.recheck_parent_id === null ? {} : { recheckParentId: row.recheck_parent_id }),
    ...(row.markdown_workflow_id === null ? {} : { markdownWorkflowId: row.markdown_workflow_id }),
    ...(row.markdown_stage === null ? {} : { markdownStage: row.markdown_stage }),
    ...(row.responsible_actor_label === null
      ? {}
      : { responsibleActorLabel: row.responsible_actor_label }),
    ...(row.resolution_history_json === null
      ? {}
      : { resolutionHistory: parseJson(row.resolution_history_json) }),
    ...(row.sync_json === null ? {} : { sync: parseJson(row.sync_json) }),
  });
}

function mapMarkdownWorkflow(row: MarkdownWorkflowRow): MarkdownWorkflowRecord {
  return MarkdownWorkflowRecordSchema.parse({
    id: row.id,
    lotId: row.lot_id,
    status: row.status,
    currentStage: row.current_stage,
    requestedAt: row.requested_at,
    requestedBy: row.requested_by,
    requestReason: row.request_reason,
    ...(row.early_justification === null ? {} : { earlyJustification: row.early_justification }),
    ...(row.approved_at === null ? {} : { approvedAt: row.approved_at }),
    ...(row.approved_by === null ? {} : { approvedBy: row.approved_by }),
    ...(row.rejected_at === null ? {} : { rejectedAt: row.rejected_at }),
    ...(row.rejected_by === null ? {} : { rejectedBy: row.rejected_by }),
    ...(row.rejection_reason === null ? {} : { rejectionReason: row.rejection_reason }),
    ...(row.applied_at === null ? {} : { appliedAt: row.applied_at }),
    ...(row.applied_by === null ? {} : { appliedBy: row.applied_by }),
    ...(row.application_evidence_json === null
      ? {}
      : { applicationEvidence: parseJson(row.application_evidence_json) }),
    ...(row.shelf_confirmed_at === null ? {} : { shelfConfirmedAt: row.shelf_confirmed_at }),
    ...(row.shelf_confirmed_by === null ? {} : { shelfConfirmedBy: row.shelf_confirmed_by }),
    ...(row.shelf_confirmation_evidence_json === null
      ? {}
      : { shelfConfirmationEvidence: parseJson(row.shelf_confirmation_evidence_json) }),
    stageHistory: parseJson(row.stage_history_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function isActiveMarkdownWorkflow(workflow: MarkdownWorkflowRecord): boolean {
  return workflow.status !== "rejected" && workflow.status !== "shelf_confirmed";
}

function mapFutureAttention(row: FutureAttentionRow): FutureAttentionRecord {
  return FutureAttentionRecordSchema.parse({
    id: row.id,
    lotId: row.lot_id,
    productDisplayName: row.product_display_name,
    lotIdentity: {
      identitySource: row.lot_identity_source,
      value: row.lot_identity_value,
    },
    currentLocation: mapLocation(row.current_location_kind, row.current_location_custom_name),
    riskState: "radar",
    section: "future_attention",
    sourceRiskReasons: parseJson(row.source_risk_reasons_json),
    observedAt: row.observed_at,
  });
}

function mapAlertDevice(row: AlertDeviceRow): DevicePushRegistrationCommand {
  return DevicePushRegistrationCommandSchema.parse({
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    audienceRole: row.audience_role,
    permissionStatus: row.permission_status,
    ...(row.expo_push_token === null ? {} : { expoPushToken: row.expo_push_token }),
    registeredAt: row.registered_at,
  });
}

function mapTaskAlertState(row: TaskAlertStateRow): TaskAlertStateRecord {
  return TaskAlertStateRecordSchema.parse({
    taskId: row.task_id,
    taskActiveKey: row.task_active_key,
    channelState: row.channel_state,
    attemptState: row.attempt_state,
    audience: row.audience,
    escalationState: row.escalation_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.last_reminder_at === null ? {} : { lastReminderAt: row.last_reminder_at }),
    ...(row.next_reminder_at === null ? {} : { nextReminderAt: row.next_reminder_at }),
    ...(row.escalated_at === null ? {} : { escalatedAt: row.escalated_at }),
    ...(row.leadership_acknowledged_at === null
      ? {}
      : { leadershipAcknowledgedAt: row.leadership_acknowledged_at }),
    ...(row.retry_count === null ? {} : { retryCount: row.retry_count }),
    ...(row.failure_reason === null ? {} : { failureReason: row.failure_reason }),
    ...(row.last_attempt_id === null ? {} : { lastAttemptId: row.last_attempt_id }),
  });
}

function mapOfflineCacheStatus(row: OfflineCacheStatusRow): OfflineCacheStatus {
  return parseOfflineCacheStatus({
    state: row.state,
    ...(row.last_refreshed_at === null ? {} : { lastRefreshedAt: row.last_refreshed_at }),
    activeTaskCount: row.active_task_count,
    requiredLotSnippetCount: row.required_lot_snippet_count,
    staleAfterHours: row.stale_after_hours,
    source: row.source,
    updatedAt: row.updated_at,
  });
}

function mapPrepareTurnCacheStatus(row: PrepareTurnCacheStatusRow): PrepareTurnCacheStatus {
  return PrepareTurnCacheStatusSchema.parse({
    state: row.state,
    source: row.source,
    updatedAt: row.updated_at,
    ...(row.last_central_read_at === null ? {} : { lastCentralReadAt: row.last_central_read_at }),
    staleAfterHours: row.stale_after_hours,
    productCount: row.product_count,
    lotCount: row.lot_count,
    activeTaskCount: row.active_task_count,
    conflictCount: row.conflict_count,
    resolvedHistoryCount: row.resolved_history_count,
  });
}

function mapOnboardingProgress(row: OnboardingProgressRow): LocalOnboardingProgressRecord {
  return parseLocalOnboardingProgressRecord({
    subjectId: row.subject_id,
    storeId: row.store_id,
    flowId: row.flow_id as LocalOnboardingProgressRecord["flowId"],
    version: row.version as LocalOnboardingProgressRecord["version"],
    status: row.status as LocalOnboardingProgressRecord["status"],
    ...(row.completed_at === null ? {} : { completedAt: row.completed_at }),
    ...(row.skipped_at === null ? {} : { skippedAt: row.skipped_at }),
    updatedAt: row.updated_at,
  });
}

function mapEvidenceUpload(row: EvidenceUploadRow): EvidenceUploadQueueRecord {
  return {
    localEvidenceId: row.local_evidence_id,
    taskId: row.task_id,
    storeId: row.store_id,
    target: parseJson(row.target_json) as EvidenceUploadQueueRecord["target"],
    localUri: row.local_uri,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    capturedAt: row.captured_at,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attemptCount: row.attempt_count,
    ...(row.asset_id === null ? {} : { assetId: row.asset_id }),
    ...(row.upload_path === null ? {} : { uploadPath: row.upload_path }),
    ...(row.uploaded_at === null ? {} : { uploadedAt: row.uploaded_at }),
    ...(row.retention_expires_at === null ? {} : { retentionExpiresAt: row.retention_expires_at }),
    ...(row.last_error === null ? {} : { lastError: row.last_error }),
  };
}

function mapShiftCloseOutbox(row: ShiftCloseOutboxRow): ShiftCloseOutboxRecord {
  return {
    localCloseId: row.local_close_id,
    request: parseJson(row.request_json) as ShiftCloseUnsafeRequest,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attemptCount: row.attempt_count,
    ...(row.server_closure_id === null ? {} : { serverClosureId: row.server_closure_id }),
    ...(row.last_error === null ? {} : { lastError: row.last_error }),
  };
}

function mapSyncCommand(row: SyncCommandRow): SyncCommandRecord {
  return parseSyncCommandRecord({
    id: row.id,
    idempotencyKey: row.idempotency_key,
    kind: row.kind,
    state: row.state,
    urgency: row.urgency,
    payload: parseJson(row.payload_json),
    taskId: row.task_id,
    taskActiveKey: row.task_active_key,
    lotId: row.lot_id,
    productDisplayName: row.product_display_name,
    lotIdentity: {
      identitySource: row.lot_identity_source,
      value: row.lot_identity_value,
    },
    currentLocation: mapLocation(row.current_location_kind, row.current_location_custom_name),
    riskState: row.risk_state,
    requiredResolution: row.required_resolution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    savedAt: row.saved_at,
    ...(row.first_attempted_at === null ? {} : { firstAttemptedAt: row.first_attempted_at }),
    ...(row.last_attempted_at === null ? {} : { lastAttemptedAt: row.last_attempted_at }),
    attemptCount: row.attempt_count,
    ...(row.next_retry_at === null ? {} : { nextRetryAt: row.next_retry_at }),
    ...(row.last_error === null ? {} : { lastError: row.last_error }),
    ...(row.acked_at === null ? {} : { ackedAt: row.acked_at }),
    ...(row.conflict_id === null ? {} : { conflictId: row.conflict_id }),
    ...(row.discarded_at === null ? {} : { discardedAt: row.discarded_at }),
    ...(row.discard_reason === null ? {} : { discardReason: row.discard_reason }),
  });
}

function mapSyncConflict(row: SyncConflictRow): SyncConflictRecord {
  return parseSyncConflictRecord({
    id: row.id,
    commandId: row.command_id,
    severity: row.severity,
    reason: row.reason,
    localAction: parseJson(row.local_action_json),
    remoteChange: parseJson(row.remote_change_json),
    allowedActions: parseJson(row.allowed_actions_json),
    createdAt: row.created_at,
    ...(row.resolved_at === null ? {} : { resolvedAt: row.resolved_at }),
    ...(row.resolution_action === null ? {} : { resolutionAction: row.resolution_action }),
    ...(row.resolution_reason === null ? {} : { resolutionReason: row.resolution_reason }),
  });
}

function mapLocalAuditEvent(row: LocalAuditEventRow): LocalAuditEventRecord {
  const event = AuditTimelineItemSchema.parse({
    eventId: row.event_id,
    type: row.type,
    store: {
      storeId: row.store_id,
      storeName: row.store_name,
    },
    actor: {
      actorId: row.actor_id,
      displayName: row.actor_display_name,
      roleSnapshot: row.actor_role_snapshot,
    },
    target: {
      type: row.target_type,
      id: row.target_id,
      ...(row.target_label === null ? {} : { label: row.target_label }),
    },
    occurredAt: row.occurred_at,
    ...(row.received_at === null ? {} : { receivedAt: row.received_at }),
    summary: row.summary,
    ...(row.reason === null ? {} : { reason: row.reason }),
    status: row.status,
    ...(row.linked_event_id === null ? {} : { linkedEventId: row.linked_event_id }),
    metadata: parseJson(row.metadata_json),
  });

  return { ...event, idempotencyKey: row.idempotency_key };
}

function auditEventTypeForCommand(command: SyncCommandRecord): AuditTimelineItem["type"] {
  return command.kind === "resolve_task" ? "task.changed" : "markdown.changed";
}

function auditTargetTypeForCommand(
  command: SyncCommandRecord,
): AuditTimelineItem["target"]["type"] {
  return command.kind === "resolve_task" ? "task" : "markdown";
}

function auditTargetIdForCommand(command: SyncCommandRecord): string {
  if (command.payload.kind === "resolve_task") {
    return command.taskId;
  }

  if (command.payload.kind === "request_markdown") {
    return command.payload.payload.lotId;
  }

  return command.payload.payload.workflowId;
}

function auditProducerKindForCommand(command: SyncCommandRecord): string {
  if (command.payload.kind === "resolve_task") {
    return command.payload.payload.action === "complete_recheck" ? "task.resolve" : "task.action";
  }

  if (command.payload.kind === "request_markdown") {
    return "markdown.request";
  }

  if (command.payload.kind === "decide_markdown") {
    return "markdown.decide";
  }

  if (command.payload.kind === "record_markdown_application") {
    return "markdown.apply";
  }

  return "markdown.confirm_on_shelf";
}

function auditSummaryForCommand(command: SyncCommandRecord): string {
  if (command.payload.kind === "resolve_task") {
    if (command.payload.payload.action === "withdraw") {
      return "Retirada salva neste aparelho.";
    }

    if (command.payload.payload.action === "complete_recheck") {
      return "Reconferencia salva neste aparelho.";
    }

    return "Acao de tarefa salva neste aparelho.";
  }

  if (command.payload.kind === "request_markdown") {
    return "Solicitacao de rebaixa salva neste aparelho.";
  }

  if (command.payload.kind === "decide_markdown") {
    return "Decisao de rebaixa salva neste aparelho.";
  }

  if (command.payload.kind === "record_markdown_application") {
    return "Aplicacao de rebaixa salva neste aparelho.";
  }

  return "Conferencia de rebaixa salva neste aparelho.";
}

function mapLocation(kind: string, customName: string | null): OperationalLocation {
  return OperationalLocationSchema.parse(kind === "other" ? { kind, customName } : { kind });
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function withoutEvidenceUploadError(
  record: EvidenceUploadQueueRecord,
): Omit<EvidenceUploadQueueRecord, "lastError"> {
  const { lastError: _lastError, ...rest } = record;
  void _lastError;

  return rest;
}
