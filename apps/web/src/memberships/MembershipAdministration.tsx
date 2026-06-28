import { useEffect, useState } from "react";
import {
  MembershipListResponseSchema,
  SessionContextResponseSchema,
  SessionStoresResponseSchema,
  type ManagedStoreMembership,
  type SessionContextResponse,
  type SessionStoreAccess,
} from "@validade-zero/contracts";
import type { WebFetcher } from "../auth/authenticated-fetch";
import { Badge } from "../components/ui/badge";
import { Select } from "../components/ui/select";
import { MembershipTable } from "./MembershipTable";
import { InviteAdministration } from "./InviteAdministration";

type MembershipState =
  | { status: "loading" }
  | { status: "hidden" }
  | {
      status: "ready";
      context: SessionContextResponse;
      stores: readonly SessionStoreAccess[];
      selectedStoreId: string;
      items: readonly ManagedStoreMembership[];
    }
  | { status: "error"; message: string };

export function MembershipAdministration({
  fetcher = fetch,
  onOpenInviteActivation,
  session: providedSession,
}: {
  fetcher?: WebFetcher;
  onOpenInviteActivation?: ((token: string) => void) | undefined;
  session?: SessionContextResponse;
}) {
  const [state, setState] = useState<MembershipState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(
    providedSession?.store.storeId,
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let context: SessionContextResponse;
        if (providedSession !== undefined) {
          context = providedSession;
        } else {
          const contextResponse = await fetcher("/session/context");
          if (!contextResponse.ok)
            throw new Error("Nao foi possivel carregar seu escopo administrativo.");
          const contextPayload: unknown = await contextResponse.json();
          context = SessionContextResponseSchema.parse(contextPayload);
        }
        const storesResponse = await fetcher("/session/stores");
        const sessionStores = storesResponse.ok
          ? SessionStoresResponseSchema.parse(await storesResponse.json()).stores
          : [sessionContextToStoreAccess(context)];
        const manageableStores = sessionStores.filter((store) => store.actions.canManageUsers);
        if (manageableStores.length === 0) {
          if (!cancelled) setState({ status: "hidden" });
          return;
        }
        const targetStoreId = resolveSelectedStoreId({
          selectedStoreId,
          context,
          manageableStores,
        });
        if (targetStoreId !== selectedStoreId && !cancelled) {
          setSelectedStoreId(targetStoreId);
        }
        const targetContext =
          targetStoreId === context.store.storeId
            ? context
            : await readSessionContextForStore(targetStoreId, fetcher);
        if (!targetContext.actions.canManageUsers) {
          if (!cancelled) setState({ status: "hidden" });
          return;
        }
        const membershipsResponse = await fetcher(
          `/memberships?storeId=${encodeURIComponent(targetContext.store.storeId)}`,
        );
        if (!membershipsResponse.ok)
          throw new Error("Nao foi possivel carregar vinculos desta loja.");
        const memberships = MembershipListResponseSchema.parse(await membershipsResponse.json());
        if (!cancelled)
          setState({
            status: "ready",
            context: targetContext,
            stores: manageableStores,
            selectedStoreId: targetStoreId,
            items: memberships.items,
          });
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
  }, [fetcher, providedSession, reloadKey, selectedStoreId]);

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
          {state.stores.length > 1 ? (
            <Badge tone="success">{state.stores.length} loja(s) administradas</Badge>
          ) : null}
          <Badge tone="success">{activeMembershipCount(state.items)} ativo(s)</Badge>
          <Badge>{state.context.store.storeName}</Badge>
        </div>
      </header>
      {state.stores.length > 1 ? (
        <label className="grid max-w-md gap-1 text-sm font-semibold">
          Loja para administrar
          <Select
            aria-label="Loja para administrar"
            value={state.selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
          >
            {state.stores.map((store) => (
              <option key={store.store.storeId} value={store.store.storeId}>
                {store.store.storeName}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      <InviteAdministration
        fetcher={fetcher}
        storeId={state.context.store.storeId}
        storeName={state.context.store.storeName}
        issuerLabel={state.context.actor.displayName ?? state.context.actor.subjectId}
        onInviteCreated={() => setReloadKey((value) => value + 1)}
        {...(onOpenInviteActivation === undefined
          ? {}
          : { onOpenActivation: onOpenInviteActivation })}
      />
      <MembershipTable fetcher={fetcher} items={state.items} onChanged={update} />
    </section>
  );
}

function activeMembershipCount(items: readonly ManagedStoreMembership[]): number {
  return items.filter((item) => item.status === "active").length;
}

async function readSessionContextForStore(
  storeId: string,
  fetcher: WebFetcher,
): Promise<SessionContextResponse> {
  const response = await fetcher(`/session/context?storeId=${encodeURIComponent(storeId)}`);
  if (!response.ok) throw new Error("Nao foi possivel carregar seu escopo nesta loja.");
  return SessionContextResponseSchema.parse(await response.json());
}

function sessionContextToStoreAccess(context: SessionContextResponse): SessionStoreAccess {
  return {
    store: context.store,
    roles: [context.activeRole],
    actions: context.actions,
  };
}

function resolveSelectedStoreId(input: {
  selectedStoreId: string | undefined;
  context: SessionContextResponse;
  manageableStores: readonly SessionStoreAccess[];
}): string {
  if (
    input.selectedStoreId !== undefined &&
    input.manageableStores.some((store) => store.store.storeId === input.selectedStoreId)
  ) {
    return input.selectedStoreId;
  }

  const currentContextStore = input.manageableStores.find(
    (store) => store.store.storeId === input.context.store.storeId,
  );
  return currentContextStore?.store.storeId ?? input.manageableStores[0]!.store.storeId;
}
