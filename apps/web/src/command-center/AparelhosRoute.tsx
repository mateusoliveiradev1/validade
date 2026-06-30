import type { CommandCenterProjection } from "@validade-zero/contracts";
import { BellRing, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  formatDateTime,
  getDiagnosticDeviceRecords,
  getOperationalTurnDevices,
  getSafePushTestDisabledReason,
  optionalDateLabel,
  sortDevicesByReadiness,
} from "./command-center-view-model";

type AparelhosStatus = "loading" | "ready" | "error";

export function AparelhosRoute({
  canSendPilotPushTest,
  lastClientRefreshAt,
  onRefresh,
  onSendSafePushTest,
  projection,
  status,
}: {
  canSendPilotPushTest: boolean;
  lastClientRefreshAt?: Date;
  onRefresh: () => void;
  onSendSafePushTest: (device: CommandCenterProjection["devices"][number]) => Promise<void>;
  projection: CommandCenterProjection | undefined;
  status: AparelhosStatus;
}) {
  const isInitialLoading = status === "loading" && projection === undefined;

  return (
    <section className="grid gap-6" aria-labelledby="aparelhos-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-primary">Aparelhos do piloto</p>
          <h1 id="aparelhos-heading" className="text-[28px] font-semibold leading-[34px]">
            Aparelhos
          </h1>
          <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
            Confira quais aparelhos reportaram leitura central, fila local, push, camera, build e
            autorizacao do aparelho.
          </p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {lastClientRefreshAt === undefined
              ? "Sincronizando aparelhos com a central..."
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

      {isInitialLoading ? <AparelhosSkeleton /> : null}

      {status === "error" ? (
        <div
          className="grid gap-3 rounded-lg border border-critical-border bg-critical-surface p-4"
          role="alert"
        >
          <div className="grid gap-1">
            <p className="text-base font-semibold text-destructive">
              Nao foi possivel atualizar os aparelhos.
            </p>
            <p className="text-sm leading-5 text-foreground">
              A leitura anterior continua visivel quando existir; nao trate estado antigo como prova
              de prontidao atual.
            </p>
          </div>
          <Button className="min-h-12 w-fit" onClick={onRefresh}>
            Tentar atualizar agora
          </Button>
        </div>
      ) : null}

      {projection === undefined ? null : (
        <DeviceReadinessList
          canSendPilotPushTest={canSendPilotPushTest}
          devices={projection.devices}
          onSendSafePushTest={onSendSafePushTest}
          referenceAt={projection.refreshedAt}
        />
      )}
    </section>
  );
}

function DeviceReadinessList({
  canSendPilotPushTest,
  devices,
  onSendSafePushTest,
  referenceAt,
}: {
  canSendPilotPushTest: boolean;
  devices: CommandCenterProjection["devices"];
  onSendSafePushTest: (device: CommandCenterProjection["devices"][number]) => Promise<void>;
  referenceAt: string;
}) {
  const [pendingDeviceId, setPendingDeviceId] = useState<string>();
  const [sendError, setSendError] = useState<{ deviceId: string; message: string }>();
  const operationalDevices = sortDevicesByReadiness(
    getOperationalTurnDevices(devices, referenceAt),
  );
  const diagnosticDevices = sortDevicesByReadiness(
    getDiagnosticDeviceRecords(devices, operationalDevices),
  );

  return (
    <section className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-primary">Prontidao por aparelho</p>
          <h2 className="text-xl font-semibold leading-6">Aparelhos em uso no turno</h2>
          <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
            A lista principal mostra aparelho com usuario e loja confirmados na leitura atual.
            Registros antigos ou incompletos ficam em diagnostico, sem travar a rotina do dia.
          </p>
        </div>
        <Badge tone={operationalDevices.length === 0 ? "warning" : "neutral"}>
          {operationalDevices.length} em uso
        </Badge>
      </div>

      {operationalDevices.length === 0 ? (
        <div className="rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted-foreground">
          Nenhum aparelho confirmado apareceu nesta leitura. Abra o app aprovado com uma conta da
          loja, aguarde a leitura central e atualize o painel.
        </div>
      ) : (
        <div className="grid">
          {operationalDevices.map((device) => {
            const disabledReason = getSafePushTestDisabledReason({
              canSendPilotPushTest,
              device,
            });
            const pending = pendingDeviceId === device.deviceIdMasked;
            const errorMessage =
              sendError?.deviceId === device.deviceIdMasked ? sendError.message : undefined;

            return (
              <article
                key={device.deviceIdMasked}
                className="grid gap-4 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-1">
                    <h3 className="text-lg font-semibold leading-6">{device.deviceLabel}</h3>
                    <p className="text-sm leading-5 text-muted-foreground">
                      Operador: {device.activeUserLabel}. ID seguro: {device.deviceIdMasked}
                    </p>
                  </div>
                  <Badge tone={deviceVerdictTone(device.verdict)}>
                    {deviceVerdictLabel(device.verdict)}
                  </Badge>
                </div>

                <div className="grid gap-2 text-sm leading-5">
                  <p>
                    <span className="font-medium">Estado: </span>
                    {readinessCauseLabel(device)}
                  </p>
                  <p>
                    <span className="font-medium">Agora: </span>
                    {device.nextAction}
                  </p>
                </div>

                <div className="grid gap-2 text-sm leading-5 text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                  <p>
                    <span className="font-medium text-foreground">Leitura central: </span>
                    {optionalDateLabel(device.lastCentralReadAt)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Fila local: </span>
                    {optionalDateLabel(device.lastSyncAt, "ainda nao reportada pelo APK")}
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
                    <span className="font-medium text-foreground">Build: </span>
                    <Badge
                      className="ml-1"
                      tone={buildCompatibilityTone(device.buildCompatibility)}
                    >
                      {buildCompatibilityLabel(device.buildCompatibility)}
                    </Badge>
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Autorizacao do aparelho: </span>
                    {deviceAuthorizationLabel(device)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Atualizado: </span>
                    {formatDateTime(device.updatedAt)}
                  </p>
                </div>

                <div className="grid gap-3 rounded-md border border-border bg-background p-3">
                  <div className="grid gap-1">
                    <p className="text-sm font-semibold">Teste seguro de push</p>
                    <p className="text-sm leading-5 text-muted-foreground">
                      Envia um lembrete remoto para este aparelho. O teste prova apenas o canal de
                      push; nao resolve tarefa nem declara area segura.
                    </p>
                    {disabledReason === undefined ? null : (
                      <p className="text-sm leading-5 text-muted-foreground">{disabledReason}</p>
                    )}
                  </div>
                  {errorMessage === undefined ? null : (
                    <p className="rounded-md border border-critical-border bg-critical-surface p-3 text-sm leading-5 text-destructive">
                      {errorMessage}
                    </p>
                  )}
                  <Button
                    className="min-h-12 w-fit"
                    disabled={disabledReason !== undefined || pending}
                    title={disabledReason}
                    onClick={() => {
                      setPendingDeviceId(device.deviceIdMasked);
                      setSendError(undefined);
                      void onSendSafePushTest(device)
                        .catch(() => {
                          setSendError({
                            deviceId: device.deviceIdMasked,
                            message:
                              "Nao foi possivel registrar o teste seguro agora. Atualize o painel e tente novamente; se persistir, o caminho /pilot da API ainda nao esta publicado.",
                          });
                        })
                        .finally(() => setPendingDeviceId(undefined));
                    }}
                  >
                    <BellRing className="size-4" aria-hidden="true" />
                    {pending ? "Enviando teste..." : "Enviar teste seguro"}
                  </Button>
                  <PushTestTimeline items={device.pushTests ?? []} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {diagnosticDevices.length === 0 ? null : (
        <div className="grid gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-primary">Diagnostico</p>
              <h3 className="text-lg font-semibold leading-6">
                Registros antigos ou sem confirmacao
              </h3>
              <p className="max-w-[75ch] text-sm leading-5 text-muted-foreground">
                Mantidos para suporte e auditoria. Eles ajudam a entender rollback, APK antigo ou
                convite incompleto, mas nao entram no resumo do turno.
              </p>
            </div>
            <Badge tone="neutral">{diagnosticDevices.length} registro(s)</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {diagnosticDevices.map((device) => (
              <div key={device.deviceIdMasked} className="grid gap-2 rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="grid min-w-0 gap-1">
                    <p className="font-medium">{device.deviceLabel}</p>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {device.deviceIdMasked} - {device.activeUserLabel}
                    </p>
                  </div>
                  <Badge tone={deviceVerdictTone(device.verdict)}>
                    {deviceVerdictLabel(device.verdict)}
                  </Badge>
                </div>
                <p className="text-sm leading-5 text-muted-foreground">
                  Build {device.appVersion} / {device.appBuild}; leitura central{" "}
                  {optionalDateLabel(device.lastCentralReadAt)}.
                </p>
                <p className="text-sm leading-5">
                  <span className="font-medium">Agora: </span>
                  {device.nextAction}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PushTestTimeline({
  items,
}: {
  items: NonNullable<CommandCenterProjection["devices"][number]["pushTests"]>;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm leading-5 text-muted-foreground">
        Nenhum teste remoto apareceu nesta leitura. Envie um teste e atualize o painel para ver o
        retorno do provedor.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.eventId} className="grid gap-1 border-t border-border pt-2 first:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{pushTestStateLabel(item.state)}</p>
            <Badge tone={pushTestStateTone(item.state)}>{pushTestStateBadge(item.state)}</Badge>
          </div>
          <p className="text-sm leading-5 text-muted-foreground">
            {formatDateTime(item.occurredAt)} - {item.detail}
          </p>
          <p className="text-sm leading-5">
            <span className="font-medium">Agora: </span>
            {item.nextAction}
          </p>
        </div>
      ))}
    </div>
  );
}

function readinessCauseLabel(device: CommandCenterProjection["devices"][number]): string {
  if (device.blockers.length === 0) {
    return "Aparelho sem bloqueio ativo nesta leitura.";
  }

  return device.blockers.map((blocker) => `${blocker.label}: ${blocker.detail}`).join("; ");
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
  if (state === "atual") return "Build aprovado";
  if (state === "desatualizado") return "Build antigo";
  if (state === "incompativel") return "Build incompativel";
  return "Build desconhecido";
}

function deviceAuthorizationLabel(device: CommandCenterProjection["devices"][number]): string {
  return device.blockers.some((blocker) => blocker.code === "invalid_store_or_user")
    ? "sem autorizacao"
    : "autorizacao confirmada";
}

function permissionLabel(
  permission: CommandCenterProjection["devices"][number]["cameraPermission"],
): string {
  if (permission === "granted") return "permitida";
  if (permission === "denied") return "negada";
  if (permission === "not_requested") return "ainda nao solicitada";
  return "ainda nao reportada pelo APK";
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
  return `${permissionText}, provedor ainda nao reportado`;
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

function AparelhosSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Carregando Aparelhos">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}
