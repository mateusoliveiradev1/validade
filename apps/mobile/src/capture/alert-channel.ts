import type { AlertAttemptState, AlertChannelState } from "@validade-zero/domain";
import { AlertDispatchCommandSchema, type AlertDispatchCommand } from "@validade-zero/contracts";

declare const require: (moduleName: string) => unknown;

interface ExpoNotificationsPort {
  getPermissionsAsync(): Promise<{ status: string }>;
  requestPermissionsAsync(): Promise<{ status: string }>;
  getExpoPushTokenAsync(input: { projectId: string }): Promise<{ data: string }>;
  scheduleNotificationAsync(input: {
    content: {
      title: string;
      body: string;
      data: Record<string, string>;
    };
    trigger: null | {
      type: "timeInterval";
      seconds: number;
    };
  }): Promise<string>;
  cancelScheduledNotificationAsync(notificationId: string): Promise<void>;
  addNotificationResponseReceivedListener(
    handler: (response: {
      notification: {
        request: {
          content: {
            data: unknown;
          };
        };
      };
    }) => void,
  ): { remove(): void };
}

interface ExpoConstantsPort {
  default: {
    easConfig?: { projectId?: string } | null;
    expoConfig?: {
      extra?: {
        eas?: {
          projectId?: unknown;
        };
      };
    } | null;
  };
}

export interface PushAlertChannelStatus {
  state: AlertChannelState;
  reason?: string;
}

export interface PushTokenResult extends PushAlertChannelStatus {
  expoPushToken?: string;
}

export interface ScheduleTaskNotificationInput {
  command: AlertDispatchCommand;
  triggerSeconds?: number;
}

export interface ScheduleTaskNotificationResult {
  attemptState: Extract<AlertAttemptState, "pending" | "retry_pending">;
  notificationId?: string;
  failureReason?: string;
}

export interface PushNotificationResponsePayload {
  taskId: string;
  taskActiveKey: string;
  openedAt: string;
}

export interface PushAlertSubscription {
  remove(): void;
}

export interface PushAlertChannel {
  getPermissionState(): Promise<PushAlertChannelStatus>;
  requestPermission(): Promise<PushAlertChannelStatus>;
  getExpoPushToken(): Promise<PushTokenResult>;
  scheduleTaskNotification(
    input: ScheduleTaskNotificationInput,
  ): Promise<ScheduleTaskNotificationResult>;
  cancelTaskNotification(notificationId: string): Promise<void>;
  subscribeToNotificationResponses(
    handler: (payload: PushNotificationResponsePayload) => void,
  ): PushAlertSubscription;
}

export interface ExpoPushAlertChannelDependencies {
  loadNotifications?: () => Promise<ExpoNotificationsPort>;
  loadConstants?: () => Promise<ExpoConstantsPort>;
  clock?: () => string;
}

export function createExpoPushAlertChannel(
  dependencies: ExpoPushAlertChannelDependencies = {},
): PushAlertChannel {
  const loadNotifications = dependencies.loadNotifications ?? loadExpoNotificationsModule;
  const loadConstants = dependencies.loadConstants ?? loadExpoConstantsModule;
  const clock = dependencies.clock ?? (() => new Date().toISOString());
  const responseHandlers = new Set<(payload: PushNotificationResponsePayload) => void>();
  let responseSubscription: { remove(): void } | undefined;

  return {
    async getPermissionState() {
      let notifications: ExpoNotificationsPort;

      try {
        notifications = await loadNotifications();
      } catch (error) {
        return {
          state: "unavailable",
          reason: runtimeModuleFailureReason(error),
        };
      }

      attachNotificationResponseListener(notifications);
      const permissions = await notifications.getPermissionsAsync();

      return mapPermissionStatus(permissions.status);
    },
    async requestPermission() {
      let notifications: ExpoNotificationsPort;

      try {
        notifications = await loadNotifications();
      } catch (error) {
        return {
          state: "unavailable",
          reason: runtimeModuleFailureReason(error),
        };
      }

      attachNotificationResponseListener(notifications);
      const permissions = await notifications.requestPermissionsAsync();

      return mapPermissionStatus(permissions.status);
    },
    async getExpoPushToken() {
      let notifications: ExpoNotificationsPort;
      let constants: ExpoConstantsPort;

      try {
        [notifications, constants] = await Promise.all([loadNotifications(), loadConstants()]);
      } catch (error) {
        return {
          state: "unavailable",
          reason: runtimeModuleFailureReason(error),
        };
      }

      attachNotificationResponseListener(notifications);
      const projectId = resolveExpoProjectId(constants);

      if (projectId === undefined) {
        return {
          state: "unavailable",
          reason: "Expo project id is required for remote push tokens.",
        };
      }

      try {
        const token = await notifications.getExpoPushTokenAsync({ projectId });

        return {
          state: "active",
          expoPushToken: token.data,
        };
      } catch (error) {
        return {
          state: "failed",
          reason: error instanceof Error ? error.message : "Unable to prepare push token.",
        };
      }
    },
    async scheduleTaskNotification(input) {
      try {
        const notifications = await loadNotifications();
        const command = AlertDispatchCommandSchema.parse(input.command);
        const notificationId = await notifications.scheduleNotificationAsync({
          content: {
            title: command.title,
            body: command.body,
            data: command.data,
          },
          trigger:
            input.triggerSeconds === undefined
              ? null
              : {
                  type: "timeInterval",
                  seconds: input.triggerSeconds,
                },
        });

        return {
          attemptState: "pending",
          notificationId,
        };
      } catch (error) {
        return {
          attemptState: "retry_pending",
          failureReason: error instanceof Error ? error.message : "Unable to schedule alert.",
        };
      }
    },
    async cancelTaskNotification(notificationId) {
      try {
        const notifications = await loadNotifications();
        await notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {
        return;
      }
    },
    subscribeToNotificationResponses(handler) {
      responseHandlers.add(handler);

      return {
        remove() {
          responseHandlers.delete(handler);
        },
      };
    },
  };

  function attachNotificationResponseListener(notifications: ExpoNotificationsPort): void {
    if (responseSubscription !== undefined) {
      return;
    }

    responseSubscription = notifications.addNotificationResponseReceivedListener((response) => {
      const payload = parsePushNotificationResponseData(
        response.notification.request.content.data,
        clock(),
      );

      if (payload === null) {
        return;
      }

      for (const handler of responseHandlers) {
        handler(payload);
      }
    });
  }
}

export interface FakePushAlertChannel extends PushAlertChannel {
  readonly requestedPermissionCount: number;
  readonly scheduledNotifications: readonly ScheduleTaskNotificationInput[];
  emitNotificationResponse(data: unknown): void;
  setPermissionState(state: AlertChannelState): void;
  setTokenResult(result: PushTokenResult): void;
  failNextSchedule(reason: string): void;
}

export function createFakePushAlertChannel(
  input: {
    permissionState?: AlertChannelState;
    tokenResult?: PushTokenResult;
    clock?: () => string;
  } = {},
): FakePushAlertChannel {
  let permissionState = input.permissionState ?? "not_requested";
  let tokenResult: PushTokenResult =
    input.tokenResult ??
    (permissionState === "active"
      ? {
          state: "active",
          expoPushToken: "ExpoPushToken-FICTICIO-001",
        }
      : {
          state: "unavailable",
          reason: "Push token unavailable until permission is active.",
        });
  let requestedPermissionCount = 0;
  let scheduleFailureReason: string | undefined;
  const scheduledNotifications: ScheduleTaskNotificationInput[] = [];
  const handlers = new Set<(payload: PushNotificationResponsePayload) => void>();
  const clock = input.clock ?? (() => new Date().toISOString());

  return {
    get requestedPermissionCount() {
      return requestedPermissionCount;
    },
    get scheduledNotifications() {
      return scheduledNotifications;
    },
    getPermissionState() {
      return Promise.resolve({ state: permissionState });
    },
    requestPermission() {
      requestedPermissionCount += 1;

      if (permissionState === "not_requested") {
        permissionState = "active";
        tokenResult = {
          state: "active",
          expoPushToken: "ExpoPushToken-FICTICIO-001",
        };
      }

      return Promise.resolve({ state: permissionState });
    },
    getExpoPushToken() {
      return Promise.resolve(tokenResult);
    },
    scheduleTaskNotification(input) {
      AlertDispatchCommandSchema.parse(input.command);

      if (scheduleFailureReason !== undefined) {
        const failureReason = scheduleFailureReason;
        scheduleFailureReason = undefined;

        return Promise.resolve({
          attemptState: "retry_pending",
          failureReason,
        } satisfies ScheduleTaskNotificationResult);
      }

      scheduledNotifications.push(input);

      return Promise.resolve({
        attemptState: "pending",
        notificationId: `notificacao-ficticia-${scheduledNotifications.length}`,
      });
    },
    cancelTaskNotification() {
      return Promise.resolve();
    },
    subscribeToNotificationResponses(handler) {
      handlers.add(handler);

      return {
        remove() {
          handlers.delete(handler);
        },
      };
    },
    emitNotificationResponse(data) {
      const payload = parsePushNotificationResponseData(data, clock());

      if (payload === null) {
        return;
      }

      for (const handler of handlers) {
        handler(payload);
      }
    },
    setPermissionState(state) {
      permissionState = state;
    },
    setTokenResult(result) {
      tokenResult = result;
    },
    failNextSchedule(reason) {
      scheduleFailureReason = reason;
    },
  };
}

export function parsePushNotificationResponseData(
  data: unknown,
  openedAt: string,
): PushNotificationResponsePayload | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }

  const entries = Object.entries(data);

  if (entries.length !== 2) {
    return null;
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.taskId !== "string" || typeof payload.taskActiveKey !== "string") {
    return null;
  }

  return {
    taskId: payload.taskId,
    taskActiveKey: payload.taskActiveKey,
    openedAt,
  };
}

function mapPermissionStatus(status: string): PushAlertChannelStatus {
  if (status === "granted") {
    return { state: "active" };
  }

  if (status === "denied") {
    return { state: "denied" };
  }

  if (status === "undetermined") {
    return { state: "not_requested" };
  }

  return {
    state: "unavailable",
    reason: `Unsupported notification permission status: ${status}`,
  };
}

function runtimeModuleFailureReason(error: unknown): string {
  if (error instanceof Error && error.cause !== undefined) {
    return runtimeModuleFailureReason(error.cause);
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Expo notifications module unavailable in this native runtime.";
}

function loadExpoNotificationsModule(): Promise<ExpoNotificationsPort> {
  return loadRuntimeModule("expo-notifications");
}

function loadExpoConstantsModule(): Promise<ExpoConstantsPort> {
  return loadRuntimeModule("expo-constants");
}

function loadRuntimeModule<TModule>(moduleName: string): Promise<TModule> {
  return new Promise((resolve) => {
    resolve(require(moduleName) as TModule);
  });
}

function resolveExpoProjectId(constants: ExpoConstantsPort): string | undefined {
  const easProjectId = constants.default.easConfig?.projectId;
  const expoConfigProjectId = constants.default.expoConfig?.extra?.eas?.projectId;

  if (typeof easProjectId === "string" && easProjectId.length > 0) {
    return easProjectId;
  }

  if (typeof expoConfigProjectId === "string" && expoConfigProjectId.length > 0) {
    return expoConfigProjectId;
  }

  return undefined;
}
