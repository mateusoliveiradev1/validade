import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GPP_COPY } from "./gpp-copy";
import {
  PrimaryAction,
  ScreenHeader,
  ScreenSection,
  SecondaryAction,
  StatusNotice,
  SummaryMetric,
} from "./capture-ui";
import { captureColors, captureSpacing } from "./capture-theme";

export interface ControleGppScreenProps {
  mode?: "sector" | "central" | undefined;
  pendingCount?: number | undefined;
  sentTodayCount?: number | undefined;
  lastCentralAckAt?: string | undefined;
  hasRetry?: boolean | undefined;
  hasConflict?: boolean | undefined;
  onBack?: (() => void) | undefined;
  onRegisterAvaria?: (() => void) | undefined;
  onRequestPurchase?: (() => void) | undefined;
  onOpenPending?: (() => void) | undefined;
  onOpenSentToday?: (() => void) | undefined;
}

export function ControleGppScreen({
  mode = "sector",
  pendingCount = 0,
  sentTodayCount = 0,
  lastCentralAckAt,
  hasRetry = false,
  hasConflict = false,
  onBack,
  onRegisterAvaria = noop,
  onRequestPurchase = noop,
  onOpenPending = noop,
  onOpenSentToday = noop,
}: ControleGppScreenProps) {
  const isCentral = mode === "central";
  const hasLocalNotice = pendingCount > 0 || hasRetry || hasConflict;
  const effectiveSentTodayCount = isCentral ? 0 : sentTodayCount;
  const formattedLastCentralAck =
    lastCentralAckAt === undefined ? undefined : formatGppTimestamp(lastCentralAckAt);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title={isCentral ? "Fila GPP" : "Controle GPP"}
        body={
          isCentral
            ? "A conta GPP ja entra no espaco correto, mas a fila central completa vem na proxima fase."
            : "A conta Setor envia avarias e compras internas sem misturar com Hoje."
        }
      />

      {isCentral ? (
        <StatusNotice title="Fila central em preparacao" tone="info">
          Envios feitos pelo setor aparecem como enviados no aparelho do setor. Atendimento, baixa e
          divergencia entram na fila central completa.
        </StatusNotice>
      ) : null}

      {hasLocalNotice ? (
        <StatusNotice title={GPP_COPY.localPending} tone={hasConflict ? "critical" : "warning"}>
          {hasConflict
            ? "Existe conflito para revisar antes de reenviar ou descartar com justificativa."
            : "A central ainda nao recebeu todas as pendencias deste aparelho."}
        </StatusNotice>
      ) : null}

      {isCentral ? null : (
        <ScreenSection
          title="Enviar para o GPP"
          body="Use quando o setor encontrou avaria ou precisa pedir compra interna."
        >
          <PrimaryAction label="Registrar avaria" onPress={onRegisterAvaria} />
          <SecondaryAction label="Solicitar compra interna" onPress={onRequestPurchase} />
        </ScreenSection>
      )}

      <ScreenSection title={isCentral ? "Fila central" : "Acompanhamento no setor"}>
        <View style={styles.summaryGrid}>
          <SummaryMetric
            value={isCentral ? "-" : pendingCount}
            label={isCentral ? "fila real" : "neste aparelho"}
            tone={!isCentral && pendingCount > 0 ? "warning" : "neutral"}
          />
          <SummaryMetric
            value={isCentral ? "-" : effectiveSentTodayCount}
            label={isCentral ? "acoes futuras" : "enviadas hoje"}
            tone={!isCentral && effectiveSentTodayCount > 0 ? "success" : "neutral"}
          />
        </View>

        <View style={styles.queueActions}>
          <SecondaryAction
            accessibilityLabel="Abrir Minhas pendencias do Controle GPP"
            label={isCentral ? "Fila recebida" : "Minhas pendencias"}
            disabled={isCentral}
            onPress={onOpenPending}
          />
          <Text style={styles.metadata}>
            {isCentral
              ? "Aguardando integracao da fila central. Nada recebido aqui ainda."
              : pendingCount > 0
                ? `${pendingCount} ${GPP_COPY.localPending.toLocaleLowerCase("pt-BR")}`
                : "Sem pendencias locais neste aparelho"}
          </Text>

          <SecondaryAction
            accessibilityLabel="Abrir Enviadas hoje do Controle GPP"
            label={isCentral ? "Acoes do GPP" : "Enviadas hoje"}
            disabled={isCentral}
            onPress={onOpenSentToday}
          />
          <Text style={styles.metadata}>
            {isCentral
              ? "Baixa de avaria, atendimento de compra e resposta de divergencia entram na proxima tela central."
              : sentTodaySummary(effectiveSentTodayCount, formattedLastCentralAck)}
          </Text>
        </View>
      </ScreenSection>

      {onBack === undefined ? null : <SecondaryAction label="Voltar para Hoje" onPress={onBack} />}
    </ScrollView>
  );
}

function noop(): void {}

function sentTodaySummary(count: number, formattedLastCentralAck: string | undefined): string {
  if (count === 0) return "Nenhum envio central confirmado hoje.";
  return `${count} envio(s) confirmados${
    formattedLastCentralAck === undefined ? "" : ` - ultimo ${formattedLastCentralAck}`
  }`;
}

function formatGppTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
    paddingBottom: captureSpacing.xxlarge,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: captureSpacing.small,
  },
  queueActions: {
    gap: captureSpacing.small,
  },
  metadata: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
});
