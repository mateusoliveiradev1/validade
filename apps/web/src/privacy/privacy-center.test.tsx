import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyCenter } from "./PrivacyCenter";

describe("PrivacyCenter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the seven pilot privacy sections and returns to the product", () => {
    const onBack = vi.fn();
    render(<PrivacyCenter onBack={onBack} />);

    const pilotSectionTitles = [
      "Politica de Privacidade",
      "Termos de Uso",
      "Seguranca da conta",
      "Permissoes do aparelho",
      "Dados usados pelo app",
      "Canal/encarregado",
      "Solicitacao de direitos LGPD",
    ];
    for (const title of pilotSectionTitles) {
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao produto" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("opens a topic detail view and returns to the hub", () => {
    render(<PrivacyCenter onBack={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir Politica de Privacidade" }));
    expect(screen.getByRole("heading", { name: "Politica de Privacidade", level: 2 })).toBeTruthy();
    expect(screen.getByText(/Nao coletamos dados de venda/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Centro de Privacidade", level: 1 })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao centro de privacidade" }));
    expect(screen.getByRole("button", { name: "Voltar ao produto" })).toBeTruthy();
  });
});
