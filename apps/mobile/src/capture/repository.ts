import {
  AlertDeliveryResultSchema,
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  DevicePushRegistrationCommandSchema,
  PhysicalObservationInputSchema,
  PushOpenIntentSchema,
  TaskAlertStateRecordSchema,
  type CaptureLotInput,
  type CaptureProductInput,
  type AlertDeliveryResult,
  type DevicePushRegistrationCommand,
  type FutureAttentionRecord,
  type OperationalLocation,
  type PhysicalObservationInput,
  type PushOpenIntent,
  type TaskAlertStateRecord,
  type TaskRefreshMetadata,
  TaskResolutionCommandSchema,
  TodayTaskRecordSchema,
  type TaskResolutionCommand,
  type TodayTaskRecord,
} from "@validade-zero/contracts";
import {
  calculateLotRisk,
  compareTodayTaskPriority,
  deriveFutureAttentionCandidate,
  deriveTodayTaskCandidate,
  getNextAlertAction,
  type AlertChannelState,
  type CategoryRuleProfile,
  type ProductRuleOverride,
  type RiskCalculationLot,
  type RiskWindows,
} from "@validade-zero/domain";

export interface CaptureRepositoryDependencies {
  clock: () => string;
  createId: () => string;
}

export type CaptureProductRecord = CaptureProductInput & {
  id: string;
  normalizedName: string;
  createdAt: string;
};

export interface CaptureProductCategory {
  categoryId: string;
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
};

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

export interface CaptureRepository {
  initialize(): Promise<void>;
  createProduct(input: CaptureProductInput): Promise<CaptureProductRecord>;
  findProducts(query: string): Promise<readonly CaptureProductRecord[]>;
  listFrequentProducts?: () => Promise<readonly CaptureProductRecord[]>;
  listProductCategories?: () => Promise<readonly CaptureProductCategory[]>;
  findProductsByCategory?: (categoryId: string) => Promise<readonly CaptureProductRecord[]>;
  saveLot(input: SaveLotInput): Promise<CaptureLotSnapshot>;
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
  registerAlertDevice(input: DevicePushRegistrationCommand): Promise<DevicePushRegistrationCommand>;
  loadAlertChannelState(): Promise<DevicePushRegistrationCommand | null>;
  refreshTaskAlertStates(
    input: RefreshTaskAlertStatesInput,
  ): Promise<readonly TaskAlertStateRecord[]>;
  listTaskAlertStates(): Promise<readonly TaskAlertStateRecord[]>;
  recordAlertAttempt(input: RecordAlertAttemptInput): Promise<TaskAlertStateRecord>;
  acknowledgeEscalation(input: AcknowledgeEscalationInput): Promise<TaskAlertStateRecord>;
  resolvePushOpenIntent(input: ResolvePushOpenIntentInput): Promise<PushOpenIntent>;
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

export function parseLotInput(input: CaptureLotInput): CaptureLotInput {
  return CaptureLotInputSchema.parse(input);
}

export function parseObservationInput(input: PhysicalObservationInput): PhysicalObservationInput {
  return PhysicalObservationInputSchema.parse(input);
}

export function parseTodayTaskRecord(input: unknown): TodayTaskRecord {
  return TodayTaskRecordSchema.parse(input);
}

export function parseTaskResolutionCommand(input: unknown): TaskResolutionCommand {
  return TaskResolutionCommandSchema.parse(input);
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
  const resolvesByRemoval = command.action === "withdraw" || command.action === "record_loss";

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
