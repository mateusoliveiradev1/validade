import * as React from "react";
import type { CommandCenterProjection } from "@validade-zero/contracts";
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

  const load = React.useCallback(async () => {
    setStatus("loading");

    try {
      setProjection(await client.read({ storeId }));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [client, storeId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const isInitialLoading = status === "loading" && projection === undefined;
  const current = projection;

  return (
    <section className="grid gap-6" aria-labelledby="command-center-heading">
      <div className="grid gap-2">
        <p className="text-sm font-semibold text-primary">Command Center da loja piloto</p>
        <h1 id="command-center-heading" className="text-[28px] font-semibold leading-[34px]">
          Area de venda segura agora?
        </h1>
        <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
          Acompanhe somente os riscos e comprovacoes registrados pela operacao da loja.
        </p>
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
  const isEmpty =
    projection.verdict.state === "safe" &&
    projection.criticalLots.length === 0 &&
    projection.overdueTasks.length === 0 &&
    projection.pendingMarkdowns.length === 0 &&
    projection.pendingEvidence.length === 0 &&
    projection.syncConflicts.length === 0 &&
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
