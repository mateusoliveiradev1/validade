import {
  AuditEventRecordSchema,
  AuthorizationContract,
  GppAvariaCreateRequestSchema,
  GppAvariaFinalitySchema,
  GppBaixaRequestSchema,
  GppDetailSnapshotSchema,
  GppDivergenceMarkRequestSchema,
  GppMutationResponseSchema,
  GppProductIdentitySchema,
  GppPurchaseAttendanceRequestSchema,
  GppPurchaseCreateRequestSchema,
  GppQuantitySchema,
  GppQueueSnapshotSchema,
  GppRealtimeEnvelopeSchema,
  type AuditEventRecord,
  type GppAvariaEntry,
  type GppMutationResponse,
  type GppQueueSnapshot,
  type GppRealtimeEnvelope,
} from "@validade-zero/contracts";
import type {
  GppAttendPurchaseInput,
  GppCreateAvariaInput,
  GppCreatePurchaseInput,
  GppExceptionalAvariaInput,
  GppMarkDivergenceInput,
  GppMutationResult,
  GppRecordMovementInput,
  GppRepository,
} from "@validade-zero/database/gpp-repository";
import type { AuthorizedActorContext, Capability } from "@validade-zero/domain";
import type { Context, Hono } from "hono";
import { z } from "zod";
import type {
  AccessDeniedAuditRecorder,
  ApiAuthorizationDecision,
  AuthProvider,
  AuthorizationService,
  MembershipRepository,
} from "./auth";
import { toClientSafeDenial } from "./auth";
import type { AuditEventRepository } from "./audit";
import {
  createNoopGppRealtimePublisher,
  storeRoomName,
  type GppRealtimeRoomBinding,
  type GppRealtimePublisher,
} from "./gpp-realtime";

const RequiredIdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(280);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

const GppCorrectionRequestSchema = z
  .object({
    correctedProduct: GppProductIdentitySchema.optional(),
    correctedQuantity: GppQuantitySchema.optional(),
    correctedSector: RequiredTextSchema.optional(),
    justification: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
  })
  .strict();

const GppReviewCorrectionRequestSchema = z
  .object({
    approved: z.boolean(),
    justification: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
  })
  .strict();

const GppExceptionalRequestSchema = z
  .object({
    reason: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
  })
  .strict();

const GppMovementRequestSchema = z
  .object({
    kind: GppAvariaFinalitySchema,
    quantity: GppQuantitySchema,
    destination: RequiredTextSchema.optional(),
    justification: RequiredTextSchema.optional(),
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.kind === "baixa_gpp" || value.kind === "transferencia") &&
      value.justification === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["justification"],
        message: "GPP movement requires a justification.",
      });
    }
  });

export interface GppRoutesDependencies {
  enabled: boolean;
  repository: GppRepository;
  authProvider: AuthProvider;
  authorizationService: AuthorizationService;
  membershipRepository: MembershipRepository;
  auditRepository: AuditEventRepository;
  accessDeniedAuditRecorder: AccessDeniedAuditRecorder;
  realtimePublisher?: GppRealtimePublisher | undefined;
  realtimeRoomBinding?: GppRealtimeRoomBinding | undefined;
  now?: (() => Date) | undefined;
}

interface AuthorizedGppScope {
  actorContext: AuthorizedActorContext;
  capability: Capability;
}

interface DeniedGppScope {
  status: 403;
  body: ReturnType<typeof toClientSafeDenial>;
}

type GppScopeResolution = AuthorizedGppScope | DeniedGppScope;

interface GppMutationOptions {
  actorContext: AuthorizedActorContext;
  eventKind: GppRealtimeEnvelope["kind"];
  refreshScope: GppRealtimeEnvelope["refresh"]["scope"];
  mutate: () => Promise<GppMutationResult>;
}

export class GppService {
  private readonly now: () => Date;
  private readonly publisher: GppRealtimePublisher;

  constructor(private readonly deps: GppRoutesDependencies) {
    this.now = deps.now ?? (() => new Date());
    this.publisher = deps.realtimePublisher ?? createNoopGppRealtimePublisher();
  }

  readQueue(scope: { storeId: string; storeName: string }): Promise<GppQueueSnapshot> {
    return this.deps.repository
      .readQueue(scope)
      .then((snapshot) => GppQueueSnapshotSchema.parse(snapshot));
  }

  async runMutation(input: GppMutationOptions): Promise<{
    result: GppMutationResult;
    auditEvent: AuditEventRecord;
    realtimeState: "published" | "paused" | "skipped_replay";
  }> {
    const result = await input.mutate();
    const auditEvent = await this.deps.auditRepository.append(
      auditEventForGppMutation({
        result,
        actorContext: input.actorContext,
        receivedAt: this.now().toISOString(),
      }),
    );

    if (result.replayed) {
      return { result, auditEvent, realtimeState: "skipped_replay" };
    }

    const envelope = GppRealtimeEnvelopeSchema.parse({
      eventId: createRequestId("gpp-event", result.audit.idempotencyKey),
      storeId: input.actorContext.membership.storeId,
      kind: input.eventKind,
      occurredAt: mutationResponseTime(result.response),
      actorLabel:
        input.actorContext.identity.displayName ?? input.actorContext.membership.subjectId,
      refresh: {
        reason: input.eventKind === "gpp_history_changed" ? "history_append" : "central_commit",
        scope: input.refreshScope,
        topics: topicsForRealtimeEvent(input.eventKind, input.refreshScope),
      },
    });

    try {
      await this.publisher.publish(envelope);
      return { result, auditEvent, realtimeState: "published" };
    } catch {
      return { result, auditEvent, realtimeState: "paused" };
    }
  }
}

export function registerGppRoutes(api: Hono, deps: GppRoutesDependencies): void {
  const service = new GppService(deps);

  api.get("/gpp/realtime", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    if (deps.realtimeRoomBinding === undefined) {
      return context.json({ realtimeState: "paused", reason: "binding_unavailable" }, 503);
    }

    const scope = await authorizeGpp(context, deps, ["gpp.queue.read"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    const id = deps.realtimeRoomBinding.idFromName(
      storeRoomName(scope.actorContext.membership.storeId),
    );
    return deps.realtimeRoomBinding.get(id).fetch(context.req.raw);
  });

  api.get("/gpp/queue", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const scope = await authorizeGpp(context, deps, ["gpp.queue.read"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    try {
      return context.json(await service.readQueue(gppStoreScope(scope.actorContext)));
    } catch {
      return centralReadFailure(context);
    }
  });

  api.get("/gpp/detail/:groupId", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const scope = await authorizeGpp(context, deps, ["gpp.queue.read"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    try {
      const detail = await deps.repository.readDetail({
        storeId: scope.actorContext.membership.storeId,
        storeName: scope.actorContext.membership.storeName,
        groupId: context.req.param("groupId"),
      });
      return context.json(GppDetailSnapshotSchema.parse(detail));
    } catch {
      return centralReadFailure(context);
    }
  });

  api.get("/gpp/divergences", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const scope = await authorizeGpp(context, deps, ["gpp.queue.read"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    try {
      const snapshot = await service.readQueue(gppStoreScope(scope.actorContext));
      return context.json({ entries: snapshot.divergenceEntries });
    } catch {
      return centralReadFailure(context);
    }
  });

  api.get("/gpp/purchases", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const scope = await authorizeGpp(context, deps, ["gpp.queue.read", "gpp.purchase.attend"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    try {
      const snapshot = await service.readQueue(gppStoreScope(scope.actorContext));
      return context.json({ purchaseRequests: snapshot.purchaseRequests });
    } catch {
      return centralReadFailure(context);
    }
  });

  api.get("/gpp/history", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const scope = await authorizeGpp(context, deps, ["gpp.history.read"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    try {
      return context.json({
        history: await deps.repository.readHistory({
          storeId: scope.actorContext.membership.storeId,
          storeName: scope.actorContext.membership.storeName,
          ...optionalLimit(context.req.query("limit")),
        }),
      });
    } catch {
      return centralReadFailure(context);
    }
  });

  api.post("/gpp/avarias", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppAvariaCreateRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_gpp_avaria_request" }, 400);
    const scope = await authorizeGpp(context, deps, ["gpp.avaria.create"], parsed.data.storeId);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_entries_changed",
      refreshScope: "queue",
      requestId: createRequestId("gpp-avaria", parsed.data.idempotencyKey),
      mutate: () =>
        deps.repository.createAvaria({
          requestId: createRequestId("gpp-avaria", parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          request: parsed.data,
        } satisfies GppCreateAvariaInput),
    });
  });

  api.post("/gpp/avarias/:avariaId/movements", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppMovementRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_gpp_movement_request" }, 400);
    const scope = await authorizeGpp(context, deps, ["gpp.avaria.create"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);
    const avariaId = context.req.param("avariaId");

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_divergences_changed",
      refreshScope: "queue",
      requestId: createRequestId("gpp-movement", parsed.data.idempotencyKey),
      mutate: () =>
        deps.repository.recordMovement({
          requestId: createRequestId("gpp-movement", parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          avariaId,
          kind: parsed.data.kind,
          quantity: parsed.data.quantity,
          ...(parsed.data.destination === undefined
            ? {}
            : { destination: parsed.data.destination }),
          ...(parsed.data.justification === undefined
            ? {}
            : { justification: parsed.data.justification }),
          occurredAt: parsed.data.occurredAt,
          idempotencyKey: parsed.data.idempotencyKey,
        } satisfies GppRecordMovementInput),
    });
  });

  api.post("/gpp/avarias/:avariaId/correct", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppCorrectionRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_gpp_correction_request" }, 400);
    const scope = await authorizeGpp(context, deps, [
      "gpp.avaria.correct_store",
      "gpp.avaria.correct_own_pending",
    ]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);
    const avariaId = context.req.param("avariaId");
    const allowed = await canCorrectAvaria({
      repository: deps.repository,
      actorContext: scope.actorContext,
      capability: scope.capability,
      avariaId,
    });
    if (!allowed) return deniedByBusinessRule(context, deps, scope.actorContext, scope.capability);

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_entries_changed",
      refreshScope: "queue",
      requestId: createRequestId("gpp-correct", parsed.data.idempotencyKey),
      mutate: () =>
        deps.repository.correctAvaria({
          requestId: createRequestId("gpp-correct", parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          avariaId,
          ...(parsed.data.correctedProduct === undefined
            ? {}
            : { correctedProduct: parsed.data.correctedProduct }),
          ...(parsed.data.correctedQuantity === undefined
            ? {}
            : { correctedQuantity: parsed.data.correctedQuantity }),
          ...(parsed.data.correctedSector === undefined
            ? {}
            : { correctedSector: parsed.data.correctedSector }),
          justification: parsed.data.justification,
          occurredAt: parsed.data.occurredAt,
          idempotencyKey: parsed.data.idempotencyKey,
        }),
    });
  });

  api.post("/gpp/avarias/:avariaId/divergence", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppDivergenceMarkRequestSchema.safeParse({
      ...(isRecord(rawPayload) ? rawPayload : {}),
      avariaId: context.req.param("avariaId"),
    });
    if (!parsed.success) return context.json({ error: "invalid_gpp_divergence_request" }, 400);
    const scope = await authorizeGpp(context, deps, ["gpp.divergence.mark"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_entries_changed",
      refreshScope: "queue",
      requestId: createRequestId("gpp-divergence", parsed.data.idempotencyKey),
      mutate: () =>
        deps.repository.markDivergence({
          requestId: createRequestId("gpp-divergence", parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          request: parsed.data,
        } satisfies GppMarkDivergenceInput),
    });
  });

  api.post("/gpp/avarias/:avariaId/review", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppReviewCorrectionRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_gpp_review_request" }, 400);
    const scope = await authorizeGpp(context, deps, ["gpp.correction.review"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);
    const avariaId = context.req.param("avariaId");

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_entries_changed",
      refreshScope: "queue",
      requestId: createRequestId("gpp-review", parsed.data.idempotencyKey),
      mutate: () =>
        deps.repository.reviewCorrection({
          requestId: createRequestId("gpp-review", parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          avariaId,
          approved: parsed.data.approved,
          justification: parsed.data.justification,
          occurredAt: parsed.data.occurredAt,
          idempotencyKey: parsed.data.idempotencyKey,
        }),
    });
  });

  api.post("/gpp/avarias/baixa", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppBaixaRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_gpp_baixa_request" }, 400);
    const scope = await authorizeGpp(context, deps, ["gpp.avaria.baixar"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_entries_changed",
      refreshScope: "queue",
      requestId: createRequestId("gpp-baixa", parsed.data.idempotencyKey),
      mutate: () =>
        deps.repository.baixarAvaria({
          requestId: createRequestId("gpp-baixa", parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          request: parsed.data,
        }),
    });
  });

  registerExceptionalAvariaRoute(api, deps, service, "cancel", (repository, input) =>
    repository.cancelAvaria(input),
  );
  registerExceptionalAvariaRoute(
    api,
    deps,
    service,
    "administrative-correction",
    (repository, input) => repository.administrativeCorrection(input),
  );
  registerExceptionalAvariaRoute(api, deps, service, "estorno", (repository, input) =>
    repository.estornarAvaria(input),
  );

  api.post("/gpp/purchases", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppPurchaseCreateRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_gpp_purchase_request" }, 400);
    const scope = await authorizeGpp(context, deps, ["gpp.avaria.create"], parsed.data.storeId);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_purchase_requests_changed",
      refreshScope: "purchases",
      requestId: createRequestId("gpp-purchase", parsed.data.idempotencyKey),
      mutate: () =>
        deps.repository.createPurchaseRequest({
          requestId: createRequestId("gpp-purchase", parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          request: parsed.data,
        } satisfies GppCreatePurchaseInput),
    });
  });

  api.post("/gpp/purchases/:purchaseRequestId/attendance", async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppPurchaseAttendanceRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_gpp_purchase_attendance" }, 400);
    if (parsed.data.purchaseRequestId !== context.req.param("purchaseRequestId")) {
      return context.json({ error: "purchase_request_mismatch" }, 400);
    }
    const scope = await authorizeGpp(context, deps, ["gpp.purchase.attend"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_purchase_requests_changed",
      refreshScope: "purchases",
      requestId: createRequestId("gpp-purchase-attend", parsed.data.idempotencyKey),
      mutate: () =>
        deps.repository.attendPurchase({
          requestId: createRequestId("gpp-purchase-attend", parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          request: parsed.data,
        } satisfies GppAttendPurchaseInput),
    });
  });
}

function registerExceptionalAvariaRoute(
  api: Hono,
  deps: GppRoutesDependencies,
  service: GppService,
  action: "cancel" | "administrative-correction" | "estorno",
  run: (
    repository: GppRepository,
    input: GppExceptionalAvariaInput,
  ) => Promise<GppMutationResult<GppAvariaEntry>>,
): void {
  api.post(`/gpp/avarias/:avariaId/${action}`, async (context) => {
    if (!deps.enabled) return gppDisabled(context);
    const rawPayload = await parseJsonBody(context);
    const parsed = GppExceptionalRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_gpp_exceptional_request" }, 400);
    const scope = await authorizeGpp(context, deps, ["gpp.avaria.baixar"]);
    if (!isAuthorized(scope))
      return context.json(AuthorizationContract.denial.parse(scope.body), 403);
    const avariaId = context.req.param("avariaId");

    return runGppMutation(context, service, {
      actorContext: scope.actorContext,
      eventKind: "gpp_entries_changed",
      refreshScope: "queue",
      requestId: createRequestId(`gpp-${action}`, parsed.data.idempotencyKey),
      mutate: () =>
        run(deps.repository, {
          requestId: createRequestId(`gpp-${action}`, parsed.data.idempotencyKey),
          store: gppStoreScope(scope.actorContext),
          actor: actorSnapshot(scope.actorContext),
          avariaId,
          reason: parsed.data.reason,
          occurredAt: parsed.data.occurredAt,
          idempotencyKey: parsed.data.idempotencyKey,
        }),
    });
  });
}

async function runGppMutation(
  context: Context,
  service: GppService,
  input: GppMutationOptions & { requestId: string },
): Promise<Response> {
  try {
    const output = await service.runMutation(input);
    return context.json({
      response: output.result.response,
      replayed: output.result.replayed,
      data: output.result.data,
      audit: output.result.audit,
      auditEventId: output.auditEvent.eventId,
      realtimeState: output.realtimeState,
    });
  } catch (error) {
    if (isGppBusinessRejection(error)) {
      return context.json(
        { error: "gpp_mutation_rejected", message: safeErrorMessage(error) },
        409,
      );
    }

    return context.json(
      {
        error: "central_unavailable",
        response: centralFailedResponse(input.requestId, new Date().toISOString()),
      },
      503,
    );
  }
}

function isGppBusinessRejection(error: unknown): boolean {
  const message = safeErrorMessage(error);
  return /GPP|avaria|purchase|saldo|Baixado|Divergent|corrected|requested/i.test(message);
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "GPP mutation rejected.";
}

async function canCorrectAvaria(input: {
  repository: GppRepository;
  actorContext: AuthorizedActorContext;
  capability: Capability;
  avariaId: string;
}): Promise<boolean> {
  if (input.capability === "gpp.avaria.correct_store") return true;

  const entry = await input.repository.readAvaria({
    storeId: input.actorContext.membership.storeId,
    storeName: input.actorContext.membership.storeName,
    avariaId: input.avariaId,
  });

  return (
    entry.status === "pendente" && entry.actor.actorId === input.actorContext.identity.subjectId
  );
}

async function authorizeGpp(
  context: Context,
  deps: GppRoutesDependencies,
  capabilities: readonly Capability[],
  requestedStoreId?: string,
): Promise<GppScopeResolution> {
  const identity = await deps.authProvider.verify(context.req.raw);
  const memberships =
    identity === undefined
      ? []
      : await deps.membershipRepository.listActiveMemberships(identity.subjectId);
  const queryStoreId = normalizeOptional(context.req.query("storeId"));
  const targetStoreId =
    requestedStoreId ?? queryStoreId ?? memberships[0]?.storeId ?? "loja-nao-autorizada";

  let lastDecision: ApiAuthorizationDecision | undefined;
  for (const capability of capabilities) {
    const decision = await deps.authorizationService.authorize({
      identity,
      capability,
      resourceStoreId: targetStoreId,
    });
    lastDecision = decision;

    if (decision.allowed && decision.context !== undefined) {
      return {
        actorContext: decision.context,
        capability,
      };
    }
  }

  const capability = capabilities[0] ?? "gpp.queue.read";
  const decision = lastDecision ?? { allowed: false, reason: "capability_not_allowed" as const };
  const denial = await recordGppDeniedAccess({
    deps,
    identity,
    decision,
    capability,
    targetType: "gpp",
    storeScope: targetStoreId,
  });

  return {
    status: 403,
    body: denial,
  };
}

async function deniedByBusinessRule(
  context: Context,
  deps: GppRoutesDependencies,
  actorContext: AuthorizedActorContext,
  capability: Capability,
): Promise<Response> {
  const denial = await recordGppDeniedAccess({
    deps,
    identity: actorContext.identity,
    decision: {
      allowed: false,
      reason: "capability_not_allowed",
      auditMembership: actorContext.membership,
    },
    capability,
    targetType: "gpp_avaria",
    storeScope: actorContext.membership.storeId,
  });

  return context.json(AuthorizationContract.denial.parse(denial), 403);
}

async function recordGppDeniedAccess(input: {
  deps: GppRoutesDependencies;
  identity?: AuthorizedActorContext["identity"] | undefined;
  decision: ApiAuthorizationDecision;
  capability: Capability;
  targetType: string;
  storeScope: string;
}): Promise<ReturnType<typeof toClientSafeDenial>> {
  const denialId = createRequestId("denial-gpp", `${input.capability}:${Date.now()}`);

  await input.deps.accessDeniedAuditRecorder.recordAccessDenied({
    eventId: denialId,
    actorSubjectId: input.identity?.subjectId,
    actorDisplayName: input.identity?.displayName,
    actorRoleSnapshot: input.decision.auditMembership?.role,
    requestedCapability: input.capability,
    targetType: input.targetType,
    storeScope: input.storeScope,
    reason: input.decision.reason ?? "capability_not_allowed",
    occurredAt: (input.deps.now ?? (() => new Date()))().toISOString(),
    summary: "Access denied by GPP role and store scope policy.",
  });

  return toClientSafeDenial({
    reason: input.decision.reason ?? "capability_not_allowed",
    denialId,
  });
}

function auditEventForGppMutation(input: {
  result: GppMutationResult;
  actorContext: AuthorizedActorContext;
  receivedAt: string;
}): AuditEventRecord {
  const audit = input.result.audit;
  const occurredAt = mutationResponseTime(input.result.response);

  return AuditEventRecordSchema.parse({
    eventId: createRequestId("audit-gpp", audit.idempotencyKey),
    idempotencyKey: createRequestId("gpp-audit", audit.idempotencyKey),
    type: "gpp.changed",
    store: {
      storeId: input.actorContext.membership.storeId,
      storeName: input.actorContext.membership.storeName,
    },
    actor: actorSnapshot(input.actorContext),
    target: {
      type: audit.targetType,
      id: audit.targetId,
      label: audit.targetLabel,
    },
    occurredAt,
    receivedAt: input.receivedAt,
    summary: audit.summary,
    status: "received",
    metadata: compactMetadata({
      action: audit.action,
      sector: audit.sector,
      productCode: audit.productCode,
      productName: audit.productName,
      idempotencyKey: audit.idempotencyKey,
      replayed: audit.replayed,
      previousState: boundedState(audit.previous),
      nextState: boundedState(audit.next),
    }),
  });
}

function actorSnapshot(actorContext: AuthorizedActorContext) {
  return {
    actorId: actorContext.identity.subjectId,
    displayName: actorContext.identity.displayName ?? actorContext.membership.subjectId,
    roleSnapshot: actorContext.membership.role,
  };
}

function gppStoreScope(actorContext: AuthorizedActorContext) {
  return {
    storeId: actorContext.membership.storeId,
    storeName: actorContext.membership.storeName,
  };
}

function mutationResponseTime(response: GppMutationResponse): string {
  if (response.state === "central_confirmed") return response.confirmedAt;
  if (response.state === "central_failed") return response.failedAt;
  return response.replayedAt;
}

function topicsForRealtimeEvent(
  kind: GppRealtimeEnvelope["kind"],
  scope: GppRealtimeEnvelope["refresh"]["scope"],
): GppRealtimeEnvelope["refresh"]["topics"] {
  if (kind === "gpp_divergences_changed") return ["queue", "divergences", "history"];
  if (kind === "gpp_purchase_requests_changed") return ["purchases", "history"];
  if (kind === "gpp_history_changed") return ["history"];
  if (scope === "all") return ["queue", "purchases", "divergences", "history"];
  if (scope === "purchases") return ["purchases"];
  if (scope === "history") return ["history"];
  return ["queue"];
}

function centralFailedResponse(requestId: string, failedAt: string): GppMutationResponse {
  return GppMutationResponseSchema.parse({
    state: "central_failed",
    requestId,
    failedAt,
    retryable: true,
    message: "Central indisponivel. Tente novamente.",
  });
}

function gppDisabled(context: Context): Response {
  return context.json({ error: "gpp_disabled" }, 404);
}

function centralReadFailure(context: Context): Response {
  return context.json(
    {
      error: "central_unavailable",
      message: "Central indisponivel para Controle GPP.",
    },
    503,
  );
}

async function parseJsonBody(context: Context): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    return undefined;
  }
}

function parseLimit(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : undefined;
}

function optionalLimit(value: string | undefined): { limit?: number } {
  const limit = parseLimit(value);
  return limit === undefined ? {} : { limit };
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function isAuthorized(scope: GppScopeResolution): scope is AuthorizedGppScope {
  return "actorContext" in scope;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createRequestId(prefix: string, seed: string): string {
  return `${prefix}:${seed}`.replace(/[^a-zA-Z0-9:._-]/g, "-").slice(0, 160);
}

function boundedState(value: Record<string, unknown> | null): string {
  return JSON.stringify(value).slice(0, 240);
}

function compactMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined,
    ),
  );
}
