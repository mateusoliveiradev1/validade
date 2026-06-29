import * as React from "react";
import {
  PILOT_UAT_STEP_IDS,
  type CommandCenterProjection,
  type SafePushTestResult,
} from "@validade-zero/contracts";
import { BellRing, RefreshCw, Search, Smartphone } from "lucide-react";
import type { WebFetcher } from "../auth/authenticated-fetch";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import type { AppRoute } from "../shell/AppShell";
import { createFetchCommandCenterClient, type CommandCenterClient } from "./command-center-client";

type CommandCenterStatus = "loading" | "ready" | "error";
type CommandCenterRoute = Extract<AppRoute, "operacao" | "aparelhos" | "atualizacoes" | "validacao">;

export function CommandCenter({
  activeRoute = "operacao",
  canOpenAudit,
  canSendPilotPushTest,
  client: providedClient,
  fetcher,
  onOpenAparelhos,
  onOpenAudit,
  storeId,
}: {
  activeRoute?: CommandCenterRoute;
  canOpenAudit?: boolean;
  canSendPilotPushTest?: boolean;
  client?: CommandCenterClient;
  fetcher?: WebFetcher;
  onOpenAparelhos?: () => void;
  onOpenAudit?: () => void;
  storeId: string;
}) {
  const defaultClient = React.useMemo(() => createFetchCommandCenterClient(fetcher), [fetcher]);
  const client = providedClient ?? defaultClient;
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

  const sendSafePushTest = React.useCallback(
    async (device: CommandCenterProjection["devices"][number]) => {
      const result = await client.sendSafePushTest({
        storeId,
        deviceIdMasked: device.deviceIdMasked,
        deviceLabel: device.deviceLabel,
      });

      setProjection((current) =>
        current === undefined ? current : appendSafePushTestResult(current, result),
      );
      setLastClientRefreshAt(new Date());
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
          activeRoute={activeRoute}
          canOpenAudit={canOpenAudit ?? onOpenAudit !== undefined}
          canSendPilotPushTest={canSendPilotPushTest === true}
          {...(onOpenAparelhos === undefined ? {} : { onOpenAparelhos })}
          {...(onOpenAudit === undefined ? {} : { onOpenAudit })}
          onSendSafePushTest={sendSafePushTest}
          projection={current}
        />
      )}
    </section>
  );
}

function CommandCenterProjectionView({
  activeRoute,
  canOpenAudit,
  canSendPilotPushTest,
  onOpenAparelhos,
  onOpenAudit,
  onSendSafePushTest,
  projection,
}: {
  activeRoute: CommandCenterRoute;
  canOpenAudit: boolean;
  canSendPilotPushTest: boolean;
  onOpenAparelhos?: () => void;
  onOpenAudit?: () => void;
  onSendSafePushTest: (device: CommandCenterProjection["devices"][number]) => Promise<void>;
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

      {activeRoute === "operacao" && onOpenAparelhos !== undefined ? (
        <Button className="min-h-12 w-fit" variant="outline" onClick={onOpenAparelhos}>
          <Smartphone className="size-4" aria-hidden="true" />
          Abrir Aparelhos
        </Button>
      ) : null}

      <CentralSnapshotPanel snapshot={projection.centralSnapshot} />

      <DeviceReadinessPanel
        canSendPilotPushTest={canSendPilotPushTest}
        devices={projection.devices}
        onSendSafePushTest={onSendSafePushTest}
      />

      <PilotUatPanel checklist={projection.pilotUat} />

      <PilotBlockersPanel blockers={projection.pilotBlockers} />

      <CommandCenterInsightPanel
        canOpenAudit={canOpenAudit}
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
        <AuditActionButton
          canOpenAudit={canOpenAudit}
          {...(onOpenAudit === undefined ? {} : { onOpenAudit })}
        />
      </div>
    </div>
  );
}

function PilotBlockersPanel({ blockers }: { blockers: CommandCenterProjection["pilotBlockers"] }) {
  const sorted = [...blockers].sort(comparePilotBlockers);
  const criticalCount = blockers.filter((blocker) => blocker.severity === "critical").length;
  const externalCount = blockers.filter((blocker) => blocker.severity === "external").length;
  const warningCount = blockers.filter((blocker) => blocker.severity === "warning").length;

  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="Bloqueios do piloto"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Bloqueios do piloto</p>
          <h2 className="text-xl font-semibold leading-6">O que impede o go/no-go</h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            Consolida aparelho, build, push, UAT, catalogo, sync e fechamento. Um veredito seguro da
            area nao esconde bloqueios de rollout.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={criticalCount === 0 ? "success" : "critical"}>
            {criticalCount} critico(s)
          </Badge>
          <Badge tone={externalCount === 0 ? "success" : "warning"}>
            {externalCount} externo(s)
          </Badge>
          <Badge tone={warningCount === 0 ? "success" : "warning"}>{warningCount} atencao</Badge>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-md border border-border bg-accent/10 p-3 text-sm leading-5">
          Nenhum bloqueio de piloto esta registrado nesta leitura. Ainda assim, rollout exige
          evidencia Android/provider/camera/UAT aprovada quando essas etapas estiverem no escopo.
        </div>
      ) : (
        <div className="grid">
          {sorted.map((blocker) => (
            <div
              key={blocker.blockerId}
              className="grid gap-2 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid min-w-0 gap-1">
                  <p className="font-medium">{blocker.label}</p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {pilotBlockerCategoryLabel(blocker.category)} -{" "}
                    {pilotBlockerOwnershipLabel(blocker.ownership)}
                  </p>
                </div>
                <Badge tone={pilotBlockerTone(blocker.severity)}>
                  {pilotBlockerSeverityLabel(blocker.severity)}
                </Badge>
              </div>
              <p className="text-sm leading-5">
                <span className="font-medium">Causa: </span>
                {blocker.cause}
              </p>
              <p className="text-sm leading-5">
                <span className="font-medium">Agora: </span>
                {blocker.nextAction}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-5 text-muted-foreground">
                {blocker.affectedLabel === undefined ? null : (
                  <span>Afeta: {blocker.affectedLabel}</span>
                )}
                {blocker.evidenceReferenceLabel === undefined ? null : (
                  <span>Evidencia: {blocker.evidenceReferenceLabel}</span>
                )}
                <span>Atualizado: {formatDateTime(blocker.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PilotUatPanel({ checklist }: { checklist: CommandCenterProjection["pilotUat"] }) {
  const orderedSteps = [...checklist.steps].sort(
    (left, right) => uatStepOrder(left.stepId) - uatStepOrder(right.stepId),
  );
  const nextStep = orderedSteps.find((step) => step.state !== "passed");
  const passedCount = checklist.steps.filter((step) => step.state === "passed").length;
  const blockedCount = checklist.steps.filter((step) => step.state === "blocked").length;
  const externalBlockedCount = checklist.steps.filter(
    (step) => step.state === "external_blocked",
  ).length;

  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="UAT Loja 18"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">UAT Loja 18</p>
          <h2 className="text-xl font-semibold leading-6">Checklist guiado do piloto real</h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            {checklist.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={passedCount === checklist.steps.length ? "success" : "neutral"}>
            {passedCount}/{checklist.steps.length} passou
          </Badge>
          <Badge tone={blockedCount === 0 ? "success" : "critical"}>
            {blockedCount} bloqueio(s)
          </Badge>
          <Badge tone={externalBlockedCount === 0 ? "success" : "warning"}>
            {externalBlockedCount} externo(s)
          </Badge>
        </div>
      </div>

      {nextStep === undefined ? (
        <div className="rounded-md border border-border bg-accent/10 p-3 text-sm leading-5">
          <span className="font-medium">Proximo passo: </span>
          Registrar fechamento UAT sanitizado antes de qualquer rollout.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-background p-3 text-sm leading-5">
          <span className="font-medium">Proximo passo: </span>
          {nextStep.nextAction ?? nextStep.actionLabel}
        </div>
      )}

      <div className="grid">
        {orderedSteps.map((step) => (
          <div
            key={step.stepId}
            className="grid gap-2 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="grid min-w-0 gap-1">
                <p className="font-medium">{step.label}</p>
                <p className="text-sm leading-5 text-muted-foreground">
                  {step.ownerLabel} - {step.actionLabel}
                </p>
              </div>
              <Badge tone={uatStepTone(step.state)}>{uatStepStateLabel(step.state)}</Badge>
            </div>
            {step.operatorNote === undefined ? null : (
              <p className="text-sm leading-5 text-muted-foreground">{step.operatorNote}</p>
            )}
            {step.cause === undefined ? null : (
              <p className="text-sm leading-5">
                <span className="font-medium">Causa: </span>
                {step.cause}
              </p>
            )}
            {step.nextAction === undefined ? null : (
              <p className="text-sm leading-5">
                <span className="font-medium">Agora: </span>
                {step.nextAction}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-5 text-muted-foreground">
              <span>Evidencia: {step.evidenceReferenceLabel ?? "Aguardando registro seguro"}</span>
              <span>Atualizado: {formatDateTime(step.updatedAt)}</span>
              {step.occurredAt === undefined ? null : (
                <span>Passou: {formatDateTime(step.occurredAt)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeviceReadinessPanel({
  canSendPilotPushTest,
  devices,
  onSendSafePushTest,
}: {
  canSendPilotPushTest: boolean;
  devices: CommandCenterProjection["devices"];
  onSendSafePushTest: (device: CommandCenterProjection["devices"][number]) => Promise<void>;
}) {
  const [pendingDeviceId, setPendingDeviceId] = React.useState<string>();
  const [failedDeviceId, setFailedDeviceId] = React.useState<string>();
  const sortedDevices = [...devices].sort(compareDeviceReadiness);
  const blockedCount = devices.filter((device) => device.verdict === "bloqueado").length;
  const attentionCount = devices.filter((device) => device.verdict === "atencao").length;
  const aptCount = devices.filter((device) => device.verdict === "apto").length;

  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="Aparelhos do piloto"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Aparelhos do piloto</p>
          <h2 className="text-xl font-semibold leading-6">Prontidao por aparelho autorizado</h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            Mostra ultima abertura, sync e leitura central. Isto nao e presenca ao vivo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={blockedCount === 0 ? "success" : "critical"}>
            {blockedCount} bloqueado(s)
          </Badge>
          <Badge tone={attentionCount === 0 ? "success" : "warning"}>
            {attentionCount} atencao
          </Badge>
          <Badge tone={aptCount === 0 ? "warning" : "success"}>{aptCount} apto(s)</Badge>
        </div>
      </div>

      {sortedDevices.length === 0 ? (
        <div className="grid gap-2 rounded-md border border-dashed border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold">Nenhum aparelho aprovado apareceu nesta loja.</p>
          </div>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            Entre no APK de staging com convite ativo, abra Preparar turno e volte aqui para validar
            permissao, build e leitura central.
          </p>
          <Button className="min-h-12 w-fit" disabled variant="outline">
            <BellRing className="size-4" aria-hidden="true" />
            Teste seguro indisponivel
          </Button>
          <p className="text-sm leading-5 text-muted-foreground">
            O teste seguro exige um aparelho registrado aparecendo nesta loja; ele nao resolve
            tarefa nem prova area segura.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {sortedDevices.map((device) => {
            const disabledReason = pushTestDisabledReason({
              canSendPilotPushTest,
              device,
            });
            const isSending = pendingDeviceId === device.deviceIdMasked;

            return (
              <article
                key={`${device.storeId}:${device.deviceIdMasked}:${device.updatedAt}`}
                className="grid gap-3 rounded-md border border-border bg-background p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <h3 className="font-semibold leading-5">{device.deviceLabel}</h3>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {device.activeUserLabel} - {device.storeName}
                    </p>
                  </div>
                  <Badge tone={deviceVerdictTone(device.verdict)}>
                    {deviceVerdictLabel(device.verdict)}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-start gap-3 rounded-md border border-border bg-card p-3">
                  <Button
                    className="min-h-11"
                    disabled={disabledReason !== undefined || isSending}
                    title={disabledReason}
                    variant="outline"
                    onClick={() => {
                      setFailedDeviceId(undefined);
                      setPendingDeviceId(device.deviceIdMasked);
                      void onSendSafePushTest(device)
                        .catch(() => {
                          setFailedDeviceId(device.deviceIdMasked);
                        })
                        .finally(() => {
                          setPendingDeviceId((current) =>
                            current === device.deviceIdMasked ? undefined : current,
                          );
                        });
                    }}
                  >
                    <BellRing className="size-4" aria-hidden="true" />
                    {isSending ? "Enviando teste..." : "Enviar teste seguro"}
                  </Button>
                  <div className="grid min-w-0 flex-1 gap-1 text-sm leading-5">
                    <p className="font-medium">Canal de lembrete, nao execucao fisica.</p>
                    <p className="text-muted-foreground">
                      O teste nao resolve tarefa, nao prova area segura e valida apenas o lembrete.
                    </p>
                    {disabledReason === undefined ? null : (
                      <p className="text-muted-foreground">{disabledReason}</p>
                    )}
                    {failedDeviceId === device.deviceIdMasked ? (
                      <p className="text-destructive">
                        Teste nao enviado. Recarregue o Command Center e tente novamente.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2 text-sm leading-5 text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                  <p className="flex flex-wrap items-center gap-2">
                    <span>
                      <span className="font-medium text-foreground">Build: </span>
                      {device.appVersion} ({device.appBuild})
                    </span>
                    <Badge tone={buildCompatibilityTone(device.buildCompatibility)}>
                      {buildCompatibilityLabel(device.buildCompatibility)}
                    </Badge>
                  </p>
                  <p>
                    <span className="font-medium text-foreground">APK aprovado: </span>
                    {device.approvedArtifactLabel} ({device.approvedAppVersion}/
                    {device.approvedBuild})
                  </p>
                  <p>
                    <span className="font-medium text-foreground">API: </span>
                    {device.environment} - {device.apiTarget}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Ultimo foreground: </span>
                    {optionalDateLabel(device.lastForegroundAt)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Ultima leitura central: </span>
                    {optionalDateLabel(device.lastCentralReadAt)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Ultimo sync: </span>
                    {optionalDateLabel(device.lastSyncAt)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Push: </span>
                    {pushStateLabel(device.pushPermission, device.pushProviderState)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Camera: </span>
                    {permissionLabel(device.cameraPermission)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Debug seguro: </span>
                    {device.deviceIdMasked}
                  </p>
                </div>

                {device.blockers.length === 0 ? (
                  <p className="text-sm leading-5 text-muted-foreground">{device.nextAction}</p>
                ) : (
                  <div className="grid gap-2 border-t border-border pt-3">
                    {device.blockers.map((blocker) => (
                      <div key={`${device.deviceIdMasked}:${blocker.code}`} className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={blocker.severity === "blocking" ? "critical" : "warning"}>
                            {blocker.severity === "blocking" ? "Bloqueia" : "Atencao"}
                          </Badge>
                          <p className="font-medium">{blocker.label}</p>
                        </div>
                        <p className="text-sm leading-5 text-muted-foreground">{blocker.detail}</p>
                        <p className="text-sm leading-5">
                          <span className="font-medium">Agora: </span>
                          {blocker.nextAction}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <PushTestTimeline pushTests={device.pushTests ?? []} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PushTestTimeline({
  pushTests,
}: {
  pushTests: NonNullable<CommandCenterProjection["devices"][number]["pushTests"]>;
}) {
  const sorted = [...pushTests].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );

  if (sorted.length === 0) return null;

  return (
    <div className="grid gap-2 border-t border-border pt-3" aria-label="Timeline de teste seguro">
      <div className="grid gap-1">
        <p className="font-medium">Timeline do teste seguro de push</p>
        <p className="text-sm leading-5 text-muted-foreground">
          Nao resolve tarefa, nao prova area segura; valida apenas o canal de lembrete.
        </p>
      </div>
      {sorted.map((item) => (
        <div key={item.eventId} className="grid gap-1 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{pushTestStateLabel(item.state)}</p>
            <Badge tone={pushTestStateTone(item.state)}>{pushTestStateBadge(item.state)}</Badge>
          </div>
          <p className="text-sm leading-5 text-muted-foreground">
            Solicitado por {item.requesterLabel} - {formatDateTime(item.occurredAt)}
          </p>
          <div className="grid gap-1 text-sm leading-5 text-muted-foreground md:grid-cols-3">
            <p>
              <span className="font-medium text-foreground">Permissao: </span>
              {pushPermissionOutcomeLabel(item.permissionOutcome)}
            </p>
            <p>
              <span className="font-medium text-foreground">Provider: </span>
              {pushProviderOutcomeLabel(item.providerOutcome)}
            </p>
            <p>
              <span className="font-medium text-foreground">Abertura: </span>
              {pushAppSignalLabel(item.appSignal)}
            </p>
          </div>
          <p className="text-sm leading-5">{item.detail}</p>
          <p className="text-sm leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">Agora: </span>
            {item.nextAction}
          </p>
        </div>
      ))}
    </div>
  );
}

function CentralSnapshotPanel({
  snapshot,
}: {
  snapshot: CommandCenterProjection["centralSnapshot"];
}) {
  const syncIssueCount = snapshot.conflictCount + snapshot.discardedActionCount;
  const noCentralLots = snapshot.lotCount === 0;
  const tone = centralSnapshotTone(snapshot);

  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="Foto da central"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Foto da central</p>
          <h2 className="text-xl font-semibold leading-6">
            {noCentralLots ? "Nenhum lote salvo na central" : "Dados centrais recebidos"}
          </h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            {noCentralLots
              ? "Outro aparelho que abrir esta loja agora tambem vera 0 lotes, porque a central nao tem lote salvo para esta loja."
              : "Estes numeros vieram da leitura central usada pelo Command Center, nao de dados locais do navegador."}
          </p>
        </div>
        <Badge tone={tone}>{centralSnapshotStatusLabel(snapshot)}</Badge>
      </div>

      <div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2 xl:grid-cols-4">
        <CentralSnapshotMetric
          label="Produtos"
          value={countLabel(snapshot.productCount, "produto central", "produtos centrais")}
          detail={countLabel(
            snapshot.draftProductCount,
            "produto em rascunho",
            "produtos em rascunho",
          )}
        />
        <CentralSnapshotMetric
          label="Lotes"
          value={countLabel(snapshot.lotCount, "lote central", "lotes centrais")}
          detail={
            noCentralLots
              ? "Nenhum lote central disponivel para sincronizar."
              : "Lotes que realmente chegaram na central."
          }
        />
        <CentralSnapshotMetric
          label="Tarefas"
          value={countLabel(snapshot.activeTaskCount, "tarefa ativa", "tarefas ativas")}
          detail={`${countLabel(snapshot.resolvedHistoryCount, "resolucao central", "resolucoes centrais")} no historico`}
        />
        <CentralSnapshotMetric
          label="Sync"
          value={countLabel(syncIssueCount, "pendencia de sync", "pendencias de sync")}
          detail={`${countLabel(snapshot.pendingCommandCount, "comando local pendente", "comandos locais pendentes")} informado pelo leitor`}
        />
      </div>

      <div className="grid gap-2 text-sm leading-5 text-muted-foreground md:grid-cols-3">
        <p>
          <span className="font-medium text-foreground">Origem: </span>
          {centralSourceLabel(snapshot.source)}
        </p>
        <p>
          <span className="font-medium text-foreground">Cache: </span>
          {cacheStateLabel(snapshot.cacheState)}
        </p>
        <p>
          <span className="font-medium text-foreground">Ultima leitura: </span>
          {snapshot.lastCentralReadAt === undefined
            ? "sem leitura central confirmada"
            : formatDateTime(snapshot.lastCentralReadAt)}
        </p>
      </div>

      {snapshot.blockers.length === 0 ? null : (
        <div className="grid gap-2 border-t border-border pt-3">
          <p className="text-sm font-medium">Bloqueios declarados pela central</p>
          <ul className="grid gap-1 text-sm leading-5 text-muted-foreground">
            {snapshot.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
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
  canOpenAudit,
  insight,
  onOpenAudit,
}: {
  canOpenAudit: boolean;
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
        canOpenAudit={canOpenAudit}
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
  canOpenAudit,
  lots,
  onOpenAudit,
}: {
  canOpenAudit: boolean;
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

      <AuditActionButton
        canOpenAudit={canOpenAudit}
        label="Abrir auditoria para investigar causa"
        {...(onOpenAudit === undefined ? {} : { onOpenAudit })}
      />
    </section>
  );
}

function AuditActionButton({
  canOpenAudit,
  label = "Abrir investigacao na auditoria",
  onOpenAudit,
}: {
  canOpenAudit: boolean;
  label?: string;
  onOpenAudit?: () => void;
}) {
  if (onOpenAudit === undefined) return null;

  return (
    <Button
      className="min-h-12 w-fit"
      disabled={!canOpenAudit}
      title={canOpenAudit ? undefined : "Auditoria operacional exige lideranca ativa nesta loja."}
      variant="outline"
      onClick={canOpenAudit ? onOpenAudit : undefined}
    >
      <Search className="size-4" aria-hidden="true" />
      {canOpenAudit ? label : "Auditoria bloqueada para este papel"}
    </Button>
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

function centralSnapshotTone(
  snapshot: CommandCenterProjection["centralSnapshot"],
): "success" | "warning" | "critical" {
  if (
    snapshot.readiness === "blocked" ||
    snapshot.activeTaskCount > 0 ||
    snapshot.conflictCount > 0 ||
    snapshot.discardedActionCount > 0
  ) {
    return "critical";
  }

  if (
    snapshot.source !== "central" ||
    snapshot.cacheState !== "ready" ||
    snapshot.lotCount === 0 ||
    snapshot.draftProductCount > 0 ||
    snapshot.pendingCommandCount > 0 ||
    snapshot.blockers.length > 0
  ) {
    return "warning";
  }

  return "success";
}

function centralSnapshotStatusLabel(snapshot: CommandCenterProjection["centralSnapshot"]): string {
  if (snapshot.lotCount === 0) return "Sem lote central";
  if (snapshot.readiness === "blocked") return "Central bloqueada";
  if (snapshot.cacheState !== "ready" || snapshot.source !== "central") return "Leitura incompleta";
  if (snapshot.readiness === "needs_review" || snapshot.draftProductCount > 0) {
    return "Conferencia necessaria";
  }
  return "Central atual";
}

function centralSourceLabel(source: CommandCenterProjection["centralSnapshot"]["source"]): string {
  if (source === "central") return "leitura central";
  if (source === "local_cache") return "cache local";
  return "pendente de central";
}

function cacheStateLabel(state: CommandCenterProjection["centralSnapshot"]["cacheState"]): string {
  if (state === "ready") return "pronto";
  if (state === "stale") return "desatualizado";
  if (state === "unavailable") return "indisponivel";
  return "aguardando primeira leitura central";
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function compareDeviceReadiness(
  left: CommandCenterProjection["devices"][number],
  right: CommandCenterProjection["devices"][number],
): number {
  const rank: Record<CommandCenterProjection["devices"][number]["verdict"], number> = {
    bloqueado: 0,
    atencao: 1,
    apto: 2,
  };
  const verdictDiff = rank[left.verdict] - rank[right.verdict];
  if (verdictDiff !== 0) return verdictDiff;
  return right.updatedAt.localeCompare(left.updatedAt);
}

function pushTestDisabledReason(input: {
  canSendPilotPushTest: boolean;
  device: CommandCenterProjection["devices"][number];
}): string | undefined {
  if (!input.canSendPilotPushTest) {
    return "Teste seguro exige lideranca/admin ativo nesta loja.";
  }

  const lacksConfirmedScope = input.device.blockers.some(
    (blocker) =>
      blocker.code === "invalid_store_or_user" || blocker.code === "missing_first_central_read",
  );
  if (lacksConfirmedScope) {
    return "Aparelho precisa confirmar usuario, loja e leitura central antes do teste seguro.";
  }

  return undefined;
}

function deviceVerdictTone(
  verdict: CommandCenterProjection["devices"][number]["verdict"],
): "success" | "warning" | "critical" {
  if (verdict === "bloqueado") return "critical";
  if (verdict === "atencao") return "warning";
  return "success";
}

function deviceVerdictLabel(
  verdict: CommandCenterProjection["devices"][number]["verdict"],
): string {
  if (verdict === "bloqueado") return "Bloqueado";
  if (verdict === "atencao") return "Atencao";
  return "Apto";
}

function uatStepOrder(stepId: CommandCenterProjection["pilotUat"]["steps"][number]["stepId"]) {
  const index = PILOT_UAT_STEP_IDS.indexOf(stepId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function uatStepTone(
  state: CommandCenterProjection["pilotUat"]["steps"][number]["state"],
): "success" | "warning" | "critical" | "neutral" {
  if (state === "passed") return "success";
  if (state === "blocked") return "critical";
  if (state === "external_blocked") return "warning";
  return "neutral";
}

function uatStepStateLabel(
  state: CommandCenterProjection["pilotUat"]["steps"][number]["state"],
): string {
  if (state === "passed") return "Passou";
  if (state === "blocked") return "Bloqueado";
  if (state === "external_blocked") return "Bloqueio externo";
  return "Pendente";
}

function comparePilotBlockers(
  left: CommandCenterProjection["pilotBlockers"][number],
  right: CommandCenterProjection["pilotBlockers"][number],
): number {
  const rank: Record<CommandCenterProjection["pilotBlockers"][number]["severity"], number> = {
    critical: 0,
    external: 1,
    warning: 2,
  };
  const severityDiff = rank[left.severity] - rank[right.severity];
  if (severityDiff !== 0) return severityDiff;
  return left.category.localeCompare(right.category);
}

function pilotBlockerTone(
  severity: CommandCenterProjection["pilotBlockers"][number]["severity"],
): "success" | "warning" | "critical" | "neutral" {
  if (severity === "critical") return "critical";
  if (severity === "external") return "warning";
  return "neutral";
}

function pilotBlockerSeverityLabel(
  severity: CommandCenterProjection["pilotBlockers"][number]["severity"],
): string {
  if (severity === "critical") return "Critico";
  if (severity === "external") return "Externo";
  return "Atencao";
}

function pilotBlockerOwnershipLabel(
  ownership: CommandCenterProjection["pilotBlockers"][number]["ownership"],
): string {
  if (ownership === "repo") return "corrigir no repo";
  if (ownership === "external") return "depende de prova externa";
  return "acao da operacao";
}

function pilotBlockerCategoryLabel(
  category: CommandCenterProjection["pilotBlockers"][number]["category"],
): string {
  if (category === "device") return "Aparelho";
  if (category === "membership") return "Acesso/loja";
  if (category === "sync") return "Sincronizacao";
  if (category === "push") return "Push";
  if (category === "camera") return "Camera";
  if (category === "build") return "Build";
  if (category === "product_review") return "Catalogo";
  if (category === "shift_close") return "Fechamento";
  if (category === "evidence") return "Evidencia";
  return "UAT";
}

function buildCompatibilityTone(
  state: CommandCenterProjection["devices"][number]["buildCompatibility"],
): "success" | "warning" | "critical" {
  if (state === "atual") return "success";
  if (state === "incompativel") return "critical";
  return "warning";
}

function buildCompatibilityLabel(
  state: CommandCenterProjection["devices"][number]["buildCompatibility"],
): string {
  if (state === "atual") return "APK aprovado";
  if (state === "desatualizado") return "Build antigo";
  if (state === "incompativel") return "Build incompativel";
  return "Build desconhecido";
}

function permissionLabel(
  permission: CommandCenterProjection["devices"][number]["cameraPermission"],
): string {
  if (permission === "granted") return "permitida";
  if (permission === "denied") return "negada";
  if (permission === "not_requested") return "nao solicitada";
  return "desconhecida";
}

function pushStateLabel(
  permission: CommandCenterProjection["devices"][number]["pushPermission"],
  provider: CommandCenterProjection["devices"][number]["pushProviderState"],
): string {
  const permissionText = permissionLabel(permission);

  if (provider === "remote_ready") return `${permissionText}, remoto pronto`;
  if (provider === "token_registered") return `${permissionText}, token aceito`;
  if (provider === "token_invalid") return `${permissionText}, token invalido`;
  if (provider === "provider_failed") return `${permissionText}, provedor falhou`;
  if (provider === "local_only") return `${permissionText}, apenas local`;
  if (provider === "not_configured") return `${permissionText}, provedor nao configurado`;
  return `${permissionText}, provedor desconhecido`;
}

function pushTestStateTone(
  state: NonNullable<CommandCenterProjection["devices"][number]["pushTests"]>[number]["state"],
): "success" | "warning" | "critical" {
  if (state === "provider_accepted" || state === "opened") return "success";
  if (state === "provider_failed" || state === "token_invalid") return "critical";
  return "warning";
}

function pushTestStateBadge(
  state: NonNullable<CommandCenterProjection["devices"][number]["pushTests"]>[number]["state"],
): string {
  if (state === "provider_accepted") return "Provider aceitou";
  if (state === "provider_failed") return "Provider falhou";
  if (state === "token_invalid") return "Token invalido";
  if (state === "permission_denied") return "Permissao negada";
  if (state === "local_only") return "Apenas local";
  if (state === "opened") return "Aberto no app";
  return "Sem sinal";
}

function pushTestStateLabel(
  state: NonNullable<CommandCenterProjection["devices"][number]["pushTests"]>[number]["state"],
): string {
  if (state === "provider_accepted") return "Lembrete aceito pelo provider";
  if (state === "provider_failed") return "Lembrete recusado pelo provider";
  if (state === "token_invalid") return "Canal do aparelho invalido";
  if (state === "permission_denied") return "Permissao de push bloqueada";
  if (state === "local_only") return "Aparelho operando apenas com lembrete local";
  if (state === "opened") return "Abertura confirmada no app";
  return "Teste sem sinal confiavel";
}

function pushPermissionOutcomeLabel(
  outcome: NonNullable<
    CommandCenterProjection["devices"][number]["pushTests"]
  >[number]["permissionOutcome"],
): string {
  if (outcome === "granted") return "permitida";
  if (outcome === "denied") return "negada";
  if (outcome === "not_requested") return "nao solicitada";
  return "desconhecida";
}

function pushProviderOutcomeLabel(
  outcome: NonNullable<
    CommandCenterProjection["devices"][number]["pushTests"]
  >[number]["providerOutcome"],
): string {
  if (outcome === "accepted") return "aceitou envio";
  if (outcome === "failed") return "falhou";
  if (outcome === "token_invalid") return "token invalido";
  if (outcome === "not_configured") return "nao configurado";
  if (outcome === "not_attempted") return "nao tentado";
  return "desconhecido";
}

function pushAppSignalLabel(
  signal: NonNullable<CommandCenterProjection["devices"][number]["pushTests"]>[number]["appSignal"],
): string {
  if (signal === "received") return "recebido";
  if (signal === "opened") return "aberto";
  if (signal === "not_seen") return "nao visto";
  return "sem sinal";
}

function appendSafePushTestResult(
  projection: CommandCenterProjection,
  result: SafePushTestResult,
): CommandCenterProjection {
  return {
    ...projection,
    devices: projection.devices.map((device) => {
      const nextItems = result.timeline.filter(
        (item) => item.deviceIdMasked === device.deviceIdMasked,
      );

      if (nextItems.length === 0) return device;

      return {
        ...device,
        pushTests: [...(device.pushTests ?? []), ...nextItems].slice(-10),
      };
    }),
  };
}

function optionalDateLabel(value: string | undefined): string {
  return value === undefined ? "sem registro" : formatDateTime(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
