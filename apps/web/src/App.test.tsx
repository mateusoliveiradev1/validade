import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const activeSession = {
  status: "refreshed",
  sessionToken: "a".repeat(32),
  session: {
    actor: { subjectId: "collaborator-ficticio", displayName: "Colaborador FICTICIO" },
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    activeRole: "collaborator",
    capabilities: ["task.act"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    actions: {
      canActOnTask: true,
      canCloseShift: false,
      canReadStoreAudit: false,
      canManageUsers: false,
    },
  },
};

describe("authenticated web shell", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("opens first access directly from an invitation URL", () => {
    const token = "invite-token-with-at-least-thirty-two-characters";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    window.history.pushState({}, "", `/?invite=${token}`);

    render(<App />);

    expect(screen.getByRole("heading", { name: "Ativar conta da loja piloto" })).toBeTruthy();
    const tokenInput = screen.getByRole("textbox", {
      name: "Codigo do convite",
    });
    expect(tokenInput).toHaveProperty("value", token);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the operational shell for an active session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);

        if (url.includes("/command-center")) {
          return Promise.resolve(
            Response.json({
              storeId: "loja-ficticia",
              storeName: "Loja Ficticia Piloto",
              refreshedAt: "2030-01-11T11:00:00.000Z",
              freshness: "current",
              verdict: {
                state: "safe",
                title: "Area de venda segura agora",
                detail: "Nenhum bloqueio central exige acao neste momento.",
              },
              criticalLots: [],
              overdueTasks: [],
              pendingMarkdowns: [],
              pendingProductDrafts: [],
              pendingEvidence: [],
              syncConflicts: [],
              discardedActions: [],
              resolvedHistory: [],
              pendingShiftCloses: [],
              shiftHistory: [],
            }),
          );
        }

        return Promise.resolve(Response.json(activeSession));
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Area de venda segura agora?" })).toBeTruthy();
    });
    expect(screen.getByText("Loja Ficticia Piloto")).toBeTruthy();
    expect(screen.queryByText("Ambiente seguro para desenvolvimento")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir navegacao" }));
    const navigationDialog = screen.getByRole("dialog");
    expect(navigationDialog).toBeTruthy();
    expect(within(navigationDialog).getByRole("button", { name: "Acessos da loja" })).toBeTruthy();
  });
});
