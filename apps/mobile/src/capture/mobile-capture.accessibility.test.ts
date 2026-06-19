import { describe, expect, it } from "vitest";
import { captureCopy, requiredFieldError } from "./capture-copy";
describe("mobile capture accessibility copy", () => {
  it("keeps direct labeled actions and visible required errors", () => {
    expect([captureCopy.registerLot, captureCopy.confirmProduct]).toEqual([
      "Registrar lote",
      "Confirmar produto",
    ]);
    expect(requiredFieldError("a data de validade")).toContain("Informe");
  });
});
