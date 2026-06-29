import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { AlertChannelState } from "@validade-zero/domain";
import type { DevicePushRegistrationCommand } from "@validade-zero/contracts";
import { createFakePushAlertChannel, type PushAlertChannel } from "./alert-channel";
import { AjustesScreen } from "./AjustesScreen";
import type { CaptureRepository } from "./repository";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");
  return {
    StyleSheet: { create: <T extends Record<string, unknown>>(styles: T) => styles },
    Text: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Text", props, children),
    View: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("View", props, children),
    ScrollView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", props, children),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

function registration(
  permissionStatus: DevicePushRegistrationCommand["permissionStatus"],
): DevicePushRegistrationCommand {
  return {
    deviceId: "aparelho-ajustes-ficticio",
    deviceLabel: "Celular FICTICIO",
    audienceRole: "shift_team",
    permissionStatus,
    ...(permissionStatus === "granted" ? { expoPushToken: "ExpoPushToken-FICTICIO" } : {}),
    registeredAt: "2030-01-10T09:00:00.000Z",
  };
}

function createRepository(input: { channel?: DevicePushRegistrationCommand | null } = {}) {
  let channel = input.channel ?? null;
  const registerAlertDevice = vi.fn((command: DevicePushRegistrationCommand) => {
    channel = command;
    return Promise.resolve(command);
  });
  const resolveTodayTask = vi.fn();
  const repository = {
    loadAlertChannelState: () => Promise.resolve(channel),
    registerAlertDevice,
    resolveTodayTask,
  } as unknown as CaptureRepository;

  return { repository, registerAlertDevice, resolveTodayTask };
}

function channelWithPermission(state: AlertChannelState): PushAlertChannel {
  return {
    getPermissionState: () => Promise.resolve({ state }),
    requestPermission: () => Promise.resolve({ state }),
    getExpoPushToken: () => Promise.resolve({ state: "unavailable" }),
    scheduleTaskNotification: () => Promise.resolve({ attemptState: "retry_pending" }),
    cancelTaskNotification: () => Promise.resolve(),
    subscribeToNotificationResponses: () => ({ remove: () => undefined }),
  };
}

async function renderAjustes(input: {
  alertChannel?: PushAlertChannel | undefined;
  channel?: DevicePushRegistrationCommand | null | undefined;
}): Promise<{
  tree: ReactTestRenderer;
  registerAlertDevice: ReturnType<typeof vi.fn>;
  resolveTodayTask: ReturnType<typeof vi.fn>;
}> {
  const { repository, registerAlertDevice, resolveTodayTask } = createRepository({
    channel: input.channel ?? null,
  });
  let tree: ReactTestRenderer | undefined;

  await act(async () => {
    tree = create(
      <AjustesScreen
        alertChannel={input.alertChannel ?? createFakePushAlertChannel()}
        onBack={() => undefined}
        repository={repository}
        now={() => new Date("2030-01-10T09:00:00.000Z")}
      />,
    );
    await Promise.resolve();
  });

  if (tree === undefined) throw new Error("Ajustes did not render.");
  return { tree, registerAlertDevice, resolveTodayTask };
}

async function press(tree: ReactTestRenderer, label: string): Promise<void> {
  const action = tree.root
    .findAllByType("Pressable")
    .find((candidate) => candidate.props.accessibilityLabel === label);
  if (action === undefined || typeof action.props.onPress !== "function") {
    throw new Error(`Expected action ${label}.`);
  }

  await act(async () => {
    action.props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("AjustesScreen push controls", () => {
  it.each([
    ["not_requested", null, "Atencao"],
    ["active", registration("granted"), "Apto"],
    ["local_only", registration("local_only"), "Atencao"],
    ["denied", registration("denied"), "Atencao"],
    ["unavailable", registration("unavailable"), "Atencao"],
    ["failed", null, "Atencao"],
  ] as const)("renders %s push state as %s", async (state, stored, verdict) => {
    const { tree } = await renderAjustes({
      alertChannel: channelWithPermission(state),
      channel: stored,
    });
    const rendered = JSON.stringify(tree.toJSON());

    expect(rendered).toContain("Push e lembretes");
    expect(rendered).toContain(verdict);
  });

  it("activates alerts by requesting permission and registering this device", async () => {
    const alertChannel = createFakePushAlertChannel({ permissionState: "not_requested" });
    const { tree, registerAlertDevice } = await renderAjustes({ alertChannel });

    await press(tree, "Ativar alertas do turno");

    expect(alertChannel.requestedPermissionCount).toBe(1);
    expect(registerAlertDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: "local-alert-device",
        permissionStatus: "granted",
      }),
    );
  });

  it("disables only this-device alerts without hiding Hoje tasks", async () => {
    const { tree, registerAlertDevice } = await renderAjustes({
      channel: registration("granted"),
    });

    await press(tree, "Desativar neste aparelho");

    expect(registerAlertDevice).toHaveBeenCalledWith(
      expect.objectContaining({ permissionStatus: "denied" }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain("As tarefas continuam ativas em Hoje");
  });

  it("sends a this-device safe test without resolving tasks", async () => {
    const alertChannel = createFakePushAlertChannel({ permissionState: "active" });
    const { tree, resolveTodayTask } = await renderAjustes({
      alertChannel,
      channel: registration("granted"),
    });

    await press(tree, "Enviar teste neste aparelho");

    expect(alertChannel.scheduledNotifications).toHaveLength(1);
    expect(resolveTodayTask).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("prova apenas este aparelho");
  });

  it("keeps sensitive provider, token, build, and raw device copy out of Ajustes", async () => {
    const { tree } = await renderAjustes({
      alertChannel: channelWithPermission("failed"),
      channel: registration("local_only"),
    });

    expect(JSON.stringify(tree.toJSON())).not.toMatch(
      /ExpoPushToken|googleServicesFile|firebase|token|secret|providerTicket|rawDeviceId/i,
    );
  });
});
