import type { OperationalLocation } from "@validade-zero/contracts";

export const captureCopy = {
  appName: "Validade Zero",
  discoveryTitle: "Localizar produto",
  discoveryBody: "Busque pelo nome ou código antes de registrar o lote.",
  manualSearch: "Buscar manualmente",
  registerLot: "Registrar lote",
  confirmProduct: "Confirmar produto",
  createProduct: "Cadastrar produto",
  backAndReview: "Voltar e revisar",
  supplierPending: "Fornecedor pendente",
  gtinPending: "GTIN pendente",
  noMatch: "Nenhum produto corresponde a esta busca.",
  recent: "Recentes",
  frequent: "Frequentes",
  byCategory: "Por categoria",
  internalIdentity: "Gerar identificação interna",
  otherLocation: "Outro local",
} as const;

export const productModeLabels = {
  formal_validity: "Validade formal",
  flv_inspection: "Inspeção de FLV",
  receiving_monitored: "Recebimento monitorado",
} as const;

export const operationalLocations = [
  { kind: "area_de_venda", label: "Área de venda" },
  { kind: "estoque", label: "Estoque" },
  { kind: "camara_fria", label: "Câmara fria" },
  { kind: "ilha_promocional", label: "Ilha promocional" },
  { kind: "retirada_perda", label: "Retirada/perda" },
  { kind: "other", label: captureCopy.otherLocation },
] as const;

export function requiredFieldError(field: string): string {
  return `Informe ${field} para registrar este lote.`;
}

export function formatLocation(location: OperationalLocation): string {
  if (location.kind === "other") {
    return location.customName;
  }

  return (
    operationalLocations.find((option) => option.kind === location.kind)?.label ?? location.kind
  );
}
