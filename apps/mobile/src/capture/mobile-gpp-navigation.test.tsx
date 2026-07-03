import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { SessionContextResponse } from "@validade-zero/contracts";

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
    Platform: { OS: "android" },
    BackHandler: { addEventListener: () => ({ remove: () => undefined }) },
  };
});

vi.mock("expo-camera", () => ({
  CameraView: () => null,
  PermissionStatus: {
    DENIED: "denied",
    GRANTED: "granted",
    UNDETERMINED: "undetermined",
  },
  getCameraPermissionsAsync: () => Promise.resolve({ granted: false, status: "denied" }),
}));

vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
  DateTimePickerAndroid: {
    open: (input: { onChange?: (event: unknown, date?: Date) => void }) =>
      input.onChange?.({}, new Date("2030-01-10T09:00:00.000Z")),
  },
}));

vi.mock("expo-notifications", () => ({
  getPermissionsAsync: () => Promise.resolve({ status: "denied" }),
  getExpoPushTokenAsync: () => Promise.resolve({ data: "ExpoPushToken-FICTICIO-GPP" }),
  addNotificationResponseReceivedListener: () => ({ remove: () => undefined }),
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: { extra: {} },
    manifest2: { extra: {} },
  },
}));

function activeSession(overrides: Partial<SessionContextResponse> = {}): SessionContextResponse {
  const base: SessionContextResponse = {
    actor: { subjectId: "usuario-gpp-ficticio", displayName: "Usuario GPP FICTICIO" },
    store: { storeId: "loja-18", storeName: "Loja 18 FICTICIA" },
    activeRole: "gpp",
    capabilities: ["gpp.queue.read", "gpp.avaria.create"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    featureFlags: { controle_gpp_enabled: true },
    actions: {
      canReadCommandCenter: false,
      canActOnTask: true,
      canReviewProductDrafts: false,
      canCloseShift: false,
      canReadStoreAudit: false,
      canManageUsers: false,
      canSendPilotPushTest: false,
      canReadGppQueue: true,
      canCreateGppEntry: true,
      canCorrectOwnPendingGppEntry: false,
      canMarkGppDivergence: false,
      canReviewGppCorrection: false,
      canBaixarGppAvaria: false,
      canAttendGppPurchase: false,
      canReadGppHistory: false,
    },
  };
  return {
    ...base,
    ...overrides,
    actions: { ...base.actions, ...overrides.actions },
    featureFlags: { ...base.featureFlags, ...overrides.featureFlags },
  };
}

describe("mobile Controle GPP navigation", () => {
  it("resolves GPP initial route only for enabled GPP sessions with GPP actions", async () => {
    const { canUseControleGppSession, initialRouteForSession } = await import("./CaptureApp");
    const enabled = activeSession();
    const disabled = activeSession({ featureFlags: { controle_gpp_enabled: false } });
    const missingAction = activeSession({
      actions: { canCreateGppEntry: false, canReadGppQueue: false },
    });
    const collaborator = activeSession({ activeRole: "collaborator" });

    expect(canUseControleGppSession(enabled)).toBe(true);
    expect(initialRouteForSession(enabled, "gpp")).toEqual({ name: "gpp-control" });
    expect(initialRouteForSession(disabled, "gpp")).toEqual({ name: "today" });
    expect(initialRouteForSession(missingAction, "gpp")).toEqual({ name: "today" });
    expect(initialRouteForSession(collaborator, "collaborator")).toEqual({ name: "today" });
  });

  it("opens GPP users directly into the Controle GPP hub", async () => {
    const tree = await renderCaptureApp(activeSession());
    const text = renderedText(tree);

    expect(text).toContain("Controle GPP");
    expect(text).toContain(
      "Registre avarias e compras internas sem misturar com Hoje. A central confirma o que foi recebido.",
    );
    expect(text).toContain("Registrar avaria");
    expect(text).toContain("Solicitar compra interna");
    expect(text).toContain("Minhas pendencias");
    expect(text).toContain("Enviadas hoje");
  });

  it("keeps Hoje free of GPP actions and hides shell entry when disabled", async () => {
    const tree = await renderCaptureApp(
      activeSession({
        activeRole: "collaborator",
        featureFlags: { controle_gpp_enabled: false },
      }),
    );
    const text = renderedText(tree);

    expect(text).not.toContain("Registrar avaria");
    expect(text).not.toContain("Solicitar compra interna");
    expect(tree.root.findAllByProps({ accessibilityLabel: "Abrir Controle GPP" })).toHaveLength(0);
  });

  it("lets eligible non-GPP roles open Controle GPP through a separate entry", async () => {
    const tree = await renderCaptureApp(activeSession({ activeRole: "lead" }));

    await press(tree, "Abrir Controle GPP");

    expect(renderedText(tree)).toContain("Controle GPP");
    expect(renderedText(tree)).toContain("Registrar avaria");
  });
});

async function renderCaptureApp(session: SessionContextResponse): Promise<ReactTestRenderer> {
  const { CaptureApp } = await import("./CaptureApp");
  const { createFakePushAlertChannel } = await import("./alert-channel");
  const { createMemoryCaptureRepository } = await import("./memory-repository");
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(
      <CaptureApp
        repository={createMemoryCaptureRepository({
          clock: () => "2030-01-10T09:00:00.000Z",
          createId: () => "id-ficticio-gpp",
        })}
        alertChannel={createFakePushAlertChannel()}
        session={session}
      />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  if (tree === undefined) throw new Error("CaptureApp did not render.");
  return tree;
}

async function press(tree: ReactTestRenderer, label: string): Promise<void> {
  const action = tree.root.findAllByType("Pressable").find((candidate) =>
    String(candidate.props.accessibilityLabel ?? "")
      .toLocaleLowerCase("pt-BR")
      .includes(label.toLocaleLowerCase("pt-BR")),
  );
  if (action === undefined || typeof action.props.onPress !== "function") {
    throw new Error(`Expected an action named ${label}.`);
  }
  await act(async () => {
    action.props.onPress();
    await Promise.resolve();
  });
}

function renderedText(tree: ReactTestRenderer): string {
  return flattenText(tree.toJSON());
}

function flattenText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (value !== null && typeof value === "object" && "children" in value) {
    return flattenText((value as { children?: unknown }).children);
  }
  return "";
}
