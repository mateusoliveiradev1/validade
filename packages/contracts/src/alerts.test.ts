import { describe, expect, it } from "vitest";
import {
  AlertDeliveryResultSchema,
  AlertDispatchCommandSchema,
  CentralAlertAudienceRegistrationSchema,
  DevicePushRegistrationCommandSchema,
  PushOpenIntentSchema,
  TaskAlertStateRecordSchema,
} from "./alerts";

const taskId = "tarefa-ficticia-001";
const taskActiveKey = "active-key-ficticia-001";
const createdAt = "2030-01-10T09:00:00.000Z";

function dispatch(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    attemptId: "tentativa-ficticia-001",
    taskId,
    taskActiveKey,
    audience: "shift_team",
    title: "Retirar agora: Ovos Brancos FICTICIOS",
    body: "area de venda - Abrir tarefa",
    data: {
      taskId,
      taskActiveKey,
    },
    createdAt,
    ...overrides,
  };
}

describe("alert runtime contracts", () => {
  it("parses strict alert state records with task id and active key", () => {
    expect(
      TaskAlertStateRecordSchema.parse({
        taskId,
        taskActiveKey,
        channelState: "active",
        attemptState: "sent",
        audience: "responsible_and_leadership",
        escalationState: "leadership_acknowledged",
        createdAt,
        updatedAt: "2030-01-10T09:35:00.000Z",
        lastReminderAt: "2030-01-10T09:15:00.000Z",
        nextReminderAt: "2030-01-10T09:50:00.000Z",
        escalatedAt: "2030-01-10T09:30:00.000Z",
        leadershipAcknowledgedAt: "2030-01-10T09:35:00.000Z",
        retryCount: 1,
        lastAttemptId: "tentativa-ficticia-001",
      }),
    ).toMatchObject({
      taskId,
      taskActiveKey,
      escalationState: "leadership_acknowledged",
    });
  });

  it("validates fake-safe device registration and rejects malformed or secret fields", () => {
    expect(
      DevicePushRegistrationCommandSchema.parse({
        deviceId: "aparelho-ficticio-001",
        deviceLabel: "Celular do turno FICTICIO",
        audienceRole: "shift_team",
        permissionStatus: "granted",
        expoPushToken: "ExpoPushToken-FICTICIO-001",
        registeredAt: createdAt,
      }),
    ).toMatchObject({
      permissionStatus: "granted",
    });

    expect(() =>
      DevicePushRegistrationCommandSchema.parse({
        deviceId: "aparelho-ficticio-001",
        deviceLabel: "Celular do turno FICTICIO",
        audienceRole: "shift_team",
        permissionStatus: "granted",
        expoPushToken: "",
        registeredAt: createdAt,
      }),
    ).toThrow();
    expect(() =>
      DevicePushRegistrationCommandSchema.parse({
        deviceId: "aparelho-ficticio-001",
        deviceLabel: "Celular do turno FICTICIO",
        audienceRole: "shift_team",
        permissionStatus: "granted",
        expoPushToken: "x".repeat(241),
        registeredAt: createdAt,
      }),
    ).toThrow();
    expect(() =>
      DevicePushRegistrationCommandSchema.parse({
        deviceId: "aparelho-ficticio-001",
        deviceLabel: "Celular do turno FICTICIO",
        audienceRole: "shift_team",
        permissionStatus: "granted",
        expoPushToken: "ExpoPushToken-FICTICIO-001",
        secret: "nao-registrar-segredo",
        password: "nao-registrar-senha",
        registeredAt: createdAt,
      }),
    ).toThrow();
  });

  it("registers central alert audience against store and authenticated actor", () => {
    expect(
      CentralAlertAudienceRegistrationSchema.parse({
        storeId: "loja-ficticia",
        storeName: "Loja Ficticia",
        deviceId: "aparelho-ficticio-001",
        deviceLabel: "Celular da lideranca FICTICIA",
        audienceRole: "leadership",
        expoPushToken: "ExpoPushToken-FICTICIO-CENTRAL",
        registeredBySubjectId: "lead-ficticio",
        registeredAt: createdAt,
      }),
    ).toMatchObject({
      storeId: "loja-ficticia",
      audienceRole: "leadership",
    });

    expect(() =>
      CentralAlertAudienceRegistrationSchema.parse({
        deviceId: "aparelho-ficticio-001",
        deviceLabel: "Celular da lideranca FICTICIA",
        audienceRole: "leadership",
        expoPushToken: "ExpoPushToken-FICTICIO-CENTRAL",
        registeredAt: createdAt,
      }),
    ).toThrow();
  });

  it("requires every alert dispatch to carry the persistent in-app task mapping", () => {
    expect(AlertDispatchCommandSchema.parse(dispatch())).toMatchObject({
      taskId,
      taskActiveKey,
      data: {
        taskId,
        taskActiveKey,
      },
    });

    expect(() =>
      AlertDispatchCommandSchema.parse(
        dispatch({
          data: {
            taskId,
            taskActiveKey: "active-key-antiga",
          },
        }),
      ),
    ).toThrow();
  });

  it("rejects lock-screen lot and task details", () => {
    expect(() =>
      AlertDispatchCommandSchema.parse(
        dispatch({
          title: "Retirar lote: Ovos Brancos FICTICIOS",
        }),
      ),
    ).toThrow();
    expect(() =>
      AlertDispatchCommandSchema.parse(
        dispatch({
          body: "area de venda - LOTE-FICTICIO-001",
        }),
      ),
    ).toThrow();
    expect(() =>
      AlertDispatchCommandSchema.parse(
        dispatch({
          body: `area de venda - ${taskActiveKey}`,
        }),
      ),
    ).toThrow();
  });

  it("models provider delivery outcomes including DeviceNotRegistered", () => {
    expect(
      AlertDeliveryResultSchema.parse({
        status: "ok",
        providerTicketId: "ticket-ficticio-001",
        providerReceiptId: "receipt-ficticio-001",
      }),
    ).toEqual({
      status: "ok",
      providerTicketId: "ticket-ficticio-001",
      providerReceiptId: "receipt-ficticio-001",
    });
    expect(
      AlertDeliveryResultSchema.parse({
        status: "retryable_error",
        failureReason: "Provider temporariamente indisponivel",
        retryAfterSeconds: 60,
      }),
    ).toMatchObject({
      status: "retryable_error",
    });
    expect(
      AlertDeliveryResultSchema.parse({
        status: "permanent_error",
        failureReason: "Payload recusado",
      }),
    ).toMatchObject({
      status: "permanent_error",
    });
    expect(
      AlertDeliveryResultSchema.parse({
        status: "device_not_registered",
        providerCode: "DeviceNotRegistered",
        providerReceiptId: "receipt-ficticio-invalido",
      }),
    ).toMatchObject({
      status: "device_not_registered",
      providerCode: "DeviceNotRegistered",
    });
  });

  it("parses push-open intents for current, updated, resolved, and missing tasks", () => {
    for (const result of [
      "current_task",
      "task_updated",
      "task_resolved",
      "task_missing",
    ] as const) {
      expect(
        PushOpenIntentSchema.parse({
          taskId,
          taskActiveKey,
          openedAt: "2030-01-10T09:05:00.000Z",
          result,
        }),
      ).toMatchObject({ result, taskId, taskActiveKey });
    }
  });
});
