import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { AlertChannelState } from "@validade-zero/domain";
import type {
  OfflineCacheStatus,
  PrepareTurnCacheStatus,
  SessionContextResponse,
  SyncConflictRecord,
  SyncQueueSummary as SyncQueueSummaryRecord,
} from "@validade-zero/contracts";
import type { AuthGateReadyControls } from "../auth/AuthGate";
import type { PushAlertChannel } from "./alert-channel";
import {
  ajustesPushCopy,
  ajustesSyncCopy,
  operatorSafePushFeedback,
  pushReadinessFor,
  syncReadinessFor,
} from "./ajustes-readiness";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { SyncConflictPanel, SyncQueueSummary } from "./offline-sync-ui";
import {
  alertChannelStateForRegistration,
  type CaptureRepository,
} from "./repository";
import type { SyncEngine } from "./sync-engine";

export function AjustesScreen({
  alertChannel,
  onBack,
  now = () => new Date(),
  prepareTurnCacheStatus,
  prepareTurnSource,
  repository,
  session,
  syncEngine,
}: {
  authControls?: AuthGateReadyControls | undefined;
  alertChannel?: PushAlertChannel | undefined;
  now?: (() => Date) | undefined;
  onBack: () => void;
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  repository: CaptureRepository;
  session?: SessionContextResponse | undefined;
  syncEngine?: SyncEngine | undefined;
}) {
  const [pushState, setPushState] = useState<AlertChannelState>("not_requested");
  const [storedPermissionStatus, setStoredPermissionStatus] = useState<
    Parameters<typeof pushReadinessFor>[0]["storedPermissionStatus"]
  >(null);
  const [pushFeedback, setPushFeedback] = useState<string | undefined>();
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<OfflineCacheStatus | undefined>();
  const [syncQueue, setSyncQueue] = useState<SyncQueueSummaryRecord | undefined>();
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictRecord | undefined>();
  const [syncFeedback, setSyncFeedback] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);
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

  async function refreshPushState(): Promise<void> {
    const [registration, permission] = await Promise.all([
      repository.loadAlertChannelState(),
      alertChannel?.getPermissionState().catch(() => ({ state: "unavailable" as const })),
    ]);

    setStoredPermissionStatus(registration?.permissionStatus ?? null);
    setPushState(registration === null ? (permission?.state ?? "unavailable") : alertChannelStateForRegistration(registration));
  }

  useEffect(() => {
    void refreshPushState();
  }, [repository, alertChannel]);

  async function refreshSyncState(): Promise<void> {
    const [cacheStatus, queue] = await Promise.all([
      repository.loadOfflineCacheStatus(),
      repository.listSyncQueue(),
    ]);

    setOfflineStatus(cacheStatus);
    setSyncQueue(queue);
  }

  useEffect(() => {
    void refreshSyncState();
  }, [repository]);

  async function manualSync(): Promise<void> {
    if (syncEngine === undefined || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(undefined);

    try {
      const result = await syncEngine.syncPendingCommands({ manual: true });
      await refreshSyncState();

      if (result.state === "sent" && result.appliedResults.length > 0) {
        setSyncFeedback("Pendencias enviadas. Confira se a central ainda aponta algum bloqueio.");
      } else if (result.state === "empty") {
        setSyncFeedback("Tudo sincronizado neste aparelho.");
      } else if (result.state === "skipped_offline" || result.state === "transport_failed") {
        setSyncFeedback(
          "Nao foi possivel sincronizar agora. As acoes continuam salvas neste aparelho.",
        );
      }
    } catch {
      setSyncFeedback("Nao foi possivel sincronizar agora. As acoes continuam salvas neste aparelho.");
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

  async function activateAlerts(): Promise<void> {
    if (alertChannel === undefined || isUpdatingPush) return;

    setIsUpdatingPush(true);
    setPushFeedback(undefined);

    try {
      const permission = await alertChannel.requestPermission();
      const registeredAt = now().toISOString();

      if (permission.state !== "active") {
        const permissionStatus = permission.state === "denied" ? "denied" : "unavailable";
        await repository.registerAlertDevice({
          deviceId: "local-alert-device",
          deviceLabel: "Celular do turno",
          audienceRole: "shift_team",
          permissionStatus,
          registeredAt,
        });
        setPushFeedback(ajustesSafePushFeedback(permission.reason));
        await refreshPushState();
        return;
      }

      const token = await alertChannel.getExpoPushToken();

      if (token.state !== "active" || token.expoPushToken === undefined) {
        await repository.registerAlertDevice({
          deviceId: "local-alert-device",
          deviceLabel: "Celular do turno",
          audienceRole: "shift_team",
          permissionStatus: "local_only",
          registeredAt,
        });
        setPushFeedback(ajustesSafePushFeedback(token.reason ?? todayLocalOnlyFeedback()));
        await refreshPushState();
        return;
      }

      await repository.registerAlertDevice({
        deviceId: "local-alert-device",
        deviceLabel: "Celular do turno",
        audienceRole: "shift_team",
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
      await repository.registerAlertDevice({
        deviceId: "local-alert-device",
        deviceLabel: "Celular do turno",
        audienceRole: "shift_team",
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
        <Text style={styles.metadata}>Papel: {roleLabel(session?.activeRole)}</Text>
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
          <PrimaryAction
            disabled={isSyncing || syncEngine === undefined}
            label={isSyncing ? "Sincronizando pendencias" : "Sincronizar pendencias"}
            onPress={() => void manualSync()}
          />
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
        disabled={isSyncing || syncEngine === undefined}
        queue={syncQueue}
        onRetry={() => void manualSync()}
        onReviewConflict={(conflictId) => void reviewConflict(conflictId)}
      />
      <ReadinessCard
        title="Atualizacao do app"
        status="Atencao"
        body="A versao instalada sera comparada com o APK aprovado do piloto."
      />
      <ReadinessCard
        title="Privacidade e conta"
        status="Apto"
        body="Controles de privacidade, conta e saida ficam reunidos neste aparelho."
      />

      <SecondaryAction label="Voltar para operacao" onPress={onBack} />
    </ScrollView>
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

function ReadinessCard({
  body,
  status,
  title,
}: {
  body: string;
  status: "Apto" | "Atencao" | "Bloqueado";
  title: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <ReadinessBadge status={status} />
      </View>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
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
