import { describe, expect, it } from "vitest";
import {
  createEvidenceUploadRunner,
  type EvidenceUploadApiClient,
  type EvidenceUploadRepository,
  type LocalEvidenceBlob,
} from "./evidence-upload";
import type { EvidenceUploadQueueRecord } from "./repository";

const queued: EvidenceUploadQueueRecord = {
  localEvidenceId: "local-evidence-001",
  taskId: "task-001",
  storeId: "loja-piloto",
  target: { type: "task", id: "task-001", label: "Ovos FICTICIOS" },
  localUri: "file:///device/private/evidence-001.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 5,
  sha256: "a".repeat(64),
  capturedAt: "2030-01-10T12:00:00.000Z",
  state: "waiting_upload",
  createdAt: "2030-01-10T12:00:00.000Z",
  updatedAt: "2030-01-10T12:00:00.000Z",
  attemptCount: 0,
};

const localBlob: LocalEvidenceBlob = {
  bytes: new Uint8Array([1, 2, 3, 4, 5]),
  mimeType: "image/jpeg",
  sizeBytes: 5,
  sha256: "a".repeat(64),
};

describe("evidence upload runner", () => {
  it("keeps local URI out of intent metadata and marks uploaded only after ack", async () => {
    const repository = createFakeEvidenceUploadRepository([queued]);
    const intentRequests: unknown[] = [];
    const client: EvidenceUploadApiClient = {
      createUploadIntent(request) {
        intentRequests.push(request);

        return Promise.resolve({
          evidence: {
            assetId: "evidence-001",
            localEvidenceId: request.localEvidenceId,
            storeId: request.storeId,
            target: request.target,
            state: "upload_requested",
            mimeType: request.mimeType,
            sizeBytes: request.sizeBytes,
            sha256: request.sha256,
            author: {
              actorId: "collaborator-local",
              displayName: "Colaborador local",
              roleSnapshot: "collaborator",
            },
            capturedAt: request.capturedAt,
            uploadRequestedAt: "2030-01-10T12:00:01.000Z",
            retentionDays: 90,
            retentionExpiresAt: "2030-04-10T12:00:02.000Z",
          },
          uploadPath: "/evidence/assets/evidence-001/content",
          replayed: false,
        });
      },
      uploadContent(input) {
        expect(input.bytes).toEqual(localBlob.bytes);

        return Promise.resolve({
          assetId: input.assetId,
          state: "uploaded",
          uploadedAt: "2030-01-10T12:00:02.000Z",
          retentionExpiresAt: "2030-04-10T12:00:02.000Z",
          replayed: false,
        });
      },
    };

    const result = await createEvidenceUploadRunner({
      repository,
      client,
      readLocalEvidence: () => Promise.resolve(localBlob),
      now: createClock([
        "2030-01-10T12:00:01.000Z",
        "2030-01-10T12:00:01.500Z",
        "2030-01-10T12:00:02.000Z",
      ]),
    }).runOnce();

    expect(result).toEqual({ checked: 1, uploaded: 1, failed: 0, skipped: 0 });
    expect(JSON.stringify(intentRequests)).not.toContain("file:///device/private");
    expect(repository.read("local-evidence-001")).toMatchObject({
      state: "uploaded",
      assetId: "evidence-001",
      uploadedAt: "2030-01-10T12:00:02.000Z",
      attemptCount: 1,
    });
  });

  it("keeps failed uploads persisted for deterministic retry", async () => {
    const repository = createFakeEvidenceUploadRepository([queued]);
    const runner = createEvidenceUploadRunner({
      repository,
      client: {
        createUploadIntent() {
          throw new Error("network unavailable");
        },
        uploadContent() {
          throw new Error("should not upload without intent");
        },
      },
      readLocalEvidence: () => Promise.resolve(localBlob),
      now: () => "2030-01-10T12:01:00.000Z",
    });

    await expect(runner.runOnce()).resolves.toEqual({
      checked: 1,
      uploaded: 0,
      failed: 1,
      skipped: 0,
    });
    expect(repository.read("local-evidence-001")).toMatchObject({
      state: "failed",
      lastError: "network unavailable",
      attemptCount: 1,
    });
  });
});

function createFakeEvidenceUploadRepository(
  records: readonly EvidenceUploadQueueRecord[],
): EvidenceUploadRepository & {
  read(localEvidenceId: string): EvidenceUploadQueueRecord | undefined;
} {
  const uploads = new Map(records.map((record) => [record.localEvidenceId, record]));

  function update(
    localEvidenceId: string,
    updater: (record: EvidenceUploadQueueRecord) => EvidenceUploadQueueRecord,
  ): EvidenceUploadQueueRecord {
    const current = uploads.get(localEvidenceId);

    if (current === undefined) {
      throw new Error(`Missing upload ${localEvidenceId}`);
    }

    const next = updater(current);
    uploads.set(localEvidenceId, next);

    return next;
  }

  return {
    read(localEvidenceId) {
      return uploads.get(localEvidenceId);
    },
    listEvidenceUploads() {
      return Promise.resolve([...uploads.values()]);
    },
    markEvidenceUploadAttempt(localEvidenceId, attemptedAt) {
      return Promise.resolve(
        update(localEvidenceId, (record) => ({
          ...withoutLastError(record),
          state: "uploading",
          updatedAt: attemptedAt,
          attemptCount: record.attemptCount + 1,
        })),
      );
    },
    applyEvidenceUploadIntent(localEvidenceId, response, updatedAt) {
      return Promise.resolve(
        update(localEvidenceId, (record) => ({
          ...record,
          assetId: response.evidence.assetId,
          uploadPath: response.uploadPath,
          state: "uploading",
          retentionExpiresAt: response.evidence.retentionExpiresAt,
          updatedAt,
        })),
      );
    },
    applyEvidenceUploadAck(localEvidenceId, ack, updatedAt) {
      return Promise.resolve(
        update(localEvidenceId, (record) => ({
          ...withoutLastError(record),
          assetId: ack.assetId,
          state: "uploaded",
          uploadedAt: ack.uploadedAt,
          retentionExpiresAt: ack.retentionExpiresAt,
          updatedAt,
        })),
      );
    },
    markEvidenceUploadFailed(localEvidenceId, error, failedAt) {
      return Promise.resolve(
        update(localEvidenceId, (record) => ({
          ...record,
          state: "failed",
          lastError: error,
          updatedAt: failedAt,
        })),
      );
    },
  };
}

function withoutLastError(
  record: EvidenceUploadQueueRecord,
): Omit<EvidenceUploadQueueRecord, "lastError"> {
  const { lastError: _lastError, ...rest } = record;
  void _lastError;

  return rest;
}

function createClock(values: readonly string[]): () => string {
  let index = 0;

  return () => values[Math.min(index++, values.length - 1)] ?? values[values.length - 1];
}
