import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteAdministration } from "./InviteAdministration";

describe("InviteAdministration", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("creates and revokes a closed-pilot invitation with its scope visible", async () => {
    let revoked = false;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes("/revoke")) {
          revoked = true;
          return Promise.resolve(
            Response.json({
              inviteId: "invite-ficticio-001",
              status: "revoked",
              expiresAt: "2030-01-17T12:00:00.000Z",
              replayed: false,
            }),
          );
        }
        return Promise.resolve(
          Response.json({
            inviteId: "invite-ficticio-001",
            token: "invite-token-ficticio-com-mais-de-trinta-e-dois-caracteres",
            status: "created",
            expiresAt: "2030-01-17T12:00:00.000Z",
            replayed: false,
          }),
        );
      }),
    );
    render(
      <InviteAdministration
        issuerLabel="Administracao FICTICIA"
        onInviteCreated={vi.fn()}
        storeId="loja-ficticia"
        storeName="Loja Ficticia"
      />,
    );

    fireEvent.change(screen.getByLabelText("Identificador de acesso"), { target: { value: "pessoa@ficticia.local" } });
    fireEvent.change(screen.getByLabelText("Nome exibido"), { target: { value: "Pessoa FICTICIA" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite de acesso" }));

    expect(await screen.findByLabelText("Token do convite")).toBeTruthy();
    expect(screen.getAllByText("Loja Ficticia", { exact: false })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Revogar convite" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Administracao FICTICIA");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar revogacao do convite" }));

    expect(await screen.findByText("Convite revogado")).toBeTruthy();
    expect(revoked).toBe(true);
    expect(screen.queryByLabelText("Token do convite")).toBeNull();
  });
});
