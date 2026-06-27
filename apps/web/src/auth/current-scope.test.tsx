import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrentScope } from "./CurrentScope";

describe("CurrentScope", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders collaborator scope and hides lead close action", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json({
          actor: { subjectId: "collaborator-local", displayName: "Colaborador local" },
          store: { storeId: "loja-piloto", storeName: "Loja Ficticia Piloto" },
          activeRole: "collaborator",
          capabilities: [
            "task.act",
            "evidence.attach",
            "markdown.request",
            "command_center.read_store",
          ],
          sessionExpiresAt: "2030-01-11T12:00:00.000Z",
          accountStatus: "active",
          canRequestRecovery: true,
          privacyCenterUrl: "/privacidade",
          actions: {
            canReadCommandCenter: true,
            canActOnTask: true,
            canReviewProductDrafts: false,
            canCloseShift: false,
            canReadStoreAudit: false,
            canManageUsers: false,
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CurrentScope />);

    await waitFor(() => {
      expect(screen.getByText(/Colaborador local atua como/i)).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: "Fechar turno" })).toBeNull();
    expect(screen.getByTestId("lead-only-explanation").textContent).toContain("lideranca ativa");
    expect(fetchMock).toHaveBeenCalledWith("/session/context");
  });

  it("renders lead scope with close action", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json({
          actor: { subjectId: "lead-local", displayName: "Lideranca local" },
          store: { storeId: "loja-18", storeName: "Loja 18 - Staging" },
          activeRole: "lead",
          capabilities: [
            "task.act",
            "command_center.read_store",
            "catalog.review",
            "shift.close",
            "audit.read_store",
          ],
          sessionExpiresAt: "2030-01-11T12:00:00.000Z",
          accountStatus: "active",
          canRequestRecovery: true,
          privacyCenterUrl: "/privacidade",
          actions: {
            canReadCommandCenter: true,
            canActOnTask: true,
            canReviewProductDrafts: true,
            canCloseShift: true,
            canReadStoreAudit: true,
            canManageUsers: false,
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CurrentScope storeId="loja-18" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Fechar turno" })).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith("/session/context?storeId=loja-18");
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
