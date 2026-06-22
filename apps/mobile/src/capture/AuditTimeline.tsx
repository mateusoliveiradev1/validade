import { StyleSheet, Text, View } from "react-native";
import type { AuditTimelineItem } from "@validade-zero/contracts";
import { captureColors, captureRadii, captureSpacing } from "./capture-theme";
import { formatAlertTime } from "./today-copy";

export function AuditTimeline({
  events,
  title = "Historico operacional",
}: {
  events: readonly AuditTimelineItem[];
  title?: string;
}) {
  const sortedEvents = [...events].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );

  if (sortedEvents.length === 0) {
    return (
      <View style={styles.timeline} accessibilityLabel={title}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>Nenhum evento operacional registrado para este item.</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline} accessibilityLabel={title}>
      <Text style={styles.title}>{title}</Text>
      {sortedEvents.map((event) => (
        <View
          key={event.eventId}
          style={[
            styles.item,
            event.status === "pending_ack" ? styles.itemPending : undefined,
            event.status === "conflict" || event.status === "invalidated"
              ? styles.itemCritical
              : undefined,
          ]}
        >
          <Text style={styles.itemTitle}>{event.summary}</Text>
          <Text style={styles.body}>{event.target.label ?? event.target.id}</Text>
          <Text style={styles.meta}>
            {event.actor.displayName} - {roleLabel(event.actor.roleSnapshot)} -{" "}
            {event.store.storeName}
          </Text>
          <Text style={styles.meta}>
            Realizada no aparelho as {formatAlertTime(event.occurredAt)}
          </Text>
          <Text style={styles.meta}>
            {event.receivedAt === undefined
              ? "Ainda nao recebida pelo sistema"
              : `Recebida pelo sistema as ${formatAlertTime(event.receivedAt)}`}
          </Text>
          {event.reason === undefined ? null : <Text style={styles.body}>{event.reason}</Text>}
          {event.linkedEventId === undefined ? null : (
            <Text style={styles.meta}>Registro vinculado ao evento anterior preservado.</Text>
          )}
          {event.status === "conflict" ? (
            <Text style={styles.conflict}>Conflito pendente de revisao.</Text>
          ) : null}
          {event.status === "invalidated" ? (
            <Text style={styles.conflict}>Registro preservado; uma correcao foi criada.</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function roleLabel(role: AuditTimelineItem["actor"]["roleSnapshot"]): string {
  if (role === "lead") {
    return "lideranca";
  }

  if (role === "admin") {
    return "administracao";
  }

  return "colaborador";
}

const styles = StyleSheet.create({
  timeline: {
    backgroundColor: captureColors.surface,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.medium,
    padding: captureSpacing.large,
  },
  title: {
    color: captureColors.ink,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24,
  },
  item: {
    backgroundColor: captureColors.surfaceMuted,
    borderColor: captureColors.border,
    borderRadius: captureRadii.medium,
    borderWidth: 1,
    gap: captureSpacing.xsmall,
    padding: captureSpacing.medium,
  },
  itemPending: {
    backgroundColor: captureColors.warningSurface,
    borderColor: captureColors.warningBorder,
  },
  itemCritical: {
    backgroundColor: captureColors.criticalSurface,
    borderColor: captureColors.criticalBorder,
  },
  itemTitle: {
    color: captureColors.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  body: {
    color: captureColors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    color: captureColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  conflict: {
    color: captureColors.critical,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
});
