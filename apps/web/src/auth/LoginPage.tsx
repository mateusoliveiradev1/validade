import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function LoginPage({
  error,
  onFirstAccess,
  onLogin,
  onPrivacy,
  onRecovery,
}: {
  error?: string;
  onLogin: (input: { identifier: string; password: string }) => Promise<void>;
  onFirstAccess: () => void;
  onRecovery: () => void;
  onPrivacy: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const identifierError =
    identifier.trim() === "" ? "Informe seu identificador de acesso." : undefined;
  const passwordError = password === "" ? "Informe sua senha." : undefined;
  return (
    <AuthFrame
      title="Entrar no Validade Zero"
      body="Use o acesso criado pela lideranca da loja piloto."
    >
      {error === undefined ? null : (
        <p
          role="alert"
          className="rounded-lg border border-critical-border bg-critical-surface p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <label className="grid gap-1 text-sm font-semibold">
        Identificador de acesso
        <Input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          aria-invalid={submitted && identifierError !== undefined}
        />
        {submitted && identifierError !== undefined ? (
          <span role="alert" className="text-sm text-destructive">
            {identifierError}
          </span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Senha
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={submitted && passwordError !== undefined}
        />
        {submitted && passwordError !== undefined ? (
          <span role="alert" className="text-sm text-destructive">
            {passwordError}
          </span>
        ) : null}
      </label>
      <Button
        className="min-h-12"
        onClick={() => {
          setSubmitted(true);
          if (identifierError === undefined && passwordError === undefined)
            void onLogin({ identifier: identifier.trim(), password });
        }}
      >
        Entrar no Validade Zero
      </Button>
      <Button variant="outline" onClick={onFirstAccess}>
        Ativar conta por convite
      </Button>
      <Button variant="ghost" onClick={onRecovery}>
        Recuperar acesso da conta
      </Button>
      <Button variant="ghost" onClick={onPrivacy}>
        Abrir Centro de Privacidade
      </Button>
    </AuthFrame>
  );
}

export function AuthFrame({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 sm:p-6 lg:p-10">
      <div className="grid w-full max-w-md overflow-hidden rounded-xl border bg-card lg:max-w-6xl lg:grid-cols-[minmax(0,1.15fr)_minmax(23rem,0.85fr)]">
        <aside className="hidden bg-secondary/70 p-10 lg:grid lg:content-between lg:gap-12">
          <div className="grid max-w-lg gap-5">
            <img
              src="/brand-horizontal.png"
              alt="Validade Zero - Operacao de risco zero"
              className="h-auto w-full max-w-sm"
            />
            <h2 className="max-w-md text-3xl font-semibold tracking-[-0.03em] text-balance">
              Acesso operacional para confirmar o que esta na area de venda.
            </h2>
            <p className="max-w-prose text-base leading-7 text-muted-foreground">
              Use sua conta para abrir as tarefas, conferencias e registros autorizados para a sua
              loja. Nenhuma confirmacao depende apenas desta tela.
            </p>
          </div>

          <dl className="grid max-w-lg divide-y border-y border-border text-sm">
            <div className="grid gap-1 py-4">
              <dt className="font-semibold">Loja e permissoes</dt>
              <dd className="leading-6 text-muted-foreground">
                O convite e a sessao definem o que voce pode visualizar e confirmar.
              </dd>
            </div>
            <div className="grid gap-1 py-4">
              <dt className="font-semibold">Registro confiavel</dt>
              <dd className="leading-6 text-muted-foreground">
                Uma tarefa so fica resolvida apos a acao e a confirmacao fisica exigidas.
              </dd>
            </div>
          </dl>
        </aside>

        <section
          className="grid w-full gap-5 p-6 sm:p-8 lg:content-center lg:p-10"
          aria-labelledby="auth-title"
        >
          <header className="grid gap-2">
            <img
              src="/brand-horizontal.png"
              alt="Validade Zero - Operacao de risco zero"
              className="mb-1 h-auto w-full max-w-[18rem] lg:hidden"
            />
            <h1
              id="auth-title"
              className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em]"
            >
              {title}
            </h1>
            <p className="text-base leading-6 text-muted-foreground">{body}</p>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
