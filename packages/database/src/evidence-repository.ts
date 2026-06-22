import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { EvidenceAssetState } from "@validade-zero/domain";

export interface EvidenceAssetPersistenceRecord {
  assetId: string;
  idempotencyKey: string;
  localEvidenceId: string;
  storeId: string;
  targetType: "task" | "lot" | "markdown" | "shift";
  targetId: string;
  targetLabel?: string;
  objectKey: string;
  state: EvidenceAssetState;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  sha256: string;
  authorId: string;
  authorDisplayName: string;
  authorRoleSnapshot: "collaborator" | "lead" | "admin";
  capturedAt: Date;
  uploadRequestedAt: Date;
  uploadedAt?: Date;
  invalidatedAt?: Date;
  invalidatedBy?: string;
  invalidationReason?: string;
  replacementAssetId?: string;
  retentionDays: number;
  retentionExpiresAt: Date;
  expiredAt?: Date;
  lastError?: string;
}

export type CreateEvidenceAssetInput = EvidenceAssetPersistenceRecord;

export interface EvidenceRepository {
  createRequested(input: CreateEvidenceAssetInput): Promise<{
    evidence: EvidenceAssetPersistenceRecord;
    replayed: boolean;
  }>;
  findByAssetId(input: {
    assetId: string;
    storeId: string;
  }): Promise<EvidenceAssetPersistenceRecord | undefined>;
  markUploading(input: {
    assetId: string;
    storeId: string;
  }): Promise<EvidenceAssetPersistenceRecord>;
  markUploaded(input: {
    assetId: string;
    storeId: string;
    uploadedAt: Date;
  }): Promise<EvidenceAssetPersistenceRecord>;
  markFailed(input: {
    assetId: string;
    storeId: string;
    error: string;
  }): Promise<EvidenceAssetPersistenceRecord>;
  invalidate(input: {
    assetId: string;
    storeId: string;
    invalidatedAt: Date;
    invalidatedBy: string;
    reason: string;
    replacementAssetId?: string;
  }): Promise<EvidenceAssetPersistenceRecord>;
  listExpiredCandidates(referenceTime: Date): Promise<readonly EvidenceAssetPersistenceRecord[]>;
  markExpired(input: {
    assetId: string;
    storeId: string;
    expiredAt: Date;
  }): Promise<EvidenceAssetPersistenceRecord>;
}

interface EvidenceRow {
  asset_id: string;
  idempotency_key: string;
  local_evidence_id: string;
  store_id: string;
  target_type: EvidenceAssetPersistenceRecord["targetType"];
  target_id: string;
  target_label: string | null;
  object_key: string;
  state: EvidenceAssetState;
  mime_type: EvidenceAssetPersistenceRecord["mimeType"];
  size_bytes: number;
  sha256: string;
  author_id: string;
  author_display_name: string;
  author_role_snapshot: EvidenceAssetPersistenceRecord["authorRoleSnapshot"];
  captured_at: string | Date;
  upload_requested_at: string | Date;
  uploaded_at: string | Date | null;
  invalidated_at: string | Date | null;
  invalidated_by: string | null;
  invalidation_reason: string | null;
  replacement_asset_id: string | null;
  retention_days: number;
  retention_expires_at: string | Date;
  expired_at: string | Date | null;
  last_error: string | null;
}

const SELECT_COLUMNS = `
  asset_id, idempotency_key, local_evidence_id, store_id, target_type, target_id,
  target_label, object_key, state, mime_type, size_bytes, sha256, author_id,
  author_display_name, author_role_snapshot, captured_at, upload_requested_at,
  uploaded_at, invalidated_at, invalidated_by, invalidation_reason,
  replacement_asset_id, retention_days, retention_expires_at, expired_at, last_error
`;

export function createNeonEvidenceRepository(input: {
  connectionString: string;
}): EvidenceRepository {
  return createEvidenceRepositoryFromQuery(neon(input.connectionString));
}

export function createEvidenceRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
): EvidenceRepository {
  async function findByAssetId(input: {
    assetId: string;
    storeId: string;
  }): Promise<EvidenceAssetPersistenceRecord | undefined> {
    const rows = (await sql.query(
      `select ${SELECT_COLUMNS} from evidence_assets where asset_id = $1 and store_id = $2 limit 1`,
      [input.assetId, input.storeId],
    )) as EvidenceRow[];

    return rows[0] === undefined ? undefined : mapEvidenceRow(rows[0]);
  }

  async function requireScoped(input: {
    assetId: string;
    storeId: string;
  }): Promise<EvidenceAssetPersistenceRecord> {
    const evidence = await findByAssetId(input);

    if (evidence === undefined) {
      throw new Error("Evidence is unavailable in the authorized store scope.");
    }

    return evidence;
  }

  async function updateState(input: {
    assetId: string;
    storeId: string;
    state: EvidenceAssetState;
    uploadedAt?: Date;
    lastError?: string | null;
    invalidatedAt?: Date;
    invalidatedBy?: string;
    invalidationReason?: string;
    replacementAssetId?: string;
    expiredAt?: Date;
  }): Promise<EvidenceAssetPersistenceRecord> {
    await sql.query(
      `update evidence_assets
       set state = $3,
           uploaded_at = coalesce($4::timestamptz, uploaded_at),
           last_error = $5,
           invalidated_at = coalesce($6::timestamptz, invalidated_at),
           invalidated_by = coalesce($7, invalidated_by),
           invalidation_reason = coalesce($8, invalidation_reason),
           replacement_asset_id = coalesce($9, replacement_asset_id),
           expired_at = coalesce($10::timestamptz, expired_at)
       where asset_id = $1 and store_id = $2`,
      [
        input.assetId,
        input.storeId,
        input.state,
        input.uploadedAt?.toISOString() ?? null,
        input.lastError ?? null,
        input.invalidatedAt?.toISOString() ?? null,
        input.invalidatedBy ?? null,
        input.invalidationReason ?? null,
        input.replacementAssetId ?? null,
        input.expiredAt?.toISOString() ?? null,
      ],
    );

    return requireScoped(input);
  }

  return {
    async createRequested(input) {
      const existingRows = (await sql.query(
        `select ${SELECT_COLUMNS} from evidence_assets where idempotency_key = $1 and store_id = $2 limit 1`,
        [input.idempotencyKey, input.storeId],
      )) as EvidenceRow[];
      const existing = existingRows[0];

      if (existing !== undefined) {
        return { evidence: mapEvidenceRow(existing), replayed: true };
      }

      await sql.query(
        `insert into evidence_assets (
          asset_id, idempotency_key, local_evidence_id, store_id, target_type, target_id,
          target_label, object_key, state, mime_type, size_bytes, sha256, author_id,
          author_display_name, author_role_snapshot, captured_at, upload_requested_at,
          retention_days, retention_expires_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19
        ) on conflict (idempotency_key) do nothing`,
        [
          input.assetId,
          input.idempotencyKey,
          input.localEvidenceId,
          input.storeId,
          input.targetType,
          input.targetId,
          input.targetLabel ?? null,
          input.objectKey,
          input.state,
          input.mimeType,
          input.sizeBytes,
          input.sha256,
          input.authorId,
          input.authorDisplayName,
          input.authorRoleSnapshot,
          input.capturedAt.toISOString(),
          input.uploadRequestedAt.toISOString(),
          input.retentionDays,
          input.retentionExpiresAt.toISOString(),
        ],
      );

      return { evidence: await requireScoped(input), replayed: false };
    },
    findByAssetId,
    markUploading(input) {
      return updateState({ ...input, state: "uploading" });
    },
    markUploaded(input) {
      return updateState({ ...input, state: "uploaded", uploadedAt: input.uploadedAt });
    },
    markFailed(input) {
      return updateState({ ...input, state: "failed", lastError: input.error });
    },
    invalidate(input) {
      return updateState({
        ...input,
        state: "invalidated",
        invalidatedAt: input.invalidatedAt,
        invalidatedBy: input.invalidatedBy,
        invalidationReason: input.reason,
        ...(input.replacementAssetId === undefined
          ? {}
          : { replacementAssetId: input.replacementAssetId }),
      });
    },
    async listExpiredCandidates(referenceTime) {
      const rows = (await sql.query(
        `select ${SELECT_COLUMNS}
         from evidence_assets
         where state in ('uploaded', 'invalidated') and retention_expires_at <= $1
         order by retention_expires_at asc`,
        [referenceTime.toISOString()],
      )) as EvidenceRow[];

      return rows.map(mapEvidenceRow);
    },
    markExpired(input) {
      return updateState({ ...input, state: "expired", expiredAt: input.expiredAt });
    },
  };
}

function mapEvidenceRow(row: EvidenceRow): EvidenceAssetPersistenceRecord {
  return {
    assetId: row.asset_id,
    idempotencyKey: row.idempotency_key,
    localEvidenceId: row.local_evidence_id,
    storeId: row.store_id,
    targetType: row.target_type,
    targetId: row.target_id,
    ...(row.target_label === null ? {} : { targetLabel: row.target_label }),
    objectKey: row.object_key,
    state: row.state,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    authorId: row.author_id,
    authorDisplayName: row.author_display_name,
    authorRoleSnapshot: row.author_role_snapshot,
    capturedAt: toDate(row.captured_at),
    uploadRequestedAt: toDate(row.upload_requested_at),
    ...(row.uploaded_at === null ? {} : { uploadedAt: toDate(row.uploaded_at) }),
    ...(row.invalidated_at === null ? {} : { invalidatedAt: toDate(row.invalidated_at) }),
    ...(row.invalidated_by === null ? {} : { invalidatedBy: row.invalidated_by }),
    ...(row.invalidation_reason === null ? {} : { invalidationReason: row.invalidation_reason }),
    ...(row.replacement_asset_id === null ? {} : { replacementAssetId: row.replacement_asset_id }),
    retentionDays: row.retention_days,
    retentionExpiresAt: toDate(row.retention_expires_at),
    ...(row.expired_at === null ? {} : { expiredAt: toDate(row.expired_at) }),
    ...(row.last_error === null ? {} : { lastError: row.last_error }),
  };
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
