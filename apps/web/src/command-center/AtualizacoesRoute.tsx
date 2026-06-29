import type { CommandCenterProjection } from "@validade-zero/contracts";
import { RefreshCw } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  DEFAULT_APPROVED_ARTIFACT_LABEL,
  formatDateTime,
  resolveUpdatePathState,
  sortDevicesByBuildCompatibility,
} from "./command-center-view-model";

type AtualizacoesStatus = "loading" | "ready" | "error";

export function AtualizacoesRoute({
  lastClientRefreshAt,
  onRefresh,
  projection,
  status,
}: {
  lastClientRefreshAt?: Date;
  onRefresh: () => void;
  projection: CommandCenterProjection | undefined;
  status: AtualizacoesStatus;
}) {
  const isInitialLoading = status === "loading" && projection === undefined;

  return (
    <section className="grid gap-6" aria-labelledby="atualizacoes-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-primary">Atualizacoes do APK</p>
          <h1 id="atualizacoes-heading" className="text-[28px] font-semibold leading-[34px]">
            Atualizacoes
          </h1>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Compare a build aprovada com o que cada aparelho instalou, sem expor links privados.
          </p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {lastClientRefreshAt === undefined
              ? "Sincronizando versoes instaladas..."
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

      {isInitialLoading ? <AtualizacoesSkeleton /> : null}

      {status === "error" ? (
        <div
          className="grid gap-3 rounded-lg border border-critical-border bg-critical-surface p-4"
          role="alert"
        >
          <div className="grid gap-1">
            <p className="text-base font-semibold text-destructive">
              Nao foi possivel atualizar as versoes instaladas.
            </p>
            <p className="text-sm leading-5 text-foreground">
              Use a leitura anterior como pendente ate a central confirmar a build instalada.
            </p>
          </div>
          <Button className="min-h-12 w-fit" onClick={onRefresh}>
            Tentar atualizar agora
          </Button>
        </div>
      ) : null}

      {projection === undefined ? null : <AtualizacoesContent projection={projection} />}
    </section>
  );
}

function AtualizacoesContent({ projection }: { projection: CommandCenterProjection }) {
  const firstDevice = projection.devices[0];
  const approvedArtifactLabel =
    firstDevice?.approvedArtifactLabel ?? DEFAULT_APPROVED_ARTIFACT_LABEL;
  const approvedAppVersion = firstDevice?.approvedAppVersion ?? "0.12.0";
  const approvedBuild = firstDevice?.approvedBuild ?? "120";
  const updatePath = resolveUpdatePathState();
  const sortedDevices = sortDevicesByBuildCompatibility(projection.devices);

  return (
    <div className="grid gap-6">
      <section
        className="grid gap-4 rounded-lg border border-border bg-card p-4"
        aria-label="Build aprovada"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-primary">Build aprovada</p>
            <h2 className="text-xl font-semibold leading-6">{approvedArtifactLabel}</h2>
            <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
              Esta etiqueta publica ancora a comparacao. Ela nao e link privado, painel externo ou
              credencial.
            </p>
          </div>
          <Badge tone="success">Aprovada</Badge>
        </div>
        <div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2">
          <BuildMetric label="Versao aprovada" value={approvedAppVersion} />
          <BuildMetric label="Build aprovada" value={approvedBuild} />
        </div>
      </section>

      <section
        className="grid gap-4 rounded-lg border border-border bg-card p-4"
        aria-label="Caminho de atualizacao"
      >
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Caminho seguro</p>
          <h2 className="text-xl font-semibold leading-6">
            {updatePath.state === "public_safe"
              ? "Atualizacao segura configurada"
              : "Atualizacao manual"}
          </h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            {updatePath.detail}
          </p>
        </div>
        <Button className="min-h-12 w-fit" variant="outline">
          {updatePath.ctaLabel}
        </Button>
      </section>

      <section
        className="grid gap-4 rounded-lg border border-border bg-card p-4"
        aria-label="Versoes instaladas por aparelho"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-primary">Versoes instaladas</p>
            <h2 className="text-xl font-semibold leading-6">Aparelhos fora da build primeiro</h2>
            <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
              Incompativel, desatualizado e desconhecido aparecem antes dos aparelhos atuais.
            </p>
          </div>
          <Badge tone={sortedDevices.length === 0 ? "warning" : "neutral"}>
            {sortedDevices.length} aparelho(s)
          </Badge>
        </div>

        {sortedDevices.length === 0 ? (
          <p className="rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted-foreground">
            Nenhum aparelho informou versao instalada nesta loja.
          </p>
        ) : (
          <div className="grid">
            {sortedDevices.map((device) => (
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
                  <Badge tone={buildCompatibilityTone(device.buildCompatibility)}>
                    {buildCompatibilityLabel(device.buildCompatibility)}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm leading-5 text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                  <p>
                    <span className="font-medium text-foreground">Instalada: </span>
                    {device.appVersion} / build {device.appBuild}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Aprovada: </span>
                    {device.approvedAppVersion} / build {device.approvedBuild}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Ambiente: </span>
                    {device.environment}
                  </p>
                </div>
                <p className="text-sm leading-5">
                  <span className="font-medium">Agora: </span>
                  {device.nextAction}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BuildMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border p-3 last:border-b-0 sm:border-r sm:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold leading-6">{value}</p>
    </div>
  );
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

function AtualizacoesSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Carregando Atualizacoes">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}
