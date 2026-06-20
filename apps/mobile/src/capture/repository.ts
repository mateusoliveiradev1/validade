import {
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  PhysicalObservationInputSchema,
  type CaptureLotInput,
  type CaptureProductInput,
  type FutureAttentionRecord,
  type OperationalLocation,
  type PhysicalObservationInput,
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

export interface CaptureRepository {
  initialize(): Promise<void>;
  createProduct(input: CaptureProductInput): Promise<CaptureProductRecord>;
  findProducts(query: string): Promise<readonly CaptureProductRecord[]>;
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

export function parseLotId(value: string): string {
  const parsed = value.trim();

  if (parsed.length === 0 || parsed.length > 120) {
    throw new Error("A capture identifier must contain between 1 and 120 characters.");
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
