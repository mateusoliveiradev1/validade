import * as React from "react";
import type { CommandCenterProjection } from "@validade-zero/contracts";
import { RefreshCw, Search } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { createFetchCommandCenterClient, type CommandCenterClient } from "./command-center-client";

type CommandCenterStatus = "loading" | "ready" | "error";

export function CommandCenter({
  client: providedClient,
  onOpenAudit,
  storeId,
}: {
  client?: CommandCenterClient;
  onOpenAudit?: () => void;
  storeId: string;
}) {
  const clientRef = React.useRef<CommandCenterClient | undefined>(undefined);
  clientRef.current ??= createFetchCommandCenterClient();
  const client = providedClient ?? clientRef.current;
  const [status, setStatus] = React.useState<CommandCenterStatus>("loading");
  const [projection, setProjection] = React.useState<CommandCenterProjection>();
  const [lastClientRefreshAt, setLastClientRefreshAt] = React.useState<Date>();

  const load = React.useCallback(
    async (input?: { background?: boolean }) => {
      if (input?.background !== true) {
        setStatus("loading");
      }

      try {
        setProjection(await client.read({ storeId }));
        setLastClientRefreshAt(new Date());
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [client, storeId],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      void load({ background: true });
    }, 20_000);

    return () => window.clearInterval(interval);
  }, [load]);

  const isInitialLoading = status === "loading" && projection === undefined;
  const current = projection;

  return (
    <section className="grid gap-6" aria-labelledby="command-center-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-primary">Command Center da loja piloto</p>
          <h1 id="command-center-heading" className="text-[28px] font-semibold leading-[34px]">
            Area de venda segura agora?
          </h1>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Acompanhe somente os riscos e comprovacoes registrados pela operacao da loja.
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
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {status === "loading" ? "Atualizando..." : "Atualizar agora"}
        </Button>
      </div>

      {isInitialLoading ? <CommandCenterSkeleton /> : null}

      {status === "error" ? (
        <div
          className="grid gap-3 rounded-lg border border-critical-border bg-critical-surface p-4"
          role="alert"
        >
          <div className="grid gap-1">
            <p className="text-base font-semibold text-destructive">
              Nao foi possivel atualizar o Command Center.
            </p>
            <p className="text-sm leading-5 text-foreground">
              Os filtros anteriores continuam visiveis; tente novamente.
            </p>
          </div>
          <Button className="min-h-12 w-fit" onClick={() => void load()}>
            Tentar atualizar o Command Center
          </Button>
        </div>
      ) : null}

      {current === undefined ? null : (
        <CommandCenterProjectionView
          {...(onOpenAudit === undefined ? {} : { onOpenAudit })}
          projection={current}
        />
      )}
    </section>
  );
}

function CommandCenterProjectionView({
  onOpenAudit,
  projection,
}: {
  onOpenAudit?: () => void;
  projection: CommandCenterProjection;
}) {
  const insight = buildCommandCenterInsight(projection);
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

      <CommandCenterInsightPanel
        insight={insight}
        {...(onOpenAudit === undefined ? {} : { onOpenAudit })}
      />

      {isEmpty ? (
        <section className="grid gap-2 border-y py-6" aria-label="Sem gargalos ativos">
          <h2 className="text-xl font-semibold leading-6">Area de venda segura agora</h2>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Nenhum lote exige acao neste momento. Registre um lote novo ou confira os recentes para
            manter a operacao atualizada.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4">
        <FunnelSection title="Produtos em revisao" count={projection.pendingProductDrafts.length}>
          {projection.pendingProductDrafts.map((item) => (
            <FunnelRow
              key={item.draftId}
              title={item.label}
              detail={`${item.requestedByLabel} - ${item.detail}`}
              tone="warning"
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
            <FunnelRow
              key={item.markdownId}
              title={item.label}
              detail={item.stage}
              tone="warning"
            />
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
        <FunnelSection title="Conflitos de sincronizacao" count={projection.syncConflicts.length}>
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
        <FunnelSection title="Historico de fechamentos" count={projection.shiftHistory.length}>
          {projection.shiftHistory.map((item) => (
            <FunnelRow
              key={item.closureId}
              title={item.label}
              detail={formatDateTime(item.occurredAt)}
              tone={item.verdict === "safe" ? "success" : "warning"}
            />
          ))}
        </FunnelSection>
        {onOpenAudit === undefined ? null : (
          <Button className="min-h-12 w-fit" variant="outline" onClick={onOpenAudit}>
            Abrir investigacao na auditoria
          </Button>
        )}
      </div>
    </div>
  );
}

type InsightTone = "success" | "warning" | "critical";

interface CommandCenterInsight {
  causeBreakdown: CauseBreakdownItem[];
  decisionSteps: DecisionStep[];
  expiredLots: ExpiredLotInsight[];
  metrics: InsightMetric[];
  primaryCause: CauseBreakdownItem;
  totalBlockers: number;
}

interface CauseBreakdownItem {
  count: number;
  detail: string;
  key: string;
  label: string;
  tone: InsightTone;
}

interface DecisionStep {
  count: number;
  detail: string;
  label: string;
}

interface ExpiredLotInsight {
  action: string;
  cause: string;
  location: string;
  lotId: string;
  responsibleLabel?: string;
  sourceEventSummary?: string;
  timingLabel?: string;
  title: string;
  why: string;
}

interface InsightMetric {
  detail: string;
  label: string;
  tone: InsightTone;
  value: string;
}

function CommandCenterInsightPanel({
  insight,
  onOpenAudit,
}: {
  insight: CommandCenterInsight;
  onOpenAudit?: () => void;
}) {
  return (
    <section className="grid gap-4" aria-label="Resumo de vencimentos e causas">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-primary">Causa principal</p>
              <h2 className="text-2xl font-semibold leading-7">{insight.primaryCause.label}</h2>
            </div>
            <Badge tone={insight.primaryCause.tone}>{insight.primaryCause.count}</Badge>
          </div>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            {insight.primaryCause.detail}
          </p>
          <p className="text-sm leading-5 text-foreground">
            {insight.totalBlockers === 0
              ? "Sem gargalo ativo na leitura central. Mantenha a rotina de conferencia fisica."
              : `${insight.totalBlockers} gargalo(s) impedem um sinal verde sem revisao.`}
          </p>
        </section>

        <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Placar operacional</p>
              <h2 className="text-xl font-semibold leading-6">O que precisa de decisao</h2>
            </div>
            <Badge tone={insight.totalBlockers === 0 ? "success" : "critical"}>
              {insight.totalBlockers === 0 ? "Sem bloqueio" : "Com bloqueio"}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {insight.metrics.map((metric) => (
              <MetricTile key={metric.label} metric={metric} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <CauseBarChart items={insight.causeBreakdown} />
        <DecisionPath steps={insight.decisionSteps} />
      </div>

      <WhyExpiredPanel
        lots={insight.expiredLots}
        {...(onOpenAudit === undefined ? {} : { onOpenAudit })}
      />
    </section>
  );
}

function MetricTile({ metric }: { metric: InsightMetric }) {
  return (
    <div className="grid min-h-28 gap-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-5">{metric.label}</p>
        <Badge tone={metric.tone}>{metric.value}</Badge>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{metric.detail}</p>
    </div>
  );
}

function CauseBarChart({ items }: { items: CauseBreakdownItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-primary">Grafico de gargalos</p>
        <h2 className="text-xl font-semibold leading-6">Mapa do que travou a seguranca</h2>
      </div>
      <div className="grid gap-3" role="list" aria-label="Distribuicao de gargalos ativos">
        {items.map((item) => (
          <div key={item.key} className="grid gap-2" role="listitem">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{item.count}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              aria-label={`${item.label}: ${item.count}`}
            >
              <div
                className={`h-full rounded-full ${barClassName(item.tone)}`}
                style={{ width: `${barWidth(item.count, max)}%` }}
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DecisionPath({ steps }: { steps: DecisionStep[] }) {
  return (
    <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-primary">Leitura de causa</p>
        <h2 className="text-xl font-semibold leading-6">Do vencido ao fechamento seguro</h2>
      </div>
      <ol className="grid gap-3">
        {steps.map((step, index) => (
          <li key={step.label} className="grid grid-cols-[2.25rem_1fr] gap-3">
            <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold tabular-nums">
              {index + 1}
            </span>
            <span className="grid gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{step.label}</span>
                <Badge tone={step.count === 0 ? "success" : "warning"}>{step.count}</Badge>
              </span>
              <span className="text-sm leading-5 text-muted-foreground">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WhyExpiredPanel({
  lots,
  onOpenAudit,
}: {
  lots: ExpiredLotInsight[];
  onOpenAudit?: () => void;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Por que venceu</p>
          <h2 className="text-xl font-semibold leading-6">Causa, prova textual e proxima acao</h2>
        </div>
        <Badge tone={lots.length === 0 ? "success" : "critical"}>{lots.length}</Badge>
      </div>

      {lots.length === 0 ? (
        <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
          Nenhum lote vencido ou critico aparece na leitura central. Se a loja suspeitar de item na
          gondola, registre nova conferencia no mobile antes de fechar o turno.
        </p>
      ) : (
        <div className="grid gap-2">
          {lots.map((lot) => (
            <article key={lot.lotId} className="grid gap-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid gap-1">
                  <h3 className="font-semibold leading-5">{lot.title}</h3>
                  <p className="text-sm text-muted-foreground">{lot.location}</p>
                </div>
                <Badge tone="critical">{lot.cause}</Badge>
              </div>
              <p className="text-sm leading-5">
                <span className="font-medium">Porque: </span>
                {lot.why}
              </p>
              <p className="text-sm leading-5 text-muted-foreground">
                <span className="font-medium text-foreground">Agora: </span>
                {lot.action}
              </p>
              {lot.responsibleLabel === undefined ? null : (
                <p className="text-sm leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">Responsavel registrado: </span>
                  {lot.responsibleLabel}
                </p>
              )}
              {lot.sourceEventSummary === undefined ? null : (
                <p className="text-sm leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">Evento fonte: </span>
                  {lot.sourceEventSummary}
                </p>
              )}
              {lot.timingLabel === undefined ? null : (
                <p className="text-sm leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">Trilha: </span>
                  {lot.timingLabel}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {onOpenAudit === undefined ? null : (
        <Button className="min-h-12 w-fit" variant="outline" onClick={onOpenAudit}>
          <Search className="size-4" aria-hidden="true" />
          Abrir auditoria para investigar causa
        </Button>
      )}
    </section>
  );
}

function FunnelSection({
  children,
  count,
  title,
}: {
  children: React.ReactNode;
  count: number;
  title: string;
}) {
  return (
    <section className="grid gap-3 border-t pt-4" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold leading-6">{title}</h2>
        <Badge tone={count === 0 ? "success" : "warning"}>{count}</Badge>
      </div>
      {count === 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">
          Nenhuma pendencia registrada nesta etapa.
        </p>
      ) : (
        <div className="grid gap-2">{children}</div>
      )}
    </section>
  );
}

function FunnelRow({
  detail,
  title,
  tone,
}: {
  detail: string;
  title: string;
  tone: "success" | "warning" | "critical";
}) {
  return (
    <div className="grid gap-1 rounded-lg border border-border bg-card p-4 text-left">
      <span className="font-semibold">{title}</span>
      <span className="text-sm leading-5 text-muted-foreground">{detail}</span>
      <Badge className="w-fit" tone={tone}>
        {tone === "critical" ? "Revisar agora" : tone === "warning" ? "Pendente" : "Confirmado"}
      </Badge>
    </div>
  );
}

function buildCommandCenterInsight(projection: CommandCenterProjection): CommandCenterInsight {
  const expiredLots = projection.criticalLots.filter(isExpiredCriticalLot);
  const salesAreaLots = projection.criticalLots.filter((item) => isSalesArea(item.locationLabel));
  const shiftBlockers = projection.pendingShiftCloses.reduce(
    (total, item) => total + item.blockerCount,
    0,
  );
  const qualityExpiredLots = projection.criticalLots.filter(
    (item) => item.cause.code === "quality_window_expired",
  );
  const syncRetryLots = projection.criticalLots.filter((item) => item.cause.code === "sync_retry");
  const syncConflictLots = projection.criticalLots.filter(
    (item) => item.cause.code === "sync_conflict",
  );
  const unresolvedCriticalLots = projection.criticalLots.filter(
    (item) => item.cause.code === "critical_unresolved",
  );

  const causeBreakdown: CauseBreakdownItem[] = [
    {
      key: "expired",
      label: "Validade vencida",
      count: expiredLots.length,
      detail: "Lote aparece como vencido por prazo formal ou janela operacional.",
      tone: "critical",
    },
    {
      key: "quality-window",
      label: "Janela FLV vencida",
      count: qualityExpiredLots.length,
      detail: "Produto de inspecao perdeu a janela de qualidade registrada.",
      tone: "critical",
    },
    {
      key: "critical-lot",
      label: "Risco critico sem baixa",
      count: unresolvedCriticalLots.length,
      detail: "Lote critico ainda precisa de retirada, perda, reembalagem ou reconferencia.",
      tone: "critical",
    },
    {
      key: "overdue-task",
      label: "Tarefa atrasada",
      count: projection.overdueTasks.length,
      detail: "Responsavel ou horario de execucao ainda nao fecharam a pendencia.",
      tone: "warning",
    },
    {
      key: "markdown",
      label: "Rebaixa incompleta",
      count: projection.pendingMarkdowns.length,
      detail: "Fluxo de preco ainda nao chegou ate aplicacao ou conferencia na gondola.",
      tone: "warning",
    },
    {
      key: "evidence",
      label: "Evidencia pendente",
      count: projection.pendingEvidence.length,
      detail: "Comprovacao visual ainda nao foi aceita pela leitura central.",
      tone: "warning",
    },
    {
      key: "sync",
      label: "Sync ou conflito",
      count: syncConflictLots.length + syncRetryLots.length + projection.discardedActions.length,
      detail: "Acao offline precisa de revisao ou foi descartada pela verdade central.",
      tone: "critical",
    },
    {
      key: "shift-close",
      label: "Fechamento bloqueado",
      count: shiftBlockers,
      detail: "Bloqueios que impedem a lideranca de declarar o turno seguro.",
      tone: "critical",
    },
  ];

  const activeCause = causeBreakdown.find((item) => item.count > 0);
  const totalBlockers = causeBreakdown.reduce((total, item) => total + item.count, 0);

  return {
    causeBreakdown,
    decisionSteps: [
      {
        label: "Risco detectado",
        count: projection.criticalLots.length,
        detail: "Lotes que impedem uma leitura simples de area segura.",
      },
      {
        label: "Acao operacional",
        count: projection.overdueTasks.length + projection.pendingMarkdowns.length,
        detail: "Tarefas e rebaixas que ainda dependem de execucao no corredor.",
      },
      {
        label: "Confirmacao central",
        count:
          projection.pendingEvidence.length +
          projection.syncConflicts.length +
          projection.discardedActions.length,
        detail: "Evidencia, upload ou sync que ainda nao viraram prova confiavel.",
      },
      {
        label: "Fechamento do turno",
        count: shiftBlockers,
        detail: "Bloqueios finais que a lideranca precisa resolver ou registrar como inseguro.",
      },
    ],
    expiredLots: projection.criticalLots.map(toExpiredLotInsight),
    metrics: [
      {
        label: "Vencidos/criticos",
        value: String(projection.criticalLots.length),
        detail: "Itens que exigem decisao antes de sinal verde.",
        tone: projection.criticalLots.length === 0 ? "success" : "critical",
      },
      {
        label: "Na area de venda",
        value: String(salesAreaLots.length),
        detail: "Prioridade maxima: risco ainda pode estar na gondola.",
        tone: salesAreaLots.length === 0 ? "success" : "critical",
      },
      {
        label: "Atrasadas",
        value: String(projection.overdueTasks.length),
        detail: "Pendencias com responsavel ou prazo ja estourado.",
        tone: projection.overdueTasks.length === 0 ? "success" : "warning",
      },
      {
        label: "Bloqueios finais",
        value: String(shiftBlockers + projection.discardedActions.length),
        detail: "Fechamentos e descartes que impedem leitura simples de turno seguro.",
        tone: shiftBlockers + projection.discardedActions.length === 0 ? "success" : "critical",
      },
    ],
    primaryCause:
      activeCause ??
      ({
        key: "safe",
        label: "Sem causa ativa",
        count: 0,
        detail: "A leitura central nao encontrou vencimento, tarefa atrasada ou conflito ativo.",
        tone: "success",
      } satisfies CauseBreakdownItem),
    totalBlockers,
  };
}

function toExpiredLotInsight(
  item: CommandCenterProjection["criticalLots"][number],
): ExpiredLotInsight {
  const timingLabel = causeTimingLabel(item.cause);

  return {
    lotId: item.lotId,
    title: item.label,
    location: item.locationLabel,
    cause: item.cause.label,
    why: item.cause.detail,
    action: item.cause.actionLabel,
    ...(item.cause.responsibleLabel === undefined
      ? {}
      : { responsibleLabel: item.cause.responsibleLabel }),
    ...(item.cause.sourceEventSummary === undefined
      ? {}
      : { sourceEventSummary: item.cause.sourceEventSummary }),
    ...(timingLabel === undefined ? {} : { timingLabel }),
  };
}

function isExpiredCriticalLot(item: CommandCenterProjection["criticalLots"][number]): boolean {
  return (
    item.cause.code === "formal_expiry_passed" ||
    item.cause.code === "quality_window_expired" ||
    isExpiredReason(item.reason)
  );
}

function isExpiredReason(reason: string): boolean {
  const normalized = normalizeText(reason);
  return normalized.includes("vencid") || normalized.includes("expired");
}

function causeTimingLabel(
  cause: CommandCenterProjection["criticalLots"][number]["cause"],
): string | undefined {
  const parts = [
    cause.firstDetectedAt === undefined
      ? undefined
      : `detectado ${formatDateTime(cause.firstDetectedAt)}`,
    cause.lastObservedAt === undefined
      ? undefined
      : `observado ${formatDateTime(cause.lastObservedAt)}`,
    cause.lastAttemptedAt === undefined
      ? undefined
      : `ultima tentativa ${formatDateTime(cause.lastAttemptedAt)}`,
  ].filter((item): item is string => item !== undefined);

  return parts.length === 0 ? undefined : parts.join(" - ");
}

function isSalesArea(locationLabel: string): boolean {
  return normalizeText(locationLabel).includes("area de venda");
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function barClassName(tone: InsightTone): string {
  if (tone === "critical") return "bg-destructive";
  if (tone === "warning") return "bg-warning-border";
  return "bg-primary";
}

function barWidth(count: number, max: number): number {
  if (count === 0) return 0;
  return Math.max(10, Math.round((count / max) * 100));
}

function CommandCenterSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Carregando Command Center">
      {Array.from({ length: 5 }).map((_, index) => (
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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
