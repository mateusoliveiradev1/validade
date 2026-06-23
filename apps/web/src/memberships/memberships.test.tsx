import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MembershipAdministration } from "./MembershipAdministration";

const ADMIN_CONTEXT = {
  actor: { subjectId: "admin-ficticio", displayName: "Administracao Ficticia" },
  store: { storeId: "loja-ficticia", storeName: "Loja Ficticia" },
  activeRole: "admin",
  capabilities: ["user.manage"],
  sessionExpiresAt: "2030-01-11T12:00:00.000Z",
  accountStatus: "active",
  canRequestRecovery: true,
  privacyCenterUrl: "/privacidade",
  actions: {
    canActOnTask: false,
    canCloseShift: false,
    canReadStoreAudit: false,
    canManageUsers: true,
  },
};

const MEMBERSHIP = {
  membershipId: "membership-lead-ficticia",
  subjectId: "lead-ficticio",
  displayName: "Lideranca Ficticia de Nome Muito Longo Para Conferir Quebra",
  role: "lead",
  storeId: "loja-ficticia",
  storeName: "Loja Ficticia",
  status: "active",
  version: 1,
  createdAt: "2030-01-10T12:00:00.000Z",
  updatedAt: "2030-01-10T12:00:00.000Z",
};

describe("membership administration", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows explicit store and role impact to an administrator", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes("/session/context")) return Promise.resolve(Response.json(ADMIN_CONTEXT));
        if (url.includes("/memberships?"))
          return Promise.resolve(Response.json({ items: [MEMBERSHIP] }));
        return Promise.resolve(Response.json({ membership: MEMBERSHIP, replayed: false }));
      }),
    );

    render(<MembershipAdministration />);

    await waitFor(() => {
      expect(screen.getByText("Convites de acesso fechado")).toBeTruthy();
    });
    expect(screen.getByText(/Nao existe cadastro publico/)).toBeTruthy();
    expect(screen.getByText(MEMBERSHIP.displayName)).toBeTruthy();
    expect(
      screen.getByRole("combobox", {
        name: `Papel de ${MEMBERSHIP.displayName}`,
      }).value,
    ).toBe("lead");
  });

  it("confirms revocation with person, store, and no-resolution warning", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes("/session/context")) return Promise.resolve(Response.json(ADMIN_CONTEXT));
        if (url.includes("/memberships?"))
          return Promise.resolve(Response.json({ items: [MEMBERSHIP] }));
        return Promise.resolve(
          Response.json({ membership: { ...MEMBERSHIP, status: "inactive", version: 2 } }),
        );
      }),
    );

    render(<MembershipAdministration />);
    await screen.findByText(MEMBERSHIP.displayName);
    fireEvent.click(screen.getByText("Acoes", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Revogar vinculo" }));

    expect(screen.getByRole("alertdialog").textContent).toContain("Loja Ficticia");
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "nao encerra nem resolve tarefas abertas",
    );
    fireEvent.change(screen.getByLabelText("Motivo da revogacao"), {
      target: { value: "Mudanca de funcao no piloto ficticio." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar revogacao" }));
    await waitFor(() => expect(screen.getByText("Revogado")).toBeTruthy());
  });
});
