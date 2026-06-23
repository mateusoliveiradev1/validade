import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { SessionContextResponse } from "@validade-zero/contracts";
import { AuthGate, MobileAuthError, type MobileAuthClient } from "../auth/AuthGate";

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
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
  };
});

function activeSession(): SessionContextResponse {
  return {
    actor: { subjectId: "worker-ficticio", displayName: "Colaborador FICTICIO" },
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    activeRole: "collaborator",
    capabilities: ["task.act"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    actions: {
      canActOnTask: true,
      canCloseShift: false,
      canReadStoreAudit: false,
      canManageUsers: false,
    },
  };
}

function authClient(overrides: Partial<MobileAuthClient> = {}): MobileAuthClient {
  return {
    readSession: () => Promise.reject(new MobileAuthError("session_expired")),
    login: () => Promise.resolve(activeSession()),
    validateInvite: () => Promise.resolve({ status: "invalid" }),
    activateInvite: () => Promise.resolve(activeSession()),
    requestRecovery: () => Promise.resolve(),
    submitPrivacyRequest: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    ...overrides,
  };
}

async function renderJourney(client: MobileAuthClient): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(
      <AuthGate authClient={client}>{() => <>Hoje - Area de venda segura</>}</AuthGate>,
    );
    await Promise.resolve();
  });
  if (tree === undefined) throw new Error("Mobile release journey did not render.");
  return tree;
}

describe("mobile release journeys", () => {
  it("keeps Hoje behind the auth gate and exposes the privacy path before authentication", async () => {
    const tree = await renderJourney(authClient());
    expect(JSON.stringify(tree.toJSON())).toContain("Entrar no Validade Zero");
    expect(JSON.stringify(tree.toJSON())).not.toContain("Hoje - Area de venda segura");

    const privacy = tree.root
      .findAllByType("Pressable")
      .find((candidate) => candidate.props.accessibilityLabel === "Abrir Centro de Privacidade");
    if (privacy === undefined || typeof privacy.props.onPress !== "function") {
      throw new Error("Privacy action is missing from the release path.");
    }
    await act(async () => {
      privacy.props.onPress();
      await Promise.resolve();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Centro de Privacidade");
  });

  it("opens Hoje after the server-owned active session resolves", async () => {
    const tree = await renderJourney(
      authClient({ readSession: () => Promise.resolve(activeSession()) }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Hoje - Area de venda segura");
  });
});
