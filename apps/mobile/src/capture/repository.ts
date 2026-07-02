import {
  AlertDeliveryResultSchema,
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  CentralLotCreateRequestSchema,
  CentralObservationAppendRequestSchema,
  CentralLotTaskProjectionSummarySchema,
  CentralLotWriteResponseSchema,
  DevicePushRegistrationCommandSchema,
  MarkdownApplicationCommandSchema,
  MarkdownApprovalCommandSchema,
  MarkdownRequestCommandSchema,
  MarkdownShelfConfirmationCommandSchema,
  MarkdownWorkflowRecordSchema,
  OfflineActionCommandSchema,
  OnboardingProgressMutationRequestSchema,
  OfflineCacheStatusSchema,
  PhysicalObservationInputSchema,
  PrepareTurnCacheStatusSchema,
  PrepareTurnResponseSchema,
  ProductDraftCreateRequestSchema,
  ProductSearchRequestSchema,
  PushOpenIntentSchema,
  SyncCommandRecordSchema,
  SyncConflictRecordSchema,
  SyncQueueSummarySchema,
  SyncTransportResultSchema,
  TaskAlertStateRecordSchema,
  AuditTimelineItemSchema,
  type AuditTimelineItem,
  type CaptureLotInput,
  type CaptureProductInput,
  type AlertDeliveryResult,
  type CentralCategoryCatalogItem,
  type CentralCategoryCatalogResponse,
  type CentralLotCreateRequest,
  type CentralObservationAppendRequest,
  type CentralLotTaskProjectionSummary,
  type CentralLotWriteResponse,
  type CentralPackageSource,
  type DevicePushRegistrationCommand,
  type EvidenceTarget,
  type EvidenceUploadAck,
  type EvidenceUploadIntentRequest,
  type EvidenceUploadIntentResponse,
  type EvidenceUploadState,
  type FutureAttentionRecord,
  type MarkdownApplicationCommand,
  type MarkdownApprovalCommand,
  type MarkdownRequestCommand,
  type MarkdownShelfConfirmationCommand,
  type MarkdownWorkflowRecord,
  type OfflineActionCommand,
  type OnboardingFlowId,
  type OnboardingProgressMutationRequest,
  type OnboardingProgressMutationStatus,
  type OnboardingVersion,
  type OfflineCacheStatus,
  type OperationalLocation,
  type PhysicalObservationInput,
  type PrepareTurnCacheStatus,
  type PrepareTurnResponse,
  type ProductCatalogItem,
  type ProductDraftCreateRequest,
  type ProductDraftCreateResponse,
  type ProductDraftReviewState,
  type ProductIdentifier,
  type ProductSearchRequest,
  type ProductSearchResponse,
  type PushOpenIntent,
  type ResolvedTaskHistorySnippet,
  type SyncCommandRecord,
  type SyncConflictRecord,
  type SyncQueueSummary,
  type SyncTransportResult,
  type ShiftCloseUnsafeRequest,
  type TaskAlertStateRecord,
  type TaskRefreshMetadata,
  TaskResolutionCommandSchema,
  TodayTaskRecordSchema,
  type VisibleCentralSyncState,
  type TaskResolutionCommand,
  type TodayTaskRecord,
} from "@validade-zero/contracts";
import {
  calculateLotRisk,
  canStartMarkdownWorkflow,
  compareTodayTaskPriority,
  deriveMarkdownStageTaskCandidate,
  deriveFutureAttentionCandidate,
  deriveTodayTaskCandidate,
  getNextAlertAction,
  type AlertChannelState,
  type CategoryRuleProfile,
  type ProductRuleOverride,
  type RiskCalculationLot,
  type RiskAssessment,
  type RiskWindows,
  type MarkdownRequestReason,
  type SyncConflictResolutionAction,
} from "@validade-zero/domain";

export interface CaptureRepositoryDependencies {
  clock: () => string;
  createId: () => string;
  listCentralCategories?: () => Promise<CentralCategoryCatalogResponse>;
  searchCentralProducts?: (request: ProductSearchRequest) => Promise<ProductSearchResponse>;
  createProductDraft?: (request: ProductDraftCreateRequest) => Promise<ProductDraftCreateResponse>;
  createCentralLot?: (request: CentralLotCreateRequest) => Promise<CentralLotWriteResponse>;
  appendCentralObservation?: (
    centralLotId: string,
    request: CentralObservationAppendRequest,
  ) => Promise<CentralLotWriteResponse>;
}

export const MOBILE_FIRST_TURN_ONBOARDING = {
  flowId: "mobile_first_turn",
  version: "first_turn_assist_v1",
} as const satisfies {
  flowId: OnboardingFlowId;
  version: OnboardingVersion;
};

export type CaptureProductRecord = CaptureProductInput & {
  id: string;
  normalizedName: string;
  createdAt: string;
  centralProductId?: string;
  catalogSource?: "central" | "draft_pending_review" | "local";
  reviewStatus?: "validated" | "pending_review" | "rejected" | "discarded";
  centralSyncState?:
    | "local"
    | "pending_central"
    | "synchronized"
    | "conflict"
    | "discarded"
    | "resolved";
  draftId?: string;
  categoryName?: string;
  draftReviewMessage?: string;
  similarCandidateCount?: number;
  identifiers?: readonly ProductIdentifier[];
};

export interface CaptureProductCategory {
  categoryId: string;
  categoryName: string;
  categoryRuleProfile: CaptureProductInput["categoryRuleProfile"];
  productCount: number;
}

export type CaptureObservationRecord = PhysicalObservationInput & {
  id: string;
  lotId: string;
};

export type CaptureLotSnapshot = CaptureLotInput & {
  id: string;
  productDisplayName: string;
  currentObservation: CaptureObservationRecord;
  centralLotId?: string;
  centralSyncState?: VisibleCentralSyncState;
  centralSource?: CentralPackageSource;
  taskProjection?: CentralLotTaskProjectionSummary;
  centralAcknowledgementMessage?: string;
};

export function isPendingCentralProduct(product: CaptureProductRecord): boolean {
  return (
    product.catalogSource === "draft_pending_review" ||
    product.reviewStatus === "pending_review" ||
    product.centralSyncState === "pending_central"
  );
}

export interface LocalLotCentralSyncMetadata {
  centralSyncState: VisibleCentralSyncState;
  centralSource: CentralPackageSource;
  centralAcknowledgementMessage: string;
}

export function localLotCentralSyncMetadata(
  product: CaptureProductRecord,
): LocalLotCentralSyncMetadata {
  if (isPendingCentralProduct(product)) {
    return {
      centralSyncState: "pending_central",
      centralSource: "pending_central",
      centralAcknowledgementMessage:
        "Cadastro do produto em revisao. Lote salvo neste aparelho e pendente da validacao central.",
    };
  }

  return {
    centralSyncState: "local",
    centralSource: "local_cache",
    centralAcknowledgementMessage:
      "Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.",
  };
}

export type PendingCentralLotSyncBlocker =
  | "central_read_required"
  | "central_write_unavailable"
  | "central_product_not_ready"
  | "central_lot_auth_required"
  | "central_lot_network_unavailable"
  | "central_lot_local_replay_failed"
  | "central_lot_write_failed";

export class PendingCentralLotSyncError extends Error {
  readonly blocker: PendingCentralLotSyncBlocker;

  constructor(blocker: PendingCentralLotSyncBlocker, message = blocker, options?: ErrorOptions) {
    super(message, options);
    this.name = "PendingCentralLotSyncError";
    this.blocker = blocker;
  }
}

export function isPendingCentralLotSyncError(error: unknown): error is PendingCentralLotSyncError {
  return (
    error instanceof PendingCentralLotSyncError ||
    (typeof error === "object" &&
      error !== null &&
      (error as { name?: unknown }).name === "PendingCentralLotSyncError" &&
      typeof (error as { blocker?: unknown }).blocker === "string")
  );
}

export function pendingCentralLotWriteBlocker(error: unknown): PendingCentralLotSyncBlocker {
  const code =
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;
  const message = error instanceof Error ? error.message : String(error);

  if (code === "session_expired" || code === "no_permission") {
    return "central_lot_auth_required";
  }

  if (message === "central_product_not_found") {
    return "central_product_not_ready";
  }

  if (
    message === "invalid_central_lot_request" ||
    message.includes("CentralLotCreateRequest") ||
    message.includes("ZodError")
  ) {
    return "central_lot_local_replay_failed";
  }

  if (code === "network" || /network|fetch/i.test(message)) {
    return "central_lot_network_unavailable";
  }

  if (message === "central_lot_unavailable") {
    return "central_lot_write_failed";
  }

  return "central_lot_write_failed";
}

export function shouldFallbackToLocalCentralWrite(error: unknown): boolean {
  return pendingCentralLotWriteBlocker(error) === "central_lot_network_unavailable";
}

export type CaptureLotDetail = CaptureLotSnapshot & {
  product: CaptureProductRecord;
  observations: readonly CaptureObservationRecord[];
};

export interface SaveLotInput {
  lot: CaptureLotInput;
  actorLabel: string;
}

export interface RecentLotsQuery {
  query?: string;
  location?: OperationalLocation;
  limit?: number;
}

export type TodayTaskRefreshSource =
  | "today_open"
  | "manual_refresh"
  | "lot_change"
  | "observation_change";

export interface RefreshTodayTasksInput {
  currentDate: string;
  currentTimestamp: string;
  source: TodayTaskRefreshSource;
}

export interface TodayTaskRefreshResult {
  metadata: TaskRefreshMetadata;
  tasks: readonly TodayTaskRecord[];
  futureAttention: readonly FutureAttentionRecord[];
}

export interface RefreshTaskAlertStatesInput {
  referenceTime: string;
  isWithinShift?: boolean;
  allowOffShiftCriticalAlerts?: boolean;
  overdueTaskIds?: readonly string[];
}

export interface RecordAlertAttemptInput {
  attemptId: string;
  taskId: string;
  taskActiveKey: string;
  attemptedAt: string;
  result: AlertDeliveryResult;
}

export interface AcknowledgeEscalationInput {
  taskId: string;
  taskActiveKey: string;
  actorLabel: string;
  acknowledgedAt: string;
}

export interface ResolvePushOpenIntentInput {
  taskId: string;
  taskActiveKey: string;
  openedAt: string;
}

export interface ResolveSyncConflictInput {
  conflictId: string;
  action: SyncConflictResolutionAction;
  resolvedAt: string;
  reason?: string;
}

export interface AuditTimelineQuery {
  targetType: AuditTimelineItem["target"]["type"];
  targetId: string;
  limit?: number;
}

export interface EvidenceUploadQueueRecord {
  localEvidenceId: string;
  taskId: string;
  storeId: string;
  target: EvidenceTarget;
  localUri: string;
  mimeType: EvidenceUploadIntentRequest["mimeType"];
  sizeBytes: number;
  sha256: string;
  capturedAt: string;
  state: EvidenceUploadState;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  assetId?: string;
  uploadPath?: string;
  uploadedAt?: string;
  retentionExpiresAt?: string;
  lastError?: string;
}

export interface QueueEvidenceUploadInput {
  localEvidenceId: string;
  taskId: string;
  storeId: string;
  target: EvidenceTarget;
  localUri: string;
  mimeType: EvidenceUploadIntentRequest["mimeType"];
  sizeBytes: number;
  sha256: string;
  capturedAt: string;
}

export type ShiftCloseOutboxState = "pending_sync" | "syncing" | "synced" | "failed";

export interface ShiftCloseOutboxRecord {
  localCloseId: string;
  request: ShiftCloseUnsafeRequest;
  state: ShiftCloseOutboxState;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  serverClosureId?: string;
  lastError?: string;
}

export interface QueueUnsafeShiftCloseInput {
  localCloseId: string;
  request: ShiftCloseUnsafeRequest;
}

export type MarkdownEntryState =
  | {
      status: "terminal_finalized";
      label: "Finalizado: perda registrada" | "Finalizado: retirado da area";
      lotId: string;
    }
  | {
      status: "withdrawal_required";
      label: "Retirar da area ou registrar perda";
      lotId: string;
    }
  | {
      status: "markdown_unavailable";
      label: "Produto processado da loja: rebaixa indisponivel";
      lotId: string;
      reason: "processed_in_store";
    }
  | {
      status: "presence_required";
      label: "Conferir presenca antes da rebaixa";
      lotId: string;
    }
  | {
      status: "eligible_rule_window";
      label: "Solicitar rebaixa";
      lotId: string;
    }
  | {
      status: "early_exception_available";
      label: "Solicitar rebaixa antecipada";
      lotId: string;
      reasons: readonly Exclude<MarkdownRequestReason, "rule_window">[];
    }
  | {
      status: "already_active";
      label: string;
      lotId: string;
      workflowId: string;
      currentStage: MarkdownWorkflowRecord["currentStage"];
    };

export interface LoadMarkdownEntryStateInput {
  lotId: string;
  currentDate: string;
  currentTimestamp: string;
}

export interface OnboardingProgressKey {
  subjectId: string;
  storeId: string;
  flowId: OnboardingFlowId;
  version: OnboardingVersion;
}

export interface LocalOnboardingProgressRecord extends OnboardingProgressKey {
  status: OnboardingProgressMutationStatus;
  completedAt?: string | undefined;
  skippedAt?: string | undefined;
  updatedAt: string;
}

export type SaveLocalOnboardingProgressInput = OnboardingProgressKey &
  Pick<OnboardingProgressMutationRequest, "status" | "occurredAt">;

export interface CaptureRepository {
  initialize(): Promise<void>;
  getOrCreateDeviceInstallId?: () => Promise<string>;
  hydratePrepareTurn?: (response: PrepareTurnResponse) => Promise<void>;
  loadPrepareTurnCacheStatus?: () => Promise<PrepareTurnCacheStatus | null>;
  loadOnboardingProgress?: (
    key: OnboardingProgressKey,
  ) => Promise<LocalOnboardingProgressRecord | null>;
  saveOnboardingProgress?: (
    input: SaveLocalOnboardingProgressInput,
  ) => Promise<LocalOnboardingProgressRecord>;
  searchCentralProducts?: (request: ProductSearchRequest) => Promise<ProductSearchResponse>;
  createProductDraft?: (request: ProductDraftCreateRequest) => Promise<ProductDraftCreateResponse>;
  createProduct(input: CaptureProductInput): Promise<CaptureProductRecord>;
  findProducts(query: string): Promise<readonly CaptureProductRecord[]>;
  listFrequentProducts?: () => Promise<readonly CaptureProductRecord[]>;
  listProductCategories?: () => Promise<readonly CaptureProductCategory[]>;
  findProductsByCategory?: (categoryId: string) => Promise<readonly CaptureProductRecord[]>;
  saveLot(input: SaveLotInput): Promise<CaptureLotSnapshot>;
  syncPendingCentralLots?: () => Promise<readonly CaptureLotSnapshot[]>;
  appendObservation(
    lotId: string,
    input: PhysicalObservationInput,
  ): Promise<CaptureObservationRecord>;
  listRecentLots(query?: RecentLotsQuery): Promise<readonly CaptureLotSnapshot[]>;
  loadLotDetail(lotId: string): Promise<CaptureLotDetail | null>;
  refreshTodayTasks(input: RefreshTodayTasksInput): Promise<TodayTaskRefreshResult>;
  listActiveTodayTasks(): Promise<readonly TodayTaskRecord[]>;
  listFutureAttention(): Promise<readonly FutureAttentionRecord[]>;
  resolveTodayTask(input: TaskResolutionCommand): Promise<TodayTaskRecord>;
  loadTodayTask(taskId: string): Promise<TodayTaskRecord | null>;
  requestMarkdown(input: MarkdownRequestCommand): Promise<MarkdownWorkflowRecord>;
  decideMarkdown(input: MarkdownApprovalCommand): Promise<MarkdownWorkflowRecord>;
  recordMarkdownApplication(input: MarkdownApplicationCommand): Promise<MarkdownWorkflowRecord>;
  confirmMarkdownOnShelf(input: MarkdownShelfConfirmationCommand): Promise<MarkdownWorkflowRecord>;
  loadMarkdownWorkflowForLot(lotId: string): Promise<MarkdownWorkflowRecord | null>;
  listActiveMarkdownWorkflows(): Promise<readonly MarkdownWorkflowRecord[]>;
  loadMarkdownEntryState(input: LoadMarkdownEntryStateInput): Promise<MarkdownEntryState>;
  registerAlertDevice(input: DevicePushRegistrationCommand): Promise<DevicePushRegistrationCommand>;
  loadAlertChannelState(): Promise<DevicePushRegistrationCommand | null>;
  refreshTaskAlertStates(
    input: RefreshTaskAlertStatesInput,
  ): Promise<readonly TaskAlertStateRecord[]>;
  listTaskAlertStates(): Promise<readonly TaskAlertStateRecord[]>;
  recordAlertAttempt(input: RecordAlertAttemptInput): Promise<TaskAlertStateRecord>;
  acknowledgeEscalation(input: AcknowledgeEscalationInput): Promise<TaskAlertStateRecord>;
  resolvePushOpenIntent(input: ResolvePushOpenIntentInput): Promise<PushOpenIntent>;
  loadOfflineCacheStatus(): Promise<OfflineCacheStatus>;
  queueEvidenceUpload(input: QueueEvidenceUploadInput): Promise<EvidenceUploadQueueRecord>;
  listEvidenceUploads(): Promise<readonly EvidenceUploadQueueRecord[]>;
  markEvidenceUploadAttempt(
    localEvidenceId: string,
    attemptedAt: string,
  ): Promise<EvidenceUploadQueueRecord>;
  applyEvidenceUploadIntent(
    localEvidenceId: string,
    response: EvidenceUploadIntentResponse,
    updatedAt: string,
  ): Promise<EvidenceUploadQueueRecord>;
  applyEvidenceUploadAck(
    localEvidenceId: string,
    ack: EvidenceUploadAck,
    updatedAt: string,
  ): Promise<EvidenceUploadQueueRecord>;
  markEvidenceUploadFailed(
    localEvidenceId: string,
    error: string,
    failedAt: string,
  ): Promise<EvidenceUploadQueueRecord>;
  queueUnsafeShiftClose?: (input: QueueUnsafeShiftCloseInput) => Promise<ShiftCloseOutboxRecord>;
  listShiftCloseOutbox?: () => Promise<readonly ShiftCloseOutboxRecord[]>;
  listSyncQueue(): Promise<SyncQueueSummary>;
  saveOfflineAction(input: OfflineActionCommand): Promise<SyncCommandRecord>;
  markSyncCommandAttempt(
    commandIds: readonly string[],
    attemptedAt: string,
  ): Promise<readonly SyncCommandRecord[]>;
  applySyncTransportResult(result: SyncTransportResult): Promise<SyncCommandRecord>;
  resolveSyncConflict(input: ResolveSyncConflictInput): Promise<SyncConflictRecord>;
  loadSyncConflict(conflictId: string): Promise<SyncConflictRecord | null>;
  listAuditTimeline?: (input: AuditTimelineQuery) => Promise<readonly AuditTimelineItem[]>;
}

export function normalizeProductLookup(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function parseProductInput(input: CaptureProductInput): CaptureProductInput {
  return CaptureProductInputSchema.parse(input);
}

export function parseProductSearchRequest(input: ProductSearchRequest): ProductSearchRequest {
  return ProductSearchRequestSchema.parse(input);
}

export function categoryCatalogItemToLocalCategory(
  category: CentralCategoryCatalogItem,
  productCount = 0,
): CaptureProductCategory {
  return {
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    categoryRuleProfile: category.categoryRuleProfile,
    productCount,
  };
}

export function parseProductDraftCreateRequest(
  input: ProductDraftCreateRequest,
): ProductDraftCreateRequest {
  return ProductDraftCreateRequestSchema.parse(input);
}

export function productCatalogItemToLocalRecord(product: ProductCatalogItem): CaptureProductRecord {
  return {
    displayName: product.displayName,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    categoryRuleProfile: product.categoryRuleProfile,
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    ...(product.identifiers === undefined ? {} : { identifiers: product.identifiers }),
    ...(product.storePresentation === undefined
      ? {}
      : { storePresentation: product.storePresentation }),
    id: product.centralProductId,
    centralProductId: product.centralProductId,
    normalizedName: product.normalizedKey,
    createdAt: product.updatedAt,
    catalogSource: product.source,
    reviewStatus: product.reviewStatus,
    centralSyncState: product.syncState,
  };
}

export function productDraftToLocalRecord(draft: ProductDraftReviewState): CaptureProductRecord {
  return {
    displayName: draft.displayName,
    categoryId: draft.categoryId,
    categoryName: draft.categoryName,
    categoryRuleProfile: draft.categoryRuleProfile,
    ...(draft.gtin === undefined ? {} : { gtin: draft.gtin }),
    ...(draft.identifiers === undefined ? {} : { identifiers: draft.identifiers }),
    ...(draft.storePresentation === undefined
      ? {}
      : { storePresentation: draft.storePresentation }),
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

export function parseLotInput(input: CaptureLotInput): CaptureLotInput {
  return CaptureLotInputSchema.parse(input);
}

export function parseCentralLotCreateRequest(
  input: CentralLotCreateRequest,
): CentralLotCreateRequest {
  return CentralLotCreateRequestSchema.parse(input);
}

export function parseCentralObservationAppendRequest(
  input: CentralObservationAppendRequest,
): CentralObservationAppendRequest {
  return CentralObservationAppendRequestSchema.parse(input);
}

export function parseCentralLotWriteResponse(input: unknown): CentralLotWriteResponse {
  return CentralLotWriteResponseSchema.parse(input);
}

export function parseCentralLotTaskProjectionSummary(
  input: unknown,
): CentralLotTaskProjectionSummary {
  return CentralLotTaskProjectionSummarySchema.parse(input);
}

export function parseObservationInput(input: PhysicalObservationInput): PhysicalObservationInput {
  return PhysicalObservationInputSchema.parse(input);
}

export function isTerminalObservationStatus(status: PhysicalObservationInput["status"]): boolean {
  return status === "withdrawn" || status === "loss";
}

export function normalizeTerminalObservationLocation(
  input: PhysicalObservationInput,
): PhysicalObservationInput {
  const parsed = parseObservationInput(input);

  if (!isTerminalObservationStatus(parsed.status)) {
    return parsed;
  }

  return {
    ...parsed,
    location: { kind: "retirada_perda" },
  };
}

export function centralReadObservationStatus(
  lot: Pick<CaptureLotInput, "mode"> & { currentLocation: OperationalLocation },
  resolvedHistory?: Pick<ResolvedTaskHistorySnippet, "action">,
): PhysicalObservationInput["status"] {
  if (resolvedHistory?.action === "record_loss") {
    return "loss";
  }

  if (resolvedHistory?.action === "withdraw") {
    return "withdrawn";
  }

  if (lot.currentLocation.kind === "retirada_perda") {
    return lot.mode === "processed_repack_loss" ? "loss" : "withdrawn";
  }

  return "present";
}

export function centralReadObservationLocation(
  status: PhysicalObservationInput["status"],
  location: OperationalLocation,
): OperationalLocation {
  return isTerminalObservationStatus(status) ? { kind: "retirada_perda" } : location;
}

export function physicalObservationInputFromRecord(
  observation: CaptureObservationRecord,
): PhysicalObservationInput {
  const base = {
    status: observation.status,
    actorLabel: observation.actorLabel,
    occurredAt: observation.occurredAt,
    location: observation.location,
    isCorrection: observation.isCorrection,
    ...(observation.correctionReason === undefined
      ? {}
      : { correctionReason: observation.correctionReason }),
  };

  if (observation.quantityState === "estimated") {
    return {
      ...base,
      quantityState: "estimated",
      approximateQuantity: observation.approximateQuantity,
    };
  }

  return {
    ...base,
    quantityState: "not_estimable",
  };
}

export function latestPendingCentralObservationForLot(
  lot: CaptureLotSnapshot,
  observations: readonly CaptureObservationRecord[],
): CaptureObservationRecord | undefined {
  if (centralLotIdForObservationWrite(lot) === undefined) {
    return undefined;
  }

  const pending = observations
    .filter((observation) => shouldReplayObservationToCentral(lot, observation))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return pending[0];
}

export function shouldReplayObservationToCentral(
  lot: CaptureLotSnapshot,
  observation: CaptureObservationRecord,
): boolean {
  if (centralLotIdForObservationWrite(lot) === undefined) {
    return false;
  }

  if (isLikelyCentralObservationId(observation.id)) {
    return false;
  }

  return (
    observation.id === lot.currentObservation.id ||
    observation.occurredAt > lot.currentObservation.occurredAt
  );
}

export function centralLotIdForObservationWrite(
  lot: Pick<CaptureLotSnapshot, "id" | "centralLotId" | "centralSource">,
): string | undefined {
  if (lot.centralLotId !== undefined && lot.centralLotId.trim().length > 0) {
    return lot.centralLotId;
  }

  if (lot.centralSource === "central" && lot.id.trim().length > 0) {
    return lot.id;
  }

  return undefined;
}

export function isLikelyCentralObservationId(observationId: string): boolean {
  return (
    observationId.startsWith("obs:") ||
    observationId.startsWith("central-observation:") ||
    observationId.includes("observacao-central")
  );
}

export function matchesRecentLotLocation(
  lot: CaptureLotSnapshot,
  location: OperationalLocation | undefined,
): boolean {
  if (location === undefined) {
    return true;
  }

  if (isTerminalObservationStatus(lot.currentObservation.status)) {
    return location.kind === "retirada_perda";
  }

  return (
    lot.currentObservation.location.kind === location.kind &&
    (lot.currentObservation.location.kind !== "other" ||
      location.kind !== "other" ||
      lot.currentObservation.location.customName === location.customName)
  );
}

export function parseTodayTaskRecord(input: unknown): TodayTaskRecord {
  return TodayTaskRecordSchema.parse(input);
}

export function parseTaskResolutionCommand(input: unknown): TaskResolutionCommand {
  return TaskResolutionCommandSchema.parse(input);
}

const LOCAL_RESOLUTION_PENDING_SYNC_STATES: readonly NonNullable<
  TodayTaskRecord["sync"]
>["state"][] = ["command_saved_local", "pending_sync", "syncing", "sync_failed", "sync_conflict"];

export function shouldPreserveLocalResolutionProjection(
  task: TodayTaskRecord | undefined,
): boolean {
  return (
    task !== undefined &&
    task.status === "resolved" &&
    task.sync !== undefined &&
    LOCAL_RESOLUTION_PENDING_SYNC_STATES.includes(task.sync.state) &&
    (task.resolutionHistory?.length ?? 0) > 0
  );
}

type TaskResolutionHistoryEntry = NonNullable<TodayTaskRecord["resolutionHistory"]>[number];

export function appendTaskResolutionHistoryEntry(
  history: TodayTaskRecord["resolutionHistory"],
  entry: TaskResolutionHistoryEntry,
): NonNullable<TodayTaskRecord["resolutionHistory"]> {
  const existing = history ?? [];

  if (existing.some((candidate) => isSameTaskResolutionHistoryEntry(candidate, entry))) {
    return existing;
  }

  return [...existing, entry];
}

function isSameTaskResolutionHistoryEntry(
  left: TaskResolutionHistoryEntry,
  right: TaskResolutionHistoryEntry,
): boolean {
  return (
    left.action === right.action &&
    left.actorLabel === right.actorLabel &&
    left.occurredAt === right.occurredAt &&
    JSON.stringify(left.evidence ?? null) === JSON.stringify(right.evidence ?? null)
  );
}

export function parseMarkdownRequestCommand(input: unknown): MarkdownRequestCommand {
  return MarkdownRequestCommandSchema.parse(input);
}

export function parseMarkdownApprovalCommand(input: unknown): MarkdownApprovalCommand {
  return MarkdownApprovalCommandSchema.parse(input);
}

export function parseMarkdownApplicationCommand(input: unknown): MarkdownApplicationCommand {
  return MarkdownApplicationCommandSchema.parse(input);
}

export function parseMarkdownShelfConfirmationCommand(
  input: unknown,
): MarkdownShelfConfirmationCommand {
  return MarkdownShelfConfirmationCommandSchema.parse(input);
}

export function parseMarkdownWorkflowRecord(input: unknown): MarkdownWorkflowRecord {
  return MarkdownWorkflowRecordSchema.parse(input);
}

export function parseAlertDeviceRegistration(input: unknown): DevicePushRegistrationCommand {
  return DevicePushRegistrationCommandSchema.parse(input);
}

export function parseTaskAlertStateRecord(input: unknown): TaskAlertStateRecord {
  return TaskAlertStateRecordSchema.parse(input);
}

export function parseAlertDeliveryResult(input: unknown): AlertDeliveryResult {
  return AlertDeliveryResultSchema.parse(input);
}

export function parsePushOpenIntent(input: unknown): PushOpenIntent {
  return PushOpenIntentSchema.parse(input);
}

export function parseOfflineCacheStatus(input: unknown): OfflineCacheStatus {
  return OfflineCacheStatusSchema.parse(input);
}

export function parsePrepareTurnResponse(input: unknown): PrepareTurnResponse {
  return PrepareTurnResponseSchema.parse(input);
}

export function parseLocalOnboardingProgressRecord(
  input: LocalOnboardingProgressRecord,
): LocalOnboardingProgressRecord {
  const parsed = OnboardingProgressMutationRequestSchema.parse({
    flowId: input.flowId,
    version: input.version,
    status: input.status,
    occurredAt: input.updatedAt,
  });

  return {
    subjectId: input.subjectId.trim(),
    storeId: input.storeId.trim(),
    flowId: parsed.flowId,
    version: parsed.version,
    status: parsed.status,
    ...(input.completedAt === undefined ? {} : { completedAt: input.completedAt }),
    ...(input.skippedAt === undefined ? {} : { skippedAt: input.skippedAt }),
    updatedAt: parsed.occurredAt,
  };
}

export function parsePrepareTurnCacheStatus(input: unknown): PrepareTurnCacheStatus {
  return PrepareTurnCacheStatusSchema.parse(input);
}

export function parseOfflineActionCommand(input: unknown): OfflineActionCommand {
  return OfflineActionCommandSchema.parse(input);
}

export function parseSyncCommandRecord(input: unknown): SyncCommandRecord {
  return SyncCommandRecordSchema.parse(input);
}

export function parseSyncQueueSummary(input: unknown): SyncQueueSummary {
  return SyncQueueSummarySchema.parse(input);
}

export function parseSyncConflictRecord(input: unknown): SyncConflictRecord {
  return SyncConflictRecordSchema.parse(input);
}

export function parseSyncTransportResult(input: unknown): SyncTransportResult {
  return SyncTransportResultSchema.parse(input);
}

export function parseAuditTimelineItem(input: unknown): AuditTimelineItem {
  return AuditTimelineItemSchema.parse(input);
}

export function parseLotId(value: string): string {
  const parsed = value.trim();

  if (parsed.length === 0 || parsed.length > 120) {
    throw new Error("A capture identifier must contain between 1 and 120 characters.");
  }

  return parsed;
}

export function parseProductCategoryId(value: string): string {
  const parsed = value.trim();

  if (parsed.length === 0 || parsed.length > 160) {
    throw new Error("A product category identifier must contain between 1 and 160 characters.");
  }

  return parsed;
}

export function parseRecentLotsQuery(input: RecentLotsQuery | undefined): RecentLotsQuery {
  const query = input?.query?.trim();
  const limit = input?.limit;

  if (query !== undefined && query.length > 160) {
    throw new Error("A lot search query cannot exceed 160 characters.");
  }

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    throw new Error("A recent-lot limit must be an integer between 1 and 100.");
  }

  return {
    ...(query === undefined || query.length === 0 ? {} : { query }),
    ...(input?.location === undefined ? {} : { location: input.location }),
    ...(limit === undefined ? {} : { limit }),
  };
}

export function createInitialObservation(
  lot: CaptureLotInput,
  actorLabel: string,
  occurredAt: string,
): PhysicalObservationInput {
  return PhysicalObservationInputSchema.parse({
    status: "present",
    actorLabel: validateActorLabel(actorLabel),
    occurredAt,
    location: lot.initialLocation,
    quantityState: "estimated",
    approximateQuantity: lot.approximateQuantity,
    isCorrection: false,
  });
}

export function nextGeneratedId(dependencies: CaptureRepositoryDependencies): string {
  return parseLotId(dependencies.createId());
}

export function createTodayTaskRecord(input: {
  candidate: NonNullable<ReturnType<typeof deriveTodayTaskCandidate>>;
  lotIdentity: CaptureLotDetail["identity"];
  id: string;
  createdAt: string;
  updatedAt: string;
}): TodayTaskRecord {
  return TodayTaskRecordSchema.parse({
    id: input.id,
    activeKey: input.candidate.activeKey,
    lotId: input.candidate.lotId,
    productDisplayName: input.candidate.productDisplayName,
    lotIdentity: input.lotIdentity,
    currentLocation: input.candidate.currentLocation,
    riskState: input.candidate.riskState,
    severity: input.candidate.severity,
    dueBucket: input.candidate.dueBucket,
    requiredResolution: input.candidate.requiredResolution,
    section: input.candidate.section,
    ownerLabel: input.candidate.ownerLabel,
    status: "active",
    sourceRisk: input.candidate.sourceRisk,
    priority: input.candidate.priority,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    ...(input.candidate.recheckParentId === undefined
      ? {}
      : { recheckParentId: input.candidate.recheckParentId }),
  });
}

export function createMarkdownStageTodayTaskRecord(input: {
  workflow: MarkdownWorkflowRecord;
  lot: CaptureLotDetail;
  assessment: RiskAssessment;
  id: string;
  createdAt: string;
  updatedAt: string;
}): TodayTaskRecord {
  if (
    input.workflow.currentStage !== "requested" &&
    input.workflow.currentStage !== "approved" &&
    input.workflow.currentStage !== "applied"
  ) {
    throw new Error(`Workflow ${input.workflow.id} does not have an active markdown stage.`);
  }

  const candidate = deriveMarkdownStageTaskCandidate({
    workflowId: input.workflow.id,
    lotId: input.lot.id,
    productDisplayName: input.lot.productDisplayName,
    lotIdentity: input.lot.identity.value,
    currentLocation: input.lot.currentObservation.location,
    sourceRisk: {
      state: "markdown_due",
      reasons:
        input.assessment.reasons.length === 0
          ? [{ code: "expires_in_15_days", field: "markdownWorkflow" }]
          : input.assessment.reasons,
    },
    observedAt: input.updatedAt,
    currentStage: input.workflow.currentStage,
  });

  return TodayTaskRecordSchema.parse({
    id: input.id,
    activeKey: candidate.activeKey,
    lotId: candidate.lotId,
    productDisplayName: candidate.productDisplayName,
    lotIdentity: input.lot.identity,
    currentLocation: candidate.currentLocation,
    riskState: candidate.riskState,
    severity: candidate.severity,
    dueBucket: candidate.dueBucket,
    requiredResolution: candidate.requiredResolution,
    section: candidate.section,
    ownerLabel: candidate.ownerLabel,
    status: "active",
    sourceRisk: candidate.sourceRisk,
    priority: candidate.priority,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    markdownWorkflowId: candidate.markdownWorkflowId,
    markdownStage: candidate.markdownStage,
  });
}

export function createFutureAttentionRecord(input: {
  lot: CaptureLotDetail;
  id: string;
  observedAt: string;
  currentDate: string;
  currentTimestamp: string;
}): FutureAttentionRecord | null {
  const productOverride = toProductRuleOverride(input.lot.product);
  const assessment = calculateLotRisk({
    currentDate: input.currentDate,
    currentTimestamp: input.currentTimestamp,
    categoryProfile: toCategoryRuleProfile(input.lot.product.categoryRuleProfile),
    ...(productOverride === undefined ? {} : { productOverride }),
    lastPhysicalConfirmation: {
      status: input.lot.currentObservation.status,
      confirmedAt: input.lot.currentObservation.occurredAt,
      ...(input.lot.currentObservation.quantityState === "estimated"
        ? { approximateQuantity: input.lot.currentObservation.approximateQuantity }
        : {}),
    },
    lot: toRiskCalculationLot(input.lot),
  });
  const candidate = deriveFutureAttentionCandidate({
    lotId: input.lot.id,
    productDisplayName: input.lot.productDisplayName,
    lotIdentity: input.lot.identity.value,
    currentLocation: input.lot.currentObservation.location,
    assessment,
    observedAt: input.observedAt,
  });

  if (candidate === null) {
    return null;
  }

  return {
    id: input.id,
    lotId: candidate.lotId,
    productDisplayName: candidate.productDisplayName,
    lotIdentity: {
      identitySource: input.lot.identity.identitySource,
      value: candidate.lotIdentity,
    },
    currentLocation: candidate.currentLocation,
    riskState: "radar",
    section: "future_attention",
    sourceRiskReasons: [...candidate.sourceRisk.reasons],
    observedAt: candidate.observedAt,
  };
}

export function createSalesAreaRecheckTask(input: {
  parentTask: TodayTaskRecord;
  id: string;
  occurredAt: string;
}): TodayTaskRecord {
  return TodayTaskRecordSchema.parse({
    id: input.id,
    activeKey: `recheck:${input.parentTask.id}`,
    lotId: input.parentTask.lotId,
    productDisplayName: input.parentTask.productDisplayName,
    lotIdentity: input.parentTask.lotIdentity,
    currentLocation: input.parentTask.currentLocation,
    riskState: "uncertain",
    severity: "high",
    dueBucket: "now",
    requiredResolution: "sales_area_recheck",
    section: "check_sales_area",
    ownerLabel: input.parentTask.ownerLabel,
    status: "active",
    sourceRisk: {
      state: "uncertain",
      reasons: [{ code: "presence_conditionally_resolved", field: "sales_area_recheck" }],
    },
    priority: Math.max(1, input.parentTask.priority + 1),
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
    recheckParentId: input.parentTask.id,
  });
}

export function deriveRefreshedTaskAlertState(input: {
  task: TodayTaskRecord;
  existing?: TaskAlertStateRecord;
  channelState: AlertChannelState;
  referenceTime: string;
  isWithinShift?: boolean;
  isOverdue?: boolean;
  allowOffShiftCriticalAlerts?: boolean;
}): TaskAlertStateRecord {
  const alertableTask = {
    id: input.task.id,
    activeKey: input.task.activeKey,
    productDisplayName: input.task.productDisplayName,
    lotIdentity: input.task.lotIdentity.value,
    currentLocation: input.task.currentLocation,
    severity: input.task.severity,
    dueBucket: input.task.dueBucket,
    requiredResolution: input.task.requiredResolution,
    status: input.task.status,
    ownerLabel: input.task.ownerLabel,
    ...(input.task.responsibleActorLabel === undefined
      ? {}
      : { responsibleActorLabel: input.task.responsibleActorLabel }),
  };
  const action = getNextAlertAction(alertableTask, {
    createdAt: input.existing?.createdAt ?? input.task.createdAt,
    referenceTime: input.referenceTime,
    ...(input.existing?.lastReminderAt === undefined
      ? {}
      : { lastReminderAt: input.existing.lastReminderAt }),
    ...(input.existing?.escalatedAt === undefined
      ? {}
      : { escalatedAt: input.existing.escalatedAt }),
    escalationState: input.existing?.escalationState ?? "not_escalated",
    ...(input.isWithinShift === undefined ? {} : { isWithinShift: input.isWithinShift }),
    ...(input.allowOffShiftCriticalAlerts === undefined
      ? {}
      : { allowOffShiftCriticalAlerts: input.allowOffShiftCriticalAlerts }),
    ...(input.isOverdue === undefined ? {} : { isOverdue: input.isOverdue }),
  });
  const escalatedAt = action.kind === "escalate" ? action.escalatedAt : input.existing?.escalatedAt;
  const nextReminderAt =
    "nextReminderAt" in action ? action.nextReminderAt : input.existing?.nextReminderAt;

  return parseTaskAlertStateRecord({
    taskId: input.task.id,
    taskActiveKey: input.task.activeKey,
    channelState: input.channelState,
    attemptState: action.attemptState,
    audience: action.kind === "none" ? (input.existing?.audience ?? "shift_team") : action.audience,
    escalationState: action.escalationState,
    createdAt: input.existing?.createdAt ?? input.referenceTime,
    updatedAt: input.referenceTime,
    ...(input.existing?.lastReminderAt === undefined
      ? {}
      : { lastReminderAt: input.existing.lastReminderAt }),
    ...(nextReminderAt === undefined ? {} : { nextReminderAt }),
    ...(escalatedAt === undefined ? {} : { escalatedAt }),
    ...(input.existing?.leadershipAcknowledgedAt === undefined
      ? {}
      : { leadershipAcknowledgedAt: input.existing.leadershipAcknowledgedAt }),
    ...(input.existing?.retryCount === undefined ? {} : { retryCount: input.existing.retryCount }),
    ...(input.existing?.failureReason === undefined
      ? {}
      : { failureReason: input.existing.failureReason }),
    ...(input.existing?.lastAttemptId === undefined
      ? {}
      : { lastAttemptId: input.existing.lastAttemptId }),
  });
}

export function alertChannelStateForRegistration(
  registration: DevicePushRegistrationCommand | null,
): AlertChannelState {
  if (registration === null) {
    return "not_requested";
  }

  if (registration.permissionStatus === "granted") {
    return "active";
  }

  if (registration.permissionStatus === "local_only") {
    return "local_only";
  }

  if (registration.permissionStatus === "denied") {
    return "denied";
  }

  return registration.permissionStatus;
}

export function applyAlertDeliveryResult(input: {
  existing: TaskAlertStateRecord;
  attemptId: string;
  attemptedAt: string;
  result: AlertDeliveryResult;
}): TaskAlertStateRecord {
  const retryCount = input.existing.retryCount ?? 0;

  if (input.result.status === "ok") {
    return parseTaskAlertStateRecord({
      ...input.existing,
      attemptState: "sent",
      updatedAt: input.attemptedAt,
      lastReminderAt: input.attemptedAt,
      retryCount,
      lastAttemptId: input.attemptId,
    });
  }

  if (input.result.status === "retryable_error") {
    const nextRetryCount = retryCount + 1;

    return parseTaskAlertStateRecord({
      ...input.existing,
      attemptState: nextRetryCount >= 3 ? "exhausted" : "retry_pending",
      updatedAt: input.attemptedAt,
      retryCount: nextRetryCount,
      failureReason: input.result.failureReason,
      lastAttemptId: input.attemptId,
    });
  }

  return parseTaskAlertStateRecord({
    ...input.existing,
    attemptState: "failed",
    updatedAt: input.attemptedAt,
    retryCount,
    failureReason:
      input.result.status === "device_not_registered"
        ? "DeviceNotRegistered"
        : input.result.failureReason,
    lastAttemptId: input.attemptId,
  });
}

export function shouldCreateSalesAreaRecheck(
  task: TodayTaskRecord,
  command: TaskResolutionCommand,
): boolean {
  const resolvesByRemoval =
    command.action === "withdraw" ||
    command.action === "repack" ||
    command.action === "record_loss";

  return (
    resolvesByRemoval &&
    task.currentLocation.kind === "area_de_venda" &&
    (task.riskState === "expired" || task.riskState === "critical")
  );
}

export function assertRecheckResolutionHasEvidence(
  task: TodayTaskRecord,
  command: TaskResolutionCommand,
): void {
  if (task.requiredResolution !== "sales_area_recheck" || command.action !== "complete_recheck") {
    return;
  }

  if (command.evidence === undefined || command.evidence.kind === "photo_pending") {
    throw new Error("Sales-area recheck resolution requires photo metadata or a no-photo reason.");
  }
}

export function deriveTaskCandidateFromLot(input: {
  lot: CaptureLotDetail;
  currentDate: string;
  currentTimestamp: string;
}) {
  const productOverride = toProductRuleOverride(input.lot.product);

  const assessment = calculateLotRisk({
    currentDate: input.currentDate,
    currentTimestamp: input.currentTimestamp,
    categoryProfile: toCategoryRuleProfile(input.lot.product.categoryRuleProfile),
    ...(productOverride === undefined ? {} : { productOverride }),
    lastPhysicalConfirmation: {
      status: input.lot.currentObservation.status,
      confirmedAt: input.lot.currentObservation.occurredAt,
      ...(input.lot.currentObservation.quantityState === "estimated"
        ? { approximateQuantity: input.lot.currentObservation.approximateQuantity }
        : {}),
    },
    lot: toRiskCalculationLot(input.lot),
  });

  return deriveTodayTaskCandidate({
    lotId: input.lot.id,
    productDisplayName: input.lot.productDisplayName,
    lotIdentity: input.lot.identity.value,
    currentLocation: input.lot.currentObservation.location,
    assessment,
    observedAt: input.currentTimestamp,
  });
}

export function calculateAssessmentForLot(input: {
  lot: CaptureLotDetail;
  currentDate: string;
  currentTimestamp: string;
}): RiskAssessment {
  const productOverride = toProductRuleOverride(input.lot.product);

  return calculateLotRisk({
    currentDate: input.currentDate,
    currentTimestamp: input.currentTimestamp,
    categoryProfile: toCategoryRuleProfile(input.lot.product.categoryRuleProfile),
    ...(productOverride === undefined ? {} : { productOverride }),
    lastPhysicalConfirmation: {
      status: input.lot.currentObservation.status,
      confirmedAt: input.lot.currentObservation.occurredAt,
      ...(input.lot.currentObservation.quantityState === "estimated"
        ? { approximateQuantity: input.lot.currentObservation.approximateQuantity }
        : {}),
    },
    lot: toRiskCalculationLot(input.lot),
  });
}

export function maxPhysicalConfirmationAgeHoursForLot(lot: CaptureLotDetail): number {
  return (
    lot.product.productRuleOverride?.maxPhysicalConfirmationAgeHours ??
    lot.product.categoryRuleProfile.maxPhysicalConfirmationAgeHours ??
    24
  );
}

export function deriveMarkdownEntryState(input: {
  lot: CaptureLotDetail;
  assessment: RiskAssessment;
  activeWorkflow?: MarkdownWorkflowRecord;
  currentDate: string;
  currentTimestamp: string;
}): MarkdownEntryState {
  const terminal = terminalMarkdownEntryState(input.lot);

  if (terminal !== undefined) {
    return terminal;
  }

  if (isExpiredForMarkdownEntry(input.lot, input.currentDate)) {
    return {
      status: "withdrawal_required",
      label: "Retirar da area ou registrar perda",
      lotId: input.lot.id,
    };
  }

  if (input.lot.mode === "processed_repack_loss") {
    return {
      status: "markdown_unavailable",
      label: "Produto processado da loja: rebaixa indisponivel",
      lotId: input.lot.id,
      reason: "processed_in_store",
    };
  }

  if (input.activeWorkflow !== undefined) {
    return {
      status: "already_active",
      label: markdownStageLabel(input.activeWorkflow.currentStage),
      lotId: input.lot.id,
      workflowId: input.activeWorkflow.id,
      currentStage: input.activeWorkflow.currentStage,
    };
  }

  const ruleWindow = canStartMarkdownWorkflow({
    riskState: input.assessment.state,
    physicalConfirmation: {
      status: input.lot.currentObservation.status,
      confirmedAt: input.lot.currentObservation.occurredAt,
      ...(input.lot.currentObservation.quantityState === "estimated"
        ? { approximateQuantity: input.lot.currentObservation.approximateQuantity }
        : {}),
    },
    currentTimestamp: input.currentTimestamp,
    maxPhysicalConfirmationAgeHours: maxPhysicalConfirmationAgeHoursForLot(input.lot),
    requestReason: "rule_window",
  });

  if (ruleWindow.status === "allowed") {
    return {
      status: "eligible_rule_window",
      label: "Solicitar rebaixa",
      lotId: input.lot.id,
    };
  }

  if (ruleWindow.blocker.code === "presence_required") {
    return {
      status: "presence_required",
      label: "Conferir presenca antes da rebaixa",
      lotId: input.lot.id,
    };
  }

  return {
    status: "early_exception_available",
    label: "Solicitar rebaixa antecipada",
    lotId: input.lot.id,
    reasons: ["excess_stock", "quality_issue", "package_damage", "operational_guidance", "other"],
  };
}

export function assertMarkdownRequestAllowedForLot(
  lot: CaptureLotDetail,
  currentDate: string,
): void {
  if (isExpiredForMarkdownEntry(lot, currentDate)) {
    throw new Error("Lote vencendo hoje ou vencido exige retirada da area ou perda.");
  }

  if (lot.mode === "processed_repack_loss") {
    throw new Error("Produto processado da loja nao permite rebaixa.");
  }
}

function terminalMarkdownEntryState(lot: CaptureLotDetail): MarkdownEntryState | undefined {
  if (lot.currentObservation.status === "loss") {
    return {
      status: "terminal_finalized",
      label: "Finalizado: perda registrada",
      lotId: lot.id,
    };
  }

  if (lot.currentObservation.status === "withdrawn") {
    return {
      status: "terminal_finalized",
      label: "Finalizado: retirado da area",
      lotId: lot.id,
    };
  }

  return undefined;
}

function isExpiredForMarkdownEntry(lot: CaptureLotDetail, currentDate: string): boolean {
  if (lot.mode !== "formal_validity" && lot.mode !== "processed_repack_loss") {
    return false;
  }

  return lot.expiresAt <= currentDate;
}

export function sortTodayTasks(tasks: readonly TodayTaskRecord[]): TodayTaskRecord[] {
  return [...tasks].sort((left, right) => {
    const priorityDifference = left.priority - right.priority;

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function sortTodayTaskRecordsFromCandidates(
  tasks: readonly NonNullable<ReturnType<typeof deriveTodayTaskCandidate>>[],
) {
  return [...tasks].sort(compareTodayTaskPriority);
}

function validateActorLabel(value: string): string {
  const parsed = value.trim();

  if (parsed.length === 0 || parsed.length > 160) {
    throw new Error("An actor label must contain between 1 and 160 characters.");
  }

  return parsed;
}

function toProductRuleOverride(product: CaptureProductRecord): ProductRuleOverride | undefined {
  if (product.productRuleOverride === undefined) {
    return undefined;
  }

  return {
    productId: product.id,
    ...(product.productRuleOverride.mode === undefined
      ? {}
      : { mode: product.productRuleOverride.mode }),
    ...(product.productRuleOverride.windows === undefined
      ? {}
      : { windows: toRiskWindows(product.productRuleOverride.windows) }),
    ...(product.productRuleOverride.maxPhysicalConfirmationAgeHours === undefined
      ? {}
      : {
          maxPhysicalConfirmationAgeHours:
            product.productRuleOverride.maxPhysicalConfirmationAgeHours,
        }),
  };
}

function toCategoryRuleProfile(
  profile: CaptureProductRecord["categoryRuleProfile"],
): CategoryRuleProfile {
  return {
    categoryId: profile.categoryId,
    mode: profile.mode,
    ...(profile.windows === undefined ? {} : { windows: toRiskWindows(profile.windows) }),
    ...(profile.maxPhysicalConfirmationAgeHours === undefined
      ? {}
      : { maxPhysicalConfirmationAgeHours: profile.maxPhysicalConfirmationAgeHours }),
  };
}

type LooseRiskWindows = {
  readonly [Key in keyof RiskWindows]?: RiskWindows[Key] | undefined;
};

function toRiskWindows(windows: LooseRiskWindows): Partial<RiskWindows> {
  return {
    ...(windows.radarDays === undefined ? {} : { radarDays: windows.radarDays }),
    ...(windows.markdownDays === undefined ? {} : { markdownDays: windows.markdownDays }),
    ...(windows.criticalDays === undefined ? {} : { criticalDays: windows.criticalDays }),
    ...(windows.expiredDays === undefined ? {} : { expiredDays: windows.expiredDays }),
    ...(windows.qualityWindowDays === undefined
      ? {}
      : { qualityWindowDays: windows.qualityWindowDays }),
  };
}

function toRiskCalculationLot(lot: CaptureLotDetail): RiskCalculationLot {
  if (lot.mode === "formal_validity") {
    return {
      mode: "formal_validity",
      productId: lot.productId,
      lotCode: lot.identity.value,
      expiresAt: lot.expiresAt,
    };
  }

  if (lot.mode === "processed_repack_loss") {
    return {
      mode: "processed_repack_loss",
      productId: lot.productId,
      lotCode: lot.identity.value,
      expiresAt: lot.expiresAt,
    };
  }

  if (lot.mode === "flv_inspection") {
    return {
      mode: "flv_inspection",
      productId: lot.productId,
      lotCode: lot.identity.value,
      ...(lot.receivedAt === undefined ? {} : { receivedAt: lot.receivedAt }),
      ...(lot.qualityInspectionDueAt === undefined
        ? {}
        : { qualityInspectionDueAt: lot.qualityInspectionDueAt }),
      ...(lot.qualityWindowDays === undefined ? {} : { qualityWindowDays: lot.qualityWindowDays }),
    };
  }

  return {
    mode: "receiving_monitored",
    productId: lot.productId,
    lotCode: lot.identity.value,
    receivedAt: lot.receivedAt,
  };
}

function markdownStageLabel(stage: MarkdownWorkflowRecord["currentStage"]): string {
  if (stage === "requested") {
    return "Aprovar rebaixa";
  }

  if (stage === "approved") {
    return "Aplicar rebaixa";
  }

  if (stage === "applied") {
    return "Conferir etiqueta na area de venda";
  }

  if (stage === "rejected") {
    return "Rebaixa reprovada";
  }

  return "Rebaixa conferida na area de venda";
}
