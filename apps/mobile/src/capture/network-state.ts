export type NetworkStateKind = "online" | "offline" | "degraded";

export interface NetworkState {
  kind: NetworkStateKind;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  checkedAt: string;
  source: "netinfo" | "fake";
}

export interface NetworkStateProvider {
  read(): Promise<NetworkState>;
}

export interface NetInfoSnapshot {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

export function normalizeNetworkState(
  snapshot: NetInfoSnapshot,
  input: { checkedAt: string; source: NetworkState["source"] },
): NetworkState {
  const kind =
    snapshot.isConnected === false
      ? "offline"
      : snapshot.isConnected === true && snapshot.isInternetReachable !== false
        ? "online"
        : "degraded";

  return {
    kind,
    isConnected: snapshot.isConnected,
    isInternetReachable: snapshot.isInternetReachable,
    checkedAt: input.checkedAt,
    source: input.source,
  };
}

export function createNetInfoNetworkStateProvider(input?: {
  now?: () => string;
}): NetworkStateProvider {
  const now = input?.now ?? (() => new Date().toISOString());

  return {
    async read() {
      const module = await import("@react-native-community/netinfo");
      const netInfo = module.default;
      const snapshot = await netInfo.fetch();

      return normalizeNetworkState(
        {
          isConnected: snapshot.isConnected,
          isInternetReachable: snapshot.isInternetReachable,
        },
        { checkedAt: now(), source: "netinfo" },
      );
    },
  };
}

export function createFakeNetworkStateProvider(
  initial: NetInfoSnapshot,
  input?: { now?: () => string },
): NetworkStateProvider & { setSnapshot(snapshot: NetInfoSnapshot): void } {
  let snapshot = initial;
  const now = input?.now ?? (() => new Date().toISOString());

  return {
    read() {
      return Promise.resolve(
        normalizeNetworkState(snapshot, {
          checkedAt: now(),
          source: "fake",
        }),
      );
    },
    setSnapshot(nextSnapshot) {
      snapshot = nextSnapshot;
    },
  };
}
