import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionContextResponse } from "@validade-zero/contracts";
import { Pressable } from "react-native";
import {
  AuthGate,
  createMobileAuthClient,
  type AuthGateReadyControls,
  type MobileAuthClient,
} from "./AuthGate";
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
    capabilities: ["task.act", "command_center.read_store"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    actions: {
      canReadCommandCenter: true,
      canActOnTask: true,
      canReviewProductDrafts: false,
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
    searchCentralProducts: () => Promise.reject(new Error("not used")),
    createProductDraft: () => Promise.reject(new Error("not used")),
    createCentralLot: () => Promise.reject(new Error("not used")),
    closeShift: () => Promise.reject(new Error("not used")),
    logout: () => Promise.resolve(),
    ...overrides,
  };
}

async function renderGate(authClient: MobileAuthClient): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(
      <AuthGate authClient={authClient}>
        {(_session, _authClient, controls) => <AuthenticatedFixture controls={controls} />}
      </AuthGate>,
    );
    await Promise.resolve();
  });
  if (tree === undefined) throw new Error("AuthGate did not render.");
  return tree;
}

function AuthenticatedFixture({ controls }: { controls: AuthGateReadyControls }) {
  return (
    <>
      Hoje autenticado
      <Pressable
        accessibilityLabel="Abrir Centro de Privacidade"
        accessibilityRole="button"
        onPress={() => controls.openPrivacyCenter()}
      >
        Privacidade de teste
      </Pressable>
      <Pressable
        accessibilityLabel="Sair da conta"
        accessibilityRole="button"
        onPress={() => controls.requestLogout()}
      >
        Sair da conta
      </Pressable>
    </>
  );
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

  it("uses the authenticated central product endpoints for first-store setup", async () => {
    const sessionToken = "sessao-ficticia-com-tamanho-valido-0001";
    const expectedAuthorization = `${"Bearer"} ${sessionToken}`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          status: "authenticated",
          sessionToken,
          session: activeSession(),
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          requestId: "search-first-store",
          normalizedQuery: "banana",
          resultState: "no_safe_reuse",
          reusableProducts: [],
          similarCandidates: [],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          requestId: "draft-first-store",
          normalizedKey: "banana prata",
          outcome: "draft_pending_review",
          similarCandidates: [],
          draft: {
            draftId: "draft-banana-prata",
            centralProductId: "product-banana-prata",
            displayName: "Banana Prata",
            normalizedKey: "banana prata",
            categoryId: "frutas",
            categoryName: "Frutas",
            categoryRuleProfile: {
              categoryId: "frutas",
              mode: "formal_validity",
              windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
            },
            source: "draft_pending_review",
            reviewStatus: "pending_review",
            syncState: "pending_central",
            requestedByLabel: "Mateus Lideranca",
            requestedAt: "2030-01-10T12:00:00.000Z",
            similarCandidates: [],
          },
          acknowledgement: {
            acknowledgementId: "ack-product-banana-prata",
            centralProductId: "product-banana-prata",
            state: "draft_pending_review",
            syncState: "pending_central",
            reviewStatus: "pending_review",
            acknowledgedAt: "2030-01-10T12:00:00.000Z",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const auth = createMobileAuthClient({ baseUrl: "https://api.example.test" });

    await auth.readSession();
    await auth.searchCentralProducts({
      query: "banana",
      requestedAt: "2030-01-10T12:00:00.000Z",
    });
    await auth.createProductDraft({
      displayName: "Banana Prata",
      categoryId: "frutas",
      categoryName: "Frutas",
      categoryRuleProfile: {
        categoryId: "frutas",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
      requestedAt: "2030-01-10T12:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/capture/products/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expectedAuthorization,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.test/capture/products/drafts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expectedAuthorization,
        }),
      }),
    );
  });

  it("preserves central lot API error codes instead of masking them as network failures", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ error: "central_product_not_found" }, { status: 404 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const auth = createMobileAuthClient({ baseUrl: "https://api.example.test" });

    await expect(
      auth.createCentralLot({
        lot: {
          productId: "product-melancia-ficticia",
          identity: { identitySource: "printed", value: "MELANCIA-001" },
          mode: "formal_validity",
          expiresAt: "2030-01-10",
          approximateQuantity: 1,
          initialLocation: { kind: "area_de_venda" },
        },
        actorLabel: "Colaborador FICTICIO",
        occurredAt: "2030-01-10T12:00:00.000Z",
        idempotencyKey: "lot-write-melancia-001",
      }),
    ).rejects.toThrow("central_product_not_found");

    await expect(
      auth.createCentralLot({
        lot: {
          productId: "product-melancia-ficticia",
          identity: { identitySource: "printed", value: "MELANCIA-002" },
          mode: "formal_validity",
          expiresAt: "2030-01-10",
          approximateQuantity: 1,
          initialLocation: { kind: "area_de_venda" },
        },
        actorLabel: "Colaborador FICTICIO",
        occurredAt: "2030-01-10T12:01:00.000Z",
        idempotencyKey: "lot-write-melancia-002",
      }),
    ).rejects.not.toMatchObject({ code: "network" });
  });

  it("uses the authenticated central shift-close endpoint for safe close validation", async () => {
    const sessionToken = "sessao-ficticia-com-tamanho-valido-0002";
    const expectedAuthorization = `${"Bearer"} ${sessionToken}`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          status: "authenticated",
          sessionToken,
          session: activeSession(),
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          closure: {
            closureId: "shift-close-safe-001",
            idempotencyKey: "safe-shift-close-001",
            storeId: "loja-piloto",
            storeName: "Loja Piloto",
            verdict: "safe",
            eligibility: "eligible_safe",
            blockers: [],
            checklist: ["sales_area_checked", "pending_work_explained", "handoff_ready"],
            actor: {
              actorId: "warface-admin-lead",
              displayName: "Mateus Lideranca",
              roleSnapshot: "lead",
            },
            occurredAt: "2030-01-10T20:00:00.000Z",
            receivedAt: "2030-01-10T20:00:01.000Z",
            ruleVersion: "phase-10-central-v1",
          },
          replayed: false,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const auth = createMobileAuthClient({ baseUrl: "https://api.example.test" });

    await auth.readSession();
    await auth.closeShift({
      storeId: "loja-piloto",
      verdict: "safe",
      checklist: ["sales_area_checked", "pending_work_explained", "handoff_ready"],
      occurredAt: "2030-01-10T20:00:00.000Z",
      idempotencyKey: "safe-shift-close-001",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/shift-closes",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expectedAuthorization,
        }),
      }),
    );
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

  it("opens the privacy center from authenticated ready controls", async () => {
    const tree = await renderGate(client({ readSession: () => Promise.resolve(activeSession()) }));

    expect(JSON.stringify(tree.toJSON())).toContain("Hoje autenticado");

    await press(tree, "Abrir Centro de Privacidade");

    expect(JSON.stringify(tree.toJSON())).toContain("Centro de Privacidade");
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
                canReadCommandCenter: false,
                canActOnTask: false,
                canReviewProductDrafts: false,
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
