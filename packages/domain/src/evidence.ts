export const EVIDENCE_ASSET_STATES = [
  "upload_requested",
  "uploading",
  "uploaded",
  "failed",
  "invalidated",
  "expired",
] as const;

export type EvidenceAssetState = (typeof EVIDENCE_ASSET_STATES)[number];

export const EVIDENCE_UPLOAD_STATES = [
  "waiting_upload",
  "uploading",
  "failed",
  "uploaded",
  "invalidated",
  "expired",
] as const;

export type EvidenceUploadState = (typeof EVIDENCE_UPLOAD_STATES)[number];

export const DEFAULT_EVIDENCE_RETENTION_DAYS = 90;

const ALLOWED_EVIDENCE_TRANSITIONS = {
  upload_requested: ["uploading", "failed"],
  uploading: ["uploaded", "failed"],
  uploaded: ["invalidated", "expired"],
  failed: ["uploading"],
  invalidated: ["expired"],
  expired: [],
} as const satisfies Record<EvidenceAssetState, readonly EvidenceAssetState[]>;

export function transitionEvidenceState(
  current: EvidenceAssetState,
  next: EvidenceAssetState,
): EvidenceAssetState {
  if (current === next) {
    return current;
  }

  if (!(ALLOWED_EVIDENCE_TRANSITIONS[current] as readonly EvidenceAssetState[]).includes(next)) {
    throw new Error(`Evidence cannot transition from ${current} to ${next}.`);
  }

  return next;
}

export function isCentrallyAvailableEvidence(state: EvidenceAssetState): boolean {
  return state === "uploaded";
}

export function deriveEvidenceRetentionExpiresAt(
  uploadedAt: string,
  retentionDays = DEFAULT_EVIDENCE_RETENTION_DAYS,
): string {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error("Evidence retention must be a positive whole number of days.");
  }

  const uploadedAtMs = Date.parse(uploadedAt);

  if (Number.isNaN(uploadedAtMs)) {
    throw new Error("Evidence upload time must be a valid ISO date-time.");
  }

  return new Date(uploadedAtMs + retentionDays * 24 * 60 * 60 * 1000).toISOString();
}
