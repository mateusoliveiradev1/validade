import {
  DEFAULT_EVIDENCE_RETENTION_DAYS,
  EVIDENCE_ASSET_STATES,
  EVIDENCE_UPLOAD_STATES,
} from "@validade-zero/domain";
import { z } from "zod";

const IdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(240);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i, "Expected a SHA-256 hex digest.");

export const EVIDENCE_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const EVIDENCE_MAX_SIZE_BYTES = 8 * 1024 * 1024;

export const EvidenceAssetStateSchema = z.enum(EVIDENCE_ASSET_STATES);
export const EvidenceUploadStateSchema = z.enum(EVIDENCE_UPLOAD_STATES);

export const EvidenceTargetSchema = z
  .object({
    type: z.enum(["task", "lot", "markdown", "shift"]),
    id: IdentifierSchema,
    label: RequiredTextSchema.optional(),
  })
  .strict();

export const EvidenceUploadIntentRequestSchema = metadataOnly(
  z
    .object({
      localEvidenceId: IdentifierSchema,
      storeId: IdentifierSchema,
      target: EvidenceTargetSchema,
      mimeType: z.enum(EVIDENCE_ALLOWED_MIME_TYPES),
      sizeBytes: z.number().int().positive().max(EVIDENCE_MAX_SIZE_BYTES),
      sha256: Sha256Schema,
      capturedAt: IsoDateTimeSchema,
      idempotencyKey: IdentifierSchema,
    })
    .strict(),
);

export const EvidenceAssetMetadataSchema = metadataOnly(
  z
    .object({
      assetId: IdentifierSchema,
      localEvidenceId: IdentifierSchema,
      storeId: IdentifierSchema,
      target: EvidenceTargetSchema,
      state: EvidenceAssetStateSchema,
      mimeType: z.enum(EVIDENCE_ALLOWED_MIME_TYPES),
      sizeBytes: z.number().int().positive().max(EVIDENCE_MAX_SIZE_BYTES),
      sha256: Sha256Schema,
      author: z
        .object({
          actorId: IdentifierSchema,
          displayName: RequiredTextSchema,
          roleSnapshot: z.enum(["collaborator", "lead", "admin"]),
        })
        .strict(),
      capturedAt: IsoDateTimeSchema,
      uploadRequestedAt: IsoDateTimeSchema,
      uploadedAt: IsoDateTimeSchema.optional(),
      retentionDays: z.literal(DEFAULT_EVIDENCE_RETENTION_DAYS),
      retentionExpiresAt: IsoDateTimeSchema,
      invalidatedAt: IsoDateTimeSchema.optional(),
      invalidatedBy: IdentifierSchema.optional(),
      invalidationReason: RequiredTextSchema.optional(),
      replacementAssetId: IdentifierSchema.optional(),
      expiredAt: IsoDateTimeSchema.optional(),
    })
    .strict()
    .superRefine((value, context) => {
      if (value.state === "uploaded" && value.uploadedAt === undefined) {
        context.addIssue({
          code: "custom",
          path: ["uploadedAt"],
          message: "Uploaded evidence requires central acknowledgement time.",
        });
      }

      if (
        value.state === "invalidated" &&
        (value.invalidatedAt === undefined ||
          value.invalidatedBy === undefined ||
          value.invalidationReason === undefined)
      ) {
        context.addIssue({
          code: "custom",
          path: ["invalidationReason"],
          message: "Invalidated evidence requires actor, time, and reason.",
        });
      }

      if (value.state === "expired" && value.expiredAt === undefined) {
        context.addIssue({
          code: "custom",
          path: ["expiredAt"],
          message: "Expired evidence requires the reconciliation time.",
        });
      }
    }),
);

export const EvidenceUploadIntentResponseSchema = z
  .object({
    evidence: EvidenceAssetMetadataSchema,
    uploadPath: z.string().regex(/^\/evidence\/assets\/[^/]+\/content$/),
    replayed: z.boolean(),
  })
  .strict();

export const EvidenceUploadAckSchema = z
  .object({
    assetId: IdentifierSchema,
    state: z.literal("uploaded"),
    uploadedAt: IsoDateTimeSchema,
    retentionExpiresAt: IsoDateTimeSchema,
    replayed: z.boolean(),
  })
  .strict();

export const EvidenceInvalidationRequestSchema = metadataOnly(
  z
    .object({
      storeId: IdentifierSchema,
      reason: RequiredTextSchema,
      replacementAssetId: IdentifierSchema.optional(),
      occurredAt: IsoDateTimeSchema,
      idempotencyKey: IdentifierSchema,
    })
    .strict(),
);

export const EvidenceExceptionalAccessRequestSchema = z
  .object({
    storeId: IdentifierSchema,
    confirmedTargetStore: z.boolean(),
    reason: RequiredTextSchema,
  })
  .strict();

export type EvidenceTarget = z.infer<typeof EvidenceTargetSchema>;
export type EvidenceUploadState = z.infer<typeof EvidenceUploadStateSchema>;
export type EvidenceUploadIntentRequest = z.infer<typeof EvidenceUploadIntentRequestSchema>;
export type EvidenceAssetMetadata = z.infer<typeof EvidenceAssetMetadataSchema>;
export type EvidenceUploadIntentResponse = z.infer<typeof EvidenceUploadIntentResponseSchema>;
export type EvidenceUploadAck = z.infer<typeof EvidenceUploadAckSchema>;
export type EvidenceInvalidationRequest = z.infer<typeof EvidenceInvalidationRequestSchema>;

const FORBIDDEN_EVIDENCE_FIELD_NAMES = new Set([
  "uri",
  "localUri",
  "photoUri",
  "bytes",
  "imageBytes",
  "base64",
  "objectKey",
  "signedUrl",
  "url",
]);

function metadataOnly<TSchema extends z.ZodType>(schema: TSchema) {
  return schema.superRefine((value, context) => rejectRawEvidenceFields(value, context));
}

function rejectRawEvidenceFields(
  value: unknown,
  context: z.RefinementCtx,
  path: (string | number)[] = [],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectRawEvidenceFields(item, context, [...path, index]));
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];

    if (FORBIDDEN_EVIDENCE_FIELD_NAMES.has(key)) {
      context.addIssue({
        code: "custom",
        path: nextPath,
        message: `Evidence metadata must not carry '${key}'.`,
      });
    }

    rejectRawEvidenceFields(nestedValue, context, nextPath);
  }
}
