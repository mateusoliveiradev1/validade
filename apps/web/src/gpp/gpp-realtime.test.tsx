import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GppQueueSnapshot } from "@validade-zero/contracts";
import { act, useCallback } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GppClient } from "./gpp-client";
import { useGppRealtime, type GppRealtimeSocket } from "./gpp-realtime";

const NOW = new Date("2030-01-10T12:30:10.000Z");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("GPP web realtime helper", () => {
  it("refreshes the central snapshot after a valid realtime hint", async () => {
    const socket = new FakeSocket();
    const client = fakeClient(queueSnapshot("Banana central"));

    render(<RealtimeHarness client={client} socket={socket} />);

    act(() => socket.open());
    act(() => socket.message(realtimeEvent()));

    await waitFor(() => expect(client.readQueue).toHaveBeenCalledWith({ storeId: "loja-piloto" }));
    expect(await screen.findByText("Banana central")).toBeTruthy();
    expect(screen.getByText("Tempo real ativo")).toBeTruthy();
    expect(screen.getByText("Atualizado ha 0s").getAttribute("aria-live")).toBe("polite");
  });

  it("does not change visible rows from an event payload alone", async () => {
    const socket = new FakeSocket();
    const client = fakeClient(queueSnapshot("Central somente"));

    render(<RealtimeHarness client={client} socket={socket} />);

    act(() => socket.open());
    act(() =>
      socket.message({
        ...realtimeEvent(),
        entries: [{ product: { name: "Nao pode aparecer" } }],
      }),
    );

    expect(screen.queryByText("Nao pode aparecer")).toBeNull();
    expect(client.readQueue).not.toHaveBeenCalled();
    expect(screen.getByText("Sem snapshot central")).toBeTruthy();
  });

  it("shows paused fallback state and keeps manual refresh usable", async () => {
    const socket = new FakeSocket();
    const client = fakeClient(queueSnapshot("Tomate atualizado"));

    render(<RealtimeHarness client={client} socket={socket} />);

    act(() => socket.close());
    expect(await screen.findByText("Tempo real pausado")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));

    await waitFor(() => expect(client.readQueue).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Tomate atualizado")).toBeTruthy();
  });

  it("uses bounded polling while realtime is paused", async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    const client = fakeClient(queueSnapshot("Abobrinha central"));

    render(<RealtimeHarness client={client} socket={socket} pollIntervalMs={1_000} />);

    await act(async () => {
      socket.error();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(client.readQueue).toHaveBeenCalledTimes(1);
  });
});

function RealtimeHarness({
  client,
  pollIntervalMs,
  socket,
}: {
  client: GppClient;
  pollIntervalMs?: number;
  socket: FakeSocket;
}) {
  const createWebSocket = useCallback(() => socket, [socket]);
  const now = useCallback(() => NOW, []);
  const realtime = useGppRealtime({
    canReadGppQueue: true,
    client,
    createWebSocket,
    enabled: true,
    now,
    pollIntervalMs,
    storeId: "loja-piloto",
  });
  const firstGroup = realtime.snapshot?.avariaGroups[0];

  return (
    <section>
      <p>{realtime.statusLabel}</p>
      <p {...realtime.ariaLiveProps}>{realtime.freshnessLabel}</p>
      <p>{firstGroup?.product.name ?? "Sem snapshot central"}</p>
      <button type="button" onClick={() => void realtime.refresh()}>
        Atualizar
      </button>
    </section>
  );
}

class FakeSocket implements GppRealtimeSocket {
  private readonly listeners = new Map<string, Array<(event?: { data: unknown }) => void>>();

  addEventListener(type: "open", listener: () => void): void;
  addEventListener(type: "close" | "error", listener: () => void): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  addEventListener(type: string, listener: (event?: { data: unknown }) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.emit("close");
  }

  error(): void {
    this.emit("error");
  }

  message(data: unknown): void {
    this.emit("message", { data: JSON.stringify(data) });
  }

  open(): void {
    this.emit("open");
  }

  private emit(type: string, event?: { data: unknown }): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function fakeClient(snapshot: GppQueueSnapshot): GppClient {
  return {
    readQueue: vi.fn(() => Promise.resolve(snapshot)),
    readHistory: vi.fn(() => Promise.resolve([])),
  };
}

function realtimeEvent() {
  return {
    eventId: "gpp-event-001",
    storeId: "loja-piloto",
    kind: "gpp_entries_changed",
    occurredAt: "2030-01-10T12:30:00.000Z",
    refresh: {
      reason: "central_commit",
      scope: "queue",
      topics: ["queue"],
    },
  };
}

function queueSnapshot(productName: string): GppQueueSnapshot {
  return {
    store: {
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
    },
    generatedAt: "2030-01-10T12:30:00.000Z",
    centralState: "available",
    avariaGroups: [
      {
        groupId: "FLV:162:baixa_gpp",
        sector: "FLV",
        product: { code: "162", name: productName },
        finality: "baixa_gpp",
        totalQuantity: { value: 2, unit: "kg" },
        entryCount: 1,
        divergenceCount: 0,
        latestActivityAt: "2030-01-10T12:30:00.000Z",
        eligibleForBaixa: true,
      },
    ],
    purchaseRequests: [],
    divergenceEntries: [],
    history: [],
  };
}
