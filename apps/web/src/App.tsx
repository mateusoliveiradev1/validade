import { useState } from "react";
import { HealthContract } from "@validade-zero/contracts";

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
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        alignContent: "center",
        gap: "1rem",
        padding: "2rem",
        color: "#112016",
        background: "#f5f7ef",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, letterSpacing: "0.08em" }}>
        Ambiente seguro para desenvolvimento
      </p>
      <h1 style={{ margin: 0, fontSize: "clamp(2rem, 7vw, 4rem)" }}>Validade Zero</h1>
      <p style={{ maxWidth: "42rem", margin: 0, fontSize: "1.125rem" }}>
        Smoke web ficticio para validar contrato compartilhado, API local e ausencia de dados reais.
      </p>
      <button
        type="button"
        onClick={() => void verifyApi()}
        style={{
          width: "fit-content",
          border: 0,
          borderRadius: "8px",
          padding: "0.85rem 1rem",
          color: "#f9fff6",
          background: "#166534",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Verificar API
      </button>
      <p data-testid="api-status" aria-live="polite" style={{ margin: 0 }}>
        {apiStatus}
      </p>
    </main>
  );
}
