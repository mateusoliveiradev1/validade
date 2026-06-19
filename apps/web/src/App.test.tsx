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
      vi.fn(async () =>
        Response.json({
          status: "ok",
          service: "validade-zero-api",
          checkedAt: "2026-06-19T03:00:00.000Z",
        }),
      ),
    );

    render(<App />);

    expect(screen.getByText("Validade Zero")).toBeTruthy();
    expect(screen.getByText("Ambiente seguro para desenvolvimento")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Verificar API" }));

    await waitFor(() => {
      expect(screen.getByTestId("api-status").textContent).toContain(
        "validade-zero-api: ok",
      );
    });
  });
});
