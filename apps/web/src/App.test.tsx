import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    vi.unstubAllGlobals();
  });

  it("shows the operational shell for an active session", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json(activeSession))));

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
