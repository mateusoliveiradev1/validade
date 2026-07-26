import { describe, expect, it } from "vitest";

import { productDraftGtinField } from "./product-form-input";

describe("product draft form input", () => {
  it("blocks an invalid optional GTIN before the repository boundary", () => {
    expect(productDraftGtinField("12345")).toEqual({
      error: "GTIN deve ter entre 8 e 14 digitos. Corrija ou deixe o campo vazio.",
    });
    expect(productDraftGtinField("789000000000123")).toEqual({
      error: "GTIN deve ter entre 8 e 14 digitos. Corrija ou deixe o campo vazio.",
    });
  });

  it("omits an empty GTIN and normalizes a valid one", () => {
    expect(productDraftGtinField("   ")).toEqual({});
    expect(productDraftGtinField(" 7890000000001 ")).toEqual({
      gtin: "7890000000001",
    });
  });
});
