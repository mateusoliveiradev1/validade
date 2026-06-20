import { describe, expect, it } from "vitest";
import {
  createExpoPushAlertChannel,
  createFakePushAlertChannel,
  parsePushNotificationResponseData,
  type ScheduleTaskNotificationInput,
} from "./alert-channel";

const taskId = "tarefa-ficticia-001";
const taskActiveKey = "active-key-ficticia-001";
const dispatchCommand = {
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
  createdAt: "2030-01-10T09:00:00.000Z",
} as const;

function scheduleInput(): ScheduleTaskNotificationInput {
  return {
    command: dispatchCommand,
    triggerSeconds: 60,
  };
}

describe("push alert channel", () => {
  it("does not request permission until requestPermission is called", async () => {
    const channel = createFakePushAlertChannel({ permissionState: "not_requested" });

    expect(await channel.getPermissionState()).toEqual({ state: "not_requested" });
    expect(channel.requestedPermissionCount).toBe(0);

    expect(await channel.requestPermission()).toEqual({ state: "active" });
    expect(channel.requestedPermissionCount).toBe(1);
  });

  it("returns fake granted, denied, and unavailable token states without native modules", async () => {
    const granted = createFakePushAlertChannel({ permissionState: "active" });
    expect(await granted.getExpoPushToken()).toEqual({
      state: "active",
      expoPushToken: "ExpoPushToken-FICTICIO-001",
    });

    const denied = createFakePushAlertChannel({ permissionState: "denied" });
    expect(await denied.getPermissionState()).toEqual({ state: "denied" });

    const unavailable = createFakePushAlertChannel({
      tokenResult: {
        state: "unavailable",
        reason: "Projeto Expo sem id ficticio",
      },
    });
    expect(await unavailable.getExpoPushToken()).toEqual({
      state: "unavailable",
      reason: "Projeto Expo sem id ficticio",
    });
  });

  it("maps schedule success and failure to pending/retry states", async () => {
    const channel = createFakePushAlertChannel({ permissionState: "active" });

    await expect(channel.scheduleTaskNotification(scheduleInput())).resolves.toEqual({
      attemptState: "pending",
      notificationId: "notificacao-ficticia-1",
    });
    expect(channel.scheduledNotifications).toHaveLength(1);

    channel.failNextSchedule("agenda indisponivel");

    await expect(channel.scheduleTaskNotification(scheduleInput())).resolves.toEqual({
      attemptState: "retry_pending",
      failureReason: "agenda indisponivel",
    });
  });

  it("emits notification responses with only task id and active key", () => {
    const channel = createFakePushAlertChannel({
      clock: () => "2030-01-10T09:05:00.000Z",
    });
    const received: unknown[] = [];
    channel.subscribeToNotificationResponses((payload) => received.push(payload));

    channel.emitNotificationResponse({ taskId, taskActiveKey });
    channel.emitNotificationResponse({ taskId, taskActiveKey, lotIdentity: "LOTE-FICTICIO-001" });

    expect(received).toEqual([
      {
        taskId,
        taskActiveKey,
        openedAt: "2030-01-10T09:05:00.000Z",
      },
    ]);
  });

  it("maps Expo permission and missing project id without prompting at channel creation", async () => {
    let requested = 0;
    const channel = createExpoPushAlertChannel({
      loadNotifications: () =>
        Promise.resolve({
          getPermissionsAsync: () => Promise.resolve({ status: "undetermined" }),
          requestPermissionsAsync: () => {
            requested += 1;
            return Promise.resolve({ status: "denied" });
          },
          getExpoPushTokenAsync: () => Promise.resolve({ data: "ExpoPushToken-FICTICIO-002" }),
          scheduleNotificationAsync: () => Promise.resolve("notificacao-ficticia-2"),
          cancelScheduledNotificationAsync: () => Promise.resolve(undefined),
          addNotificationResponseReceivedListener: () => ({ remove: () => undefined }),
        }),
      loadConstants: () =>
        Promise.resolve({
          default: {
            easConfig: null,
            expoConfig: { extra: {} },
          },
        }),
    });

    expect(await channel.getPermissionState()).toEqual({ state: "not_requested" });
    expect(requested).toBe(0);
    expect(await channel.requestPermission()).toEqual({ state: "denied" });
    expect(requested).toBe(1);
    expect(await channel.getExpoPushToken()).toEqual({
      state: "unavailable",
      reason: "Expo project id is required for remote push tokens.",
    });
  });

  it("degrades instead of crashing when the native notification module is unavailable", async () => {
    const channel = createExpoPushAlertChannel({
      loadNotifications: () => Promise.reject(new Error("native notifications unavailable")),
      loadConstants: () =>
        Promise.resolve({
          default: {
            easConfig: { projectId: "projeto-ficticio-001" },
            expoConfig: null,
          },
        }),
    });

    await expect(channel.getPermissionState()).resolves.toEqual({
      state: "unavailable",
      reason: "native notifications unavailable",
    });
    await expect(channel.requestPermission()).resolves.toEqual({
      state: "unavailable",
      reason: "native notifications unavailable",
    });
    await expect(channel.getExpoPushToken()).resolves.toEqual({
      state: "unavailable",
      reason: "native notifications unavailable",
    });
    await expect(channel.scheduleTaskNotification(scheduleInput())).resolves.toEqual({
      attemptState: "retry_pending",
      failureReason: "native notifications unavailable",
    });
    expect(() => channel.subscribeToNotificationResponses(() => undefined).remove()).not.toThrow();
  });

  it("rejects notification response payloads with extra lock-screen details", () => {
    expect(
      parsePushNotificationResponseData({ taskId, taskActiveKey }, "2030-01-10T09:05:00.000Z"),
    ).toEqual({
      taskId,
      taskActiveKey,
      openedAt: "2030-01-10T09:05:00.000Z",
    });
    expect(
      parsePushNotificationResponseData(
        { taskId, taskActiveKey, lotIdentity: "LOTE-FICTICIO-001" },
        "2030-01-10T09:05:00.000Z",
      ),
    ).toBeNull();
  });
});
