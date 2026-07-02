import { useEffect, useMemo, useState } from "react";
import {
  AccountAccessErrorResponseSchema,
  AuthenticatedSessionResponseSchema,
  InvalidCredentialsResponseSchema,
  InviteValidationResponseSchema,
  type SessionContextResponse,
} from "@validade-zero/contracts";
import { AuditWorkbench } from "./audit/AuditWorkbench";
import { CommandCenter } from "./command-center/CommandCenter";
import { FirstAccessPage } from "./auth/FirstAccessPage";
import { LoginPage } from "./auth/LoginPage";
import { RecoveryPage } from "./auth/RecoveryPage";
import { createAuthenticatedFetcher } from "./auth/authenticated-fetch";
import { Skeleton } from "./components/ui/skeleton";
import { GppControlRoute } from "./gpp/GppControlRoute";
import { MembershipAdministration } from "./memberships/MembershipAdministration";
import { PrivacyCenter } from "./privacy/PrivacyCenter";
import { AppShell, type AppRoute } from "./shell/AppShell";

export function App() {
  const [session, setSession] = useState<SessionContextResponse>();
  const [sessionToken, setSessionToken] = useState<string>();
  const [inviteToken, setInviteToken] = useState<string>();
  const [screen, setScreen] = useState<
    "loading" | "login" | "first" | "recovery" | "privacy" | "blocked"
  >("loading");
  const [route, setRoute] = useState<AppRoute>("operacao");
  const [error, setError] = useState<string>();
  const apiFetch = useMemo(() => createAuthenticatedFetcher(sessionToken), [sessionToken]);
  useEffect(() => {
    const urlInviteToken =
      typeof window === "undefined"
        ? undefined
        : new URLSearchParams(window.location.search).get("invite")?.trim();
    if (urlInviteToken !== undefined && urlInviteToken.length >= 32) {
      setInviteToken(urlInviteToken);
      setScreen("first");
      return;
    }

    void fetch("/auth/session")
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => undefined);
        if (!response.ok) {
          const access = AccountAccessErrorResponseSchema.safeParse(payload);
          if (access.success && access.data.error !== "session_expired") setScreen("blocked");
          else setScreen("login");
          return;
        }
        const parsed = AuthenticatedSessionResponseSchema.parse(payload);
        setSessionToken(parsed.sessionToken);
        setSession(parsed.session);
        setScreen("login");
      })
      .catch(() => setScreen("login"));
  }, []);
  async function login(input: { identifier: string; password: string }) {
    setError(undefined);
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      setError(
        InvalidCredentialsResponseSchema.safeParse(payload).success
          ? "Confira o identificador e a senha antes de entrar."
          : "Nao foi possivel abrir o acesso seguro agora.",
      );
      return;
    }
    const parsed = AuthenticatedSessionResponseSchema.parse(payload);
    setSessionToken(parsed.sessionToken);
    setSession(parsed.session);
    setScreen("login");
  }
  if (screen === "loading" || (session !== undefined && sessionToken === undefined))
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4">
        <div className="grid w-full max-w-md gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </main>
    );
  if (screen === "first")
    return (
      <FirstAccessPage
        {...(inviteToken === undefined ? {} : { initialToken: inviteToken })}
        onBack={() => {
          setInviteToken(undefined);
          clearInviteUrlParam();
          setScreen("login");
        }}
        onValidate={async (token) =>
          InviteValidationResponseSchema.parse(
            await (await fetch(`/auth/invites/${encodeURIComponent(token)}`)).json(),
          )
        }
        onActivate={async ({ token, password }) => {
          const response = await fetch(`/auth/invites/${encodeURIComponent(token)}/activate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          const payload: unknown = await response.json();
          if (!response.ok) throw new Error("invite");
          const parsed = AuthenticatedSessionResponseSchema.parse(payload);
          setSessionToken(parsed.sessionToken);
          setSession(parsed.session);
          setInviteToken(undefined);
          clearInviteUrlParam();
          setScreen("login");
        }}
      />
    );
  if (screen === "recovery")
    return (
      <RecoveryPage
        onBack={() => setScreen("login")}
        onRequest={async (identifier) => {
          await fetch("/auth/recovery/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier }),
          });
        }}
      />
    );
  if (screen === "privacy")
    return <PrivacyCenter onBack={() => setScreen(session === undefined ? "login" : "login")} />;
  if (screen === "blocked")
    return (
      <LoginPage
        error="Conta bloqueada ou sem permissao para esta loja. Fale com a lideranca ou administracao."
        onFirstAccess={() => setScreen("first")}
        onLogin={login}
        onPrivacy={() => setScreen("privacy")}
        onRecovery={() => setScreen("recovery")}
      />
    );
  if (session === undefined)
    return (
      <LoginPage
        {...(error === undefined ? {} : { error })}
        onFirstAccess={() => setScreen("first")}
        onLogin={login}
        onPrivacy={() => setScreen("privacy")}
        onRecovery={() => setScreen("recovery")}
      />
    );
  const activeRoute = routeAllowed(route, session) ? route : firstAllowedRoute(session);
  return (
    <AppShell
      session={session}
      route={activeRoute}
      onRouteChange={setRoute}
      onOpenPrivacy={() => setScreen("privacy")}
      onLogout={() => {
        void apiFetch("/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        setSession(undefined);
        setSessionToken(undefined);
      }}
    >
      {isOperationalRoute(activeRoute) ? (
        <CommandCenter
          activeRoute={activeRoute}
          storeId={session.store.storeId}
          canOpenAudit={session.actions.canReadStoreAudit}
          canReviewProductDrafts={session.actions.canReviewProductDrafts}
          canSendPilotPushTest={session.actions.canSendPilotPushTest}
          fetcher={apiFetch}
          onOpenAparelhos={() => setRoute("aparelhos")}
          onOpenAudit={() => setRoute("audit")}
          onOpenAtualizacoes={() => setRoute("atualizacoes")}
          onOpenOperacao={() => setRoute("operacao")}
        />
      ) : activeRoute === "controle-gpp" ? (
        <GppControlRoute fetcher={apiFetch} session={session} />
      ) : activeRoute === "access" ? (
        <MembershipAdministration
          fetcher={apiFetch}
          session={session}
          onOpenInviteActivation={(token) => {
            setInviteToken(token);
            writeInviteUrlParam(token);
            setScreen("first");
          }}
        />
      ) : (
        <AuditWorkbench
          fetcher={apiFetch}
          initialStoreId={session.store.storeId}
          initialStoreName={session.store.storeName}
        />
      )}
    </AppShell>
  );
}

function routeAllowed(route: AppRoute, session: SessionContextResponse): boolean {
  if (isOperationalRoute(route)) return session.actions.canReadCommandCenter;
  if (route === "controle-gpp") return canOpenGpp(session);
  if (route === "access") return session.actions.canManageUsers;
  return session.actions.canReadStoreAudit;
}

function firstAllowedRoute(session: SessionContextResponse): AppRoute {
  if (session.activeRole === "gpp" && canOpenGpp(session)) return "controle-gpp";
  if (session.actions.canReadCommandCenter) return "operacao";
  if (canOpenGpp(session)) return "controle-gpp";
  if (session.actions.canManageUsers) return "access";
  if (session.actions.canReadStoreAudit) return "audit";
  return "operacao";
}

function isOperationalRoute(
  route: AppRoute,
): route is "operacao" | "aparelhos" | "atualizacoes" | "validacao" {
  return (
    route === "operacao" ||
    route === "aparelhos" ||
    route === "atualizacoes" ||
    route === "validacao"
  );
}

function writeInviteUrlParam(token: string): void {
  if (typeof window === "undefined") return;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("invite", token);
  window.history.pushState({}, "", nextUrl);
}

function clearInviteUrlParam(): void {
  if (typeof window === "undefined") return;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete("invite");
  window.history.replaceState({}, "", nextUrl);
}

function canOpenGpp(session: SessionContextResponse): boolean {
  return session.featureFlags.controle_gpp_enabled && session.actions.canReadGppQueue;
}
