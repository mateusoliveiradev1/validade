import * as React from "react";
import {
  AuditQuerySchema,
  type AuditEventType,
  type AuditQuery,
  type AuditTimelineItem,
} from "@validade-zero/contracts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent } from "../components/ui/sheet";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { AuditEventDetail } from "./AuditEventDetail";
import { createFetchAuditClient, type AuditClient } from "./audit-client";

const EVENT_TYPES = [
  "task.changed",
  "access.denied",
  "markdown.changed",
  "sync.changed",
  "evidence.changed",
  "shift.changed",
] as const satisfies readonly AuditEventType[];

type WorkbenchStatus = "loading" | "ready" | "error";

export function AuditWorkbench({
  client: providedClient,
  initialStoreId = "loja-piloto",
  initialStoreName = "Loja Piloto",
}: {
  client?: AuditClient;
  initialStoreId?: string;
  initialStoreName?: string;
}) {
  const defaultClientRef = React.useRef<AuditClient | undefined>(undefined);
  defaultClientRef.current ??= createFetchAuditClient();
  const client = providedClient ?? defaultClientRef.current;
  const isCompact = useCompactAuditLayout();
  const [query, setQuery] = React.useState<AuditQuery>(() =>
    AuditQuerySchema.parse({ storeId: initialStoreId, limit: 25 }),
  );
  const [status, setStatus] = React.useState<WorkbenchStatus>("loading");
  const [events, setEvents] = React.useState<AuditTimelineItem[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = React.useState<AuditTimelineItem | undefined>();
  const [returnFocusId, setReturnFocusId] = React.useState<string | undefined>();
  const rowRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const sheetRef = React.useRef<HTMLElement>(null);

  const loadEvents = React.useCallback(
    async (nextQuery: AuditQuery, mode: "replace" | "append") => {
      setStatus(mode === "replace" ? "loading" : "ready");
      setError(undefined);

      try {
        const page = await client.listEvents(nextQuery);

        setEvents((current) => (mode === "append" ? [...current, ...page.items] : [...page.items]));
        setNextCursor(page.nextCursor);
        setStatus("ready");
      } catch (loadError) {
        setStatus("error");
        setError(loadError instanceof Error ? loadError.message : undefined);
      }
    },
    [client],
  );

  React.useEffect(() => {
    void loadEvents(query, "replace");
  }, [loadEvents, query]);

  React.useEffect(() => {
    if (selectedEvent !== undefined) {
      sheetRef.current?.focus();
    }
  }, [selectedEvent]);

  function applyFilters(formData: FormData): void {
    const nextQuery = AuditQuerySchema.parse({
      storeId: initialStoreId,
      limit: 25,
      from: optionalDateTimeLocalValue(formData.get("from")),
      to: optionalDateTimeLocalValue(formData.get("to")),
      actorId: optionalFormValue(formData.get("actorId")),
      type: optionalFormValue(formData.get("type")),
      targetType: optionalFormValue(formData.get("targetType")),
      targetId: optionalFormValue(formData.get("targetId")),
    });

    setQuery(nextQuery);
  }

  function clearFilters(): void {
    setQuery(AuditQuerySchema.parse({ storeId: initialStoreId, limit: 25 }));
  }

  function openDetail(event: AuditTimelineItem): void {
    setReturnFocusId(event.eventId);
    setSelectedEvent(event);
  }

  function closeDetail(): void {
    const focusId = returnFocusId;

    setSelectedEvent(undefined);
    setReturnFocusId(undefined);

    window.setTimeout(() => {
      if (focusId !== undefined) {
        rowRefs.current.get(focusId)?.focus();
      }
    }, 0);
  }

  const isInitialLoading = status === "loading" && events.length === 0;
  const isEmpty = status === "ready" && events.length === 0;
  const filterFormKey = [
    query.from ?? "",
    query.to ?? "",
    query.actorId ?? "",
    query.type ?? "",
    query.targetType ?? "",
    query.targetId ?? "",
  ].join("|");

  return (
    <section className="grid gap-4" aria-labelledby="audit-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-1">
          <h2 id="audit-heading" className="text-xl font-semibold leading-6 text-foreground">
            Auditoria operacional
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            Escopo: <strong>{initialStoreName}</strong> ({initialStoreId})
          </p>
        </div>
        <Badge tone="neutral">Consulta por loja</Badge>
      </div>

      <form
        key={filterFormKey}
        className="grid gap-3 rounded-lg border border-border bg-card p-4"
        aria-label="Filtros de auditoria"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(new FormData(event.currentTarget));
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            Periodo inicial
            <Input
              name="from"
              type="datetime-local"
              defaultValue={dateTimeLocalValue(query.from)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            Periodo final
            <Input name="to" type="datetime-local" defaultValue={dateTimeLocalValue(query.to)} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            Pessoa
            <Input name="actorId" placeholder="ID da pessoa" defaultValue={query.actorId ?? ""} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            Tipo de evento
            <select
              name="type"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={query.type ?? ""}
            >
              <option value="">Todos</option>
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventTypeLabel(eventType)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            Tipo de alvo
            <select
              name="targetType"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={query.targetType ?? ""}
            >
              <option value="">Todos</option>
              <option value="task">Tarefa</option>
              <option value="lot">Lote</option>
              <option value="evidence">Evidencia</option>
              <option value="shift">Fechamento</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            Item afetado
            <Input name="targetId" placeholder="ID do item" defaultValue={query.targetId ?? ""} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Aplicar filtros</Button>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      </form>

      {isInitialLoading ? <AuditSkeleton /> : null}

      {status === "error" ? (
        <div className="rounded-lg border border-critical-border bg-critical-surface p-4" role="alert">
          <p className="font-semibold text-destructive">Nao foi possivel carregar a auditoria.</p>
          <p className="mt-1 text-sm text-foreground">
            {error ?? "Seus filtros foram mantidos; tente novamente."}
          </p>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="font-semibold text-foreground">Refine a busca de eventos</p>
          <p className="mt-1 max-w-[72ch] text-sm text-muted-foreground">
            Amplie o periodo, remova um filtro ou limpe a busca para consultar outros eventos.
          </p>
          <Button type="button" variant="outline" className="mt-3" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      ) : null}

      {events.length > 0 ? (
        isCompact ? (
          <div className="grid gap-2">
            {events.map((event) => (
              <AuditListItem
                key={event.eventId}
                event={event}
                ref={(node) => {
                  if (node === null) {
                    rowRefs.current.delete(event.eventId);
                    return;
                  }

                  rowRefs.current.set(event.eventId, node);
                }}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <AuditTable events={events} rowRefs={rowRefs} onOpenDetail={openDetail} />
          </div>
        )
      ) : null}

      {nextCursor === undefined ? null : (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() =>
            void loadEvents(AuditQuerySchema.parse({ ...query, cursor: nextCursor }), "append")
          }
        >
          Carregar mais eventos
        </Button>
      )}

      <Sheet open={selectedEvent !== undefined} onOpenChange={(open) => (!open ? closeDetail() : undefined)}>
        <SheetContent ref={sheetRef} aria-label="Detalhe do evento de auditoria">
          {selectedEvent === undefined ? null : (
            <AuditEventDetail event={selectedEvent} onClose={closeDetail} />
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function useCompactAuditLayout(): boolean {
  const [isCompact, setIsCompact] = React.useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(max-width: 767px)").matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsCompact(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isCompact;
}

function AuditTable({
  events,
  rowRefs,
  onOpenDetail,
}: {
  events: readonly AuditTimelineItem[];
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  onOpenDetail: (event: AuditTimelineItem) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quando</TableHead>
          <TableHead>Evento e alvo</TableHead>
          <TableHead>Pessoa</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.eventId}>
            <TableCell className="w-[180px]">
              <span className="block font-semibold">{formatDateTime(event.occurredAt)}</span>
              {event.receivedAt === undefined ? (
                <span className="block text-xs text-warning-foreground">
                  Ainda nao recebida pelo sistema
                </span>
              ) : event.receivedAt === event.occurredAt ? null : (
                <span className="block text-xs text-muted-foreground">
                  Recebida {formatDateTime(event.receivedAt)}
                </span>
              )}
            </TableCell>
            <TableCell>
              <button
                ref={(node) => {
                  if (node === null) {
                    rowRefs.current.delete(event.eventId);
                    return;
                  }

                  rowRefs.current.set(event.eventId, node);
                }}
                type="button"
                className="grid max-w-[72ch] gap-1 text-left outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/40"
                onClick={() => onOpenDetail(event)}
              >
                <span className="font-semibold text-foreground">{event.summary}</span>
                <span className="text-sm text-muted-foreground">
                  {event.target.label ?? event.target.id}
                </span>
              </button>
            </TableCell>
            <TableCell>
              <span className="block font-semibold">{event.actor.displayName}</span>
              <span className="text-xs text-muted-foreground">{roleLabel(event.actor.roleSnapshot)}</span>
            </TableCell>
            <TableCell>
              <Badge tone={badgeTone(event.status)}>{statusLabel(event.status)}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const AuditListItem = React.forwardRef<
  HTMLButtonElement,
  {
    event: AuditTimelineItem;
    onOpenDetail: (event: AuditTimelineItem) => void;
  }
>(function AuditListItem({ event, onOpenDetail }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="grid gap-2 rounded-lg border border-border bg-card p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      onClick={() => onOpenDetail(event)}
    >
      <span className="text-sm font-semibold text-muted-foreground">
        {formatDateTime(event.occurredAt)}
      </span>
      <span className="font-semibold text-foreground">{event.summary}</span>
      <span className="text-sm text-muted-foreground">{event.target.label ?? event.target.id}</span>
      <span className="text-sm text-foreground">
        {event.actor.displayName} - {roleLabel(event.actor.roleSnapshot)}
      </span>
      <Badge tone={badgeTone(event.status)} className="w-fit">
        {statusLabel(event.status)}
      </Badge>
    </button>
  );
});

function AuditSkeleton() {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-card p-4" aria-label="Carregando auditoria">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

function optionalFormValue(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

function optionalDateTimeLocalValue(value: FormDataEntryValue | null): string | undefined {
  const trimmed = optionalFormValue(value);

  if (trimmed === undefined) {
    return undefined;
  }

  return new Date(trimmed).toISOString();
}

function dateTimeLocalValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
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

function eventTypeLabel(type: AuditEventType): string {
  if (type === "task.changed") {
    return "Tarefa";
  }

  if (type === "access.denied") {
    return "Acesso negado";
  }

  if (type === "markdown.changed") {
    return "Rebaixa";
  }

  if (type === "sync.changed") {
    return "Sincronizacao";
  }

  if (type === "evidence.changed") {
    return "Evidencia";
  }

  return "Fechamento";
}

function statusLabel(status: AuditTimelineItem["status"]): string {
  if (status === "pending_ack") {
    return "Pendente";
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
