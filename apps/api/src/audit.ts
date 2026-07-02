import {
  AuditCursorPageSchema,
  AuditEventRecordSchema,
  AuditQuerySchema,
  AuditTimelineItemSchema,
  TaskResolutionActionSchema,
  type AuditCursorPage,
  type AuditEventRecord,
  type AuditQuery,
  type AuditTargetType,
  type AuditTimelineItem,
} from "@validade-zero/contracts";
import {
  createNeonAuditRepository,
  type AppendAuditEventInput as DatabaseAppendAuditEventInput,
  type AuditEventProjection as DatabaseAuditEventProjection,
  type AuditRepository as DatabaseAuditRepository,
} from "@validade-zero/database/audit-repository";
import type { AuthorizedActorContext, Capability } from "@validade-zero/domain";
import { z } from "zod";
import type { AccessDeniedEvent, AccessDeniedAuditRecorder } from "./auth";

const RequiredIdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(240);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const ProtectedTaskActionRequestSchema = z
  .object({
    storeId: RequiredIdentifierSchema,
    action: TaskResolutionActionSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema.optional(),
    productDisplayName: RequiredTextSchema.optional(),
    lotCode: RequiredTextSchema.optional(),
    reason: RequiredTextSchema.optional(),
  })
  .strict();

export type ProtectedTaskActionRequest = z.infer<typeof ProtectedTaskActionRequestSchema>;

export interface TaskActionMutationResult {
  taskId: string;
  action: ProtectedTaskActionRequest["action"];
  status: "recorded";
  recordedAt: string;
}

export interface ProtectedTaskActionAuditResult {
  action: TaskActionMutationResult;
  auditEvent: AuditTimelineItem;
  replayed: boolean;
}

export type AppendWithMutationResult<TMutationResult> =
  | {
      replayed: true;
      event: AuditEventRecord;
    }
  | {
      replayed: false;
      event: AuditEventRecord;
      mutationResult: TMutationResult;
    };

export interface AuditEventRepository {
  append(event: AuditEventRecord): Promise<AuditEventRecord>;
  appendWithMutation<TMutationResult>(input: {
    event: AuditEventRecord;
    mutate: () => Promise<TMutationResult>;
  }): Promise<AppendWithMutationResult<TMutationResult>>;
  listByTarget(input: {
    storeId: string;
    targetType: AuditTargetType;
    targetId: string;
    limit?: number;
  }): Promise<readonly AuditTimelineItem[]>;
  queryStore(query: AuditQuery): Promise<AuditCursorPage>;
}

export interface InMemoryAuditEventRepository extends AuditEventRepository {
  readEvents(): readonly AuditEventRecord[];
}

export interface AuditService {
  recordProtectedTaskAction(input: {
    actorContext: AuthorizedActorContext;
    taskId: string;
    command: ProtectedTaskActionRequest;
  }): Promise<ProtectedTaskActionAuditResult>;
  queryStore(query: AuditQuery): Promise<AuditCursorPage>;
}

export function createInMemoryAuditRepository(): InMemoryAuditEventRepository {
  const events = new Map<string, AuditEventRecord>();

  return {
    append(event) {
      const parsed = AuditEventRecordSchema.parse(event);
      const existing = events.get(parsed.idempotencyKey);

      if (existing !== undefined) {
        return Promise.resolve(existing);
      }

      events.set(parsed.idempotencyKey, parsed);

      return Promise.resolve(parsed);
    },
    async appendWithMutation(input) {
      const existing = events.get(input.event.idempotencyKey);

      if (existing !== undefined) {
        return {
          replayed: true,
          event: existing,
        };
      }

      const mutationResult = await input.mutate();
      const event = await this.append(input.event);

      return {
        replayed: false,
        event,
        mutationResult,
      };
    },
    listByTarget(input) {
      return this.queryStore({
        storeId: input.storeId,
        targetType: input.targetType,
        targetId: input.targetId,
        limit: input.limit ?? 25,
      }).then((page) => page.items);
    },
    queryStore(query) {
      const parsedQuery = AuditQuerySchema.parse(query);
      const sorted = [...events.values()]
        .filter((event) => matchesAuditQuery(event, parsedQuery))
        .sort(compareAuditEventsDesc);
      const startIndex =
        parsedQuery.cursor === undefined
          ? 0
          : Math.max(0, sorted.findIndex((event) => event.eventId === parsedQuery.cursor) + 1);
      const visible = sorted.slice(startIndex, startIndex + parsedQuery.limit);
      const next = sorted[startIndex + parsedQuery.limit];

      return Promise.resolve(
        AuditCursorPageSchema.parse({
          items: visible.map(toTimelineItem),
          ...(next === undefined ? {} : { nextCursor: next.eventId }),
        }),
      );
    },
    readEvents() {
      return [...events.values()];
    },
  };
}

export function createDatabaseAuditRepository(connectionString: string): AuditEventRepository {
  return fromDatabaseAuditRepository(createNeonAuditRepository({ connectionString }));
}

export function fromDatabaseAuditRepository(
  repository: DatabaseAuditRepository,
): AuditEventRepository {
  return {
    async append(event) {
      return fromDatabaseProjection(await repository.append(toDatabaseAppendInput(event)));
    },
    async appendWithMutation(input) {
      const result = await repository.appendWithMutation({
        event: toDatabaseAppendInput(input.event),
        mutate: input.mutate,
      });

      if (result.replayed) {
        return {
          replayed: true,
          event: fromDatabaseProjection(result.event),
        };
      }

      return {
        replayed: false,
        event: fromDatabaseProjection(result.event),
        mutationResult: result.mutationResult,
      };
    },
    async listByTarget(input) {
      const items = await repository.listByTarget(input);

      return items.map((event) => toTimelineItem(fromDatabaseProjection(event)));
    },
    async queryStore(query) {
      const page = await repository.queryStore({
        storeId: query.storeId,
        ...(query.from === undefined ? {} : { from: new Date(query.from) }),
        ...(query.to === undefined ? {} : { to: new Date(query.to) }),
        ...(query.actorId === undefined ? {} : { actorId: query.actorId }),
        ...(query.type === undefined ? {} : { type: query.type }),
        ...(query.targetType === undefined ? {} : { targetType: query.targetType }),
        ...(query.targetId === undefined ? {} : { targetId: query.targetId }),
        ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
        limit: query.limit,
      });

      return AuditCursorPageSchema.parse({
        items: page.items.map((event) => toTimelineItem(fromDatabaseProjection(event))),
        ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
      });
    },
  };
}

export function createAuditService(input: {
  repository: AuditEventRepository;
  now?: () => Date;
}): AuditService {
  const now = input.now ?? (() => new Date());

  return {
    async recordProtectedTaskAction(request) {
      const idempotencyKey =
        request.command.idempotencyKey ??
        `task-action:${request.command.storeId}:${request.taskId}:${request.command.action}:${request.command.occurredAt}`;
      const receivedAt = now().toISOString();
      const event = AuditEventRecordSchema.parse({
        eventId: createEventId(idempotencyKey),
        idempotencyKey,
        type: "task.changed",
        store: {
          storeId: request.actorContext.membership.storeId,
          storeName: request.actorContext.membership.storeName,
        },
        actor: {
          actorId: request.actorContext.identity.subjectId,
          displayName:
            request.actorContext.identity.displayName ?? request.actorContext.membership.subjectId,
          roleSnapshot: request.actorContext.membership.role,
        },
        target: {
          type: "task",
          id: request.taskId,
          label: targetLabelForTaskAction(request.taskId, request.command),
        },
        occurredAt: request.command.occurredAt,
        receivedAt,
        summary: taskActionSummary(request.command.action),
        ...(request.command.reason === undefined ? {} : { reason: request.command.reason }),
        status: "received",
        metadata: {
          action: request.command.action,
          ...(request.command.productDisplayName === undefined
            ? {}
            : { productDisplayName: request.command.productDisplayName }),
          ...(request.command.lotCode === undefined ? {} : { lotCode: request.command.lotCode }),
        },
      });
      const result = await input.repository.appendWithMutation({
        event,
        mutate: () =>
          Promise.resolve({
            taskId: request.taskId,
            action: request.command.action,
            status: "recorded",
            recordedAt: receivedAt,
          } satisfies TaskActionMutationResult),
      });

      return {
        action:
          result.replayed === true
            ? {
                taskId: request.taskId,
                action: request.command.action,
                status: "recorded",
                recordedAt: result.event.receivedAt,
              }
            : result.mutationResult,
        auditEvent: toTimelineItem(result.event),
        replayed: result.replayed,
      };
    },
    queryStore(query) {
      return input.repository.queryStore(AuditQuerySchema.parse(query));
    },
  };
}

export function createAuditAccessDeniedRecorder(input: {
  repository: AuditEventRepository;
  now?: () => Date;
}): AccessDeniedAuditRecorder {
  const now = input.now ?? (() => new Date());

  return {
    async recordAccessDenied(event: AccessDeniedEvent) {
      if (event.actorSubjectId === undefined || event.actorRoleSnapshot === undefined) {
        return;
      }

      const roleSnapshot =
        event.actorRoleSnapshot === "admin" ||
        event.actorRoleSnapshot === "lead" ||
        event.actorRoleSnapshot === "gpp"
          ? event.actorRoleSnapshot
          : "collaborator";
      const occurredAt = event.occurredAt;
      const storeId = event.storeScope ?? "unknown-store";

      await input.repository.append(
        AuditEventRecordSchema.parse({
          eventId: event.eventId,
          idempotencyKey: event.eventId,
          type: "access.denied",
          store: {
            storeId,
            storeName: storeId === "unknown-store" ? "Loja ficticia nao informada" : storeId,
          },
          actor: {
            actorId: event.actorSubjectId,
            displayName: event.actorDisplayName ?? event.actorSubjectId,
            roleSnapshot,
          },
          target: {
            type: "access_request",
            id: "redacted",
            label: denialTargetLabel(event.requestedCapability),
          },
          occurredAt,
          receivedAt: now().toISOString(),
          summary: event.summary,
          reason: event.reason,
          status: "denied",
          metadata: {
            requestedCapability: event.requestedCapability,
            denialReason: event.reason,
          },
        }),
      );
    },
  };
}

export function parseAuditQueryFromUrl(searchParams: URLSearchParams): AuditQuery {
  const rawQuery = {
    storeId: searchParams.get("storeId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    actorId: searchParams.get("actorId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    targetType: searchParams.get("targetType") ?? undefined,
    targetId: searchParams.get("targetId") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };

  return AuditQuerySchema.parse(removeUndefined(rawQuery));
}

function toDatabaseAppendInput(event: AuditEventRecord): DatabaseAppendAuditEventInput {
  return {
    eventId: event.eventId,
    idempotencyKey: event.idempotencyKey,
    type: event.type,
    storeId: event.store.storeId,
    storeName: event.store.storeName,
    actorId: event.actor.actorId,
    actorDisplayName: event.actor.displayName,
    actorRoleSnapshot: event.actor.roleSnapshot,
    occurredAt: new Date(event.occurredAt),
    receivedAt: new Date(event.receivedAt),
    targetType: event.target.type,
    targetId: event.target.id,
    ...(event.target.label === undefined ? {} : { targetLabel: event.target.label }),
    summary: event.summary,
    ...(event.reason === undefined ? {} : { reason: event.reason }),
    status: event.status,
    ...(event.linkedEventId === undefined ? {} : { linkedEventId: event.linkedEventId }),
    metadata: event.metadata,
  };
}

function fromDatabaseProjection(event: DatabaseAuditEventProjection): AuditEventRecord {
  return AuditEventRecordSchema.parse({
    eventId: event.eventId,
    idempotencyKey: event.idempotencyKey,
    type: event.type,
    store: {
      storeId: event.storeId,
      storeName: event.storeName,
    },
    actor: {
      actorId: event.actorId,
      displayName: event.actorDisplayName,
      roleSnapshot: event.actorRoleSnapshot,
    },
    target: {
      type: event.targetType,
      id: event.targetId,
      ...(event.targetLabel === undefined ? {} : { label: event.targetLabel }),
    },
    occurredAt: event.occurredAt.toISOString(),
    receivedAt: event.receivedAt.toISOString(),
    summary: event.summary,
    ...(event.reason === undefined ? {} : { reason: event.reason }),
    status: event.status,
    ...(event.linkedEventId === undefined ? {} : { linkedEventId: event.linkedEventId }),
    metadata: event.metadata,
  });
}

function toTimelineItem(event: AuditEventRecord): AuditTimelineItem {
  const { idempotencyKey: _idempotencyKey, ...timelineItem } = event;
  void _idempotencyKey;

  return AuditTimelineItemSchema.parse(timelineItem);
}

function matchesAuditQuery(event: AuditEventRecord, query: AuditQuery): boolean {
  return (
    event.store.storeId === query.storeId &&
    (query.type === undefined || event.type === query.type) &&
    (query.actorId === undefined || event.actor.actorId === query.actorId) &&
    (query.targetType === undefined || event.target.type === query.targetType) &&
    (query.targetId === undefined || event.target.id === query.targetId) &&
    (query.from === undefined || event.occurredAt >= query.from) &&
    (query.to === undefined || event.occurredAt <= query.to)
  );
}

function compareAuditEventsDesc(left: AuditEventRecord, right: AuditEventRecord): number {
  const timeDifference = right.occurredAt.localeCompare(left.occurredAt);

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return right.eventId.localeCompare(left.eventId);
}

function createEventId(idempotencyKey: string): string {
  return `audit:${idempotencyKey.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 120)}`;
}

function targetLabelForTaskAction(taskId: string, command: ProtectedTaskActionRequest): string {
  if (command.productDisplayName !== undefined && command.lotCode !== undefined) {
    return `${command.productDisplayName} - lote ${command.lotCode}`;
  }

  return command.productDisplayName ?? taskId;
}

function taskActionSummary(action: ProtectedTaskActionRequest["action"]): string {
  if (action === "withdraw") {
    return "Retirada registrada na area de venda.";
  }

  if (action === "repack") {
    return "Reembalagem registrada para o processado.";
  }

  if (action === "record_loss") {
    return "Perda registrada para o lote.";
  }

  if (action === "confirm_presence") {
    return "Presenca fisica confirmada.";
  }

  if (action === "request_markdown") {
    return "Solicitacao de rebaixa registrada.";
  }

  if (action === "move_lot") {
    return "Movimentacao de lote registrada.";
  }

  if (action === "complete_recheck") {
    return "Reconferencia da area de venda registrada.";
  }

  return "Acao operacional registrada.";
}

function denialTargetLabel(capability: Capability): string {
  if (capability === "command_center.read_store") {
    return "Command Center bloqueado";
  }

  if (capability === "catalog.review") {
    return "Revisao de catalogo bloqueada";
  }

  if (capability === "audit.read_store" || capability === "audit.read_global") {
    return "Consulta de auditoria bloqueada";
  }

  return "Acao operacional bloqueada";
}

function removeUndefined<TValue extends Record<string, unknown>>(
  value: TValue,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, Exclude<unknown, undefined>] => entry[1] !== undefined,
    ),
  );
}
