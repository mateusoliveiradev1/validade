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

export const DEFAULT_APPROVED_ARTIFACT_LABEL = "phase-12-staging-apk-120";

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

export function sortDevicesByBuildCompatibility(
  devices: CommandCenterProjection["devices"],
): CommandCenterProjection["devices"] {
  const rank: Record<CommandCenterProjection["devices"][number]["buildCompatibility"], number> = {
    incompativel: 0,
    desatualizado: 1,
    desconhecido: 2,
    atual: 3,
  };

  return [...devices].sort((left, right) => {
    const compatibilityDiff = rank[left.buildCompatibility] - rank[right.buildCompatibility];
    if (compatibilityDiff !== 0) return compatibilityDiff;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
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

export interface UpdatePathState {
  ctaLabel: "Abrir atualizacao segura" | "Ver instrucoes manuais";
  detail: string;
  href?: string;
  state: "public_safe" | "manual_pending" | "blocked";
}

export type ValidationVerdictLabel = "Go" | "No-Go" | "Aguardando prova externa";

export interface ValidationVerdict {
  detail: string;
  label: ValidationVerdictLabel;
  tone: "success" | "warning" | "critical";
}

export type ValidationRouteReferenceLabel =
  | "Resolver push em Aparelhos"
  | "Resolver atualizacao em Atualizacoes"
  | "Revisar operacao diaria em Operacao"
  | "Registrar status da validacao";

const unsafeUpdatePathPattern =
  /(token|secret|password|eas:\/\/|buildUrl|dashboard|builds?\/|private|firebase|google-services)/i;

export function resolveUpdatePathState(publicUpdateUrl?: string | undefined): UpdatePathState {
  const trimmed = publicUpdateUrl?.trim();

  if (trimmed === undefined || trimmed.length === 0) {
    return {
      ctaLabel: "Ver instrucoes manuais",
      detail:
        "Atualizacao segue manual ate existir um caminho publico e seguro de APK/QR configurado.",
      state: "manual_pending",
    };
  }

  if (unsafeUpdatePathPattern.test(trimmed)) {
    return {
      ctaLabel: "Ver instrucoes manuais",
      detail:
        "Caminho automatico bloqueado: o valor configurado parece conter link privado, token ou referencia de build sensivel.",
      state: "blocked",
    };
  }

  return {
    ctaLabel: "Abrir atualizacao segura",
    detail: "Caminho publico de atualizacao validado para distribuicao controlada.",
    href: trimmed,
    state: "public_safe",
  };
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

export function deriveValidationVerdict(projection: CommandCenterProjection): ValidationVerdict {
  const steps = projection.pilotUat.steps;
  const hasBlockedStep = steps.some((step) => step.state === "blocked");
  const hasCriticalBlocker = projection.pilotBlockers.some(
    (blocker) => blocker.severity === "critical",
  );

  if (hasBlockedStep || hasCriticalBlocker) {
    return {
      detail:
        "Ha bloqueio critico ou etapa UAT bloqueada. A Loja 18 ainda nao pode seguir para rollout.",
      label: "No-Go",
      tone: "critical",
    };
  }

  const hasExternalProofGap =
    steps.some((step) => step.state === "external_blocked") ||
    projection.pilotBlockers.some((blocker) => blocker.severity === "external");
  const hasPendingStep = steps.some((step) => step.state === "pending");
  const hasDeviceGateGap = projection.devices.some(
    (device) => device.verdict !== "apto" || device.buildCompatibility !== "atual",
  );
  const allStepsPassed = steps.every((step) => step.state === "passed");

  if (hasExternalProofGap || hasPendingStep || hasDeviceGateGap || !allStepsPassed) {
    return {
      detail:
        "A operacao tem pendencias ou prova externa ausente. Mantenha o rollout aguardando evidencia.",
      label: "Aguardando prova externa",
      tone: "warning",
    };
  }

  return {
    detail:
      "Checklist, aparelhos, build e bloqueios estao sem pendencia nesta leitura sanitizada.",
    label: "Go",
    tone: "success",
  };
}

export function validationReferenceForBlocker(
  category: CommandCenterProjection["pilotBlockers"][number]["category"],
): ValidationRouteReferenceLabel {
  if (category === "push" || category === "camera" || category === "device") {
    return "Resolver push em Aparelhos";
  }

  if (category === "build") return "Resolver atualizacao em Atualizacoes";

  if (category === "sync" || category === "product_review" || category === "shift_close") {
    return "Revisar operacao diaria em Operacao";
  }

  return "Registrar status da validacao";
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
