import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { SessionContextResponse } from "@validade-zero/contracts";
import type { AuthGateReadyControls } from "../auth/AuthGate";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import { ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";

export function AjustesScreen({
  onBack,
  session,
}: {
  authControls?: AuthGateReadyControls | undefined;
  onBack: () => void;
  session?: SessionContextResponse | undefined;
}) {
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

      <ReadinessCard
        title="Push e lembretes"
        status="Atencao"
        body="Alertas ajudam a cobrar, mas nao resolvem tarefas nem provam a area de venda."
      />
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
        <Text style={[styles.status, status === "Apto" ? styles.statusReady : undefined]}>
          {status}
        </Text>
      </View>
      <Text style={styles.body}>{body}</Text>
    </View>
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
