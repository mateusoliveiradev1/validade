const INVALID_GTIN_MESSAGE =
  "GTIN deve ter entre 8 e 14 digitos. Corrija ou deixe o campo vazio.";

export function productDraftGtinField(
  value: string,
): { gtin?: string | undefined } | { error: string } {
  const normalized = value.trim();

  if (normalized.length === 0) return {};
  if (!/^\d{8,14}$/.test(normalized)) {
    return { error: INVALID_GTIN_MESSAGE };
  }

  return { gtin: normalized };
}
