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

    fireEvent.click(screen.getByRole("button", { name: "Validar convite da conta" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Convite invalido ou expirado",
    );
  });
});
