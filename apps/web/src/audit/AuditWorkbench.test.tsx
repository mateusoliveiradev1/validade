import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditClient } from "./audit-client";
import { AuditWorkbench } from "./AuditWorkbench";

const auditEvent = {
  eventId: "audit-event-001",
  type: "task.changed",
  store: {
    storeId: "loja-piloto",
    storeName: "Loja Piloto",
  },
  actor: {
    actorId: "lead-local",
    displayName: "Lideranca local",
    roleSnapshot: "lead",
  },
  target: {
    type: "task",
    id: "task-audit-001",
    label: "Ovos FICTICIOS - lote OVOS-001",
  },
  occurredAt: "2030-01-10T12:00:00.000Z",
  receivedAt: "2030-01-10T12:00:02.000Z",
  summary: "Retirada registrada na area de venda.",
  reason: "Produto vencido removido fisicamente.",
  status: "received",
  metadata: {
    action: "withdraw",
    productDisplayName: "Ovos FICTICIOS",
    lotCode: "OVOS-001",
  },
} as const;

describe("AuditWorkbench", () => {
  afterEach(() => {
    cleanup();
  });

  it("loads store-scoped events, opens detail, and restores focus on close", async () => {
    const client: AuditClient = {
      listEvents: vi.fn().mockResolvedValue({ items: [auditEvent] }),
    };

    render(<AuditWorkbench client={client} />);

    expect(screen.getByText(/Escopo:/i).textContent).toContain("Loja Piloto");
    const trigger = await screen.findByRole("button", {
      name: /Retirada registrada na area de venda/i,
    });

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Detalhe do evento de auditoria" })).toBeTruthy();
    expect(screen.getByText("Produto vencido removido fisicamente.")).toBeTruthy();
    expect(screen.getByText("Recebida pelo sistema")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/payload|objectKey|signedUrl|base64|uri/i);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("uses cursor pagination without showing a fake total", async () => {
    const secondEvent = {
      ...auditEvent,
      eventId: "audit-event-002",
      summary: "Presenca fisica confirmada.",
      metadata: { action: "confirm_presence" },
    };
    const listEvents = vi
      .fn()
      .mockResolvedValueOnce({ items: [auditEvent], nextCursor: "audit-event-002" })
      .mockResolvedValueOnce({ items: [secondEvent] });

    render(<AuditWorkbench client={{ listEvents }} />);

    await screen.findByText("Retirada registrada na area de venda.");
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais eventos" }));

    await screen.findByText("Presenca fisica confirmada.");
    expect(listEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        storeId: "loja-piloto",
        cursor: "audit-event-002",
      }),
    );
    expect(document.body.textContent).not.toMatch(/total de eventos|ranking|grafico/i);
  });

  it("keeps filters visible when loading fails", async () => {
    const client: AuditClient = {
      listEvents: vi.fn().mockRejectedValue(new Error("Falha simulada")),
    };

    render(<AuditWorkbench client={client} />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Nao foi possivel carregar a auditoria.",
    );
    expect(screen.getByLabelText("Filtros de auditoria")).toBeTruthy();
  });
});
