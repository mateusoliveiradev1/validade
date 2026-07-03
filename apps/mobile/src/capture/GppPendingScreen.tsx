import type { GppPurchaseRequest } from "@validade-zero/contracts";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GPP_COPY } from "./gpp-copy";
import type { GppPendingRecord } from "./gpp-offline-queue";
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
  onBack,
  onSyncPending,
  onDiscardConflict,
}: {
  localPending?: readonly GppPendingRecord[] | undefined;
  purchases?: readonly GppPurchaseRequest[] | undefined;
  sentToday?:
    | readonly { id: string; item: string; confirmedAt: string; replayed?: boolean }[]
    | undefined;
  mode?: "pending" | "sent";
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
              <Text style={styles.rowTitle}>{item.item}</Text>
              <Text style={styles.rowMeta}>
                {item.replayed ? "Registro ja confirmado na central" : "Registrado na central"} -{" "}
                {item.confirmedAt}
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
        body="Acompanhe o que ainda precisa de central, revisao ou resposta do GPP."
      />
      {!hasRows ? (
        <StatusNotice title="Sem pendencias do Controle GPP">
          Quando houver avaria, compra interna ou conflito, ele aparece aqui.
        </StatusNotice>
      ) : null}
      {conflicts.map((record) => (
        <View key={record.localId} style={styles.conflictBox}>
          <StatusNotice title="Conflito de GPP" tone="critical">
            Conflito de GPP. Revise antes de reenviar ou descartar.{" "}
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
        <StatusNotice key={record.localId} title={GPP_COPY.localPending} tone="warning">
          {pendingLabel(record)} - a central ainda nao recebeu este registro.
        </StatusNotice>
      ))}
      {purchases.map((purchase) => (
        <View key={purchase.purchaseRequestId} style={styles.row}>
          <Text style={styles.rowTitle}>{purchase.product.name}</Text>
          <Text style={styles.rowMeta}>
            {purchase.requestedQuantity.value} {purchase.requestedQuantity.unit} -{" "}
            {gppPurchaseStatusLabel(purchase.status)}
          </Text>
          <Text style={styles.rowMeta}>{purchase.requestedAt}</Text>
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

function pendingLabel(record: GppPendingRecord): string {
  const quantity =
    "quantity" in record.payload ? record.payload.quantity : record.payload.requestedQuantity;
  const product = record.payload.product.name;
  return `${product} - ${quantity.value} ${quantity.unit}`;
}

const styles = StyleSheet.create({
  screen: { gap: captureSpacing.large, padding: captureSpacing.large },
  row: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    padding: captureSpacing.medium,
  },
  conflictBox: {
    gap: captureSpacing.medium,
  },
  rowTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  rowMeta: { color: captureColors.mutedInk, fontSize: 14, lineHeight: 20 },
});
