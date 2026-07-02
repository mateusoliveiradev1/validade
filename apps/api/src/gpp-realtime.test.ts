import { describe, expect, it } from "vitest";
import {
  createDurableObjectGppRealtimePublisher,
  createInMemoryGppRealtimePublisher,
  createNoopGppRealtimePublisher,
  storeRoomName,
  type GppRealtimeRoomBinding,
} from "./gpp-realtime";

const event = {
  eventId: "gpp-event-001",
  storeId: "loja-piloto",
  kind: "gpp_entries_changed",
  occurredAt: "2030-01-10T12:30:00.000Z",
  actorLabel: "Operador GPP",
  refresh: {
    reason: "central_commit",
    scope: "queue",
    topics: ["queue"],
  },
} as const;

describe("GPP realtime publisher", () => {
  it("keeps no-op publishing available when no binding is configured", async () => {
    await expect(createNoopGppRealtimePublisher().publish(event)).resolves.toBeUndefined();
    await expect(
      createDurableObjectGppRealtimePublisher(undefined).publish(event),
    ).resolves.toBeUndefined();
  });

  it("captures in-memory events as validated refresh hints", async () => {
    const publisher = createInMemoryGppRealtimePublisher();

    await publisher.publish(event);

    expect(publisher.readEvents()).toEqual([event]);
  });

  it("routes Durable Object publish requests through a store-scoped room name", async () => {
    const calls: Array<{ roomName: string; body: unknown }> = [];
    const binding: GppRealtimeRoomBinding = {
      idFromName(roomName) {
        calls.push({ roomName, body: undefined });
        return { toString: () => roomName } as DurableObjectId;
      },
      get() {
        return {
          fetch: async (request: Request) => {
            calls[calls.length - 1] = {
              roomName: calls[calls.length - 1]?.roomName ?? "missing",
              body: await request.json(),
            };
            return Response.json({ accepted: true }, { status: 202 });
          },
        } as DurableObjectStub;
      },
    };

    await createDurableObjectGppRealtimePublisher(binding).publish(event);

    expect(calls).toEqual([
      {
        roomName: "gpp-store:loja-piloto",
        body: event,
      },
    ]);
    expect(storeRoomName("Loja Piloto/18")).toBe("gpp-store:Loja-Piloto-18");
  });

  it("fails publish when the room does not accept the event", async () => {
    const binding: GppRealtimeRoomBinding = {
      idFromName: () => ({ toString: () => "room" }) as DurableObjectId,
      get: () =>
        ({
          fetch: () => Promise.resolve(Response.json({ accepted: false }, { status: 503 })),
        }) as DurableObjectStub,
    };

    await expect(createDurableObjectGppRealtimePublisher(binding).publish(event)).rejects.toThrow(
      /realtime room/i,
    );
  });
});
