import type {
  GppAvariaCreateRequest,
  GppAvariaFinality,
  GppQuantityUnit,
} from "@validade-zero/contracts";

export const GPP_AVARIA_FINALITIES: readonly {
  value: GppAvariaFinality;
  label: string;
}[] = [
  { value: "baixa_gpp", label: "Baixa GPP" },
  { value: "reaproveitamento", label: "Reaproveitamento" },
  { value: "producao_interna", label: "Producao interna" },
  { value: "transferencia", label: "Transferencia" },
] as const;

export const GPP_QUANTITY_UNITS: readonly GppQuantityUnit[] = [
  "un",
  "kg",
  "g",
  "l",
  "ml",
  "caixa",
  "pacote",
] as const;

export interface GppAvariaDraft {
  productCode: string;
  productName: string;
  quantity: string;
  unit?: GppQuantityUnit | undefined;
  finality?: GppAvariaFinality | undefined;
  destination: string;
}

export type GppAvariaValidationError =
  | "missing_product_code"
  | "missing_quantity_unit"
  | "missing_finality_destination";

export const GPP_AVARIA_VALIDATION_COPY: Record<GppAvariaValidationError, string> = {
  missing_product_code: "Informe o codigo do produto para enviar a avaria ao GPP.",
  missing_quantity_unit: "Informe quantidade e unidade antes de continuar.",
  missing_finality_destination: "Escolha a finalidade e o destino antes de enviar.",
};

export function validateGppAvariaDraft(
  draft: GppAvariaDraft,
): GppAvariaValidationError | undefined {
  if (draft.productCode.trim().length === 0) return "missing_product_code";
  const parsedQuantity = Number(draft.quantity.replace(",", "."));
  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || draft.unit === undefined) {
    return "missing_quantity_unit";
  }
  if (draft.finality === undefined || draft.destination.trim().length === 0) {
    return "missing_finality_destination";
  }
  return undefined;
}

export function buildGppAvariaRequest(input: {
  draft: GppAvariaDraft;
  storeId: string;
  sector: string;
  occurredAt: string;
  idempotencyKey: string;
}): GppAvariaCreateRequest {
  const parsedQuantity = Number(input.draft.quantity.replace(",", "."));
  return {
    storeId: input.storeId,
    sector: input.sector,
    product: {
      code: input.draft.productCode.trim(),
      name: input.draft.productName.trim() || input.draft.productCode.trim(),
    },
    quantity: {
      value: parsedQuantity,
      unit: input.draft.unit ?? "un",
    },
    finality: input.draft.finality ?? "baixa_gpp",
    destination: input.draft.destination.trim(),
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
  };
}
