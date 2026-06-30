import type { CommandCenterProjection } from "@validade-zero/contracts";
import { ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  deriveValidationVerdict,
  formatDateTime,
  getDiagnosticDeviceRecords,
  getOperationalTurnDevices,
  validationReferenceForBlocker,
  type ValidationRouteReferenceLabel,
} from "./command-center-view-model";

type ValidacaoStatus = "loading" | "ready" | "error";

export function ValidacaoRoute({
  lastClientRefreshAt,
  onOpenAparelhos,
  onOpenAtualizacoes,
  onOpenOperacao,
  onRefresh,
  projection,
  status,
}: {
  lastClientRefreshAt?: Date;
  onOpenAparelhos?: () => void;
  onOpenAtualizacoes?: () => void;
  onOpenOperacao?: () => void;
  onRefresh: () => void;
  projection: CommandCenterProjection | undefined;
  status: ValidacaoStatus;
}) {
  const isInitialLoading = status === "loading" && projection === undefined;

  return (
    <section className="grid gap-6" aria-labelledby="validacao-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-primary">Validacao Loja 18</p>
          <h1 id="validacao-heading" className="text-[28px] font-semibold leading-[34px]">
            Validacao
          </h1>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Consolide Go/No-Go, checklist UAT, bloqueios externos e evidencias sanitizadas sem
            duplicar a operacao diaria.
          </p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {lastClientRefreshAt === undefined
              ? "Sincronizando prova de validacao..."
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

      {isInitialLoading ? <ValidacaoSkeleton /> : null}

      {status === "error" ? (
        <div
          className="grid gap-3 rounded-lg border border-critical-border bg-critical-surface p-4"
          role="alert"
        >
          <div className="grid gap-1">
            <p className="text-base font-semibold text-destructive">
              Nao foi possivel atualizar a validacao.
            </p>
            <p className="text-sm leading-5 text-foreground">
              Use a ultima leitura apenas como pendente. Go/No-Go exige prova central atual.
            </p>
          </div>
          <Button className="min-h-12 w-fit" onClick={onRefresh}>
            Tentar atualizar agora
          </Button>
        </div>
      ) : null}

      {projection === undefined ? null : (
        <ValidacaoContent
          {...(onOpenAparelhos === undefined ? {} : { onOpenAparelhos })}
          {...(onOpenAtualizacoes === undefined ? {} : { onOpenAtualizacoes })}
          {...(onOpenOperacao === undefined ? {} : { onOpenOperacao })}
          projection={projection}
        />
      )}
    </section>
  );
}

function ValidacaoContent({
  onOpenAparelhos,
  onOpenAtualizacoes,
  onOpenOperacao,
  projection,
}: {
  onOpenAparelhos?: () => void;
  onOpenAtualizacoes?: () => void;
  onOpenOperacao?: () => void;
  projection: CommandCenterProjection;
}) {
  const verdict = deriveValidationVerdict(projection);
  const passedCount = projection.pilotUat.steps.filter((step) => step.state === "passed").length;
  const blockedCount = projection.pilotUat.steps.filter((step) => step.state === "blocked").length;
  const externalCount = projection.pilotUat.steps.filter(
    (step) => step.state === "external_blocked",
  ).length;
  const operationalDevices = getOperationalTurnDevices(projection.devices, projection.refreshedAt);
  const diagnosticDevices = getDiagnosticDeviceRecords(projection.devices, operationalDevices);

  return (
    <div className="grid gap-6">
      <section
        className={verdictClassName(verdict.tone)}
        aria-label="Veredito Go No-Go da validacao"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-primary">Go/No-Go</p>
            <h2 className="text-xl font-semibold leading-6">{verdict.label}</h2>
            <p className="max-w-[75ch] text-base leading-6">{verdict.detail}</p>
          </div>
          <Badge tone={verdict.tone}>{verdict.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>Atualizado {formatDateTime(projection.refreshedAt)}</span>
          <span>{projection.pilotUat.storeName}</span>
          <span>{projection.freshness === "stale" ? "leitura pendente" : "leitura atual"}</span>
        </div>
      </section>

      <section
        className="grid gap-4 rounded-lg border border-border bg-card p-4"
        aria-label="Resumo da UAT Loja 18"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-primary">UAT Loja 18</p>
            <h2 className="text-xl font-semibold leading-6">{projection.pilotUat.title}</h2>
            <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
              {projection.pilotUat.summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={passedCount === projection.pilotUat.steps.length ? "success" : "neutral"}>
              {passedCount}/{projection.pilotUat.steps.length} passou
            </Badge>
            <Badge tone={blockedCount === 0 ? "success" : "critical"}>
              {blockedCount} bloqueio(s)
            </Badge>
            <Badge tone={externalCount === 0 ? "success" : "warning"}>
              {externalCount} externo(s)
            </Badge>
          </div>
        </div>
        <ChecklistRows steps={projection.pilotUat.steps} />
      </section>

      <section
        className="grid gap-4 rounded-lg border border-border bg-card p-4"
        aria-label="Bloqueios externos e gates"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-primary">Gates externos</p>
            <h2 className="text-xl font-semibold leading-6">Bloqueios que seguram o rollout</h2>
            <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
              Cada linha mostra Causa, Agora, referencia segura e rota dona da acao.
            </p>
          </div>
          <Badge tone={projection.pilotBlockers.length === 0 ? "success" : "warning"}>
            {projection.pilotBlockers.length} gate(s)
          </Badge>
        </div>

        {projection.pilotBlockers.length === 0 ? (
          <p className="rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted-foreground">
            Nenhum bloqueio de rollout esta registrado nesta leitura sanitizada.
          </p>
        ) : (
          <div className="grid">
            {projection.pilotBlockers.map((blocker) => (
              <article
                key={blocker.blockerId}
                className="grid gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-1">
                    <h3 className="text-lg font-semibold leading-6">{blocker.label}</h3>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {blocker.affectedLabel ?? "Rollout Loja 18"}
                    </p>
                  </div>
                  <Badge tone={blockerTone(blocker.severity)}>
                    {blockerSeverityLabel(blocker.severity)}
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
                  {blocker.evidenceReferenceLabel === undefined ? null : (
                    <span>Evidencia: {blocker.evidenceReferenceLabel}</span>
                  )}
                  <span>Atualizado: {formatDateTime(blocker.updatedAt)}</span>
                  <span>Acao: {validationReferenceForBlocker(blocker.category)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <DeviceEvidencePanel
        devices={operationalDevices}
        diagnosticCount={diagnosticDevices.length}
      />

      <RouteReferencePanel
        {...(onOpenAparelhos === undefined ? {} : { onOpenAparelhos })}
        {...(onOpenAtualizacoes === undefined ? {} : { onOpenAtualizacoes })}
        {...(onOpenOperacao === undefined ? {} : { onOpenOperacao })}
      />
    </div>
  );
}

function ChecklistRows({ steps }: { steps: CommandCenterProjection["pilotUat"]["steps"] }) {
  return (
    <div className="grid">
      {steps.map((step) => (
        <article
          key={step.stepId}
          className="grid gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid min-w-0 gap-1">
              <h3 className="text-lg font-semibold leading-6">{step.label}</h3>
              <p className="text-sm leading-5 text-muted-foreground">{step.ownerLabel}</p>
            </div>
            <Badge tone={uatStepTone(step.state)}>{uatStepStateLabel(step.state)}</Badge>
          </div>
          <p className="text-sm leading-5">
            <span className="font-medium">Agora: </span>
            {step.nextAction ?? step.actionLabel}
          </p>
          {step.cause === undefined ? null : (
            <p className="text-sm leading-5">
              <span className="font-medium">Causa: </span>
              {step.cause}
            </p>
          )}
          {step.operatorNote === undefined ? null : (
            <p className="text-sm leading-5 text-muted-foreground">{step.operatorNote}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-5 text-muted-foreground">
            {step.evidenceReferenceLabel === undefined ? null : (
              <span>Evidencia: {step.evidenceReferenceLabel}</span>
            )}
            {step.occurredAt === undefined ? null : (
              <span>Ocorrido: {formatDateTime(step.occurredAt)}</span>
            )}
            <span>Atualizado: {formatDateTime(step.updatedAt)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function DeviceEvidencePanel({
  devices,
  diagnosticCount,
}: {
  devices: CommandCenterProjection["devices"];
  diagnosticCount: number;
}) {
  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="Referencias de aparelhos"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Evidencia sanitizada</p>
          <h2 className="text-xl font-semibold leading-6">Aparelhos confirmados na prova</h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            A validacao mostra somente id mascarado, compatibilidade, versao instalada e horarios de
            leitura dos aparelhos do turno. A etiqueta aprovada fica em Atualizacoes.
          </p>
        </div>
        <Badge tone={devices.length === 0 ? "warning" : "neutral"}>
          {devices.length} aparelho(s)
        </Badge>
      </div>

      {devices.length === 0 ? (
        <p className="rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted-foreground">
          Nenhum aparelho apareceu nesta leitura. Validacao permanece aguardando prova externa.
        </p>
      ) : (
        <div className="grid">
          {devices.map((device) => (
            <article
              key={device.deviceIdMasked}
              className="grid gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <h3 className="text-lg font-semibold leading-6">{device.deviceLabel}</h3>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {device.deviceIdMasked} - {device.activeUserLabel}
                  </p>
                </div>
                <Badge tone={device.verdict === "apto" ? "success" : "warning"}>
                  {device.verdict === "apto" ? "Apto" : "Revisar"}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm leading-5 text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                <p>
                  <span className="font-medium text-foreground">Compatibilidade: </span>
                  {buildCompatibilityLabel(device.buildCompatibility)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Instalada: </span>
                  {device.appVersion} / build {device.appBuild}
                </p>
                <p>
                  <span className="font-medium text-foreground">Leitura central: </span>
                  {device.lastCentralReadAt === undefined
                    ? "ainda nao reportada pelo APK"
                    : formatDateTime(device.lastCentralReadAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
      {diagnosticCount === 0 ? null : (
        <p className="rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted-foreground">
          {diagnosticCount} registro(s) antigo(s), duplicado(s) ou sem confirmacao foram mantidos em
          Aparelhos/Atualizacoes para suporte, mas nao contam como prova principal desta leitura.
        </p>
      )}
    </section>
  );
}

function RouteReferencePanel({
  onOpenAparelhos,
  onOpenAtualizacoes,
  onOpenOperacao,
}: {
  onOpenAparelhos?: () => void;
  onOpenAtualizacoes?: () => void;
  onOpenOperacao?: () => void;
}) {
  return (
    <section
      className="grid gap-4 rounded-lg border border-border bg-card p-4"
      aria-label="Rotas donas da acao"
    >
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-primary">Proximas acoes</p>
        <h2 className="text-xl font-semibold leading-6">Resolva na rota dona da acao</h2>
        <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
          A Validacao consolida Go/No-Go. Push, camera, autorizacao do aparelho, build e operacao
          continuam sendo corrigidos nas telas onde a evidencia nasce.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ReferenceButton
          label="Resolver push, camera ou autorizacao do aparelho em Aparelhos"
          icon="aparelhos"
          {...(onOpenAparelhos === undefined ? {} : { onClick: onOpenAparelhos })}
        />
        <ReferenceButton
          label="Resolver build em Atualizacoes"
          icon="atualizacoes"
          {...(onOpenAtualizacoes === undefined ? {} : { onClick: onOpenAtualizacoes })}
        />
        <ReferenceButton
          label="Revisar fila local, revisao de produto ou fechamento em Operacao"
          icon="operacao"
          {...(onOpenOperacao === undefined ? {} : { onClick: onOpenOperacao })}
        />
      </div>
      <div className="rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted-foreground">
        O status de validacao e calculado pela leitura central atual. Quando todos os gates forem
        resolvidos, esta tela muda para Go sem precisar registrar um status manual.
      </div>
    </section>
  );
}

function ReferenceButton({
  icon,
  label,
  onClick,
}: {
  icon: "aparelhos" | "atualizacoes" | "operacao";
  label: ValidationRouteReferenceLabel;
  onClick?: () => void;
}) {
  const Icon =
    icon === "operacao" ? ClipboardCheck : icon === "aparelhos" ? ShieldCheck : RefreshCw;

  return (
    <Button
      className="min-h-12"
      disabled={onClick === undefined}
      variant="outline"
      onClick={onClick}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

function verdictClassName(tone: "success" | "warning" | "critical"): string {
  if (tone === "critical") {
    return "grid gap-3 rounded-lg border border-critical-border bg-critical-surface p-4";
  }

  if (tone === "warning") {
    return "grid gap-3 rounded-lg border border-warning-border bg-warning p-4";
  }

  return "grid gap-3 rounded-lg border border-border bg-accent p-4";
}

function blockerTone(
  severity: CommandCenterProjection["pilotBlockers"][number]["severity"],
): "warning" | "critical" | "neutral" {
  if (severity === "critical") return "critical";
  if (severity === "external") return "warning";
  return "neutral";
}

function blockerSeverityLabel(
  severity: CommandCenterProjection["pilotBlockers"][number]["severity"],
): string {
  if (severity === "critical") return "Critico";
  if (severity === "external") return "Externo";
  return "Atencao";
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

function buildCompatibilityLabel(
  state: CommandCenterProjection["devices"][number]["buildCompatibility"],
): string {
  if (state === "atual") return "Build aprovado";
  if (state === "desatualizado") return "Build antigo";
  if (state === "incompativel") return "Build incompativel";
  return "Build desconhecido";
}

function ValidacaoSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Carregando Validacao">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}
