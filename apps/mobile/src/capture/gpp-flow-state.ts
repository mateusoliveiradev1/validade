import type {
  GppAvariaCreateRequest,
  GppAvariaFinality,
  GppPurchaseCreateRequest,
  GppQuantityUnit,
} from "@validade-zero/contracts";

export const GPP_AVARIA_FINALITIES: readonly {
  value: GppAvariaFinality;
  label: string;
  destination: string;
}[] = [
  { value: "baixa_gpp", label: "Baixa GPP", destination: "Controle GPP" },
  { value: "reaproveitamento", label: "Reaproveitamento", destination: "Reaproveitamento" },
  { value: "producao_interna", label: "Producao interna", destination: "Producao interna" },
  { value: "transferencia", label: "Transferencia", destination: "Transferencia" },
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
  missing_finality_destination: "Escolha a finalidade antes de enviar.",
};

export function validateGppAvariaDraft(
  draft: GppAvariaDraft,
): GppAvariaValidationError | undefined {
  if (draft.productCode.trim().length === 0) return "missing_product_code";
  const parsedQuantity = Number(draft.quantity.replace(",", "."));
  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || draft.unit === undefined) {
    return "missing_quantity_unit";
  }
  if (draft.finality === undefined) {
    return "missing_finality_destination";
  }
  return undefined;
}

export function gppAvariaDestinationForFinality(finality: GppAvariaFinality): string {
  return (
    GPP_AVARIA_FINALITIES.find((option) => option.value === finality)?.destination ?? "Controle GPP"
  );
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
    destination: gppAvariaDestinationForFinality(input.draft.finality ?? "baixa_gpp"),
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
  };
}

export interface GppPurchaseDraft {
  productName: string;
  productCode: string;
  quantity: string;
  unit?: GppQuantityUnit | undefined;
  finality: string;
}

export type GppPurchaseValidationError =
  | "missing_product_description"
  | "missing_quantity_unit"
  | "missing_finality";

export const GPP_PURCHASE_VALIDATION_COPY: Record<GppPurchaseValidationError, string> = {
  missing_product_description: "Descreva o produto para o GPP localizar ou confirmar o codigo.",
  missing_quantity_unit: "Informe quantidade e unidade antes de continuar.",
  missing_finality: "Informe a finalidade da compra interna antes de enviar.",
};

export function validateGppPurchaseDraft(
  draft: GppPurchaseDraft,
): GppPurchaseValidationError | undefined {
  if (draft.productName.trim().length === 0) return "missing_product_description";
  const parsedQuantity = Number(draft.quantity.replace(",", "."));
  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || draft.unit === undefined) {
    return "missing_quantity_unit";
  }
  if (draft.finality.trim().length === 0) return "missing_finality";
  return undefined;
}

export function buildGppPurchaseRequest(input: {
  draft: GppPurchaseDraft;
  storeId: string;
  sector: string;
  requestedAt: string;
  idempotencyKey: string;
}): GppPurchaseCreateRequest {
  const parsedQuantity = Number(input.draft.quantity.replace(",", "."));
  const productCode = input.draft.productCode.trim();
  return {
    storeId: input.storeId,
    sector: input.sector,
    product: {
      ...(productCode.length === 0 ? {} : { code: productCode }),
      name: input.draft.productName.trim(),
    },
    requestedQuantity: {
      value: parsedQuantity,
      unit: input.draft.unit ?? "un",
    },
    finality: input.draft.finality.trim(),
    requestedAt: input.requestedAt,
    idempotencyKey: input.idempotencyKey,
  };
}

export function gppPurchaseStatusLabel(status: string): string {
  if (status === "solicitado") return "Enviada";
  if (status === "atendido") return "Atendida";
  if (status === "atendido_parcial") return "Parcial";
  if (status === "sem_produto") return "Sem produto";
  if (status === "cancelado") return "Cancelada";
  return status;
}
