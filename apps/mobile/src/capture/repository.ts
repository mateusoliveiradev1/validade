import {
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  PhysicalObservationInputSchema,
  type CaptureLotInput,
  type CaptureProductInput,
  type OperationalLocation,
  type PhysicalObservationInput,
} from "@validade-zero/contracts";

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

function validateActorLabel(value: string): string {
  const parsed = value.trim();

  if (parsed.length === 0 || parsed.length > 160) {
    throw new Error("An actor label must contain between 1 and 160 characters.");
  }

  return parsed;
}
