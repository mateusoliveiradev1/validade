import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionContextResponse } from "@validade-zero/contracts";
import { AuthGate, createMobileAuthClient, type MobileAuthClient } from "./AuthGate";
import { MobileAuthError } from "./auth-errors";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const expoConstantsMock = vi.hoisted<{
  expoConfig: { extra?: Record<string, unknown> | null } | null;
}>(() => ({
  expoConfig: {
    extra: {
      EXPO_PUBLIC_API_URL: "https://validade-zero-api-staging.validadezero.workers.dev/",
    },
  },
}));

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
    Image: (props: Record<string, unknown>) => React.createElement("Image", props),
    TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
    Pressable: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("Pressable", props, children),
    BackHandler: {
      addEventListener: () => ({ remove: () => undefined }),
    },
  };
});

vi.mock("expo-constants", () => ({
  default: expoConstantsMock,
}));

afterEach(() => {
  expoConstantsMock.expoConfig = {
    extra: {
      EXPO_PUBLIC_API_URL: "https://validade-zero-api-staging.validadezero.workers.dev/",
    },
  };
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function activeSession(overrides: Partial<SessionContextResponse> = {}): SessionContextResponse {
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
    ...overrides,
  };
}

function client(overrides: Partial<MobileAuthClient> = {}): MobileAuthClient {
  return {
    authHeaders: () => ({}),
    readSession: () => Promise.reject(new MobileAuthError("session_expired")),
    login: () => Promise.resolve(activeSession()),
    validateInvite: () => Promise.resolve({ status: "invalid" }),
    activateInvite: () => Promise.resolve(activeSession()),
    requestRecovery: () => Promise.resolve(),
    submitPrivacyRequest: () => Promise.resolve(),
    prepareTurn: () => Promise.reject(new Error("not used")),
    createCentralLot: () => Promise.reject(new Error("not used")),
    logout: () => Promise.resolve(),
    ...overrides,
  };
}

async function renderGate(authClient: MobileAuthClient): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(
      <AuthGate authClient={authClient}>{() => <TextFixture text="Hoje autenticado" />}</AuthGate>,
    );
    await Promise.resolve();
  });
  if (tree === undefined) throw new Error("AuthGate did not render.");
  return tree;
}

function TextFixture({ text }: { text: string }) {
  return <>{text}</>;
}

async function press(tree: ReactTestRenderer, label: string): Promise<void> {
  const button = tree.root
    .findAllByType("Pressable")
    .find((candidate) => candidate.props.accessibilityLabel === label);
  if (button === undefined || typeof button.props.onPress !== "function") {
    throw new Error(`Expected action ${label}.`);
  }
  await act(async () => {
    button.props.onPress();
    await Promise.resolve();
  });
}

async function enter(tree: ReactTestRenderer, label: string, value: string): Promise<void> {
  const field = tree.root
    .findAllByType("TextInput")
    .find((candidate) => candidate.props.accessibilityLabel === label);
  if (field === undefined || typeof field.props.onChangeText !== "function") {
    throw new Error(`Expected field ${label}.`);
  }
  await act(async () => {
    field.props.onChangeText(value);
    await Promise.resolve();
  });
}

describe("mobile auth flow", () => {
  it("uses the Expo config API URL when the public env is not bundled", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_URL", "");
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            status: "authenticated",
            sessionToken: "sessao-ficticia-com-tamanho-valido-0001",
            session: activeSession(),
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createMobileAuthClient().readSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://validade-zero-api-staging.validadezero.workers.dev/auth/session",
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) }),
    );
  });

  it("falls back to the staging API URL when env and Expo config are unavailable", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_URL", "");
    expoConstantsMock.expoConfig = null;
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            status: "authenticated",
            sessionToken: "sessao-ficticia-com-tamanho-valido-0001",
            session: activeSession(),
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createMobileAuthClient().readSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://validade-zero-api-staging.validadezero.workers.dev/auth/session",
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) }),
    );
  });

  it("treats an empty 401 session response as an expired initial session", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(undefined, { status: 401 })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createMobileAuthClient({ baseUrl: "https://api.example.test" }).readSession(),
    ).rejects.toMatchObject({ code: "session_expired" });
  });

  it("does not show a pre-login warning when the initial session check cannot connect", async () => {
    const tree = await renderGate(
      client({ readSession: () => Promise.reject(new MobileAuthError("network")) }),
    );

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain("Entrar no Validade Zero");
    expect(rendered).not.toContain("Nao foi possivel abrir o acesso seguro agora");
  });

  it("opens Hoje only after a valid active session and supports logout", async () => {
    const login = vi.fn(() => Promise.resolve(activeSession()));
    const logout = vi.fn(() => Promise.resolve());
    const tree = await renderGate(client({ login, logout }));

    expect(JSON.stringify(tree.toJSON())).toContain("Entrar no Validade Zero");
    await enter(tree, "Identificador de acesso", "worker-ficticio@example.test");
    await enter(tree, "Senha", "senha-segura-123");
    await press(tree, "Entrar no Validade Zero");

    expect(login).toHaveBeenCalledWith({
      identifier: "worker-ficticio@example.test",
      password: "senha-segura-123",
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Hoje autenticado");
    await press(tree, "Sair da conta");
    expect(logout).toHaveBeenCalledOnce();
    expect(JSON.stringify(tree.toJSON())).toContain("Entrar no Validade Zero");
  });

  it("validates and activates an invite before showing the operational child", async () => {
    const token = "a".repeat(32);
    const validateInvite = vi.fn(() =>
      Promise.resolve({
        status: "valid" as const,
        expiresAt: "2030-01-11T12:00:00.000Z",
        invite: {
          identifier: "worker-ficticio@example.test",
          displayName: "Colaborador FICTICIO",
          storeId: "loja-ficticia",
          storeName: "Loja Ficticia Piloto",
          role: "collaborator" as const,
        },
      }),
    );
    const activateInvite = vi.fn(() => Promise.resolve(activeSession()));
    const tree = await renderGate(client({ validateInvite, activateInvite }));

    await press(tree, "Ativar conta por convite");
    await enter(tree, "Codigo do convite", token);
    await press(tree, "Validar convite da conta");
    expect(JSON.stringify(tree.toJSON())).toContain("Conta vinculada a esta operacao");
    await enter(tree, "Crie sua senha", "senha-segura-123");
    await press(tree, "Ativar conta");

    expect(activateInvite).toHaveBeenCalledWith({ token, password: "senha-segura-123" });
    expect(JSON.stringify(tree.toJSON())).toContain("Hoje autenticado");
  });

  it("shows invalid invite, recovery, expired session, blocked account, and no-permission states", async () => {
    const expiredInviteTree = await renderGate(
      client({ validateInvite: () => Promise.resolve({ status: "expired" }) }),
    );
    await press(expiredInviteTree, "Ativar conta por convite");
    await enter(expiredInviteTree, "Codigo do convite", "a".repeat(32));
    await press(expiredInviteTree, "Validar convite da conta");
    expect(JSON.stringify(expiredInviteTree.toJSON())).toContain("Convite invalido ou expirado");

    const recovery = vi.fn(() => Promise.resolve());
    const recoveryTree = await renderGate(client({ requestRecovery: recovery }));
    await press(recoveryTree, "Recuperar acesso da conta");
    await enter(recoveryTree, "E-mail ou identificador do convite", "worker-ficticio@example.test");
    await press(recoveryTree, "Solicitar recuperacao da conta");
    expect(recovery).toHaveBeenCalledWith("worker-ficticio@example.test");

    const expiredTree = await renderGate(
      client({ login: () => Promise.reject(new MobileAuthError("session_expired")) }),
    );
    await enter(expiredTree, "Identificador de acesso", "worker-ficticio@example.test");
    await enter(expiredTree, "Senha", "senha-segura-123");
    await press(expiredTree, "Entrar no Validade Zero");
    expect(JSON.stringify(expiredTree.toJSON())).toContain(
      "Sua sessao expirou. Entre novamente para continuar.",
    );

    const blockedTree = await renderGate(
      client({ readSession: () => Promise.reject(new MobileAuthError("account_blocked")) }),
    );
    expect(JSON.stringify(blockedTree.toJSON())).toContain("Conta bloqueada. Fale com a lideranca");

    const revokedTree = await renderGate(
      client({ readSession: () => Promise.reject(new MobileAuthError("account_revoked")) }),
    );
    expect(JSON.stringify(revokedTree.toJSON())).toContain("Seu acesso a esta loja foi revogado");

    const noPermissionTree = await renderGate(
      client({
        readSession: () =>
          Promise.resolve(
            activeSession({
              actions: {
                canActOnTask: false,
                canCloseShift: false,
                canReadStoreAudit: false,
                canManageUsers: false,
              },
            }),
          ),
      }),
    );
    expect(JSON.stringify(noPermissionTree.toJSON())).toContain(
      "Voce nao tem permissao para esta area nesta loja.",
    );
  });
});
