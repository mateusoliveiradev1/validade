import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  ScreenSection,
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

type AjustesPanel = "operacao" | "conta" | "sistema";

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
  onOpenOnboarding,
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
  onOpenOnboarding?: (() => void) | undefined;
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
  const [activePanel, setActivePanel] = useState<AjustesPanel>("operacao");
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
  const deviceReadiness = worstReadiness(readiness.verdict, syncReadiness.verdict);
  const readinessNoticeTone = statusNoticeToneFor(deviceReadiness);
  const readinessTitle =
    deviceReadiness === "Apto"
      ? "Pronto para operar"
      : deviceReadiness === "Bloqueado"
        ? "Acao necessaria"
        : "Revisar antes de fechar";
  const readinessNoticeBody =
    deviceReadiness === "Apto"
      ? "Este aparelho esta pronto para seguir a operacao. Alertas ajudam, mas Hoje continua sendo a fila de trabalho."
      : deviceReadiness === "Bloqueado"
        ? "Ha bloqueio operacional que precisa de acao antes de declarar area segura."
        : "Ha um ponto que precisa de revisao, mas as tarefas continuam visiveis em Hoje.";

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
      const hadPendingBeforeCentralRefresh =
        syncReadiness.pendingCount > 0 || (syncQueue?.totalCount ?? 0) > 0;
      await onConfirmCentralDeviceState?.().catch(() => undefined);
      const queueAfterCentralRefresh = await refreshSyncState();

      if (hadPendingBeforeCentralRefresh && queueAfterCentralRefresh.totalCount === 0) {
        setSyncFeedback("Leitura central conferida. A fila local foi reconciliada.");
        return;
      }

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
      await onConfirmCentralDeviceState?.().catch(() => undefined);
      const queueAfterFailedSync = await refreshSyncState();
      if (queueAfterFailedSync.totalCount === 0) {
        setSyncFeedback("Leitura central conferida. A fila local foi reconciliada.");
      }
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
        body="Controle este aparelho sem misturar com a fila de Hoje."
      />

      <ScreenSection
        title="Painel do aparelho"
        body="Veja o estado do turno e escolha o que precisa ajustar."
      >
        <View style={styles.readinessHero}>
          <View style={styles.readinessHeroCopy}>
            <Text style={styles.readinessEyebrow}>Status agora</Text>
            <Text style={styles.readinessTitle}>{readinessTitle}</Text>
          </View>
          <ReadinessBadge status={deviceReadiness} />
        </View>
        <View style={styles.overviewGrid}>
          <CompactMetric
            value={syncReadiness.pendingCount}
            label="pendencias locais"
            tone={syncReadiness.pendingCount > 0 ? "warning" : "success"}
          />
          <CompactMetric
            value={syncReadiness.conflictCount}
            label="conflitos"
            tone={syncReadiness.conflictCount > 0 ? "critical" : "success"}
          />
        </View>
      </ScreenSection>

      <View style={styles.panelTabs}>
        <PanelTab
          label="Operacao"
          selected={activePanel === "operacao"}
          onPress={() => setActivePanel("operacao")}
        />
        <PanelTab
          label="Conta"
          selected={activePanel === "conta"}
          onPress={() => setActivePanel("conta")}
        />
        <PanelTab
          label="Sistema"
          selected={activePanel === "sistema"}
          onPress={() => setActivePanel("sistema")}
        />
      </View>

      {activePanel === "conta" ? (
        <View style={styles.identityCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardTitle}>Conta e loja</Text>
              <Text style={styles.metadata}>
                {session?.actor.displayName ?? "Pessoa da operacao"} -{" "}
                {session?.store.storeName ?? "Loja local"}
              </Text>
            </View>
            <ReadinessBadge status="Apto" />
          </View>
          <View style={styles.metricGrid}>
            <ReadinessRow label="Loja" value={session?.store.storeName ?? "Loja local"} />
            <ReadinessRow label="ID da loja" value={session?.store.storeId ?? "local-device"} />
            <ReadinessRow label="Papel" value={roleLabel(session?.activeRole)} />
            <ReadinessRow label="Conta" value={accountStatusLabel(session?.accountStatus)} />
            <ReadinessRow
              label="Sessao expira"
              value={formatSessionExpiresAt(session?.sessionExpiresAt)}
            />
          </View>
          <Text style={styles.metadata}>
            Se loja ou papel estiver errado, fale com lideranca ou administracao. Esta fase nao
            troca loja manualmente.
          </Text>
        </View>
      ) : null}

      {activePanel === "operacao" ? (
        <>
          <View style={styles.readinessList}>
            <ReadinessLine
              label="Sincronizacao"
              status={syncReadiness.verdict}
              detail={
                syncReadiness.safeCloseBlocked
                  ? "Bloqueia fechamento seguro"
                  : "Nao bloqueia fechamento seguro"
              }
            />
            <ReadinessLine label="Alertas" status={readiness.verdict} detail={readiness.body} />
            <ReadinessLine
              label="Operacao"
              status={deviceReadiness}
              detail="Hoje continua sendo a fila de trabalho."
            />
          </View>

          <StatusNotice title={readinessTitle} tone={readinessNoticeTone}>
            {readinessNoticeBody}
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
              <ReadinessRow
                label="Pendencias neste aparelho"
                value={`${syncReadiness.pendingCount}`}
              />
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
              isSyncing ||
              (syncEngine === undefined && repository.syncPendingCentralLots === undefined)
            }
            queue={syncQueue}
            showRetryAction={false}
            title="Fila local neste aparelho"
            onReviewConflict={(conflictId) => void reviewConflict(conflictId)}
          />
        </>
      ) : null}

      {activePanel === "sistema" ? (
        <BuildUpdateCard
          buildInfo={buildInfo}
          showUpdateStep={showUpdateStep}
          onToggleUpdateStep={() => setShowUpdateStep((current) => !current)}
        />
      ) : null}

      {activePanel === "conta" ? (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Privacidade</Text>
              <ReadinessBadge status="Apto" />
            </View>
            <Text style={styles.body}>
              O app usa dados de conta, loja, papel, acoes operacionais, evidencias, sync,
              permissoes do aparelho, build instalado e auditoria para manter riscos visiveis e
              responder direitos.
            </Text>
            <SecondaryAction
              disabled={authControls === undefined}
              label="Abrir Centro de Privacidade"
              onPress={() => authControls?.openPrivacyCenter()}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Primeiros passos</Text>
              <ReadinessBadge status="Apto" />
            </View>
            <Text style={styles.body}>
              Reabra o primeiro turno assistido para treinar a equipe ou revisar o caminho de lote,
              Hoje e fechamento seguro.
            </Text>
            <SecondaryAction
              disabled={onOpenOnboarding === undefined}
              label="Rever primeiros passos"
              onPress={() => onOpenOnboarding?.()}
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
        </>
      ) : null}

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
          value={`${buildInfo?.approvedAppVersion ?? "0.12.0"} (${buildInfo?.approvedBuild ?? "150"})`}
        />
        <ReadinessRow
          label="Artefato aprovado"
          value={buildInfo?.approvedArtifactLabel ?? "uat41-visual-flow-polish-apk-171"}
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

function PanelTab({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`Abrir ${label}`}
      accessibilityState={{ selected }}
      android_ripple={{ color: captureColors.surfacePressed }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.panelTab,
        selected ? styles.panelTabSelected : undefined,
        pressed ? styles.panelTabPressed : undefined,
      ]}
    >
      <Text style={[styles.panelTabLabel, selected ? styles.panelTabLabelSelected : undefined]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CompactMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "success" | "warning" | "critical";
  value: number;
}) {
  return (
    <View
      style={[
        styles.compactMetric,
        tone === "success" ? styles.compactMetricSuccess : undefined,
        tone === "warning" ? styles.compactMetricWarning : undefined,
        tone === "critical" ? styles.compactMetricCritical : undefined,
      ]}
    >
      <Text
        style={[
          styles.compactMetricValue,
          tone === "success" ? styles.compactMetricSuccessText : undefined,
          tone === "warning" ? styles.compactMetricWarningText : undefined,
          tone === "critical" ? styles.compactMetricCriticalText : undefined,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.compactMetricLabel}>{label}</Text>
    </View>
  );
}

function ReadinessLine({
  detail,
  label,
  status,
}: {
  detail: string;
  label: string;
  status: "Apto" | "Atencao" | "Bloqueado";
}) {
  return (
    <View style={styles.readinessLine}>
      <View style={styles.readinessLineCopy}>
        <Text style={styles.readinessLineLabel}>{label}</Text>
        <Text style={styles.readinessLineDetail}>{detail}</Text>
      </View>
      <ReadinessBadge status={status} />
    </View>
  );
}

function todayLocalOnlyFeedback(): string {
  return "Lembretes locais do turno ativos neste aparelho. O push remoto ainda precisa do APK aprovado.";
}

function ajustesSafePushFeedback(reason: string | undefined): string {
  return operatorSafePushFeedback(reason).replace(/Firebase/gi, "provedor de push");
}

function ReadinessBadge({
  labelPrefix,
  status,
}: {
  labelPrefix?: string | undefined;
  status: "Apto" | "Atencao" | "Bloqueado";
}) {
  return (
    <Text
      style={[
        styles.status,
        status === "Apto" ? styles.statusReady : undefined,
        status === "Bloqueado" ? styles.statusBlocked : undefined,
      ]}
    >
      {labelPrefix === undefined ? status : `${labelPrefix}: ${status}`}
    </Text>
  );
}

function roleLabel(role: SessionContextResponse["activeRole"] | undefined): string {
  if (role === "gpp") return "GPP";
  if (role === "admin") return "Administracao";
  if (role === "lead") return "Lideranca";
  if (role === "collaborator") return "Setor";
  return "Sessao ativa";
}

function accountStatusLabel(status: SessionContextResponse["accountStatus"] | undefined): string {
  if (status === "active") return "Conta ativa";
  if (status === "blocked") return "Conta bloqueada";
  if (status === "revoked") return "Acesso revogado";
  if (status === "recovery_pending") return "Recuperacao pendente";
  return "Conta local";
}

function formatSessionExpiresAt(value: string | undefined): string {
  if (value === undefined) return "Sessao local";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function buildReadinessStatus(
  compatibility: MobileBuildInfo["buildCompatibility"] | "desconhecido",
): "Apto" | "Atencao" | "Bloqueado" {
  if (compatibility === "atual") return "Apto";
  if (compatibility === "incompativel") return "Bloqueado";
  return "Atencao";
}

function worstReadiness(
  first: "Apto" | "Atencao" | "Bloqueado",
  second: "Apto" | "Atencao" | "Bloqueado",
): "Apto" | "Atencao" | "Bloqueado" {
  if (first === "Bloqueado" || second === "Bloqueado") return "Bloqueado";
  if (first === "Atencao" || second === "Atencao") return "Atencao";
  return "Apto";
}

function statusNoticeToneFor(
  status: "Apto" | "Atencao" | "Bloqueado",
): "success" | "warning" | "critical" {
  if (status === "Apto") return "success";
  if (status === "Bloqueado") return "critical";
  return "warning";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
    paddingBottom: captureSpacing.xxlarge * 3,
  },
  overviewGrid: {
    flexDirection: "row",
    gap: captureSpacing.small,
  },
  panelTabs: {
    backgroundColor: captureColors.surfaceRaised,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: captureSpacing.xsmall,
    padding: captureSpacing.xsmall,
  },
  panelTab: {
    alignItems: "center",
    borderRadius: captureRadii.small,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.small,
  },
  panelTabPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  panelTabSelected: {
    backgroundColor: captureColors.accent,
  },
  panelTabLabel: {
    color: captureColors.mutedInk,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  panelTabLabelSelected: {
    color: captureColors.onAccent,
  },
  compactMetric: {
    alignItems: "center",
    backgroundColor: captureColors.surfaceRaised,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: captureSpacing.small,
    minHeight: 52,
    paddingHorizontal: captureSpacing.medium,
    paddingVertical: captureSpacing.small,
  },
  compactMetricSuccess: {
    backgroundColor: captureColors.accentSurface,
    borderColor: captureColors.accent,
  },
  compactMetricWarning: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  compactMetricCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  compactMetricValue: {
    color: captureColors.ink,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  compactMetricLabel: {
    color: captureColors.mutedInk,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  compactMetricSuccessText: {
    color: captureColors.accent,
  },
  compactMetricWarningText: {
    color: captureColors.warningInk,
  },
  compactMetricCriticalText: {
    color: captureColors.critical,
  },
  readinessHero: {
    alignItems: "center",
    backgroundColor: captureColors.surfaceRaised,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: captureSpacing.medium,
    justifyContent: "space-between",
    padding: captureSpacing.medium,
  },
  readinessHeroCopy: {
    flex: 1,
    gap: 2,
  },
  readinessEyebrow: {
    color: captureColors.mutedInk,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  readinessTitle: {
    color: captureColors.ink,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  readinessList: {
    backgroundColor: captureColors.surfaceRaised,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    overflow: "hidden",
  },
  readinessLine: {
    alignItems: "center",
    borderBottomColor: captureColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: captureSpacing.medium,
    justifyContent: "space-between",
    paddingHorizontal: captureSpacing.medium,
    paddingVertical: captureSpacing.small,
  },
  readinessLineCopy: {
    flex: 1,
    gap: 2,
  },
  readinessLineLabel: {
    color: captureColors.ink,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  readinessLineDetail: {
    color: captureColors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
  },
  badgeRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: captureSpacing.small,
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
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  signOutCard: {
    borderColor: captureColors.warningBorder,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: captureSpacing.medium,
    justifyContent: "space-between",
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: captureColors.ink,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  status: {
    alignSelf: "flex-start",
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    color: captureColors.warningInk,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
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
    backgroundColor: captureColors.surfaceRaised,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    overflow: "hidden",
  },
  metricRow: {
    alignItems: "flex-start",
    borderBottomColor: captureColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: captureSpacing.medium,
    justifyContent: "space-between",
    paddingHorizontal: captureSpacing.medium,
    paddingVertical: captureSpacing.small,
  },
  metricLabel: {
    color: captureColors.mutedInk,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    minWidth: 96,
  },
  metricValue: {
    color: captureColors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
  },
  body: {
    color: captureColors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  metadata: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
});
