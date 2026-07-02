import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  GppDetailSnapshot,
  GppMutationResponse,
  GppQueueSnapshot,
  SessionContextResponse,
} from "@validade-zero/contracts";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GppClient } from "./gpp-client";
import { GppControlRoute } from "./GppControlRoute";
import type { GppRealtimeSocket } from "./gpp-realtime";

const NOW = new Date("2030-01-10T12:30:10.000Z");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Controle GPP route", () => {
  it("renders the Avarias tab by sector and opens the highest workload sector", async () => {
    render(<GppControlRoute client={fakeClient()} now={() => NOW} session={gppSession()} />);

    expect(
      await screen.findByRole("heading", { name: "Controle GPP - Loja Ficticia Piloto" }),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Avarias" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Compras internas" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Divergencias" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Historico" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /FLV/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("162 - Banana prata")).toBeTruthy();
    expect(screen.getByText(/3 kg - 2 lancamentos/)).toBeTruthy();
    expect(screen.getByText("Corrigir divergencia antes da baixa")).toBeTruthy();
  });

  it("filters avarias and moves the visible sector to the matching result", async () => {
    render(<GppControlRoute client={fakeClient()} now={() => NOW} session={gppSession()} />);

    await screen.findByText("162 - Banana prata");
    fireEvent.change(screen.getByPlaceholderText("Buscar produto, codigo, setor ou lancamento"), {
      target: { value: "pao" },
    });

    expect(
      (await screen.findByRole("button", { name: /Padaria/ })).getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("900 - Pao frances")).toBeTruthy();
    expect(screen.queryByText("162 - Banana prata")).toBeNull();
  });

  it("shows central unavailable as an alert and keeps manual refresh visible", async () => {
    const client = fakeClient({ readQueue: vi.fn(() => Promise.reject(new Error("central"))) });

    render(<GppControlRoute client={client} now={() => NOW} session={gppSession()} />);

    expect((await screen.findByRole("alert")).textContent).toContain("Central indisponivel");
    expect(screen.getAllByRole("button", { name: "Atualizar" }).length).toBeGreaterThan(0);
  });

  it("keeps a failed baixa visible and retryable", async () => {
    const client = fakeClient({
      baixarAvarias: vi.fn(() => Promise.resolve(centralFailed())),
    });

    render(<GppControlRoute client={client} now={() => NOW} session={gppSession()} />);

    await screen.findByText("162 - Banana prata");
    fireEvent.click(enabledButton("Baixar"));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar baixa GPP" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Falha na central");
    expect(screen.getAllByText("162 - Banana prata").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Confirmar baixa GPP" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("shows purchase attendance flows and blocks final attendance without product code", async () => {
    render(<GppControlRoute client={fakeClient()} now={() => NOW} session={gppSession()} />);

    await screen.findByText("162 - Banana prata");
    fireEvent.click(screen.getByRole("tab", { name: "Compras internas" }));

    expect(screen.getByText("Molho para salada")).toBeTruthy();
    expect(screen.getByText("Confirmar codigo do produto antes de atender.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Atendido" }));

    expect(
      await screen.findByRole("dialog", { name: "Atendimento de compra interna" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Confirmar codigo do produto")).toHaveProperty("value", "");
  });

  it("filters the dense Historico list", async () => {
    render(<GppControlRoute client={fakeClient()} now={() => NOW} session={gppSession()} />);

    await screen.findByText("162 - Banana prata");
    fireEvent.click(screen.getByRole("tab", { name: "Historico" }));
    expect(screen.getByText(/Banana baixada na central/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Produto ou codigo"), {
      target: { value: "pao" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    expect(screen.queryByText(/Banana baixada na central/)).toBeNull();
    expect(screen.getByText(/Pao registrado/)).toBeTruthy();
  });

  it("applies realtime refresh hints only after a central re-read", async () => {
    const socket = new FakeSocket();
    const first = queueSnapshot();
    const second = queueSnapshot("Banana atualizada");
    const client = fakeClient({
      readQueue: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second),
    });

    render(
      <GppControlRoute
        client={client}
        createRealtimeSocket={() => socket}
        now={() => NOW}
        session={gppSession()}
      />,
    );

    expect(await screen.findByText("162 - Banana prata")).toBeTruthy();
    act(() => socket.open());
    act(() =>
      socket.message({
        eventId: "gpp-event-001",
        storeId: "loja-ficticia",
        kind: "gpp_entries_changed",
        occurredAt: "2030-01-10T12:30:00.000Z",
        refresh: { reason: "central_commit", scope: "queue", topics: ["queue"] },
      }),
    );

    expect(await screen.findByText("162 - Banana atualizada")).toBeTruthy();
    expect(client.readQueue).toHaveBeenCalledTimes(2);
  });
});

function enabledButton(name: string): HTMLButtonElement {
  const button = screen
    .getAllByRole("button", { name })
    .find((candidate): candidate is HTMLButtonElement => !candidate.hasAttribute("disabled"));
  if (button === undefined) throw new Error(`No enabled button named ${name}`);
  return button;
}

function fakeClient(overrides: Partial<GppClient> = {}): GppClient {
  const queue = queueSnapshot();
  const detail = detailSnapshot();

  return {
    attendPurchase: vi.fn(() => Promise.resolve(centralConfirmed())),
    baixarAvarias: vi.fn(() => Promise.resolve(centralConfirmed())),
    markDivergence: vi.fn(() => Promise.resolve(centralConfirmed())),
    readDetail: vi.fn(() => Promise.resolve(detail)),
    readHistory: vi.fn(() => Promise.resolve(queue.history)),
    readQueue: vi.fn(() => Promise.resolve(queue)),
    ...overrides,
  };
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

function gppSession(): SessionContextResponse {
  return {
    actor: { subjectId: "gpp-local", displayName: "GPP Loja" },
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    activeRole: "gpp",
    capabilities: [
      "gpp.queue.read",
      "gpp.avaria.create",
      "gpp.divergence.mark",
      "gpp.correction.review",
      "gpp.avaria.baixar",
      "gpp.purchase.attend",
      "gpp.history.read",
    ],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    featureFlags: { controle_gpp_enabled: true },
    actions: {
      canReadCommandCenter: false,
      canActOnTask: false,
      canReviewProductDrafts: false,
      canCloseShift: false,
      canReadStoreAudit: false,
      canManageUsers: false,
      canSendPilotPushTest: false,
      canReadGppQueue: true,
      canCreateGppEntry: true,
      canCorrectOwnPendingGppEntry: false,
      canMarkGppDivergence: true,
      canReviewGppCorrection: true,
      canBaixarGppAvaria: true,
      canAttendGppPurchase: true,
      canReadGppHistory: true,
    },
  };
}

function queueSnapshot(productName = "Banana prata"): GppQueueSnapshot {
  const history = [
    {
      historyId: "hist-001",
      event: "baixado" as const,
      targetType: "avaria" as const,
      targetId: "avaria-001",
      productCode: "162",
      productName,
      sector: "FLV",
      actor: {
        actorId: "gpp-local",
        displayName: "GPP Loja",
        roleSnapshot: "gpp" as const,
      },
      occurredAt: "2030-01-10T11:00:00.000Z",
      summary: "Banana baixada na central",
    },
    {
      historyId: "hist-002",
      event: "created" as const,
      targetType: "avaria" as const,
      targetId: "avaria-002",
      productCode: "900",
      productName: "Pao frances",
      sector: "Padaria",
      actor: {
        actorId: "lead-local",
        displayName: "Lideranca Loja",
        roleSnapshot: "lead" as const,
      },
      occurredAt: "2030-01-10T10:00:00.000Z",
      summary: "Pao registrado",
    },
  ];

  return {
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    generatedAt: "2030-01-10T12:00:00.000Z",
    centralState: "available",
    avariaGroups: [
      {
        groupId: "FLV:162:baixa_gpp",
        sector: "FLV",
        product: { code: "162", name: productName },
        finality: "baixa_gpp",
        totalQuantity: { value: 3, unit: "kg" },
        entryCount: 2,
        divergenceCount: 0,
        latestActivityAt: "2030-01-10T11:58:00.000Z",
        eligibleForBaixa: true,
      },
      {
        groupId: "FLV:163:baixa_gpp",
        sector: "FLV",
        product: { code: "163", name: "Maca gala" },
        finality: "baixa_gpp",
        totalQuantity: { value: 2, unit: "kg" },
        entryCount: 1,
        divergenceCount: 1,
        latestActivityAt: "2030-01-10T11:59:00.000Z",
        eligibleForBaixa: false,
      },
      {
        groupId: "PAD:900:baixa_gpp",
        sector: "Padaria",
        product: { code: "900", name: "Pao frances" },
        finality: "baixa_gpp",
        totalQuantity: { value: 10, unit: "un" },
        entryCount: 1,
        divergenceCount: 0,
        latestActivityAt: "2030-01-10T10:00:00.000Z",
        eligibleForBaixa: true,
      },
    ],
    purchaseRequests: [
      {
        purchaseRequestId: "purchase-001",
        store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
        sector: "FLV",
        product: { name: "Molho para salada" },
        requestedQuantity: { value: 4, unit: "un" },
        finality: "salada",
        requester: {
          actorId: "lead-local",
          displayName: "Lideranca Loja",
          roleSnapshot: "lead",
        },
        status: "solicitado",
        requestedAt: "2030-01-10T10:30:00.000Z",
        updatedAt: "2030-01-10T10:30:00.000Z",
      },
    ],
    divergenceEntries: [
      {
        avariaId: "avaria-divergent-001",
        store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
        sector: "FLV",
        product: { code: "163", name: "Maca gala" },
        quantity: { value: 2, unit: "kg" },
        finality: "baixa_gpp",
        destination: "GPP",
        status: "divergencia",
        baixaEligibility: "blocked_divergence",
        balanceQuantity: { value: 2, unit: "kg" },
        actor: {
          actorId: "gpp-local",
          displayName: "GPP Loja",
          roleSnapshot: "gpp",
        },
        createdAt: "2030-01-10T09:00:00.000Z",
        updatedAt: "2030-01-10T11:00:00.000Z",
        centralState: "central_confirmed",
        divergenceReason: "quantidade_diferente",
      },
    ],
    history,
  };
}

function detailSnapshot(): GppDetailSnapshot {
  return {
    group: queueSnapshot().avariaGroups[0]!,
    entries: [
      {
        avariaId: "avaria-001",
        store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
        sector: "FLV",
        product: { code: "162", name: "Banana prata" },
        quantity: { value: 1, unit: "kg" },
        finality: "baixa_gpp",
        destination: "GPP",
        status: "pendente",
        baixaEligibility: "eligible",
        balanceQuantity: { value: 1, unit: "kg" },
        actor: {
          actorId: "lead-local",
          displayName: "Lideranca Loja",
          roleSnapshot: "lead",
        },
        createdAt: "2030-01-10T09:00:00.000Z",
        updatedAt: "2030-01-10T11:00:00.000Z",
        centralState: "central_confirmed",
      },
    ],
    movements: [],
    history: queueSnapshot().history,
  };
}

function centralConfirmed(): GppMutationResponse {
  return {
    state: "central_confirmed",
    requestId: "request-001",
    confirmedAt: "2030-01-10T12:30:00.000Z",
  };
}

function centralFailed(): GppMutationResponse {
  return {
    state: "central_failed",
    requestId: "request-001",
    failedAt: "2030-01-10T12:30:00.000Z",
    retryable: true,
    message: "Central indisponivel",
  };
}
