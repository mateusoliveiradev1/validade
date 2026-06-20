import { describe, expect, it } from "vitest";
import {
  EvidencePromptMetadataSchema,
  TaskResolutionCommandSchema,
  TodayTaskRecordSchema,
} from "./tasks";

const baseTask = {
  id: "tarefa-ficticia-001",
  activeKey: "lote-ficticio-001:expired:withdraw_or_loss:root",
  lotId: "lote-ficticio-001",
  productDisplayName: "Ovos Brancos FICTICIOS",
  lotIdentity: {
    identitySource: "printed",
    value: "OVOS-FICTICIOS-001",
  },
  currentLocation: { kind: "area_de_venda" },
  riskState: "expired",
  severity: "critical",
  dueBucket: "now",
  requiredResolution: "withdraw_or_loss",
  section: "withdraw_now",
  ownerLabel: "Equipe do turno",
  status: "active",
  sourceRisk: {
    state: "expired",
    reasons: [{ code: "expired", field: "expiresAt" }],
  },
  priority: 0,
  createdAt: "2030-01-10T09:00:00.000Z",
  updatedAt: "2030-01-10T09:00:00.000Z",
} as const;

describe("Today task contracts", () => {
  it("validates a strict task record with owner, due, status, source risk, and resolution", () => {
    expect(TodayTaskRecordSchema.parse(baseTask)).toEqual(baseTask);
  });

  it("keeps markdown workflow metadata optional and strict on Today tasks", () => {
    expect(TodayTaskRecordSchema.parse(baseTask)).toEqual(baseTask);
    expect(
      TodayTaskRecordSchema.parse({
        ...baseTask,
        id: "tarefa-ficticia-markdown",
        activeKey: "markdown:markdown-ficticio-001:requested",
        requiredResolution: "approve_markdown",
        section: "request_markdown",
        severity: "medium",
        dueBucket: "today",
        markdownWorkflowId: "markdown-ficticio-001",
        markdownStage: "requested",
      }),
    ).toMatchObject({
      requiredResolution: "approve_markdown",
      markdownWorkflowId: "markdown-ficticio-001",
      markdownStage: "requested",
    });
    expect(() =>
      TodayTaskRecordSchema.parse({
        ...baseTask,
        markdownWorkflowId: "markdown-ficticio-001",
        markdownStage: "shelf_confirmed",
      }),
    ).toThrow();
  });

  it("rejects unknown generic task fields and generic resolved actions", () => {
    expect(() =>
      TodayTaskRecordSchema.parse({
        ...baseTask,
        resolved: true,
      }),
    ).toThrow();
    expect(() =>
      TaskResolutionCommandSchema.parse({
        taskId: "tarefa-ficticia-001",
        action: "resolved",
        actorLabel: "Colaboradora FICTICIA",
        occurredAt: "2030-01-10T09:10:00.000Z",
      }),
    ).toThrow();
  });

  it("validates concrete resolution commands with operational destination metadata", () => {
    expect(
      TaskResolutionCommandSchema.parse({
        taskId: "tarefa-ficticia-001",
        action: "withdraw",
        actorLabel: "Colaboradora FICTICIA",
        occurredAt: "2030-01-10T09:10:00.000Z",
        destination: { kind: "retirada_perda" },
        quantity: {
          quantityState: "estimated",
          approximateQuantity: 6,
        },
      }),
    ).toMatchObject({
      action: "withdraw",
      destination: { kind: "retirada_perda" },
    });
  });

  it("requires an explicit no-photo reason and keeps photo evidence as metadata only", () => {
    expect(EvidencePromptMetadataSchema.parse({ kind: "photo_pending" })).toEqual({
      kind: "photo_pending",
    });
    expect(EvidencePromptMetadataSchema.parse({ kind: "photo_recorded_placeholder" })).toEqual({
      kind: "photo_recorded_placeholder",
    });
    expect(
      EvidencePromptMetadataSchema.parse({
        kind: "no_photo_reason",
        reason: "Camera indisponivel",
      }),
    ).toEqual({
      kind: "no_photo_reason",
      reason: "Camera indisponivel",
    });
    expect(() =>
      EvidencePromptMetadataSchema.parse({ kind: "no_photo_reason", reason: "" }),
    ).toThrow();
    expect(() =>
      EvidencePromptMetadataSchema.parse({
        kind: "photo_recorded_placeholder",
        objectKey: "fotos/reais/nao-deve-existir.jpg",
      }),
    ).toThrow();
  });
});
