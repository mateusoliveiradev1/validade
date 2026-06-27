import { useEffect, useState } from "react";
import {
  SessionContextResponseSchema,
  type SessionContextResponse,
} from "@validade-zero/contracts";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

type ScopeState =
  | { status: "loading" }
  | { status: "ready"; context: SessionContextResponse }
  | { status: "blocked"; message: string }
  | { status: "error"; message: string };

export function CurrentScope({ storeId }: { storeId?: string } = {}) {
  const [scope, setScope] = useState<ScopeState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadScope() {
      try {
        const query = storeId === undefined ? "" : `?storeId=${encodeURIComponent(storeId)}`;
        const response = await fetch(`/session/context${query}`);
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
  }, [storeId]);

  if (scope.status === "loading") {
    return (
      <section
        aria-label="Escopo atual"
        className="grid max-w-2xl gap-3 rounded-lg border border-border bg-card p-4"
      >
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-full" />
      </section>
    );
  }

  if (scope.status === "blocked" || scope.status === "error") {
    return (
      <section
        aria-label="Escopo atual"
        className="grid max-w-2xl gap-1 rounded-lg border border-critical-border bg-critical-surface p-4"
        role="alert"
      >
        <p className="font-semibold text-destructive">Escopo operacional indisponivel</p>
        <p className="text-sm leading-5 text-foreground">{scope.message}</p>
      </section>
    );
  }

  const { context } = scope;

  return (
    <section
      aria-label="Escopo atual"
      className="grid max-w-2xl gap-3 rounded-lg border border-border bg-card p-4"
    >
      <p className="font-semibold">Escopo atual</p>
      <p className="text-base leading-6">
        {context.actor.displayName ?? context.actor.subjectId} atua como{" "}
        <strong>{roleLabel(context.activeRole)}</strong> em{" "}
        <strong>{context.store.storeName}</strong>.
      </p>
      <p className="text-sm leading-5 text-muted-foreground">
        Tarefas operacionais: {context.actions.canActOnTask ? "liberadas" : "bloqueadas"}.
      </p>
      {context.actions.canCloseShift ? (
        <Button type="button" className="min-h-12 w-fit">
          Fechar turno
        </Button>
      ) : (
        <p data-testid="lead-only-explanation" className="text-sm leading-5 text-muted-foreground">
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
