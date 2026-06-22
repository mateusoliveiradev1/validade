import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrentScope } from "./CurrentScope";

describe("CurrentScope", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders collaborator scope and hides lead close action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
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
        ),
      ),
    );

    render(<CurrentScope />);

    await waitFor(() => {
      expect(screen.getByText(/Colaborador local atua como/i)).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: "Fechar turno" })).toBeNull();
    expect(screen.getByTestId("lead-only-explanation").textContent).toContain(
      "lideranca ativa",
    );
  });

  it("renders lead scope with close action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            actor: { subjectId: "lead-local", displayName: "Lideranca local" },
            store: { storeId: "loja-piloto", storeName: "Loja Piloto" },
            activeRole: "lead",
            capabilities: ["task.act", "shift.close", "audit.read_store"],
            actions: {
              canActOnTask: true,
              canCloseShift: true,
              canReadStoreAudit: true,
              canManageUsers: false,
            },
          }),
        ),
      ),
    );

    render(<CurrentScope />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Fechar turno" })).toBeTruthy();
    });
  });

  it("shows neutral blocked copy after an authorization denial", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            {
              error: "access_denied",
              reason: "capability_not_allowed",
              message: "Esta acao exige lideranca autorizada nesta loja.",
            },
            { status: 403 },
          ),
        ),
      ),
    );

    render(<CurrentScope />);

    await waitFor(() => {
      expect(screen.getByText("Escopo operacional indisponivel")).toBeTruthy();
      expect(screen.getByText(/lideranca autorizada/i)).toBeTruthy();
    });
  });
});
