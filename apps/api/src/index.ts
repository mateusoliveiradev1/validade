import {
  createFakeExpoAlertDeliveryProvider,
  createLocalProviderRegistry,
  type AlertDeliveryProvider,
} from "@validade-zero/adapters";
import {
  AlertDeliveryResultSchema,
  AuthorizationContract,
  HEALTH_SERVICE_NAME,
  HealthContract,
  ProtectedCapabilityProbeResponseSchema,
  SafeProbeContract,
  SessionContextResponseSchema,
  SyncTransportBatchSchema,
  SyncTransportResultSchema,
  type AlertDeliveryResult,
  type AlertDispatchCommand,
  type SyncCommandRecord,
  type SyncConflictRecord,
  type SyncTransportBatch,
  type SyncTransportResult,
} from "@validade-zero/contracts";
import { createNeonAuditRepository } from "@validade-zero/database/audit-repository";
import { createNeonMembershipRepository } from "@validade-zero/database/membership-repository";
import type { Capability } from "@validade-zero/domain";
import { Hono } from "hono";
import {
  createAuthorizationService,
  createDefaultMemberships,
  createInMemoryAccessDeniedAuditRecorder,
  createInMemoryMembershipRepository,
  createSessionContext,
  FakeAuthProvider,
  toClientSafeDenial,
  type ApiAuthorizationDecision,
  type AccessDeniedAuditRecorder,
  type AuthProvider,
  type AuthorizationService,
  type MembershipRepository,
} from "./auth";

export interface SyncCommandService {
  handleBatch(batch: SyncTransportBatch): Promise<readonly SyncTransportResult[]>;
}

export interface InMemorySyncCommandService extends SyncCommandService {
  readResults(): readonly SyncTransportResult[];
}

export function createApiApp(input?: {
  syncCommandService?: SyncCommandService;
  authProvider?: AuthProvider;
  databaseUrl?: string;
  membershipRepository?: MembershipRepository;
  authorizationService?: AuthorizationService;
  accessDeniedAuditRecorder?: AccessDeniedAuditRecorder;
}): Hono {
  const api = new Hono();
  const providers = createLocalProviderRegistry();
  const syncCommandService = input?.syncCommandService ?? createInMemorySyncCommandService();
  const authProvider = input?.authProvider ?? new FakeAuthProvider("collaborator-local");
  const membershipRepository =
    input?.membershipRepository ??
    (input?.databaseUrl === undefined
      ? createInMemoryMembershipRepository(createDefaultMemberships())
      : createNeonMembershipRepository({ connectionString: input.databaseUrl }));
  const authorizationService =
    input?.authorizationService ?? createAuthorizationService({ memberships: membershipRepository });
  const accessDeniedAuditRecorder =
    input?.accessDeniedAuditRecorder ??
    (input?.databaseUrl === undefined
      ? createInMemoryAccessDeniedAuditRecorder()
      : createDatabaseAccessDeniedAuditRecorder(input.databaseUrl));

  api.get("/health", (context) => {
    const payload = HealthContract.response.parse({
      status: "ok",
      service: HEALTH_SERVICE_NAME,
      checkedAt: new Date().toISOString(),
    });

    return context.json(payload);
  });

  api.get("/probe", async (context) => {
    const payload = SafeProbeContract.payload.parse(await providers.safeProbe.read());

    return context.json(payload);
  });

  api.post("/probe", async (context) => {
    let rawPayload: unknown;

    try {
      rawPayload = await context.req.json();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }

    const parsed = SafeProbeContract.write.safeParse(rawPayload);

    if (!parsed.success) {
      return context.json({ error: "invalid_probe_payload" }, 400);
    }

    const payload = SafeProbeContract.payload.parse(await providers.safeProbe.write(parsed.data));

    return context.json(payload);
  });

  api.post("/sync/commands", async (context) => {
    let rawPayload: unknown;

    try {
      rawPayload = await context.req.json();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }

    const parsed = SyncTransportBatchSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return context.json({ error: "invalid_sync_batch" }, 400);
    }

    const results = await syncCommandService.handleBatch(parsed.data);

    return context.json({
      results: results.map((result) => SyncTransportResultSchema.parse(result)),
    });
  });

  api.get("/session/context", async (context) => {
    const identity = await authProvider.verify(context.req.raw);
    const storeId = context.req.query("storeId") ?? "loja-piloto";
    const decision = await authorizationService.authorize({
      identity,
      capability: "task.act",
      resourceStoreId: storeId,
    });

    if (!decision.allowed) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity,
        decision,
        capability: "task.act",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "session_context",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    const sessionContext = createSessionContext(decision);

    if (sessionContext === undefined) {
      return context.json(
        AuthorizationContract.denial.parse(
          toClientSafeDenial({ reason: "capability_not_allowed" }),
        ),
        403,
      );
    }

    return context.json(SessionContextResponseSchema.parse(sessionContext));
  });

  api.all("/session/probe/task-act", async (context) =>
    authorizeProbe({
      request: context.req.raw,
      storeId: context.req.query("storeId") ?? "loja-piloto",
      capability: "task.act",
      targetType: "task_probe",
      authProvider,
      authorizationService,
      accessDeniedAuditRecorder,
    }).then((result) => context.json(result.body, result.status)),
  );

  api.all("/session/probe/shift-close", async (context) =>
    authorizeProbe({
      request: context.req.raw,
      storeId: context.req.query("storeId") ?? "loja-piloto",
      capability: "shift.close",
      targetType: "shift_close_probe",
      authProvider,
      authorizationService,
      accessDeniedAuditRecorder,
    }).then((result) => context.json(result.body, result.status)),
  );

  return api;
}

export const app = createApiApp();

export function createInMemorySyncCommandService(input?: {
  now?: () => string;
  retryIdempotencyKeys?: readonly string[];
  conflictIdempotencyKeys?: readonly string[];
  remoteChangeSummary?: string;
}): InMemorySyncCommandService {
  const now = input?.now ?? (() => new Date().toISOString());
  const retryKeys = new Set(input?.retryIdempotencyKeys ?? []);
  const conflictKeys = new Set(input?.conflictIdempotencyKeys ?? []);
  const byIdempotencyKey = new Map<string, SyncTransportResult>();
  const results: SyncTransportResult[] = [];

  return {
    async handleBatch(batch) {
      const batchResults = batch.commands.map((command) => {
        const existing = byIdempotencyKey.get(command.idempotencyKey);

        if (existing !== undefined) {
          return existing;
        }

        const result = buildSyncResult(command, {
          now: now(),
          shouldRetry: retryKeys.has(command.idempotencyKey),
          shouldConflict: conflictKeys.has(command.idempotencyKey),
          ...(input?.remoteChangeSummary === undefined
            ? {}
            : { remoteChangeSummary: input.remoteChangeSummary }),
        });

        byIdempotencyKey.set(command.idempotencyKey, result);
        results.push(result);

        return result;
      });

      return Promise.resolve(batchResults);
    },
    readResults() {
      return results;
    },
  };
}

function buildSyncResult(
  command: SyncCommandRecord,
  input: {
    now: string;
    shouldRetry: boolean;
    shouldConflict: boolean;
    remoteChangeSummary?: string;
  },
): SyncTransportResult {
  if (input.shouldRetry) {
    return SyncTransportResultSchema.parse({
      status: "retry",
      commandId: command.id,
      idempotencyKey: command.idempotencyKey,
      retryAfterSeconds: 60,
      error: "Falha temporaria no sync piloto.",
    });
  }

  if (input.shouldConflict) {
    return SyncTransportResultSchema.parse({
      status: "conflict",
      commandId: command.id,
      idempotencyKey: command.idempotencyKey,
      conflict: buildSyncConflict(command, input),
    });
  }

  return SyncTransportResultSchema.parse({
    status: "ack",
    commandId: command.id,
    idempotencyKey: command.idempotencyKey,
    syncedAt: input.now,
  });
}

function buildSyncConflict(
  command: SyncCommandRecord,
  input: { now: string; remoteChangeSummary?: string },
): SyncConflictRecord {
  return {
    id: `conflict:${command.id}`,
    commandId: command.id,
    severity: command.urgency,
    reason: "A tarefa mudou antes da sincronizacao.",
    localAction: {
      commandId: command.id,
      kind: command.kind,
      label: syncActionLabel(command),
      actorLabel: command.payload.payload.actorLabel,
      occurredAt: command.payload.payload.occurredAt,
      productDisplayName: command.productDisplayName,
      lotIdentity: command.lotIdentity,
      currentLocation: command.currentLocation,
    },
    remoteChange: {
      kind: "task_changed",
      summary: input.remoteChangeSummary ?? "A tarefa atual foi alterada em outro aparelho.",
      changedAt: input.now,
    },
    allowedActions: ["keep_local_and_retry", "use_current_task", "discard_offline_action"],
    createdAt: input.now,
  };
}

function syncActionLabel(command: SyncCommandRecord): string {
  if (command.payload.kind === "resolve_task") {
    return command.payload.payload.action;
  }

  if (command.payload.kind === "decide_markdown") {
    return command.payload.payload.decision === "approved" ? "approve_markdown" : "reject_markdown";
  }

  return command.kind;
}

export interface DueAlertDispatchRecord {
  dispatch: AlertDispatchCommand;
  expoPushToken: string;
}

export interface AlertDispatchResultRecord {
  attemptId: string;
  taskId: string;
  result: AlertDeliveryResult;
  dispatchedAt: string;
}

export interface AlertDispatchRepository {
  listDueAlerts(input: { now: string }): Promise<readonly DueAlertDispatchRecord[]>;
  recordDeliveryResult(input: AlertDispatchResultRecord): Promise<void>;
}

export interface AlertDispatchService {
  dispatchDueAlerts(referenceTime?: string): Promise<ScheduledAlertDispatchResult>;
}

export interface ScheduledAlertDispatchAttempt {
  attemptId: string;
  taskId: string;
  status: AlertDeliveryResult["status"];
  result: AlertDeliveryResult;
}

export interface ScheduledAlertDispatchResult {
  checkedAt: string;
  attempted: number;
  attempts: ScheduledAlertDispatchAttempt[];
}

export interface InMemoryAlertDispatchRepository extends AlertDispatchRepository {
  readDeliveryResults(): readonly AlertDispatchResultRecord[];
}

export function createInMemoryAlertDispatchRepository(
  dueAlerts: readonly DueAlertDispatchRecord[] = [],
): InMemoryAlertDispatchRepository {
  const deliveryResults: AlertDispatchResultRecord[] = [];

  return {
    listDueAlerts() {
      return Promise.resolve(dueAlerts);
    },
    recordDeliveryResult(input) {
      deliveryResults.push(input);
      return Promise.resolve();
    },
    readDeliveryResults() {
      return deliveryResults;
    },
  };
}

export function createAlertDispatchService(input: {
  repository: AlertDispatchRepository;
  provider: AlertDeliveryProvider;
  now?: () => Date;
}): AlertDispatchService {
  const now = input.now ?? (() => new Date());

  return {
    async dispatchDueAlerts(referenceTime = now().toISOString()) {
      const dueAlerts = await input.repository.listDueAlerts({ now: referenceTime });
      const attempts: ScheduledAlertDispatchAttempt[] = [];

      for (const dueAlert of dueAlerts) {
        const result = AlertDeliveryResultSchema.parse(
          await input.provider.send({
            command: dueAlert.dispatch,
            expoPushToken: dueAlert.expoPushToken,
          }),
        );

        await input.repository.recordDeliveryResult({
          attemptId: dueAlert.dispatch.attemptId,
          taskId: dueAlert.dispatch.taskId,
          result,
          dispatchedAt: referenceTime,
        });

        attempts.push({
          attemptId: dueAlert.dispatch.attemptId,
          taskId: dueAlert.dispatch.taskId,
          status: result.status,
          result,
        });
      }

      return {
        checkedAt: referenceTime,
        attempted: attempts.length,
        attempts,
      };
    },
  };
}

export function createDefaultAlertDispatchService(): AlertDispatchService {
  return createAlertDispatchService({
    repository: createInMemoryAlertDispatchRepository(),
    provider: createFakeExpoAlertDeliveryProvider(),
  });
}

export interface ScheduledControllerLike {
  scheduledTime?: number;
  cron?: string;
}

export function createScheduledAlertHandler(
  serviceFactory: () => AlertDispatchService = createDefaultAlertDispatchService,
) {
  return async function scheduledAlertDispatch(
    event: ScheduledControllerLike,
    _env?: unknown,
    _context?: ExecutionContext,
  ): Promise<void> {
    void _env;
    void _context;

    const referenceTime =
      event.scheduledTime === undefined
        ? new Date().toISOString()
        : new Date(event.scheduledTime).toISOString();

    await serviceFactory().dispatchDueAlerts(referenceTime);
  };
}

export const scheduled = createScheduledAlertHandler();

const worker = {
  fetch(request: Request, env: unknown, context: ExecutionContext) {
    return app.fetch(request, env, context);
  },
  scheduled,
};

export default worker;

async function authorizeProbe(input: {
  request: Request;
  storeId: string;
  capability: Capability;
  targetType: string;
  authProvider: AuthProvider;
  authorizationService: AuthorizationService;
  accessDeniedAuditRecorder: AccessDeniedAuditRecorder;
}): Promise<{ status: 200 | 403; body: unknown }> {
  const identity = await input.authProvider.verify(input.request);
  const decision = await input.authorizationService.authorize({
    identity,
    capability: input.capability,
    resourceStoreId: input.storeId,
  });

  if (!decision.allowed) {
    return {
      status: 403,
      body: AuthorizationContract.denial.parse(
        await recordDeniedAccess({
          recorder: input.accessDeniedAuditRecorder,
          identity,
          decision,
          capability: input.capability,
          reason: decision.reason ?? "capability_not_allowed",
          targetType: input.targetType,
          storeScope: input.storeId,
        }),
      ),
    };
  }

  return {
    status: 200,
    body: ProtectedCapabilityProbeResponseSchema.parse({
      status: "authorized",
      capability: input.capability,
      checkedAt: new Date().toISOString(),
    }),
  };
}

async function recordDeniedAccess(input: {
  recorder: AccessDeniedAuditRecorder;
  identity?: import("@validade-zero/domain").AuthenticatedIdentity | undefined;
  decision?: ApiAuthorizationDecision | undefined;
  capability: Capability;
  reason: import("@validade-zero/domain").AuthorizationDenialReason;
  targetType: string;
  storeScope?: string | undefined;
}) {
  const denialId = `denial:${input.capability}:${Date.now()}`;

  await input.recorder.recordAccessDenied({
    eventId: denialId,
    actorSubjectId: input.identity?.subjectId,
    actorDisplayName: input.identity?.displayName,
    actorRoleSnapshot: input.decision?.auditMembership?.role,
    requestedCapability: input.capability,
    targetType: input.targetType,
    storeScope: input.storeScope,
    reason: input.reason,
    occurredAt: new Date().toISOString(),
    summary: "Access denied by role and store scope policy.",
  });

  return toClientSafeDenial({
    reason: input.reason,
    denialId,
  });
}

function createDatabaseAccessDeniedAuditRecorder(databaseUrl: string): AccessDeniedAuditRecorder {
  const repository = createNeonAuditRepository({ connectionString: databaseUrl });

  return {
    async recordAccessDenied(event) {
      if (event.actorSubjectId === undefined || event.actorRoleSnapshot === undefined) {
        return;
      }

      await repository.append({
        eventId: event.eventId,
        idempotencyKey: event.eventId,
        type: "access.denied",
        storeId: event.storeScope ?? "unknown-store",
        actorId: event.actorSubjectId,
        actorDisplayName: event.actorDisplayName ?? event.actorSubjectId,
        actorRoleSnapshot:
          event.actorRoleSnapshot === "admin" || event.actorRoleSnapshot === "lead"
            ? event.actorRoleSnapshot
            : "collaborator",
        occurredAt: new Date(event.occurredAt),
        targetType: event.targetType,
        targetId: "redacted",
        summary: event.summary,
        reason: event.reason,
        metadata: {
          requestedCapability: event.requestedCapability,
          denialReason: event.reason,
        },
      });
    },
  };
}
