import type {
  GppActorSnapshot,
  GppAvariaEntry,
  GppAvariaFinality,
  GppAvariaGroupSummary,
  GppDivergenceReason,
  GppHistoryRow,
  GppPurchaseRequest,
  GppPurchaseStatus,
  GppQuantity,
  GppQueueSnapshot,
} from "@validade-zero/contracts";

export type GppTab = "avarias" | "compras" | "divergencias" | "historico";

export interface GppAvariaSectorPanel {
  sector: string;
  entryCount: number;
  groupCount: number;
  divergenceCount: number;
  totalSummary: string;
  baixadasToday: number;
  groups: readonly GppAvariaGroupRow[];
}

export interface GppAvariaGroupRow {
  group: GppAvariaGroupSummary;
  productLabel: string;
  finalityLabel: string;
  totalLabel: string;
  entryCountLabel: string;
  divergenceLabel?: string | undefined;
  latestActivityLabel: string;
  baixa: {
    enabled: boolean;
    reason?: string | undefined;
  };
}

export interface GppPurchaseSectorPanel {
  sector: string;
  requestCount: number;
  pendingCount: number;
  requests: readonly GppPurchaseRequest[];
}

export type GppHistoryEventGroup = "baixas" | "divergencias" | "compras";
export type GppHistoryEventFilter = GppHistoryRow["event"] | GppHistoryEventGroup | "";

export interface GppHistoryFilters {
  from?: string | undefined;
  to?: string | undefined;
  sector?: string | undefined;
  query?: string | undefined;
  event?: GppHistoryEventFilter | undefined;
  actor?: string | undefined;
}

export const GPP_TABS = [
  { id: "avarias", label: "Avarias" },
  { id: "compras", label: "Compras internas" },
  { id: "divergencias", label: "Divergencias" },
  { id: "historico", label: "Historico" },
] as const satisfies ReadonlyArray<{ id: GppTab; label: string }>;

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
});
const HISTORY_BAIXA_EVENTS: readonly GppHistoryRow["event"][] = ["baixado", "estornado"];
const HISTORY_DIVERGENCE_EVENTS: readonly GppHistoryRow["event"][] = [
  "divergence_marked",
  "corrected",
  "reviewed_by_gpp",
];
const HISTORY_PURCHASE_EVENTS: readonly GppHistoryRow["event"][] = [
  "purchase_attended",
  "purchase_partial",
  "purchase_without_product",
  "canceled",
];

export function buildAvariaSectorPanels(
  snapshot: GppQueueSnapshot,
  query: string,
  referenceDate: Date = new Date(snapshot.generatedAt),
): readonly GppAvariaSectorPanel[] {
  const history = snapshot.history;
  const groupsBySector = new Map<string, GppAvariaGroupSummary[]>();

  for (const group of snapshot.avariaGroups.filter((item) => groupMatchesQuery(item, query))) {
    groupsBySector.set(group.sector, [...(groupsBySector.get(group.sector) ?? []), group]);
  }

  return [...groupsBySector.entries()]
    .map(([sector, groups]) => {
      const rows = groups.sort(compareAvariaGroups).map((group) => toAvariaGroupRow(group));

      return {
        sector,
        entryCount: groups.reduce((total, group) => total + group.entryCount, 0),
        groupCount: groups.length,
        divergenceCount: groups.reduce((total, group) => total + group.divergenceCount, 0),
        totalSummary: quantitySummary(groups.map((group) => group.totalQuantity)),
        baixadasToday: countBaixadasToday(history, sector, referenceDate),
        groups: rows,
      };
    })
    .sort((left, right) => collator.compare(left.sector, right.sector));
}

export function initialOpenAvariaSector(snapshot: GppQueueSnapshot): string | undefined {
  return buildAvariaSectorPanels(snapshot, "")
    .slice()
    .sort((left, right) => {
      const workload = right.entryCount - left.entryCount;
      if (workload !== 0) return workload;
      const divergences = right.divergenceCount - left.divergenceCount;
      if (divergences !== 0) return divergences;
      return collator.compare(left.sector, right.sector);
    })[0]?.sector;
}

export function buildPurchaseSectorPanels(
  snapshot: GppQueueSnapshot,
  query: string,
): readonly GppPurchaseSectorPanel[] {
  const requestsBySector = new Map<string, GppPurchaseRequest[]>();

  for (const request of snapshot.purchaseRequests.filter((item) =>
    purchaseMatchesQuery(item, query),
  )) {
    requestsBySector.set(request.sector, [
      ...(requestsBySector.get(request.sector) ?? []),
      request,
    ]);
  }

  return [...requestsBySector.entries()]
    .map(([sector, requests]) => ({
      sector,
      requestCount: requests.length,
      pendingCount: requests.filter((request) => request.status === "solicitado").length,
      requests: requests.slice().sort(comparePurchaseRequests),
    }))
    .sort((left, right) => collator.compare(left.sector, right.sector));
}

export function filterDivergenceEntries(
  entries: readonly GppAvariaEntry[],
  query: string,
): readonly GppAvariaEntry[] {
  return entries
    .filter((entry) => avariaEntryMatchesQuery(entry, query))
    .slice()
    .sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
}

export function filterHistoryRows(
  rows: readonly GppHistoryRow[],
  filters: GppHistoryFilters,
): readonly GppHistoryRow[] {
  const from = optionalDate(filters.from);
  const to = optionalDate(filters.to);
  const query = normalize(filters.query);
  const sector = normalize(filters.sector);
  const actor = normalize(filters.actor);
  const event = filters.event === "" ? undefined : filters.event;

  return rows
    .filter((row) => {
      const occurredAt = new Date(row.occurredAt).getTime();
      if (from !== undefined && occurredAt < from.getTime()) return false;
      if (to !== undefined && occurredAt > to.getTime()) return false;
      if (!historyEventMatchesFilter(row.event, event)) return false;
      if (sector.length > 0 && !normalize(row.sector).includes(sector)) return false;
      if (actor.length > 0 && !normalize(actorLabel(row.actor)).includes(actor)) return false;
      if (query.length > 0 && !historyMatchesQuery(row, query)) return false;
      return true;
    })
    .slice()
    .sort(
      (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    );
}

function historyEventMatchesFilter(
  event: GppHistoryRow["event"],
  filter: GppHistoryEventFilter | undefined,
): boolean {
  if (filter === undefined || filter === "") return true;
  if (filter === "baixas") return HISTORY_BAIXA_EVENTS.includes(event);
  if (filter === "divergencias") return HISTORY_DIVERGENCE_EVENTS.includes(event);
  if (filter === "compras") return HISTORY_PURCHASE_EVENTS.includes(event);
  return event === filter;
}

export function toAvariaGroupRow(group: GppAvariaGroupSummary): GppAvariaGroupRow {
  const baixaReason = baixaBlockedReason(group);

  return {
    group,
    productLabel: `${group.product.code} - ${group.product.name}`,
    finalityLabel: finalityLabel(group.finality),
    totalLabel: quantityLabel(group.totalQuantity),
    entryCountLabel: `${group.entryCount} ${group.entryCount === 1 ? "item" : "itens"}`,
    ...(group.divergenceCount > 0
      ? {
          divergenceLabel: `${group.divergenceCount} ${group.divergenceCount === 1 ? "divergencia" : "divergencias"}`,
        }
      : {}),
    latestActivityLabel: formatActivityLabel(group.latestActivityAt),
    baixa: baixaReason === undefined ? { enabled: true } : { enabled: false, reason: baixaReason },
  };
}

export function groupMatchesQuery(group: GppAvariaGroupSummary, query: string): boolean {
  const normalized = normalize(query);
  if (normalized.length === 0) return true;

  return [
    group.groupId,
    group.sector,
    group.product.code,
    group.product.name,
    finalityLabel(group.finality),
  ].some((value) => normalize(value).includes(normalized));
}

export function avariaEntryMatchesQuery(entry: GppAvariaEntry, query: string): boolean {
  const normalized = normalize(query);
  if (normalized.length === 0) return true;

  return [
    entry.avariaId,
    entry.sector,
    entry.product.code,
    entry.product.name,
    entry.destination,
    finalityLabel(entry.finality),
    entry.divergenceReason === undefined ? "" : divergenceReasonLabel(entry.divergenceReason),
  ].some((value) => normalize(value).includes(normalized));
}

export function purchaseMatchesQuery(request: GppPurchaseRequest, query: string): boolean {
  const normalized = normalize(query);
  if (normalized.length === 0) return true;

  return [
    request.purchaseRequestId,
    request.sector,
    request.product.code ?? "",
    request.product.name,
    request.finality,
    request.requester.displayName,
    purchaseStatusLabel(request.status),
  ].some((value) => normalize(value).includes(normalized));
}

export function finalityLabel(finality: GppAvariaFinality): string {
  if (finality === "baixa_gpp") return "Baixa para GPP";
  if (finality === "reaproveitamento") return "Reaproveitamento";
  if (finality === "producao_interna") return "Producao interna";
  return "Transferencia";
}

export function purchaseStatusLabel(status: GppPurchaseStatus): string {
  if (status === "solicitado") return "Pendente";
  if (status === "atendido") return "Atendido";
  if (status === "atendido_parcial") return "Atendido parcial";
  if (status === "sem_produto") return "Sem produto";
  return "Cancelado";
}

export function divergenceReasonLabel(reason: GppDivergenceReason): string {
  if (reason === "quantidade_diferente") return "Quantidade diferente";
  if (reason === "codigo_produto_errado") return "Codigo/produto errado";
  if (reason === "etiqueta_fisica_nao_encontrada") return "Etiqueta fisica nao encontrada";
  if (reason === "setor_destino_errado") return "Setor destino errado";
  if (reason === "duplicado") return "Duplicado";
  if (reason === "producao_sem_finalidade_clara") return "Producao sem finalidade clara";
  return "Outro";
}

export function historyEventLabel(event: GppHistoryRow["event"]): string {
  if (event === "created") return "Registrado";
  if (event === "edited") return "Editado";
  if (event === "divergence_marked") return "Divergencia marcada";
  if (event === "corrected") return "Corrigido";
  if (event === "reviewed_by_gpp") return "Revisado pelo GPP";
  if (event === "baixado") return "Baixado";
  if (event === "canceled") return "Cancelado";
  if (event === "estornado") return "Estornado";
  if (event === "purchase_attended") return "Compra atendida";
  if (event === "purchase_partial") return "Atendimento parcial";
  if (event === "purchase_without_product") return "Sem produto";
  return "Correcao administrativa";
}

export function roleLabel(role: GppActorSnapshot["roleSnapshot"]): string {
  if (role === "admin") return "administracao";
  if (role === "lead") return "lideranca";
  if (role === "gpp") return "GPP";
  return "colaborador";
}

export function actorLabel(actor: GppActorSnapshot): string {
  return actor.displayName;
}

export function quantityLabel(quantity: GppQuantity): string {
  return `${quantityFormatter.format(quantity.value)} ${quantity.unit}`;
}

export function formatActivityLabel(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  const currentDay = dayKey(now);
  const targetDay = dayKey(date);

  if (currentDay === targetDay) {
    return `Hoje ${new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(date)}`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function centralFreshnessLabel(value: Date | undefined, now: Date = new Date()): string {
  if (value === undefined) return "Ainda nao atualizado";
  const seconds = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 1000));
  if (seconds < 60) return `Atualizado ha ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `Atualizado ha ${minutes}min`;
}

function compareAvariaGroups(left: GppAvariaGroupSummary, right: GppAvariaGroupSummary): number {
  const eligible = Number(right.eligibleForBaixa) - Number(left.eligibleForBaixa);
  if (eligible !== 0) return eligible;
  const divergence = right.divergenceCount - left.divergenceCount;
  if (divergence !== 0) return divergence;
  const latest =
    new Date(right.latestActivityAt).getTime() - new Date(left.latestActivityAt).getTime();
  if (latest !== 0) return latest;
  return collator.compare(
    `${left.product.code} ${left.product.name}`,
    `${right.product.code} ${right.product.name}`,
  );
}

function comparePurchaseRequests(left: GppPurchaseRequest, right: GppPurchaseRequest): number {
  const status = purchaseStatusRank(left.status) - purchaseStatusRank(right.status);
  if (status !== 0) return status;
  const latest = new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime();
  if (latest !== 0) return latest;
  return collator.compare(left.product.name, right.product.name);
}

function purchaseStatusRank(status: GppPurchaseStatus): number {
  if (status === "solicitado") return 0;
  if (status === "atendido_parcial") return 1;
  if (status === "sem_produto") return 2;
  if (status === "cancelado") return 3;
  return 4;
}

function baixaBlockedReason(group: GppAvariaGroupSummary): string | undefined {
  if (group.divergenceCount > 0) return "Corrigir divergencia antes da baixa";
  if (!group.eligibleForBaixa) return "Finalidade nao permite baixa direta";
  return undefined;
}

function quantitySummary(quantities: readonly GppQuantity[]): string {
  const byUnit = new Map<string, number>();

  for (const quantity of quantities) {
    byUnit.set(quantity.unit, (byUnit.get(quantity.unit) ?? 0) + quantity.value);
  }

  if (byUnit.size === 0) return "0";

  return [...byUnit.entries()]
    .sort(([left], [right]) => collator.compare(left, right))
    .map(([unit, value]) => `${quantityFormatter.format(value)} ${unit}`)
    .join(" + ");
}

function countBaixadasToday(
  history: readonly GppHistoryRow[],
  sector: string,
  referenceDate: Date,
): number {
  const referenceDay = dayKey(referenceDate);

  return history.filter(
    (row) =>
      row.event === "baixado" &&
      row.sector === sector &&
      dayKey(new Date(row.occurredAt)) === referenceDay,
  ).length;
}

function historyMatchesQuery(row: GppHistoryRow, normalizedQuery: string): boolean {
  return [
    row.historyId,
    row.targetId,
    row.productCode ?? "",
    row.productName ?? "",
    row.sector ?? "",
    row.summary,
    row.justification ?? "",
    historyEventLabel(row.event),
  ].some((value) => normalize(value).includes(normalizedQuery));
}

function optionalDate(value: string | undefined): Date | undefined {
  if (value === undefined || value.trim().length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
