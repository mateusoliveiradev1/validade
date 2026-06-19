import type { CaptureProductInput, PhysicalObservationInput } from "@validade-zero/contracts";
import type {
  CaptureLotDetail,
  CaptureLotSnapshot,
  CaptureObservationRecord,
  CaptureProductRecord,
  CaptureRepository,
  CaptureRepositoryDependencies,
  RecentLotsQuery,
  SaveLotInput,
} from "./repository";
import {
  createInitialObservation,
  nextGeneratedId,
  normalizeProductLookup,
  parseLotId,
  parseLotInput,
  parseObservationInput,
  parseProductInput,
  parseRecentLotsQuery,
} from "./repository";

export function createMemoryCaptureRepository(
  dependencies: CaptureRepositoryDependencies,
): CaptureRepository {
  const products = new Map<string, CaptureProductRecord>();
  const lots = new Map<string, CaptureLotSnapshot>();
  const observations = new Map<string, CaptureObservationRecord[]>();

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

  return {
    initialize,
    createProduct,
    findProducts,
    saveLot,
    appendObservation,
    listRecentLots,
    loadLotDetail,
  };
}
