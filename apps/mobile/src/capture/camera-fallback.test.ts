import { describe, expect, it } from "vitest";
import { cameraFallbackCopy } from "./capture-copy";
describe("camera fallback", () => {
  it("keeps manual lookup copy explicit", () => {
    expect(cameraFallbackCopy).toContain("buscar o produto por nome ou código");
  });
});
