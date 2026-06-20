import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { OperationalLocation } from "@validade-zero/contracts";
import type { CaptureLotSnapshot, CaptureRepository } from "./repository";
import {
  captureCopy,
  formatLocation,
  formatObservationTimestamp,
  operationalLocations,
} from "./capture-copy";
import { Field, PrimaryAction, ScreenHeader, SelectionRow, StatusNotice } from "./capture-ui";

export function RecentLotList({
  repository,
  onOpen,
  onRegister,
}: {
  repository: CaptureRepository;
  onOpen: (lot: CaptureLotSnapshot) => void;
  onRegister: () => void;
}) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<OperationalLocation | undefined>();
  const [lots, setLots] = useState<readonly CaptureLotSnapshot[]>([]);

  async function refresh(nextQuery = query, nextLocation = location): Promise<void> {
    setLots(
      await repository.listRecentLots({
        ...(nextQuery.trim() === "" ? {} : { query: nextQuery }),
        ...(nextLocation === undefined ? {} : { location: nextLocation }),
      }),
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <ScreenHeader title="Lotes recentes" body="Confira o último fato físico antes de agir." />
      <Field label="Buscar por produto, código ou lote" value={query} onChangeText={setQuery} />
      <PrimaryAction label="Buscar lotes" onPress={() => void refresh()} />
      <View style={styles.filters}>
        {operationalLocations.slice(0, 5).map((option) => (
          <SelectionRow
            key={option.kind}
            label={option.label}
            selected={location?.kind === option.kind}
            onPress={() => {
              const next =
                location?.kind === option.kind
                  ? undefined
                  : ({ kind: option.kind } as OperationalLocation);
              setLocation(next);
              void refresh(query, next);
            }}
          />
        ))}
      </View>
      {lots.length === 0 ? (
        <StatusNotice>
          <Text>Ainda não há lotes registrados</Text>
          <Text>Registre o primeiro lote para acompanhar sua presença física por local.</Text>
        </StatusNotice>
      ) : (
        lots.map((lot) => (
          <SelectionRow
            key={lot.id}
            label={`${lot.productDisplayName} — ${lot.identity.value}`}
            detail={`${actionLabel(lot.currentObservation.status)} · ${formatLocation(lot.currentObservation.location)} · ${formatQuantity(lot)} · ${formatObservationTimestamp(lot.currentObservation.occurredAt)}${attention(lot) === undefined ? "" : ` · ${attention(lot)}`}`}
            onPress={() => onOpen(lot)}
          />
        ))
      )}
      <PrimaryAction label={captureCopy.registerLot} onPress={onRegister} />
    </ScrollView>
  );
}

export function actionLabel(status: string): string {
  return (
    (
      {
        present: "Presente",
        moved: "Movido",
        withdrawn: "Retirado",
        loss: "Perda",
        not_found: "Não encontrado",
        probably_sold_out: "Provavelmente esgotado",
      } as Record<string, string>
    )[status] ?? status
  );
}

export function formatQuantity(lot: CaptureLotSnapshot): string {
  return lot.currentObservation.quantityState === "not_estimable"
    ? "Não foi possível estimar"
    : `${lot.currentObservation.approximateQuantity} unidades`;
}

export function attention(lot: CaptureLotSnapshot): string | undefined {
  return lot.currentObservation.status === "not_found" ||
    lot.currentObservation.status === "probably_sold_out"
    ? "Presença incerta"
    : undefined;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F5F7EF", gap: 16, padding: 16 },
  filters: { gap: 8 },
});
