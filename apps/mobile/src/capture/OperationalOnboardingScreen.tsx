import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { PrepareTurnCacheStatus } from "@validade-zero/contracts";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

type OnboardingMode = "first_turn" | "review";

type OnboardingStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  state: "done" | "current" | "next";
};

export function OperationalOnboardingScreen({
  mode = "review",
  prepareTurnCacheStatus,
  prepareTurnSource,
  storeName,
  onBack,
  onRegisterLot,
  onOpenToday,
  onSkip,
}: {
  mode?: OnboardingMode | undefined;
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  storeName?: string | undefined;
  onBack?: (() => void) | undefined;
  onRegisterLot: () => void;
  onOpenToday: () => void;
  onSkip?: (() => void) | undefined;
}) {
  const hasCentralRead =
    prepareTurnSource === "central" &&
    (prepareTurnCacheStatus?.state === "ready" ||
      prepareTurnCacheStatus?.state === "needs_first_central_read");
  const lotCount = prepareTurnCacheStatus?.lotCount ?? 0;
  const activeTaskCount = prepareTurnCacheStatus?.activeTaskCount ?? 0;
  const isFirstTurn = mode === "first_turn";
  const steps = buildSteps({ hasCentralRead, lotCount, activeTaskCount });

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title={isFirstTurn ? "Primeiro turno assistido" : "Primeiros passos"}
        body={
          isFirstTurn
            ? `${storeName ?? "Esta loja"} ainda nao tem uso confirmado neste guia. Comece por um lote real ou pule para Hoje.`
            : "Reveja o caminho operacional quando precisar treinar alguem ou conferir o fluxo."
        }
      />

      <StatusNotice title={isFirstTurn ? "Antes de abrir Hoje" : "Caminho recomendado"} tone="info">
        O valor do guia e fazer a primeira acao real: registrar lote fisico e voltar para Hoje. Zero
        tarefas nunca substitui conferencia fisica da area de venda.
      </StatusNotice>

      <View style={styles.summaryRow}>
        <Metric label="Leitura" value={hasCentralRead ? "central" : "local"} />
        <Metric label="Lotes" value={String(lotCount)} />
        <Metric label="Tarefas" value={String(activeTaskCount)} />
      </View>

      <View style={styles.steps}>
        {steps.map((step) => (
          <View
            key={step.id}
            style={[styles.stepCard, step.state === "current" ? styles.stepCardCurrent : null]}
          >
            <View style={styles.stepTopline}>
              <Text style={styles.stepEyebrow}>{step.eyebrow}</Text>
              <Text style={[styles.stepState, stepStateStyleFor(step.state)]}>
                {stepStateLabelFor(step.state)}
              </Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.body}</Text>
          </View>
        ))}
      </View>

      <PrimaryAction
        label={isFirstTurn ? "Registrar primeiro lote" : "Registrar lote real"}
        onPress={onRegisterLot}
      />
      {isFirstTurn ? (
        <SecondaryAction label="Pular e abrir Hoje" onPress={onSkip ?? onOpenToday} />
      ) : (
        <SecondaryAction label="Abrir Hoje" onPress={onOpenToday} />
      )}
      {onBack === undefined || isFirstTurn ? null : (
        <SecondaryAction label="Voltar para Ajustes" onPress={onBack} />
      )}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function buildSteps(input: {
  hasCentralRead: boolean;
  lotCount: number;
  activeTaskCount: number;
}): readonly OnboardingStep[] {
  return [
    {
      id: "read",
      eyebrow: "1",
      title: "Confirmar a base do turno",
      body: input.hasCentralRead
        ? "A leitura central foi carregada para esta loja. Se ela veio vazia, isso so significa inicio limpo, nao area segura."
        : "Se estiver offline, continue com cuidado e atualize a central antes de fechar turno seguro.",
      state: input.hasCentralRead ? "done" : "current",
    },
    {
      id: "lot",
      eyebrow: "2",
      title: "Registrar o lote fisico encontrado",
      body:
        input.lotCount > 0
          ? "Ja existe lote registrado. O proximo passo e conferir o impacto em Hoje."
          : "Use validade, quantidade e local observado. Esse e o primeiro momento de valor do app.",
      state: input.lotCount > 0 ? "done" : "current",
    },
    {
      id: "today",
      eyebrow: "3",
      title: "Voltar para Hoje",
      body:
        input.activeTaskCount > 0
          ? "Hoje ja tem tarefa ativa. Trate a pendencia antes de qualquer conclusao de area segura."
          : "Depois do registro, Hoje mostra se virou tarefa, radar futuro ou historico sem bloqueio.",
      state: input.lotCount > 0 || input.activeTaskCount > 0 ? "current" : "next",
    },
  ];
}

function stepStateLabelFor(state: OnboardingStep["state"]): string {
  if (state === "done") return "feito";
  if (state === "current") return "agora";
  return "depois";
}

function stepStateStyleFor(state: OnboardingStep["state"]) {
  if (state === "done") return styles.stepStateDone;
  if (state === "current") return styles.stepStateCurrent;
  return styles.stepStateNext;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
    paddingBottom: captureSpacing.xxlarge,
  },
  summaryRow: {
    flexDirection: "row",
    gap: captureSpacing.small,
  },
  metric: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    flex: 1,
    minHeight: 68,
    paddingHorizontal: captureSpacing.medium,
    paddingVertical: captureSpacing.small,
  },
  metricValue: {
    color: captureColors.ink,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },
  metricLabel: {
    color: captureColors.mutedInk,
    fontSize: 12,
    lineHeight: 16,
  },
  steps: {
    gap: captureSpacing.medium,
  },
  stepCard: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
  },
  stepCardCurrent: {
    borderColor: captureColors.accent,
  },
  stepTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepEyebrow: {
    backgroundColor: captureColors.accentSoft,
    borderRadius: captureRadii.small,
    color: captureColors.accent,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    minWidth: 28,
    overflow: "hidden",
    paddingHorizontal: captureSpacing.small,
    paddingVertical: 3,
    textAlign: "center",
  },
  stepState: {
    borderRadius: captureRadii.small,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    overflow: "hidden",
    paddingHorizontal: captureSpacing.small,
    paddingVertical: 2,
  },
  stepStateDone: {
    backgroundColor: captureColors.accentSoft,
    color: captureColors.accent,
  },
  stepStateCurrent: {
    backgroundColor: captureColors.warningSurface,
    color: captureColors.warningInk,
  },
  stepStateNext: {
    backgroundColor: captureColors.surfaceMuted,
    color: captureColors.mutedInk,
  },
  stepTitle: {
    color: captureColors.ink,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },
  stepBody: {
    color: captureColors.mutedInk,
    fontSize: 15,
    lineHeight: 22,
  },
});
