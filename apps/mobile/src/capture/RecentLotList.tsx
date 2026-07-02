import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { OperationalLocation } from "@validade-zero/contracts";
import type { CaptureLotSnapshot, CaptureRepository } from "./repository";
import {
  captureCopy,
  formatLocation,
  formatOperationalTime,
  operationalLocations,
} from "./capture-copy";
import { Field, PrimaryAction, ScreenHeader, SelectionRow, StatusNotice } from "./capture-ui";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import { dateKeyFromUtcMillis, dateOnlyUtcMillis, operationalDateKey } from "./operational-date";

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
        lots.map((lot) => <RecentLotCard key={lot.id} lot={lot} onOpen={() => onOpen(lot)} />)
      )}
      <PrimaryAction label={captureCopy.registerLot} onPress={onRegister} />
    </ScrollView>
  );
}

function RecentLotCard({ lot, onOpen }: { lot: CaptureLotSnapshot; onOpen: () => void }) {
  const primaryDate = lotPrimaryDate(lot);
  const attentionLabel = attention(lot);
  const location = effectiveObservationLocation(lot);
  const actionStatus = lotActionStatus(lot);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lot.productDisplayName}, ${primaryDate.label} ${primaryDate.value}, ${actionLabel(actionStatus)} em ${formatLocation(location)}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.lotCard, pressed ? styles.lotCardPressed : undefined]}
    >
      <View style={styles.lotHeader}>
        <View style={styles.lotTitleGroup}>
          <Text style={styles.productName}>{lot.productDisplayName}</Text>
          <Text style={styles.lotIdentity}>{lot.identity.value}</Text>
        </View>
        <View style={styles.syncBadge}>
          <Text style={styles.syncBadgeText}>{centralStateShortLabel(lot)}</Text>
        </View>
      </View>

      <View style={styles.datePanel}>
        <Text style={styles.dateLabel}>{primaryDate.label}</Text>
        <Text style={styles.dateValue}>{primaryDate.value}</Text>
        {primaryDate.badge === undefined ? null : (
          <Text
            style={[
              styles.dateBadge,
              primaryDate.tone === "critical" ? styles.dateBadgeCritical : undefined,
              primaryDate.tone === "neutral" ? styles.dateBadgeNeutral : undefined,
            ]}
          >
            {primaryDate.badge}
          </Text>
        )}
      </View>

      <View style={styles.factGroup}>
        <Text style={styles.factPrimary}>
          {actionLabel(actionStatus)} em {formatLocation(location)}
        </Text>
        <Text style={styles.factSecondary}>
          {formatQuantity(lot)} -{" "}
          {formatRecentObservationTimestamp(lot.currentObservation.occurredAt)}
        </Text>
      </View>

      {attentionLabel === undefined ? null : <Text style={styles.attention}>{attentionLabel}</Text>}
    </Pressable>
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
    ? "Quantidade não estimada"
    : `Qtd. aprox. ${formatQuantityNumber(lot.currentObservation.approximateQuantity)}`;
}

export function lotActionStatus(lot: CaptureLotSnapshot): string {
  return terminalLotStatus(lot) ?? lot.currentObservation.status;
}

export function attention(lot: CaptureLotSnapshot): string | undefined {
  const terminal = terminalLotStatus(lot);

  if (terminal === "loss") {
    return "Finalizado: perda registrada";
  }

  if (terminal === "withdrawn") {
    return "Finalizado: retirado da area";
  }

  return lot.currentObservation.status === "not_found" ||
    lot.currentObservation.status === "probably_sold_out"
    ? "Presença incerta"
    : centralStateLabel(lot);
}

export function centralStateLabel(lot: CaptureLotSnapshot): string {
  const terminal = terminalLotStatus(lot);

  if (terminal === "loss") {
    return "Finalizado: perda registrada";
  }

  if (terminal === "withdrawn") {
    return "Finalizado: retirado da area";
  }

  if (lot.centralSyncState === "resolved") {
    return "Resolvido na central";
  }

  if (lot.centralSyncState === "discarded") {
    return "Descartado na central";
  }

  if (lot.centralSyncState === "conflict") {
    return "Conflito de sincronizacao";
  }

  if (lot.centralSyncState === "pending_central" || lot.centralSource === "pending_central") {
    return "Pendente de central";
  }

  if (lot.centralSyncState === "synchronized" || lot.centralSource === "central") {
    return "Sincronizado com a central";
  }

  return "Local neste aparelho";
}

type RecentLotPrimaryDate = {
  label: string;
  value: string;
  badge?: string | undefined;
  tone?: "critical" | "warning" | "neutral" | undefined;
};

export function lotPrimaryDate(lot: CaptureLotSnapshot): RecentLotPrimaryDate {
  const terminal = terminalLotStatus(lot);

  if (terminal !== undefined) {
    return {
      label: "Status",
      value: terminal === "loss" ? "Perda" : "Retirado",
      badge: "finalizado",
      tone: "neutral",
    };
  }

  if (lot.mode === "formal_validity" || lot.mode === "processed_repack_loss") {
    if (lot.expiresAt === undefined) {
      return { label: "Validade", value: "Não informada", badge: "sem data", tone: "warning" };
    }

    return {
      label: "Validade",
      value: formatOperationalDate(lot.expiresAt),
      ...expiryBadge(lot.expiresAt),
    };
  }

  if (lot.mode === "flv_inspection") {
    const dueAt = lot.qualityInspectionDueAt ?? lot.receivedAt;

    return {
      label: "Conferir qualidade",
      value: formatOperationalDate(dueAt),
      ...qualityBadge(dueAt),
    };
  }

  return {
    label: "Recebido",
    value: formatOperationalDate(lot.receivedAt),
  };
}

function expiryBadge(value: string): Pick<RecentLotPrimaryDate, "badge" | "tone"> {
  const days = daysFromToday(value);

  if (days < 0) return { badge: "vencido", tone: "critical" };
  if (days === 0) return { badge: "vence hoje", tone: "critical" };
  if (days === 1) return { badge: "vence amanhã", tone: "warning" };
  if (days <= 3) return { badge: `vence em ${days} dias`, tone: "warning" };

  return {};
}

function qualityBadge(value: string): Pick<RecentLotPrimaryDate, "badge" | "tone"> {
  const days = daysFromToday(value);

  if (days < 0) return { badge: "atrasado", tone: "warning" };
  if (days === 0) return { badge: "conferir hoje", tone: "warning" };
  if (days === 1) return { badge: "conferir amanhã", tone: "neutral" };
  if (days <= 3) return { badge: `conferir em ${days} dias`, tone: "neutral" };

  return {};
}

export function formatRecentObservationTimestamp(value: string, now = new Date()): string {
  const observedDate = operationalDateKey(new Date(value));
  const today = operationalDateKey(now);
  const yesterday = dateKeyFromUtcMillis(dateOnlyUtcMillis(today) - 24 * 60 * 60 * 1000);
  const time = formatOperationalTime(value);

  if (observedDate === today) {
    return `Hoje ${time}`;
  }

  if (observedDate === yesterday) {
    return `Ontem ${time}`;
  }

  const dateLabel = formatOperationalDate(value);

  return observedDate.slice(0, 4) === today.slice(0, 4)
    ? `${dateLabel.slice(0, 5)} ${time}`
    : `${dateLabel} ${time}`;
}

function formatOperationalDate(value: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnly !== null) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }

  const parts = operationalDateKey(new Date(value)).split("-");

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function daysFromToday(value: string): number {
  return Math.round(
    (dateOnlyUtcMillis(dateOnlyKey(value)) - dateOnlyUtcMillis(operationalDateKey())) / 86400000,
  );
}

function dateOnlyKey(value: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(value);

  return dateOnly === null ? operationalDateKey(new Date(value)) : value;
}

function formatQuantityNumber(value: number | undefined): string {
  if (value === undefined) {
    return "não informada";
  }

  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export function terminalLotStatus(lot: CaptureLotSnapshot): "loss" | "withdrawn" | undefined {
  if (lot.currentObservation.status === "loss" || lot.currentObservation.status === "withdrawn") {
    return lot.currentObservation.status;
  }

  if (lot.currentObservation.location.kind === "retirada_perda") {
    return lot.mode === "processed_repack_loss" ? "loss" : "withdrawn";
  }

  return undefined;
}

export function effectiveObservationLocation(lot: CaptureLotSnapshot): OperationalLocation {
  return terminalLotStatus(lot) === undefined
    ? lot.currentObservation.location
    : { kind: "retirada_perda" };
}

export function centralStateShortLabel(lot: CaptureLotSnapshot): string {
  const terminal = terminalLotStatus(lot);

  if (terminal === "loss") {
    return "Perda";
  }

  if (terminal === "withdrawn") {
    return "Retirado";
  }

  if (lot.centralSyncState === "resolved") {
    return "Resolvido";
  }

  if (lot.centralSyncState === "discarded") {
    return "Descartado";
  }

  if (lot.centralSyncState === "conflict") {
    return "Conflito";
  }

  if (lot.centralSyncState === "pending_central" || lot.centralSource === "pending_central") {
    return "Pendente";
  }

  if (lot.centralSyncState === "synchronized" || lot.centralSource === "central") {
    return "Central";
  }

  return "Local";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: captureColors.background,
    gap: captureSpacing.large,
    padding: captureSpacing.large,
  },
  filters: { gap: captureSpacing.small },
  lotCard: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.medium,
  },
  lotCardPressed: {
    backgroundColor: captureColors.surfacePressed,
  },
  lotHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: captureSpacing.medium,
    justifyContent: "space-between",
  },
  lotTitleGroup: {
    flex: 1,
    gap: captureSpacing.xsmall,
  },
  productName: {
    color: captureColors.ink,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  lotIdentity: {
    color: captureColors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
  },
  syncBadge: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.xsmall,
  },
  syncBadgeText: {
    color: captureColors.mutedInk,
    fontSize: 12,
    fontWeight: "700",
  },
  datePanel: {
    alignItems: "center",
    backgroundColor: captureColors.accentSoft,
    borderColor: captureColors.border,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    flexDirection: "row",
    gap: captureSpacing.small,
    padding: captureSpacing.small,
  },
  dateLabel: {
    color: captureColors.mutedInk,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dateValue: {
    color: captureColors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  dateBadge: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
    borderRadius: captureRadii.small,
    borderWidth: 1,
    color: captureColors.warningInk,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: captureSpacing.small,
    paddingVertical: captureSpacing.xsmall,
  },
  dateBadgeCritical: {
    backgroundColor: captureColors.criticalTag,
    borderColor: captureColors.criticalBorder,
    color: captureColors.critical,
  },
  dateBadgeNeutral: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    color: captureColors.mutedInk,
  },
  factGroup: {
    gap: captureSpacing.xsmall,
  },
  factPrimary: {
    color: captureColors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  factSecondary: {
    color: captureColors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
  },
  attention: {
    color: captureColors.mutedInk,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
});
