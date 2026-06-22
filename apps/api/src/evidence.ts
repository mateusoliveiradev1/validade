import {
  createInMemoryEvidenceStore,
  type EvidenceStore,
  type EvidenceStoreBody,
  type EvidenceStoreObject,
} from "@validade-zero/adapters";
import {
  AuditEventRecordSchema,
  EvidenceAssetMetadataSchema,
  EvidenceInvalidationRequestSchema,
  EvidenceUploadAckSchema,
  EvidenceUploadIntentRequestSchema,
  EvidenceUploadIntentResponseSchema,
  type EvidenceAssetMetadata,
  type EvidenceInvalidationRequest,
  type EvidenceUploadAck,
  type EvidenceUploadIntentRequest,
  type EvidenceUploadIntentResponse,
} from "@validade-zero/contracts";
import {
  createNeonEvidenceRepository,
  type CreateEvidenceAssetInput,
  type EvidenceAssetPersistenceRecord,
  type EvidenceRepository,
} from "@validade-zero/database/evidence-repository";
import {
  DEFAULT_EVIDENCE_RETENTION_DAYS,
  deriveEvidenceRetentionExpiresAt,
  transitionEvidenceState,
  type AuthorizedActorContext,
} from "@validade-zero/domain";
import type { AuditEventRepository } from "./audit";

export interface InMemoryEvidenceRepository extends EvidenceRepository {
  readAll(): readonly EvidenceAssetPersistenceRecord[];
}

export interface EvidenceService {
  createUploadIntent(input: {
    actorContext: AuthorizedActorContext;
    request: EvidenceUploadIntentRequest;
  }): Promise<EvidenceUploadIntentResponse>;
  upload(input: {
    actorContext: AuthorizedActorContext;
    assetId: string;
    storeId: string;
    body: EvidenceStoreBody;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  }): Promise<EvidenceUploadAck>;
  read(input: {
    assetId: string;
    storeId: string;
  }): Promise<{ evidence: EvidenceAssetMetadata; object: EvidenceStoreObject } | undefined>;
  invalidate(input: {
    actorContext: AuthorizedActorContext;
    assetId: string;
    request: EvidenceInvalidationRequest;
  }): Promise<EvidenceAssetMetadata>;
  reconcileExpired(referenceTime?: Date): Promise<number>;
}

export function createInMemoryEvidenceRepository(): InMemoryEvidenceRepository {
  const records = new Map<string, EvidenceAssetPersistenceRecord>();

  function scoped(input: {
    assetId: string;
    storeId: string;
  }): EvidenceAssetPersistenceRecord | undefined {
    const evidence = records.get(input.assetId);

    return evidence?.storeId === input.storeId ? evidence : undefined;
  }

  function requireScoped(input: {
    assetId: string;
    storeId: string;
  }): EvidenceAssetPersistenceRecord {
    const evidence = scoped(input);

    if (evidence === undefined) {
      throw new Error("Evidence is unavailable in the authorized store scope.");
    }

    return evidence;
  }

  function replace(
    input: { assetId: string; storeId: string },
    update: (current: EvidenceAssetPersistenceRecord) => EvidenceAssetPersistenceRecord,
  ): EvidenceAssetPersistenceRecord {
    const updated = update(requireScoped(input));
    records.set(updated.assetId, updated);

    return updated;
  }

  return {
    createRequested(input) {
      const existing = [...records.values()].find(
        (record) => record.idempotencyKey === input.idempotencyKey,
      );

      if (existing !== undefined) {
        if (existing.storeId !== input.storeId) {
          throw new Error("Evidence idempotency cannot cross store scope.");
        }

        return Promise.resolve({ evidence: existing, replayed: true });
      }

      records.set(input.assetId, input);
      return Promise.resolve({ evidence: input, replayed: false });
    },
    findByAssetId(input) {
      return Promise.resolve(scoped(input));
    },
    markUploading(input) {
      return Promise.resolve(
        replace(input, (current) => ({
          ...withoutLastError(current),
          state: transitionEvidenceState(current.state, "uploading"),
        })),
      );
    },
    markUploaded(input) {
      return Promise.resolve(
        replace(input, (current) => ({
          ...withoutLastError(current),
          state: transitionEvidenceState(current.state, "uploaded"),
          uploadedAt: input.uploadedAt,
          retentionExpiresAt: new Date(
            deriveEvidenceRetentionExpiresAt(input.uploadedAt.toISOString(), current.retentionDays),
          ),
        })),
      );
    },
    markFailed(input) {
      return Promise.resolve(
        replace(input, (current) => ({
          ...current,
          state: transitionEvidenceState(current.state, "failed"),
          lastError: input.error,
        })),
      );
    },
    invalidate(input) {
      return Promise.resolve(
        replace(input, (current) => ({
          ...current,
          state: transitionEvidenceState(current.state, "invalidated"),
          invalidatedAt: input.invalidatedAt,
          invalidatedBy: input.invalidatedBy,
          invalidationReason: input.reason,
          ...(input.replacementAssetId === undefined
            ? {}
            : { replacementAssetId: input.replacementAssetId }),
        })),
      );
    },
    listExpiredCandidates(referenceTime) {
      return Promise.resolve(
        [...records.values()].filter(
          (record) =>
            (record.state === "uploaded" || record.state === "invalidated") &&
            record.retentionExpiresAt.getTime() <= referenceTime.getTime(),
        ),
      );
    },
    markExpired(input) {
      return Promise.resolve(
        replace(input, (current) => ({
          ...current,
          state: transitionEvidenceState(current.state, "expired"),
          expiredAt: input.expiredAt,
        })),
      );
    },
    readAll() {
      return [...records.values()];
    },
  };
}

export function createDatabaseEvidenceRepository(connectionString: string): EvidenceRepository {
  return createNeonEvidenceRepository({ connectionString });
}

export function createEvidenceService(input: {
  repository?: EvidenceRepository;
  store?: EvidenceStore;
  auditRepository: AuditEventRepository;
  now?: () => Date;
  createId?: () => string;
}): EvidenceService {
  const repository = input.repository ?? createInMemoryEvidenceRepository();
  const store = input.store ?? createInMemoryEvidenceStore();
  const now = input.now ?? (() => new Date());
  const createId = input.createId ?? (() => crypto.randomUUID());

  return {
    async createUploadIntent(request) {
      const parsed = EvidenceUploadIntentRequestSchema.parse(request.request);
      assertActorStore(request.actorContext, parsed.storeId);
      const requestedAt = now();
      const assetId = `evidence-${sanitizeIdentifier(createId())}`;
      const objectKey = `private/${sanitizeIdentifier(parsed.storeId)}/${assetId}`;
      const createInput: CreateEvidenceAssetInput = {
        assetId,
        idempotencyKey: parsed.idempotencyKey,
        localEvidenceId: parsed.localEvidenceId,
        storeId: parsed.storeId,
        targetType: parsed.target.type,
        targetId: parsed.target.id,
        ...(parsed.target.label === undefined ? {} : { targetLabel: parsed.target.label }),
        objectKey,
        state: "upload_requested",
        mimeType: parsed.mimeType,
        sizeBytes: parsed.sizeBytes,
        sha256: parsed.sha256.toLowerCase(),
        authorId: request.actorContext.identity.subjectId,
        authorDisplayName:
          request.actorContext.identity.displayName ?? request.actorContext.membership.subjectId,
        authorRoleSnapshot: request.actorContext.membership.role,
        capturedAt: new Date(parsed.capturedAt),
        uploadRequestedAt: requestedAt,
        retentionDays: DEFAULT_EVIDENCE_RETENTION_DAYS,
        retentionExpiresAt: new Date(
          deriveEvidenceRetentionExpiresAt(
            requestedAt.toISOString(),
            DEFAULT_EVIDENCE_RETENTION_DAYS,
          ),
        ),
      };
      const result = await repository.createRequested(createInput);

      if (!result.replayed) {
        await appendEvidenceAudit(input.auditRepository, {
          evidence: result.evidence,
          actorContext: request.actorContext,
          summary: "Envio de evidencia solicitado.",
          idempotencyKey: `audit:${parsed.idempotencyKey}:requested`,
          occurredAt: parsed.capturedAt,
          receivedAt: requestedAt.toISOString(),
        });
      }

      return EvidenceUploadIntentResponseSchema.parse({
        evidence: toPublicMetadata(result.evidence),
        uploadPath: `/evidence/assets/${result.evidence.assetId}/content`,
        replayed: result.replayed,
      });
    },
    async upload(request) {
      assertActorStore(request.actorContext, request.storeId);
      const evidence = await repository.findByAssetId({
        assetId: request.assetId,
        storeId: request.storeId,
      });

      if (evidence === undefined) {
        throw new Error("Evidence is unavailable in the authorized store scope.");
      }

      if (evidence.state === "uploaded") {
        return EvidenceUploadAckSchema.parse({
          assetId: evidence.assetId,
          state: "uploaded",
          uploadedAt: evidence.uploadedAt?.toISOString(),
          retentionExpiresAt: evidence.retentionExpiresAt.toISOString(),
          replayed: true,
        });
      }

      assertUploadMetadataMatches(evidence, request);
      await repository.markUploading({ assetId: evidence.assetId, storeId: evidence.storeId });

      try {
        await store.put({
          objectKey: evidence.objectKey,
          body: request.body,
          mimeType: evidence.mimeType,
          sizeBytes: evidence.sizeBytes,
          sha256: evidence.sha256,
        });
        const acknowledged = await store.head(evidence.objectKey);

        if (
          acknowledged === undefined ||
          acknowledged.sizeBytes !== evidence.sizeBytes ||
          acknowledged.mimeType !== evidence.mimeType ||
          acknowledged.sha256.toLowerCase() !== evidence.sha256.toLowerCase()
        ) {
          throw new Error("Private evidence store acknowledgement did not match intent metadata.");
        }

        const uploadedAt = now();
        const uploaded = await repository.markUploaded({
          assetId: evidence.assetId,
          storeId: evidence.storeId,
          uploadedAt,
        });
        await appendEvidenceAudit(input.auditRepository, {
          evidence: uploaded,
          actorContext: request.actorContext,
          summary: "Evidencia recebida pelo armazenamento central.",
          idempotencyKey: `audit:${evidence.idempotencyKey}:uploaded`,
          occurredAt: uploadedAt.toISOString(),
          receivedAt: uploadedAt.toISOString(),
        });

        return EvidenceUploadAckSchema.parse({
          assetId: uploaded.assetId,
          state: "uploaded",
          uploadedAt: uploadedAt.toISOString(),
          retentionExpiresAt: uploaded.retentionExpiresAt.toISOString(),
          replayed: false,
        });
      } catch (error) {
        await repository.markFailed({
          assetId: evidence.assetId,
          storeId: evidence.storeId,
          error: "Central evidence upload failed verification.",
        });
        throw error;
      }
    },
    async read(request) {
      const evidence = await repository.findByAssetId(request);

      if (
        evidence === undefined ||
        (evidence.state !== "uploaded" && evidence.state !== "invalidated")
      ) {
        return undefined;
      }

      const object = await store.get(evidence.objectKey);

      return object === undefined ? undefined : { evidence: toPublicMetadata(evidence), object };
    },
    async invalidate(request) {
      const parsed = EvidenceInvalidationRequestSchema.parse(request.request);
      assertActorStore(request.actorContext, parsed.storeId);
      const replacement =
        parsed.replacementAssetId === undefined
          ? undefined
          : await repository.findByAssetId({
              assetId: parsed.replacementAssetId,
              storeId: parsed.storeId,
            });

      if (parsed.replacementAssetId !== undefined && replacement === undefined) {
        throw new Error("Replacement evidence is unavailable in the authorized store scope.");
      }

      const invalidated = await repository.invalidate({
        assetId: request.assetId,
        storeId: parsed.storeId,
        invalidatedAt: new Date(parsed.occurredAt),
        invalidatedBy: request.actorContext.identity.subjectId,
        reason: parsed.reason,
        ...(parsed.replacementAssetId === undefined
          ? {}
          : { replacementAssetId: parsed.replacementAssetId }),
      });
      await appendEvidenceAudit(input.auditRepository, {
        evidence: invalidated,
        actorContext: request.actorContext,
        summary: "Evidencia invalidada pela lideranca.",
        reason: parsed.reason,
        idempotencyKey: `audit:${parsed.idempotencyKey}:invalidated`,
        occurredAt: parsed.occurredAt,
        receivedAt: now().toISOString(),
      });

      return toPublicMetadata(invalidated);
    },
    async reconcileExpired(referenceTime = now()) {
      const candidates = await repository.listExpiredCandidates(referenceTime);

      for (const evidence of candidates) {
        const stored = await store.head(evidence.objectKey);

        if (stored !== undefined) {
          continue;
        }

        await repository.markExpired({
          assetId: evidence.assetId,
          storeId: evidence.storeId,
          expiredAt: referenceTime,
        });
      }

      return candidates.length;
    },
  };
}

function assertActorStore(actorContext: AuthorizedActorContext, storeId: string): void {
  if (actorContext.membership.storeId !== storeId) {
    throw new Error("Evidence operation is outside the authorized store scope.");
  }
}

function assertUploadMetadataMatches(
  evidence: EvidenceAssetPersistenceRecord,
  input: { mimeType: string; sizeBytes: number; sha256: string },
): void {
  if (
    evidence.mimeType !== input.mimeType ||
    evidence.sizeBytes !== input.sizeBytes ||
    evidence.sha256.toLowerCase() !== input.sha256.toLowerCase()
  ) {
    throw new Error("Evidence upload metadata does not match the authorized intent.");
  }
}

function toPublicMetadata(evidence: EvidenceAssetPersistenceRecord): EvidenceAssetMetadata {
  return EvidenceAssetMetadataSchema.parse({
    assetId: evidence.assetId,
    localEvidenceId: evidence.localEvidenceId,
    storeId: evidence.storeId,
    target: {
      type: evidence.targetType,
      id: evidence.targetId,
      ...(evidence.targetLabel === undefined ? {} : { label: evidence.targetLabel }),
    },
    state: evidence.state,
    mimeType: evidence.mimeType,
    sizeBytes: evidence.sizeBytes,
    sha256: evidence.sha256,
    author: {
      actorId: evidence.authorId,
      displayName: evidence.authorDisplayName,
      roleSnapshot: evidence.authorRoleSnapshot,
    },
    capturedAt: evidence.capturedAt.toISOString(),
    uploadRequestedAt: evidence.uploadRequestedAt.toISOString(),
    ...(evidence.uploadedAt === undefined ? {} : { uploadedAt: evidence.uploadedAt.toISOString() }),
    retentionDays: DEFAULT_EVIDENCE_RETENTION_DAYS,
    retentionExpiresAt: evidence.retentionExpiresAt.toISOString(),
    ...(evidence.invalidatedAt === undefined
      ? {}
      : { invalidatedAt: evidence.invalidatedAt.toISOString() }),
    ...(evidence.invalidatedBy === undefined ? {} : { invalidatedBy: evidence.invalidatedBy }),
    ...(evidence.invalidationReason === undefined
      ? {}
      : { invalidationReason: evidence.invalidationReason }),
    ...(evidence.replacementAssetId === undefined
      ? {}
      : { replacementAssetId: evidence.replacementAssetId }),
    ...(evidence.expiredAt === undefined ? {} : { expiredAt: evidence.expiredAt.toISOString() }),
  });
}

async function appendEvidenceAudit(
  repository: AuditEventRepository,
  input: {
    evidence: EvidenceAssetPersistenceRecord;
    actorContext: AuthorizedActorContext;
    summary: string;
    reason?: string;
    idempotencyKey: string;
    occurredAt: string;
    receivedAt: string;
  },
): Promise<void> {
  await repository.append(
    AuditEventRecordSchema.parse({
      eventId: `audit:${sanitizeIdentifier(input.idempotencyKey)}`,
      idempotencyKey: input.idempotencyKey,
      type: "evidence.changed",
      store: {
        storeId: input.evidence.storeId,
        storeName: input.actorContext.membership.storeName,
      },
      actor: {
        actorId: input.actorContext.identity.subjectId,
        displayName:
          input.actorContext.identity.displayName ?? input.actorContext.membership.subjectId,
        roleSnapshot: input.actorContext.membership.role,
      },
      target: {
        type: "evidence",
        id: input.evidence.assetId,
        label: input.evidence.targetLabel ?? "Evidencia operacional",
      },
      occurredAt: input.occurredAt,
      receivedAt: input.receivedAt,
      summary: input.summary,
      ...(input.reason === undefined ? {} : { reason: input.reason }),
      status: input.evidence.state === "invalidated" ? "invalidated" : "received",
      metadata: {
        state: input.evidence.state,
        targetType: input.evidence.targetType,
        targetId: input.evidence.targetId,
        mimeType: input.evidence.mimeType,
        sizeBytes: input.evidence.sizeBytes,
      },
    }),
  );
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 120);

  if (sanitized.length === 0) {
    throw new Error("Evidence identifier cannot be empty after sanitization.");
  }

  return sanitized;
}

function withoutLastError(
  evidence: EvidenceAssetPersistenceRecord,
): Omit<EvidenceAssetPersistenceRecord, "lastError"> {
  const { lastError: _lastError, ...rest } = evidence;
  void _lastError;

  return rest;
}
