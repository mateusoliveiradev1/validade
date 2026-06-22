import { describe, expect, it } from "vitest";
import {
  EVIDENCE_MAX_SIZE_BYTES,
  EvidenceAssetMetadataSchema,
  EvidenceUploadIntentRequestSchema,
} from "./evidence";

const intent = {
  localEvidenceId: "local-evidence-001",
  storeId: "loja-piloto",
  target: { type: "task", id: "task-001", label: "Ovos FICTICIOS" },
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  sha256: "a".repeat(64),
  capturedAt: "2030-01-10T12:00:00.000Z",
  idempotencyKey: "evidence:local-evidence-001",
} as const;

describe("evidence contracts", () => {
  it("accepts strict metadata-only upload intent", () => {
    expect(EvidenceUploadIntentRequestSchema.parse(intent)).toEqual(intent);
  });

  it.each(["localUri", "uri", "bytes", "base64", "objectKey", "signedUrl"])(
    "rejects raw evidence/storage field %s",
    (field) => {
      expect(
        EvidenceUploadIntentRequestSchema.safeParse({ ...intent, [field]: "forbidden" }).success,
      ).toBe(false);
    },
  );

  it("rejects unsupported MIME and oversized content", () => {
    expect(
      EvidenceUploadIntentRequestSchema.safeParse({ ...intent, mimeType: "image/gif" }).success,
    ).toBe(false);
    expect(
      EvidenceUploadIntentRequestSchema.safeParse({
        ...intent,
        sizeBytes: EVIDENCE_MAX_SIZE_BYTES + 1,
      }).success,
    ).toBe(false);
  });

  it("does not allow a local request to claim central upload acknowledgement", () => {
    const metadata = {
      assetId: "evidence-001",
      localEvidenceId: intent.localEvidenceId,
      storeId: intent.storeId,
      target: intent.target,
      state: "uploaded",
      mimeType: intent.mimeType,
      sizeBytes: intent.sizeBytes,
      sha256: intent.sha256,
      author: {
        actorId: "collaborator-local",
        displayName: "Colaborador local",
        roleSnapshot: "collaborator",
      },
      capturedAt: intent.capturedAt,
      uploadRequestedAt: "2030-01-10T12:00:01.000Z",
      retentionDays: 90,
      retentionExpiresAt: "2030-04-10T12:00:01.000Z",
    };

    expect(EvidenceAssetMetadataSchema.safeParse(metadata).success).toBe(false);
    expect(
      EvidenceAssetMetadataSchema.safeParse({
        ...metadata,
        uploadedAt: "2030-01-10T12:00:02.000Z",
      }).success,
    ).toBe(true);
  });
});
