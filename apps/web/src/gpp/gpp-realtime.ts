import * as React from "react";
import {
  GppRealtimeEnvelopeSchema,
  type GppQueueSnapshot,
  type GppRealtimeEnvelope,
} from "@validade-zero/contracts";
import type { GppClient } from "./gpp-client";

export type GppRealtimeState = "inactive" | "connecting" | "active" | "refreshing" | "paused";

export interface GppRealtimeSocket {
  close(): void;
  addEventListener(type: "open", listener: () => void): void;
  addEventListener(type: "close" | "error", listener: () => void): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
}

export interface GppRealtimeViewState {
  state: GppRealtimeState;
  statusLabel: "Tempo real ativo" | "Tempo real pausado" | "Tempo real indisponivel";
  freshnessLabel: string;
  ariaLiveProps: { "aria-live": "polite" };
  lastUpdatedAt?: Date | undefined;
  snapshot?: GppQueueSnapshot | undefined;
  refresh(): Promise<void>;
}

export function useGppRealtime(input: {
  canReadGppQueue: boolean;
  client: GppClient;
  createWebSocket?: ((url: string) => GppRealtimeSocket) | undefined;
  enabled: boolean;
  endpoint?: string | undefined;
  now?: (() => Date) | undefined;
  pollIntervalMs?: number | undefined;
  storeId: string;
}): GppRealtimeViewState {
  const now = input.now ?? (() => new Date());
  const [state, setState] = React.useState<GppRealtimeState>(
    input.enabled && input.canReadGppQueue ? "connecting" : "inactive",
  );
  const [snapshot, setSnapshot] = React.useState<GppQueueSnapshot>();
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date>();
  const socketFactory = input.createWebSocket ?? defaultWebSocketFactory;

  const refresh = React.useCallback(async () => {
    setState((current) => (current === "active" ? "refreshing" : current));
    const next = await input.client.readQueue({ storeId: input.storeId });
    setSnapshot(next);
    setLastUpdatedAt(now());
    setState((current) => (current === "refreshing" ? "active" : current));
  }, [input.client, input.storeId, now]);

  React.useEffect(() => {
    if (!input.enabled || !input.canReadGppQueue) {
      setState("inactive");
      return;
    }

    let socket: GppRealtimeSocket | undefined;
    try {
      socket = socketFactory(realtimeUrl(input.endpoint ?? "/gpp/realtime", input.storeId));
      setState("connecting");
    } catch {
      setState("paused");
      return;
    }

    socket.addEventListener("open", () => setState("active"));
    socket.addEventListener("close", () => setState("paused"));
    socket.addEventListener("error", () => setState("paused"));
    socket.addEventListener("message", (event) => {
      const parsed = parseRealtimeMessage(event.data);
      if (parsed === undefined || parsed.storeId !== input.storeId) return;
      void refresh();
    });

    return () => socket?.close();
  }, [input.canReadGppQueue, input.enabled, input.endpoint, input.storeId, refresh, socketFactory]);

  React.useEffect(() => {
    if (state !== "paused") return;
    const interval = window.setInterval(() => {
      void refresh();
    }, input.pollIntervalMs ?? 30_000);

    return () => window.clearInterval(interval);
  }, [input.pollIntervalMs, refresh, state]);

  return {
    state,
    statusLabel: statusLabelFor(state),
    freshnessLabel: freshnessLabel(lastUpdatedAt, now()),
    ariaLiveProps: { "aria-live": "polite" },
    ...(lastUpdatedAt === undefined ? {} : { lastUpdatedAt }),
    ...(snapshot === undefined ? {} : { snapshot }),
    refresh,
  };
}

function defaultWebSocketFactory(url: string): GppRealtimeSocket {
  return new WebSocket(url);
}

function realtimeUrl(endpoint: string, storeId: string): string {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("storeId", storeId);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function parseRealtimeMessage(data: unknown): GppRealtimeEnvelope | undefined {
  const raw = typeof data === "string" ? safeJson(data) : data;
  const parsed = GppRealtimeEnvelopeSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function statusLabelFor(state: GppRealtimeState): GppRealtimeViewState["statusLabel"] {
  if (state === "active" || state === "refreshing") return "Tempo real ativo";
  if (state === "paused") return "Tempo real pausado";
  return "Tempo real indisponivel";
}

function freshnessLabel(lastUpdatedAt: Date | undefined, now: Date): string {
  if (lastUpdatedAt === undefined) return "Ainda nao atualizado";
  const seconds = Math.max(0, Math.floor((now.getTime() - lastUpdatedAt.getTime()) / 1000));
  return `Atualizado ha ${seconds}s`;
}
