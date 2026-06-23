import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AuthFrame } from "./LoginPage";
export function RecoveryPage({
  onBack,
  onRequest,
}: {
  onBack: () => void;
  onRequest: (identifier: string) => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState("");
  const [feedback, setFeedback] = useState<string>();
  return (
    <AuthFrame
      title="Recuperar acesso da conta"
      body="Informe seu identificador. Esta tela nao confirma se uma conta existe."
    >
      {feedback === undefined ? null : (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          {feedback}
        </p>
      )}
      <label className="grid gap-1 text-sm font-semibold">
        E-mail ou identificador do convite
        <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
      </label>
      <Button
        onClick={() =>
          void onRequest(identifier).then(() =>
            setFeedback("Se houver uma conta elegivel, a proxima etapa sera enviada."),
          )
        }
      >
        Solicitar recuperacao da conta
      </Button>
      <Button variant="outline" onClick={onBack}>
        Voltar para entrar
      </Button>
    </AuthFrame>
  );
}
