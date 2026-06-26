import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteAdministration } from "./InviteAdministration";
import { formatDateTimeLocal, INVITE_MAX_TTL_MS } from "./invite-expiry";

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
        onOpenActivation={vi.fn()}
        onInviteCreated={vi.fn()}
        storeId="loja-ficticia"
        storeName="Loja Ficticia"
      />,
    );

    fireEvent.change(screen.getByLabelText("Identificador de acesso"), {
      target: { value: "pessoa@ficticia.local" },
    });
    fireEvent.change(screen.getByLabelText("Nome exibido"), {
      target: { value: "Pessoa FICTICIA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite de acesso" }));

    expect(await screen.findByLabelText("Token do convite")).toBeTruthy();
    expect(screen.getByLabelText("Link de ativacao do convite")).toBeTruthy();
    expect(screen.getAllByText("Loja Ficticia", { exact: false })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Revogar convite" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Administracao FICTICIA");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar revogacao do convite" }));

    expect(await screen.findByText("Convite revogado")).toBeTruthy();
    expect(revoked).toBe(true);
    expect(screen.queryByLabelText("Token do convite")).toBeNull();
  });

  it("opens first access with the freshly generated invitation token", async () => {
    const onOpenActivation = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            inviteId: "invite-ficticio-002",
            token: "invite-token-para-abrir-primeiro-acesso-preenchido",
            status: "created",
            expiresAt: "2030-01-17T12:00:00.000Z",
            replayed: false,
          }),
        ),
      ),
    );
    render(
      <InviteAdministration
        issuerLabel="Administracao FICTICIA"
        onInviteCreated={vi.fn()}
        onOpenActivation={onOpenActivation}
        storeId="loja-ficticia"
        storeName="Loja Ficticia"
      />,
    );

    fireEvent.change(screen.getByLabelText("Identificador de acesso"), {
      target: { value: "lider@ficticia.local" },
    });
    fireEvent.change(screen.getByLabelText("Nome exibido"), {
      target: { value: "Lider FICTICIO" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite de acesso" }));

    const linkInput = await screen.findByLabelText("Link de ativacao do convite");
    expect(linkInput).toHaveProperty(
      "value",
      expect.stringContaining("?invite=invite-token-para-abrir-primeiro-acesso"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir ativacao preenchida" }));

    expect(onOpenActivation).toHaveBeenCalledWith(
      "invite-token-para-abrir-primeiro-acesso-preenchido",
    );
  });

  it("blocks invite creation when expiry exceeds 30 days", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <InviteAdministration
        issuerLabel="Administracao FICTICIA"
        onInviteCreated={vi.fn()}
        storeId="loja-ficticia"
        storeName="Loja Ficticia"
      />,
    );

    fireEvent.change(screen.getByLabelText("Identificador de acesso"), {
      target: { value: "pessoa@ficticia.local" },
    });
    fireEvent.change(screen.getByLabelText("Nome exibido"), {
      target: { value: "Pessoa FICTICIA" },
    });
    fireEvent.change(screen.getByLabelText("Expira em"), {
      target: {
        value: formatDateTimeLocal(new Date(Date.now() + INVITE_MAX_TTL_MS + 86_400_000)),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite de acesso" }));

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "O convite pode valer no maximo 30 dias. Escolha uma data mais proxima.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a specific message when the API rejects invite expiry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { error: "invalid_invite_expiry" },
            { status: 400, statusText: "Bad Request" },
          ),
        ),
      ),
    );
    render(
      <InviteAdministration
        issuerLabel="Administracao FICTICIA"
        onInviteCreated={vi.fn()}
        storeId="loja-ficticia"
        storeName="Loja Ficticia"
      />,
    );

    fireEvent.change(screen.getByLabelText("Identificador de acesso"), {
      target: { value: "pessoa@ficticia.local" },
    });
    fireEvent.change(screen.getByLabelText("Nome exibido"), {
      target: { value: "Pessoa FICTICIA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar convite de acesso" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "O convite pode valer no maximo 30 dias. Escolha uma data mais proxima.",
      );
    });
  });
});
