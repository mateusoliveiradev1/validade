import * as React from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, RefreshCw, Search } from "lucide-react";
import type {
  GppAvariaEntry,
  GppAvariaGroupSummary,
  GppDetailSnapshot,
  GppDivergenceReason,
  GppHistoryRow,
  GppMutationResponse,
  GppPurchaseAttendanceRequest,
  GppPurchaseRequest,
  GppQuantity,
  GppQueueSnapshot,
  SessionContextResponse,
} from "@validade-zero/contracts";
import type { WebFetcher } from "../auth/authenticated-fetch";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Sheet, SheetContent } from "../components/ui/sheet";
import { Skeleton } from "../components/ui/skeleton";
import { createFetchGppClient, type GppClient } from "./gpp-client";
import { useGppRealtime, type GppRealtimeSocket } from "./gpp-realtime";
import {
  GPP_TABS,
  actorLabel,
  buildAvariaSectorPanels,
  buildPurchaseSectorPanels,
  centralFreshnessLabel,
  divergenceReasonLabel,
  filterDivergenceEntries,
  filterHistoryRows,
  finalityLabel,
  formatActivityLabel,
  historyEventLabel,
  initialOpenAvariaSector,
  purchaseStatusLabel,
  quantityLabel,
  toAvariaGroupRow,
  type GppHistoryFilters,
  type GppTab,
} from "./gpp-view-model";

type RouteStatus = "loading" | "ready" | "error";

interface DetailTarget {
  group: GppAvariaGroupSummary;
  detail?: GppDetailSnapshot | undefined;
  status: "loading" | "ready" | "error";
  openerId: string;
}

interface BaixaTarget {
  group: GppAvariaGroupSummary;
  avariaIds: readonly string[];
  totalLabel: string;
  entryCount: number;
  balanceLabel?: string | undefined;
  status: "loading" | "ready" | "saving";
  feedback?: string | undefined;
  openerId: string;
}

interface DivergenceTarget {
  group: GppAvariaGroupSummary;
  detail?: GppDetailSnapshot | undefined;
  status: "loading" | "ready" | "error" | "saving";
  feedback?: string | undefined;
  openerId: string;
}

interface PurchaseActionTarget {
  request: GppPurchaseRequest;
  action: GppPurchaseAttendanceRequest["action"];
  status: "ready" | "saving";
  feedback?: string | undefined;
  openerId: string;
}

const DIVERGENCE_REASONS = [
  "quantidade_diferente",
  "codigo_produto_errado",
  "etiqueta_fisica_nao_encontrada",
  "setor_destino_errado",
  "duplicado",
  "producao_sem_finalidade_clara",
  "outro",
] as const satisfies readonly GppDivergenceReason[];

const HISTORY_EVENTS = [
  "created",
  "edited",
  "divergence_marked",
  "corrected",
  "reviewed_by_gpp",
  "baixado",
  "canceled",
  "estornado",
  "purchase_attended",
  "purchase_partial",
  "purchase_without_product",
  "administrative_correction",
] as const satisfies readonly GppHistoryRow["event"][];

function defaultNow(): Date {
  return new Date();
}

export function GppControlRoute({
  client: providedClient,
  createRealtimeSocket,
  fetcher,
  now = defaultNow,
  pollIntervalMs,
  session,
}: {
  client?: GppClient | undefined;
  createRealtimeSocket?: ((url: string) => GppRealtimeSocket) | undefined;
  fetcher?: WebFetcher | undefined;
  now?: (() => Date) | undefined;
  pollIntervalMs?: number | undefined;
  session: SessionContextResponse;
}) {
  const defaultClient = React.useMemo(() => createFetchGppClient(fetcher), [fetcher]);
  const client = providedClient ?? defaultClient;
  const [snapshot, setSnapshot] = React.useState<GppQueueSnapshot>();
  const [historyRows, setHistoryRows] = React.useState<readonly GppHistoryRow[]>([]);
  const [status, setStatus] = React.useState<RouteStatus>("loading");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastClientRefreshAt, setLastClientRefreshAt] = React.useState<Date>();
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<GppTab>("avarias");
  const [openSector, setOpenSector] = React.useState<string>();
  const [historyFilters, setHistoryFilters] = React.useState<GppHistoryFilters>({});
  const [detailTarget, setDetailTarget] = React.useState<DetailTarget>();
  const [baixaTarget, setBaixaTarget] = React.useState<BaixaTarget>();
  const [divergenceTarget, setDivergenceTarget] = React.useState<DivergenceTarget>();
  const [purchaseAction, setPurchaseAction] = React.useState<PurchaseActionTarget>();
  const [feedback, setFeedback] = React.useState<string>();
  const rowRefs = React.useRef(new Map<string, HTMLButtonElement>());

  const loadSnapshot = React.useCallback(async () => {
    setStatus((current) => (current === "ready" ? current : "loading"));
    setIsRefreshing(true);
    setFeedback(undefined);

    try {
      const queue = await client.readQueue({ storeId: session.store.storeId });
      const history = session.actions.canReadGppHistory
        ? await client.readHistory({ storeId: session.store.storeId, limit: 80 })
        : queue.history;
      const nextSnapshot: GppQueueSnapshot = { ...queue, history: [...history] };

      setSnapshot(nextSnapshot);
      setHistoryRows(history);
      setLastClientRefreshAt(now());
      setStatus("ready");
      setOpenSector((current) => current ?? initialOpenAvariaSector(nextSnapshot));
    } catch {
      setStatus("error");
    } finally {
      setIsRefreshing(false);
    }
  }, [client, now, session.actions.canReadGppHistory, session.store.storeId]);

  React.useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const realtime = useGppRealtime({
    canReadGppQueue: session.actions.canReadGppQueue,
    client,
    ...(createRealtimeSocket === undefined ? {} : { createWebSocket: createRealtimeSocket }),
    enabled: session.featureFlags.controle_gpp_enabled,
    now,
    ...(pollIntervalMs === undefined ? {} : { pollIntervalMs }),
    storeId: session.store.storeId,
  });

  React.useEffect(() => {
    if (realtime.snapshot === undefined) return;
    setSnapshot(realtime.snapshot);
    setHistoryRows(realtime.snapshot.history);
    setStatus("ready");
    setLastClientRefreshAt(realtime.lastUpdatedAt ?? now());
  }, [now, realtime.lastUpdatedAt, realtime.snapshot]);

  const avariaPanels = React.useMemo(
    () => (snapshot === undefined ? [] : buildAvariaSectorPanels(snapshot, query, now())),
    [now, query, snapshot],
  );
  const purchasePanels = React.useMemo(
    () => (snapshot === undefined ? [] : buildPurchaseSectorPanels(snapshot, query)),
    [query, snapshot],
  );
  const divergenceEntries = React.useMemo(
    () =>
      snapshot === undefined ? [] : filterDivergenceEntries(snapshot.divergenceEntries, query),
    [query, snapshot],
  );
  const filteredHistory = React.useMemo(
    () => filterHistoryRows(historyRows, historyFilters),
    [historyFilters, historyRows],
  );

  React.useEffect(() => {
    if (avariaPanels.length === 0) return;
    if (openSector === undefined || !avariaPanels.some((panel) => panel.sector === openSector)) {
      setOpenSector(avariaPanels[0]?.sector);
    }
  }, [avariaPanels, openSector]);

  function closeAndRestoreFocus(openerId: string): void {
    window.setTimeout(() => rowRefs.current.get(openerId)?.focus(), 0);
  }

  async function openDetails(group: GppAvariaGroupSummary, openerId: string): Promise<void> {
    setDetailTarget({ group, openerId, status: "loading" });

    try {
      const detail = await client.readDetail({
        storeId: session.store.storeId,
        groupId: group.groupId,
      });
      setDetailTarget({ group, detail, openerId, status: "ready" });
    } catch {
      setDetailTarget({ group, openerId, status: "error" });
    }
  }

  async function openBaixaForGroup(group: GppAvariaGroupSummary, openerId: string): Promise<void> {
    setBaixaTarget({
      group,
      avariaIds: [],
      entryCount: group.entryCount,
      openerId,
      status: "loading",
      totalLabel: quantityLabel(group.totalQuantity),
    });

    try {
      const detail = await client.readDetail({
        storeId: session.store.storeId,
        groupId: group.groupId,
      });
      setBaixaTarget({
        group,
        avariaIds: detail.entries.map((entry) => entry.avariaId),
        balanceLabel: quantityLabel(
          sumQuantities(detail.entries.map((entry) => entry.balanceQuantity)),
        ),
        entryCount: detail.entries.length,
        openerId,
        status: "ready",
        totalLabel: quantityLabel(group.totalQuantity),
      });
    } catch {
      setBaixaTarget((current) =>
        current === undefined
          ? undefined
          : {
              ...current,
              feedback: "Falha na central. Tente novamente antes de considerar baixado.",
              status: "ready",
            },
      );
    }
  }

  function openBaixaForEntry(
    group: GppAvariaGroupSummary,
    entry: GppAvariaEntry,
    openerId: string,
  ): void {
    setBaixaTarget({
      group,
      avariaIds: [entry.avariaId],
      balanceLabel: quantityLabel(entry.balanceQuantity),
      entryCount: 1,
      openerId,
      status: "ready",
      totalLabel: quantityLabel(entry.quantity),
    });
  }

  async function confirmBaixa(): Promise<void> {
    if (baixaTarget === undefined || baixaTarget.avariaIds.length === 0) return;
    const current = baixaTarget;
    setBaixaTarget({ ...current, feedback: undefined, status: "saving" });

    try {
      const response = await client.baixarAvarias({
        avariaIds: [...current.avariaIds],
        occurredAt: now().toISOString(),
        idempotencyKey: createUiId("gpp-baixa"),
        justification: "Baixa GPP confirmada no Controle GPP web.",
      });

      if (response.state === "central_failed") {
        setBaixaTarget({
          ...current,
          feedback: "Falha na central. Tente novamente antes de considerar baixado.",
          status: "ready",
        });
        return;
      }

      setFeedback("Baixa registrada na central");
      setBaixaTarget(undefined);
      closeAndRestoreFocus(current.openerId);
      await loadSnapshot();
    } catch {
      setBaixaTarget({
        ...current,
        feedback: "Falha na central. Tente novamente antes de considerar baixado.",
        status: "ready",
      });
    }
  }

  async function openDivergence(group: GppAvariaGroupSummary, openerId: string): Promise<void> {
    setDivergenceTarget({ group, openerId, status: "loading" });

    try {
      const detail = await client.readDetail({
        storeId: session.store.storeId,
        groupId: group.groupId,
      });
      setDivergenceTarget({ group, detail, openerId, status: "ready" });
    } catch {
      setDivergenceTarget({ group, openerId, status: "error" });
    }
  }

  async function submitDivergence(formData: FormData): Promise<void> {
    if (divergenceTarget === undefined || divergenceTarget.detail === undefined) return;
    const reason = formString(formData, "reason") as GppDivergenceReason;
    const observation = formString(formData, "observation").trim();
    const targetEntry = divergenceTarget.detail.entries[0];

    if (targetEntry === undefined || observation.length === 0) {
      setDivergenceTarget({
        ...divergenceTarget,
        feedback: "Informe motivo fechado e observacao.",
        status: "ready",
      });
      return;
    }

    setDivergenceTarget({ ...divergenceTarget, feedback: undefined, status: "saving" });

    try {
      const response = await client.markDivergence({
        avariaId: targetEntry.avariaId,
        reason,
        observation,
        occurredAt: now().toISOString(),
        idempotencyKey: createUiId("gpp-divergence"),
      });
      handleMutationFeedback(response, "Divergencia registrada na central", "Divergencia");
      setDivergenceTarget(undefined);
      closeAndRestoreFocus(divergenceTarget.openerId);
      await loadSnapshot();
    } catch {
      setDivergenceTarget({
        ...divergenceTarget,
        feedback: "Falha na central. Tente novamente antes de considerar concluido.",
        status: "ready",
      });
    }
  }

  function handleMutationFeedback(
    response: GppMutationResponse,
    successCopy: string,
    fallbackLabel: string,
  ): void {
    if (response.state === "central_failed") {
      setFeedback("Falha na central. Tente novamente antes de considerar concluido.");
      return;
    }

    setFeedback(successCopy.length > 0 ? successCopy : `${fallbackLabel} registrado na central`);
  }

  async function submitPurchaseAction(formData: FormData): Promise<void> {
    if (purchaseAction === undefined) return;
    const current = purchaseAction;
    const request = current.request;
    const quantity = quantityFromForm(formData, request.requestedQuantity);
    const reason = formString(formData, "reason").trim();
    const confirmedCode = formString(formData, "confirmedCode", request.product.code ?? "").trim();
    const confirmedName = formString(formData, "confirmedName", request.product.name).trim();

    if (
      (current.action === "atendido" || current.action === "atendido_parcial") &&
      confirmedCode.length === 0
    ) {
      setPurchaseAction({
        ...current,
        feedback: "Confirmar codigo do produto antes de atender.",
        status: "ready",
      });
      return;
    }

    if (
      (current.action === "atendido_parcial" ||
        current.action === "sem_produto" ||
        current.action === "cancelado") &&
      reason.length === 0
    ) {
      setPurchaseAction({
        ...current,
        feedback: "Informe o motivo antes de registrar na central.",
        status: "ready",
      });
      return;
    }

    const mutation = purchaseMutationFromAction({
      action: current.action,
      confirmedCode,
      confirmedName,
      now: now().toISOString(),
      purchaseRequestId: request.purchaseRequestId,
      quantity,
      reason,
    });

    setPurchaseAction({ ...current, feedback: undefined, status: "saving" });

    try {
      const response = await client.attendPurchase(mutation);
      handleMutationFeedback(response, purchaseSuccessCopy(current.action), "Compra interna");
      setPurchaseAction(undefined);
      closeAndRestoreFocus(current.openerId);
      await loadSnapshot();
    } catch {
      setPurchaseAction({
        ...current,
        feedback: "Falha na central. Tente novamente antes de considerar concluido.",
        status: "ready",
      });
    }
  }

  const centralUnavailable =
    status === "error" || (snapshot !== undefined && snapshot.centralState === "unavailable");
  const canActOnCentral = !centralUnavailable;
  const isInitialLoading = status === "loading" && snapshot === undefined;

  return (
    <section className="grid gap-6" aria-labelledby="gpp-heading">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start">
        <div className="grid min-w-0 gap-2">
          <p className="text-sm font-semibold text-primary">Fila da loja</p>
          <h1 id="gpp-heading" className="text-[28px] font-semibold leading-[34px]">
            Controle GPP - {session.store.storeName}
          </h1>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Acompanhe avarias, compras internas, divergencias e baixas confirmadas pela central
            desta loja.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm" {...realtime.ariaLiveProps}>
            <Badge tone={centralUnavailable ? "critical" : "success"}>
              {centralUnavailable ? "Central indisponivel" : "Central disponivel"}
            </Badge>
            <Badge tone={realtime.statusLabel === "Tempo real ativo" ? "success" : "warning"}>
              {realtime.statusLabel}
            </Badge>
            <span className="text-muted-foreground">
              {centralFreshnessLabel(lastClientRefreshAt, now())}
            </span>
          </div>
        </div>
        <div className="grid w-full gap-2">
          <label className="relative grid">
            <span className="sr-only">Buscar no Controle GPP</span>
            <Search
              className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Buscar produto, codigo, setor ou lancamento"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button
            className="min-h-12"
            disabled={isRefreshing}
            variant="outline"
            onClick={() => void loadSnapshot()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </header>

      {feedback === undefined ? null : (
        <div
          className="rounded-lg border border-border bg-card p-4 text-sm leading-5"
          role="status"
        >
          {feedback}
        </div>
      )}

      {centralUnavailable ? (
        <div
          className="grid gap-3 rounded-lg border border-critical-border bg-critical-surface p-4"
          role="alert"
        >
          <div className="grid gap-1">
            <p className="font-semibold text-destructive">Central indisponivel</p>
            <p className="max-w-[75ch] text-sm leading-5">
              Nao foi possivel carregar as pendencias do GPP. Tente atualizar antes de baixar.
            </p>
          </div>
          <Button className="w-fit" variant="outline" onClick={() => void loadSnapshot()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar
          </Button>
        </div>
      ) : null}

      {isInitialLoading ? <GppSkeleton /> : null}

      {snapshot === undefined ? null : (
        <>
          <nav aria-label="Abas do Controle GPP" className="flex flex-wrap gap-2" role="tablist">
            {GPP_TABS.map((tab) => (
              <Button
                key={tab.id}
                aria-controls={`gpp-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                role="tab"
                type="button"
                variant={activeTab === tab.id ? "secondary" : "outline"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </nav>

          <div id={`gpp-tab-${activeTab}`} role="tabpanel">
            {activeTab === "avarias" ? (
              <AvariasTab
                canActOnCentral={canActOnCentral}
                canBaixar={session.actions.canBaixarGppAvaria}
                canMarkDivergence={session.actions.canMarkGppDivergence}
                onOpenBaixa={(group, openerId) => void openBaixaForGroup(group, openerId)}
                onOpenDetails={(group, openerId) => void openDetails(group, openerId)}
                onOpenDivergence={(group, openerId) => void openDivergence(group, openerId)}
                openSector={openSector}
                panels={avariaPanels}
                rowRefs={rowRefs}
                setOpenSector={setOpenSector}
              />
            ) : null}

            {activeTab === "compras" ? (
              <PurchasesTab
                canActOnCentral={canActOnCentral}
                canAttend={session.actions.canAttendGppPurchase}
                onAction={(request, action, openerId) =>
                  setPurchaseAction({ action, openerId, request, status: "ready" })
                }
                panels={purchasePanels}
                rowRefs={rowRefs}
              />
            ) : null}

            {activeTab === "divergencias" ? (
              <DivergencesTab
                canBaixar={session.actions.canBaixarGppAvaria}
                canReview={session.actions.canReviewGppCorrection}
                entries={divergenceEntries}
                onOpenBaixa={(entry, openerId) =>
                  openBaixaForEntry(groupFromEntry(entry), entry, openerId)
                }
                onOpenDetails={(entry, openerId) =>
                  void openDetails(groupFromEntry(entry), openerId)
                }
                rowRefs={rowRefs}
              />
            ) : null}

            {activeTab === "historico" ? (
              <HistoryTab
                filters={historyFilters}
                rows={filteredHistory}
                setFilters={setHistoryFilters}
              />
            ) : null}
          </div>
        </>
      )}

      <DetailsSheet
        canBaixar={session.actions.canBaixarGppAvaria}
        canMarkDivergence={session.actions.canMarkGppDivergence}
        target={detailTarget}
        onClose={() => {
          if (detailTarget !== undefined) closeAndRestoreFocus(detailTarget.openerId);
          setDetailTarget(undefined);
        }}
        onOpenBaixa={openBaixaForEntry}
        onOpenDivergence={(group, openerId) => void openDivergence(group, openerId)}
      />

      <DivergenceSheet
        target={divergenceTarget}
        onClose={() => {
          if (divergenceTarget !== undefined) closeAndRestoreFocus(divergenceTarget.openerId);
          setDivergenceTarget(undefined);
        }}
        onSubmit={(formData) => void submitDivergence(formData)}
      />

      <PurchaseActionSheet
        target={purchaseAction}
        onClose={() => {
          if (purchaseAction !== undefined) closeAndRestoreFocus(purchaseAction.openerId);
          setPurchaseAction(undefined);
        }}
        onSubmit={(formData) => void submitPurchaseAction(formData)}
      />

      <BaixaDialog
        target={baixaTarget}
        onCancel={() => {
          if (baixaTarget !== undefined) closeAndRestoreFocus(baixaTarget.openerId);
          setBaixaTarget(undefined);
        }}
        onConfirm={() => void confirmBaixa()}
      />
    </section>
  );
}

function AvariasTab({
  canActOnCentral,
  canBaixar,
  canMarkDivergence,
  onOpenBaixa,
  onOpenDetails,
  onOpenDivergence,
  openSector,
  panels,
  rowRefs,
  setOpenSector,
}: {
  canActOnCentral: boolean;
  canBaixar: boolean;
  canMarkDivergence: boolean;
  onOpenBaixa: (group: GppAvariaGroupSummary, openerId: string) => void;
  onOpenDetails: (group: GppAvariaGroupSummary, openerId: string) => void;
  onOpenDivergence: (group: GppAvariaGroupSummary, openerId: string) => void;
  openSector: string | undefined;
  panels: ReturnType<typeof buildAvariaSectorPanels>;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  setOpenSector: (sector: string | undefined) => void;
}) {
  if (panels.length === 0) {
    return (
      <EmptyState
        body="Quando um setor registrar avaria, reaproveitamento, producao ou transferencia, ela aparece aqui por setor."
        title="Nenhuma avaria pendente agora"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {panels.map((panel) => {
        const isOpen = panel.sector === openSector;

        return (
          <section
            key={panel.sector}
            className="rounded-lg border border-border bg-card"
            aria-label={`Setor ${panel.sector}`}
          >
            <button
              aria-expanded={isOpen}
              className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              type="button"
              onClick={() => setOpenSector(isOpen ? undefined : panel.sector)}
            >
              <span className="grid gap-1">
                <span className="text-xl font-semibold leading-6">{panel.sector}</span>
                <span className="text-sm leading-5 text-muted-foreground">
                  {panel.entryCount} lancamento(s), {panel.totalSummary}, {panel.baixadasToday}{" "}
                  baixada(s) hoje
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                <Badge tone="neutral">{panel.groupCount} grupo(s)</Badge>
                <Badge tone={panel.divergenceCount === 0 ? "success" : "warning"}>
                  {panel.divergenceCount} divergencia(s)
                </Badge>
              </span>
            </button>
            {isOpen ? (
              <div>
                {panel.groups.map((row) => (
                  <AvariaGroupRow
                    key={row.group.groupId}
                    canActOnCentral={canActOnCentral}
                    canBaixar={canBaixar}
                    canMarkDivergence={canMarkDivergence}
                    row={row}
                    rowRefs={rowRefs}
                    onOpenBaixa={onOpenBaixa}
                    onOpenDetails={onOpenDetails}
                    onOpenDivergence={onOpenDivergence}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function AvariaGroupRow({
  canActOnCentral,
  canBaixar,
  canMarkDivergence,
  onOpenBaixa,
  onOpenDetails,
  onOpenDivergence,
  row,
  rowRefs,
}: {
  canActOnCentral: boolean;
  canBaixar: boolean;
  canMarkDivergence: boolean;
  onOpenBaixa: (group: GppAvariaGroupSummary, openerId: string) => void;
  onOpenDetails: (group: GppAvariaGroupSummary, openerId: string) => void;
  onOpenDivergence: (group: GppAvariaGroupSummary, openerId: string) => void;
  row: ReturnType<typeof toAvariaGroupRow>;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  const baixaId = `${row.group.groupId}:baixa`;
  const detailId = `${row.group.groupId}:detail`;
  const divergenceId = `${row.group.groupId}:divergence`;
  const baixaDisabledReason = !canActOnCentral
    ? "Central indisponivel"
    : !canBaixar
      ? "Acao indisponivel para este papel"
      : row.baixa.reason;

  return (
    <div className="grid gap-3 border-t border-border px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="grid min-w-0 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold leading-[22px]">{row.productLabel}</p>
          <Badge tone="neutral">{row.finalityLabel}</Badge>
          {row.divergenceLabel === undefined ? null : (
            <Badge tone="warning">{row.divergenceLabel}</Badge>
          )}
        </div>
        <p className="text-sm leading-5 text-muted-foreground">
          {row.group.sector} - {row.totalLabel} - {row.entryCountLabel} - {row.latestActivityLabel}
        </p>
        {baixaDisabledReason === undefined ? null : (
          <p className="text-sm leading-5 text-warning-foreground">{baixaDisabledReason}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          ref={(node) => setButtonRef(rowRefs, baixaId, node)}
          disabled={baixaDisabledReason !== undefined}
          type="button"
          onClick={() => onOpenBaixa(row.group, baixaId)}
        >
          <ClipboardCheck className="size-4" aria-hidden="true" />
          Baixar
        </Button>
        <Button
          ref={(node) => setButtonRef(rowRefs, detailId, node)}
          type="button"
          variant="outline"
          onClick={() => onOpenDetails(row.group, detailId)}
        >
          <Eye className="size-4" aria-hidden="true" />
          Detalhes
        </Button>
        <Button
          ref={(node) => setButtonRef(rowRefs, divergenceId, node)}
          disabled={!canActOnCentral || !canMarkDivergence}
          type="button"
          variant="destructive"
          onClick={() => onOpenDivergence(row.group, divergenceId)}
        >
          <AlertTriangle className="size-4" aria-hidden="true" />
          Divergencia
        </Button>
      </div>
    </div>
  );
}

function PurchasesTab({
  canActOnCentral,
  canAttend,
  onAction,
  panels,
  rowRefs,
}: {
  canActOnCentral: boolean;
  canAttend: boolean;
  onAction: (
    request: GppPurchaseRequest,
    action: GppPurchaseAttendanceRequest["action"],
    openerId: string,
  ) => void;
  panels: ReturnType<typeof buildPurchaseSectorPanels>;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  if (panels.length === 0) {
    return (
      <EmptyState
        body="Quando um setor pedir produto ao GPP, a solicitacao aparece aqui para atendimento."
        title="Nenhuma compra interna pendente agora"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {panels.map((panel) => (
        <section key={panel.sector} className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="grid gap-1">
              <h2 className="text-xl font-semibold leading-6">{panel.sector}</h2>
              <p className="text-sm text-muted-foreground">
                {panel.requestCount} solicitacao(oes), {panel.pendingCount} pendente(s)
              </p>
            </div>
            <Badge tone={panel.pendingCount === 0 ? "success" : "warning"}>Compras internas</Badge>
          </div>
          {panel.requests.map((request) => {
            const baseId = `${request.purchaseRequestId}:purchase`;
            const disabled = !canActOnCentral || !canAttend;

            return (
              <div
                key={request.purchaseRequestId}
                className="grid gap-3 border-t border-border px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {request.product.code === undefined
                        ? request.product.name
                        : `${request.product.code} - ${request.product.name}`}
                    </p>
                    <Badge tone={request.status === "solicitado" ? "warning" : "neutral"}>
                      {purchaseStatusLabel(request.status)}
                    </Badge>
                  </div>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {quantityLabel(request.requestedQuantity)} - {request.finality} -{" "}
                    {actorLabel(request.requester)} - {formatActivityLabel(request.requestedAt)}
                  </p>
                  {request.product.code === undefined ? (
                    <p className="text-sm text-warning-foreground">
                      Confirmar codigo do produto antes de atender.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    ref={(node) => setButtonRef(rowRefs, `${baseId}:atendido`, node)}
                    disabled={disabled}
                    type="button"
                    onClick={() => onAction(request, "atendido", `${baseId}:atendido`)}
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Atendido
                  </Button>
                  <Button
                    ref={(node) => setButtonRef(rowRefs, `${baseId}:parcial`, node)}
                    disabled={disabled}
                    type="button"
                    variant="outline"
                    onClick={() => onAction(request, "atendido_parcial", `${baseId}:parcial`)}
                  >
                    Parcial
                  </Button>
                  <Button
                    ref={(node) => setButtonRef(rowRefs, `${baseId}:sem-produto`, node)}
                    disabled={disabled}
                    type="button"
                    variant="outline"
                    onClick={() => onAction(request, "sem_produto", `${baseId}:sem-produto`)}
                  >
                    Sem produto
                  </Button>
                  <Button
                    ref={(node) => setButtonRef(rowRefs, `${baseId}:detail`, node)}
                    type="button"
                    variant="ghost"
                    onClick={() => onAction(request, "cancelado", `${baseId}:detail`)}
                  >
                    Detalhes
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function DivergencesTab({
  canBaixar,
  canReview,
  entries,
  onOpenBaixa,
  onOpenDetails,
  rowRefs,
}: {
  canBaixar: boolean;
  canReview: boolean;
  entries: readonly GppAvariaEntry[];
  onOpenBaixa: (entry: GppAvariaEntry, openerId: string) => void;
  onOpenDetails: (entry: GppAvariaEntry, openerId: string) => void;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        body="Itens marcados pelo GPP como divergentes aparecem aqui ate correcao e revisao."
        title="Nenhuma divergencia aberta agora"
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {entries.map((entry) => {
        const detailId = `${entry.avariaId}:divergence-detail`;
        const baixaId = `${entry.avariaId}:reviewed-baixa`;
        const canBaixarAfterReview = canBaixar && entry.status === "revisado_gpp";

        return (
          <div
            key={entry.avariaId}
            className="grid gap-3 border-t border-border px-4 py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">
                  {entry.product.code} - {entry.product.name}
                </p>
                <Badge tone="warning">
                  {entry.divergenceReason === undefined
                    ? "Divergencia"
                    : divergenceReasonLabel(entry.divergenceReason)}
                </Badge>
              </div>
              <p className="text-sm leading-5 text-muted-foreground">
                {entry.sector} - {quantityLabel(entry.quantity)} - marcada por{" "}
                {actorLabel(entry.actor)} - {formatActivityLabel(entry.updatedAt)}
              </p>
              <p className="text-sm leading-5">Agora: {divergenceNextAction(entry, canReview)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!canReview} type="button" variant="outline">
                Revisar correcao
              </Button>
              <Button type="button" variant="ghost">
                Manter divergencia
              </Button>
              <Button
                ref={(node) => setButtonRef(rowRefs, baixaId, node)}
                disabled={!canBaixarAfterReview}
                type="button"
                onClick={() => onOpenBaixa(entry, baixaId)}
              >
                Baixar apos revisao
              </Button>
              <Button
                ref={(node) => setButtonRef(rowRefs, detailId, node)}
                type="button"
                variant="outline"
                onClick={() => onOpenDetails(entry, detailId)}
              >
                Abrir detalhes
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({
  filters,
  rows,
  setFilters,
}: {
  filters: GppHistoryFilters;
  rows: readonly GppHistoryRow[];
  setFilters: React.Dispatch<React.SetStateAction<GppHistoryFilters>>;
}) {
  return (
    <div className="grid gap-4">
      <form
        className="grid gap-3 rounded-lg border border-border bg-card p-4"
        aria-label="Filtros do historico GPP"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setFilters({
            actor: formValue(form, "actor"),
            event: formValue(form, "event") as GppHistoryRow["event"] | "",
            from: formValue(form, "from"),
            query: formValue(form, "query"),
            sector: formValue(form, "sector"),
            to: formValue(form, "to"),
          });
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold">
            Periodo inicial
            <Input name="from" type="datetime-local" defaultValue={filters.from ?? ""} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Periodo final
            <Input name="to" type="datetime-local" defaultValue={filters.to ?? ""} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Setor
            <Input name="sector" defaultValue={filters.sector ?? ""} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold">
            Produto ou codigo
            <Input name="query" defaultValue={filters.query ?? ""} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Tipo/status
            <Select name="event" defaultValue={filters.event ?? ""}>
              <option value="">Todos</option>
              {HISTORY_EVENTS.map((event) => (
                <option key={event} value={event}>
                  {historyEventLabel(event)}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Pessoa
            <Input name="actor" defaultValue={filters.actor ?? ""} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Aplicar filtros</Button>
          <Button type="button" variant="outline" onClick={() => setFilters({})}>
            Limpar filtros
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          body="Ajuste os filtros ou consulte outro periodo para ver baixas, correcoes e atendimentos."
          title="Nenhum registro no periodo selecionado"
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {rows.map((row) => (
            <div
              key={row.historyId}
              className="grid gap-2 border-t border-border px-4 py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="grid gap-1">
                <p className="font-semibold">
                  {historyEventLabel(row.event)} - {row.productCode ?? row.targetId}
                  {row.productName === undefined ? "" : ` - ${row.productName}`}
                </p>
                <p className="text-sm leading-5 text-muted-foreground">
                  {row.sector ?? "Sem setor"} - {actorLabel(row.actor)} -{" "}
                  {formatActivityLabel(row.occurredAt)}
                </p>
                <p className="text-sm leading-5">{row.summary}</p>
              </div>
              <Badge tone={historyTone(row.event)}>{historyEventLabel(row.event)}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailsSheet({
  canBaixar,
  canMarkDivergence,
  onClose,
  onOpenBaixa,
  onOpenDivergence,
  target,
}: {
  canBaixar: boolean;
  canMarkDivergence: boolean;
  onClose: () => void;
  onOpenBaixa: (group: GppAvariaGroupSummary, entry: GppAvariaEntry, openerId: string) => void;
  onOpenDivergence: (group: GppAvariaGroupSummary, openerId: string) => void;
  target: DetailTarget | undefined;
}) {
  return (
    <Sheet open={target !== undefined} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent
        className="grid w-[min(40rem,calc(100vw-1rem))] content-between gap-6 p-4"
        aria-label="Detalhes do grupo GPP"
      >
        {target === undefined ? null : (
          <div className="grid gap-6">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-primary">Detalhes</p>
                <h2 className="text-xl font-semibold leading-6">
                  {target.group.product.code} - {target.group.product.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {target.group.sector} - {finalityLabel(target.group.finality)} -{" "}
                  {quantityLabel(target.group.totalQuantity)}
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={onClose}>
                Fechar
              </Button>
            </div>

            {target.status === "loading" ? <GppSkeleton /> : null}
            {target.status === "error" ? (
              <div
                className="rounded-lg border border-critical-border bg-critical-surface p-4"
                role="alert"
              >
                Falha na central. Tente abrir os detalhes novamente.
              </div>
            ) : null}
            {target.detail === undefined ? null : (
              <>
                <DetailSection title="Resumo">
                  <DetailLine
                    label="Status"
                    value={target.group.divergenceCount > 0 ? "Com divergencia" : "Pendente"}
                  />
                  <DetailLine
                    label="Saldo"
                    value={quantityLabel(
                      sumQuantities(target.detail.entries.map((entry) => entry.balanceQuantity)),
                    )}
                  />
                  <DetailLine
                    label="Ultima atividade"
                    value={formatActivityLabel(target.group.latestActivityAt)}
                  />
                </DetailSection>
                <DetailSection title="Lancamentos individuais">
                  {target.detail.entries.map((entry) => (
                    <div
                      key={entry.avariaId}
                      className="grid gap-2 border-t border-border py-3 first:border-t-0"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {quantityLabel(entry.quantity)} - {entry.destination}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {actorLabel(entry.actor)} - {formatActivityLabel(entry.createdAt)} -
                            central {entry.centralState}
                          </p>
                        </div>
                        <Button
                          disabled={!canBaixar || entry.baixaEligibility !== "eligible"}
                          size="sm"
                          type="button"
                          onClick={() =>
                            onOpenBaixa(target.group, entry, `${entry.avariaId}:detail-baixa`)
                          }
                        >
                          Baixar item
                        </Button>
                      </div>
                    </div>
                  ))}
                </DetailSection>
                <DetailSection title="Movimentos e saldo">
                  {target.detail.movements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum movimento vinculado ate agora.
                    </p>
                  ) : (
                    target.detail.movements.map((movement) => (
                      <DetailLine
                        key={movement.movementId}
                        label={finalityLabel(movement.kind)}
                        value={`${quantityLabel(movement.quantity)} - saldo ${quantityLabel(movement.remainingBalance)}`}
                      />
                    ))
                  )}
                </DetailSection>
                <DetailSection title="Auditoria e historico">
                  {target.detail.history.map((row) => (
                    <DetailLine
                      key={row.historyId}
                      label={historyEventLabel(row.event)}
                      value={`${row.summary} - ${actorLabel(row.actor)}`}
                    />
                  ))}
                </DetailSection>
              </>
            )}

            <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-popover py-4">
              <Button
                disabled={
                  !canBaixar || target.detail === undefined || !target.group.eligibleForBaixa
                }
                type="button"
                onClick={() => {
                  const entry = target.detail?.entries[0];
                  if (entry !== undefined)
                    onOpenBaixa(target.group, entry, `${entry.avariaId}:footer-baixa`);
                }}
              >
                Baixar
              </Button>
              <Button
                disabled={!canMarkDivergence}
                type="button"
                variant="destructive"
                onClick={() => onOpenDivergence(target.group, target.openerId)}
              >
                Divergencia
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DivergenceSheet({
  onClose,
  onSubmit,
  target,
}: {
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  target: DivergenceTarget | undefined;
}) {
  return (
    <Sheet open={target !== undefined} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent
        className="grid w-[min(40rem,calc(100vw-1rem))] content-between gap-6 p-4"
        aria-label="Marcar divergencia GPP"
      >
        {target === undefined ? null : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(new FormData(event.currentTarget));
            }}
          >
            <div className="grid gap-1 border-b border-border pb-4">
              <p className="text-sm font-semibold text-primary">Divergencia</p>
              <h2 className="text-xl font-semibold leading-6">
                {target.group.product.code} - {target.group.product.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {target.group.sector} - {quantityLabel(target.group.totalQuantity)}
              </p>
            </div>
            {target.status === "loading" ? <GppSkeleton /> : null}
            {target.status === "error" ? (
              <div
                className="rounded-lg border border-critical-border bg-critical-surface p-4"
                role="alert"
              >
                Falha na central. Tente abrir a divergencia novamente.
              </div>
            ) : null}
            {target.feedback === undefined ? null : (
              <div
                className="rounded-lg border border-critical-border bg-critical-surface p-4"
                role="alert"
              >
                {target.feedback}
              </div>
            )}
            <label className="grid gap-1 text-sm font-semibold">
              Motivo fechado
              <Select name="reason" disabled={target.status !== "ready"} required>
                {DIVERGENCE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {divergenceReasonLabel(reason)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Observacao
              <textarea
                className="min-h-28 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                disabled={target.status !== "ready"}
                name="observation"
                required
              />
            </label>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button disabled={target.status !== "ready"} type="submit">
                {target.status === "saving" ? "Salvando na central..." : "Marcar divergencia"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Voltar para fila
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PurchaseActionSheet({
  onClose,
  onSubmit,
  target,
}: {
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  target: PurchaseActionTarget | undefined;
}) {
  return (
    <Sheet open={target !== undefined} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent
        className="grid w-[min(40rem,calc(100vw-1rem))] content-between gap-6 p-4"
        aria-label="Atendimento de compra interna"
      >
        {target === undefined ? null : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(new FormData(event.currentTarget));
            }}
          >
            <div className="grid gap-1 border-b border-border pb-4">
              <p className="text-sm font-semibold text-primary">Compras internas</p>
              <h2 className="text-xl font-semibold leading-6">
                {purchaseActionTitle(target.action)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {target.request.sector} - {target.request.product.name} -{" "}
                {quantityLabel(target.request.requestedQuantity)}
              </p>
            </div>
            {target.feedback === undefined ? null : (
              <div
                className="rounded-lg border border-critical-border bg-critical-surface p-4"
                role="alert"
              >
                {target.feedback}
              </div>
            )}
            {target.action === "sem_produto" || target.action === "cancelado" ? null : (
              <>
                <label className="grid gap-1 text-sm font-semibold">
                  Confirmar codigo do produto
                  <Input
                    name="confirmedCode"
                    defaultValue={target.request.product.code ?? ""}
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Nome do produto
                  <Input name="confirmedName" defaultValue={target.request.product.name} required />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="grid gap-1 text-sm font-semibold">
                    Quantidade atendida
                    <Input
                      name="quantity"
                      type="number"
                      min="0.001"
                      step="0.001"
                      defaultValue={String(target.request.requestedQuantity.value)}
                      required
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Unidade
                    <Select name="unit" defaultValue={target.request.requestedQuantity.unit}>
                      <option value="un">un</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="caixa">caixa</option>
                      <option value="pacote">pacote</option>
                    </Select>
                  </label>
                </div>
              </>
            )}
            {target.action === "atendido" ? null : (
              <label className="grid gap-1 text-sm font-semibold">
                Motivo
                <textarea
                  className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  name="reason"
                  required
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button disabled={target.status === "saving"} type="submit">
                {target.status === "saving"
                  ? "Salvando na central..."
                  : purchaseActionTitle(target.action)}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Voltar para fila
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BaixaDialog({
  onCancel,
  onConfirm,
  target,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  target: BaixaTarget | undefined;
}) {
  if (target === undefined) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 p-4">
      <AlertDialog className="grid w-full max-w-xl gap-4" aria-describedby="gpp-baixa-warning">
        <div className="grid gap-2">
          <AlertDialogTitle className="text-xl">Confirmar baixa GPP</AlertDialogTitle>
          <AlertDialogDescription id="gpp-baixa-warning">
            Depois de baixar, ajustes exigem estorno ou correcao administrativa.
          </AlertDialogDescription>
        </div>
        <div className="grid gap-2 rounded-md border border-border bg-background p-3 text-sm">
          <DetailLine label="Setor" value={target.group.sector} />
          <DetailLine
            label="Produto"
            value={`${target.group.product.code} - ${target.group.product.name}`}
          />
          <DetailLine label="Total" value={target.totalLabel} />
          <DetailLine label="Finalidade" value={finalityLabel(target.group.finality)} />
          <DetailLine label="Lancamentos" value={String(target.entryCount)} />
          {target.balanceLabel === undefined ? null : (
            <DetailLine label="Saldo" value={target.balanceLabel} />
          )}
        </div>
        {target.feedback === undefined ? null : (
          <div
            className="rounded-lg border border-critical-border bg-critical-surface p-3 text-sm"
            role="alert"
          >
            {target.feedback}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            disabled={target.status === "saving"}
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Voltar para conferir
          </Button>
          <Button
            disabled={target.status !== "ready" || target.avariaIds.length === 0}
            type="button"
            onClick={onConfirm}
          >
            {target.status === "saving" ? "Salvando na central..." : "Confirmar baixa GPP"}
          </Button>
        </div>
      </AlertDialog>
    </div>
  );
}

function DetailSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="grid gap-2 text-sm">{children}</div>
    </section>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-t border-border py-2 first:border-t-0">
      <span className="font-semibold">{label}</span>
      <span className="text-right text-muted-foreground">{value}</span>
    </div>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-card p-6">
      <p className="text-xl font-semibold leading-6">{title}</p>
      <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

function GppSkeleton() {
  return (
    <div className="grid gap-3" aria-label="Carregando Controle GPP">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function sumQuantities(quantities: readonly GppQuantity[]): GppQuantity {
  const first = quantities[0];
  if (first === undefined) return { unit: "un", value: 0 };

  return {
    unit: first.unit,
    value: quantities
      .filter((quantity) => quantity.unit === first.unit)
      .reduce((total, quantity) => total + quantity.value, 0),
  };
}

function groupFromEntry(entry: GppAvariaEntry): GppAvariaGroupSummary {
  return {
    divergenceCount: entry.status === "divergencia" ? 1 : 0,
    eligibleForBaixa: entry.baixaEligibility === "eligible",
    entryCount: 1,
    finality: entry.finality,
    groupId: entry.avariaId,
    latestActivityAt: entry.updatedAt,
    product: entry.product,
    sector: entry.sector,
    totalQuantity: entry.quantity,
  };
}

function divergenceNextAction(entry: GppAvariaEntry, canReview: boolean): string {
  if (entry.status === "corrigido")
    return canReview ? "GPP pode revisar" : "Lideranca precisa revisar";
  if (entry.status === "revisado_gpp") return "Baixar apos revisao";
  return "Setor precisa corrigir";
}

function purchaseMutationFromAction(input: {
  action: GppPurchaseAttendanceRequest["action"];
  confirmedCode: string;
  confirmedName: string;
  now: string;
  purchaseRequestId: string;
  quantity: GppQuantity;
  reason: string;
}): GppPurchaseAttendanceRequest {
  if (input.action === "sem_produto") {
    return {
      action: "sem_produto",
      idempotencyKey: createUiId("gpp-sem-produto"),
      occurredAt: input.now,
      purchaseRequestId: input.purchaseRequestId,
      reason: input.reason,
    };
  }

  if (input.action === "cancelado") {
    return {
      action: "cancelado",
      idempotencyKey: createUiId("gpp-cancelado"),
      occurredAt: input.now,
      purchaseRequestId: input.purchaseRequestId,
      reason: input.reason,
    };
  }

  if (input.action === "atendido_parcial") {
    return {
      action: "atendido_parcial",
      attendedQuantity: input.quantity,
      confirmedProduct: { code: input.confirmedCode, name: input.confirmedName },
      idempotencyKey: createUiId("gpp-parcial"),
      occurredAt: input.now,
      purchaseRequestId: input.purchaseRequestId,
      reason: input.reason,
    };
  }

  return {
    action: "atendido",
    attendedQuantity: input.quantity,
    confirmedProduct: { code: input.confirmedCode, name: input.confirmedName },
    idempotencyKey: createUiId("gpp-atendido"),
    occurredAt: input.now,
    purchaseRequestId: input.purchaseRequestId,
  };
}

function purchaseActionTitle(action: GppPurchaseAttendanceRequest["action"]): string {
  if (action === "atendido") return "Atendido";
  if (action === "atendido_parcial") return "Parcial";
  if (action === "sem_produto") return "Sem produto";
  return "Cancelado";
}

function purchaseSuccessCopy(action: GppPurchaseAttendanceRequest["action"]): string {
  if (action === "atendido") return "Compra interna atendida na central";
  if (action === "atendido_parcial") return "Atendimento parcial registrado na central";
  if (action === "sem_produto") return "Sem produto registrado na central";
  return "Solicitacao cancelada na central";
}

function quantityFromForm(formData: FormData, fallback: GppQuantity): GppQuantity {
  const value = Number(formString(formData, "quantity", String(fallback.value)));
  const unit = formString(formData, "unit", fallback.unit) as GppQuantity["unit"];

  return {
    unit,
    value: Number.isFinite(value) && value > 0 ? value : fallback.value,
  };
}

function formString(formData: FormData, name: string, fallback = ""): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : fallback;
}

function historyTone(
  event: GppHistoryRow["event"],
): "neutral" | "success" | "warning" | "critical" {
  if (event === "baixado" || event === "purchase_attended" || event === "reviewed_by_gpp")
    return "success";
  if (
    event === "divergence_marked" ||
    event === "purchase_partial" ||
    event === "purchase_without_product"
  )
    return "warning";
  if (event === "canceled" || event === "estornado" || event === "administrative_correction")
    return "critical";
  return "neutral";
}

function formValue(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function createUiId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function setButtonRef(
  refs: React.MutableRefObject<Map<string, HTMLButtonElement>>,
  key: string,
  node: HTMLButtonElement | null,
): void {
  if (node === null) {
    refs.current.delete(key);
    return;
  }

  refs.current.set(key, node);
}
