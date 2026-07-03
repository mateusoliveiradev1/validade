import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GPP_COPY } from "./gpp-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

export interface ControleGppScreenProps {
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
  const hasLocalNotice = pendingCount > 0 || hasRetry || hasConflict;
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Controle GPP"
        body="Registre avarias e compras internas sem misturar com Hoje. A central confirma o que foi recebido."
      />

      {hasLocalNotice ? (
        <StatusNotice title={GPP_COPY.localPending} tone={hasConflict ? "critical" : "warning"}>
          {hasConflict
            ? "Existe conflito para revisar antes de reenviar ou descartar com justificativa."
            : "A central ainda nao recebeu todas as pendencias deste aparelho."}
        </StatusNotice>
      ) : null}

      <View style={styles.primaryActions}>
        <PrimaryAction label="Registrar avaria" onPress={onRegisterAvaria} />
        <SecondaryAction label="Solicitar compra interna" onPress={onRequestPurchase} />
      </View>

      <View style={styles.rows}>
        <SecondaryAction
          accessibilityLabel="Abrir Minhas pendencias do Controle GPP"
          label="Minhas pendencias"
          onPress={onOpenPending}
        />
        <Text style={styles.metadata}>
          {pendingCount > 0
            ? `${pendingCount} ${GPP_COPY.localPending.toLocaleLowerCase("pt-BR")}`
            : "Sem pendencias locais neste aparelho"}
        </Text>

        <SecondaryAction
          accessibilityLabel="Abrir Enviadas hoje do Controle GPP"
          label="Enviadas hoje"
          onPress={onOpenSentToday}
        />
        <Text style={styles.metadata}>
          {sentTodayCount === 0
            ? "Nenhum envio central confirmado hoje"
            : `${sentTodayCount} envio(s) confirmados${
                lastCentralAckAt === undefined ? "" : ` - ultimo ${lastCentralAckAt}`
              }`}
        </Text>
      </View>

      {onBack === undefined ? null : <SecondaryAction label="Voltar para Hoje" onPress={onBack} />}
    </ScrollView>
  );
}

function noop(): void {}

const styles = StyleSheet.create({
  screen: {
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  primaryActions: {
    gap: captureSpacing.medium,
  },
  rows: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.medium,
  },
  metadata: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
});
