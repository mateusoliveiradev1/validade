import { describe, expect, it } from "vitest";
import {
  CompletedEvidenceMetadataSchema,
  MarkdownApplicationCommandSchema,
  MarkdownApprovalCommandSchema,
  MarkdownRequestCommandSchema,
  MarkdownShelfConfirmationCommandSchema,
  MarkdownWorkflowRecordSchema,
} from "./markdown";

const occurredAt = "2030-01-10T09:00:00.000Z";
const noPhotoEvidence = {
  kind: "no_photo_reason",
  reason: "Camera indisponivel",
} as const;
const photoEvidence = { kind: "photo_recorded_placeholder" } as const;

const baseRecord = {
  id: "markdown-ficticio-001",
  lotId: "lote-ficticio-001",
  status: "requested",
  currentStage: "requested",
  requestedAt: occurredAt,
  requestedBy: "Colaboradora FICTICIA",
  requestReason: "rule_window",
  stageHistory: [
    {
      stage: "requested",
      action: "request_markdown",
      actorLabel: "Colaboradora FICTICIA",
      occurredAt,
      reason: "Janela de rebaixa",
    },
  ],
  createdAt: occurredAt,
  updatedAt: occurredAt,
} as const;

describe("markdown workflow contracts", () => {
  it("parses a strict workflow record and rejects unknown fields", () => {
    expect(MarkdownWorkflowRecordSchema.parse(baseRecord)).toEqual(baseRecord);
    expect(() =>
      MarkdownWorkflowRecordSchema.parse({
        ...baseRecord,
        erpPriceChanged: true,
      }),
    ).toThrow();
  });

  it("requires early justification for exception requests", () => {
    expect(
      MarkdownRequestCommandSchema.parse({
        lotId: "lote-ficticio-001",
        actorLabel: "Colaboradora FICTICIA",
        occurredAt,
        reason: "excess_stock",
        earlyJustification: "Excesso de estoque observado",
      }),
    ).toMatchObject({ reason: "excess_stock" });
    expect(() =>
      MarkdownRequestCommandSchema.parse({
        lotId: "lote-ficticio-001",
        actorLabel: "Colaboradora FICTICIA",
        occurredAt,
        reason: "quality_issue",
      }),
    ).toThrow();
  });

  it("requires rejection reason while keeping approval clean", () => {
    expect(
      MarkdownApprovalCommandSchema.parse({
        workflowId: "markdown-ficticio-001",
        taskId: "tarefa-ficticia-001",
        actorLabel: "Lideranca FICTICIA",
        occurredAt,
        decision: "approved",
      }),
    ).toMatchObject({ decision: "approved" });
    expect(() =>
      MarkdownApprovalCommandSchema.parse({
        workflowId: "markdown-ficticio-001",
        taskId: "tarefa-ficticia-001",
        actorLabel: "Lideranca FICTICIA",
        occurredAt,
        decision: "approved",
        rejectionReason: "Nao deve existir",
      }),
    ).toThrow();
    expect(() =>
      MarkdownApprovalCommandSchema.parse({
        workflowId: "markdown-ficticio-001",
        taskId: "tarefa-ficticia-001",
        actorLabel: "Lideranca FICTICIA",
        occurredAt,
        decision: "rejected",
      }),
    ).toThrow();
  });

  it("requires completed evidence for application and shelf confirmation", () => {
    expect(CompletedEvidenceMetadataSchema.parse(photoEvidence)).toEqual(photoEvidence);
    expect(CompletedEvidenceMetadataSchema.parse(noPhotoEvidence)).toEqual(noPhotoEvidence);
    expect(() => CompletedEvidenceMetadataSchema.parse({ kind: "photo_pending" })).toThrow();
    expect(
      MarkdownApplicationCommandSchema.parse({
        workflowId: "markdown-ficticio-001",
        taskId: "tarefa-ficticia-002",
        actorLabel: "Equipe do turno",
        occurredAt,
        evidence: photoEvidence,
      }),
    ).toMatchObject({ evidence: photoEvidence });
    expect(
      MarkdownShelfConfirmationCommandSchema.parse({
        workflowId: "markdown-ficticio-001",
        taskId: "tarefa-ficticia-003",
        actorLabel: "Equipe do turno",
        occurredAt,
        evidence: noPhotoEvidence,
      }),
    ).toMatchObject({ evidence: noPhotoEvidence });
    expect(() =>
      MarkdownApplicationCommandSchema.parse({
        workflowId: "markdown-ficticio-001",
        taskId: "tarefa-ficticia-002",
        actorLabel: "Equipe do turno",
        occurredAt,
      }),
    ).toThrow();
    expect(() =>
      MarkdownShelfConfirmationCommandSchema.parse({
        workflowId: "markdown-ficticio-001",
        taskId: "tarefa-ficticia-003",
        actorLabel: "Equipe do turno",
        occurredAt,
        evidence: { kind: "photo_pending" },
      }),
    ).toThrow();
  });

  it.each(["uri", "base64", "objectKey", "photoUri", "imageBytes"] as const)(
    "rejects unsafe evidence field %s",
    (field) => {
      expect(() =>
        MarkdownApplicationCommandSchema.parse({
          workflowId: "markdown-ficticio-001",
          taskId: "tarefa-ficticia-002",
          actorLabel: "Equipe do turno",
          occurredAt,
          evidence: {
            kind: "photo_recorded_placeholder",
            [field]: "valor-ficticio",
          },
        }),
      ).toThrow();
      expect(() =>
        MarkdownWorkflowRecordSchema.parse({
          ...baseRecord,
          status: "applied",
          currentStage: "applied",
          applicationEvidence: {
            kind: "photo_recorded_placeholder",
            [field]: "valor-ficticio",
          },
        }),
      ).toThrow();
    },
  );
});
