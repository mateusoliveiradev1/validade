import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { PrepareTurnCacheStatus } from "@validade-zero/contracts";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

type OnboardingStepStatus = "done" | "current" | "next";

type OnboardingStep = {
  id: string;
  number: string;
  title: string;
  body: string;
  status: OnboardingStepStatus;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
};

export function OperationalOnboardingScreen({
  prepareTurnCacheStatus,
  prepareTurnSource,
  onBack,
  onRegisterLot,
  onOpenToday,
}: {
  prepareTurnCacheStatus?: PrepareTurnCacheStatus | null | undefined;
  prepareTurnSource?: "central" | "local_cache" | undefined;
  onBack: () => void;
  onRegisterLot: () => void;
  onOpenToday: () => void;
}) {
  const hasCentralRead =
    prepareTurnSource === "central" &&
    (prepareTurnCacheStatus?.state === "ready" ||
      prepareTurnCacheStatus?.state === "needs_first_central_read");
  const isFirstStoreSetup =
    prepareTurnCacheStatus?.productCount === 0 &&
    prepareTurnCacheStatus.lotCount === 0 &&
    prepareTurnCacheStatus.activeTaskCount === 0;
  const activeTaskCount = prepareTurnCacheStatus?.activeTaskCount ?? 0;
  const lotCount = prepareTurnCacheStatus?.lotCount ?? 0;

  const steps: readonly OnboardingStep[] = [
    {
      id: "invite",
      number: "1",
      title: "Entrar com convite ativo",
      body: "Voce ja esta autenticado na loja autorizada para este aparelho.",
      status: "done",
    },
    {
      id: "central-read",
      number: "2",
      title: "Preparar a leitura central",
      body: hasCentralRead
        ? isFirstStoreSetup
          ? "A central voltou vazia para a primeira execucao. Isso libera o cadastro do primeiro lote real, mas ainda nao declara area segura."
          : "A base da loja foi baixada para o turno. Hoje deve continuar mostrando pendencias enquanto existirem."
        : "Use Preparar turno quando a central estiver disponivel. Leitura local ajuda a continuar, mas nao fecha area segura.",
      status: hasCentralRead ? "done" : "current",
    },
    {
      id: "register-lot",
      number: "3",
      title: "Registrar um lote fisico",
      body:
        lotCount > 0
          ? "Ja existe lote registrado neste aparelho. Continue usando lote real, validade, quantidade e local observado."
          : "Escolha um produto encontrado na loja e registre validade, quantidade e local. Esse e o primeiro valor real do piloto.",
      status: lotCount > 0 ? "done" : "current",
      actionLabel: "Registrar lote real",
      onAction: onRegisterLot,
    },
    {
      id: "today",
      number: "4",
      title: "Conferir Hoje",
      body:
        activeTaskCount > 0
          ? "Abra Hoje e trate as tarefas ativas antes de qualquer conclusao de area segura."
          : "Depois do registro, volte para Hoje para confirmar se o lote gerou tarefa, radar futuro ou apenas historico.",
      status: activeTaskCount > 0 ? "current" : "next",
      actionLabel: "Abrir Hoje",
      onAction: onOpenToday,
    },
    {
      id: "safe-close",
      number: "5",
      title: "Fechar turno com seguranca",
      body: "Fechamento seguro depende de leitura central, sincronizacao, pendencias resolvidas e checklist fisico da lideranca.",
      status: "next",
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Primeiros passos da loja"
        body="Siga o caminho operacional ate o primeiro lote real ficar visivel no trabalho do turno."
      />
      <StatusNotice title="Objetivo do guia" tone="info">
        Registrar um lote fisico e conferir o resultado em Hoje. Zero tarefas nao significa area de
        venda segura sem conferencia fisica.
      </StatusNotice>
      <View style={styles.steps}>
        {steps.map((step) => (
          <OnboardingStepCard key={step.id} step={step} />
        ))}
      </View>
      <SecondaryAction label="Voltar para operacao" onPress={onBack} />
    </ScrollView>
  );
}

function OnboardingStepCard({ step }: { step: OnboardingStep }) {
  return (
    <View style={[styles.stepCard, step.status === "current" ? styles.stepCardCurrent : undefined]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>{step.number}</Text>
        <View style={styles.stepTitleGroup}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={[styles.stepStatus, stepStatusStyleFor(step.status)]}>
            {statusLabelFor(step.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.stepBody}>{step.body}</Text>
      {step.actionLabel === undefined || step.onAction === undefined ? null : (
        <PrimaryAction label={step.actionLabel} onPress={step.onAction} />
      )}
    </View>
  );
}

function statusLabelFor(status: OnboardingStepStatus): string {
  if (status === "done") return "feito";
  if (status === "current") return "agora";
  return "depois";
}

function stepStatusStyleFor(status: OnboardingStepStatus) {
  if (status === "done") return styles.stepStatusDone;
  if (status === "current") return styles.stepStatusCurrent;
  return styles.stepStatusNext;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    flexGrow: 1,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
    paddingBottom: captureSpacing.xxlarge,
  },
  steps: {
    gap: captureSpacing.medium,
  },
  stepCard: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  stepCardCurrent: {
    borderColor: captureColors.accent,
  },
  stepHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: captureSpacing.medium,
  },
  stepNumber: {
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    color: captureColors.accent,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    minWidth: 32,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.xsmall,
    textAlign: "center",
  },
  stepTitleGroup: {
    flex: 1,
    gap: captureSpacing.xsmall,
  },
  stepTitle: {
    color: captureColors.ink,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  stepStatus: {
    alignSelf: "flex-start",
    borderRadius: captureRadii.small,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    overflow: "hidden",
    paddingHorizontal: captureSpacing.small,
    paddingVertical: 2,
  },
  stepStatusDone: {
    backgroundColor: captureColors.accentSoft,
    color: captureColors.accent,
  },
  stepStatusCurrent: {
    backgroundColor: captureColors.warningSurface,
    color: captureColors.warningInk,
  },
  stepStatusNext: {
    backgroundColor: captureColors.surfaceMuted,
    color: captureColors.mutedInk,
  },
  stepBody: {
    color: captureColors.mutedInk,
    fontSize: 15,
    lineHeight: 22,
  },
});
