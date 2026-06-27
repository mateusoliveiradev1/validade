import { useEffect, useState } from "react";
import {
  MembershipListResponseSchema,
  SessionContextResponseSchema,
  type ManagedStoreMembership,
  type SessionContextResponse,
} from "@validade-zero/contracts";
import { Badge } from "../components/ui/badge";
import { MembershipTable } from "./MembershipTable";
import { InviteAdministration } from "./InviteAdministration";

type MembershipState =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "ready"; context: SessionContextResponse; items: readonly ManagedStoreMembership[] }
  | { status: "error"; message: string };

export function MembershipAdministration({
  onOpenInviteActivation,
  session: providedSession,
}: {
  onOpenInviteActivation?: ((token: string) => void) | undefined;
  session?: SessionContextResponse;
}) {
  const [state, setState] = useState<MembershipState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let context: SessionContextResponse;
        if (providedSession !== undefined) {
          context = providedSession;
        } else {
          const contextResponse = await fetch("/session/context");
          if (!contextResponse.ok)
            throw new Error("Nao foi possivel carregar seu escopo administrativo.");
          const contextPayload: unknown = await contextResponse.json();
          context = SessionContextResponseSchema.parse(contextPayload);
        }
        if (!context.actions.canManageUsers) {
          if (!cancelled) setState({ status: "hidden" });
          return;
        }
        const membershipsResponse = await fetch(
          `/memberships?storeId=${encodeURIComponent(context.store.storeId)}`,
        );
        if (!membershipsResponse.ok)
          throw new Error("Nao foi possivel carregar vinculos desta loja.");
        const memberships = MembershipListResponseSchema.parse(await membershipsResponse.json());
        if (!cancelled) setState({ status: "ready", context, items: memberships.items });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Nao foi possivel carregar vinculos.",
          });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [providedSession, reloadKey]);

  if (state.status === "loading" || state.status === "hidden") return null;
  if (state.status === "error") return <p aria-live="polite">{state.message}</p>;

  const update = (membership: ManagedStoreMembership) => {
    setState((current) =>
      current.status !== "ready"
        ? current
        : {
            ...current,
            items: current.items.some((item) => item.membershipId === membership.membershipId)
              ? current.items.map((item) =>
                  item.membershipId === membership.membershipId ? membership : item,
                )
              : [...current.items, membership],
          },
    );
  };

  return (
    <section aria-label="Administracao de vinculos" className="grid gap-5">
      <header className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-primary">Administracao de acessos</p>
          <h1 className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">
            Convites e vinculos da loja
          </h1>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Crie o primeiro acesso, acompanhe quem ja esta ativo e ajuste papeis sem abrir cadastro
            publico fora do escopo autorizado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Badge tone="success">{activeMembershipCount(state.items)} ativo(s)</Badge>
          <Badge>{state.context.store.storeName}</Badge>
        </div>
      </header>
      <InviteAdministration
        storeId={state.context.store.storeId}
        storeName={state.context.store.storeName}
        issuerLabel={state.context.actor.displayName ?? state.context.actor.subjectId}
        onInviteCreated={() => setReloadKey((value) => value + 1)}
        {...(onOpenInviteActivation === undefined
          ? {}
          : { onOpenActivation: onOpenInviteActivation })}
      />
      <MembershipTable items={state.items} onChanged={update} />
    </section>
  );
}

function activeMembershipCount(items: readonly ManagedStoreMembership[]): number {
  return items.filter((item) => item.status === "active").length;
}
