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
        <Input value={token} onChange={(event) => setToken(event.target.value)} />
      </label>
      <Button
        onClick={() =>
          void onValidate(token)
            .then((result) => {
              setInvite(result);
              setError(
                result.status === "valid"
                  ? undefined
                  : "Convite invalido ou expirado. Peca um novo convite a lideranca.",
              );
            })
            .catch(() => setError("Nao foi possivel validar o convite agora."))
        }
      >
        Validar convite da conta
      </Button>
      {invite?.status !== "valid" || invite.invite === undefined ? null : (
        <div className="grid gap-3 rounded-lg bg-muted p-4">
          <p className="text-sm">
            {invite.invite.storeName} - {invite.invite.role}
          </p>
          <label className="grid gap-1 text-sm font-semibold">
            Crie sua senha
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <Button onClick={() => void onActivate({ token, password })}>Ativar conta</Button>
        </div>
      )}
      <Button variant="outline" onClick={onBack}>
        Voltar para entrar
      </Button>
    </AuthFrame>
  );
}
