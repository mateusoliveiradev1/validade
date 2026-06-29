import type { CommandCenterProjection, PilotDeviceBlockerCode } from "@validade-zero/contracts";
import type { AppRoute } from "../shell/AppShell";

export type CommandCenterRoute = Extract<
  AppRoute,
  "operacao" | "aparelhos" | "atualizacoes" | "validacao"
>;

export interface DeviceReadinessCounts {
  apto: number;
  atencao: number;
  bloqueado: number;
}

const dailyOperationBlockerCodes: ReadonlySet<PilotDeviceBlockerCode> = new Set([
  "invalid_store_or_user",
  "missing_first_central_read",
  "stale_critical_sync",
  "sync_conflict",
  "unsafe_shift_close",
]);

export function countDeviceReadiness(
  devices: CommandCenterProjection["devices"],
): DeviceReadinessCounts {
  return devices.reduce<DeviceReadinessCounts>(
    (counts, device) => ({
      ...counts,
      [device.verdict]: counts[device.verdict] + 1,
    }),
    { apto: 0, atencao: 0, bloqueado: 0 },
  );
}

export function sortDevicesByReadiness(
  devices: CommandCenterProjection["devices"],
): CommandCenterProjection["devices"] {
  return [...devices].sort(compareDeviceReadiness);
}

export function compareDeviceReadiness(
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

export function getDailyOperationDeviceBlockers(
  device: CommandCenterProjection["devices"][number],
): CommandCenterProjection["devices"][number]["blockers"] {
  return device.blockers.filter((blocker) => dailyOperationBlockerCodes.has(blocker.code));
}

export function hasDailyOperationDeviceBlocker(
  device: CommandCenterProjection["devices"][number],
): boolean {
  return getDailyOperationDeviceBlockers(device).length > 0;
}

export function getSafePushTestDisabledReason(input: {
  canSendPilotPushTest: boolean;
  device: CommandCenterProjection["devices"][number];
}): string | undefined {
  if (!input.canSendPilotPushTest) {
    return "Teste seguro exige aparelho autorizado, loja confirmada e leitura central recente.";
  }

  const lacksConfirmedScope = input.device.blockers.some(
    (blocker) =>
      blocker.code === "invalid_store_or_user" || blocker.code === "missing_first_central_read",
  );
  if (lacksConfirmedScope) {
    return "Teste seguro exige aparelho autorizado, loja confirmada e leitura central recente.";
  }

  return undefined;
}

export function optionalDateLabel(value: string | undefined): string {
  return value === undefined ? "sem registro" : formatDateTime(value);
}

export function routeLabel(route: CommandCenterRoute): string {
  if (route === "operacao") return "Operacao";
  if (route === "aparelhos") return "Aparelhos";
  if (route === "atualizacoes") return "Atualizacoes";
  return "Validacao";
}

export function routeKicker(route: CommandCenterRoute): string {
  if (route === "operacao") return "Operacao da loja";
  if (route === "aparelhos") return "Aparelhos do piloto";
  if (route === "atualizacoes") return "Atualizacoes do APK";
  return "Validacao Loja 18";
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
