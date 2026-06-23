import { useState } from "react";
import type { InviteValidationResponse } from "@validade-zero/contracts";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AuthFrame } from "./LoginPage";

export function FirstAccessPage({
  onActivate,
  onBack,
  onValidate,
}: {
  onActivate: (input: { token: string; password: string }) => Promise<void>;
  onBack: () => void;
  onValidate: (token: string) => Promise<InviteValidationResponse>;
}) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState<InviteValidationResponse>();
  const [error, setError] = useState<string>();
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);
  const passwordError =
    password.length > 0 && password.length < 10
      ? "Use pelo menos 10 caracteres para esta senha."
      : undefined;
  const tokenError = token.trim().length > 0 && token.trim().length < 32;
  return (
    <AuthFrame
      title="Ativar conta da loja piloto"
      body="Confirme o convite antes de criar a senha de acesso."
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
        Codigo do convite
        <Input
          value={token}
          onChange={(event) => {
            setToken(event.target.value);
            setError(undefined);
          }}
          aria-invalid={tokenError}
        />
      </label>
      <Button
        disabled={validating}
        onClick={() => {
          const normalizedToken = token.trim();
          if (normalizedToken.length < 32) {
            setError("Informe o codigo completo do convite antes de validar.");
            setInvite(undefined);
            return;
          }
          setValidating(true);
          setError(undefined);
          void onValidate(normalizedToken)
            .then((result) => {
              setInvite(result);
              setError(
                result.status === "valid"
                  ? undefined
                  : "Convite invalido ou expirado. Peca um novo convite a lideranca.",
              );
            })
            .catch(() => {
              setInvite(undefined);
              setError("Nao foi possivel validar o convite agora.");
            })
            .finally(() => setValidating(false));
        }}
      >
        {validating ? "Validando convite..." : "Validar convite da conta"}
      </Button>
      {invite?.status !== "valid" || invite.invite === undefined ? null : (
        <div className="grid gap-4 rounded-lg border bg-muted p-4">
          <p className="text-sm leading-5 text-muted-foreground">
            Convite confirmado para{" "}
            <span className="font-semibold text-foreground">{invite.invite.storeName}</span> com
            papel <span className="font-semibold text-foreground">{invite.invite.role}</span>.
          </p>
          <label className="grid gap-1 text-sm font-semibold">
            Crie sua senha
            <Input
              type="password"
              value={password}
              aria-label="Crie sua senha"
              onChange={(event) => {
                setPassword(event.target.value);
                setError(undefined);
              }}
              aria-invalid={passwordError !== undefined}
            />
            <span className="text-sm font-normal text-muted-foreground">
              Minimo de 10 caracteres. Use uma senha que voce consiga digitar no celular da
              operacao.
            </span>
            {passwordError === undefined ? null : (
              <span role="alert" className="text-sm font-normal text-destructive">
                {passwordError}
              </span>
            )}
          </label>
          <Button
            disabled={activating}
            onClick={() => {
              const normalizedToken = token.trim();
              if (password.length < 10) {
                setError(
                  password.length === 0 ? "Informe uma senha antes de ativar a conta." : undefined,
                );
                return;
              }
              setActivating(true);
              setError(undefined);
              void onActivate({ token: normalizedToken, password })
                .catch(() =>
                  setError(
                    "Nao foi possivel ativar a conta. Confira se o convite ainda e valido e tente novamente.",
                  ),
                )
                .finally(() => setActivating(false));
            }}
          >
            {activating ? "Ativando conta..." : "Ativar conta"}
          </Button>
        </div>
      )}
      <Button variant="outline" onClick={onBack}>
        Voltar para entrar
      </Button>
    </AuthFrame>
  );
}
