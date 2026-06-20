import type {
  CaptureProductInput,
  FutureAttentionRecord,
  PhysicalObservationInput,
  TaskResolutionCommand,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import type {
  CaptureLotDetail,
  CaptureLotSnapshot,
  CaptureObservationRecord,
  CaptureProductCategory,
  CaptureProductRecord,
  CaptureRepository,
  CaptureRepositoryDependencies,
  RecentLotsQuery,
  RefreshTodayTasksInput,
  TodayTaskRefreshResult,
  SaveLotInput,
} from "./repository";
import {
  assertRecheckResolutionHasEvidence,
  createFutureAttentionRecord,
  createInitialObservation,
  createSalesAreaRecheckTask,
  createTodayTaskRecord,
  deriveTaskCandidateFromLot,
  nextGeneratedId,
  normalizeProductLookup,
  parseLotId,
  parseLotInput,
  parseObservationInput,
  parseProductCategoryId,
  parseProductInput,
  parseRecentLotsQuery,
  parseTaskResolutionCommand,
  parseTodayTaskRecord,
  shouldCreateSalesAreaRecheck,
  sortTodayTasks,
} from "./repository";

export function createMemoryCaptureRepository(
  dependencies: CaptureRepositoryDependencies,
): CaptureRepository {
  const products = new Map<string, CaptureProductRecord>();
  const lots = new Map<string, CaptureLotSnapshot>();
  const observations = new Map<string, CaptureObservationRecord[]>();
  const todayTasks = new Map<string, TodayTaskRecord>();
  const futureAttention = new Map<string, FutureAttentionRecord>();

  async function initialize(): Promise<void> {
    return Promise.resolve();
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

  function listProductCategories(): Promise<readonly CaptureProductCategory[]> {
    const counts = new Map<string, number>();

    for (const product of products.values()) {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }

    return Promise.resolve(
      [...counts.entries()]
        .map(([categoryId, productCount]) => ({ categoryId, productCount }))
        .sort((left, right) => left.categoryId.localeCompare(right.categoryId, "pt-BR")),
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

  function saveLot(input: SaveLotInput): Promise<CaptureLotSnapshot> {
    const lot = parseLotInput(input.lot);
    const product = products.get(lot.productId);

    if (product === undefined) {
      throw new Error(`Cannot save a lot for an unknown product: ${lot.productId}`);
    }

    const lotId = nextGeneratedId(dependencies);
    const observation: CaptureObservationRecord = {
      ...createInitialObservation(lot, input.actorLabel, dependencies.clock()),
      id: nextGeneratedId(dependencies),
      lotId,
    };
    const snapshot: CaptureLotSnapshot = {
      ...lot,
      id: lotId,
      productDisplayName: product.displayName,
      currentObservation: observation,
    };

    lots.set(lotId, snapshot);
    observations.set(lotId, [observation]);

    return Promise.resolve(snapshot);
  }

  function appendObservation(
    lotId: string,
    input: PhysicalObservationInput,
  ): Promise<CaptureObservationRecord> {
    const validatedLotId = parseLotId(lotId);
    const snapshot = lots.get(validatedLotId);

    if (snapshot === undefined) {
      throw new Error(`Cannot append an observation for an unknown lot: ${validatedLotId}`);
    }

    const observation: CaptureObservationRecord = {
      ...parseObservationInput(input),
      id: nextGeneratedId(dependencies),
      lotId: validatedLotId,
    };
    const history = observations.get(validatedLotId) ?? [];

    observations.set(validatedLotId, [...history, observation]);
    lots.set(validatedLotId, { ...snapshot, currentObservation: observation });

    return Promise.resolve(observation);
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
            products.get(lot.productId)?.gtin?.includes(normalizedQuery) === true ||
            lot.identity.value.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
          const matchesLocation =
            parsedQuery.location === undefined ||
            (lot.currentObservation.location.kind === parsedQuery.location.kind &&
              (lot.currentObservation.location.kind !== "other" ||
                parsedQuery.location.kind !== "other" ||
                lot.currentObservation.location.customName === parsedQuery.location.customName));

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

    const product = products.get(snapshot.productId);

    if (product === undefined) {
      throw new Error(`Lot ${validatedLotId} has no stored product.`);
    }

    return Promise.resolve({
      ...snapshot,
      product,
      observations: observations.get(validatedLotId) ?? [],
    });
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

      if (candidate === null) {
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

      const resolutionHistory = [
        ...(existing.resolutionHistory ?? []),
        {
          action: command.action,
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          ...(command.evidence === undefined ? {} : { evidence: command.evidence }),
        },
      ];
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

  return {
    initialize,
    createProduct,
    findProducts,
    listFrequentProducts,
    listProductCategories,
    findProductsByCategory,
    saveLot,
    appendObservation,
    listRecentLots,
    loadLotDetail,
    refreshTodayTasks,
    listActiveTodayTasks,
    listFutureAttention,
    resolveTodayTask,
    loadTodayTask,
  };
}

function isActiveTask(task: TodayTaskRecord): boolean {
  return task.status === "active";
}
