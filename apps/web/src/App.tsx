import { useEffect, useState } from "react";
import { AccountAccessErrorResponseSchema, AuthenticatedSessionResponseSchema, InvalidCredentialsResponseSchema, InviteValidationResponseSchema, type SessionContextResponse } from "@validade-zero/contracts";
import { AuditWorkbench } from "./audit/AuditWorkbench";
import { CommandCenter } from "./command-center/CommandCenter";
import { FirstAccessPage } from "./auth/FirstAccessPage";
import { LoginPage } from "./auth/LoginPage";
import { RecoveryPage } from "./auth/RecoveryPage";
import { Skeleton } from "./components/ui/skeleton";
import { MembershipAdministration } from "./memberships/MembershipAdministration";
import { PrivacyCenter } from "./privacy/PrivacyCenter";
import { AppShell, type AppRoute } from "./shell/AppShell";

export function App() {
  const [session, setSession] = useState<SessionContextResponse>(); const [screen, setScreen] = useState<"loading" | "login" | "first" | "recovery" | "privacy" | "blocked">("loading"); const [route, setRoute] = useState<AppRoute>("command"); const [error, setError] = useState<string>();
  useEffect(() => { void fetch("/auth/session").then(async (response) => { const payload: unknown = await response.json().catch(() => undefined); if (!response.ok) { const access = AccountAccessErrorResponseSchema.safeParse(payload); if (access.success && access.data.error !== "session_expired") setScreen("blocked"); else setScreen("login"); return; } const parsed = AuthenticatedSessionResponseSchema.parse(payload); setSession(parsed.session); setScreen("login"); }).catch(() => setScreen("login")); }, []);
  async function login(input: { identifier: string; password: string }) { setError(undefined); const response = await fetch("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }); const payload: unknown = await response.json().catch(() => undefined); if (!response.ok) { setError(InvalidCredentialsResponseSchema.safeParse(payload).success ? "Confira o identificador e a senha antes de entrar." : "Nao foi possivel abrir o acesso seguro agora."); return; } setSession(AuthenticatedSessionResponseSchema.parse(payload).session); setScreen("login"); }
  if (screen === "loading") return <main className="grid min-h-screen place-items-center bg-background p-4"><div className="grid w-full max-w-md gap-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-5 w-full" /><Skeleton className="h-12 w-full" /></div></main>;
  if (screen === "first") return <FirstAccessPage onBack={() => setScreen("login")} onValidate={async (token) => InviteValidationResponseSchema.parse(await (await fetch(`/auth/invites/${encodeURIComponent(token)}`)).json())} onActivate={async ({ token, password }) => { const response = await fetch(`/auth/invites/${encodeURIComponent(token)}/activate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const payload: unknown = await response.json(); if (!response.ok) throw new Error("invite"); setSession(AuthenticatedSessionResponseSchema.parse(payload).session); setScreen("login"); }} />;
  if (screen === "recovery") return <RecoveryPage onBack={() => setScreen("login")} onRequest={async (identifier) => { await fetch("/auth/recovery/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier }) }); }} />;
  if (screen === "privacy") return <PrivacyCenter onBack={() => setScreen(session === undefined ? "login" : "login")} />;
  if (screen === "blocked") return <LoginPage error="Conta bloqueada ou sem permissao para esta loja. Fale com a lideranca ou administracao." onFirstAccess={() => setScreen("first")} onLogin={login} onPrivacy={() => setScreen("privacy")} onRecovery={() => setScreen("recovery")} />;
  if (session === undefined) return <LoginPage {...(error === undefined ? {} : { error })} onFirstAccess={() => setScreen("first")} onLogin={login} onPrivacy={() => setScreen("privacy")} onRecovery={() => setScreen("recovery")} />;
  return <AppShell session={session} route={route} onRouteChange={setRoute} onOpenPrivacy={() => setScreen("privacy")} onLogout={() => { void fetch("/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); setSession(undefined); }}>
    {route === "command" ? <CommandCenter storeId={session.store.storeId} onOpenAudit={() => setRoute("audit")} /> : route === "access" ? <MembershipAdministration /> : <AuditWorkbench initialStoreId={session.store.storeId} initialStoreName={session.store.storeName} />}
  </AppShell>;
}
