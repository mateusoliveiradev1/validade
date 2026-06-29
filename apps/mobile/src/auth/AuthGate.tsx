import { useEffect, useState, type ReactNode } from "react";
import {
  AccountAccessErrorResponseSchema,
  AuthenticatedSessionResponseSchema,
  AuthorizationContract,
  CentralCategoryCatalogResponseSchema,
  CentralLotCreateRequestSchema,
  CentralLotWriteResponseSchema,
  FirstAccessActivationRequestSchema,
  InvalidCredentialsResponseSchema,
  InviteValidationResponseSchema,
  LoginRequestSchema,
  LogoutResponseSchema,
  PrivacyRequestResponseSchema,
  PrepareTurnRequestSchema,
  PrepareTurnResponseSchema,
  ProductDraftCreateRequestSchema,
  ProductDraftCreateResponseSchema,
  ProductSearchRequestSchema,
  ProductSearchResponseSchema,
  RecoveryRequestedResponseSchema,
  RecoveryRequestSchema,
  SessionStatusResponseSchema,
  ShiftCloseSafeRequestSchema,
  ShiftClosureSnapshotSchema,
  type PrepareTurnRequest,
  type PrepareTurnResponse,
  type CentralCategoryCatalogResponse,
  type CentralLotCreateRequest,
  type CentralLotWriteResponse,
  type ProductDraftCreateRequest,
  type ProductDraftCreateResponse,
  type ProductSearchRequest,
  type ProductSearchResponse,
  type PrivacyRequest,
  type SessionContextResponse,
  type ShiftCloseSafeRequest,
  type ShiftClosureSnapshot,
  type PrivacyTopicId,
} from "@validade-zero/contracts";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import brandSymbol from "../../assets/brand-symbol.png";
import { captureColors, captureRadii, captureSpacing } from "../capture/capture-theme";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "../capture/capture-ui";
import { FirstAccessScreen } from "./FirstAccessScreen";
import { LoginScreen } from "./LoginScreen";
import { RecoveryScreen } from "./RecoveryScreen";
import { PrivacyCenterScreen } from "../privacy/PrivacyCenterScreen";
import { MobileAuthError, type MobileAuthErrorCode } from "./auth-errors";
import { addHardwareBackPressListener } from "../system/hardware-back";

declare const require: (moduleName: string) => unknown;

interface ExpoConstantsConfigPort {
  default: {
    expoConfig?: {
      extra?: Record<string, unknown> | null;
    } | null;
  };
}

const STAGING_API_BASE_URL = "https://validade-zero-api-staging.validadezero.workers.dev";

type GateScreen =
  | "checking"
  | "login"
  | "first_access"
  | "recovery"
  | "privacy"
  | "expired"
  | "blocked"
  | "no_permission"
  | "ready";

export interface MobileAuthClient {
  authHeaders(): Record<string, string>;
  readSession(): Promise<SessionContextResponse>;
  login(input: { identifier: string; password: string }): Promise<SessionContextResponse>;
  validateInvite(token: string): Promise<ReturnType<typeof InviteValidationResponseSchema.parse>>;
  activateInvite(input: { token: string; password: string }): Promise<SessionContextResponse>;
  requestRecovery(identifier: string): Promise<void>;
  submitPrivacyRequest(input: PrivacyRequest): Promise<void>;
  prepareTurn(input: PrepareTurnRequest): Promise<PrepareTurnResponse>;
  listCentralCategories?: (() => Promise<CentralCategoryCatalogResponse>) | undefined;
  searchCentralProducts(input: ProductSearchRequest): Promise<ProductSearchResponse>;
  createProductDraft(input: ProductDraftCreateRequest): Promise<ProductDraftCreateResponse>;
  createCentralLot(input: CentralLotCreateRequest): Promise<CentralLotWriteResponse>;
  closeShift(input: ShiftCloseSafeRequest): Promise<ShiftClosureSnapshot>;
  logout(): Promise<void>;
}

export interface AuthGateReadyControls {
  openPrivacyCenter(): void;
  requestLogout(): void;
}

export function createMobileAuthClient(input?: { baseUrl?: string }): MobileAuthClient {
  let sessionToken: string | undefined;
  const baseUrl = input?.baseUrl ?? configuredApiBaseUrl();

  async function request(path: string, init?: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(sessionToken === undefined ? {} : { Authorization: `Bearer ${sessionToken}` }),
          ...(init?.headers ?? {}),
        },
      });
    } catch {
      throw new MobileAuthError("network", "Nao foi possivel falar com o acesso seguro agora.");
    }

    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw toMobileAuthError(body, { path, status: response.status });
    return body;
  }

  async function readAuthenticatedSession(
    path: string,
    init?: RequestInit,
  ): Promise<SessionContextResponse> {
    const response = AuthenticatedSessionResponseSchema.parse(await request(path, init));
    sessionToken = response.sessionToken;
    return SessionStatusResponseSchema.parse(response.session);
  }

  return {
    authHeaders() {
      return sessionToken === undefined ? {} : { Authorization: `Bearer ${sessionToken}` };
    },
    readSession: () => readAuthenticatedSession("/auth/session"),
    login(input) {
      const body = LoginRequestSchema.parse(input);
      return readAuthenticatedSession("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    async validateInvite(token) {
      const response = await fetch(`${baseUrl}/auth/invites/${encodeURIComponent(token)}`, {
        headers: { Accept: "application/json" },
      }).catch(() => {
        throw new MobileAuthError("network", "Nao foi possivel validar o convite agora.");
      });
      return InviteValidationResponseSchema.parse(
        await response.json().catch(() => ({ status: "invalid" })),
      );
    },
    activateInvite(input) {
      const body = FirstAccessActivationRequestSchema.parse(input);
      return readAuthenticatedSession(`/auth/invites/${encodeURIComponent(body.token)}/activate`, {
        method: "POST",
        body: JSON.stringify({ password: body.password }),
      });
    },
    async requestRecovery(identifier) {
      const body = RecoveryRequestSchema.parse({ identifier });
      RecoveryRequestedResponseSchema.parse(
        await request("/auth/recovery/request", { method: "POST", body: JSON.stringify(body) }),
      );
    },
    async submitPrivacyRequest(input) {
      const response = PrivacyRequestResponseSchema.parse(
        await request("/privacy/requests", { method: "POST", body: JSON.stringify(input) }),
      );
      if (response.status !== "received") throw new MobileAuthError("network");
    },
    async prepareTurn(input) {
      const body = PrepareTurnRequestSchema.parse(input);
      return PrepareTurnResponseSchema.parse(
        await request("/capture/prepare-turn", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
    async listCentralCategories() {
      return CentralCategoryCatalogResponseSchema.parse(await request("/capture/categories"));
    },
    async searchCentralProducts(input) {
      const body = ProductSearchRequestSchema.parse(input);
      return ProductSearchResponseSchema.parse(
        await request("/capture/products/search", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
    async createProductDraft(input) {
      const body = ProductDraftCreateRequestSchema.parse(input);
      return ProductDraftCreateResponseSchema.parse(
        await request("/capture/products/drafts", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
    async createCentralLot(input) {
      const body = CentralLotCreateRequestSchema.parse(input);
      return CentralLotWriteResponseSchema.parse(
        await request("/capture/lots", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
    async closeShift(input) {
      const body = ShiftCloseSafeRequestSchema.parse(input);
      const response = await request("/shift-closes", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const closure =
        typeof response === "object" && response !== null && "closure" in response
          ? response.closure
          : undefined;

      return ShiftClosureSnapshotSchema.parse(closure);
    },
    async logout() {
      LogoutResponseSchema.parse(
        await request("/auth/logout", { method: "POST", body: JSON.stringify({}) }),
      );
      sessionToken = undefined;
    },
  };
}

export function AuthGate({
  authClient,
  children,
}: {
  authClient: MobileAuthClient;
  children: (
    session: SessionContextResponse,
    authClient: MobileAuthClient,
    controls: AuthGateReadyControls,
  ) => ReactNode;
}) {
  const [screen, setScreen] = useState<GateScreen>("checking");
  const [session, setSession] = useState<SessionContextResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [blockedStatus, setBlockedStatus] = useState<"blocked" | "revoked" | "recovery_pending">(
    "blocked",
  );
  const [privacyReturnScreen, setPrivacyReturnScreen] = useState<"login" | "ready">("login");
  const [privacyActiveTopic, setPrivacyActiveTopic] = useState<PrivacyTopicId | null>(null);

  useEffect(() => {
    const subscription = addHardwareBackPressListener(() => {
      if (screen === "first_access" || screen === "recovery" || screen === "expired") {
        setScreen("login");
        return true;
      }
      if (screen === "privacy") {
        if (privacyActiveTopic !== null) {
          setPrivacyActiveTopic(null);
          return true;
        }
        setScreen(privacyReturnScreen);
        return true;
      }
      if (screen === "blocked") {
        setScreen("login");
        return true;
      }
      if (screen === "ready") {
        return false;
      }
      if (screen === "checking" || screen === "no_permission") {
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [privacyActiveTopic, privacyReturnScreen, screen]);

  useEffect(() => {
    let current = true;
    void authClient
      .readSession()
      .then((nextSession) => {
        if (current) acceptSession(nextSession);
      })
      .catch((reason: unknown) => {
        if (current) showFailure(reason, true);
      });
    return () => {
      current = false;
    };
  }, [authClient]);

  function acceptSession(nextSession: SessionContextResponse): void {
    if (nextSession.accountStatus !== "active") {
      setBlockedStatus(
        nextSession.accountStatus === "revoked" || nextSession.accountStatus === "recovery_pending"
          ? nextSession.accountStatus
          : "blocked",
      );
      setScreen("blocked");
      return;
    }
    if (!nextSession.actions.canActOnTask) {
      setSession(nextSession);
      setScreen("no_permission");
      return;
    }
    setSession(nextSession);
    setError(undefined);
    setScreen("ready");
  }

  function showFailure(reason: unknown, initial = false): void {
    const failure = reason instanceof MobileAuthError ? reason : new MobileAuthError("network");
    if ((failure.code === "session_expired" || failure.code === "network") && initial) {
      setScreen("login");
      return;
    }
    if (
      failure.code === "account_blocked" ||
      failure.code === "account_revoked" ||
      failure.code === "recovery_required"
    ) {
      setBlockedStatus(
        failure.code === "account_revoked"
          ? "revoked"
          : failure.code === "recovery_required"
            ? "recovery_pending"
            : "blocked",
      );
      setScreen("blocked");
      return;
    }
    if (failure.code === "no_permission") {
      setScreen("no_permission");
      return;
    }
    if (failure.code === "session_expired") {
      setScreen("expired");
      return;
    }
    setError(loginErrorMessage(failure.code));
    setScreen("login");
  }

  async function login(input: { identifier: string; password: string }): Promise<void> {
    setError(undefined);
    try {
      acceptSession(await authClient.login(input));
    } catch (reason) {
      showFailure(reason);
    }
  }

  async function activateInvite(input: { token: string; password: string }): Promise<void> {
    try {
      acceptSession(await authClient.activateInvite(input));
    } catch (reason) {
      showFailure(reason);
    }
  }

  async function requestRecovery(identifier: string): Promise<void> {
    try {
      await authClient.requestRecovery(identifier);
    } catch (reason) {
      throw reason instanceof MobileAuthError ? reason : new MobileAuthError("network");
    }
  }

  async function logout(): Promise<void> {
    await authClient.logout().catch(() => undefined);
    setSession(undefined);
    setScreen("login");
  }

  if (screen === "ready" && session !== undefined) {
    return (
      <View style={styles.authenticatedShell}>
        {children(session, authClient, {
          openPrivacyCenter: () => {
            setPrivacyReturnScreen("ready");
            setPrivacyActiveTopic(null);
            setScreen("privacy");
          },
          requestLogout: () => void logout(),
        })}
      </View>
    );
  }

  if (screen === "checking") return <SessionLoadingScreen />;

  if (screen === "first_access") {
    return (
      <FirstAccessScreen
        onActivate={activateInvite}
        onBack={() => setScreen("login")}
        onValidateInvite={(token) => authClient.validateInvite(token)}
      />
    );
  }

  if (screen === "recovery") {
    return <RecoveryScreen onBack={() => setScreen("login")} onRequestRecovery={requestRecovery} />;
  }

  if (screen === "privacy") {
    return (
      <PrivacyCenterScreen
        activeTopic={privacyActiveTopic}
        onSelectTopic={setPrivacyActiveTopic}
        onBack={() => setScreen(privacyReturnScreen)}
        onSubmitRightsRequest={(request) => authClient.submitPrivacyRequest(request)}
      />
    );
  }

  if (screen === "expired") {
    return (
      <GateMessage
        title="Sua sessao expirou"
        body="Sua sessao expirou. Entre novamente para continuar. As acoes salvas neste aparelho continuam pendentes de sincronizacao."
        primaryLabel="Entrar novamente"
        onPrimary={() => setScreen("login")}
      />
    );
  }

  if (screen === "blocked") {
    const body =
      blockedStatus === "revoked"
        ? "Seu acesso a esta loja foi revogado. Fale com a administracao para revisar o vinculo."
        : blockedStatus === "recovery_pending"
          ? "Sua conta precisa de recuperacao antes de liberar uma nova sessao."
          : "Conta bloqueada. Fale com a lideranca ou administracao da loja.";
    return (
      <GateMessage
        title="Conta indisponivel"
        body={body}
        primaryLabel="Solicitar recuperacao da conta"
        onPrimary={() => setScreen("recovery")}
        secondaryLabel="Voltar para entrar"
        onSecondary={() => setScreen("login")}
      />
    );
  }

  if (screen === "no_permission") {
    return (
      <GateMessage
        title="Sem permissao para operar nesta area"
        body="Voce nao tem permissao para esta area nesta loja. A lideranca pode revisar seu vinculo sem esconder tarefas pendentes."
        primaryLabel="Sair da conta"
        onPrimary={() => void logout()}
      />
    );
  }

  return (
    <LoginScreen
      {...(error === undefined ? {} : { error })}
      onFirstAccess={() => setScreen("first_access")}
      onLogin={login}
      onOpenPrivacy={() => {
        setPrivacyReturnScreen("login");
        setPrivacyActiveTopic(null);
        setScreen("privacy");
      }}
      onRecovery={() => setScreen("recovery")}
    />
  );
}

function SessionLoadingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Image
        accessibilityLabel="Validade Zero - Operacao de risco zero"
        resizeMode="contain"
        source={brandSymbol}
        style={styles.brandSymbol}
      />
      <ScreenHeader title="Operacao de risco zero" body="Verificando sua sessao com seguranca..." />
      <StatusNotice>
        O acesso operacional so abre depois da confirmacao da sua conta e loja.
      </StatusNotice>
    </ScrollView>
  );
}

function GateMessage({
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={title} body={body} />
      <StatusNotice tone="error">Este estado nao libera nenhuma acao operacional.</StatusNotice>
      <PrimaryAction label={primaryLabel} onPress={onPrimary} />
      {secondaryLabel === undefined || onSecondary === undefined ? null : (
        <SecondaryAction label={secondaryLabel} onPress={onSecondary} />
      )}
    </ScrollView>
  );
}

export function configuredApiBaseUrl(): string {
  const value =
    normalizeApiBaseUrl((process.env as { EXPO_PUBLIC_API_URL?: string }).EXPO_PUBLIC_API_URL) ||
    normalizeApiBaseUrl(apiUrlFromExpoConfig()) ||
    STAGING_API_BASE_URL;
  return value;
}

function apiUrlFromExpoConfig(): string | undefined {
  const constants = loadExpoConstantsConfig();
  if (constants === undefined) return undefined;
  const extra = constants.default.expoConfig?.extra;
  if (extra === undefined || extra === null || typeof extra !== "object") return undefined;
  const value = extra.EXPO_PUBLIC_API_URL;
  return typeof value === "string" ? value : undefined;
}

function loadExpoConstantsConfig(): ExpoConstantsConfigPort | undefined {
  try {
    return require("expo-constants") as ExpoConstantsConfigPort;
  } catch {
    const globalRequire = (globalThis as { require?: (moduleName: string) => unknown }).require;
    if (typeof globalRequire !== "function") return undefined;
    try {
      return globalRequire("expo-constants") as ExpoConstantsConfigPort;
    } catch {
      return undefined;
    }
  }
}

function normalizeApiBaseUrl(value: string | undefined): string {
  if (typeof value !== "string") return "";
  const baseUrl = value.trim();
  if (baseUrl === "" || baseUrl.includes("placeholder")) return "";
  return /^https?:\/\//.test(baseUrl) ? baseUrl.replace(/\/$/, "") : "";
}

function toMobileAuthError(
  payload: unknown,
  response?: { path: string; status: number },
): MobileAuthError {
  if (response?.path === "/auth/session" && response.status === 401)
    return new MobileAuthError("session_expired");
  if (response?.path === "/auth/login" && (response.status === 401 || response.status === 429))
    return new MobileAuthError("invalid_credentials");
  const invite = InviteValidationResponseSchema.safeParse(payload);
  if (invite.success && invite.data.status !== "valid")
    return new MobileAuthError("invalid_invite");
  const account = AccountAccessErrorResponseSchema.safeParse(payload);
  if (account.success) return new MobileAuthError(account.data.error);
  const credentials = InvalidCredentialsResponseSchema.safeParse(payload);
  if (credentials.success) return new MobileAuthError("invalid_credentials");
  const denial = AuthorizationContract.denial.safeParse(payload);
  if (denial.success) return new MobileAuthError("no_permission");
  return new MobileAuthError("network");
}

function loginErrorMessage(code: MobileAuthErrorCode): string {
  if (code === "invalid_credentials") return "Confira o identificador e a senha antes de entrar.";
  if (code === "network")
    return "Nao foi possivel abrir o acesso seguro agora. Confira a conexao e tente novamente.";
  return "Nao foi possivel concluir o acesso agora. Tente novamente.";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    justifyContent: "center",
    padding: captureSpacing.large,
  },
  seal: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: captureColors.accent,
    borderColor: captureColors.accent,
    borderRadius: 72,
    borderWidth: 2,
    height: 144,
    justifyContent: "center",
    width: 144,
  },
  brandSymbol: {
    alignSelf: "center",
    height: 96,
    width: 96,
  },
  sealMark: {
    color: captureColors.onAccent,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34,
  },
  authenticatedShell: {
    backgroundColor: captureColors.background,
    flex: 1,
  },
});
