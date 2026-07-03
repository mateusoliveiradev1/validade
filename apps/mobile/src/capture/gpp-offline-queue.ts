import {
  GppAvariaCreateRequestSchema,
  GppPurchaseCreateRequestSchema,
  type GppAvariaCreateRequest,
  type GppPurchaseCreateRequest,
} from "@validade-zero/contracts";

export type GppPendingKind = "avaria" | "purchase";
export type GppPendingState =
  | "pending_retry"
  | "retrying"
  | "central_confirmed"
  | "conflict"
  | "discarded";

export type GppPendingPayload =
  | GppAvariaCreateRequest
  | GppPurchaseCreateRequest;

export interface GppPendingRecord {
  localId: string;
  kind: GppPendingKind;
  payload: GppPendingPayload;
  idempotencyKey: string;
  state: GppPendingState;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  lastAttemptedAt?: string | undefined;
  confirmedAt?: string | undefined;
  centralRequestId?: string | undefined;
  conflictReason?: string | undefined;
  discardJustification?: string | undefined;
  discardedAt?: string | undefined;
}

export interface SaveGppPendingInput {
  localId?: string | undefined;
  kind: GppPendingKind;
  payload: GppPendingPayload;
}

export interface MarkGppPendingAttemptInput {
  localId: string;
  attemptedAt: string;
  failureReason?: string | undefined;
}

export interface MarkGppPendingConfirmedInput {
  localId: string;
  confirmedAt: string;
  centralRequestId?: string | undefined;
}

export interface MarkGppPendingConflictInput {
  localId: string;
  occurredAt: string;
  reason: string;
}

export interface DiscardGppPendingInput {
  localId: string;
  discardedAt: string;
  justification: string;
}

export interface GppPendingRepository {
  saveGppPending(input: SaveGppPendingInput): Promise<GppPendingRecord>;
  listGppPending(): Promise<readonly GppPendingRecord[]>;
  loadGppPending(localId: string): Promise<GppPendingRecord | null>;
  markGppPendingAttempt(input: MarkGppPendingAttemptInput): Promise<GppPendingRecord>;
  markGppPendingConfirmed(input: MarkGppPendingConfirmedInput): Promise<GppPendingRecord>;
  markGppPendingConflict(input: MarkGppPendingConflictInput): Promise<GppPendingRecord>;
  discardGppPending(input: DiscardGppPendingInput): Promise<GppPendingRecord>;
}

export function parseGppPendingPayload(
  kind: GppPendingKind,
  payload: GppPendingPayload,
): GppPendingPayload {
  return kind === "avaria"
    ? GppAvariaCreateRequestSchema.parse(payload)
    : GppPurchaseCreateRequestSchema.parse(payload);
}

export function createGppPendingRecord(input: {
  localId: string;
  kind: GppPendingKind;
  payload: GppPendingPayload;
  now: string;
}): GppPendingRecord {
  const payload = parseGppPendingPayload(input.kind, input.payload);
  return {
    localId: input.localId,
    kind: input.kind,
    payload,
    idempotencyKey: payload.idempotencyKey,
    state: "pending_retry",
    attemptCount: 0,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function upsertGppPendingByIdempotency(
  records: readonly GppPendingRecord[],
  candidate: GppPendingRecord,
): readonly GppPendingRecord[] {
  const existingIndex = records.findIndex(
    (record) => record.idempotencyKey === candidate.idempotencyKey,
  );
  if (existingIndex === -1) return [...records, candidate];
  return records.map((record, index) => (index === existingIndex ? record : record));
}

export function sortGppPendingRecords(
  records: Iterable<GppPendingRecord>,
): GppPendingRecord[] {
  return [...records].sort((left, right) =>
    left.createdAt === right.createdAt
      ? left.localId.localeCompare(right.localId)
      : left.createdAt.localeCompare(right.createdAt),
  );
}
