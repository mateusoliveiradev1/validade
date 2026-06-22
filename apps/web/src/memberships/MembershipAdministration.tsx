import { useEffect, useState } from "react";
import {
  MembershipListResponseSchema,
  SessionContextResponseSchema,
  type ManagedStoreMembership,
  type SessionContextResponse,
} from "@validade-zero/contracts";
import { MembershipEditor } from "./MembershipEditor";
import { MembershipTable } from "./MembershipTable";

type MembershipState =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "ready"; context: SessionContextResponse; items: readonly ManagedStoreMembership[] }
  | { status: "error"; message: string };

export function MembershipAdministration() {
  const [state, setState] = useState<MembershipState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const contextResponse = await fetch("/session/context?storeId=loja-piloto");
        if (!contextResponse.ok)
          throw new Error("Nao foi possivel carregar seu escopo administrativo.");
        const context = SessionContextResponseSchema.parse(await contextResponse.json());
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
  }, []);

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
    <section aria-label="Administracao de vinculos" className="grid gap-4">
      <MembershipEditor
        storeId={state.context.store.storeId}
        storeName={state.context.store.storeName}
        onCreated={update}
      />
      <MembershipTable items={state.items} onChanged={update} />
    </section>
  );
}
