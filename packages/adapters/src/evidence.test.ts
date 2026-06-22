import { describe, expect, it } from "vitest";
import { createInMemoryEvidenceStore } from "./evidence";

describe("private evidence store", () => {
  it("verifies content and acknowledges idempotent storage without exposing the key", async () => {
    const store = createInMemoryEvidenceStore();
    const body = new TextEncoder().encode("fictitious evidence");
    const sha256 = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", body)),
      (value) => value.toString(16).padStart(2, "0"),
    ).join("");
    const input = {
      objectKey: "private/opaque-key",
      body,
      mimeType: "image/jpeg",
      sizeBytes: body.byteLength,
      sha256,
    };

    const first = await store.put(input);
    const replay = await store.put(input);

    expect(first).toMatchObject({ sizeBytes: body.byteLength, mimeType: "image/jpeg", sha256 });
    expect(replay).toEqual(first);
    expect(first).not.toHaveProperty("objectKey");
    expect(store.putCount()).toBe(1);
  });
});
