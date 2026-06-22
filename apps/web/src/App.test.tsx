import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("Validade Zero web smoke", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders safe smoke copy and updates API status after click", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);

        if (url.includes("/session/context")) {
          return Promise.resolve(
            Response.json({
              actor: { subjectId: "collaborator-local", displayName: "Colaborador local" },
              store: { storeId: "loja-piloto", storeName: "Loja Piloto" },
              activeRole: "collaborator",
              capabilities: ["task.act", "evidence.attach", "markdown.request"],
              actions: {
                canActOnTask: true,
                canCloseShift: false,
                canReadStoreAudit: false,
                canManageUsers: false,
              },
            }),
          );
        }

        if (url.includes("/audit/events")) {
          return Promise.resolve(
            Response.json({
              items: [
                {
                  eventId: "audit-event-app-001",
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
                    id: "task-app-001",
                    label: "Ovos FICTICIOS - lote APP-001",
                  },
                  occurredAt: "2030-01-10T12:00:00.000Z",
                  receivedAt: "2030-01-10T12:00:02.000Z",
                  summary: "Retirada registrada na area de venda.",
                  status: "received",
                  metadata: {
                    action: "withdraw",
                  },
                },
              ],
            }),
          );
        }

        return Promise.resolve(
          Response.json({
            status: "ok",
            service: "validade-zero-api",
            checkedAt: "2026-06-19T03:00:00.000Z",
          }),
        );
      }),
    );

    render(<App />);

    expect(screen.getByText("Validade Zero")).toBeTruthy();
    expect(screen.getByText("Ambiente seguro para desenvolvimento")).toBeTruthy();
    expect(screen.getByText("Auditoria operacional")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(/Colaborador local atua como/i)).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText("Retirada registrada na area de venda.")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Verificar API" }));

    await waitFor(() => {
      expect(screen.getByTestId("api-status").textContent).toContain("validade-zero-api: ok");
    });
  });
});
