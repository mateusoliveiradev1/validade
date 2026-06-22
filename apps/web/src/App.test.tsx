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
    await waitFor(() => {
      expect(screen.getByText(/Colaborador local atua como/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Verificar API" }));

    await waitFor(() => {
      expect(screen.getByTestId("api-status").textContent).toContain("validade-zero-api: ok");
    });
  });
});
