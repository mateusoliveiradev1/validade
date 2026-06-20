import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("react-native", async () => {
  const React = await import("react");

  return {
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: ({ children }: { children: React.ReactNode }) =>
      React.createElement("Text", null, children),
    View: ({ children }: { children: React.ReactNode }) =>
      React.createElement("View", null, children),
    ScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement("ScrollView", null, children),
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
    StatusBar: (props: Record<string, unknown>) => React.createElement("StatusBar", props),
  };
});

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: () =>
    Promise.resolve({
      execAsync: () => Promise.resolve(undefined),
      getAllAsync: () => Promise.resolve([]),
      getFirstAsync: () => Promise.resolve(null),
      runAsync: () => Promise.resolve(undefined),
      withTransactionAsync: (task: () => Promise<void>) => task(),
    }),
}));
vi.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false }, () => Promise.resolve(false)],
}));
vi.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: () => ({ remove: () => undefined }),
  cancelScheduledNotificationAsync: () => Promise.resolve(undefined),
  getExpoPushTokenAsync: () => Promise.resolve({ data: "ExpoPushToken-FICTICIO-SMOKE" }),
  getPermissionsAsync: () => Promise.resolve({ status: "undetermined" }),
  requestPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  scheduleNotificationAsync: () => Promise.resolve("notificacao-ficticia-smoke"),
}));
vi.mock("expo-constants", () => ({
  default: {
    easConfig: { projectId: "projeto-ficticio-smoke" },
    expoConfig: { extra: { eas: { projectId: "projeto-ficticio-smoke" } } },
  },
}));
vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: { open: () => undefined },
}));

describe("Validade Zero mobile smoke", () => {
  it("renders the Hoje first entry point with registration reachable", async () => {
    const { default: App } = await import("../App");
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = create(<App />);
      await Promise.resolve();
    });

    expect(tree).toBeDefined();
    const rendered = JSON.stringify(tree?.toJSON());

    expect(rendered).toContain("Hoje");
    expect(rendered).toContain("Area de venda segura");
    expect(rendered).toContain("Ativar alertas do turno");
    expect(rendered).toContain("Atualizar tarefas");
    expect(rendered).toContain("Registrar lote");
  });
});
