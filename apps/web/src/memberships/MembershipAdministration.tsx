import { useEffect, useState } from "react";
import {
  MembershipListResponseSchema,
  SessionContextResponseSchema,
  type ManagedStoreMembership,
  type SessionContextResponse,
} from "@validade-zero/contracts";
import { MembershipTable } from "./MembershipTable";
import { InviteAdministration } from "./InviteAdministration";

type MembershipState =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "ready"; context: SessionContextResponse; items: readonly ManagedStoreMembership[] }
  | { status: "error"; message: string };

export function MembershipAdministration({
  session: providedSession,
}: {
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
          const contextResponse = await fetch("/session/context?storeId=loja-piloto");
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
    <section aria-label="Administracao de vinculos" className="grid gap-4">
      <InviteAdministration
        storeId={state.context.store.storeId}
        storeName={state.context.store.storeName}
        issuerLabel={state.context.actor.displayName ?? state.context.actor.subjectId}
        onInviteCreated={() => setReloadKey((value) => value + 1)}
      />
      <MembershipTable items={state.items} onChanged={update} />
    </section>
  );
}
