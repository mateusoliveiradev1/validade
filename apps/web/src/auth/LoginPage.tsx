import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function LoginPage({ error, onFirstAccess, onLogin, onPrivacy, onRecovery }: {
  error?: string;
  onLogin: (input: { identifier: string; password: string }) => Promise<void>;
  onFirstAccess: () => void;
  onRecovery: () => void;
  onPrivacy: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const identifierError = identifier.trim() === "" ? "Informe seu identificador de acesso." : undefined;
  const passwordError = password === "" ? "Informe sua senha." : undefined;
  return <AuthFrame title="Entrar no Validade Zero" body="Use o acesso criado pela lideranca da loja piloto.">
    {error === undefined ? null : <p role="alert" className="rounded-lg border border-critical-border bg-critical-surface p-3 text-sm text-destructive">{error}</p>}
    <label className="grid gap-1 text-sm font-semibold">Identificador de acesso
      <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} aria-invalid={submitted && identifierError !== undefined} />
      {submitted && identifierError !== undefined ? <span role="alert" className="text-sm text-destructive">{identifierError}</span> : null}
    </label>
    <label className="grid gap-1 text-sm font-semibold">Senha
      <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={submitted && passwordError !== undefined} />
      {submitted && passwordError !== undefined ? <span role="alert" className="text-sm text-destructive">{passwordError}</span> : null}
    </label>
    <Button className="min-h-12" onClick={() => { setSubmitted(true); if (identifierError === undefined && passwordError === undefined) void onLogin({ identifier: identifier.trim(), password }); }}>Entrar no Validade Zero</Button>
    <Button variant="outline" onClick={onFirstAccess}>Ativar conta por convite</Button>
    <Button variant="ghost" onClick={onRecovery}>Recuperar acesso da conta</Button>
    <Button variant="ghost" onClick={onPrivacy}>Abrir Centro de Privacidade</Button>
  </AuthFrame>;
}

export function AuthFrame({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-background p-4">
    <section className="grid w-full max-w-md gap-5 rounded-lg border bg-card p-6">
      <div className="grid gap-2"><p className="text-sm font-semibold text-primary">Operacao de risco zero</p><h1 className="text-[28px] font-semibold leading-[34px]">{title}</h1><p className="text-base leading-6 text-muted-foreground">{body}</p></div>
      {children}
    </section>
  </main>;
}
