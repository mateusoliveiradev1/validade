import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVIDENCE_RETENTION_DAYS,
  deriveEvidenceRetentionExpiresAt,
  isCentrallyAvailableEvidence,
  transitionEvidenceState,
} from "./evidence";

describe("evidence lifecycle", () => {
  it("only treats a centrally acknowledged upload as available evidence", () => {
    expect(isCentrallyAvailableEvidence("upload_requested")).toBe(false);
    expect(isCentrallyAvailableEvidence("uploading")).toBe(false);
    expect(isCentrallyAvailableEvidence("failed")).toBe(false);
    expect(isCentrallyAvailableEvidence("uploaded")).toBe(true);
    expect(isCentrallyAvailableEvidence("invalidated")).toBe(false);
    expect(isCentrallyAvailableEvidence("expired")).toBe(false);
  });

  it("supports retry, acknowledgement, invalidation, and expiry without rewriting history", () => {
    expect(transitionEvidenceState("upload_requested", "uploading")).toBe("uploading");
    expect(transitionEvidenceState("uploading", "failed")).toBe("failed");
    expect(transitionEvidenceState("failed", "uploading")).toBe("uploading");
    expect(transitionEvidenceState("uploading", "uploaded")).toBe("uploaded");
    expect(transitionEvidenceState("uploaded", "invalidated")).toBe("invalidated");
    expect(transitionEvidenceState("invalidated", "expired")).toBe("expired");
    expect(() => transitionEvidenceState("upload_requested", "uploaded")).toThrow(
      "Evidence cannot transition",
    );
  });

  it("derives the pilot retention deadline from the central upload time", () => {
    expect(DEFAULT_EVIDENCE_RETENTION_DAYS).toBe(90);
    expect(deriveEvidenceRetentionExpiresAt("2030-01-01T12:00:00.000Z")).toBe(
      "2030-04-01T12:00:00.000Z",
    );
  });
});
