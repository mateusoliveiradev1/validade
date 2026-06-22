import { useState } from "react";
import { HealthContract } from "@validade-zero/contracts";
import { AuditWorkbench } from "./audit/AuditWorkbench";
import { CurrentScope } from "./auth/CurrentScope";
import { Button } from "./components/ui/button";

const INITIAL_STATUS = "API ainda nao verificada";

export function App() {
  const [apiStatus, setApiStatus] = useState(INITIAL_STATUS);

  async function verifyApi() {
    setApiStatus("Verificando API local...");

    try {
      const response = await fetch("/health");
      const payload = HealthContract.response.parse(await response.json());

      setApiStatus(`${payload.service}: ${payload.status}`);
    } catch {
      setApiStatus("API local indisponivel para o smoke");
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-6">
        <header className="grid gap-3 rounded-lg border border-border bg-card p-5">
          <p className="m-0 text-sm font-semibold text-muted-foreground">
            Ambiente seguro para desenvolvimento
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <h1 className="m-0 text-2xl font-semibold leading-8 text-foreground">
                Validade Zero
              </h1>
              <p className="m-0 max-w-[72ch] text-base leading-6 text-muted-foreground">
                Smoke web ficticio para validar contrato compartilhado, API local e ausencia de
                dados reais.
              </p>
            </div>
            <div className="grid gap-2">
              <Button type="button" onClick={() => void verifyApi()}>
                Verificar API
              </Button>
              <p data-testid="api-status" aria-live="polite" className="m-0 text-sm">
                {apiStatus}
              </p>
            </div>
          </div>
        </header>

        <CurrentScope />
        <AuditWorkbench />
      </div>
    </main>
  );
}
