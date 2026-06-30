import type { CommandCenterProjection } from "@validade-zero/contracts";
import { CheckCircle2, RefreshCw, Search, Smartphone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  countOperationalDeviceReadiness,
  formatDateTime,
  getDailyOperationDeviceBlockers,
  getDiagnosticDeviceRecords,
  getOperationalTurnDevices,
  optionalDateLabel,
} from "./command-center-view-model";

type OperacaoStatus = "loading" | "ready" | "error";
type FunnelTone = "success" | "warning" | "critical";

export function OperacaoRoute({
  canOpenAudit,
  canReviewProductDrafts,
  lastClientRefreshAt,
  onApproveProductDraft,
  onOpenAparelhos,
  onOpenAudit,
  onRefresh,
  projection,
  status,
}: {
  canOpenAudit: boolean;
  canReviewProductDrafts: boolean;
  lastClientRefreshAt?: Date;
  onApproveProductDraft: (draftId: string) => Promise<void>;
  onOpenAparelhos?: () => void;
  onOpenAudit?: () => void;
  onRefresh: () => void;
  projection: CommandCenterProjection | undefined;
  status: OperacaoStatus;
}) {
  const isInitialLoading = status === "loading" && projection === undefined;
  const [reviewingDraftId, setReviewingDraftId] = useState<string>();
  const [productReviewFeedback, setProductReviewFeedback] = useState<string>();

  async function approveProductDraft(
    draft: CommandCenterProjection["pendingProductDrafts"][number],
  ): Promise<void> {
    if (!canReviewProductDrafts || reviewingDraftId !== undefined) return;

    setReviewingDraftId(draft.draftId);
    setProductReviewFeedback(undefined);

    try {
      await onApproveProductDraft(draft.draftId);
      setProductReviewFeedback(
        `${draft.label} validado na central. Atualize a leitura central no aparelho e sincronize o lote novamente.`,
      );
    } catch {
      setProductReviewFeedback(
        "Nao foi possivel validar o produto agora. Confira sua permissao de catalogo e tente novamente.",
      );
    } finally {
      setReviewingDraftId(undefined);
    }
  }

  return (
    <section className="grid gap-6" aria-labelledby="operacao-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-primary">Operacao da loja</p>
          <h1 id="operacao-heading" className="text-[28px] font-semibold leading-[34px]">
            Area de venda segura agora?
          </h1>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Acompanhe o que exige acao fisica, confirmacao central ou decisao de lideranca agora.
          </p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {lastClientRefreshAt === undefined
              ? "Sincronizando com o app mobile..."
              : `Ultima leitura do painel: ${formatDateTime(lastClientRefreshAt.toISOString())}`}
          </p>
        </div>
        <Button
          className="min-h-12"
          disabled={status === "loading"}
          variant="outline"
          onClick={onRefresh}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {status === "loading" ? "Atualizando..." : "Atualizar agora"}
        </Button>
      </div>

      {isInitialLoading ? <OperacaoSkeleton /> : null}

      {status === "error" ? (
        <div
          className="grid gap-3 rounded-lg border border-critical-border bg-critical-surface p-4"
          role="alert"
        >
          <div className="grid gap-1">
            <p className="text-base font-semibold text-destructive">
              Nao foi possivel atualizar a leitura da loja.
            </p>
            <p className="text-sm leading-5 text-foreground">
              Tente atualizar agora; se continuar, use a ultima leitura visivel como pendente, nunca
              como area segura.
            </p>
          </div>
          <Button className="min-h-12 w-fit" onClick={onRefresh}>
            Tentar atualizar agora
          </Button>
        </div>
      ) : null}

      {productReviewFeedback === undefined ? null : (
        <div
          className="rounded-lg border border-border bg-card p-4 text-sm leading-5"
          role="status"
        >
          {productReviewFeedback}
        </div>
      )}

      {projection === undefined ? null : (
        <OperacaoContent
          canOpenAudit={canOpenAudit}
          canReviewProductDrafts={canReviewProductDrafts}
          onApproveProductDraft={(draft) => void approveProductDraft(draft)}
          {...(onOpenAparelhos === undefined ? {} : { onOpenAparelhos })}
          {...(onOpenAudit === undefined ? {} : { onOpenAudit })}
          projection={projection}
          reviewingDraftId={reviewingDraftId}
        />
      )}
    </section>
  );
}

function OperacaoContent({
  canOpenAudit,
  canReviewProductDrafts,
  onApproveProductDraft,
  onOpenAparelhos,
  onOpenAudit,
  projection,
  reviewingDraftId,
}: {
  canOpenAudit: boolean;
  canReviewProductDrafts: boolean;
  onApproveProductDraft: (draft: CommandCenterProjection["pendingProductDrafts"][number]) => void;
  onOpenAparelhos?: () => void;
  onOpenAudit?: () => void;
  projection: CommandCenterProjection;
  reviewingDraftId: string | undefined;
}) {
  const isEmpty =
    projection.verdict.state === "safe" &&
    projection.criticalLots.length === 0 &&
    projection.overdueTasks.length === 0 &&
    projection.pendingMarkdowns.length === 0 &&
    projection.pendingProductDrafts.length === 0 &&
    projection.pendingEvidence.length === 0 &&
    projection.syncConflicts.length === 0 &&
    projection.discardedActions.length === 0 &&
    projection.pendingShiftCloses.length === 0;

  return (
    <div className="grid gap-6">
      <section
        className={verdictClassName(projection.verdict.state)}
        aria-label="Veredito da area de venda"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-xl font-semibold leading-6">{projection.verdict.title}</h2>
            <p className="max-w-[75ch] text-base leading-6">{projection.verdict.detail}</p>
          </div>
          <Badge tone={verdictTone(projection.verdict.state)}>
            {verdictLabel(projection.verdict.state)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Atualizado {formatDateTime(projection.refreshedAt)}
          {projection.freshness === "stale" ? " - leitura central pendente de atualizacao" : ""}
        </p>
      </section>

      <DeviceReadinessStrip
        devices={projection.devices}
        referenceAt={projection.refreshedAt}
        {...(onOpenAparelhos === undefined ? {} : { onOpenAparelhos })}
      />

      <CentralSnapshotPanel snapshot={projection.centralSnapshot} />

      <CommandCenterInsightPanel projection={projection} />

      {isEmpty ? (
        <section className="grid gap-2 border-y py-6" aria-label="Sem gargalos ativos">
          <h2 className="text-xl font-semibold leading-6">Area de venda segura agora</h2>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Nenhum lote exige acao neste momento. Registre um lote novo ou confira os recentes para
            manter a operacao atualizada.
          </p>
        </section>
      ) : null}

      <OperationalFunnel
        canReviewProductDrafts={canReviewProductDrafts}
        onApproveProductDraft={onApproveProductDraft}
        projection={projection}
        reviewingDraftId={reviewingDraftId}
      />
      <AuditActionButton
        canOpenAudit={canOpenAudit}
        {...(onOpenAudit === undefined ? {} : { onOpenAudit })}
      />
    </div>
  );
}

function DeviceReadinessStrip({
  devices,
  onOpenAparelhos,
  referenceAt,
}: {
  devices: CommandCenterProjection["devices"];
  onOpenAparelhos?: () => void;
  referenceAt: string;
}) {
  const operationalDevices = getOperationalTurnDevices(devices, referenceAt);
  const diagnosticDevices = getDiagnosticDeviceRecords(devices, operationalDevices);
  const counts = countOperationalDeviceReadiness(devices, referenceAt);
  const dailyBlockerDevices = operationalDevices
    .map((device) => ({ device, blockers: getDailyOperationDeviceBlockers(device) }))
    .filter((item) => item.blockers.length > 0);

  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="Resumo de aparelhos"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Aparelhos</p>
          <h2 className="text-xl font-semibold leading-6">
            Aparelhos do turno: {counts.apto} aptos, {counts.atencao} em atencao, {counts.bloqueado}{" "}
            bloqueados
          </h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            Este resumo usa aparelhos confirmados na leitura atual. Historico antigo, duplicado ou
            sem usuario confirmado fica separado em Aparelhos.
          </p>
        </div>
        <Button
          className="min-h-12"
          disabled={onOpenAparelhos === undefined}
          variant="outline"
          onClick={onOpenAparelhos}
        >
          <Smartphone className="size-4" aria-hidden="true" />
          Abrir Aparelhos
        </Button>
      </div>

      {dailyBlockerDevices.length === 0 ? (
        <div className="rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted-foreground">
          Nenhum bloqueio de aparelho afeta a operacao diaria agora.
          {diagnosticDevices.length === 0
            ? ""
            : ` ${diagnosticDevices.length} registro(s) antigo(s) ou de diagnostico seguem visiveis fora deste resumo.`}
        </div>
      ) : (
        <div className="grid">
          {dailyBlockerDevices.map(({ blockers, device }) => (
            <div
              key={device.deviceIdMasked}
              className="grid gap-2 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid min-w-0 gap-1">
                  <p className="font-medium">{device.deviceLabel}</p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {device.deviceIdMasked} - leitura central{" "}
                    {optionalDateLabel(device.lastCentralReadAt)}
                  </p>
                </div>
                <Badge tone={device.verdict === "bloqueado" ? "critical" : "warning"}>
                  {device.verdict === "bloqueado" ? "Bloqueado" : "Atencao"}
                </Badge>
              </div>
              <p className="text-sm leading-5">
                <span className="font-medium">Causa: </span>
                {blockers.map((blocker) => blocker.label).join("; ")}
              </p>
              <p className="text-sm leading-5">
                <span className="font-medium">Agora: </span>
                {device.nextAction}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CentralSnapshotPanel({
  snapshot,
}: {
  snapshot: CommandCenterProjection["centralSnapshot"];
}) {
  const syncIssueCount = snapshot.conflictCount + snapshot.discardedActionCount;
  const noCentralLots = snapshot.lotCount === 0;

  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="Leitura central"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Leitura central</p>
          <h2 className="text-xl font-semibold leading-6">
            {noCentralLots ? "Nenhum lote salvo na central" : "Leitura central recebida"}
          </h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            Estes numeros vieram da leitura central usada pela Operacao, nao de dados locais do
            navegador.
          </p>
        </div>
        <Badge tone={snapshot.readiness === "blocked" ? "critical" : "success"}>
          {snapshot.readiness === "blocked" ? "Central bloqueada" : "Central atual"}
        </Badge>
      </div>

      <div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2 xl:grid-cols-4">
        <CentralSnapshotMetric
          label="Produtos"
          value={countLabel(snapshot.productCount, "produto central", "produtos centrais")}
          detail={countLabel(
            snapshot.draftProductCount,
            "cadastro em revisao",
            "cadastros em revisao",
          )}
        />
        <CentralSnapshotMetric
          label="Lotes"
          value={countLabel(snapshot.lotCount, "lote central", "lotes centrais")}
          detail={noCentralLots ? "Nenhum lote central disponivel." : "Lotes salvos na central."}
        />
        <CentralSnapshotMetric
          label="Tarefas"
          value={countLabel(snapshot.activeTaskCount, "tarefa ativa", "tarefas ativas")}
          detail={`${countLabel(snapshot.resolvedHistoryCount, "resolucao central", "resolucoes centrais")} no historico`}
        />
        <CentralSnapshotMetric
          label="Fila local"
          value={countLabel(syncIssueCount, "pendencia na fila local", "pendencias na fila local")}
          detail={`${countLabel(snapshot.pendingCommandCount, "comando local pendente", "comandos locais pendentes")} informado pela leitura central`}
        />
      </div>
    </section>
  );
}

function CentralSnapshotMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-b border-border p-3 last:border-b-0 sm:border-r xl:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold leading-6">{value}</p>
      <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function CommandCenterInsightPanel({ projection }: { projection: CommandCenterProjection }) {
  const shiftBlockers = projection.pendingShiftCloses.reduce(
    (total, item) => total + item.blockerCount,
    0,
  );
  const syncCount =
    projection.syncConflicts.length + projection.discardedActions.length + shiftBlockers;
  const primaryCause =
    projection.criticalLots[0]?.cause.label ??
    (syncCount > 0 ? "Fila local ou fechamento bloqueado" : "Sem causa ativa");

  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="Por que venceu"
    >
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-primary">Por que venceu</p>
        <h2 className="text-xl font-semibold leading-6">{primaryCause}</h2>
        <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
          A rota diaria mostra causa, responsavel e proxima acao operacional. Diagnostico de rollout
          fica fora deste primeiro fluxo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightMetric
          label="Vencidos/criticos"
          value={String(projection.criticalLots.length)}
          tone={projection.criticalLots.length === 0 ? "success" : "critical"}
        />
        <InsightMetric
          label="Atrasadas"
          value={String(projection.overdueTasks.length)}
          tone={projection.overdueTasks.length === 0 ? "success" : "warning"}
        />
        <InsightMetric
          label="Fila local/descarte"
          value={String(projection.syncConflicts.length + projection.discardedActions.length)}
          tone={
            projection.syncConflicts.length + projection.discardedActions.length === 0
              ? "success"
              : "critical"
          }
        />
        <InsightMetric
          label="Fechamento"
          value={String(shiftBlockers)}
          tone={shiftBlockers === 0 ? "success" : "critical"}
        />
      </div>

      <div className="grid">
        {projection.criticalLots.map((item) => (
          <div
            key={item.lotId}
            className="grid gap-2 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="grid min-w-0 gap-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm leading-5 text-muted-foreground">{item.locationLabel}</p>
              </div>
              <Badge tone="critical">Revisar agora</Badge>
            </div>
            <p className="text-sm leading-5">
              <span className="font-medium">Causa: </span>
              {item.cause.label}
            </p>
            <p className="text-sm leading-5">
              <span className="font-medium">Agora: </span>
              {item.cause.actionLabel}
            </p>
            {item.cause.sourceEventSummary === undefined ? null : (
              <p className="text-sm leading-5 text-muted-foreground">
                {item.cause.sourceEventSummary}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function InsightMetric({ label, tone, value }: { label: string; tone: FunnelTone; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-border bg-background p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xl font-semibold leading-6">{value}</p>
        <Badge tone={tone}>{tone === "success" ? "OK" : "Revisar"}</Badge>
      </div>
    </div>
  );
}

function OperationalFunnel({
  canReviewProductDrafts,
  onApproveProductDraft,
  projection,
  reviewingDraftId,
}: {
  canReviewProductDrafts: boolean;
  onApproveProductDraft: (draft: CommandCenterProjection["pendingProductDrafts"][number]) => void;
  projection: CommandCenterProjection;
  reviewingDraftId: string | undefined;
}) {
  return (
    <div className="grid gap-4">
      <FunnelSection
        title="Cadastros de produto em revisao"
        count={projection.pendingProductDrafts.length}
      >
        {projection.pendingProductDrafts.map((item) => (
          <ProductDraftRow
            key={item.draftId}
            canReviewProductDrafts={canReviewProductDrafts}
            isReviewing={reviewingDraftId === item.draftId}
            item={item}
            onApprove={() => onApproveProductDraft(item)}
          />
        ))}
      </FunnelSection>
      <FunnelSection title="Lotes criticos" count={projection.criticalLots.length}>
        {projection.criticalLots.map((item) => (
          <FunnelRow
            key={item.lotId}
            title={item.label}
            detail={`${item.locationLabel} - ${item.reason}`}
            tone="critical"
          />
        ))}
      </FunnelSection>
      <FunnelSection title="Tarefas atrasadas" count={projection.overdueTasks.length}>
        {projection.overdueTasks.map((item) => (
          <FunnelRow
            key={item.taskId}
            title={item.label}
            detail={`${item.ownerLabel} - ${item.dueLabel}`}
            tone="warning"
          />
        ))}
      </FunnelSection>
      <FunnelSection title="Rebaixas pendentes" count={projection.pendingMarkdowns.length}>
        {projection.pendingMarkdowns.map((item) => (
          <FunnelRow key={item.markdownId} title={item.label} detail={item.stage} tone="warning" />
        ))}
      </FunnelSection>
      <FunnelSection
        title="Evidencias pendentes ou com falha"
        count={projection.pendingEvidence.length}
      >
        {projection.pendingEvidence.map((item) => (
          <FunnelRow
            key={item.assetId}
            title={item.label}
            detail={item.detail}
            tone={item.state === "failed" ? "critical" : "warning"}
          />
        ))}
      </FunnelSection>
      <FunnelSection
        title="Conflitos da fila de sincronizacao"
        count={projection.syncConflicts.length}
      >
        {projection.syncConflicts.map((item) => (
          <FunnelRow
            key={item.conflictId}
            title={item.label}
            detail={item.detail}
            tone="critical"
          />
        ))}
      </FunnelSection>
      <FunnelSection
        title="Acoes descartadas pela central"
        count={projection.discardedActions.length}
      >
        {projection.discardedActions.map((item) => (
          <FunnelRow
            key={item.commandId}
            title={item.label}
            detail={`${item.reason}${item.discardedAt === undefined ? "" : ` - ${formatDateTime(item.discardedAt)}`}`}
            tone="warning"
          />
        ))}
      </FunnelSection>
      <FunnelSection
        title="Fechamentos com pendencias"
        count={projection.pendingShiftCloses.length}
      >
        {projection.pendingShiftCloses.map((item) => (
          <FunnelRow
            key={item.closureId}
            title={item.label}
            detail={`${item.blockerCount} bloqueio(s) para revisar`}
            tone="critical"
          />
        ))}
      </FunnelSection>
      <FunnelSection title="Historico resolvido" count={projection.resolvedHistory.length}>
        {projection.resolvedHistory.map((item) => (
          <FunnelRow
            key={item.taskId}
            title={item.label}
            detail={`${item.actionLabel} por ${item.actorLabel} - ${formatDateTime(item.resolvedAt)}. ${item.detail}`}
            tone="success"
          />
        ))}
      </FunnelSection>
    </div>
  );
}

function ProductDraftRow({
  canReviewProductDrafts,
  isReviewing,
  item,
  onApprove,
}: {
  canReviewProductDrafts: boolean;
  isReviewing: boolean;
  item: CommandCenterProjection["pendingProductDrafts"][number];
  onApprove: () => void;
}) {
  const similarLabel =
    item.similarCount === 0
      ? "Sem produto parecido encontrado"
      : `${item.similarCount} produto(s) parecido(s) revisado(s)`;
  const syncedLotLabel =
    item.syncedLotCount === 0
      ? "Nenhum lote ativo ligado a este cadastro"
      : `${item.syncedLotCount} ${item.syncedLotCount === 1 ? "lote sincronizado" : "lotes sincronizados"}`;
  const impactLabel =
    item.syncedLotCount === 0
      ? "Impacto: cadastro pendente; registre ou confira o lote fisico."
      : "Impacto: lote ja aparece na operacao; falta validar o cadastro do produto.";

  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1">
          <span className="font-medium">{item.label}</span>
          <span className="text-sm leading-5 text-muted-foreground">
            Criado por {item.requestedByLabel} em {formatDateTime(item.createdAt)}
          </span>
        </div>
        <Badge className="w-fit" tone="warning">
          Revisao central
        </Badge>
      </div>
      <div className="grid gap-2 text-sm leading-5 text-muted-foreground sm:grid-cols-3">
        <span>{similarLabel}</span>
        <span>{syncedLotLabel}</span>
        <span>Status: {productDraftStatusLabel(item.reviewStatus)}</span>
      </div>
      <p className="text-sm leading-5 text-muted-foreground">{impactLabel}</p>
      <p className="text-sm leading-5">{item.detail}</p>
      {canReviewProductDrafts ? (
        <div className="flex flex-wrap gap-2">
          <Button
            aria-label={`Aprovar produto ${item.label}`}
            disabled={isReviewing}
            size="sm"
            type="button"
            onClick={onApprove}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {isReviewing ? "Validando..." : "Aprovar produto"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FunnelSection({
  children,
  count,
  title,
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold leading-6">{title}</h2>
        <Badge tone={count === 0 ? "success" : "warning"}>{count}</Badge>
      </div>
      {count === 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">Nada pendente nesta leitura.</p>
      ) : (
        <div className="grid gap-2">{children}</div>
      )}
    </section>
  );
}

function FunnelRow({ detail, title, tone }: { detail: string; title: string; tone: FunnelTone }) {
  return (
    <div className="grid gap-1 rounded-md border border-border bg-background p-3">
      <span className="font-medium">{title}</span>
      <span className="text-sm leading-5 text-muted-foreground">{detail}</span>
      <Badge className="w-fit" tone={tone}>
        {tone === "critical" ? "Revisar agora" : tone === "warning" ? "Pendente" : "Confirmado"}
      </Badge>
    </div>
  );
}

function AuditActionButton({
  canOpenAudit,
  onOpenAudit,
}: {
  canOpenAudit: boolean;
  onOpenAudit?: () => void;
}) {
  return (
    <Button
      className="min-h-12 w-fit"
      disabled={!canOpenAudit || onOpenAudit === undefined}
      variant="outline"
      aria-label={
        canOpenAudit ? "Abrir auditoria operacional" : "Auditoria bloqueada para este papel"
      }
      onClick={onOpenAudit}
    >
      <Search className="size-4" aria-hidden="true" />
      {canOpenAudit ? "Abrir auditoria" : "Auditoria bloqueada"}
    </Button>
  );
}

function OperacaoSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Carregando Operacao">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}

function verdictClassName(state: CommandCenterProjection["verdict"]["state"]): string {
  if (state === "blocked")
    return "grid gap-3 rounded-lg border border-critical-border bg-critical-surface p-4";
  if (state === "safe") return "grid gap-3 rounded-lg border border-border bg-accent p-4";
  return "grid gap-3 rounded-lg border border-warning-border bg-warning p-4";
}

function verdictTone(
  state: CommandCenterProjection["verdict"]["state"],
): "success" | "warning" | "critical" {
  return state === "safe" ? "success" : state === "blocked" ? "critical" : "warning";
}

function verdictLabel(state: CommandCenterProjection["verdict"]["state"]): string {
  return state === "safe" ? "Segura" : state === "blocked" ? "Bloqueada" : "Conferencia necessaria";
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function productDraftStatusLabel(
  status: CommandCenterProjection["pendingProductDrafts"][number]["reviewStatus"],
): string {
  if (status === "rejected") return "reprovado";
  if (status === "discarded") return "descartado";
  return "pendente";
}
