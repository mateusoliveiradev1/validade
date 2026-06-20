import { ScrollView, StyleSheet, Text } from "react-native";
import type { CaptureLotDetail } from "./repository";
import { actionLabel, formatQuantity } from "./RecentLotList";
import { formatLocation, formatObservationTimestamp } from "./capture-copy";
import { PrimaryAction, ScreenHeader, SecondaryAction, StatusNotice } from "./capture-ui";

export function LotDetailScreen({
  detail,
  onObserve,
  onBack,
}: {
  detail: CaptureLotDetail;
  onObserve: () => void;
  onBack: () => void;
}) {
  const observation = detail.currentObservation;
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title={detail.productDisplayName} body={`Lote ${detail.identity.value}`} />
      <Text style={styles.metadata}>Local atual: {formatLocation(observation.location)}</Text>
      <Text style={styles.metadata}>Última ação: {actionLabel(observation.status)}</Text>
      <Text style={styles.metadata}>
        Registrado por {observation.actorLabel} em{" "}
        {formatObservationTimestamp(observation.occurredAt)}
      </Text>
      <Text style={styles.metadata}>{formatQuantity(detail)}</Text>
      {observation.status === "not_found" || observation.status === "probably_sold_out" ? (
        <StatusNotice>
          Presença incerta: confirme fisicamente este lote antes de tratá-lo como seguro.
        </StatusNotice>
      ) : (
        <StatusNotice>Estado físico atual disponível para conferência.</StatusNotice>
      )}
      <PrimaryAction label="Registrar observação" onPress={onObserve} />
      <SecondaryAction label="Voltar e revisar" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F5F7EF", gap: 16, padding: 16 },
  metadata: { color: "#3F5546", fontSize: 16, lineHeight: 24 },
});
