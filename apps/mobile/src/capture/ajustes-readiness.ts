import type { AlertChannelState } from "@validade-zero/domain";
import type {
  DevicePushRegistrationCommand,
  OfflineCacheStatus,
  PilotBuildCompatibility,
  PrepareTurnCacheStatus,
  SyncQueueSummary,
} from "@validade-zero/contracts";
import { todayCopy } from "./today-copy";

export type AjustesReadinessVerdict = "Apto" | "Atencao" | "Bloqueado";

export interface PushReadiness {
  verdict: AjustesReadinessVerdict;
  body: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
}

export interface SyncReadiness {
  verdict: AjustesReadinessVerdict;
  body: string;
  safeCloseBlocked: boolean;
  blockerReason?: string;
  centralRefreshRequired: boolean;
  lastCentralReadValue: string;
  lastSyncSendValue: string;
  pendingCount: number;
  conflictCount: number;
}

export type TodayReadinessClassification = "compact" | "blocking_for_today";

export interface TodayReadinessFact {
  key: "central_read" | "sync_queue" | "push" | "camera" | "build" | "device_authorization";
  classification: TodayReadinessClassification;
  label: string;
  body: string;
  actionLabel?: string;
}

export const ajustesPushCopy = {
  title: "Push e lembretes",
  safeBody: "Alertas ajudam a cobrar, mas nao resolvem tarefas nem provam a area de venda.",
  activate: "Ativar alertas do turno",
  testThisDevice: "Enviar teste neste aparelho",
  disableThisDevice: "Desativar neste aparelho",
  localOnlyBody:
    "Lembretes locais do turno ativos neste aparelho. O push remoto ainda precisa do APK aprovado.",
  disabledBody:
    "Este aparelho para de receber lembretes. As tarefas continuam ativas em Hoje e a cobranca pode seguir por outros caminhos.",
  thisDeviceOnly:
    "Teste enviado neste aparelho; prova apenas este aparelho, nao o provedor global nem a area de venda.",
  localUnavailable: "Teste local indisponivel neste aparelho. As tarefas continuam ativas em Hoje.",
} as const;

export const ajustesSyncCopy = {
  title: "Sincronizacao",
  centralReadLabel: "Ultima leitura central",
  syncSendLabel: "Fila local conferida",
  clearSafeClose: "Sync nao bloqueia o fechamento seguro nesta leitura.",
  blockedSafeClose:
    "Este estado bloqueia fechamento seguro ate a central confirmar ou o conflito ser resolvido.",
  missingCentralRead: "Sem leitura central confirmada",
  missingSyncSend: "Ainda nao conferida neste aparelho",
  localCacheBlocker: "Leitura local em uso; prepare a central antes de declarar area segura.",
  staleCentralRead: "Leitura central vencida; atualize antes de declarar area segura.",
  refreshCentralRead: "Atualizar leitura central",
  criticalPendingBlocker:
    "Pendencia critica ainda nao confirmada pela central. Sincronize antes do fechamento seguro.",
  criticalConflictBlocker:
    "Conflito critico de sincronizacao. Revise antes de confirmar area segura.",
  nonCriticalPending:
    "Ha pendencias nao criticas neste aparelho. Sincronize assim que a conexao permitir.",
  offlineStale: "Cache offline pode estar desatualizado neste aparelho.",
  offlineUnavailable: "Este aparelho ainda nao tem cache offline preparado.",
  ready: "Leitura central atual e fila local sem pendencias criticas.",
} as const;

export function pushReadinessFor(input: {
  channelState: AlertChannelState;
  storedPermissionStatus?: DevicePushRegistrationCommand["permissionStatus"] | null | undefined;
  requireRemoteProof?: boolean | undefined;
}): PushReadiness {
  const state = input.storedPermissionStatus ?? input.channelState;
  const blocksRemoteProof =
    input.requireRemoteProof === true &&
    (state === "local_only" || state === "unavailable" || state === "denied");

  if (state === "granted" || state === "active") {
    return {
      verdict: "Apto",
      body: todayCopy.push.active,
      primaryActionLabel: ajustesPushCopy.testThisDevice,
      secondaryActionLabel: ajustesPushCopy.disableThisDevice,
    };
  }

  if (blocksRemoteProof) {
    return {
      verdict: "Bloqueado",
      body: "Este estado bloqueia prova de push remoto ate o APK/provedor estar validado.",
      primaryActionLabel: ajustesPushCopy.testThisDevice,
    };
  }

  if (state === "local_only") {
    return {
      verdict: "Atencao",
      body: ajustesPushCopy.localOnlyBody,
      primaryActionLabel: ajustesPushCopy.testThisDevice,
      secondaryActionLabel: ajustesPushCopy.disableThisDevice,
    };
  }

  if (state === "denied") {
    return {
      verdict: "Atencao",
      body: todayCopy.push.denied,
      primaryActionLabel: todayCopy.push.openSettings,
    };
  }

  if (state === "unavailable" || state === "failed") {
    return {
      verdict: "Atencao",
      body: todayCopy.push.unavailable,
      primaryActionLabel: todayCopy.push.retry,
    };
  }

  return {
    verdict: "Atencao",
    body: ajustesPushCopy.safeBody,
    primaryActionLabel: ajustesPushCopy.activate,
  };
}

export function syncReadinessFor(input: {
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  offlineStatus?: OfflineCacheStatus | undefined;
  queue?: SyncQueueSummary | undefined;
  now?: Date | undefined;
}): SyncReadiness {
  const cache = input.prepareTurnCacheStatus;
  const queue = input.queue;
  const lastCentralReadAt = cache?.lastCentralReadAt;
  const lastCentralReadValue = formatAjustesTimestamp(
    lastCentralReadAt,
    ajustesSyncCopy.missingCentralRead,
  );
  const lastSyncSendValue = formatAjustesTimestamp(
    queue?.updatedAt,
    ajustesSyncCopy.missingSyncSend,
  );
  const pendingCount = queue?.totalCount ?? 0;
  const conflictCount = queue?.conflictCount ?? 0;
  const blocker = syncBlockerFor({
    cache,
    now: input.now ?? new Date(),
    prepareTurnSource: input.prepareTurnSource,
    queue,
  });

  if (blocker !== undefined) {
    return {
      verdict: "Bloqueado",
      body: blocker.reason,
      safeCloseBlocked: true,
      blockerReason: blocker.reason,
      centralRefreshRequired: blocker.centralRefreshRequired,
      lastCentralReadValue,
      lastSyncSendValue,
      pendingCount,
      conflictCount,
    };
  }

  if (
    pendingCount > 0 ||
    input.offlineStatus?.state === "offline_stale" ||
    input.offlineStatus?.state === "offline_unavailable" ||
    input.offlineStatus?.state === "offline_mode"
  ) {
    return {
      verdict: "Atencao",
      body:
        input.offlineStatus?.state === "offline_stale"
          ? ajustesSyncCopy.offlineStale
          : input.offlineStatus?.state === "offline_unavailable"
            ? ajustesSyncCopy.offlineUnavailable
            : input.offlineStatus?.state === "offline_mode"
              ? "Sem internet agora. A leitura central anterior continua visivel, mas sincronize quando voltar."
              : ajustesSyncCopy.nonCriticalPending,
      safeCloseBlocked: false,
      centralRefreshRequired: false,
      lastCentralReadValue,
      lastSyncSendValue,
      pendingCount,
      conflictCount,
    };
  }

  return {
    verdict: "Apto",
    body: ajustesSyncCopy.ready,
    safeCloseBlocked: false,
    centralRefreshRequired: false,
    lastCentralReadValue,
    lastSyncSendValue,
    pendingCount,
    conflictCount,
  };
}

export function todayReadinessFactsFor(input: {
  sync: Parameters<typeof syncReadinessFor>[0];
  push?: Parameters<typeof pushReadinessFor>[0] | undefined;
  cameraPermission?: "granted" | "denied" | "not_requested" | "unavailable" | "unknown";
  cameraRequiredForValidation?: boolean | undefined;
  buildCompatibility?: PilotBuildCompatibility | undefined;
  buildRequiredForToday?: boolean | undefined;
  deviceAuthorization?: "valid" | "invalid" | "unknown" | undefined;
}): readonly TodayReadinessFact[] {
  const syncReadiness = syncReadinessFor(input.sync);
  const syncFactKey = syncReadiness.centralRefreshRequired ? "central_read" : "sync_queue";
  const syncFactLabel =
    input.sync.prepareTurnSource === "local_cache"
      ? "Local"
      : syncFactKey === "central_read"
        ? "Leitura central"
        : "Sincronizacao";
  const syncFactBody =
    input.sync.prepareTurnSource === "local_cache"
      ? `Leitura local em uso desde ${syncReadiness.lastCentralReadValue}. Nao declare area segura sem preparar a central.`
      : syncReadiness.body;
  const facts: TodayReadinessFact[] = [
    {
      key: syncFactKey,
      classification: syncReadiness.verdict === "Bloqueado" ? "blocking_for_today" : "compact",
      label: syncFactLabel,
      body: syncFactBody,
      ...(syncReadiness.centralRefreshRequired
        ? { actionLabel: ajustesSyncCopy.refreshCentralRead }
        : {}),
    },
  ];

  if (input.push !== undefined) {
    const push = pushReadinessFor(input.push);
    facts.push({
      key: "push",
      classification: push.verdict === "Bloqueado" ? "blocking_for_today" : "compact",
      label: ajustesPushCopy.title,
      body: push.body,
      actionLabel: push.primaryActionLabel,
    });
  }

  if (input.cameraPermission !== undefined) {
    facts.push(cameraReadinessFact(input.cameraPermission, input.cameraRequiredForValidation));
  }

  if (input.buildCompatibility !== undefined) {
    facts.push(buildReadinessFact(input.buildCompatibility, input.buildRequiredForToday));
  }

  if (input.deviceAuthorization !== undefined) {
    facts.push(deviceAuthorizationFact(input.deviceAuthorization));
  }

  return facts;
}

function cameraReadinessFact(
  permission: NonNullable<Parameters<typeof todayReadinessFactsFor>[0]["cameraPermission"]>,
  required: boolean | undefined,
): TodayReadinessFact {
  const blocked = required === true && permission !== "granted";

  return {
    key: "camera",
    classification: blocked ? "blocking_for_today" : "compact",
    label: "Camera",
    body:
      permission === "granted"
        ? "Camera liberada para leitura e evidencias quando necessario."
        : "Camera indisponivel; use busca manual ou registre motivo quando a evidencia for exigida.",
    ...(blocked ? { actionLabel: "Liberar camera" } : {}),
  };
}

function buildReadinessFact(
  compatibility: PilotBuildCompatibility,
  required: boolean | undefined,
): TodayReadinessFact {
  const blocked =
    compatibility === "incompativel" || (required === true && compatibility !== "atual");

  return {
    key: "build",
    classification: blocked ? "blocking_for_today" : "compact",
    label: "Atualizacao do app",
    body:
      compatibility === "atual"
        ? "Build instalado compativel com o piloto."
        : "Atualize o app antes de validar esta operacao.",
    ...(blocked ? { actionLabel: "Atualizar app" } : {}),
  };
}

function deviceAuthorizationFact(
  authorization: NonNullable<Parameters<typeof todayReadinessFactsFor>[0]["deviceAuthorization"]>,
): TodayReadinessFact {
  const blocked = authorization === "invalid";

  return {
    key: "device_authorization",
    classification: blocked ? "blocking_for_today" : "compact",
    label: "Conta e loja",
    body:
      authorization === "valid"
        ? "Conta, loja e aparelho autorizados para operar."
        : blocked
          ? "Conta, loja ou aparelho sem autorizacao para validar esta operacao."
          : "Autorizacao ainda precisa ser confirmada quando a central responder.",
    ...(blocked ? { actionLabel: "Revalidar acesso" } : {}),
  };
}

export function operatorSafePushFeedback(reason: string | undefined): string {
  if (reason === undefined || reason.trim().length === 0) {
    return todayCopy.push.unavailable;
  }

  const approvedOperationalMessages: readonly string[] = [
    todayCopy.push.active,
    todayCopy.push.denied,
    todayCopy.push.unavailable,
    todayCopy.push.localOnly,
    todayCopy.push.nativeSetupRequired,
    todayCopy.push.failed,
    ajustesPushCopy.disabledBody,
    ajustesPushCopy.thisDeviceOnly,
    ajustesPushCopy.localUnavailable,
  ];

  if (approvedOperationalMessages.includes(reason)) {
    return reason;
  }

  const technicalMarkers = [
    "firebase",
    "fcm",
    "google-services",
    "googleservicesfile",
    "default firebaseapp",
    "expopushtoken",
    "expopushtokenmanager",
    "native push token",
    "provider",
    "token",
    "secret",
    "rawdeviceid",
  ];
  const normalized = reason.toLocaleLowerCase("en-US");

  if (technicalMarkers.some((marker) => normalized.includes(marker))) {
    return todayCopy.push.nativeSetupRequired;
  }

  return todayCopy.push.unavailable;
}

function syncBlockerFor(input: {
  cache?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  queue?: SyncQueueSummary | undefined;
  now: Date;
}): { reason: string; centralRefreshRequired: boolean } | undefined {
  const queue = input.queue;

  if (hasCriticalConflict(queue)) {
    return { reason: ajustesSyncCopy.criticalConflictBlocker, centralRefreshRequired: false };
  }

  if (hasCriticalPending(queue)) {
    return { reason: ajustesSyncCopy.criticalPendingBlocker, centralRefreshRequired: false };
  }

  const cache = input.cache;
  const resolvedSource = input.prepareTurnSource ?? cache?.source;

  if (resolvedSource === "local_cache") {
    return { reason: ajustesSyncCopy.localCacheBlocker, centralRefreshRequired: true };
  }

  if (cache === null || cache === undefined || cache.lastCentralReadAt === undefined) {
    return { reason: ajustesSyncCopy.missingCentralRead, centralRefreshRequired: true };
  }

  if (cache.state !== "ready" || isCentralReadStale(cache, input.now)) {
    return {
      reason: staleCentralReadReason(cache),
      centralRefreshRequired: true,
    };
  }

  return undefined;
}

function hasCriticalConflict(queue: SyncQueueSummary | undefined): boolean {
  return (
    queue?.hasCriticalConflict === true ||
    queue?.commands.some(
      (command) => command.state === "sync_conflict" && command.urgency === "critical",
    ) === true
  );
}

function hasCriticalPending(queue: SyncQueueSummary | undefined): boolean {
  return (
    queue?.commands.some(
      (command) => command.urgency === "critical" && command.state !== "sync_conflict",
    ) === true
  );
}

function isCentralReadStale(cache: PrepareTurnCacheStatus, now: Date): boolean {
  const readAt = Date.parse(cache.lastCentralReadAt ?? "");

  if (Number.isNaN(readAt)) {
    return true;
  }

  return now.getTime() - readAt > cache.staleAfterHours * 60 * 60 * 1000;
}

function staleCentralReadReason(cache: PrepareTurnCacheStatus): string {
  const lastRead = formatAjustesTimestamp(cache.lastCentralReadAt, "horario desconhecido");
  const windowLabel = formatStaleWindow(cache.staleAfterHours);

  return `Leitura central vencida: ultima leitura em ${lastRead}. Ela vale por ate ${windowLabel}; sincronizar pendencias nao renova esta leitura. Atualize a leitura central antes de declarar area segura.`;
}

function formatStaleWindow(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "o prazo configurado";
  }

  return hours === 1 ? "1h" : `${hours}h`;
}

function formatAjustesTimestamp(value: string | undefined, fallback: string): string {
  if (value === undefined) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const saoPaulo = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const day = pad2(saoPaulo.getUTCDate());
  const month = pad2(saoPaulo.getUTCMonth() + 1);
  const year = saoPaulo.getUTCFullYear();
  const hour = pad2(saoPaulo.getUTCHours());
  const minute = pad2(saoPaulo.getUTCMinutes());

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}
