import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstAccessPage } from "./FirstAccessPage";
import { LoginPage } from "./LoginPage";
import { RecoveryPage } from "./RecoveryPage";

describe("web authentication flows", () => {
  afterEach(() => {
    cleanup();
  });

  it("validates required credentials before login", () => {
    render(
      <LoginPage
        onFirstAccess={vi.fn()}
        onLogin={vi.fn()}
        onPrivacy={vi.fn()}
        onRecovery={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar no Validade Zero" }));

    expect(screen.getByText("Informe seu identificador de acesso.")).toBeTruthy();
    expect(screen.getByText("Informe sua senha.")).toBeTruthy();
  });

  it("adds desktop operational context without changing the access form", () => {
    render(
      <LoginPage
        onFirstAccess={vi.fn()}
        onLogin={vi.fn()}
        onPrivacy={vi.fn()}
        onRecovery={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Acesso operacional para confirmar o que esta na area de venda.",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar no Validade Zero" })).toBeTruthy();
  });

  it("keeps recovery neutral about account existence", async () => {
    const onRequest = vi.fn().mockResolvedValue(undefined);
    render(<RecoveryPage onBack={vi.fn()} onRequest={onRequest} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "colaborador@ficticio.local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar recuperacao da conta" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      "Se houver uma conta elegivel",
    );
  });

  it("shows an actionable message for an invalid invitation", async () => {
    render(
      <FirstAccessPage
        onActivate={vi.fn()}
        onBack={vi.fn()}
        onValidate={vi.fn().mockResolvedValue({ status: "expired" })}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Codigo do convite" }), {
      target: { value: "invite-token-with-at-least-thirty-two-characters" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validar convite da conta" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Convite invalido ou expirado",
    );
  });

  it("prefills the invitation token opened from a link", () => {
    const token = "invite-token-with-at-least-thirty-two-characters";
    render(
      <FirstAccessPage
        initialToken={token}
        onActivate={vi.fn()}
        onBack={vi.fn()}
        onValidate={vi.fn()}
      />,
    );

    const tokenInput = screen.getByRole("textbox", {
      name: "Codigo do convite",
    });
    expect(tokenInput).toHaveProperty("value", token);
  });

  it("shows password policy before attempting account activation", async () => {
    const onActivate = vi.fn();
    render(
      <FirstAccessPage
        onActivate={onActivate}
        onBack={vi.fn()}
        onValidate={vi.fn().mockResolvedValue({
          status: "valid",
          expiresAt: "2030-01-11T12:00:00.000Z",
          invite: {
            identifier: "pessoa@piloto.invalid",
            displayName: "Pessoa Piloto",
            storeId: "loja-piloto",
            storeName: "Loja Piloto",
            role: "admin",
          },
        })}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Codigo do convite" }), {
      target: { value: "invite-token-with-at-least-thirty-two-characters" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validar convite da conta" }));
    fireEvent.change(await screen.findByLabelText("Crie sua senha"), {
      target: { value: "curta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ativar conta" }));

    expect(screen.getByRole("alert").textContent).toContain("pelo menos 10 caracteres");
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("keeps activation failures visible instead of failing silently", async () => {
    render(
      <FirstAccessPage
        onActivate={vi.fn().mockRejectedValue(new Error("activation failed"))}
        onBack={vi.fn()}
        onValidate={vi.fn().mockResolvedValue({
          status: "valid",
          expiresAt: "2030-01-11T12:00:00.000Z",
          invite: {
            identifier: "admin.piloto@example.test",
            displayName: "Administrador Piloto",
            storeId: "loja-piloto",
            storeName: "Loja Piloto",
            role: "admin",
          },
        })}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Codigo do convite" }), {
      target: { value: "invite-token-with-at-least-thirty-two-characters" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validar convite da conta" }));
    fireEvent.change(await screen.findByLabelText("Crie sua senha"), {
      target: { value: "Abcdef@123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ativar conta" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Nao foi possivel ativar");
  });
});
