import { useEffect, useState } from "react";
import { SessionContextResponseSchema, type SessionContextResponse } from "@validade-zero/contracts";

type ScopeState =
  | { status: "loading" }
  | { status: "ready"; context: SessionContextResponse }
  | { status: "blocked"; message: string }
  | { status: "error"; message: string };

export function CurrentScope() {
  const [scope, setScope] = useState<ScopeState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadScope() {
      try {
        const response = await fetch("/session/context?storeId=loja-piloto");
        const payload = (await response.json()) as unknown;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const message =
            payload !== null &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
              ? payload.message
              : "Nao foi possivel carregar seu escopo operacional.";

          setScope({ status: "blocked", message });
          return;
        }

        setScope({ status: "ready", context: SessionContextResponseSchema.parse(payload) });
      } catch {
        if (!cancelled) {
          setScope({
            status: "error",
            message: "Nao foi possivel carregar o escopo agora. Tente novamente.",
          });
        }
      }
    }

    void loadScope();

    return () => {
      cancelled = true;
    };
  }, []);

  if (scope.status === "loading") {
    return <section aria-label="Escopo atual">Carregando escopo operacional...</section>;
  }

  if (scope.status === "blocked" || scope.status === "error") {
    return (
      <section aria-label="Escopo atual">
        <p style={{ margin: 0, fontWeight: 700 }}>Escopo operacional indisponivel</p>
        <p style={{ margin: "0.35rem 0 0" }}>{scope.message}</p>
      </section>
    );
  }

  const { context } = scope;

  return (
    <section
      aria-label="Escopo atual"
      style={{
        display: "grid",
        gap: "0.75rem",
        maxWidth: "42rem",
        border: "1px solid #cbd5c0",
        borderRadius: "14px",
        padding: "1rem",
        background: "#ffffff",
      }}
    >
      <p style={{ margin: 0, fontWeight: 700 }}>Escopo atual</p>
      <p style={{ margin: 0 }}>
        {context.actor.displayName ?? context.actor.subjectId} atua como{" "}
        <strong>{roleLabel(context.activeRole)}</strong> em{" "}
        <strong>{context.store.storeName}</strong>.
      </p>
      <p style={{ margin: 0 }}>
        Tarefas operacionais: {context.actions.canActOnTask ? "liberadas" : "bloqueadas"}.
      </p>
      {context.actions.canCloseShift ? (
        <button
          type="button"
          style={{
            width: "fit-content",
            minHeight: "48px",
            border: 0,
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            color: "#f9fff6",
            background: "#14532d",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Fechar turno
        </button>
      ) : (
        <p data-testid="lead-only-explanation" style={{ margin: 0, color: "#4b5563" }}>
          Fechamento de turno aparece para lideranca ativa nesta loja.
        </p>
      )}
    </section>
  );
}

function roleLabel(role: SessionContextResponse["activeRole"]): string {
  if (role === "lead") {
    return "lideranca";
  }

  if (role === "admin") {
    return "administracao";
  }

  return "colaborador";
}
