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

export const DEFAULT_APPROVED_ARTIFACT_LABEL = "uat17-shift-close-alerts-apk-147";

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

export function getConfirmedPilotDevices(
  devices: CommandCenterProjection["devices"],
): CommandCenterProjection["devices"] {
  return devices.filter(
    (device) =>
      device.activeUserLabel !== "Usuario nao confirmado" &&
      !device.blockers.some((blocker) => blocker.code === "invalid_store_or_user"),
  );
}

export function getOperationalTurnDevices(
  devices: CommandCenterProjection["devices"],
  referenceAt: string,
): CommandCenterProjection["devices"] {
  const confirmed = getConfirmedPilotDevices(devices);
  const withCentralReadToday = confirmed.filter(
    (device) =>
      device.lastCentralReadAt !== undefined &&
      localDateKey(device.lastCentralReadAt) === localDateKey(referenceAt),
  );

  return withCentralReadToday.length > 0 ? withCentralReadToday : confirmed;
}

export function getDiagnosticDeviceRecords(
  devices: CommandCenterProjection["devices"],
  operationalDevices: CommandCenterProjection["devices"],
): CommandCenterProjection["devices"] {
  const operationalIds = new Set(operationalDevices.map((device) => device.deviceIdMasked));
  return devices.filter((device) => !operationalIds.has(device.deviceIdMasked));
}

export function countOperationalDeviceReadiness(
  devices: CommandCenterProjection["devices"],
  referenceAt: string,
): DeviceReadinessCounts {
  return countDeviceReadiness(getOperationalTurnDevices(devices, referenceAt));
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
    return "Teste seguro exige autorizacao do aparelho, loja confirmada e leitura central recente.";
  }

  const lacksConfirmedScope = input.device.blockers.some(
    (blocker) =>
      blocker.code === "invalid_store_or_user" || blocker.code === "missing_first_central_read",
  );
  if (lacksConfirmedScope) {
    return "Teste seguro exige autorizacao do aparelho, loja confirmada e leitura central recente.";
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
  nextAction: string;
  tone: "success" | "warning" | "critical";
}

export type ValidationRouteReferenceLabel =
  | "Resolver push, camera ou autorizacao do aparelho em Aparelhos"
  | "Resolver build em Atualizacoes"
  | "Revisar fila local, revisao de produto ou fechamento em Operacao";

const unsafeUpdatePathPattern =
  /(token|secret|password|eas:\/\/|buildUrl|dashboard|builds?\/|private|firebase|google-services)/i;

export function resolveUpdatePathState(publicUpdateUrl?: string): UpdatePathState {
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

export function optionalDateLabel(
  value: string | undefined,
  emptyLabel = "ainda nao reportado",
): string {
  return value === undefined ? emptyLabel : formatDateTime(value);
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
  const blockedStep = steps.find((step) => step.state === "blocked");
  const criticalBlocker = projection.pilotBlockers.find(
    (blocker) => blocker.severity === "critical",
  );

  if (criticalBlocker !== undefined || blockedStep !== undefined) {
    const blockerLabel =
      criticalBlocker?.label ??
      runbookProofLabel(blockedStep?.stepId) ??
      blockedStep?.label ??
      "Bloqueio critico";
    const route = criticalBlocker?.category
      ? routeActionForBlocker(criticalBlocker.category)
      : routeActionForStep(blockedStep?.stepId);
    const action =
      criticalBlocker?.nextAction ??
      blockedStep?.nextAction ??
      blockedStep?.actionLabel ??
      "Corrigir o bloqueio na rota dona da acao.";

    return {
      detail: `No-Go: ${blockerLabel} impede a validacao. Corrija em ${route} antes de continuar.`,
      label: "No-Go",
      nextAction: action,
      tone: "critical",
    };
  }

  const externalStep = steps.find((step) => step.state === "external_blocked");
  const externalBlocker = projection.pilotBlockers.find(
    (blocker) => blocker.severity === "external",
  );
  const pendingStep = steps.find((step) => step.state === "pending");
  const hasPendingStep = steps.some((step) => step.state === "pending");
  const operationalDevices = getOperationalTurnDevices(projection.devices, projection.refreshedAt);
  const deviceGateGap = operationalDevices.find(
    (device) => device.verdict !== "apto" || device.buildCompatibility !== "atual",
  );
  const allStepsPassed = steps.every((step) => step.state === "passed");

  if (
    externalStep !== undefined ||
    externalBlocker !== undefined ||
    hasPendingStep ||
    deviceGateGap !== undefined ||
    !allStepsPassed
  ) {
    const missingProofLabel =
      externalBlocker?.affectedLabel ??
      runbookProofLabel(externalStep?.stepId) ??
      runbookProofLabel(pendingStep?.stepId) ??
      externalStep?.label ??
      pendingStep?.label ??
      deviceGateGap?.deviceLabel ??
      "prova central final";
    const action =
      externalBlocker?.nextAction ??
      externalStep?.nextAction ??
      pendingStep?.nextAction ??
      pendingStep?.actionLabel ??
      deviceGateGap?.nextAction ??
      "Atualize a validacao depois da prova central.";
    const route = externalBlocker?.category
      ? routeActionForBlocker(externalBlocker.category)
      : deviceGateGap !== undefined
        ? routeActionForDeviceGateGap(deviceGateGap)
        : routeActionForStep(externalStep?.stepId ?? pendingStep?.stepId);

    return {
      detail: `Ainda nao e Go porque falta prova ${missingProofLabel}. Faca ${action} em ${route}.`,
      label: "Aguardando prova externa",
      nextAction: action,
      tone: "warning",
    };
  }

  return {
    detail: "Go confirmado para Loja 18 com prova central completa e fechamento seguro.",
    label: "Go",
    nextAction: "Mantenha a leitura central atualizada ate a decisao final da lideranca.",
    tone: "success",
  };
}

function routeActionForStep(
  stepId: CommandCenterProjection["pilotUat"]["steps"][number]["stepId"] | undefined,
): "Aparelhos" | "Atualizacoes" | "Operacao" {
  if (
    stepId === "safe_push_test" ||
    stepId === "camera_evidence_or_fallback" ||
    stepId === "second_device_convergence"
  ) {
    return "Aparelhos";
  }

  return "Operacao";
}

function routeActionForBlocker(
  category: CommandCenterProjection["pilotBlockers"][number]["category"],
): "Aparelhos" | "Atualizacoes" | "Operacao" {
  if (category === "push" || category === "camera" || category === "device") {
    return "Aparelhos";
  }

  if (category === "build") return "Atualizacoes";

  return "Operacao";
}

function routeActionForDeviceGateGap(
  device: CommandCenterProjection["devices"][number],
): "Aparelhos" | "Atualizacoes" | "Operacao" {
  if (device.buildCompatibility !== "atual") return "Atualizacoes";
  return "Aparelhos";
}

function runbookProofLabel(
  stepId: CommandCenterProjection["pilotUat"]["steps"][number]["stepId"] | undefined,
): string | undefined {
  if (stepId === "prepare_turn") return "Turno preparado";
  if (stepId === "product_real_input") return "Produto real usado no teste";
  if (stepId === "lot_registration") return "Lote real registrado";
  if (stepId === "terminal_resolution") return "Resolucao terminal registrada";
  if (stepId === "second_device_convergence") return "Segundo aparelho conferiu os mesmos fatos";
  if (stepId === "command_center_consistency") return "Command Center consistente";
  if (stepId === "safe_push_test") return "Push seguro recebido no aparelho aprovado";
  if (stepId === "camera_evidence_or_fallback") {
    return "Camera ou fallback operacional comprovado";
  }
  if (stepId === "shift_close") return "Fechamento seguro do turno";
  return undefined;
}

export function validationReferenceForBlocker(
  category: CommandCenterProjection["pilotBlockers"][number]["category"],
): ValidationRouteReferenceLabel {
  if (category === "push" || category === "camera" || category === "device") {
    return "Resolver push, camera ou autorizacao do aparelho em Aparelhos";
  }

  if (category === "build") return "Resolver build em Atualizacoes";

  if (category === "sync" || category === "product_review" || category === "shift_close") {
    return "Revisar fila local, revisao de produto ou fechamento em Operacao";
  }

  return "Revisar fila local, revisao de produto ou fechamento em Operacao";
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function localDateKey(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}
