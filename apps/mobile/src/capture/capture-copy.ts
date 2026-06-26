import type { OperationalLocation } from "@validade-zero/contracts";

const operationalTimeZone = "America/Sao_Paulo";

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
  frequentResults: "Produtos mais registrados. Confirme antes de informar o lote.",
  frequentEmpty: "Ainda não há produtos frequentes. Registre um lote para formar esta lista.",
  categoryPrompt: "Escolha uma categoria para localizar o produto.",
  categoryEmpty: "Ainda não há categorias com produtos cadastrados.",
  categoryResults: "Confirme o produto antes de informar o lote.",
  shortcutUnavailable: "Este atalho ainda não está disponível neste aparelho. Use a busca manual.",
  internalIdentity: "Gerar identificação interna",
  otherLocation: "Outro local",
  repeatLot: "Registrar outro lote",
} as const;

export const productModeLabels = {
  formal_validity: "Validade formal",
  flv_inspection: "Inspeção de FLV",
  processed_repack_loss: "Processado: reembalar/avaria",
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

export const observationActions = [
  ["present", "Confirmar presença"],
  ["moved", "Mover lote"],
  ["withdrawn", "Retirar lote"],
  ["loss", "Registrar perda"],
  ["not_found", "Marcar como não encontrado"],
  ["probably_sold_out", "Registrar como provavelmente esgotado"],
] as const;
export const reinforcedObservationActions = [
  "withdrawn",
  "loss",
  "not_found",
  "probably_sold_out",
] as const;
export const cameraFallbackCopy =
  "Não foi possível usar a câmera. Você pode buscar o produto por nome ou código.";
export const cameraPermissionCopy =
  "Permita a câmera para ler o código. A busca manual continua disponível.";
export const cameraBlockedCopy =
  "A câmera está bloqueada para este app. Abra as configurações do Android ou use a busca manual.";

export function requiredFieldError(field: string): string {
  return `Informe ${field} para registrar este lote.`;
}

export function lotRegisteredCopy(location: string, time: string): string {
  return `Lote registrado em ${location} às ${time}.`;
}

export function formatObservationTimestamp(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: operationalTimeZone,
  }).format(new Date(value));
}

export function formatOperationalTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: operationalTimeZone,
  }).format(new Date(value));
}

export function formatLocation(location: OperationalLocation): string {
  if (location.kind === "other") {
    return location.customName;
  }

  return (
    operationalLocations.find((option) => option.kind === location.kind)?.label ?? location.kind
  );
}
