import { describe, expect, it } from "vitest";
import { cameraFallbackCopy } from "./capture-copy";
describe("camera fallback", () => {
  it("keeps manual lookup copy explicit", () => {
    expect(cameraFallbackCopy).toBe(
      "Nao foi possivel usar a camera. Registre sem foto ou use a busca manual quando permitido.",
    );
  });
});
