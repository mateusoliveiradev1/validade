import type { AuditTimelineItem } from "@validade-zero/contracts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

export function AuditEventDetail({
  event,
  onClose,
}: {
  event: AuditTimelineItem;
  onClose: () => void;
}) {
  const metadataEntries = Object.entries(event.metadata ?? {}).filter(([key]) =>
    ["action", "productDisplayName", "lotCode", "requestedCapability", "denialReason"].includes(
      key,
    ),
  );

  return (
    <div className="grid gap-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <Badge tone={badgeTone(event.status)}>{statusLabel(event.status)}</Badge>
          <h2 className="text-xl font-semibold leading-6 text-foreground">{event.summary}</h2>
          <p className="max-w-[72ch] text-sm leading-5 text-muted-foreground">
            {event.target.label ?? event.target.id}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <dl className="grid gap-3 text-sm">
        <DetailRow label="Pessoa" value={`${event.actor.displayName} (${roleLabel(event.actor.roleSnapshot)})`} />
        <DetailRow label="Loja" value={event.store.storeName} />
        <DetailRow label="Realizada no aparelho" value={formatDateTime(event.occurredAt)} />
        <DetailRow label="Recebida pelo sistema" value={formatDateTime(event.receivedAt)} />
        {event.reason === undefined ? null : <DetailRow label="Motivo" value={event.reason} />}
      </dl>

      {metadataEntries.length === 0 ? null : (
        <section className="grid gap-2" aria-label="Dados operacionais">
          <h3 className="text-sm font-semibold text-foreground">Dados operacionais</h3>
          <dl className="grid gap-2 text-sm">
            {metadataEntries.map(([key, value]) => (
              <DetailRow key={key} label={metadataLabel(key)} value={String(value)} />
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border pb-2">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="break-words text-base leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
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

function statusLabel(status: AuditTimelineItem["status"]): string {
  if (status === "pending_ack") {
    return "Pendente de recebimento";
  }

  if (status === "conflict") {
    return "Conflito";
  }

  if (status === "denied") {
    return "Negado";
  }

  if (status === "invalidated") {
    return "Invalidado";
  }

  return "Recebido";
}

function badgeTone(status: AuditTimelineItem["status"]): "neutral" | "success" | "warning" | "critical" {
  if (status === "received") {
    return "success";
  }

  if (status === "pending_ack") {
    return "warning";
  }

  if (status === "denied" || status === "invalidated" || status === "conflict") {
    return "critical";
  }

  return "neutral";
}

function metadataLabel(key: string): string {
  if (key === "productDisplayName") {
    return "Produto";
  }

  if (key === "lotCode") {
    return "Lote";
  }

  if (key === "requestedCapability") {
    return "Capacidade solicitada";
  }

  if (key === "denialReason") {
    return "Motivo da negativa";
  }

  return "Acao";
}
