import {
  ProductDraftCreateResponseSchema,
  ProductSearchResponseSchema,
  type ProductCatalogItem,
  type ProductDraftCreateRequest,
  type ProductDraftReviewState,
  type ProductIdentifier,
  type ProductIdentifierInput,
  type ProductSearchCandidate,
  type ProductSearchRequest,
  type ProductSearchResponse,
  type AlertDeliveryResult,
  type ActiveTaskSnippet,
  type AuditTimelineItem,
  type CaptureLotInput,
  type CaptureProductInput,
  type CentralResolvedTaskHistory,
  type CentralLotSnapshot,
  type CentralLotSnippet,
  type CentralLotWriteResponse,
  type CentralProductSnippet,
  type DevicePushRegistrationCommand,
  type FutureAttentionRecord,
  type MarkdownWorkflowRecord,
  type OfflineActionCommand,
  type OfflineCacheStatus,
  type PhysicalObservationInput,
  type PrepareTurnCacheStatus,
  type PrepareTurnResponse,
  type PushOpenIntent,
  type SyncCommandRecord,
  type SyncConflictRecord,
  type SyncQueueSummary,
  type SyncTransportResult,
  type ResolvedTaskHistorySnippet,
  type TaskAlertStateRecord,
  type TaskResolutionCommand,
  type TodayTaskRecord,
} from "@validade-zero/contracts";
import {
  canStartMarkdownWorkflow,
  classifySyncCommandUrgency,
  deriveOfflineCacheState,
  sortSyncQueueItems,
} from "@validade-zero/domain";
import type {
  AcknowledgeEscalationInput,
  CaptureLotDetail,
  CaptureLotSnapshot,
  CaptureObservationRecord,
  CaptureProductCategory,
  CaptureProductRecord,
  CaptureRepository,
  CaptureRepositoryDependencies,
  RecordAlertAttemptInput,
  RecentLotsQuery,
  RefreshTaskAlertStatesInput,
  ResolveSyncConflictInput,
  ResolvePushOpenIntentInput,
  RefreshTodayTasksInput,
  TodayTaskRefreshResult,
  LoadMarkdownEntryStateInput,
  LocalOnboardingProgressRecord,
  MarkdownEntryState,
  OnboardingProgressKey,
  EvidenceUploadQueueRecord,
  QueueUnsafeShiftCloseInput,
  ShiftCloseOutboxRecord,
  QueueEvidenceUploadInput,
  SaveLocalOnboardingProgressInput,
  SaveLotInput,
} from "./repository";
import {
  assertRecheckResolutionHasEvidence,
  assertMarkdownRequestAllowedForLot,
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
  latestPendingCentralObservationForLot,
  localLotCentralSyncMetadata,
  matchesRecentLotLocation,
  nextGeneratedId,
  normalizeTerminalObservationLocation,
  normalizeProductLookup,
  physicalObservationInputFromRecord,
  PendingCentralLotSyncError,
  pendingCentralLotWriteBlocker,
  shouldFallbackToLocalCentralWrite,
  parseMarkdownApplicationCommand,
  parseMarkdownApprovalCommand,
  parseMarkdownRequestCommand,
  parseMarkdownShelfConfirmationCommand,
  parseMarkdownWorkflowRecord,
  parseAlertDeliveryResult,
  parseAlertDeviceRegistration,
  categoryCatalogItemToLocalCategory,
  centralLotIdForObservationWrite,
  centralReadObservationLocation,
  centralReadObservationStatus,
  parseCentralLotCreateRequest,
  parseCentralObservationAppendRequest,
  parseCentralLotWriteResponse,
  parseLotId,
  parseLotInput,
  parseProductCategoryId,
  parseProductInput,
  parseRecentLotsQuery,
  parseTaskResolutionCommand,
  parsePushOpenIntent,
  parseOfflineActionCommand,
  parseOfflineCacheStatus,
  parseLocalOnboardingProgressRecord,
  parsePrepareTurnCacheStatus,
  parsePrepareTurnResponse,
  parseProductDraftCreateRequest,
  parseProductSearchRequest,
  productCatalogItemToLocalRecord,
  productDraftToLocalRecord,
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
import { operationalDateKey } from "./operational-date";
import { createDeviceInstallId } from "./device-identity";

const OFFLINE_CACHE_STALE_AFTER_HOURS = 4;

export function createMemoryCaptureRepository(
  dependencies: CaptureRepositoryDependencies,
): CaptureRepository {
  const products = new Map<string, CaptureProductRecord>();
  const categoryCatalog = new Map<string, CaptureProductCategory>();
  const lots = new Map<string, CaptureLotSnapshot>();
  const observations = new Map<string, CaptureObservationRecord[]>();
  const todayTasks = new Map<string, TodayTaskRecord>();
  const futureAttention = new Map<string, FutureAttentionRecord>();
  const shiftCloseOutbox = new Map<string, ShiftCloseOutboxRecord>();
  const markdownWorkflows = new Map<string, MarkdownWorkflowRecord>();
  const alertDevices = new Map<string, DevicePushRegistrationCommand>();
  const taskAlertStates = new Map<string, TaskAlertStateRecord>();
  const syncCommands = new Map<string, SyncCommandRecord>();
  const evidenceUploads = new Map<string, EvidenceUploadQueueRecord>();
  const syncConflicts = new Map<string, SyncConflictRecord>();
  const localAuditEvents = new Map<string, AuditTimelineItem & { idempotencyKey: string }>();
  const onboardingProgress = new Map<string, LocalOnboardingProgressRecord>();
  const alertAttempts: RecordAlertAttemptInput[] = [];
  const escalationReceipts: AcknowledgeEscalationInput[] = [];
  let offlineCacheStatus: OfflineCacheStatus | undefined;
  let prepareTurnCacheStatus: PrepareTurnCacheStatus | undefined;
  let deviceInstallId: string | undefined;

  async function initialize(): Promise<void> {
    return Promise.resolve();
  }

  function getOrCreateDeviceInstallId(): Promise<string> {
    deviceInstallId ??= createDeviceInstallId(dependencies.createId);
    return Promise.resolve(deviceInstallId);
  }

  function hydratePrepareTurn(response: PrepareTurnResponse): Promise<void> {
    const prepared = parsePrepareTurnResponse(response);
    const lotsById = new Map(prepared.lots.map((lot) => [lot.centralLotId, lot]));
    const activeCentralTaskIds = new Set(prepared.activeTasks.map((task) => task.centralTaskId));
    const activeCentralLotIds = new Set(prepared.activeTasks.map((task) => task.centralLotId));
    const preparedCentralLotIds = new Set(prepared.lots.map((lot) => lot.centralLotId));
    const resolvedByTaskId = new Map(
      prepared.resolvedHistory.map((history) => [history.centralTaskId, history]),
    );
    const resolvedByLotId = resolvedHistoryByLotId(prepared.resolvedHistory, activeCentralLotIds);

    for (const product of prepared.products) {
      products.set(product.centralProductId, centralProductToLocal(product));
    }

    for (const lot of prepared.lots) {
      const snapshot = centralLotToLocal(lot, resolvedByLotId.get(lot.centralLotId));
      const previousHistory = observations.get(snapshot.id) ?? [];
      const pendingObservation = latestPendingCentralObservationForLot(snapshot, previousHistory);
      lots.set(
        snapshot.id,
        pendingObservation === undefined
          ? snapshot
          : { ...snapshot, currentObservation: pendingObservation },
      );
      observations.set(
        snapshot.id,
        appendObservationHistory(previousHistory, snapshot.currentObservation),
      );
      deletePendingLocalDuplicateLotsForCentralLot(lot);
    }

    for (const task of prepared.activeTasks) {
      const record = centralActiveTaskToLocal(task, lotsById);
      if (shouldPreserveLocalResolutionProjection(todayTasks.get(record.id))) {
        continue;
      }
      todayTasks.set(record.id, record);
    }

    reconcilePreparedCentralTasks(
      activeCentralTaskIds,
      preparedCentralLotIds,
      resolvedByTaskId,
      prepared.store.generatedAt,
    );
    prepareTurnCacheStatus = parsePrepareTurnCacheStatus(prepared.cache);

    return Promise.resolve();
  }

  function loadPrepareTurnCacheStatus(): Promise<PrepareTurnCacheStatus | null> {
    return Promise.resolve(prepareTurnCacheStatus ?? null);
  }

  function onboardingProgressKey(input: OnboardingProgressKey): string {
    return `${input.subjectId}:${input.storeId}:${input.flowId}:${input.version}`;
  }

  function loadOnboardingProgress(
    key: OnboardingProgressKey,
  ): Promise<LocalOnboardingProgressRecord | null> {
    return Promise.resolve(onboardingProgress.get(onboardingProgressKey(key)) ?? null);
  }

  function saveOnboardingProgress(
    input: SaveLocalOnboardingProgressInput,
  ): Promise<LocalOnboardingProgressRecord> {
    const record = parseLocalOnboardingProgressRecord({
      subjectId: input.subjectId,
      storeId: input.storeId,
      flowId: input.flowId,
      version: input.version,
      status: input.status,
      ...(input.status === "completed" ? { completedAt: input.occurredAt } : {}),
      ...(input.status === "skipped" ? { skippedAt: input.occurredAt } : {}),
      updatedAt: input.occurredAt,
    });
    onboardingProgress.set(onboardingProgressKey(record), record);

    return Promise.resolve(record);
  }

  function reconcilePreparedCentralTasks(
    activeCentralTaskIds: ReadonlySet<string>,
    preparedCentralLotIds: ReadonlySet<string>,
    resolvedByTaskId: ReadonlyMap<string, ResolvedTaskHistorySnippet>,
    reconciledAt: string,
  ): void {
    for (const [taskId, task] of todayTasks.entries()) {
      if (activeCentralTaskIds.has(taskId)) {
        continue;
      }

      const parentTask =
        task.recheckParentId === undefined ? undefined : todayTasks.get(task.recheckParentId);
      if (shouldPreserveLocalResolutionProjection(parentTask)) {
        continue;
      }

      const shouldResolveStaleTask =
        task.sync?.state === "synced" ||
        preparedCentralLotIds.has(task.lotId) ||
        !lots.has(task.lotId);

      if (!shouldResolveStaleTask) {
        continue;
      }

      const resolved = resolvedByTaskId.get(taskId);
      todayTasks.set(taskId, resolvedTaskFromCentralHistory(task, resolved, reconciledAt));
    }
  }

  function createProduct(input: CaptureProductInput): Promise<CaptureProductRecord> {
    const product = parseProductInput(input);
    const normalizedName = normalizeProductLookup(product.displayName);
    const existing = [...products.values()].find(
      (candidate) =>
        candidate.normalizedName === normalizedName ||
        (product.gtin !== undefined && candidate.gtin === product.gtin),
    );

    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    const record: CaptureProductRecord = {
      ...product,
      id: nextGeneratedId(dependencies),
      normalizedName,
      createdAt: dependencies.clock(),
    };
    products.set(record.id, record);

    return Promise.resolve(record);
  }

  async function searchCentralProducts(input: ProductSearchRequest) {
    const request = parseProductSearchRequest(input);
    if (dependencies.searchCentralProducts !== undefined) {
      const response = ProductSearchResponseSchema.parse(
        await dependencies.searchCentralProducts(request),
      );

      for (const product of response.reusableProducts) {
        const record = productCatalogItemToLocalRecord(product);
        products.set(record.id, record);
      }

      for (const product of response.similarCandidates) {
        const record = productCatalogItemToLocalRecord(product);
        products.set(record.id, record);
      }

      if (response.draft !== undefined) {
        const record = productDraftToLocalRecord(response.draft);
        products.set(record.id, record);
      }

      return response;
    }

    const normalizedQuery =
      request.query === undefined ? undefined : normalizeProductLookup(request.query);
    const catalogProducts = [...products.values()].map(localProductToCatalogItem);
    const lookupIdentifiers = requestIdentifiers(request);
    const exact = catalogProducts.filter(
      (product) =>
        (normalizedQuery !== undefined && product.normalizedKey === normalizedQuery) ||
        (request.gtin !== undefined && product.gtin === request.gtin) ||
        productHasAnyIdentifier(product, lookupIdentifiers),
    );
    const reusableProducts = exact
      .filter((product) => product.reviewStatus === "validated")
      .map((product) =>
        productSearchCandidate(
          product,
          "reusable_central",
          exactMatchReasons(product, normalizedQuery, request.gtin, lookupIdentifiers),
        ),
      );
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
      ...(draft === undefined
        ? {}
        : {
            draft: {
              draftId: draft.centralProductId,
              centralProductId: draft.centralProductId,
              displayName: draft.displayName,
              normalizedKey: draft.normalizedKey,
              categoryId: draft.categoryId,
              categoryName: draft.categoryName,
              categoryRuleProfile: draft.categoryRuleProfile,
              source: "draft_pending_review",
              reviewStatus: "pending_review",
              syncState: draft.syncState,
              requestedByLabel: "Este aparelho",
              requestedAt: draft.updatedAt,
              similarCandidates: [],
              ...(draft.gtin === undefined ? {} : { gtin: draft.gtin }),
              ...(draft.identifiers === undefined ? {} : { identifiers: draft.identifiers }),
            },
          }),
    });
  }

  function createProductDraft(input: ProductDraftCreateRequest) {
    const request = parseProductDraftCreateRequest(input);
    const normalizedName = normalizeProductLookup(request.displayName);
    const catalogProducts = [...products.values()].map(localProductToCatalogItem);
    const identifiers = requestIdentifiers(request);
    const exact = catalogProducts.find(
      (product) =>
        product.normalizedKey === normalizedName ||
        (request.gtin !== undefined && product.gtin === request.gtin) ||
        productHasAnyIdentifier(product, identifiers),
    );

    if (exact !== undefined) {
      const sourceRecord = [...products.values()].find(
        (product) => (product.centralProductId ?? product.id) === exact.centralProductId,
      );
      const mergedRecord =
        sourceRecord === undefined ? undefined : mergeProductIdentifiers(sourceRecord, identifiers);
      if (mergedRecord !== undefined) products.set(mergedRecord.id, mergedRecord);
      const reusableProduct =
        mergedRecord === undefined ? exact : localProductToCatalogItem(mergedRecord);

      if (exact.reviewStatus === "pending_review") {
        const draft = {
          draftId: reusableProduct.centralProductId,
          centralProductId: reusableProduct.centralProductId,
          displayName: reusableProduct.displayName,
          normalizedKey: reusableProduct.normalizedKey,
          categoryId: reusableProduct.categoryId,
          categoryName: reusableProduct.categoryName,
          categoryRuleProfile: reusableProduct.categoryRuleProfile,
          source: "draft_pending_review" as const,
          reviewStatus: "pending_review" as const,
          syncState: "pending_central" as const,
          requestedByLabel: "Este aparelho",
          requestedAt: reusableProduct.updatedAt,
          similarCandidates: [],
          ...(reusableProduct.gtin === undefined ? {} : { gtin: reusableProduct.gtin }),
          ...(reusableProduct.identifiers === undefined
            ? {}
            : { identifiers: reusableProduct.identifiers }),
        };

        return Promise.resolve(
          ProductDraftCreateResponseSchema.parse({
            requestId: `mobile-draft-${dependencies.clock()}`,
            normalizedKey: normalizedName,
            outcome: "draft_pending_review",
            similarCandidates: [],
            draft,
            acknowledgement: {
              acknowledgementId: `ack-${exact.centralProductId}`,
              centralProductId: reusableProduct.centralProductId,
              state: "draft_pending_review",
              syncState: "pending_central",
              reviewStatus: "pending_review",
              acknowledgedAt: reusableProduct.updatedAt,
            },
          }),
        );
      }

      return Promise.resolve(
        ProductDraftCreateResponseSchema.parse({
          requestId: `mobile-draft-${dependencies.clock()}`,
          normalizedKey: normalizedName,
          outcome: "reuse_existing",
          duplicateReason:
            request.gtin !== undefined && exact.gtin === request.gtin
              ? "gtin"
              : productHasAnyIdentifier(exact, identifiers)
                ? "identifier"
                : "normalized_name",
          reusableProduct,
          similarCandidates: [],
        }),
      );
    }

    const acknowledged = new Set(request.similarCandidateIds ?? []);
    const similarCandidates = catalogProducts
      .filter((product) => isSimilarProduct(product.normalizedKey, normalizedName))
      .slice(0, 10)
      .map((product) => productSearchCandidate(product, "similar_candidate"));

    if (
      similarCandidates.length > 0 &&
      !similarCandidates.every((candidate) => acknowledged.has(candidate.centralProductId))
    ) {
      return Promise.resolve(
        ProductDraftCreateResponseSchema.parse({
          requestId: `mobile-draft-${dependencies.clock()}`,
          normalizedKey: normalizedName,
          outcome: "similar_found",
          similarCandidates,
        }),
      );
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
    products.set(record.id, record);
    const draft = productDraftToLocalRecordToDraft(record, similarCandidates);

    return Promise.resolve(
      ProductDraftCreateResponseSchema.parse({
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
      }),
    );
  }

  function findProducts(query: string): Promise<readonly CaptureProductRecord[]> {
    const normalizedQuery = normalizeProductLookup(query);

    if (normalizedQuery.length === 0) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      [...products.values()]
        .filter(
          (product) =>
            product.normalizedName.includes(normalizedQuery) ||
            product.gtin?.includes(normalizedQuery) === true,
        )
        .sort((left, right) => left.displayName.localeCompare(right.displayName, "pt-BR")),
    );
  }

  function listFrequentProducts(): Promise<readonly CaptureProductRecord[]> {
    const lotCounts = new Map<string, number>();

    for (const lot of lots.values()) {
      lotCounts.set(lot.productId, (lotCounts.get(lot.productId) ?? 0) + 1);
    }

    return Promise.resolve(
      [...products.values()]
        .filter((product) => (lotCounts.get(product.id) ?? 0) > 0)
        .sort((left, right) => {
          const frequencyDifference =
            (lotCounts.get(right.id) ?? 0) - (lotCounts.get(left.id) ?? 0);

          return frequencyDifference || left.displayName.localeCompare(right.displayName, "pt-BR");
        }),
    );
  }

  async function listProductCategories(): Promise<readonly CaptureProductCategory[]> {
    if (dependencies.listCentralCategories !== undefined) {
      try {
        const response = await dependencies.listCentralCategories();

        for (const category of response.categories) {
          categoryCatalog.set(category.categoryId, categoryCatalogItemToLocalCategory(category));
        }
      } catch {
        // Keep the cached local catalog available during unstable store connectivity.
      }
    }

    const counts = new Map<string, number>();

    for (const product of products.values()) {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }

    const categories = new Map<string, CaptureProductCategory>();

    for (const category of categoryCatalog.values()) {
      categories.set(category.categoryId, {
        ...category,
        productCount: counts.get(category.categoryId) ?? 0,
      });
    }

    for (const product of products.values()) {
      if (categories.has(product.categoryId)) continue;
      categories.set(product.categoryId, {
        categoryId: product.categoryId,
        categoryName: product.categoryName ?? product.categoryId,
        categoryRuleProfile: product.categoryRuleProfile,
        productCount: counts.get(product.categoryId) ?? 0,
      });
    }

    return [...categories.values()].sort((left, right) =>
      left.categoryName.localeCompare(right.categoryName, "pt-BR"),
    );
  }

  function findProductsByCategory(categoryId: string): Promise<readonly CaptureProductRecord[]> {
    const parsedCategoryId = parseProductCategoryId(categoryId);

    return Promise.resolve(
      [...products.values()]
        .filter((product) => product.categoryId === parsedCategoryId)
        .sort((left, right) => left.displayName.localeCompare(right.displayName, "pt-BR")),
    );
  }

  async function saveLot(input: SaveLotInput): Promise<CaptureLotSnapshot> {
    const lot = parseLotInput(input.lot);
    const product = findProductForLot(lot.productId);

    if (product === undefined) {
      throw new Error(`Cannot save a lot for an unknown product: ${lot.productId}`);
    }

    const centrallySaved = await trySaveLotCentrally(lot, product, input.actorLabel);

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

    lots.set(lotId, snapshot);
    observations.set(lotId, [observation]);

    return snapshot;
  }

  async function trySaveLotCentrally(
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

    if (prepareTurnCacheStatus?.state !== "ready" || prepareTurnCacheStatus.source !== "central") {
      return null;
    }

    try {
      const centralLot = parseLotInput({ ...lot, productId: product.centralProductId });
      const request = parseCentralLotCreateRequest({
        lot: centralLot,
        actorLabel,
        occurredAt: dependencies.clock(),
        idempotencyKey: centralLotIdempotencyKey(product.centralProductId, lot),
      });
      const response = parseCentralLotWriteResponse(await dependencies.createCentralLot(request));
      const snapshot = centralLotSnapshotToLocal(response.lot, response.acknowledgement.message);
      const lotsById = new Map<CentralLotSnippet["centralLotId"], CentralLotSnippet>([
        [response.lot.centralLotId, centralLotSnapshotToSnippet(response.lot)],
      ]);

      lots.set(snapshot.id, snapshot);
      observations.set(snapshot.id, [snapshot.currentObservation]);

      if (response.taskProjection.attention === "active_task") {
        const task = centralActiveTaskToLocal(
          centralActiveTaskSnippetFromWriteResponse(response),
          lotsById,
        );
        todayTasks.set(task.id, task);
      }

      return snapshot;
    } catch (error) {
      if (!shouldFallbackToLocalCentralWrite(error)) {
        const blocker = pendingCentralLotWriteBlocker(error);
        throw new PendingCentralLotSyncError(blocker, blocker, { cause: error });
      }

      return null;
    }
  }

  async function syncPendingCentralLots(): Promise<readonly CaptureLotSnapshot[]> {
    const pendingLocalLots = [...lots.entries()].filter(
      ([, localLot]) =>
        localLot.centralSyncState === "pending_central" || localLot.centralSyncState === "local",
    );
    const hasPendingCentralObservations = [...lots.values()].some(
      (lot) =>
        latestPendingCentralObservationForLot(lot, observations.get(lot.id) ?? []) !== undefined,
    );

    if (pendingLocalLots.length === 0 && !hasPendingCentralObservations) {
      return [];
    }

    if (prepareTurnCacheStatus?.state !== "ready" || prepareTurnCacheStatus.source !== "central") {
      throw new PendingCentralLotSyncError("central_read_required");
    }

    const syncedLots: CaptureLotSnapshot[] = [];
    let blockedByProduct = false;
    let writeFailure: unknown;

    if (pendingLocalLots.length > 0) {
      const createCentralLot = dependencies.createCentralLot;

      if (createCentralLot === undefined) {
        throw new PendingCentralLotSyncError("central_write_unavailable");
      }

      for (const [localLotId, localLot] of pendingLocalLots) {
        const localProduct = findProductForLot(localLot.productId);
        const product =
          localProduct === undefined ? undefined : await centralProductForPendingLot(localProduct);

        if (product === undefined || product.centralProductId === undefined) {
          blockedByProduct = true;
          continue;
        }

        try {
          const centralLot = centralLotInputForReplay(localLot, product.centralProductId);
          const request = parseCentralLotCreateRequest({
            lot: centralLot,
            actorLabel: localLot.currentObservation.actorLabel,
            occurredAt: localLot.currentObservation.occurredAt,
            idempotencyKey: centralLotIdempotencyKey(product.centralProductId, centralLot),
          });
          const response = parseCentralLotWriteResponse(await createCentralLot(request));
          const synced = centralLotSnapshotToLocal(response.lot, response.acknowledgement.message);
          const lotsById = new Map<CentralLotSnippet["centralLotId"], CentralLotSnippet>([
            [response.lot.centralLotId, centralLotSnapshotToSnippet(response.lot)],
          ]);

          lots.delete(localLotId);
          observations.delete(localLotId);
          lots.set(synced.id, synced);
          observations.set(synced.id, [synced.currentObservation]);

          if (response.taskProjection.attention === "active_task") {
            const task = centralActiveTaskToLocal(
              centralActiveTaskSnippetFromWriteResponse(response),
              lotsById,
            );
            todayTasks.set(task.id, task);
          }

          syncedLots.push(synced);
        } catch (error) {
          writeFailure = error;
          continue;
        }
      }
    }

    syncedLots.push(...(await syncPendingCentralObservations()));

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

  async function syncPendingCentralObservations(): Promise<readonly CaptureLotSnapshot[]> {
    if (dependencies.appendCentralObservation === undefined) {
      return [];
    }

    const syncedLots: CaptureLotSnapshot[] = [];

    for (const lot of [...lots.values()]) {
      const pendingObservation = latestPendingCentralObservationForLot(
        lot,
        observations.get(lot.id) ?? [],
      );

      if (pendingObservation === undefined) {
        continue;
      }

      const synced = await tryAppendObservationCentrally(lot, pendingObservation);

      if (synced !== null) {
        syncedLots.push(synced);
      }
    }

    return syncedLots;
  }

  async function appendObservation(
    lotId: string,
    input: PhysicalObservationInput,
  ): Promise<CaptureObservationRecord> {
    const validatedLotId = parseLotId(lotId);
    const snapshot = lots.get(validatedLotId);

    if (snapshot === undefined) {
      throw new Error(`Cannot append an observation for an unknown lot: ${validatedLotId}`);
    }

    const observation: CaptureObservationRecord = {
      ...normalizeTerminalObservationLocation(input),
      id: nextGeneratedId(dependencies),
      lotId: validatedLotId,
    };
    const centralObservation = await tryAppendObservationCentrally(snapshot, observation);

    if (centralObservation !== null) {
      return centralObservation.currentObservation;
    }

    const history = observations.get(validatedLotId) ?? [];

    observations.set(validatedLotId, [...history, observation]);
    lots.set(validatedLotId, { ...snapshot, currentObservation: observation });

    return observation;
  }

  async function tryAppendObservationCentrally(
    snapshot: CaptureLotSnapshot,
    observation: CaptureObservationRecord,
  ): Promise<CaptureLotSnapshot | null> {
    if (dependencies.appendCentralObservation === undefined) {
      return null;
    }

    if (prepareTurnCacheStatus?.state !== "ready" || prepareTurnCacheStatus.source !== "central") {
      return null;
    }

    const centralLotId = centralLotIdForObservationWrite(snapshot);

    if (centralLotId === undefined) {
      return null;
    }

    try {
      const request = parseCentralObservationAppendRequest({
        observation: physicalObservationInputFromRecord(observation),
        idempotencyKey: centralObservationAppendIdempotencyKey(centralLotId, observation),
      });
      const response = parseCentralLotWriteResponse(
        await dependencies.appendCentralObservation(centralLotId, request),
      );
      const synced = centralLotSnapshotToLocal(response.lot, response.acknowledgement.message);
      const previousHistory = observations.get(snapshot.id) ?? [];

      if (snapshot.id !== synced.id) {
        lots.delete(snapshot.id);
        observations.delete(snapshot.id);
      }

      lots.set(synced.id, synced);
      observations.set(
        synced.id,
        appendObservationHistory(previousHistory, synced.currentObservation),
      );
      reconcileCentralLotTasks(synced, response.lot.updatedAt);

      return synced;
    } catch (error) {
      if (!shouldFallbackToLocalCentralWrite(error)) {
        const blocker = pendingCentralLotWriteBlocker(error);
        throw new PendingCentralLotSyncError(blocker, blocker, { cause: error });
      }

      return null;
    }
  }

  function appendObservationHistory(
    history: readonly CaptureObservationRecord[],
    observation: CaptureObservationRecord,
  ): CaptureObservationRecord[] {
    if (history.some((candidate) => candidate.id === observation.id)) {
      return [...history];
    }

    return [...history, observation];
  }

  function reconcileCentralLotTasks(lot: CaptureLotSnapshot, updatedAt: string): void {
    const centralProjectedTask = centralProjectedTaskFromLot(lot);

    if (centralProjectedTask !== null) {
      const existingCentralTask = todayTasks.get(centralProjectedTask.id);
      if (shouldPreserveLocalResolutionProjection(existingCentralTask)) {
        return;
      }
      resolveActiveLotTasksExcept(centralProjectedTask, updatedAt);
      todayTasks.set(
        centralProjectedTask.id,
        existingCentralTask?.resolutionHistory === undefined
          ? centralProjectedTask
          : {
              ...centralProjectedTask,
              resolutionHistory: existingCentralTask.resolutionHistory,
            },
      );
      return;
    }

    if (shouldTrustPreparedCentralLotForRefresh(lot)) {
      if (lot.centralSyncState === "resolved" || !hasActiveSyncedTaskForLot(lot.id)) {
        resolveActiveTasksForLot(lot.id, updatedAt);
      }
    }
  }

  function listRecentLots(query?: RecentLotsQuery): Promise<readonly CaptureLotSnapshot[]> {
    const parsedQuery = parseRecentLotsQuery(query);
    const normalizedQuery =
      parsedQuery.query === undefined ? undefined : normalizeProductLookup(parsedQuery.query);

    return Promise.resolve(
      [...lots.values()]
        .filter((lot) => {
          const matchesQuery =
            normalizedQuery === undefined ||
            normalizeProductLookup(lot.productDisplayName).includes(normalizedQuery) ||
            findProductForLot(lot.productId)?.gtin?.includes(normalizedQuery) === true ||
            lot.identity.value.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
          const matchesLocation =
            parsedQuery.location === undefined ||
            matchesRecentLotLocation(lot, parsedQuery.location);

          return matchesQuery && matchesLocation;
        })
        .sort((left, right) =>
          right.currentObservation.occurredAt.localeCompare(left.currentObservation.occurredAt),
        )
        .slice(0, parsedQuery.limit ?? 20),
    );
  }

  function loadLotDetail(lotId: string): Promise<CaptureLotDetail | null> {
    const validatedLotId = parseLotId(lotId);
    const snapshot = lots.get(validatedLotId);

    if (snapshot === undefined) {
      return Promise.resolve(null);
    }

    const product = findProductForLot(snapshot.productId);

    if (product === undefined) {
      throw new Error(`Lot ${validatedLotId} has no stored product.`);
    }

    return Promise.resolve({
      ...snapshot,
      product,
      observations: observations.get(validatedLotId) ?? [],
    });
  }

  function findProductForLot(productId: string): CaptureProductRecord | undefined {
    return (
      products.get(productId) ??
      [...products.values()].find((product) => product.centralProductId === productId)
    );
  }

  function deletePendingLocalDuplicateLotsForCentralLot(lot: CentralLotSnippet): void {
    for (const [localLotId, localLot] of lots.entries()) {
      if (!isPendingLocalDuplicateLot(localLotId, localLot, lot)) continue;
      resolveActiveTasksForLot(localLotId, lot.updatedAt);
      lots.delete(localLotId);
      observations.delete(localLotId);
    }
  }

  function resolveActiveTasksForLot(lotId: string, resolvedAt: string): void {
    for (const [taskId, task] of todayTasks.entries()) {
      if (task.status !== "active" || task.lotId !== lotId || task.recheckParentId !== undefined) {
        continue;
      }
      todayTasks.set(taskId, resolvedTaskFromCentralHistory(task, undefined, resolvedAt));
    }
  }

  function isPendingLocalDuplicateLot(
    localLotId: string,
    localLot: CaptureLotSnapshot,
    centralLot: CentralLotSnippet,
  ): boolean {
    if (localLotId === centralLot.centralLotId) return false;
    if (localLot.centralSyncState !== "pending_central" && localLot.centralSyncState !== "local") {
      return false;
    }
    if (localLot.centralLotId === centralLot.centralLotId) return true;
    if (localLot.identity.identitySource !== centralLot.lotIdentity.identitySource) return false;
    if (localLot.identity.value !== centralLot.lotIdentity.value) return false;
    if (localLot.mode !== centralLot.mode) return false;

    const localProduct = findProductForLot(localLot.productId);
    const centralProduct = findProductForLot(centralLot.centralProductId);

    if (localLot.productId === centralLot.centralProductId) return true;
    if (localProduct?.centralProductId === centralLot.centralProductId) return true;
    if (localProduct === undefined || centralProduct === undefined) return false;

    return (
      localProduct.normalizedName === centralProduct.normalizedName &&
      localProduct.categoryId === centralProduct.categoryId
    );
  }

  async function refreshTodayTasks(input: RefreshTodayTasksInput): Promise<TodayTaskRefreshResult> {
    const refreshedAt = dependencies.clock();
    futureAttention.clear();

    for (const lotId of lots.keys()) {
      const detail = await loadLotDetail(lotId);

      if (detail === null) {
        continue;
      }

      const candidate = deriveTaskCandidateFromLot({
        lot: detail,
        currentDate: input.currentDate,
        currentTimestamp: input.currentTimestamp,
      });
      const future = createFutureAttentionRecord({
        lot: detail,
        id: `future:${detail.id}:radar`,
        observedAt: input.currentTimestamp,
        currentDate: input.currentDate,
        currentTimestamp: input.currentTimestamp,
      });

      if (future !== null) {
        futureAttention.set(future.id, future);
      }

      const centralProjectedTask = centralProjectedTaskFromLot(detail);

      if (centralProjectedTask !== null) {
        const existingCentralTask = todayTasks.get(centralProjectedTask.id);
        if (shouldPreserveLocalResolutionProjection(existingCentralTask)) {
          continue;
        }
        resolveActiveLotTasksExcept(centralProjectedTask, refreshedAt);
        todayTasks.set(
          centralProjectedTask.id,
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
        if (detail.centralSyncState === "resolved" || !hasActiveSyncedTaskForLot(detail.id)) {
          resolveActiveTasksForLot(detail.id, refreshedAt);
        }
        continue;
      }

      if (candidate === null) {
        continue;
      }

      if (
        candidate.requiredResolution === "request_markdown" &&
        findActiveMarkdownWorkflow(detail.id) !== undefined
      ) {
        continue;
      }

      const existing = [...todayTasks.values()].find(
        (task) => task.activeKey === candidate.activeKey,
      );

      if (existing === undefined) {
        const record = createTodayTaskRecord({
          candidate,
          lotIdentity: detail.identity,
          id: nextGeneratedId(dependencies),
          createdAt: refreshedAt,
          updatedAt: refreshedAt,
        });
        todayTasks.set(record.id, record);
        continue;
      }

      if (existing.status !== "active") {
        continue;
      }

      todayTasks.set(
        existing.id,
        parseTodayTaskRecord({
          ...existing,
          productDisplayName: candidate.productDisplayName,
          lotIdentity: detail.identity,
          currentLocation: candidate.currentLocation,
          riskState: candidate.riskState,
          severity: candidate.severity,
          dueBucket: candidate.dueBucket,
          requiredResolution: candidate.requiredResolution,
          section: candidate.section,
          sourceRisk: candidate.sourceRisk,
          priority: candidate.priority,
          updatedAt: refreshedAt,
        }),
      );
    }

    const tasks = await listActiveTodayTasks();
    const future = await listFutureAttention();

    offlineCacheStatus = parseOfflineCacheStatus({
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
    });

    return {
      metadata: {
        refreshedAt,
        activeTaskCount: tasks.length,
        futureAttentionCount: future.length,
        source: input.source,
      },
      tasks,
      futureAttention: future,
    };
  }

  function listActiveTodayTasks(): Promise<readonly TodayTaskRecord[]> {
    return Promise.resolve(sortTodayTasks([...todayTasks.values()].filter(isActiveTask)));
  }

  function listFutureAttention(): Promise<readonly FutureAttentionRecord[]> {
    return Promise.resolve([...futureAttention.values()]);
  }

  function resolveTodayTask(input: TaskResolutionCommand): Promise<TodayTaskRecord> {
    return Promise.resolve().then(() => {
      const command = parseTaskResolutionCommand(input);
      const existing = todayTasks.get(command.taskId);

      if (existing === undefined) {
        throw new Error(`Cannot resolve an unknown Today task: ${command.taskId}`);
      }

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

      todayTasks.set(resolved.id, resolved);

      if (shouldCreateSalesAreaRecheck(existing, command)) {
        const recheck = createSalesAreaRecheckTask({
          parentTask: existing,
          id: nextGeneratedId(dependencies),
          occurredAt: command.occurredAt,
        });

        todayTasks.set(recheck.id, recheck);
      }

      return resolved;
    });
  }

  function loadTodayTask(taskId: string): Promise<TodayTaskRecord | null> {
    const validatedTaskId = parseLotId(taskId);

    return Promise.resolve(todayTasks.get(validatedTaskId) ?? null);
  }

  async function requestMarkdown(input: Parameters<CaptureRepository["requestMarkdown"]>[0]) {
    const command = parseMarkdownRequestCommand(input);
    const detail = await requireLotDetail(command.lotId);
    const existing = findActiveMarkdownWorkflow(command.lotId);
    const currentDate = operationalDateKey(new Date(command.occurredAt));

    if (existing !== undefined) {
      throw new Error(`An active markdown workflow already exists for lot ${command.lotId}.`);
    }

    assertMarkdownRequestAllowedForLot(detail, currentDate);

    const assessment = calculateAssessmentForLot({
      lot: detail,
      currentDate,
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

    if (command.sourceTaskId !== undefined) {
      await resolveTodayTask({
        taskId: command.sourceTaskId,
        action: "request_markdown",
        actorLabel: command.actorLabel,
        occurredAt: command.occurredAt,
      });
    }

    const workflow = parseMarkdownWorkflowRecord({
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

    markdownWorkflows.set(workflow.id, workflow);
    todayTasks.set(task.id, task);

    return workflow;
  }

  async function decideMarkdown(input: Parameters<CaptureRepository["decideMarkdown"]>[0]) {
    const command = parseMarkdownApprovalCommand(input);
    const workflow = requireWorkflow(command.workflowId, "requested");
    const detail = await requireLotDetail(workflow.lotId);

    await requireMarkdownTask(command.taskId, workflow.id, "approve_markdown");
    await resolveTodayTask({
      taskId: command.taskId,
      action: command.decision === "approved" ? "approve_markdown" : "reject_markdown",
      actorLabel: command.actorLabel,
      occurredAt: command.occurredAt,
    });

    const updated =
      command.decision === "approved"
        ? parseMarkdownWorkflowRecord({
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
        : parseMarkdownWorkflowRecord({
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

    markdownWorkflows.set(updated.id, updated);

    if (updated.currentStage === "approved") {
      const assessment = calculateAssessmentForLot({
        lot: detail,
        currentDate: command.occurredAt.slice(0, 10),
        currentTimestamp: command.occurredAt,
      });
      const task = createMarkdownStageTodayTaskRecord({
        workflow: updated,
        lot: detail,
        assessment,
        id: nextGeneratedId(dependencies),
        createdAt: command.occurredAt,
        updatedAt: command.occurredAt,
      });

      todayTasks.set(task.id, task);
    }

    return updated;
  }

  async function recordMarkdownApplication(
    input: Parameters<CaptureRepository["recordMarkdownApplication"]>[0],
  ) {
    const command = parseMarkdownApplicationCommand(input);
    const workflow = requireWorkflow(command.workflowId, "approved");
    const detail = await requireLotDetail(workflow.lotId);

    await requireMarkdownTask(command.taskId, workflow.id, "apply_markdown");
    await resolveTodayTask({
      taskId: command.taskId,
      action: "apply_markdown",
      actorLabel: command.actorLabel,
      occurredAt: command.occurredAt,
      evidence: command.evidence,
    });

    const updated = parseMarkdownWorkflowRecord({
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
    const assessment = calculateAssessmentForLot({
      lot: detail,
      currentDate: command.occurredAt.slice(0, 10),
      currentTimestamp: command.occurredAt,
    });
    const task = createMarkdownStageTodayTaskRecord({
      workflow: updated,
      lot: detail,
      assessment,
      id: nextGeneratedId(dependencies),
      createdAt: command.occurredAt,
      updatedAt: command.occurredAt,
    });

    markdownWorkflows.set(updated.id, updated);
    todayTasks.set(task.id, task);

    return updated;
  }

  async function confirmMarkdownOnShelf(
    input: Parameters<CaptureRepository["confirmMarkdownOnShelf"]>[0],
  ) {
    const command = parseMarkdownShelfConfirmationCommand(input);
    const workflow = requireWorkflow(command.workflowId, "applied");

    await requireMarkdownTask(command.taskId, workflow.id, "confirm_markdown_on_shelf");
    await resolveTodayTask({
      taskId: command.taskId,
      action: "confirm_markdown_on_shelf",
      actorLabel: command.actorLabel,
      occurredAt: command.occurredAt,
      evidence: command.evidence,
    });

    const updated = parseMarkdownWorkflowRecord({
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

    markdownWorkflows.set(updated.id, updated);

    return updated;
  }

  function loadMarkdownWorkflowForLot(lotId: string): Promise<MarkdownWorkflowRecord | null> {
    const validatedLotId = parseLotId(lotId);
    const workflows = [...markdownWorkflows.values()]
      .filter((workflow) => workflow.lotId === validatedLotId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return Promise.resolve(workflows.find(isActiveMarkdownWorkflow) ?? workflows[0] ?? null);
  }

  function listActiveMarkdownWorkflows(): Promise<readonly MarkdownWorkflowRecord[]> {
    return Promise.resolve(
      [...markdownWorkflows.values()]
        .filter(isActiveMarkdownWorkflow)
        .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)),
    );
  }

  async function loadMarkdownEntryState(
    input: LoadMarkdownEntryStateInput,
  ): Promise<MarkdownEntryState> {
    const lot = await requireLotDetail(input.lotId);
    const activeWorkflow = findActiveMarkdownWorkflow(lot.id);
    const assessment = calculateAssessmentForLot({
      lot,
      currentDate: input.currentDate,
      currentTimestamp: input.currentTimestamp,
    });

    return deriveMarkdownEntryState({
      lot,
      assessment,
      ...(activeWorkflow === undefined ? {} : { activeWorkflow }),
      currentDate: input.currentDate,
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

  function findActiveMarkdownWorkflow(lotId: string): MarkdownWorkflowRecord | undefined {
    return [...markdownWorkflows.values()].find(
      (workflow) => workflow.lotId === lotId && isActiveMarkdownWorkflow(workflow),
    );
  }

  function requireWorkflow(
    workflowId: string,
    expectedStage: MarkdownWorkflowRecord["currentStage"],
  ): MarkdownWorkflowRecord {
    const workflow = markdownWorkflows.get(parseLotId(workflowId));

    if (workflow === undefined) {
      throw new Error(`Cannot advance an unknown markdown workflow: ${workflowId}`);
    }

    if (workflow.currentStage !== expectedStage || !isActiveMarkdownWorkflow(workflow)) {
      throw new Error(`Markdown workflow ${workflowId} is not waiting at stage ${expectedStage}.`);
    }

    return workflow;
  }

  async function requireMarkdownTask(
    taskId: string,
    workflowId: string,
    requiredResolution: TodayTaskRecord["requiredResolution"],
  ): Promise<TodayTaskRecord> {
    const task = await loadTodayTask(taskId);

    if (task === null) {
      throw new Error(`Cannot resolve an unknown markdown task: ${taskId}`);
    }

    if (
      task.status !== "active" ||
      task.markdownWorkflowId !== workflowId ||
      task.requiredResolution !== requiredResolution
    ) {
      throw new Error(`Task ${taskId} is not the active ${requiredResolution} markdown task.`);
    }

    return task;
  }

  function registerAlertDevice(
    input: DevicePushRegistrationCommand,
  ): Promise<DevicePushRegistrationCommand> {
    const registration = parseAlertDeviceRegistration(input);

    alertDevices.set(registration.deviceId, registration);

    return Promise.resolve(registration);
  }

  function loadAlertChannelState(): Promise<DevicePushRegistrationCommand | null> {
    const latest = [...alertDevices.values()].sort((left, right) =>
      right.registeredAt.localeCompare(left.registeredAt),
    )[0];

    return Promise.resolve(latest ?? null);
  }

  async function refreshTaskAlertStates(
    input: RefreshTaskAlertStatesInput,
  ): Promise<readonly TaskAlertStateRecord[]> {
    const registration = await loadAlertChannelState();
    const channelState = alertChannelStateForRegistration(registration);
    const activeTasks = await listActiveTodayTasks();

    for (const task of activeTasks) {
      const existing = taskAlertStates.get(task.id);
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

      taskAlertStates.set(refreshed.taskId, refreshed);
    }

    return listTaskAlertStates();
  }

  function listTaskAlertStates(): Promise<readonly TaskAlertStateRecord[]> {
    return Promise.resolve(
      [...taskAlertStates.values()].sort((left, right) =>
        left.updatedAt.localeCompare(right.updatedAt),
      ),
    );
  }

  async function recordAlertAttempt(input: RecordAlertAttemptInput): Promise<TaskAlertStateRecord> {
    const result: AlertDeliveryResult = parseAlertDeliveryResult(input.result);
    const task = todayTasks.get(parseLotId(input.taskId));

    if (task === undefined) {
      throw new Error(`Cannot record an alert attempt for an unknown task: ${input.taskId}`);
    }

    const existing =
      taskAlertStates.get(input.taskId) ??
      deriveRefreshedTaskAlertState({
        task,
        channelState: alertChannelStateForRegistration(await loadAlertChannelState()),
        referenceTime: input.attemptedAt,
      });
    const updated = applyAlertDeliveryResult({
      existing,
      attemptId: input.attemptId,
      attemptedAt: input.attemptedAt,
      result,
    });

    alertAttempts.push({ ...input, result });
    taskAlertStates.set(updated.taskId, updated);

    return updated;
  }

  function acknowledgeEscalation(input: AcknowledgeEscalationInput): Promise<TaskAlertStateRecord> {
    return Promise.resolve().then(() => {
      const task = todayTasks.get(parseLotId(input.taskId));

      if (task === undefined) {
        throw new Error(`Cannot acknowledge escalation for an unknown task: ${input.taskId}`);
      }

      const existing =
        taskAlertStates.get(task.id) ??
        deriveRefreshedTaskAlertState({
          task,
          channelState: alertChannelStateForRegistration(
            [...alertDevices.values()].sort((left, right) =>
              right.registeredAt.localeCompare(left.registeredAt),
            )[0] ?? null,
          ),
          referenceTime: input.acknowledgedAt,
        });
      const acknowledged = {
        ...existing,
        escalationState: "leadership_acknowledged",
        leadershipAcknowledgedAt: input.acknowledgedAt,
        updatedAt: input.acknowledgedAt,
      } satisfies TaskAlertStateRecord;

      escalationReceipts.push(input);
      taskAlertStates.set(acknowledged.taskId, acknowledged);

      return acknowledged;
    });
  }

  function resolvePushOpenIntent(input: ResolvePushOpenIntentInput): Promise<PushOpenIntent> {
    return Promise.resolve().then(() => {
      const task = todayTasks.get(parseLotId(input.taskId));
      const recheckReplacement = [...todayTasks.values()].find(
        (candidate) => candidate.status === "active" && candidate.recheckParentId === input.taskId,
      );

      if (recheckReplacement !== undefined) {
        return parsePushOpenIntent({ ...input, result: "task_updated" });
      }

      if (task === undefined) {
        return parsePushOpenIntent({ ...input, result: "task_missing" });
      }

      if (task.status === "resolved") {
        return parsePushOpenIntent({ ...input, result: "task_resolved" });
      }

      if (task.activeKey !== input.taskActiveKey) {
        return parsePushOpenIntent({ ...input, result: "task_updated" });
      }

      return parsePushOpenIntent({ ...input, result: "current_task" });
    });
  }

  function loadOfflineCacheStatus(): Promise<OfflineCacheStatus> {
    if (offlineCacheStatus !== undefined) {
      return Promise.resolve(
        parseOfflineCacheStatus({
          ...offlineCacheStatus,
          state: deriveOfflineCacheState({
            activeTaskCount: offlineCacheStatus.activeTaskCount,
            requiredLotSnippetCount: offlineCacheStatus.requiredLotSnippetCount,
            ...(offlineCacheStatus.lastRefreshedAt === undefined
              ? {}
              : { lastRefreshedAt: offlineCacheStatus.lastRefreshedAt }),
            staleAfterHours: offlineCacheStatus.staleAfterHours,
            referenceTime: dependencies.clock(),
            isConnected: true,
          }),
          updatedAt: dependencies.clock(),
        }),
      );
    }

    return Promise.resolve(
      parseOfflineCacheStatus({
        state: "offline_unavailable",
        activeTaskCount: 0,
        requiredLotSnippetCount: 0,
        staleAfterHours: OFFLINE_CACHE_STALE_AFTER_HOURS,
        source: "startup",
        updatedAt: dependencies.clock(),
      }),
    );
  }

  function queueEvidenceUpload(
    input: QueueEvidenceUploadInput,
  ): Promise<EvidenceUploadQueueRecord> {
    return Promise.resolve().then(() => {
      const existing = evidenceUploads.get(input.localEvidenceId);

      if (existing !== undefined) {
        return existing;
      }

      const now = dependencies.clock();
      const record: EvidenceUploadQueueRecord = {
        ...input,
        state: "waiting_upload",
        createdAt: now,
        updatedAt: now,
        attemptCount: 0,
      };

      evidenceUploads.set(record.localEvidenceId, record);

      return record;
    });
  }

  function listEvidenceUploads(): Promise<readonly EvidenceUploadQueueRecord[]> {
    return Promise.resolve([...evidenceUploads.values()]);
  }

  function markEvidenceUploadAttempt(
    localEvidenceId: string,
    attemptedAt: string,
  ): Promise<EvidenceUploadQueueRecord> {
    return Promise.resolve(
      updateEvidenceUpload(localEvidenceId, (record) => ({
        ...withoutEvidenceUploadError(record),
        state: "uploading",
        updatedAt: attemptedAt,
        attemptCount: record.attemptCount + 1,
      })),
    );
  }

  function applyEvidenceUploadIntent(
    localEvidenceId: string,
    response: Parameters<CaptureRepository["applyEvidenceUploadIntent"]>[1],
    updatedAt: string,
  ): Promise<EvidenceUploadQueueRecord> {
    return Promise.resolve(
      updateEvidenceUpload(localEvidenceId, (record) => ({
        ...record,
        assetId: response.evidence.assetId,
        uploadPath: response.uploadPath,
        state: response.evidence.state === "uploaded" ? "uploaded" : "uploading",
        updatedAt,
        ...(response.evidence.uploadedAt === undefined
          ? {}
          : { uploadedAt: response.evidence.uploadedAt }),
        retentionExpiresAt: response.evidence.retentionExpiresAt,
      })),
    );
  }

  function applyEvidenceUploadAck(
    localEvidenceId: string,
    ack: Parameters<CaptureRepository["applyEvidenceUploadAck"]>[1],
    updatedAt: string,
  ): Promise<EvidenceUploadQueueRecord> {
    return Promise.resolve(
      updateEvidenceUpload(localEvidenceId, (record) => ({
        ...withoutEvidenceUploadError(record),
        assetId: ack.assetId,
        state: "uploaded",
        uploadedAt: ack.uploadedAt,
        retentionExpiresAt: ack.retentionExpiresAt,
        updatedAt,
      })),
    );
  }

  function markEvidenceUploadFailed(
    localEvidenceId: string,
    error: string,
    failedAt: string,
  ): Promise<EvidenceUploadQueueRecord> {
    return Promise.resolve(
      updateEvidenceUpload(localEvidenceId, (record) => ({
        ...record,
        state: "failed",
        lastError: error,
        updatedAt: failedAt,
      })),
    );
  }

  function queueUnsafeShiftClose(
    input: QueueUnsafeShiftCloseInput,
  ): Promise<ShiftCloseOutboxRecord> {
    return Promise.resolve().then(() => {
      const existing = shiftCloseOutbox.get(input.localCloseId);
      if (existing !== undefined) {
        return existing;
      }

      const now = dependencies.clock();
      const record: ShiftCloseOutboxRecord = {
        localCloseId: input.localCloseId,
        request: input.request,
        state: "pending_sync",
        createdAt: now,
        updatedAt: now,
        attemptCount: 0,
      };
      shiftCloseOutbox.set(record.localCloseId, record);
      return record;
    });
  }

  function listShiftCloseOutbox(): Promise<readonly ShiftCloseOutboxRecord[]> {
    return Promise.resolve(
      [...shiftCloseOutbox.values()].sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      ),
    );
  }

  function listSyncQueue(): Promise<SyncQueueSummary> {
    const queueCommands = sortSyncQueueItems(
      [...syncCommands.values()].filter(
        (command) => command.state !== "synced" && command.state !== "discarded",
      ),
    );
    const pendingCentralLotCount =
      dependencies.createCentralLot === undefined
        ? 0
        : [...lots.values()].filter(
            (lot) => lot.centralSyncState === "pending_central" || lot.centralSyncState === "local",
          ).length;
    const pendingCentralObservationCount = [...lots.values()].filter(
      (lot) =>
        latestPendingCentralObservationForLot(lot, observations.get(lot.id) ?? []) !== undefined,
    ).length;
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
    const totalCount = summaries.length + pendingCentralLotCount + pendingCentralObservationCount;

    return Promise.resolve(
      parseSyncQueueSummary({
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
          pendingCentralLotCount +
          pendingCentralObservationCount,
        lowCount: queueCommands.filter((command) => command.urgency === "low").length,
        ...(oldestPendingCritical === undefined ? {} : { oldestPendingCritical }),
        commands: summaries,
        updatedAt: dependencies.clock(),
      }),
    );
  }

  function saveOfflineAction(input: OfflineActionCommand): Promise<SyncCommandRecord> {
    return Promise.resolve().then(() => {
      const action = parseOfflineActionCommand(input);
      const snapshot = snapshotForOfflineAction(action);
      const existing = [...syncCommands.values()].find(
        (command) => command.idempotencyKey === snapshot.idempotencyKey,
      );

      if (existing !== undefined) {
        return existing;
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

      syncCommands.set(command.id, command);
      appendLocalAuditEventForCommand(command, "pending_ack");
      attachSyncMetadata(command);

      return command;
    });
  }

  function markSyncCommandAttempt(
    commandIds: readonly string[],
    attemptedAt: string,
  ): Promise<readonly SyncCommandRecord[]> {
    return Promise.resolve(
      commandIds.map((commandId) => {
        const existing = requireSyncCommand(commandId);
        const updated = parseSyncCommandRecord({
          ...existing,
          state: "syncing",
          updatedAt: attemptedAt,
          firstAttemptedAt: existing.firstAttemptedAt ?? attemptedAt,
          lastAttemptedAt: attemptedAt,
          attemptCount: existing.attemptCount + 1,
        });

        syncCommands.set(updated.id, updated);
        attachSyncMetadata(updated);

        return updated;
      }),
    );
  }

  function applySyncTransportResult(result: SyncTransportResult): Promise<SyncCommandRecord> {
    return Promise.resolve().then(() => {
      const parsed = parseSyncTransportResult(result);
      const existing = requireSyncCommand(parsed.commandId);
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
            })
          : parsed.status === "retry"
            ? parseSyncCommandRecord({
                ...existing,
                state: "sync_failed",
                updatedAt,
                lastError: parsed.error,
                nextRetryAt:
                  parsed.retryAfterSeconds === undefined
                    ? undefined
                    : new Date(
                        Date.parse(updatedAt) + parsed.retryAfterSeconds * 1000,
                      ).toISOString(),
              })
            : parseSyncCommandRecord({
                ...existing,
                state: "sync_conflict",
                updatedAt,
                conflictId: parsed.conflict.id,
              });

      if (parsed.status === "conflict") {
        syncConflicts.set(parsed.conflict.id, parseSyncConflictRecord(parsed.conflict));
      }

      syncCommands.set(updated.id, updated);
      reconcileLocalAuditEventForSyncResult(parsed, updated);
      applyCentralSyncApplicationResult(parsed, updated);
      attachSyncMetadata(updated);

      return updated;
    });
  }

  function resolveSyncConflict(input: ResolveSyncConflictInput): Promise<SyncConflictRecord> {
    return Promise.resolve().then(() => {
      const existing = syncConflicts.get(parseLotId(input.conflictId));

      if (existing === undefined) {
        throw new Error(`Cannot resolve an unknown sync conflict: ${input.conflictId}`);
      }

      const resolved = parseSyncConflictRecord({
        ...existing,
        resolvedAt: input.resolvedAt,
        resolutionAction: input.action,
        ...(input.reason === undefined ? {} : { resolutionReason: input.reason }),
      });
      const command = requireSyncCommand(existing.commandId);
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

      syncConflicts.set(resolved.id, resolved);
      syncCommands.set(updatedCommand.id, updatedCommand);
      appendConflictResolutionAuditEvent(resolved, updatedCommand);
      attachSyncMetadata(updatedCommand);

      return resolved;
    });
  }

  function loadSyncConflict(conflictId: string): Promise<SyncConflictRecord | null> {
    return Promise.resolve(syncConflicts.get(parseLotId(conflictId)) ?? null);
  }

  function listAuditTimeline(input: {
    targetType: AuditTimelineItem["target"]["type"];
    targetId: string;
    limit?: number;
  }): Promise<readonly AuditTimelineItem[]> {
    const limit = input.limit ?? 25;

    return Promise.resolve(
      [...localAuditEvents.values()]
        .filter(
          (event) => event.target.type === input.targetType && event.target.id === input.targetId,
        )
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .slice(0, limit)
        .map(({ idempotencyKey: _idempotencyKey, ...event }) => {
          void _idempotencyKey;

          return event;
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

  function centralProductToLocal(product: CentralProductSnippet): CaptureProductRecord {
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
      reviewStatus:
        product.status === "draft"
          ? "pending_review"
          : product.status === "rejected"
            ? "rejected"
            : product.status === "archived"
              ? "discarded"
              : "validated",
      centralSyncState: product.state,
    };
  }

  async function centralProductForPendingLot(
    product: CaptureProductRecord,
  ): Promise<CaptureProductRecord | undefined> {
    if (!isPendingCentralProduct(product) && product.centralProductId !== undefined) {
      return product;
    }

    const lookupIdentifiers = requestIdentifiers({
      ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
      identifiers: product.identifiers?.map((identifier) => ({
        type: identifier.type,
        value: identifier.value,
      })),
    });
    const reusableLocalProducts = [...products.values()].filter(
      (candidate) =>
        !isPendingCentralProduct(candidate) && candidate.centralProductId !== undefined,
    );
    const localCentralProduct =
      reusableLocalProducts.find(
        (candidate) =>
          candidate.id === product.centralProductId ||
          candidate.centralProductId === product.centralProductId,
      ) ??
      reusableLocalProducts.find((candidate) =>
        productHasAnyIdentifier(localProductToCatalogItem(candidate), lookupIdentifiers),
      ) ??
      reusableLocalProducts.find(
        (candidate) =>
          candidate.normalizedName === product.normalizedName &&
          candidate.categoryId === product.categoryId,
      ) ??
      reusableLocalProducts.find(
        (candidate) => candidate.normalizedName === product.normalizedName,
      );

    if (localCentralProduct !== undefined) {
      return localCentralProduct;
    }

    const response = await searchCentralProducts(
      productSearchRequestForPendingLot(product, { includeCategory: true }),
    );
    const reusableProduct =
      reusableCentralProductForPendingLot(product, response) ??
      (await searchReusableCentralProductWithoutCategory(product));

    return reusableProduct === undefined
      ? centralProductIdFallbackForPendingLot(product)
      : productCatalogItemToLocalRecord(reusableProduct);
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
      productSearchRequestForPendingLot(product, { includeCategory: false }),
    );

    return reusableCentralProductForPendingLot(product, response);
  }

  function productSearchRequestForPendingLot(
    product: CaptureProductRecord,
    options: { includeCategory: boolean },
  ): ProductSearchRequest {
    const identifier = product.identifiers?.[0];

    return parseProductSearchRequest({
      query: product.displayName,
      ...(options.includeCategory ? { categoryId: product.categoryId } : {}),
      requestedAt: dependencies.clock(),
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
    const lookupIdentifiers = requestIdentifiers({
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

  function localProductToCatalogItem(product: CaptureProductRecord): ProductCatalogItem {
    return {
      centralProductId: product.centralProductId ?? product.id,
      displayName: product.displayName,
      normalizedKey: product.normalizedName,
      categoryId: product.categoryId,
      categoryName: product.categoryName ?? product.categoryId,
      categoryRuleProfile: product.categoryRuleProfile,
      source: product.catalogSource === "draft_pending_review" ? "draft_pending_review" : "central",
      reviewStatus: product.reviewStatus ?? "validated",
      syncState: product.centralSyncState ?? "synchronized",
      updatedAt: product.createdAt,
      ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
      ...(product.identifiers === undefined ? {} : { identifiers: [...product.identifiers] }),
    };
  }

  function productSearchCandidate(
    product: ProductCatalogItem,
    matchKind: ProductSearchCandidate["matchKind"],
    matchReasons?: ProductSearchCandidate["matchReasons"],
  ): ProductSearchCandidate {
    return {
      ...product,
      matchKind,
      matchReasons:
        matchReasons ??
        (matchKind === "similar_candidate" ? ["similar_name"] : ["exact_normalized_name"]),
      ...(matchKind === "similar_candidate"
        ? { warning: "Produto parecido encontrado. Reutilize se for o mesmo item." }
        : {}),
    };
  }

  function isSimilarProduct(productKey: string, requestedKey: string | undefined): boolean {
    if (requestedKey === undefined) return false;
    const tokens = requestedKey.split(" ").filter((token) => token.length >= 3);

    return tokens.some((token) => productKey.includes(token));
  }

  function normalizeIdentifierValue(value: string): string {
    return value.trim().replace(/\s+/g, "").toLocaleLowerCase("pt-BR").slice(0, 160);
  }

  function requestIdentifiers(request: {
    gtin?: string | undefined;
    identifier?: ProductIdentifierInput | undefined;
    identifiers?: readonly ProductIdentifierInput[] | undefined;
  }): ProductIdentifierInput[] {
    const identifiers = new Map<string, ProductIdentifierInput>();

    if (request.gtin !== undefined) {
      identifiers.set(`gtin:${normalizeIdentifierValue(request.gtin)}`, {
        type: "gtin",
        value: request.gtin,
      });
    }

    if (request.identifier !== undefined) {
      identifiers.set(
        `${request.identifier.type}:${normalizeIdentifierValue(request.identifier.value)}`,
        request.identifier,
      );
    }

    for (const identifier of request.identifiers ?? []) {
      identifiers.set(
        `${identifier.type}:${normalizeIdentifierValue(identifier.value)}`,
        identifier,
      );
    }

    return [...identifiers.values()];
  }

  function requestIdentifiersForLocal(request: {
    gtin?: string | undefined;
    identifiers?: readonly ProductIdentifierInput[] | undefined;
  }): ProductIdentifier[] {
    return requestIdentifiers(request).map((identifier, index) => ({
      ...identifier,
      normalizedValue: normalizeIdentifierValue(identifier.value),
      source: index === 0 && identifier.type === "gtin" ? "central" : "scan",
      isPrimary: index === 0,
    }));
  }

  function productHasIdentifier(
    product: Pick<ProductCatalogItem, "gtin" | "identifiers">,
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
    product: Pick<ProductCatalogItem, "gtin" | "identifiers">,
    identifiers: readonly ProductIdentifierInput[],
  ): boolean {
    return identifiers.some((identifier) => productHasIdentifier(product, identifier));
  }

  function exactMatchReasons(
    product: ProductCatalogItem,
    normalizedQuery: string | undefined,
    gtin: string | undefined,
    identifiers: readonly ProductIdentifierInput[],
  ): ProductSearchCandidate["matchReasons"] {
    const reasons: ProductSearchCandidate["matchReasons"] = [];

    if (normalizedQuery !== undefined && product.normalizedKey === normalizedQuery) {
      reasons.push("exact_normalized_name");
    }
    if (gtin !== undefined && product.gtin === gtin) {
      reasons.push("exact_gtin");
    }
    if (productHasAnyIdentifier(product, identifiers)) {
      reasons.push("exact_identifier");
    }

    return reasons.length === 0 ? ["exact_normalized_name"] : reasons;
  }

  function mergeProductIdentifiers(
    product: CaptureProductRecord,
    identifiers: readonly ProductIdentifierInput[],
  ): CaptureProductRecord {
    const current = [...(product.identifiers ?? [])];
    const seen = new Set(
      current.map(
        (identifier) => `${identifier.type}:${normalizeIdentifierValue(identifier.value)}`,
      ),
    );

    for (const identifier of identifiers) {
      const key = `${identifier.type}:${normalizeIdentifierValue(identifier.value)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      current.push({
        ...identifier,
        normalizedValue: normalizeIdentifierValue(identifier.value),
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

  function productDraftToLocalRecordToDraft(
    record: CaptureProductRecord,
    similarCandidates: readonly ProductSearchCandidate[],
  ): ProductDraftReviewState {
    return {
      draftId: record.draftId ?? record.id,
      centralProductId: record.centralProductId ?? record.id,
      displayName: record.displayName,
      normalizedKey: record.normalizedName,
      categoryId: record.categoryId,
      categoryName: record.categoryName ?? record.categoryId,
      categoryRuleProfile: record.categoryRuleProfile,
      source: "draft_pending_review",
      reviewStatus: "pending_review",
      syncState: "pending_central",
      requestedByLabel: "Este aparelho",
      requestedAt: record.createdAt,
      similarCandidates: [...similarCandidates],
      ...(record.gtin === undefined ? {} : { gtin: record.gtin }),
      ...(record.identifiers === undefined ? {} : { identifiers: [...record.identifiers] }),
    };
  }

  function centralLotToLocal(
    lot: CentralLotSnippet,
    resolvedHistory?: ResolvedTaskHistorySnippet,
  ): CaptureLotSnapshot {
    const observationStatus = centralReadObservationStatus(lot, resolvedHistory);
    const observation: CaptureObservationRecord = {
      id: centralObservationIdFor(lot.centralLotId),
      lotId: lot.centralLotId,
      status: observationStatus,
      actorLabel: resolvedHistory?.actorLabel ?? "Leitura central",
      occurredAt: resolvedHistory?.resolvedAt ?? lot.updatedAt,
      location: centralReadObservationLocation(observationStatus, lot.currentLocation),
      isCorrection: false,
      ...(lot.approximateQuantity === undefined
        ? { quantityState: "not_estimable" as const }
        : { quantityState: "estimated" as const, approximateQuantity: lot.approximateQuantity }),
    };
    const centralSyncState = resolvedHistory === undefined ? lot.state : "resolved";

    return {
      ...centralLotInput(lot),
      id: lot.centralLotId,
      productDisplayName: lot.productDisplayName,
      currentObservation: observation,
      centralLotId: lot.centralLotId,
      centralSyncState,
      centralSource: lot.source,
      centralAcknowledgementMessage:
        resolvedHistory !== undefined
          ? `Resolvido na central por ${resolvedHistory.actorLabel}. O lote segue nos recentes como historico.`
          : lot.state === "synchronized"
            ? "Sincronizado com a central. Outro aparelho ve este lote apos preparar turno."
            : "Leitura central armazenada neste aparelho.",
    };
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
        ...(lot.qualityWindowDays === undefined
          ? {}
          : { qualityWindowDays: lot.qualityWindowDays }),
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
      ...(lot.receivedAt === undefined ? {} : { receivedAt: lot.receivedAt }),
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

  function centralLotInputForReplay(
    lot: CaptureLotSnapshot,
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
        ...(lot.qualityWindowDays === undefined
          ? {}
          : { qualityWindowDays: lot.qualityWindowDays }),
      });
    }

    return parseLotInput({
      ...base,
      mode: lot.mode,
      receivedAt: lot.receivedAt,
    });
  }

  function centralLotInput(lot: CentralLotSnippet): CaptureLotInput {
    const base = {
      productId: lot.centralProductId,
      identity: lot.lotIdentity,
      approximateQuantity: lot.approximateQuantity ?? 0,
      initialLocation: lot.currentLocation,
    };

    if (lot.mode === "formal_validity" || lot.mode === "processed_repack_loss") {
      return {
        ...base,
        mode: lot.mode,
        expiresAt: lot.expiresAt ?? lot.updatedAt.slice(0, 10),
        ...(lot.receivedAt === undefined ? {} : { receivedAt: lot.receivedAt }),
      };
    }

    if (lot.mode === "flv_inspection") {
      return {
        ...base,
        mode: "flv_inspection",
        receivedAt: lot.receivedAt ?? lot.updatedAt.slice(0, 10),
        qualityInspectionDueAt: lot.qualityInspectionDueAt ?? lot.updatedAt.slice(0, 10),
      };
    }

    return {
      ...base,
      mode: "receiving_monitored",
      receivedAt: lot.receivedAt ?? lot.updatedAt.slice(0, 10),
    };
  }

  function centralActiveTaskToLocal(
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
      lot.centralSyncState === "resolved" ||
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
    return (
      prepareTurnCacheStatus?.state === "ready" &&
      prepareTurnCacheStatus.source === "central" &&
      lot.centralSource === "central" &&
      (lot.centralSyncState === "synchronized" || lot.centralSyncState === "resolved")
    );
  }

  function hasActiveSyncedTaskForLot(lotId: string): boolean {
    return [...todayTasks.values()].some(
      (task) => task.status === "active" && task.lotId === lotId && task.sync?.state === "synced",
    );
  }

  function resolveActiveLotTasksExcept(centralTask: TodayTaskRecord, resolvedAt: string): void {
    for (const [taskId, task] of todayTasks) {
      if (
        task.status !== "active" ||
        task.lotId !== centralTask.lotId ||
        task.id === centralTask.id
      ) {
        continue;
      }

      todayTasks.set(
        taskId,
        parseTodayTaskRecord({
          ...task,
          status: "resolved",
          resolvedAt,
          updatedAt: resolvedAt,
        }),
      );
    }
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
    return `central-observation:${centralLotId.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 90)}`;
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

  function centralObservationAppendIdempotencyKey(
    centralLotId: string,
    observation: CaptureObservationRecord,
  ): string {
    const readable = [
      "mobile-observation",
      safeLocalIdentifier(centralLotId, 48),
      observation.status,
      safeLocalIdentifier(observation.occurredAt, 32),
      safeLocalIdentifier(observation.actorLabel, 24),
    ].join(":");

    if (readable.length <= 120) {
      return readable;
    }

    return [
      "mobile-observation",
      safeLocalIdentifier(centralLotId, 30),
      observation.status,
      stableIdentifierHash(readable),
    ].join(":");
  }

  function snapshotForOfflineAction(action: OfflineActionCommand): {
    idempotencyKey: string;
    task: TodayTaskRecord;
    taskAction?: TaskResolutionCommand["action"];
  } {
    if (action.kind === "resolve_task") {
      const task = requireTodayTask(action.payload.taskId);

      return {
        idempotencyKey: `${action.kind}:${action.payload.taskId}:${action.payload.action}:${action.payload.occurredAt}`,
        task,
        taskAction: action.payload.action,
      };
    }

    if (action.kind === "request_markdown") {
      const task =
        action.payload.sourceTaskId === undefined
          ? findTaskForLot(action.payload.lotId)
          : requireTodayTask(action.payload.sourceTaskId);

      return {
        idempotencyKey: `${action.kind}:${action.payload.lotId}:${action.payload.sourceTaskId ?? "lot"}:${action.payload.occurredAt}`,
        task,
      };
    }

    const task = requireTodayTask(action.payload.taskId);

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

  function updateEvidenceUpload(
    localEvidenceId: string,
    update: (record: EvidenceUploadQueueRecord) => EvidenceUploadQueueRecord,
  ): EvidenceUploadQueueRecord {
    const existing = evidenceUploads.get(localEvidenceId);

    if (existing === undefined) {
      throw new Error(`Cannot update unknown evidence upload: ${localEvidenceId}`);
    }

    const updated = update(existing);
    evidenceUploads.set(updated.localEvidenceId, updated);

    return updated;
  }

  function withoutEvidenceUploadError(
    record: EvidenceUploadQueueRecord,
  ): Omit<EvidenceUploadQueueRecord, "lastError"> {
    const { lastError: _lastError, ...rest } = record;
    void _lastError;

    return rest;
  }

  function findTaskForLot(lotId: string): TodayTaskRecord {
    const task = [...todayTasks.values()].find(
      (candidate) => candidate.lotId === lotId && candidate.status === "active",
    );

    if (task !== undefined) {
      return task;
    }

    const lot = lots.get(lotId);

    if (lot === undefined) {
      throw new Error(`Cannot save an offline action for an unknown lot: ${lotId}`);
    }

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
      createdAt: dependencies.clock(),
      updatedAt: dependencies.clock(),
    });
  }

  function requireTodayTask(taskId: string): TodayTaskRecord {
    const task = todayTasks.get(parseLotId(taskId));

    if (task === undefined) {
      throw new Error(`Cannot save an offline action for an unknown Today task: ${taskId}`);
    }

    return task;
  }

  function requireSyncCommand(commandId: string): SyncCommandRecord {
    const command = syncCommands.get(parseLotId(commandId));

    if (command === undefined) {
      throw new Error(`Cannot load an unknown sync command: ${commandId}`);
    }

    return command;
  }

  function appendLocalAuditEventForCommand(
    command: SyncCommandRecord,
    status: AuditTimelineItem["status"],
  ): void {
    if (localAuditEvents.has(command.idempotencyKey)) {
      return;
    }

    const occurredAt = command.payload.payload.occurredAt;
    const actorLabel = command.payload.payload.actorLabel;
    const event = parseAuditTimelineItem({
      eventId: `local-audit:${command.id}`,
      type: auditEventTypeForCommand(command),
      store: {
        storeId: "local-device",
        storeName: "Loja ficticia deste aparelho",
      },
      actor: {
        actorId: actorLabel,
        displayName: actorLabel,
        roleSnapshot: "collaborator",
      },
      target: {
        type: auditTargetTypeForCommand(command),
        id: auditTargetIdForCommand(command),
        label: `${command.productDisplayName} - lote ${command.lotIdentity.value}`,
      },
      occurredAt,
      summary: auditSummaryForCommand(command),
      status,
      metadata: {
        producerKind: auditProducerKindForCommand(command),
        commandKind: command.kind,
        productDisplayName: command.productDisplayName,
        lotCode: command.lotIdentity.value,
      },
    });

    localAuditEvents.set(command.idempotencyKey, {
      ...event,
      idempotencyKey: command.idempotencyKey,
    });
  }

  function reconcileLocalAuditEventForSyncResult(
    result: SyncTransportResult,
    command: SyncCommandRecord,
  ): void {
    const existing = localAuditEvents.get(result.idempotencyKey);

    if (existing === undefined) {
      appendLocalAuditEventForCommand(
        command,
        result.status === "ack"
          ? "received"
          : result.status === "conflict"
            ? "conflict"
            : "pending_ack",
      );
      return;
    }

    const { idempotencyKey, ...existingEvent } = existing;
    const updated = parseAuditTimelineItem({
      ...existingEvent,
      status:
        result.status === "ack"
          ? "received"
          : result.status === "conflict"
            ? "conflict"
            : "pending_ack",
      ...(result.status === "ack" ? { receivedAt: result.syncedAt } : {}),
      ...(result.status === "retry" ? { reason: result.error } : {}),
    });

    localAuditEvents.set(result.idempotencyKey, {
      ...updated,
      idempotencyKey,
    });
  }

  function appendConflictResolutionAuditEvent(
    conflict: SyncConflictRecord,
    command: SyncCommandRecord,
  ): void {
    const original = localAuditEvents.get(command.idempotencyKey);
    const resolutionKey = `sync-discard:${conflict.id}:${conflict.resolvedAt ?? dependencies.clock()}`;

    if (localAuditEvents.has(resolutionKey)) {
      return;
    }

    const event = parseAuditTimelineItem({
      eventId: `local-audit:${resolutionKey}`,
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
      occurredAt: conflict.resolvedAt ?? dependencies.clock(),
      summary:
        conflict.resolutionAction === "discard_offline_action"
          ? "Acao offline descartada com motivo."
          : "Conflito de sincronizacao revisado.",
      reason: conflict.resolutionReason ?? conflict.reason,
      status: command.state === "discarded" ? "invalidated" : "pending_ack",
      ...(original === undefined ? {} : { linkedEventId: original.eventId }),
      metadata: {
        producerKind: "sync.discard",
        commandKind: command.kind,
      },
    });

    localAuditEvents.set(resolutionKey, { ...event, idempotencyKey: resolutionKey });
  }

  function applyCentralSyncApplicationResult(
    result: SyncTransportResult,
    command: SyncCommandRecord,
  ): void {
    if (result.status !== "ack" || result.centralResult === undefined) {
      return;
    }

    if (result.centralResult.kind === "active_task") {
      todayTasks.set(result.centralResult.task.id, result.centralResult.task);
      return;
    }

    if (result.centralResult.kind !== "resolved_history") {
      return;
    }

    const task = todayTasks.get(command.taskId);
    if (task === undefined) {
      return;
    }

    todayTasks.set(
      task.id,
      resolvedTaskFromCentralHistory(task, result.centralResult.history, result.syncedAt),
    );
    markLotResolvedFromCentralHistory(task.lotId, result.centralResult.history);
  }

  function markLotResolvedFromCentralHistory(
    lotId: string,
    history: CentralResolvedTaskHistory,
  ): void {
    const lot = lots.get(lotId);
    if (lot === undefined) {
      return;
    }

    const lotWithoutTaskProjection = { ...lot };
    delete lotWithoutTaskProjection.taskProjection;
    lots.set(lotId, {
      ...lotWithoutTaskProjection,
      centralSyncState: "resolved",
      centralAcknowledgementMessage: `Resolvido na central por ${history.actorLabel}. O lote segue nos recentes como historico.`,
    });
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

  function attachSyncMetadata(command: SyncCommandRecord): void {
    const task = todayTasks.get(command.taskId);

    if (task === undefined) {
      return;
    }

    const syncedState =
      command.state === "synced"
        ? {
            state: command.state,
            savedAt: command.savedAt,
            lastSyncedAt: command.ackedAt ?? command.updatedAt,
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

    todayTasks.set(
      task.id,
      parseTodayTaskRecord({
        ...task,
        sync: syncedState,
        updatedAt: command.updatedAt,
      }),
    );
  }
}

function auditEventTypeForCommand(command: SyncCommandRecord): AuditTimelineItem["type"] {
  if (command.kind === "resolve_task") {
    return "task.changed";
  }

  if (
    command.kind === "request_markdown" ||
    command.kind === "decide_markdown" ||
    command.kind === "record_markdown_application" ||
    command.kind === "confirm_markdown_on_shelf"
  ) {
    return "markdown.changed";
  }

  return "sync.changed";
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

function isActiveTask(task: TodayTaskRecord): boolean {
  return task.status === "active";
}

function isActiveMarkdownWorkflow(workflow: MarkdownWorkflowRecord): boolean {
  return workflow.status !== "rejected" && workflow.status !== "shelf_confirmed";
}
