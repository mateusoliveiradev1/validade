import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { AlertChannelState } from "@validade-zero/domain";
import type { SessionContextResponse } from "@validade-zero/contracts";
import type { AuthGateReadyControls } from "../auth/AuthGate";
import type { PushAlertChannel } from "./alert-channel";
import {
  ajustesPushCopy,
  operatorSafePushFeedback,
  pushReadinessFor,
} from "./ajustes-readiness";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import {
  alertChannelStateForRegistration,
  type CaptureRepository,
} from "./repository";

export function AjustesScreen({
  alertChannel,
  onBack,
  now = () => new Date(),
  repository,
  session,
}: {
  authControls?: AuthGateReadyControls | undefined;
  alertChannel?: PushAlertChannel | undefined;
  now?: (() => Date) | undefined;
  onBack: () => void;
  repository: CaptureRepository;
  session?: SessionContextResponse | undefined;
}) {
  const [pushState, setPushState] = useState<AlertChannelState>("not_requested");
  const [storedPermissionStatus, setStoredPermissionStatus] = useState<
    Parameters<typeof pushReadinessFor>[0]["storedPermissionStatus"]
  >(null);
  const [pushFeedback, setPushFeedback] = useState<string | undefined>();
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const readiness = pushReadinessFor({ channelState: pushState, storedPermissionStatus });

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
      <ReadinessCard
        title="Sincronizacao"
        status="Atencao"
        body="Ultima leitura central e ultima sincronizacao enviada aparecem separadas aqui."
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
