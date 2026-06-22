import {
  AuditEventRecordSchema,
  ShiftCloseEvaluationSchema,
  ShiftCloseReopenRequestSchema,
  ShiftCloseRequestSchema,
  ShiftClosureSnapshotSchema,
  ShiftHandoffAcknowledgementRequestSchema,
  ShiftHandoffReceiptSchema,
  type ShiftCloseEvaluation,
  type ShiftCloseReopenRequest,
  type ShiftCloseRequest,
  type ShiftClosureSnapshot,
  type ShiftHandoffAcknowledgementRequest,
  type ShiftHandoffReceipt,
} from "@validade-zero/contracts";
import {
  createNeonShiftCloseRepository,
  type ShiftCloseRepository,
  type ShiftClosurePersistenceRecord,
  type ShiftHandoffPersistenceRecord,
} from "@validade-zero/database/shift-close-repository";
import {
  evaluateShiftClose,
  type AuthorizedActorContext,
  type ShiftCloseEvaluationInput,
} from "@validade-zero/domain";
import type { AuditEventRepository } from "./audit";

export interface ShiftCloseRevalidator {
  evaluate(input: { storeId: string }): Promise<ShiftCloseEvaluation>;
}

export interface ShiftCloseService {
  close(input: {
    actorContext: AuthorizedActorContext;
    request: ShiftCloseRequest;
  }): Promise<{ closure: ShiftClosureSnapshot; replayed: boolean }>;
  acknowledgeHandoff(input: {
    actorContext: AuthorizedActorContext;
    request: ShiftHandoffAcknowledgementRequest;
  }): Promise<{ handoff: ShiftHandoffReceipt; replayed: boolean }>;
  reopen(input: {
    actorContext: AuthorizedActorContext;
    closureId: string;
    request: ShiftCloseReopenRequest;
  }): Promise<{ closure: ShiftClosureSnapshot; replayed: boolean }>;
}

export interface InMemoryShiftCloseRepository extends ShiftCloseRepository {
  readClosures(): readonly ShiftClosurePersistenceRecord[];
  readHandoffs(): readonly ShiftHandoffPersistenceRecord[];
}

export function createInMemoryShiftCloseRepository(): InMemoryShiftCloseRepository {
  const closuresById = new Map<string, ShiftClosurePersistenceRecord>();
  const closuresByIdempotency = new Map<string, ShiftClosurePersistenceRecord>();
  const handoffsByIdempotency = new Map<string, ShiftHandoffPersistenceRecord>();

  return {
    createClosure(input) {
      const existing = closuresByIdempotency.get(input.idempotencyKey);
      if (existing !== undefined) {
        if (existing.storeId !== input.storeId)
          throw new Error("Shift close idempotency cannot cross store scope.");
        return Promise.resolve({ closure: existing, replayed: true });
      }
      closuresById.set(input.closureId, input);
      closuresByIdempotency.set(input.idempotencyKey, input);
      return Promise.resolve({ closure: input, replayed: false });
    },
    findClosure(input) {
      const closure = closuresById.get(input.closureId);
      return Promise.resolve(closure?.storeId === input.storeId ? closure : undefined);
    },
    async createHandoff(input) {
      const existing = handoffsByIdempotency.get(input.idempotencyKey);
      if (existing !== undefined) {
        if (existing.storeId !== input.storeId)
          throw new Error("Shift handoff idempotency cannot cross store scope.");
        return { handoff: existing, replayed: true };
      }
      const closure = await this.findClosure({
        closureId: input.closureId,
        storeId: input.storeId,
      });
      if (closure === undefined)
        throw new Error("Shift close is unavailable in the authorized store scope.");
      handoffsByIdempotency.set(input.idempotencyKey, input);
      return { handoff: input, replayed: false };
    },
    readClosures() {
      return [...closuresById.values()];
    },
    readHandoffs() {
      return [...handoffsByIdempotency.values()];
    },
  };
}

export function createDatabaseShiftCloseRepository(connectionString: string): ShiftCloseRepository {
  return createNeonShiftCloseRepository({ connectionString });
}

export function createStaticShiftCloseRevalidator(
  input: ShiftCloseEvaluationInput,
): ShiftCloseRevalidator {
  return {
    evaluate() {
      return Promise.resolve(ShiftCloseEvaluationSchema.parse(evaluateShiftClose(input)));
    },
  };
}

export function createShiftCloseService(input: {
  repository?: ShiftCloseRepository;
  auditRepository: AuditEventRepository;
  revalidator?: ShiftCloseRevalidator;
  now?: () => Date;
  createId?: () => string;
}): ShiftCloseService {
  const repository = input.repository ?? createInMemoryShiftCloseRepository();
  const now = input.now ?? (() => new Date());
  const createId = input.createId ?? (() => crypto.randomUUID());
  const revalidator =
    input.revalidator ??
    createStaticShiftCloseRevalidator({
      cacheState: "offline_unavailable",
      tasks: [],
      checklist: [],
    });

  return {
    async close(inputValue) {
      const request = ShiftCloseRequestSchema.parse(inputValue.request);
      assertActorStore(inputValue.actorContext, request.storeId);
      const evaluation = ShiftCloseEvaluationSchema.parse(
        await revalidator.evaluate({ storeId: request.storeId }),
      );

      if (request.verdict === "safe" && evaluation.eligibility !== "eligible_safe") {
        throw new Error("Safe shift close requires current central eligibility without blockers.");
      }

      const receivedAt = now();
      const result = await repository.createClosure({
        closureId: `shift-close-${sanitizeIdentifier(createId())}`,
        idempotencyKey: request.idempotencyKey,
        storeId: request.storeId,
        storeName: inputValue.actorContext.membership.storeName,
        verdict: request.verdict,
        eligibility: evaluation.eligibility,
        blockers: evaluation.blockers,
        checklist: request.checklist,
        actorId: inputValue.actorContext.identity.subjectId,
        actorDisplayName:
          inputValue.actorContext.identity.displayName ??
          inputValue.actorContext.membership.subjectId,
        actorRoleSnapshot: inputValue.actorContext.membership.role,
        occurredAt: new Date(request.occurredAt),
        receivedAt,
        ruleVersion: evaluation.ruleVersion,
        ...(request.verdict === "unsafe"
          ? {
              reason: request.reason,
              continuityOwner: request.continuityOwner,
              continuityDeadline: new Date(request.continuityDeadline),
              note: request.note,
            }
          : {}),
      });

      if (!result.replayed) {
        await appendShiftAudit({
          repository: input.auditRepository,
          closure: result.closure,
          actorContext: inputValue.actorContext,
          summary:
            result.closure.verdict === "safe"
              ? "Turno encerrado com área segura."
              : "Turno encerrado com pendências e continuidade definida.",
          idempotencyKey: `audit:${request.idempotencyKey}:close`,
          occurredAt: request.occurredAt,
          receivedAt: receivedAt.toISOString(),
        });
      }

      return { closure: toSnapshot(result.closure), replayed: result.replayed };
    },
    async acknowledgeHandoff(inputValue) {
      const request = ShiftHandoffAcknowledgementRequestSchema.parse(inputValue.request);
      assertActorStore(inputValue.actorContext, request.storeId);
      const receivedAt = now();
      const result = await repository.createHandoff({
        handoffId: `shift-handoff-${sanitizeIdentifier(createId())}`,
        idempotencyKey: request.idempotencyKey,
        closureId: request.closureId,
        storeId: request.storeId,
        acknowledgedBy: inputValue.actorContext.identity.subjectId,
        acknowledgedDisplayName:
          inputValue.actorContext.identity.displayName ??
          inputValue.actorContext.membership.subjectId,
        acknowledgedRoleSnapshot: inputValue.actorContext.membership.role,
        acknowledgedAt: new Date(request.occurredAt),
        receivedAt,
      });

      if (!result.replayed) {
        await input.auditRepository.append(
          AuditEventRecordSchema.parse({
            eventId: `audit:${sanitizeIdentifier(request.idempotencyKey)}:handoff`,
            idempotencyKey: `audit:${request.idempotencyKey}:handoff`,
            type: "shift.changed",
            store: {
              storeId: request.storeId,
              storeName: inputValue.actorContext.membership.storeName,
            },
            actor: {
              actorId: inputValue.actorContext.identity.subjectId,
              displayName:
                inputValue.actorContext.identity.displayName ??
                inputValue.actorContext.membership.subjectId,
              roleSnapshot: inputValue.actorContext.membership.role,
            },
            target: { type: "shift", id: request.closureId, label: "Passagem de turno" },
            occurredAt: request.occurredAt,
            receivedAt: receivedAt.toISOString(),
            summary: "Recebimento da passagem de turno confirmado.",
            status: "received",
            metadata: { action: "shift.handoff_acknowledged" },
          }),
        );
      }

      return { handoff: toHandoffReceipt(result.handoff), replayed: result.replayed };
    },
    async reopen(inputValue) {
      const request = ShiftCloseReopenRequestSchema.parse(inputValue.request);
      assertActorStore(inputValue.actorContext, request.storeId);
      const original = await repository.findClosure({
        closureId: inputValue.closureId,
        storeId: request.storeId,
      });
      if (original === undefined)
        throw new Error("Shift close is unavailable in the authorized store scope.");

      const receivedAt = now();
      const result = await repository.createClosure({
        closureId: `shift-close-${sanitizeIdentifier(createId())}`,
        idempotencyKey: request.idempotencyKey,
        storeId: request.storeId,
        storeName: inputValue.actorContext.membership.storeName,
        verdict: "unsafe",
        eligibility: "must_close_unsafe",
        blockers: [
          {
            code: "incomplete_checklist",
            label: "Fechamento reaberto para nova conferência física.",
            actionLabel: "Revisar fechamento do turno",
          },
        ],
        checklist: [],
        actorId: inputValue.actorContext.identity.subjectId,
        actorDisplayName:
          inputValue.actorContext.identity.displayName ??
          inputValue.actorContext.membership.subjectId,
        actorRoleSnapshot: inputValue.actorContext.membership.role,
        occurredAt: new Date(request.occurredAt),
        receivedAt,
        ruleVersion: original.ruleVersion,
        reason: request.reason,
        continuityOwner:
          inputValue.actorContext.identity.displayName ??
          inputValue.actorContext.membership.subjectId,
        continuityDeadline: new Date(request.occurredAt),
        note: request.summary,
        revisionOfClosureId: original.closureId,
        reopenReason: request.reason,
        reopenSummary: request.summary,
      });

      if (!result.replayed) {
        await appendShiftAudit({
          repository: input.auditRepository,
          closure: result.closure,
          actorContext: inputValue.actorContext,
          summary: "Fechamento reaberto para nova revisão.",
          idempotencyKey: `audit:${request.idempotencyKey}:reopen`,
          occurredAt: request.occurredAt,
          receivedAt: receivedAt.toISOString(),
          linkedEventId: `audit:${sanitizeIdentifier(original.idempotencyKey)}:close`,
        });
      }

      return { closure: toSnapshot(result.closure), replayed: result.replayed };
    },
  };
}

function assertActorStore(actorContext: AuthorizedActorContext, storeId: string): void {
  if (actorContext.membership.storeId !== storeId) {
    throw new Error("Shift close operation is outside the authorized store scope.");
  }
}

async function appendShiftAudit(input: {
  repository: AuditEventRepository;
  closure: ShiftClosurePersistenceRecord;
  actorContext: AuthorizedActorContext;
  summary: string;
  idempotencyKey: string;
  occurredAt: string;
  receivedAt: string;
  linkedEventId?: string;
}): Promise<void> {
  await input.repository.append(
    AuditEventRecordSchema.parse({
      eventId: `audit:${sanitizeIdentifier(input.idempotencyKey)}`,
      idempotencyKey: input.idempotencyKey,
      type: "shift.changed",
      store: { storeId: input.closure.storeId, storeName: input.closure.storeName },
      actor: {
        actorId: input.actorContext.identity.subjectId,
        displayName:
          input.actorContext.identity.displayName ?? input.actorContext.membership.subjectId,
        roleSnapshot: input.actorContext.membership.role,
      },
      target: { type: "shift", id: input.closure.closureId, label: "Fechamento de turno" },
      occurredAt: input.occurredAt,
      receivedAt: input.receivedAt,
      summary: input.summary,
      ...(input.closure.reason === undefined ? {} : { reason: input.closure.reason }),
      status: "received",
      ...(input.linkedEventId === undefined ? {} : { linkedEventId: input.linkedEventId }),
      metadata: {
        verdict: input.closure.verdict,
        eligibility: input.closure.eligibility,
        blockerCount: input.closure.blockers.length,
      },
    }),
  );
}

function toSnapshot(record: ShiftClosurePersistenceRecord): ShiftClosureSnapshot {
  return ShiftClosureSnapshotSchema.parse({
    closureId: record.closureId,
    idempotencyKey: record.idempotencyKey,
    storeId: record.storeId,
    storeName: record.storeName,
    verdict: record.verdict,
    eligibility: record.eligibility,
    blockers: record.blockers,
    checklist: record.checklist,
    actor: {
      actorId: record.actorId,
      displayName: record.actorDisplayName,
      roleSnapshot: record.actorRoleSnapshot,
    },
    occurredAt: record.occurredAt.toISOString(),
    receivedAt: record.receivedAt.toISOString(),
    ruleVersion: record.ruleVersion,
    ...(record.reason === undefined ? {} : { reason: record.reason }),
    ...(record.continuityOwner === undefined ? {} : { continuityOwner: record.continuityOwner }),
    ...(record.continuityDeadline === undefined
      ? {}
      : { continuityDeadline: record.continuityDeadline.toISOString() }),
    ...(record.note === undefined ? {} : { note: record.note }),
    ...(record.revisionOfClosureId === undefined
      ? {}
      : { revisionOfClosureId: record.revisionOfClosureId }),
    ...(record.reopenReason === undefined ? {} : { reopenReason: record.reopenReason }),
    ...(record.reopenSummary === undefined ? {} : { reopenSummary: record.reopenSummary }),
  });
}

function toHandoffReceipt(record: ShiftHandoffPersistenceRecord): ShiftHandoffReceipt {
  return ShiftHandoffReceiptSchema.parse({
    handoffId: record.handoffId,
    closureId: record.closureId,
    storeId: record.storeId,
    acknowledgedBy: record.acknowledgedBy,
    acknowledgedAt: record.acknowledgedAt.toISOString(),
    receivedAt: record.receivedAt.toISOString(),
  });
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 120);
  if (sanitized.length === 0)
    throw new Error("Shift close identifier cannot be empty after sanitization.");
  return sanitized;
}
