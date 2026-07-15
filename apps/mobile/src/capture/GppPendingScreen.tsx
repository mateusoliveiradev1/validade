import type { GppPurchaseRequest } from "@validade-zero/contracts";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GPP_COPY } from "./gpp-copy";
import type { GppPendingRecord, GppSentTodayRecord } from "./gpp-offline-queue";
import { gppPurchaseStatusLabel } from "./gpp-flow-state";
import {
  DestructiveAction,
  Field,
  ScreenHeader,
  SecondaryAction,
  StatusNotice,
} from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";

export function GppPendingScreen({
  localPending = [],
  purchases = [],
  sentToday = [],
  mode = "pending",
  syncNotice,
  onBack,
  onSyncPending,
  onDiscardConflict,
}: {
  localPending?: readonly GppPendingRecord[] | undefined;
  purchases?: readonly GppPurchaseRequest[] | undefined;
  sentToday?: readonly GppSentTodayRecord[] | undefined;
  mode?: "pending" | "sent";
  syncNotice?:
    | { tone: "info" | "success" | "warning" | "critical"; title: string; body: string }
    | undefined;
  onBack: () => void;
  onSyncPending?: (() => void) | undefined;
  onDiscardConflict?: ((localId: string, justification: string) => void) | undefined;
}) {
  const [discardReasons, setDiscardReasons] = useState<Record<string, string>>({});
  const confirmed = sentToday.filter((item) => item.confirmedAt.length > 0);

  if (mode === "sent") {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <ScreenHeader
          title="Enviadas hoje"
          body="Somente registros confirmados ou reconhecidos pela central aparecem aqui."
        />
        {confirmed.length === 0 ? (
          <StatusNotice title="Nenhum envio confirmado hoje">
            Pendencias salvas neste aparelho nao entram como envio confirmado.
          </StatusNotice>
        ) : (
          confirmed.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{item.item}</Text>
                <Text style={styles.successPill}>Central</Text>
              </View>
              <Text style={styles.rowMeta}>
                {item.replayed ? "Registro ja confirmado" : "Registrado"} -{" "}
                {formatGppTimestamp(item.confirmedAt)}
              </Text>
            </View>
          ))
        )}
        <SecondaryAction label="Voltar para Controle GPP" onPress={onBack} />
      </ScrollView>
    );
  }

  const conflicts = localPending.filter((record) => record.state === "conflict");
  const pending = localPending.filter((record) => record.state !== "conflict");
  const hasRows = conflicts.length > 0 || pending.length > 0 || purchases.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Minhas pendencias"
        body="Tudo aqui ainda depende de central, revisao ou resposta do GPP."
      />

      {!hasRows ? (
        <StatusNotice title="Sem pendencias do Controle GPP">
          Quando houver avaria, compra interna ou conflito, ele aparece aqui.
        </StatusNotice>
      ) : null}

      {syncNotice === undefined ? null : (
        <StatusNotice title={syncNotice.title} tone={syncNotice.tone}>
          {syncNotice.body}
        </StatusNotice>
      )}

      {conflicts.map((record) => (
        <View key={record.localId} style={styles.conflictBox}>
          <StatusNotice title="Conflito de GPP" tone="critical">
            Revise antes de reenviar ou descartar.{" "}
            {record.conflictReason ?? "A central recusou este registro."}
          </StatusNotice>
          <SecondaryAction label="Corrigir e tentar novamente" onPress={() => undefined} />
          <Field
            label="Motivo para descartar"
            onChangeText={(value) =>
              setDiscardReasons((current) => ({ ...current, [record.localId]: value }))
            }
            value={discardReasons[record.localId] ?? ""}
          />
          <StatusNotice tone="warning">
            Informe o motivo para descartar. Este registro nao sera enviado ao GPP.
          </StatusNotice>
          <DestructiveAction
            disabled={(discardReasons[record.localId] ?? "").trim().length === 0}
            label="Descartar registro deste aparelho"
            onPress={() =>
              onDiscardConflict?.(record.localId, discardReasons[record.localId] ?? "")
            }
          />
        </View>
      ))}

      {pending.map((record) => (
        <View key={record.localId} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{pendingLabel(record)}</Text>
            <Text style={styles.warningPill}>Local</Text>
          </View>
          <Text style={styles.rowMeta}>{GPP_COPY.localPending}</Text>
          <Text style={styles.rowMeta}>a central ainda nao recebeu este registro.</Text>
        </View>
      ))}

      {purchases.map((purchase) => (
        <View key={purchase.purchaseRequestId} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{purchase.product.name}</Text>
            <Text style={styles.warningPill}>Compra</Text>
          </View>
          <Text style={styles.rowMeta}>
            {purchase.requestedQuantity.value} {purchase.requestedQuantity.unit} -{" "}
            {gppPurchaseStatusLabel(purchase.status)}
          </Text>
          <Text style={styles.rowMeta}>{formatGppTimestamp(purchase.requestedAt)}</Text>
        </View>
      ))}

      {localPending.length > 0 ? (
        <SecondaryAction label="Sincronizar pendencias GPP" onPress={onSyncPending ?? noop} />
      ) : null}
      <SecondaryAction label="Voltar para Controle GPP" onPress={onBack} />
    </ScrollView>
  );
}

function noop(): void {}

function formatGppTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function pendingLabel(record: GppPendingRecord): string {
  const quantity =
    "quantity" in record.payload ? record.payload.quantity : record.payload.requestedQuantity;
  const product = record.payload.product.name;
  return `${product} - ${quantity.value} ${quantity.unit}`;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
    paddingBottom: captureSpacing.xxlarge,
  },
  row: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.small,
    padding: captureSpacing.large,
  },
  rowHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: captureSpacing.small,
    justifyContent: "space-between",
  },
  conflictBox: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.medium,
  },
  rowTitle: {
    color: captureColors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  rowMeta: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  warningPill: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    color: captureColors.warningInk,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: 3,
  },
  successPill: {
    backgroundColor: captureColors.accentSurface,
    borderColor: captureColors.accent,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    color: captureColors.accent,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: 3,
  },
});
