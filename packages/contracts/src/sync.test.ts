import { describe, expect, it } from "vitest";
import {
  CentralAcknowledgementSchema,
  OfflineActionCommandSchema,
  OfflineCacheStatusSchema,
  SyncCommandRecordSchema,
  SyncConflictRecordSchema,
  SyncQueueSummarySchema,
  SyncTransportBatchSchema,
  SyncTransportResultSchema,
} from "./sync";
import { TodayTaskRecordSchema } from "./tasks";

const occurredAt = "2030-01-10T09:00:00.000Z";
const updatedAt = "2030-01-10T09:05:00.000Z";
const lotIdentity = {
  identitySource: "printed",
  value: "OVOS-FICTICIOS-001",
} as const;
const currentLocation = { kind: "area_de_venda" } as const;

const taskRecord = {
  id: "tarefa-ficticia-001",
  activeKey: "lote-ficticio-001:expired:withdraw_or_loss:root",
  lotId: "lote-ficticio-001",
  productDisplayName: "Ovos Brancos FICTICIOS",
  lotIdentity,
  currentLocation,
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
  createdAt: occurredAt,
  updatedAt,
} as const;

const offlineAction = {
  kind: "resolve_task",
  payload: {
    taskId: "tarefa-ficticia-001",
    action: "withdraw",
    actorLabel: "Colaboradora FICTICIA",
    occurredAt,
    destination: { kind: "retirada_perda" },
    evidence: { kind: "no_photo_reason", reason: "Camera indisponivel" },
  },
} as const;

const commandRecord = {
  id: "cmd-ficticio-001",
  idempotencyKey: "idem-ficticio-001",
  kind: "resolve_task",
  state: "pending_sync",
  urgency: "critical",
  payload: offlineAction,
  taskId: "tarefa-ficticia-001",
  taskActiveKey: "lote-ficticio-001:expired:withdraw_or_loss:root",
  lotId: "lote-ficticio-001",
  productDisplayName: "Ovos Brancos FICTICIOS",
  lotIdentity,
  currentLocation,
  riskState: "expired",
  requiredResolution: "withdraw_or_loss",
  createdAt: occurredAt,
  updatedAt,
  savedAt: occurredAt,
  attemptCount: 0,
} as const;

const conflictRecord = {
  id: "conflito-ficticio-001",
  commandId: "cmd-ficticio-001",
  severity: "critical",
  reason: "A tarefa mudou em outro aparelho.",
  localAction: {
    commandId: "cmd-ficticio-001",
    kind: "resolve_task",
    label: "Retirar agora",
    actorLabel: "Colaboradora FICTICIA",
    occurredAt,
    productDisplayName: "Ovos Brancos FICTICIOS",
    lotIdentity,
    currentLocation,
  },
  remoteChange: {
    kind: "lot_moved",
    summary: "O lote foi movido em outro aparelho.",
    changedAt: updatedAt,
  },
  allowedActions: ["keep_local_and_retry", "use_current_task", "discard_offline_action"],
  createdAt: updatedAt,
} as const;

describe("offline sync contracts", () => {
  it("parses cache status, commands, queue summaries, transport batches, and results", () => {
    expect(
      OfflineCacheStatusSchema.parse({
        state: "offline_ready",
        lastRefreshedAt: occurredAt,
        activeTaskCount: 1,
        requiredLotSnippetCount: 1,
        staleAfterHours: 4,
        source: "today_open",
        updatedAt,
      }),
    ).toMatchObject({ state: "offline_ready", activeTaskCount: 1 });
    expect(OfflineActionCommandSchema.parse(offlineAction)).toEqual(offlineAction);
    expect(SyncCommandRecordSchema.parse(commandRecord)).toMatchObject({
      idempotencyKey: "idem-ficticio-001",
      urgency: "critical",
    });
    expect(
      SyncQueueSummarySchema.parse({
        state: "has_pending",
        totalCount: 1,
        conflictCount: 0,
        hasCriticalConflict: false,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        oldestPendingCritical: {
          id: "cmd-ficticio-001",
          kind: "resolve_task",
          state: "pending_sync",
          urgency: "critical",
          productDisplayName: "Ovos Brancos FICTICIOS",
          lotIdentity,
          currentLocation,
          savedAt: occurredAt,
        },
        commands: [],
        updatedAt,
      }),
    ).toMatchObject({ criticalCount: 1 });
    expect(
      SyncTransportBatchSchema.parse({
        batchId: "batch-ficticio-001",
        deviceId: "aparelho-ficticio-001",
        commands: [commandRecord],
        sentAt: updatedAt,
      }),
    ).toMatchObject({ batchId: "batch-ficticio-001" });
    expect(
      SyncTransportResultSchema.parse({
        status: "ack",
        commandId: "cmd-ficticio-001",
        idempotencyKey: "idem-ficticio-001",
        syncedAt: updatedAt,
      }),
    ).toMatchObject({ status: "ack" });
    expect(
      SyncTransportResultSchema.parse({
        status: "retry",
        commandId: "cmd-ficticio-001",
        idempotencyKey: "idem-ficticio-001",
        retryAfterSeconds: 60,
        error: "Rede ficticia indisponivel",
      }),
    ).toMatchObject({ status: "retry" });
  });

  it("requires idempotency keys and keeps command records strict", () => {
    expect(() =>
      SyncCommandRecordSchema.parse({
        ...commandRecord,
        idempotencyKey: "",
      }),
    ).toThrow();
    expect(() =>
      SyncCommandRecordSchema.parse({
        ...commandRecord,
        outboxDebug: true,
      }),
    ).toThrow();
    expect(() =>
      SyncCommandRecordSchema.parse({
        ...commandRecord,
        kind: "request_markdown",
      }),
    ).toThrow();
  });

  it("requires structured conflict details and allowed actions", () => {
    expect(SyncConflictRecordSchema.parse(conflictRecord)).toMatchObject({
      localAction: {
        productDisplayName: "Ovos Brancos FICTICIOS",
        currentLocation,
      },
      remoteChange: {
        kind: "lot_moved",
      },
    });
    expect(
      SyncTransportResultSchema.parse({
        status: "conflict",
        commandId: "cmd-ficticio-001",
        idempotencyKey: "idem-ficticio-001",
        conflict: conflictRecord,
      }),
    ).toMatchObject({ status: "conflict" });
    expect(() =>
      SyncConflictRecordSchema.parse({
        ...conflictRecord,
        remoteChange: undefined,
      }),
    ).toThrow();
    expect(() =>
      SyncConflictRecordSchema.parse({
        ...conflictRecord,
        allowedActions: [],
      }),
    ).toThrow();
    expect(() =>
      SyncConflictRecordSchema.parse({
        ...conflictRecord,
        resolutionAction: "discard_offline_action",
      }),
    ).toThrow();
  });

  it.each(["uri", "base64", "objectKey", "photoUri", "imageBytes"] as const)(
    "rejects raw evidence/storage field %s in sync payloads and conflicts",
    (field) => {
      expect(() =>
        SyncCommandRecordSchema.parse({
          ...commandRecord,
          payload: {
            ...offlineAction,
            payload: {
              ...offlineAction.payload,
              evidence: {
                kind: "photo_recorded_placeholder",
                [field]: "valor-ficticio",
              },
            },
          },
        }),
      ).toThrow();
      expect(() =>
        SyncConflictRecordSchema.parse({
          ...conflictRecord,
          remoteChange: {
            ...conflictRecord.remoteChange,
            [field]: "valor-ficticio",
          },
        }),
      ).toThrow();
    },
  );

  it("keeps Today tasks valid without sync and validates optional sync metadata", () => {
    expect(TodayTaskRecordSchema.parse(taskRecord)).toEqual(taskRecord);
    expect(
      TodayTaskRecordSchema.parse({
        ...taskRecord,
        sync: {
          state: "pending_sync",
          savedAt: occurredAt,
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
        ...taskRecord,
        sync: {
          state: "sync_conflict",
          savedAt: occurredAt,
          pendingCommandId: "cmd-ficticio-001",
        },
      }),
    ).toThrow();
  });

  it("separates central acknowledgement from resolved business state", () => {
    expect(
      CentralAcknowledgementSchema.parse({
        commandId: "cmd-ficticio-001",
        idempotencyKey: "idem-ficticio-001",
        acceptedAt: updatedAt,
        state: "synchronized",
        centralVersion: 3,
      }),
    ).toMatchObject({
      state: "synchronized",
    });
    expect(
      CentralAcknowledgementSchema.parse({
        commandId: "cmd-ficticio-001",
        idempotencyKey: "idem-ficticio-001",
        acceptedAt: updatedAt,
        state: "resolved",
        centralVersion: 4,
        resolvedTaskId: "tarefa-ficticia-001",
      }),
    ).toMatchObject({
      state: "resolved",
      resolvedTaskId: "tarefa-ficticia-001",
    });
    expect(() =>
      CentralAcknowledgementSchema.parse({
        commandId: "cmd-ficticio-001",
        idempotencyKey: "idem-ficticio-001",
        acceptedAt: updatedAt,
        state: "local",
        centralVersion: 4,
      }),
    ).toThrow();
    expect(() =>
      CentralAcknowledgementSchema.parse({
        commandId: "cmd-ficticio-001",
        idempotencyKey: "idem-ficticio-001",
        acceptedAt: updatedAt,
        state: "resolved",
        centralVersion: 4,
      }),
    ).toThrow();
  });
});
