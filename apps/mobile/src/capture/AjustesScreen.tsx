import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { AlertChannelState } from "@validade-zero/domain";
import type {
  DevicePushRegistrationCommand,
  OfflineCacheStatus,
  PrepareTurnCacheStatus,
  SessionContextResponse,
  SyncConflictRecord,
  SyncQueueSummary as SyncQueueSummaryRecord,
} from "@validade-zero/contracts";
import type { AuthGateReadyControls } from "../auth/AuthGate";
import type { MobileBuildInfo } from "../build-info";
import type { PushAlertChannel } from "./alert-channel";
import {
  ajustesPushCopy,
  ajustesSyncCopy,
  operatorSafePushFeedback,
  pushReadinessFor,
  syncReadinessFor,
} from "./ajustes-readiness";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import {
  DestructiveAction,
  PrimaryAction,
  ScreenHeader,
  SecondaryAction,
  StatusNotice,
} from "./capture-ui";
import { pendingCentralLotSyncFeedback } from "./central-lot-sync-feedback";
import { SyncConflictPanel, SyncQueueSummary } from "./offline-sync-ui";
import { alertChannelStateForRegistration, type CaptureRepository } from "./repository";
import type { SyncEngine } from "./sync-engine";

type PushDeviceIdentity = Pick<
  DevicePushRegistrationCommand,
  "deviceId" | "deviceLabel" | "audienceRole"
>;

const defaultPushDeviceIdentity: PushDeviceIdentity = {
  deviceId: "validade-zero-mobile:local",
  deviceLabel: "Celular do turno",
  audienceRole: "shift_team",
};

export function AjustesScreen({
  alertChannel,
  authControls,
  buildInfo,
  onBack,
  onConfirmCentralDeviceState,
  onRequestCentralRefresh,
  onRegisterPushDevice,
  now = () => new Date(),
  prepareTurnCacheStatus,
  prepareTurnSource,
  pushDeviceIdentity = defaultPushDeviceIdentity,
  repository,
  session,
  syncEngine,
}: {
  authControls?: AuthGateReadyControls | undefined;
  alertChannel?: PushAlertChannel | undefined;
  buildInfo?: MobileBuildInfo | undefined;
  now?: (() => Date) | undefined;
  onConfirmCentralDeviceState?: (() => Promise<void>) | undefined;
  onBack: () => void;
  onRequestCentralRefresh?: (() => void) | undefined;
  onRegisterPushDevice?: ((request: DevicePushRegistrationCommand) => Promise<void>) | undefined;
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  pushDeviceIdentity?: PushDeviceIdentity | undefined;
  repository: CaptureRepository;
  session?: SessionContextResponse | undefined;
  syncEngine?: SyncEngine | undefined;
}) {
  const [pushState, setPushState] = useState<AlertChannelState>("not_requested");
  const [storedPermissionStatus, setStoredPermissionStatus] =
    useState<Parameters<typeof pushReadinessFor>[0]["storedPermissionStatus"]>(null);
  const [pushFeedback, setPushFeedback] = useState<string | undefined>();
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<OfflineCacheStatus | undefined>();
  const [syncQueue, setSyncQueue] = useState<SyncQueueSummaryRecord | undefined>();
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictRecord | undefined>();
  const [syncFeedback, setSyncFeedback] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUpdateStep, setShowUpdateStep] = useState(false);
  const [showSignOutConfirmation, setShowSignOutConfirmation] = useState(false);
  const readiness = pushReadinessFor({ channelState: pushState, storedPermissionStatus });
  const syncReadiness = syncReadinessFor({
    prepareTurnCacheStatus,
    prepareTurnSource,
    offlineStatus,
    queue: syncQueue,
    now: now(),
  });
  const firstConflictId = syncQueue?.commands.find(
    (command) => command.state === "sync_conflict" && command.conflictId !== undefined,
  )?.conflictId;
  const syncActionLabel =
    syncReadiness.pendingCount > 0 || syncReadiness.conflictCount > 0
      ? "Sincronizar pendencias"
      : "Conferir fila local";

  async function refreshPushState(): Promise<void> {
    const [registration, permission] = await Promise.all([
      repository.loadAlertChannelState(),
      alertChannel?.getPermissionState().catch(() => ({ state: "unavailable" as const })),
    ]);

    setStoredPermissionStatus(registration?.permissionStatus ?? null);
    setPushState(
      registration === null
        ? (permission?.state ?? "unavailable")
        : alertChannelStateForRegistration(registration),
    );
  }

  useEffect(() => {
    void refreshPushState();
  }, [repository, alertChannel]);

  async function refreshSyncState(): Promise<SyncQueueSummaryRecord> {
    const [cacheStatus, queue] = await Promise.all([
      repository.loadOfflineCacheStatus(),
      repository.listSyncQueue(),
    ]);

    setOfflineStatus(cacheStatus);
    setSyncQueue(queue);
    return queue;
  }

  useEffect(() => {
    void refreshSyncState();
  }, [repository]);

  async function manualSync(): Promise<void> {
    if (
      (syncEngine === undefined && repository.syncPendingCentralLots === undefined) ||
      isSyncing
    ) {
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(undefined);

    try {
      await onConfirmCentralDeviceState?.().catch(() => undefined);
      const [syncedLots, result] = await Promise.all([
        repository.syncPendingCentralLots === undefined
          ? Promise.resolve([])
          : repository.syncPendingCentralLots(),
        syncEngine === undefined
          ? Promise.resolve(undefined)
          : syncEngine.syncPendingCommands({ manual: true }),
      ]);
      const queueAfterSync = await refreshSyncState();
      await onConfirmCentralDeviceState?.().catch(() => undefined);
      const hasRemainingPending = queueAfterSync.totalCount > 0;

      if (syncedLots.length > 0) {
        setSyncFeedback(
          "Lote enviado para a central. Atualize a leitura central e confira Hoje novamente.",
        );
      } else if (result?.state === "sent" && result.appliedResults.length > 0) {
        setSyncFeedback(
          hasRemainingPending
            ? "Pendencias enviadas, mas ainda existe lote salvo neste aparelho aguardando a central."
            : "Pendencias enviadas. Confira se a central ainda aponta algum bloqueio.",
        );
      } else if (result?.state === "skipped_offline" || result?.state === "transport_failed") {
        setSyncFeedback(
          "Nao foi possivel sincronizar agora. As acoes continuam salvas neste aparelho.",
        );
      } else if (hasRemainingPending) {
        setSyncFeedback(
          "Ainda existe lote salvo neste aparelho aguardando a central. Se o produto estiver em revisao, ele sera enviado depois da validacao.",
        );
      } else if (
        result === undefined ||
        result.state === "empty" ||
        result.state === "skipped_degraded"
      ) {
        setSyncFeedback("Fila local conferida. Nao havia pendencia para enviar.");
      }
    } catch (error) {
      setSyncFeedback(
        pendingCentralLotSyncFeedback(error) ??
          "Nao foi possivel sincronizar agora. As acoes continuam salvas neste aparelho.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  async function reviewConflict(conflictId: string): Promise<void> {
    const conflict = await repository.loadSyncConflict(conflictId);
    setSelectedConflict(conflict ?? undefined);
  }

  async function resolveConflict(input: {
    action: SyncConflictRecord["allowedActions"][number];
    reason?: string | undefined;
  }): Promise<void> {
    if (selectedConflict === undefined) {
      return;
    }

    await repository.resolveSyncConflict({
      conflictId: selectedConflict.id,
      action: input.action,
      resolvedAt: now().toISOString(),
      ...(input.reason === undefined ? {} : { reason: input.reason }),
    });
    setSelectedConflict(undefined);
    setSyncFeedback("Conflito atualizado. Sincronize novamente se ainda houver pendencia.");
    await refreshSyncState();
  }

  async function registerAlertDevice(
    command: DevicePushRegistrationCommand,
  ): Promise<DevicePushRegistrationCommand> {
    const registration = await repository.registerAlertDevice(command);
    if (onRegisterPushDevice !== undefined) {
      await onRegisterPushDevice(registration).catch(() => undefined);
    }

    return registration;
  }

  async function activateAlerts(): Promise<void> {
    if (alertChannel === undefined || isUpdatingPush) return;

    setIsUpdatingPush(true);
    setPushFeedback(undefined);

    try {
      const permission = await alertChannel.requestPermission();
      const registeredAt = now().toISOString();

      if (permission.state !== "active") {
        const permissionStatus = permission.state === "denied" ? "denied" : "unavailable";
        await registerAlertDevice({
          ...pushDeviceIdentity,
          permissionStatus,
          registeredAt,
        });
        setPushFeedback(ajustesSafePushFeedback(permission.reason));
        await refreshPushState();
        return;
      }

      const token = await alertChannel.getExpoPushToken();

      if (token.state !== "active" || token.expoPushToken === undefined) {
        await registerAlertDevice({
          ...pushDeviceIdentity,
          permissionStatus: "local_only",
          registeredAt,
        });
        setPushFeedback(ajustesSafePushFeedback(token.reason ?? todayLocalOnlyFeedback()));
        await refreshPushState();
        return;
      }

      await registerAlertDevice({
        ...pushDeviceIdentity,
        permissionStatus: "granted",
        expoPushToken: token.expoPushToken,
        registeredAt,
      });
      setPushFeedback(ajustesSafePushFeedback("Alertas do turno ativos neste aparelho."));
      await refreshPushState();
    } catch {
      setPushState("failed");
      setPushFeedback(ajustesSafePushFeedback(undefined));
    } finally {
      setIsUpdatingPush(false);
    }
  }

  async function disableAlerts(): Promise<void> {
    setIsUpdatingPush(true);
    setPushFeedback(undefined);
    try {
      await registerAlertDevice({
        ...pushDeviceIdentity,
        permissionStatus: "denied",
        registeredAt: now().toISOString(),
      });
      setPushFeedback(ajustesPushCopy.disabledBody);
      await refreshPushState();
    } finally {
      setIsUpdatingPush(false);
    }
  }

  async function sendThisDeviceTest(): Promise<void> {
    if (alertChannel === undefined || isUpdatingPush) return;

    setIsUpdatingPush(true);
    setPushFeedback(undefined);
    try {
      const attemptedAt = now().toISOString();
      const result = await alertChannel.scheduleTaskNotification({
        command: {
          attemptId: `ajustes-safe-test-${Date.parse(attemptedAt)}`,
          taskId: "ajustes-safe-test",
          taskActiveKey: "ajustes-safe-test",
          audience: "shift_team",
          title: "Teste do Validade Zero",
          body: "Teste de alerta neste aparelho. Nao resolve tarefas nem prova area de venda.",
          data: {
            taskId: "ajustes-safe-test",
            taskActiveKey: "ajustes-safe-test",
          },
          createdAt: attemptedAt,
        },
      });
      setPushFeedback(
        result.attemptState === "pending"
          ? ajustesPushCopy.thisDeviceOnly
          : ajustesPushCopy.localUnavailable,
      );
    } catch {
      setPushFeedback(ajustesPushCopy.localUnavailable);
    } finally {
      setIsUpdatingPush(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Ajustes"
        body="Confira se este aparelho, a conta e a sincronizacao estao prontos antes de voltar para a operacao."
      />

      <View style={styles.identityCard}>
        <Text style={styles.cardTitle}>Conta e loja</Text>
        <Text style={styles.body}>
          {session?.actor.displayName ?? "Pessoa da operacao"} -{" "}
          {session?.store.storeName ?? "Loja local"}
        </Text>
        <View style={styles.metricGrid}>
          <ReadinessRow label="Loja" value={session?.store.storeName ?? "Loja local"} />
          <ReadinessRow label="ID da loja" value={session?.store.storeId ?? "local-device"} />
          <ReadinessRow label="Papel" value={roleLabel(session?.activeRole)} />
          <ReadinessRow label="Conta" value={accountStatusLabel(session?.accountStatus)} />
          <ReadinessRow label="Sessao expira" value={session?.sessionExpiresAt ?? "Sessao local"} />
        </View>
        <Text style={styles.metadata}>
          Se loja ou papel estiver errado, fale com lideranca ou administracao. Esta fase nao troca
          loja manualmente.
        </Text>
      </View>

      <StatusNotice title="Este aparelho esta pronto para operar?" tone="warning">
        Ha um ponto que precisa de revisao, mas as tarefas continuam visiveis em Hoje.
      </StatusNotice>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{ajustesPushCopy.title}</Text>
          <ReadinessBadge status={readiness.verdict} />
        </View>
        <Text style={styles.body}>{ajustesPushCopy.safeBody}</Text>
        <Text style={styles.body}>{readiness.body}</Text>
        {pushFeedback === undefined ? null : <StatusNotice>{pushFeedback}</StatusNotice>}
        <View style={styles.actionStack}>
          <PrimaryAction
            disabled={isUpdatingPush || alertChannel === undefined}
            label={
              readiness.primaryActionLabel === ajustesPushCopy.activate
                ? ajustesPushCopy.activate
                : readiness.primaryActionLabel
            }
            onPress={() => {
              if (readiness.primaryActionLabel === ajustesPushCopy.activate) {
                void activateAlerts();
                return;
              }
              if (readiness.primaryActionLabel === ajustesPushCopy.testThisDevice) {
                void sendThisDeviceTest();
                return;
              }
              void activateAlerts();
            }}
          />
          {readiness.secondaryActionLabel === undefined ? null : (
            <SecondaryAction
              disabled={isUpdatingPush}
              label={readiness.secondaryActionLabel}
              onPress={() => void disableAlerts()}
            />
          )}
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{ajustesSyncCopy.title}</Text>
          <ReadinessBadge status={syncReadiness.verdict} />
        </View>
        <Text style={styles.body}>{syncReadiness.body}</Text>
        <View style={styles.metricGrid}>
          <ReadinessRow
            label={ajustesSyncCopy.centralReadLabel}
            value={syncReadiness.lastCentralReadValue}
          />
          <ReadinessRow
            label={ajustesSyncCopy.syncSendLabel}
            value={syncReadiness.lastSyncSendValue}
          />
          <ReadinessRow label="Pendencias neste aparelho" value={`${syncReadiness.pendingCount}`} />
          <ReadinessRow label="Conflitos" value={`${syncReadiness.conflictCount}`} />
        </View>
        <Text style={styles.metadata}>
          {syncReadiness.safeCloseBlocked
            ? ajustesSyncCopy.blockedSafeClose
            : ajustesSyncCopy.clearSafeClose}
        </Text>
        {syncFeedback === undefined ? null : <StatusNotice>{syncFeedback}</StatusNotice>}
        <View style={styles.actionStack}>
          {syncReadiness.centralRefreshRequired && onRequestCentralRefresh !== undefined ? (
            <PrimaryAction
              label={ajustesSyncCopy.refreshCentralRead}
              onPress={onRequestCentralRefresh}
            />
          ) : (
            <PrimaryAction
              disabled={
                isSyncing ||
                (syncEngine === undefined && repository.syncPendingCentralLots === undefined)
              }
              label={isSyncing ? "Conferindo fila local" : syncActionLabel}
              onPress={() => void manualSync()}
            />
          )}
          {syncReadiness.centralRefreshRequired &&
          (syncEngine !== undefined || repository.syncPendingCentralLots !== undefined) ? (
            <SecondaryAction
              disabled={isSyncing}
              label={isSyncing ? "Conferindo fila local" : syncActionLabel}
              onPress={() => void manualSync()}
            />
          ) : null}
          {firstConflictId === undefined ? null : (
            <SecondaryAction
              label="Revisar conflito"
              onPress={() => void reviewConflict(firstConflictId)}
            />
          )}
        </View>
      </View>
      {selectedConflict === undefined ? null : (
        <SyncConflictPanel
          conflict={selectedConflict}
          onClose={() => setSelectedConflict(undefined)}
          onResolve={(input) => void resolveConflict(input)}
        />
      )}
      <SyncQueueSummary
        disabled={
          isSyncing || (syncEngine === undefined && repository.syncPendingCentralLots === undefined)
        }
        queue={syncQueue}
        onRetry={() => void manualSync()}
        onReviewConflict={(conflictId) => void reviewConflict(conflictId)}
      />
      <BuildUpdateCard
        buildInfo={buildInfo}
        showUpdateStep={showUpdateStep}
        onToggleUpdateStep={() => setShowUpdateStep((current) => !current)}
      />
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Privacidade</Text>
          <ReadinessBadge status="Apto" />
        </View>
        <Text style={styles.body}>
          O app usa dados de conta, loja, papel, acoes operacionais, evidencias, sync, permissoes do
          aparelho, build instalado e auditoria para manter riscos visiveis e responder direitos.
        </Text>
        <SecondaryAction
          disabled={authControls === undefined}
          label="Abrir Centro de Privacidade"
          onPress={() => authControls?.openPrivacyCenter()}
        />
      </View>

      <View style={[styles.card, styles.signOutCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Sair com pendencias visiveis</Text>
          <ReadinessBadge status={syncReadiness.pendingCount > 0 ? "Atencao" : "Apto"} />
        </View>
        <Text style={styles.body}>
          Sair nao sincroniza, nao resolve tarefas e nao limpa conflitos deste aparelho.
        </Text>
        <Text style={styles.metadata}>
          Pendencias: {syncReadiness.pendingCount}. Conflitos: {syncReadiness.conflictCount}.
        </Text>
        {showSignOutConfirmation ? (
          <View style={styles.confirmationPanel}>
            <StatusNotice tone="warning">
              Sair encerra a sessao neste aparelho. Pendencias locais ou conflitos continuam
              pendentes e nenhuma tarefa sera resolvida.
            </StatusNotice>
            <SecondaryAction
              label="Continuar nos Ajustes"
              onPress={() => setShowSignOutConfirmation(false)}
            />
            <DestructiveAction
              disabled={authControls === undefined}
              label="Confirmar saida da conta"
              onPress={() => authControls?.requestLogout()}
            />
          </View>
        ) : (
          <DestructiveAction
            disabled={authControls === undefined}
            label="Sair da conta"
            onPress={() => setShowSignOutConfirmation(true)}
          />
        )}
      </View>

      <SecondaryAction label="Voltar para operacao" onPress={onBack} />
    </ScrollView>
  );
}

function BuildUpdateCard({
  buildInfo,
  onToggleUpdateStep,
  showUpdateStep,
}: {
  buildInfo?: MobileBuildInfo | undefined;
  onToggleUpdateStep: () => void;
  showUpdateStep: boolean;
}) {
  const compatibility = buildInfo?.buildCompatibility ?? "desconhecido";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Atualizacao do app</Text>
        <ReadinessBadge status={buildReadinessStatus(compatibility)} />
      </View>
      <Text style={styles.body}>
        Instalado: {buildInfo?.appVersion ?? "nao informado"} (
        {buildInfo?.appBuild ?? "nao informado"}). Compatibilidade: {compatibility}.
      </Text>
      <View style={styles.metricGrid}>
        <ReadinessRow
          label="Aprovado"
          value={`${buildInfo?.approvedAppVersion ?? "0.12.0"} (${buildInfo?.approvedBuild ?? "136"})`}
        />
        <ReadinessRow
          label="Artefato aprovado"
          value={buildInfo?.approvedArtifactLabel ?? "uat15-sync-debug-apk-136"}
        />
        <ReadinessRow label="Ambiente" value={buildInfo?.environment ?? "desconhecido"} />
        <ReadinessRow label="API:" value={buildInfo?.apiTarget ?? "API nao informada"} />
        <ReadinessRow label="Pacote:" value={buildInfo?.packageId ?? "nao informado"} />
      </View>
      {showUpdateStep ? (
        <StatusNotice>
          Instale manualmente o APK aprovado do piloto e abra Ajustes novamente para conferir se o
          instalado ficou igual ao aprovado.
        </StatusNotice>
      ) : null}
      <SecondaryAction label="Ver passo de atualizacao" onPress={onToggleUpdateStep} />
    </View>
  );
}

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function todayLocalOnlyFeedback(): string {
  return "Lembretes locais do turno ativos neste aparelho. O push remoto ainda precisa do APK aprovado.";
}

function ajustesSafePushFeedback(reason: string | undefined): string {
  return operatorSafePushFeedback(reason).replace(/Firebase/gi, "provedor de push");
}

function ReadinessBadge({ status }: { status: "Apto" | "Atencao" | "Bloqueado" }) {
  return (
    <Text
      style={[
        styles.status,
        status === "Apto" ? styles.statusReady : undefined,
        status === "Bloqueado" ? styles.statusBlocked : undefined,
      ]}
    >
      {status}
    </Text>
  );
}

function roleLabel(role: SessionContextResponse["activeRole"] | undefined): string {
  if (role === "admin") return "Administracao";
  if (role === "lead") return "Lideranca";
  if (role === "collaborator") return "Operacao";
  return "Sessao ativa";
}

function accountStatusLabel(status: SessionContextResponse["accountStatus"] | undefined): string {
  if (status === "active") return "Conta ativa";
  if (status === "blocked") return "Conta bloqueada";
  if (status === "revoked") return "Acesso revogado";
  if (status === "recovery_pending") return "Recuperacao pendente";
  return "Conta local";
}

function buildReadinessStatus(
  compatibility: MobileBuildInfo["buildCompatibility"] | "desconhecido",
): "Apto" | "Atencao" | "Bloqueado" {
  if (compatibility === "atual") return "Apto";
  if (compatibility === "incompativel") return "Bloqueado";
  return "Atencao";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  identityCard: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
  },
  card: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
  },
  signOutCard: {
    borderColor: captureColors.warningBorder,
  },
  cardHeader: {
    alignItems: "flex-start",
    gap: captureSpacing.small,
  },
  cardTitle: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
  },
  status: {
    alignSelf: "flex-start",
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    color: captureColors.warningInk,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.xsmall,
  },
  statusReady: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.accent,
    color: captureColors.accent,
  },
  statusBlocked: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
    color: captureColors.critical,
  },
  actionStack: {
    gap: captureSpacing.small,
  },
  confirmationPanel: {
    gap: captureSpacing.small,
  },
  metricGrid: {
    gap: captureSpacing.small,
  },
  metricRow: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.small,
  },
  metricLabel: {
    color: captureColors.mutedInk,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  metricValue: {
    color: captureColors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  metadata: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
});
