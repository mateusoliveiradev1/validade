import { GppRealtimeEnvelopeSchema, type GppRealtimeEnvelope } from "@validade-zero/contracts";

export interface GppRealtimePublisher {
  publish(event: GppRealtimeEnvelope): Promise<void>;
}

export interface InMemoryGppRealtimePublisher extends GppRealtimePublisher {
  readEvents(): readonly GppRealtimeEnvelope[];
}

export interface GppRealtimeRoomBinding {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export function createNoopGppRealtimePublisher(): GppRealtimePublisher {
  return {
    publish() {
      return Promise.resolve();
    },
  };
}

export function createInMemoryGppRealtimePublisher(): InMemoryGppRealtimePublisher {
  const events: GppRealtimeEnvelope[] = [];

  return {
    publish(event) {
      events.push(GppRealtimeEnvelopeSchema.parse(event));
      return Promise.resolve();
    },
    readEvents() {
      return [...events];
    },
  };
}

export function createDurableObjectGppRealtimePublisher(
  binding: GppRealtimeRoomBinding | undefined,
): GppRealtimePublisher {
  if (binding === undefined) return createNoopGppRealtimePublisher();

  return {
    async publish(event) {
      const parsed = GppRealtimeEnvelopeSchema.parse(event);
      const id = binding.idFromName(storeRoomName(parsed.storeId));
      const response = await binding.get(id).fetch(
        new Request("https://gpp-realtime.internal/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed),
        }),
      );

      if (!response.ok) {
        throw new Error("GPP realtime room did not accept the event.");
      }
    },
  };
}

export class GppRealtimeRoom {
  private readonly sockets = new Set<WebSocket>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/publish") {
      const payload: unknown = await request.json().catch(() => undefined);
      const event = GppRealtimeEnvelopeSchema.parse(payload);
      this.broadcast(event);
      return Response.json({ accepted: true }, { status: 202 });
    }

    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "gpp_realtime_websocket_required" }, { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    if (client === undefined || server === undefined) {
      return Response.json({ error: "gpp_realtime_pair_unavailable" }, { status: 503 });
    }
    server.accept();
    this.sockets.add(server);
    server.addEventListener("close", () => this.sockets.delete(server));
    server.addEventListener("error", () => this.sockets.delete(server));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private broadcast(event: GppRealtimeEnvelope): void {
    const message = JSON.stringify(GppRealtimeEnvelopeSchema.parse(event));

    for (const socket of this.sockets) {
      try {
        socket.send(message);
      } catch {
        this.sockets.delete(socket);
      }
    }
  }
}

export function storeRoomName(storeId: string): string {
  return `gpp-store:${storeId}`.replace(/[^a-zA-Z0-9:._-]/g, "-").slice(0, 160);
}
