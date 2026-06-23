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
    expect(screen.getByRole("heading", { name: "Solicitacao de direitos LGPD" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao produto" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
