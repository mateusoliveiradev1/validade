import { describe, expect, it } from "vitest";
import {
  CentralTaskProjectionSchema,
  EvidencePromptMetadataSchema,
  FutureAttentionRecordSchema,
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

  it("keeps sync metadata optional and rejects malformed sync state", () => {
    expect(TodayTaskRecordSchema.parse(baseTask)).toEqual(baseTask);
    expect(
      TodayTaskRecordSchema.parse({
        ...baseTask,
        sync: {
          state: "pending_sync",
          savedAt: "2030-01-10T09:10:00.000Z",
          pendingCommandId: "cmd-ficticio-001",
          attemptCount: 0,
        },
      }),
    ).toMatchObject({
      sync: {
        state: "pending_sync",
        pendingCommandId: "cmd-ficticio-001",
      },
    });
    expect(() =>
      TodayTaskRecordSchema.parse({
        ...baseTask,
        sync: {
          state: "sync_conflict",
          savedAt: "2030-01-10T09:10:00.000Z",
          pendingCommandId: "cmd-ficticio-001",
        },
      }),
    ).toThrow();
    expect(() =>
      TodayTaskRecordSchema.parse({
        ...baseTask,
        sync: {
          state: "synced",
          savedAt: "2030-01-10T09:10:00.000Z",
        },
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
        kind: "photo_recorded",
        localEvidenceId: "evidence-local-ficticio-001",
      }),
    ).toEqual({
      kind: "photo_recorded",
      localEvidenceId: "evidence-local-ficticio-001",
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
        kind: "photo_recorded",
        localEvidenceId: "evidence-local-ficticio-001",
        localUri: "file:///device/private/evidence-001.jpg",
      }),
    ).toThrow();
    expect(() =>
      EvidencePromptMetadataSchema.parse({
        kind: "photo_recorded",
        localEvidenceId: "evidence-local-ficticio-001",
        objectKey: "private/loja-piloto/evidence-001",
      }),
    ).toThrow();
  });

  it("validates central task projection responses for active, radar, and safe lots", () => {
    expect(
      CentralTaskProjectionSchema.parse({
        attention: "active_task",
        task: baseTask,
      }),
    ).toMatchObject({
      attention: "active_task",
      task: { status: "active" },
    });

    expect(
      CentralTaskProjectionSchema.parse({
        attention: "future_attention",
        futureAttention: FutureAttentionRecordSchema.parse({
          id: "future-lote-ficticio-001",
          lotId: "lote-ficticio-001",
          productDisplayName: "Ovos Brancos FICTICIOS",
          lotIdentity: {
            identitySource: "printed",
            value: "OVOS-FICTICIOS-001",
          },
          currentLocation: { kind: "estoque" },
          riskState: "radar",
          section: "future_attention",
          sourceRiskReasons: [{ code: "expires_in_60_days", field: "expiresAt" }],
          observedAt: "2030-01-10T09:00:00.000Z",
        }),
      }),
    ).toMatchObject({
      attention: "future_attention",
    });

    expect(
      CentralTaskProjectionSchema.parse({
        attention: "none",
        riskState: "safe",
        observedAt: "2030-01-10T09:00:00.000Z",
      }),
    ).toMatchObject({ attention: "none" });

    expect(() =>
      CentralTaskProjectionSchema.parse({
        attention: "active_task",
        task: {
          ...baseTask,
          status: "resolved",
          resolvedAt: "2030-01-10T10:00:00.000Z",
        },
      }),
    ).toThrow();
  });
});
