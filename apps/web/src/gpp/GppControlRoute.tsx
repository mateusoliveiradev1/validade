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
import { createFetchGppClient, isGppMutationConflict, type GppClient } from "./gpp-client";
import { useGppRealtime, type GppRealtimeSocket } from "./gpp-realtime";
import {
  GPP_TABS,
  actorLabel,
  buildAvariaSectorPanels,
  buildPurchaseQueueSummary,
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
  type GppHistoryEventFilter,
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

interface ReviewTarget {
  entry: GppAvariaEntry;
  approved: boolean;
  status: "ready" | "saving";
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

interface PurchaseDetailTarget {
  request: GppPurchaseRequest;
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

const HISTORY_FILTERS = [
  { label: "Tudo", value: "" },
  { label: "Baixas", value: "baixas" },
  { label: "Divergencias", value: "divergencias" },
  { label: "Compras", value: "compras" },
] as const satisfies readonly { label: string; value: GppHistoryEventFilter }[];

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
  const [reviewTarget, setReviewTarget] = React.useState<ReviewTarget>();
  const [purchaseDetail, setPurchaseDetail] = React.useState<PurchaseDetailTarget>();
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
  const purchaseSummary = React.useMemo(
    () =>
      snapshot === undefined
        ? { closedCount: 0, pendingCount: 0, totalCount: 0 }
        : buildPurchaseQueueSummary(snapshot, query),
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
              feedback: "Nao conseguimos salvar a baixa. Tente de novo antes de retirar da fila.",
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
          feedback: "Nao conseguimos salvar a baixa. Tente de novo antes de retirar da fila.",
          status: "ready",
        });
        return;
      }

      setFeedback("Baixa registrada.");
      setBaixaTarget(undefined);
      closeAndRestoreFocus(current.openerId);
      await loadSnapshot();
    } catch (error) {
      if (isGppMutationConflict(error)) {
        setBaixaTarget(undefined);
        closeAndRestoreFocus(current.openerId);
        await loadSnapshot();
        setFeedback(error.message);
        return;
      }

      setBaixaTarget({
        ...current,
        feedback: "Nao conseguimos salvar a baixa. Tente de novo antes de retirar da fila.",
        status: "ready",
      });
    }
  }

  async function openDivergence(group: GppAvariaGroupSummary, openerId: string): Promise<void> {
    if (group.divergenceCount > 0) {
      setFeedback(
        "Esse produto ja tem divergencia aberta. Corrija e revise antes de marcar outra.",
      );
      closeAndRestoreFocus(openerId);
      return;
    }

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
      handleMutationFeedback(response, "Divergencia registrada.", "Divergencia");
      setDivergenceTarget(undefined);
      closeAndRestoreFocus(divergenceTarget.openerId);
      await loadSnapshot();
    } catch (error) {
      if (isGppMutationConflict(error)) {
        setDivergenceTarget(undefined);
        closeAndRestoreFocus(divergenceTarget.openerId);
        await loadSnapshot();
        setFeedback(error.message);
        return;
      }

      setDivergenceTarget({
        ...divergenceTarget,
        feedback:
          "Nao conseguimos salvar a divergencia. Tente de novo antes de considerar concluido.",
        status: "ready",
      });
    }
  }

  async function submitReviewCorrection(formData: FormData): Promise<void> {
    if (reviewTarget === undefined) return;
    const current = reviewTarget;
    const justification = formString(formData, "justification").trim();

    if (justification.length === 0) {
      setReviewTarget({
        ...current,
        feedback: "Informe a justificativa da revisao.",
        status: "ready",
      });
      return;
    }

    setReviewTarget({ ...current, feedback: undefined, status: "saving" });

    try {
      const response = await client.reviewCorrection({
        approved: current.approved,
        avariaId: current.entry.avariaId,
        idempotencyKey: createUiId(current.approved ? "gpp-review-approve" : "gpp-review-keep"),
        justification,
        occurredAt: now().toISOString(),
      });
      handleMutationFeedback(
        response,
        current.approved ? "Correcao aprovada pelo GPP." : "Divergencia mantida para correcao.",
        "Revisao",
      );
      setReviewTarget(undefined);
      closeAndRestoreFocus(current.openerId);
      await loadSnapshot();
    } catch (error) {
      if (isGppMutationConflict(error)) {
        setReviewTarget(undefined);
        closeAndRestoreFocus(current.openerId);
        await loadSnapshot();
        setFeedback(error.message);
        return;
      }

      setReviewTarget({
        ...current,
        feedback: "Nao conseguimos salvar a revisao. Tente de novo antes de considerar revisado.",
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
      setFeedback("Nao conseguimos salvar agora. Tente de novo antes de considerar concluido.");
      return;
    }

    setFeedback(successCopy.length > 0 ? successCopy : `${fallbackLabel} registrado.`);
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
        feedback: "Confirme o codigo do produto antes de finalizar como atendido.",
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
        feedback: "Informe o motivo antes de salvar.",
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
    } catch (error) {
      if (isGppMutationConflict(error)) {
        setPurchaseAction(undefined);
        closeAndRestoreFocus(current.openerId);
        await loadSnapshot();
        setFeedback(error.message);
        return;
      }

      setPurchaseAction({
        ...current,
        feedback: "Nao conseguimos salvar agora. Tente de novo antes de considerar concluido.",
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
            Fila GPP - {session.store.storeName}
          </h1>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Veja o que precisa baixar, corrigir ou atender antes de liberar as pendencias da loja.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm" {...realtime.ariaLiveProps}>
            <Badge tone={centralUnavailable ? "critical" : "success"}>
              {centralUnavailable ? "Sistema fora do ar" : "Sistema online"}
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
            <span className="sr-only">Buscar na fila GPP</span>
            <Search
              className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Buscar produto, codigo, setor ou registro"
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
            <p className="font-semibold text-destructive">Nao foi possivel atualizar a fila</p>
            <p className="max-w-[75ch] text-sm leading-5">
              Tente atualizar antes de baixar ou concluir uma pendencia.
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
          <nav aria-label="Abas da fila GPP" className="flex flex-wrap gap-2" role="tablist">
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
                onOpenDetails={(request, openerId) => setPurchaseDetail({ openerId, request })}
                panels={purchasePanels}
                rowRefs={rowRefs}
                summary={purchaseSummary}
                onOpenPurchaseHistory={() => {
                  setHistoryFilters({ event: "compras" });
                  setActiveTab("historico");
                }}
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
                onReviewCorrection={(entry, approved, openerId) =>
                  setReviewTarget({ approved, entry, openerId, status: "ready" })
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
        onOpenBaixa={(group, entry, openerId) => {
          const restoredOpenerId = detailTarget?.openerId ?? openerId;
          setDetailTarget(undefined);
          openBaixaForEntry(group, entry, restoredOpenerId);
        }}
        onOpenDivergence={(group, openerId) => {
          const restoredOpenerId = detailTarget?.openerId ?? openerId;
          setDetailTarget(undefined);
          void openDivergence(group, restoredOpenerId);
        }}
      />

      <DivergenceSheet
        target={divergenceTarget}
        onClose={() => {
          if (divergenceTarget !== undefined) closeAndRestoreFocus(divergenceTarget.openerId);
          setDivergenceTarget(undefined);
        }}
        onSubmit={(formData) => void submitDivergence(formData)}
      />

      <ReviewCorrectionSheet
        target={reviewTarget}
        onClose={() => {
          if (reviewTarget !== undefined) closeAndRestoreFocus(reviewTarget.openerId);
          setReviewTarget(undefined);
        }}
        onSubmit={(formData) => void submitReviewCorrection(formData)}
      />

      <PurchaseDetailSheet
        canActOnCentral={canActOnCentral}
        canAttend={session.actions.canAttendGppPurchase}
        target={purchaseDetail}
        onAction={(request, action, openerId) => {
          const restoredOpenerId = purchaseDetail?.openerId ?? openerId;
          setPurchaseDetail(undefined);
          setPurchaseAction({ action, openerId: restoredOpenerId, request, status: "ready" });
        }}
        onClose={() => {
          if (purchaseDetail !== undefined) closeAndRestoreFocus(purchaseDetail.openerId);
          setPurchaseDetail(undefined);
        }}
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
                  {countLabel(panel.entryCount, "item", "itens")} registrados, {panel.totalSummary},{" "}
                  {countLabel(panel.baixadasToday, "baixa hoje", "baixas hoje")}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                <Badge tone="neutral">{countLabel(panel.groupCount, "produto", "produtos")}</Badge>
                <Badge tone={panel.divergenceCount === 0 ? "success" : "warning"}>
                  {countLabel(panel.divergenceCount, "divergencia", "divergencias")}
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
    ? "Sistema fora do ar"
    : !canBaixar
      ? "Acao indisponivel para este papel"
      : row.baixa.reason;
  const canOpenDivergence = canActOnCentral && canMarkDivergence && row.group.divergenceCount === 0;

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
          disabled={!canOpenDivergence}
          type="button"
          variant={row.group.divergenceCount > 0 ? "outline" : "destructive"}
          onClick={() => onOpenDivergence(row.group, divergenceId)}
        >
          <AlertTriangle className="size-4" aria-hidden="true" />
          {row.group.divergenceCount > 0 ? "Divergencia aberta" : "Marcar divergencia"}
        </Button>
      </div>
    </div>
  );
}

function PurchasesTab({
  canActOnCentral,
  canAttend,
  onAction,
  onOpenDetails,
  onOpenPurchaseHistory,
  panels,
  rowRefs,
  summary,
}: {
  canActOnCentral: boolean;
  canAttend: boolean;
  onAction: (
    request: GppPurchaseRequest,
    action: GppPurchaseAttendanceRequest["action"],
    openerId: string,
  ) => void;
  onOpenDetails: (request: GppPurchaseRequest, openerId: string) => void;
  onOpenPurchaseHistory: () => void;
  panels: ReturnType<typeof buildPurchaseSectorPanels>;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  summary: ReturnType<typeof buildPurchaseQueueSummary>;
}) {
  if (panels.length === 0) {
    return (
      <div className="grid gap-3 rounded-lg border border-border bg-card p-6">
        <div className="grid gap-2">
          <p className="text-xl font-semibold leading-6">Nenhuma compra interna pendente</p>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            {summary.closedCount > 0
              ? `${closedPurchaseQueueCopy(summary.closedCount)} Consulte o Historico quando precisar conferir o que ja foi atendido, cancelado ou marcado sem produto.`
              : "Quando um setor pedir produto ao GPP, o pedido aparece aqui ate ser atendido, cancelado ou marcado como sem produto."}
          </p>
        </div>
        {summary.closedCount > 0 ? (
          <div>
            <Button type="button" variant="outline" onClick={onOpenPurchaseHistory}>
              Ver historico de compras
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {summary.closedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 text-sm leading-5">
          <p className="text-muted-foreground">{closedPurchaseQueueCopy(summary.closedCount)}</p>
          <Button type="button" variant="outline" onClick={onOpenPurchaseHistory}>
            Ver historico de compras
          </Button>
        </div>
      ) : null}
      {panels.map((panel) => (
        <section key={panel.sector} className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="grid gap-1">
              <h2 className="text-xl font-semibold leading-6">{panel.sector}</h2>
              <p className="text-sm text-muted-foreground">
                {countLabel(panel.pendingCount, "pedido pendente", "pedidos pendentes")}
              </p>
            </div>
            <Badge tone="warning">Fila ativa</Badge>
          </div>
          {panel.requests.map((request) => {
            const baseId = `${request.purchaseRequestId}:purchase`;
            const canAttendRequest =
              canActOnCentral && canAttend && request.status === "solicitado";

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
                    {quantityLabel(request.requestedQuantity)} para {request.finality}; pedido por{" "}
                    {actorLabel(request.requester)} em {formatActivityLabel(request.requestedAt)}
                  </p>
                  {request.status === "solicitado" && request.product.code === undefined ? (
                    <p className="text-sm text-warning-foreground">
                      Confirme o codigo do produto antes de finalizar como atendido.
                    </p>
                  ) : null}
                  {request.status === "solicitado" ? null : (
                    <p className="text-sm leading-5 text-muted-foreground">
                      {purchaseClosedCopy(request)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.status === "solicitado" ? (
                    <>
                      <Button
                        ref={(node) => setButtonRef(rowRefs, `${baseId}:atendido`, node)}
                        disabled={!canAttendRequest}
                        type="button"
                        onClick={() => onAction(request, "atendido", `${baseId}:atendido`)}
                      >
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Atendido
                      </Button>
                      <Button
                        ref={(node) => setButtonRef(rowRefs, `${baseId}:parcial`, node)}
                        disabled={!canAttendRequest}
                        type="button"
                        variant="outline"
                        onClick={() => onAction(request, "atendido_parcial", `${baseId}:parcial`)}
                      >
                        Parcial
                      </Button>
                      <Button
                        ref={(node) => setButtonRef(rowRefs, `${baseId}:sem-produto`, node)}
                        disabled={!canAttendRequest}
                        type="button"
                        variant="outline"
                        onClick={() => onAction(request, "sem_produto", `${baseId}:sem-produto`)}
                      >
                        Sem produto
                      </Button>
                    </>
                  ) : null}
                  <Button
                    ref={(node) => setButtonRef(rowRefs, `${baseId}:detail`, node)}
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenDetails(request, `${baseId}:detail`)}
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
  onReviewCorrection,
  rowRefs,
}: {
  canBaixar: boolean;
  canReview: boolean;
  entries: readonly GppAvariaEntry[];
  onOpenBaixa: (entry: GppAvariaEntry, openerId: string) => void;
  onOpenDetails: (entry: GppAvariaEntry, openerId: string) => void;
  onReviewCorrection: (entry: GppAvariaEntry, approved: boolean, openerId: string) => void;
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
        const approveId = `${entry.avariaId}:review-approve`;
        const keepId = `${entry.avariaId}:review-keep`;
        const baixaId = `${entry.avariaId}:reviewed-baixa`;
        const canBaixarAfterReview = canBaixar && entry.status === "revisado_gpp";
        const canReviewCorrection = canReview && entry.status === "corrigido";

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
                {actorLabel(entry.actor)} em {formatActivityLabel(entry.updatedAt)}
              </p>
              <p className="text-sm leading-5">
                Proximo passo: {divergenceNextAction(entry, canReview)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                ref={(node) => setButtonRef(rowRefs, approveId, node)}
                disabled={!canReviewCorrection}
                type="button"
                variant="outline"
                onClick={() => onReviewCorrection(entry, true, approveId)}
              >
                Revisar correcao
              </Button>
              <Button
                ref={(node) => setButtonRef(rowRefs, keepId, node)}
                disabled={!canReviewCorrection}
                type="button"
                variant="ghost"
                onClick={() => onReviewCorrection(entry, false, keepId)}
              >
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
  const eventValue = filters.event ?? "";
  const hasFilters = hasHistoryFilters(filters);

  function updateFilters(patch: Partial<GppHistoryFilters>): void {
    setFilters((current) => normalizeHistoryFilters({ ...current, ...patch }));
  }

  return (
    <div className="grid gap-4">
      <section
        className="grid gap-3 rounded-lg border border-border bg-card p-4"
        aria-label="Filtros do historico GPP"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold leading-6">Historico</h2>
            <p className="text-sm leading-5 text-muted-foreground">
              {countLabel(rows.length, "registro encontrado", "registros encontrados")}
            </p>
          </div>
          <Button
            disabled={!hasFilters}
            type="button"
            variant="outline"
            onClick={() => setFilters({})}
          >
            Limpar filtros
          </Button>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Recortes rapidos do historico">
          {HISTORY_FILTERS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={eventValue === option.value ? "secondary" : "outline"}
              onClick={() => updateFilters({ event: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold">
            De
            <Input
              name="from"
              type="datetime-local"
              value={filters.from ?? ""}
              onChange={(event) => updateFilters({ from: optionalFilterValue(event.target.value) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Ate
            <Input
              name="to"
              type="datetime-local"
              value={filters.to ?? ""}
              onChange={(event) => updateFilters({ to: optionalFilterValue(event.target.value) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Setor
            <Input
              name="sector"
              placeholder="Ex.: FLV"
              value={filters.sector ?? ""}
              onChange={(event) =>
                updateFilters({ sector: optionalFilterValue(event.target.value) })
              }
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold">
            Buscar no historico
            <Input
              name="query"
              placeholder="Produto, codigo ou motivo"
              value={filters.query ?? ""}
              onChange={(event) =>
                updateFilters({ query: optionalFilterValue(event.target.value) })
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Tipo de registro
            <Select
              name="event"
              value={eventValue}
              onChange={(event) =>
                updateFilters({ event: event.target.value as GppHistoryEventFilter })
              }
            >
              <option value="">Todos</option>
              <option value="baixas">Baixas</option>
              <option value="divergencias">Divergencias</option>
              <option value="compras">Compras</option>
              {HISTORY_EVENTS.map((event) => (
                <option key={event} value={event}>
                  {historyEventLabel(event)}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Pessoa
            <Input
              name="actor"
              placeholder="Nome de quem registrou"
              value={filters.actor ?? ""}
              onChange={(event) =>
                updateFilters({ actor: optionalFilterValue(event.target.value) })
              }
            />
          </label>
        </div>
        {hasFilters ? (
          <p className="text-sm leading-5 text-muted-foreground">
            Mostrando {historyFilterSummary(filters)}.
          </p>
        ) : null}
      </section>

      {rows.length === 0 ? (
        <EmptyState
          body="Ajuste a busca ou limpe os filtros para voltar a ver as baixas, divergencias e compras da loja."
          title="Nenhum registro encontrado"
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
                <p className="text-sm leading-5">{historySummaryLabel(row)}</p>
              </div>
              <Badge className="self-start justify-self-end" tone={historyTone(row.event)}>
                {historyEventLabel(row.event)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeHistoryFilters(filters: GppHistoryFilters): GppHistoryFilters {
  return {
    actor: optionalFilterValue(filters.actor),
    event: filters.event === "" ? undefined : filters.event,
    from: optionalFilterValue(filters.from),
    query: optionalFilterValue(filters.query),
    sector: optionalFilterValue(filters.sector),
    to: optionalFilterValue(filters.to),
  };
}

function hasHistoryFilters(filters: GppHistoryFilters): boolean {
  return Object.values(normalizeHistoryFilters(filters)).some((value) => value !== undefined);
}

function historyFilterSummary(filters: GppHistoryFilters): string {
  const normalized = normalizeHistoryFilters(filters);
  const parts = [
    normalized.event === undefined ? undefined : `tipo ${historyFilterLabel(normalized.event)}`,
    normalized.query === undefined ? undefined : `busca "${normalized.query}"`,
    normalized.sector === undefined ? undefined : `setor ${normalized.sector}`,
    normalized.actor === undefined ? undefined : `pessoa ${normalized.actor}`,
    normalized.from === undefined ? undefined : `de ${formatFilterDate(normalized.from)}`,
    normalized.to === undefined ? undefined : `ate ${formatFilterDate(normalized.to)}`,
  ].filter((part): part is string => part !== undefined);

  return parts.length === 0 ? "todos os registros" : parts.join(", ");
}

function historyFilterLabel(filter: GppHistoryEventFilter): string {
  if (filter === "") return "todos";
  if (filter === "baixas") return "baixas";
  if (filter === "divergencias") return "divergencias";
  if (filter === "compras") return "compras";
  return historyEventLabel(filter);
}

function formatFilterDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatActivityLabel(date.toISOString());
}

function optionalFilterValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? undefined : trimmed;
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
                <p className="text-sm font-semibold text-primary">Pendencia</p>
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
                Nao conseguimos carregar os detalhes. Tente abrir a pendencia novamente.
              </div>
            ) : null}
            {target.detail === undefined ? null : (
              <>
                <DetailSection title="O que falta">
                  <DetailLine label="Situacao" value={groupSituationLabel(target.group)} />
                  <DetailLine
                    label="Quantidade em aberto"
                    value={quantityLabel(
                      sumQuantities(target.detail.entries.map((entry) => entry.balanceQuantity)),
                    )}
                  />
                  <DetailLine
                    label="Ultima mudanca"
                    value={formatActivityLabel(target.group.latestActivityAt)}
                  />
                </DetailSection>
                <DetailSection title="Itens registrados">
                  {target.detail.entries.map((entry) => (
                    <div
                      key={entry.avariaId}
                      className="grid gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                    >
                      <div className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            {quantityLabel(entry.quantity)} para {entry.destination}
                          </p>
                          <Badge tone={entry.status === "divergencia" ? "warning" : "neutral"}>
                            {entrySituationLabel(entry)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Registrado por {actorLabel(entry.actor)} em{" "}
                          {formatActivityLabel(entry.createdAt)}. {centralReceiptLabel(entry)}
                        </p>
                      </div>
                      <Button
                        className="sm:justify-self-end"
                        disabled={!canBaixar || entry.baixaEligibility !== "eligible"}
                        size="sm"
                        type="button"
                        onClick={() =>
                          onOpenBaixa(target.group, entry, `${entry.avariaId}:detail-baixa`)
                        }
                      >
                        Baixar este item
                      </Button>
                    </div>
                  ))}
                </DetailSection>
                <DetailSection title="Baixas e ajustes">
                  {target.detail.movements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nada baixado ou ajustado ate agora.
                    </p>
                  ) : (
                    target.detail.movements.map((movement) => (
                      <DetailLine
                        key={movement.movementId}
                        label={finalityLabel(movement.kind)}
                        value={`${quantityLabel(movement.quantity)}; aberto ${quantityLabel(movement.remainingBalance)}`}
                      />
                    ))
                  )}
                </DetailSection>
                <DetailSection title="Historico da pendencia">
                  {target.detail.history.map((row) => (
                    <HistoryDetailLine key={row.historyId} row={row} />
                  ))}
                </DetailSection>
              </>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border bg-popover py-4">
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
                disabled={!canMarkDivergence || target.group.divergenceCount > 0}
                type="button"
                variant={target.group.divergenceCount > 0 ? "outline" : "destructive"}
                onClick={() => onOpenDivergence(target.group, target.openerId)}
              >
                {target.group.divergenceCount > 0 ? "Divergencia aberta" : "Marcar divergencia"}
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
                Nao conseguimos carregar a divergencia. Tente abrir novamente.
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
              Motivo da divergencia
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
                {target.status === "saving" ? "Salvando..." : "Marcar divergencia"}
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

function ReviewCorrectionSheet({
  onClose,
  onSubmit,
  target,
}: {
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  target: ReviewTarget | undefined;
}) {
  return (
    <Sheet open={target !== undefined} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent
        className="grid w-[min(40rem,calc(100vw-1rem))] content-between gap-6 p-4"
        aria-label="Revisar correcao GPP"
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
              <p className="text-sm font-semibold text-primary">Revisao GPP</p>
              <h2 className="text-xl font-semibold leading-6">
                {target.entry.product.code} - {target.entry.product.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {target.entry.sector} - {quantityLabel(target.entry.quantity)} -{" "}
                {target.approved ? "aprovar correcao" : "manter divergencia"}
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
            <label className="grid gap-1 text-sm font-semibold">
              O que foi conferido
              <textarea
                className="min-h-28 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                disabled={target.status !== "ready"}
                name="justification"
                required
              />
            </label>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button disabled={target.status !== "ready"} type="submit">
                {target.status === "saving"
                  ? "Salvando..."
                  : target.approved
                    ? "Aprovar correcao"
                    : "Manter divergencia"}
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

function PurchaseDetailSheet({
  canActOnCentral,
  canAttend,
  onAction,
  onClose,
  target,
}: {
  canActOnCentral: boolean;
  canAttend: boolean;
  onAction: (
    request: GppPurchaseRequest,
    action: GppPurchaseAttendanceRequest["action"],
    openerId: string,
  ) => void;
  onClose: () => void;
  target: PurchaseDetailTarget | undefined;
}) {
  const disabled = !canActOnCentral || !canAttend;

  return (
    <Sheet open={target !== undefined} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent
        className="grid w-[min(40rem,calc(100vw-1rem))] content-between gap-6 p-4"
        aria-label="Detalhes da compra interna GPP"
      >
        {target === undefined ? null : (
          <div className="grid gap-6">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-primary">Compra interna</p>
                <h2 className="text-xl font-semibold leading-6">{target.request.product.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {target.request.sector} - {quantityLabel(target.request.requestedQuantity)}
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={onClose}>
                Fechar
              </Button>
            </div>

            <DetailSection title="Pedido">
              <DetailLine label="Situacao" value={purchaseStatusLabel(target.request.status)} />
              <DetailLine label="Setor" value={target.request.sector} />
              <DetailLine
                label="Produto pedido"
                value={
                  target.request.product.code === undefined
                    ? target.request.product.name
                    : `${target.request.product.code} - ${target.request.product.name}`
                }
              />
              <DetailLine
                label="Quantidade solicitada"
                value={quantityLabel(target.request.requestedQuantity)}
              />
              <DetailLine label="Finalidade" value={target.request.finality} />
              <DetailLine label="Solicitante" value={actorLabel(target.request.requester)} />
              <DetailLine
                label="Pedido em"
                value={formatActivityLabel(target.request.requestedAt)}
              />
            </DetailSection>

            {target.request.status === "solicitado" && target.request.product.code === undefined ? (
              <div className="rounded-lg border border-warning-border bg-warning-surface p-3 text-sm leading-5">
                Confirme o codigo do produto antes de finalizar como atendido.
              </div>
            ) : null}

            {target.request.status === "solicitado" ? null : (
              <div className="rounded-lg border border-border bg-card p-3 text-sm leading-5">
                {purchaseClosedCopy(target.request)}
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border bg-popover py-4">
              {target.request.status === "solicitado" ? (
                <>
                  <Button
                    disabled={disabled}
                    type="button"
                    onClick={() => onAction(target.request, "atendido", target.openerId)}
                  >
                    Atendido
                  </Button>
                  <Button
                    disabled={disabled}
                    type="button"
                    variant="outline"
                    onClick={() => onAction(target.request, "atendido_parcial", target.openerId)}
                  >
                    Parcial
                  </Button>
                  <Button
                    disabled={disabled}
                    type="button"
                    variant="outline"
                    onClick={() => onAction(target.request, "sem_produto", target.openerId)}
                  >
                    Sem produto
                  </Button>
                  <Button
                    disabled={disabled}
                    type="button"
                    variant="destructive"
                    onClick={() => onAction(target.request, "cancelado", target.openerId)}
                  >
                    Cancelar
                  </Button>
                </>
              ) : null}
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
                {target.status === "saving" ? "Salvando..." : purchaseActionTitle(target.action)}
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
    <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/55 p-4">
      <AlertDialog
        className="grid w-full max-w-xl gap-4 border-warning-border bg-popover text-popover-foreground"
        aria-describedby="gpp-baixa-warning"
      >
        <div className="grid gap-2">
          <AlertDialogTitle className="text-xl">Confirmar baixa</AlertDialogTitle>
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
          <DetailLine label="Itens" value={String(target.entryCount)} />
          {target.balanceLabel === undefined ? null : (
            <DetailLine label="Aberto" value={target.balanceLabel} />
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
            {target.status === "saving" ? "Salvando..." : "Confirmar baixa"}
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

function HistoryDetailLine({ row }: { row: GppHistoryRow }) {
  return (
    <div className="grid gap-1 border-t border-border py-2 first:border-t-0">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">{historyEventLabel(row.event)}</span>
        <span className="text-sm text-muted-foreground">{formatActivityLabel(row.occurredAt)}</span>
      </div>
      <p className="text-sm leading-5">{historySummaryLabel(row)}</p>
      <p className="text-xs leading-5 text-muted-foreground">Por {actorLabel(row.actor)}</p>
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
    <div className="grid gap-3" aria-label="Carregando fila GPP">
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
    return canReview ? "Revisar a correcao" : "Aguardando revisao do GPP";
  if (entry.status === "revisado_gpp") return "Pode baixar";
  return "Aguardando correcao do setor";
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function closedPurchaseQueueCopy(count: number): string {
  return `${countLabel(count, "pedido encerrado", "pedidos encerrados")} ${
    count === 1 ? "saiu" : "sairam"
  } da fila ativa.`;
}

function groupSituationLabel(group: GppAvariaGroupSummary): string {
  if (group.divergenceCount > 0) return "Precisa de correcao";
  if (group.eligibleForBaixa) return "Pronto para baixar";
  return "Em acompanhamento";
}

function entrySituationLabel(entry: GppAvariaEntry): string {
  if (entry.status === "pendente") return "Aberto";
  if (entry.status === "divergencia") return "Com divergencia";
  if (entry.status === "corrigido") return "Corrigido, aguardando revisao";
  if (entry.status === "revisado_gpp") return "Revisado";
  if (entry.status === "baixado") return "Baixado";
  if (entry.status === "cancelado") return "Cancelado";
  if (entry.status === "estornado") return "Estornado";
  return "Corrigido pela administracao";
}

function centralReceiptLabel(entry: GppAvariaEntry): string {
  if (entry.centralState === "central_confirmed" || entry.centralState === "replayed") {
    return "Sincronizado.";
  }

  if (entry.centralState === "central_failed") {
    return "Ainda nao sincronizado.";
  }

  return "Aguardando sincronizacao.";
}

function historySummaryLabel(row: GppHistoryRow): string {
  const base = historyBaseSummary(row);
  return row.justification === undefined ? base : `${base} Motivo: ${row.justification}`;
}

function historyBaseSummary(row: GppHistoryRow): string {
  if (row.event === "created") return "Registro entrou na fila.";
  if (row.event === "edited") return "Informacoes atualizadas.";
  if (row.event === "divergence_marked") return "Divergencia marcada para correcao.";
  if (row.event === "corrected") return "Correcao registrada.";
  if (row.event === "reviewed_by_gpp") return "Correcao revisada pelo GPP.";
  if (row.event === "baixado") return "Baixa confirmada.";
  if (row.event === "canceled") return "Registro cancelado.";
  if (row.event === "estornado") return "Baixa estornada.";
  if (row.event === "purchase_attended") return "Compra interna atendida.";
  if (row.event === "purchase_partial") return "Compra interna atendida parcialmente.";
  if (row.event === "purchase_without_product") return "Pedido encerrado sem produto.";
  return "Ajuste administrativo registrado.";
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
  if (action === "atendido") return "Compra interna atendida.";
  if (action === "atendido_parcial") return "Atendimento parcial registrado.";
  if (action === "sem_produto") return "Sem produto registrado.";
  return "Pedido cancelado.";
}

function purchaseClosedCopy(request: GppPurchaseRequest): string {
  if (request.status === "atendido") {
    return `Pedido atendido em ${formatActivityLabel(request.updatedAt)}.`;
  }

  if (request.status === "atendido_parcial") {
    return `Pedido atendido parcialmente em ${formatActivityLabel(request.updatedAt)}.`;
  }

  if (request.status === "sem_produto") {
    return `Pedido encerrado sem produto em ${formatActivityLabel(request.updatedAt)}.`;
  }

  return `Pedido cancelado em ${formatActivityLabel(request.updatedAt)}.`;
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
