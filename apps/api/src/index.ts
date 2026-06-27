import {
  createFakeExpoAlertDeliveryProvider,
  createInMemoryEvidenceStore,
  createLocalProviderRegistry,
  createR2EvidenceStore,
  type AlertDeliveryProvider,
  type EvidenceStore,
  type R2BucketLike,
} from "@validade-zero/adapters";
import {
  AlertDeliveryResultSchema,
  AuditEventRecordSchema,
  AuthorizationContract,
  ChangeMembershipRoleRequestSchema,
  CentralLotCreateRequestSchema,
  CentralLotWriteResponseSchema,
  CentralObservationAppendRequestSchema,
  CreateMembershipRequestSchema,
  EvidenceExceptionalAccessRequestSchema,
  EvidenceInvalidationRequestSchema,
  EvidenceUploadIntentRequestSchema,
  HEALTH_SERVICE_NAME,
  HealthContract,
  MembershipListResponseSchema,
  MembershipMutationResponseSchema,
  ProductDraftCreateRequestSchema,
  ProductDraftCreateResponseSchema,
  ProductDraftReviewRequestSchema,
  ProductDraftReviewResponseSchema,
  ProductSearchRequestSchema,
  ProductSearchResponseSchema,
  PrepareTurnRequestSchema,
  PrepareTurnResponseSchema,
  ProtectedCapabilityProbeResponseSchema,
  SafeProbeContract,
  RevokeMembershipRequestSchema,
  SessionContextResponseSchema,
  ShiftCloseReopenRequestSchema,
  ShiftCloseRequestSchema,
  ShiftHandoffAcknowledgementRequestSchema,
  SyncTransportBatchSchema,
  SyncTransportResultSchema,
  type ActiveTaskSnippet,
  type AlertDeliveryResult,
  type AlertDispatchCommand,
  type CentralAlertAudienceRegistration,
  CommandCenterProjectionSchema,
  type SyncCommandRecord,
  type SyncConflictRecord,
  type SyncTransportBatch,
  type SyncTransportResult,
} from "@validade-zero/contracts";
import type { EvidenceRepository } from "@validade-zero/database/evidence-repository";
import {
  createInMemoryAuthRepository,
  createNeonAuthRepository,
  createNeonLoginAttemptLimiter,
  type AuthRepository,
  type AuthRepositorySecrets,
} from "@validade-zero/database/auth-repository";
import { checkDatabaseHealth } from "@validade-zero/database/health-repository";
import {
  createInMemoryMembershipManagementRepository,
  createNeonMembershipRepository,
  type MembershipManagementRepository,
} from "@validade-zero/database/membership-repository";
import {
  createInMemoryCaptureRepository,
  createNeonCaptureRepository,
  type CaptureRepository,
} from "@validade-zero/database/capture-repository";
import type { ShiftCloseRepository } from "@validade-zero/database/shift-close-repository";
import { createPrivacySafeNotificationContent } from "@validade-zero/domain";
import type {
  AlertAudience,
  AuthenticatedIdentity,
  AuthorizedActorContext,
  AuthorizationDenialReason,
  Capability,
  StoreMembership,
} from "@validade-zero/domain";
import { Hono, type Context } from "hono";
import {
  createAuditAccessDeniedRecorder,
  createAuditService,
  createDatabaseAuditRepository,
  createInMemoryAuditRepository,
  parseAuditQueryFromUrl,
  ProtectedTaskActionRequestSchema,
  type AuditEventRepository,
} from "./audit";
import {
  createAuthorizationService,
  createDefaultMemberships,
  createSessionContext,
  PilotAuthProvider,
  toClientSafeDenial,
  type ApiAuthorizationDecision,
  type AccessDeniedAuditRecorder,
  type AuthProvider,
  type AuthorizationService,
  type MembershipRepository,
} from "./auth";
import {
  createAccessDeniedAuthSecurityRecorder,
  createInMemoryLoginAttemptLimiter,
  createNoopRecoveryDeliveryProvider,
  registerAuthenticationRoutes,
  type AuthSecurityAuditRecorder,
  type LoginAttemptLimiter,
  type RecoveryDeliveryProvider,
} from "./authentication";
import {
  createCaptureBackedCommandCenterService,
  type CommandCenterService,
} from "./command-center";
import {
  createDatabaseEvidenceRepository,
  createEvidenceService,
  createInMemoryEvidenceRepository,
  type EvidenceService,
} from "./evidence";
import { createMembershipService, type MembershipService } from "./memberships";
import {
  createCentralCaptureShiftCloseRevalidator,
  createDatabaseShiftCloseRepository,
  createInMemoryShiftCloseRepository,
  createShiftCloseService,
  type ShiftCloseRevalidator,
  type ShiftCloseService,
} from "./shift-close";

export interface SyncCommandService {
  handleBatch(
    batch: SyncTransportBatch,
    context?: SyncCommandApplyContext,
  ): Promise<readonly SyncTransportResult[]>;
}

export interface InMemorySyncCommandService extends SyncCommandService {
  readResults(): readonly SyncTransportResult[];
}

export interface SyncCommandApplyContext {
  storeId: string;
  storeName: string;
  deviceId: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: "collaborator" | "lead" | "admin";
  receivedAt: string;
}

export interface WorkerEnvironment {
  VALIDADE_ZERO_APP_ENV?: string;
  NEON_DATABASE_URL?: string;
  AUTH_TOKEN_PEPPER?: string;
  AUTH_PASSWORD_PEPPER?: string;
  AUTH_SESSION_TTL_SECONDS?: string;
  AUTH_RECOVERY_TTL_SECONDS?: string;
  EVIDENCE_STORE_MODE?: string;
  EVIDENCE_BUCKET?: R2BucketLike;
}

export function createApiApp(input?: {
  syncCommandService?: SyncCommandService;
  authRepository?: AuthRepository;
  authSecrets?: AuthRepositorySecrets;
  authProvider?: AuthProvider;
  auditRepository?: AuditEventRepository;
  databaseUrl?: string;
  membershipRepository?: MembershipRepository;
  membershipManagementRepository?: MembershipManagementRepository;
  membershipService?: MembershipService;
  evidenceRepository?: EvidenceRepository;
  evidenceStore?: EvidenceStore;
  evidenceService?: EvidenceService;
  captureRepository?: CaptureRepository;
  shiftCloseRepository?: ShiftCloseRepository;
  shiftCloseRevalidator?: ShiftCloseRevalidator;
  shiftCloseService?: ShiftCloseService;
  authorizationService?: AuthorizationService;
  accessDeniedAuditRecorder?: AccessDeniedAuditRecorder;
  authSecurityAuditRecorder?: AuthSecurityAuditRecorder;
  recoveryDeliveryProvider?: RecoveryDeliveryProvider;
  loginAttemptLimiter?: LoginAttemptLimiter;
  sessionTtlSeconds?: number;
  recoveryTtlSeconds?: number;
  commandCenterService?: CommandCenterService;
  runtimeConfig?: {
    appEnv?: string;
    evidenceStoreMode?: "memory" | "r2";
  };
  now?: () => Date;
}): Hono {
  const api = new Hono();
  const providers = createLocalProviderRegistry();
  const now = input?.now ?? (() => new Date());
  const membershipManagementRepository =
    input?.membershipManagementRepository ??
    (input?.databaseUrl === undefined
      ? createInMemoryMembershipManagementRepository(
          createDefaultMemberships().map((membership, index) => ({
            membershipId: `membership-default-${index + 1}`,
            ...membership,
            displayName:
              membership.subjectId === "lead-local"
                ? "Lideranca local"
                : membership.subjectId === "admin-local"
                  ? "Administracao local"
                  : "Colaborador local",
            version: 1,
            createdAt: new Date("2030-01-10T12:00:00.000Z"),
            updatedAt: new Date("2030-01-10T12:00:00.000Z"),
          })),
        )
      : createNeonMembershipRepository({ connectionString: input.databaseUrl }));
  const membershipRepository = input?.membershipRepository ?? membershipManagementRepository;
  const authRepository =
    input?.authRepository ??
    (input?.databaseUrl === undefined
      ? createInMemoryAuthRepository({
          memberships: membershipRepository,
          secrets: createLocalAuthSecrets(),
        })
      : createConfiguredNeonAuthRepository(input.databaseUrl, input.authSecrets));
  const sessionProvider = new PilotAuthProvider(authRepository, now);
  const authProvider = input?.authProvider ?? sessionProvider;
  const authorizationService =
    input?.authorizationService ??
    createAuthorizationService({ memberships: membershipRepository });
  const auditRepository =
    input?.auditRepository ??
    (input?.databaseUrl === undefined
      ? createInMemoryAuditRepository()
      : createDatabaseAuditRepository(input.databaseUrl));
  const auditService = createAuditService({ repository: auditRepository, now });
  const accessDeniedAuditRecorder =
    input?.accessDeniedAuditRecorder ??
    createAuditAccessDeniedRecorder({ repository: auditRepository, now });
  const authSecurityAuditRecorder =
    input?.authSecurityAuditRecorder ??
    createAccessDeniedAuthSecurityRecorder({
      recorder: accessDeniedAuditRecorder,
      memberships: membershipRepository,
    });
  const membershipService =
    input?.membershipService ??
    createMembershipService({
      repository: membershipManagementRepository,
      auditRepository,
      now,
    });
  const evidenceRepository =
    input?.evidenceRepository ??
    (input?.databaseUrl === undefined
      ? createInMemoryEvidenceRepository()
      : createDatabaseEvidenceRepository(input.databaseUrl));
  const evidenceStore = input?.evidenceStore ?? createInMemoryEvidenceStore();
  const evidenceStoreMode = input?.runtimeConfig?.evidenceStoreMode ?? "memory";
  const appEnv =
    input?.runtimeConfig?.appEnv ?? (input?.databaseUrl === undefined ? "local" : "production");
  const evidenceService =
    input?.evidenceService ??
    createEvidenceService({
      repository: evidenceRepository,
      store: evidenceStore,
      auditRepository,
      now,
    });
  const captureRepository =
    input?.captureRepository ??
    (input?.databaseUrl === undefined
      ? createInMemoryCaptureRepository()
      : createNeonCaptureRepository({ connectionString: input.databaseUrl }));
  const commandCenterService =
    input?.commandCenterService ??
    createCaptureBackedCommandCenterService({
      captureRepository,
      now,
    });
  const syncCommandService =
    input?.syncCommandService ?? createCentralCaptureSyncCommandService({ captureRepository, now });
  const shiftCloseRepository =
    input?.shiftCloseRepository ??
    (input?.databaseUrl === undefined
      ? createInMemoryShiftCloseRepository()
      : createDatabaseShiftCloseRepository(input.databaseUrl));
  const shiftCloseService =
    input?.shiftCloseService ??
    createShiftCloseService({
      repository: shiftCloseRepository,
      auditRepository,
      revalidator:
        input?.shiftCloseRevalidator ??
        createCentralCaptureShiftCloseRevalidator({ captureRepository, now }),
      now,
    });

  registerAuthenticationRoutes(api, {
    repository: authRepository,
    authProvider,
    sessionProvider,
    authorizationService,
    membershipRepository,
    membershipService,
    accessDeniedAuditRecorder,
    authSecurityAuditRecorder,
    recoveryDeliveryProvider:
      input?.recoveryDeliveryProvider ?? createNoopRecoveryDeliveryProvider(),
    loginAttemptLimiter: input?.loginAttemptLimiter ?? createInMemoryLoginAttemptLimiter(),
    now,
    sessionTtlSeconds: input?.sessionTtlSeconds ?? 28_800,
    recoveryTtlSeconds: input?.recoveryTtlSeconds ?? 1_800,
  });

  api.get("/health", (context) => {
    const payload = HealthContract.response.parse({
      status: "ok",
      service: HEALTH_SERVICE_NAME,
      checkedAt: new Date().toISOString(),
    });

    return context.json(payload);
  });

  api.get("/health/deep", async (context) => {
    const checkedAt = now();
    const database =
      input?.databaseUrl === undefined
        ? {
            ok: false,
            checkedAt: checkedAt.toISOString(),
            missingTables: ["database_not_configured"],
            missingColumns: [],
          }
        : await checkDatabaseHealth({ connectionString: input.databaseUrl, checkedAt }).catch(
            () => ({
              ok: false,
              checkedAt: checkedAt.toISOString(),
              missingTables: ["database_unavailable"],
              missingColumns: [],
            }),
          );
    const authConfigured =
      input?.authSecrets !== undefined &&
      input.authSecrets.tokenPepper.length >= 16 &&
      input.authSecrets.passwordPepper.length >= 16;
    const evidenceOk = appEnv === "local" || evidenceStoreMode === "r2";
    const status = database.ok && authConfigured && evidenceOk ? "ok" : "degraded";

    return context.json(
      {
        status,
        service: HEALTH_SERVICE_NAME,
        checkedAt: checkedAt.toISOString(),
        checks: {
          database,
          auth: { ok: authConfigured },
          evidence: { ok: evidenceOk, mode: evidenceStoreMode },
        },
      },
      status === "ok" ? 200 : 503,
    );
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
    const storeId = context.req.query("storeId") ?? "loja-piloto";
    const storeName = normalizeStoreName(context.req.query("storeName"), storeId);
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

    const receivedAt = now().toISOString();
    const results = await syncCommandService.handleBatch(parsed.data, {
      storeId,
      storeName,
      deviceId: parsed.data.deviceId,
      actorId: safeAuditIdentifier(`device:${parsed.data.deviceId}`),
      actorDisplayName: `Aparelho ${parsed.data.deviceId}`.slice(0, 120),
      actorRoleSnapshot: "collaborator",
      receivedAt,
    });

    try {
      await recordSyncAuditEvents({
        auditRepository,
        batch: parsed.data,
        results,
        storeId,
        storeName,
        receivedAt,
      });
    } catch {
      return context.json({ error: "sync_audit_failed" }, 503);
    }

    return context.json({
      results: results.map((result) => SyncTransportResultSchema.parse(result)),
    });
  });

  api.post("/capture/prepare-turn", async (context) => {
    const rawPayload = await parseJsonBody(context);
    const parsed = PrepareTurnRequestSchema.safeParse(rawPayload);
    const requestId = createPrepareTurnRequestId(parsed.success ? parsed.data.deviceId : "device");
    const requestedStoreId = normalizeOptionalQueryValue(context.req.query("storeId"));

    if (!parsed.success) {
      return context.json({ error: "invalid_prepare_turn_request" }, 400);
    }

    const resolved = await resolvePrepareTurnScope({
      request: context.req.raw,
      requestedStoreId,
      authProvider,
      authorizationService,
      membershipRepository,
      capability: "task.act",
    });

    if (!resolved.allowed) {
      const storeId = resolved.storeId ?? requestedStoreId ?? "loja-nao-autorizada";
      const storeName = resolved.storeName ?? normalizeStoreName(undefined, storeId);
      await captureRepository.recordPrepareTurnRejected({
        requestId,
        storeId,
        storeName,
        actorId: resolved.identity?.subjectId ?? "sessao-nao-autenticada",
        actorDisplayName: resolved.identity?.displayName ?? "Sessao nao autenticada",
        actorRoleSnapshot: roleSnapshotForAudit(resolved.decision.auditMembership?.role),
        reason: resolved.reason,
        occurredAt: now(),
      });
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: resolved.identity,
        decision: resolved.decision,
        capability: "task.act",
        reason: resolved.reason,
        targetType: "prepare_turn",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      const actorContext = resolved.decision.context;
      const response = await captureRepository.prepareTurn({
        requestId,
        storeId: actorContext.membership.storeId,
        storeName: actorContext.membership.storeName,
        actorId: actorContext.identity.subjectId,
        actorDisplayName: actorContext.identity.displayName ?? actorContext.membership.subjectId,
        actorRoleSnapshot: roleSnapshotForAudit(actorContext.membership.role),
        request: parsed.data,
      });

      return context.json(PrepareTurnResponseSchema.parse(response));
    } catch {
      return context.json({ error: "prepare_turn_unavailable" }, 503);
    }
  });

  api.post("/capture/products/search", async (context) => {
    const rawPayload = await parseJsonBody(context);
    const parsed = ProductSearchRequestSchema.safeParse(rawPayload);
    const requestId = createProductCatalogRequestId(
      "search",
      parsed.success ? (parsed.data.query ?? parsed.data.gtin ?? "category") : "invalid",
    );
    const requestedStoreId = normalizeOptionalQueryValue(context.req.query("storeId"));

    if (!parsed.success) {
      return context.json({ error: "invalid_product_search_request" }, 400);
    }

    const resolved = await resolvePrepareTurnScope({
      request: context.req.raw,
      requestedStoreId,
      authProvider,
      authorizationService,
      membershipRepository,
      capability: "task.act",
    });

    if (!resolved.allowed) {
      const storeId = resolved.storeId ?? requestedStoreId ?? "loja-nao-autorizada";
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: resolved.identity,
        decision: resolved.decision,
        capability: "task.act",
        reason: resolved.reason,
        targetType: "product_search",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      const actorContext = resolved.decision.context;
      const response = await captureRepository.searchProducts({
        requestId,
        storeId: actorContext.membership.storeId,
        request: parsed.data,
      });

      return context.json(ProductSearchResponseSchema.parse(response));
    } catch {
      return context.json({ error: "product_search_unavailable" }, 503);
    }
  });

  api.post("/capture/products/drafts", async (context) => {
    const rawPayload = await parseJsonBody(context);
    const parsed = ProductDraftCreateRequestSchema.safeParse(rawPayload);
    const requestId = createProductCatalogRequestId(
      "draft",
      parsed.success ? parsed.data.displayName : "invalid",
    );
    const requestedStoreId = normalizeOptionalQueryValue(context.req.query("storeId"));

    if (!parsed.success) {
      return context.json({ error: "invalid_product_draft_request" }, 400);
    }

    const resolved = await resolvePrepareTurnScope({
      request: context.req.raw,
      requestedStoreId,
      authProvider,
      authorizationService,
      membershipRepository,
      capability: "task.act",
    });

    if (!resolved.allowed) {
      const storeId = resolved.storeId ?? requestedStoreId ?? "loja-nao-autorizada";
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: resolved.identity,
        decision: resolved.decision,
        capability: "task.act",
        reason: resolved.reason,
        targetType: "product_draft",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      const actorContext = resolved.decision.context;
      const response = await captureRepository.createProductDraft({
        requestId,
        storeId: actorContext.membership.storeId,
        storeName: actorContext.membership.storeName,
        actorId: actorContext.identity.subjectId,
        actorDisplayName: actorContext.identity.displayName ?? actorContext.membership.subjectId,
        actorRoleSnapshot: roleSnapshotForAudit(actorContext.membership.role),
        request: parsed.data,
      });

      return context.json(ProductDraftCreateResponseSchema.parse(response));
    } catch {
      return context.json({ error: "product_draft_unavailable" }, 503);
    }
  });

  api.post("/capture/products/drafts/:draftId/review", async (context) => {
    const rawPayload = await parseJsonBody(context);
    const parsed = ProductDraftReviewRequestSchema.safeParse(rawPayload);
    const requestId = createProductCatalogRequestId("review", context.req.param("draftId"));
    const requestedStoreId = normalizeOptionalQueryValue(context.req.query("storeId"));

    if (!parsed.success || parsed.data.draftId !== context.req.param("draftId")) {
      return context.json({ error: "invalid_product_review_request" }, 400);
    }

    const resolved = await resolvePrepareTurnScope({
      request: context.req.raw,
      requestedStoreId,
      authProvider,
      authorizationService,
      membershipRepository,
      capability: "catalog.review",
    });

    if (!resolved.allowed) {
      const storeId = resolved.storeId ?? requestedStoreId ?? "loja-nao-autorizada";
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: resolved.identity,
        decision: resolved.decision,
        capability: "catalog.review",
        reason: resolved.reason,
        targetType: "product_draft_review",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      const actorContext = resolved.decision.context;
      const response = await captureRepository.reviewProductDraft({
        requestId,
        storeId: actorContext.membership.storeId,
        storeName: actorContext.membership.storeName,
        actorId: actorContext.identity.subjectId,
        actorDisplayName: actorContext.identity.displayName ?? actorContext.membership.subjectId,
        actorRoleSnapshot: roleSnapshotForAudit(actorContext.membership.role),
        request: parsed.data,
      });

      return context.json(ProductDraftReviewResponseSchema.parse(response));
    } catch (error) {
      if (error instanceof Error && error.message === "product_draft_not_found") {
        return context.json({ error: "product_draft_not_found" }, 404);
      }

      return context.json({ error: "product_review_unavailable" }, 503);
    }
  });

  api.post("/capture/lots", async (context) => {
    const rawPayload = await parseJsonBody(context);
    const parsed = CentralLotCreateRequestSchema.safeParse(rawPayload);
    const requestId = createLotWriteRequestId(
      "create",
      parsed.success ? parsed.data.lot.productId : "invalid",
      parsed.success ? parsed.data.idempotencyKey : undefined,
    );
    const requestedStoreId = normalizeOptionalQueryValue(context.req.query("storeId"));

    if (!parsed.success) {
      return context.json({ error: "invalid_central_lot_request" }, 400);
    }

    const resolved = await resolvePrepareTurnScope({
      request: context.req.raw,
      requestedStoreId,
      authProvider,
      authorizationService,
      membershipRepository,
      capability: "task.act",
    });

    if (!resolved.allowed) {
      const storeId = resolved.storeId ?? requestedStoreId ?? "loja-nao-autorizada";
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: resolved.identity,
        decision: resolved.decision,
        capability: "task.act",
        reason: resolved.reason,
        targetType: "central_lot",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      const actorContext = resolved.decision.context;
      const response = await captureRepository.createLot({
        requestId,
        storeId: actorContext.membership.storeId,
        storeName: actorContext.membership.storeName,
        actorId: actorContext.identity.subjectId,
        actorDisplayName: actorContext.identity.displayName ?? actorContext.membership.subjectId,
        actorRoleSnapshot: roleSnapshotForAudit(actorContext.membership.role),
        request: parsed.data,
      });

      return context.json(CentralLotWriteResponseSchema.parse(response));
    } catch (error) {
      if (error instanceof Error && error.message === "central_product_not_found") {
        return context.json({ error: "central_product_not_found" }, 404);
      }

      return context.json({ error: "central_lot_unavailable" }, 503);
    }
  });

  api.post("/capture/lots/:lotId/observations", async (context) => {
    const centralLotId = context.req.param("lotId");
    const rawPayload = await parseJsonBody(context);
    const parsed = CentralObservationAppendRequestSchema.safeParse(rawPayload);
    const requestId = createLotWriteRequestId(
      "observation",
      centralLotId,
      parsed.success ? parsed.data.idempotencyKey : undefined,
    );
    const requestedStoreId = normalizeOptionalQueryValue(context.req.query("storeId"));

    if (!parsed.success) {
      return context.json({ error: "invalid_central_observation_request" }, 400);
    }

    const resolved = await resolvePrepareTurnScope({
      request: context.req.raw,
      requestedStoreId,
      authProvider,
      authorizationService,
      membershipRepository,
      capability: "task.act",
    });

    if (!resolved.allowed) {
      const storeId = resolved.storeId ?? requestedStoreId ?? "loja-nao-autorizada";
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: resolved.identity,
        decision: resolved.decision,
        capability: "task.act",
        reason: resolved.reason,
        targetType: "central_observation",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      const actorContext = resolved.decision.context;
      const response = await captureRepository.appendObservation({
        requestId,
        storeId: actorContext.membership.storeId,
        storeName: actorContext.membership.storeName,
        actorId: actorContext.identity.subjectId,
        actorDisplayName: actorContext.identity.displayName ?? actorContext.membership.subjectId,
        actorRoleSnapshot: roleSnapshotForAudit(actorContext.membership.role),
        centralLotId,
        request: parsed.data,
      });

      return context.json(CentralLotWriteResponseSchema.parse(response));
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "central_lot_not_found" || error.message === "central_product_not_found")
      ) {
        return context.json({ error: "central_lot_not_found" }, 404);
      }

      return context.json({ error: "central_observation_unavailable" }, 503);
    }
  });

  api.post("/tasks/:taskId/actions", async (context) => {
    let rawPayload: unknown;

    try {
      rawPayload = await context.req.json();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }

    const parsed = ProtectedTaskActionRequestSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return context.json({ error: "invalid_task_action" }, 400);
    }

    const identity = await authProvider.verify(context.req.raw);
    const decision = await authorizationService.authorize({
      identity,
      capability: "task.act",
      resourceStoreId: parsed.data.storeId,
    });

    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity,
        decision,
        capability: "task.act",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "task_action",
        storeScope: parsed.data.storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    const result = await auditService.recordProtectedTaskAction({
      actorContext: decision.context,
      taskId: context.req.param("taskId"),
      command: parsed.data,
    });

    return context.json(result);
  });

  api.post("/evidence/upload-intents", async (context) => {
    let rawPayload: unknown;

    try {
      rawPayload = await context.req.json();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }

    const parsed = EvidenceUploadIntentRequestSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return context.json({ error: "invalid_evidence_upload_intent" }, 400);
    }

    const decision = await authorizeRequest({
      request: context.req.raw,
      storeId: parsed.data.storeId,
      capability: "evidence.attach",
      authProvider,
      authorizationService,
    });

    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: decision.identity,
        decision,
        capability: "evidence.attach",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "evidence_upload_intent",
        storeScope: parsed.data.storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    return context.json(
      await evidenceService.createUploadIntent({
        actorContext: decision.context,
        request: parsed.data,
      }),
    );
  });

  api.put("/evidence/assets/:assetId/content", async (context) => {
    const storeId = context.req.query("storeId");

    if (storeId === undefined || storeId.trim().length === 0) {
      return context.json({ error: "missing_store_id" }, 400);
    }

    const body = await context.req.raw.arrayBuffer();
    const sha256 = context.req.header("x-evidence-sha256");
    const mimeType = context.req.header("content-type")?.split(";")[0]?.trim();

    if (sha256 === undefined || mimeType === undefined || body.byteLength === 0) {
      return context.json({ error: "invalid_evidence_upload" }, 400);
    }

    const decision = await authorizeRequest({
      request: context.req.raw,
      storeId,
      capability: "evidence.attach",
      authProvider,
      authorizationService,
    });

    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: decision.identity,
        decision,
        capability: "evidence.attach",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "evidence_upload",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      return context.json(
        await evidenceService.upload({
          actorContext: decision.context,
          assetId: context.req.param("assetId"),
          storeId,
          body,
          mimeType,
          sizeBytes: body.byteLength,
          sha256,
        }),
      );
    } catch {
      return context.json({ error: "evidence_upload_failed" }, 400);
    }
  });

  api.get("/evidence/assets/:assetId/metadata", async (context) => {
    const storeId = context.req.query("storeId");

    if (storeId === undefined || storeId.trim().length === 0) {
      return context.json({ error: "missing_store_id" }, 400);
    }

    const decision = await authorizeEvidenceRead({
      request: context.req.raw,
      storeId,
      authProvider,
      authorizationService,
    });

    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: decision.identity,
        decision,
        capability: "evidence.read_store",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "evidence_read",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    if (decision.capability === "evidence.read_global") {
      const confirmation = EvidenceExceptionalAccessRequestSchema.safeParse({
        storeId,
        confirmedTargetStore: context.req.query("confirmedTargetStore") === "true",
        reason: context.req.query("reason"),
      });

      if (!confirmation.success || !confirmation.data.confirmedTargetStore) {
        return context.json(
          {
            error: "exceptional_access_requires_confirmation",
            action: "Abrir evidência desta loja",
            storeId,
          },
          409,
        );
      }
    }

    const result = await evidenceService.read({
      assetId: context.req.param("assetId"),
      storeId,
    });

    if (result === undefined) {
      return context.json({ error: "evidence_not_found" }, 404);
    }

    if (decision.capability === "evidence.read_global") {
      await recordExceptionalEvidenceAccess({
        auditRepository,
        actorContext: decision.context,
        assetId: context.req.param("assetId"),
        storeId,
        reason: context.req.query("reason") ?? "Acesso administrativo excepcional confirmado.",
        now,
      });
    }

    return context.json(result.evidence);
  });

  api.post("/evidence/assets/:assetId/invalidation", async (context) => {
    let rawPayload: unknown;

    try {
      rawPayload = await context.req.json();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }

    const parsed = EvidenceInvalidationRequestSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return context.json({ error: "invalid_evidence_invalidation" }, 400);
    }

    const decision = await authorizeRequest({
      request: context.req.raw,
      storeId: parsed.data.storeId,
      capability: "evidence.invalidate",
      authProvider,
      authorizationService,
    });

    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: decision.identity,
        decision,
        capability: "evidence.invalidate",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "evidence_invalidation",
        storeScope: parsed.data.storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    return context.json(
      await evidenceService.invalidate({
        actorContext: decision.context,
        assetId: context.req.param("assetId"),
        request: parsed.data,
      }),
    );
  });

  api.post("/shift-closes", async (context) => {
    let rawPayload: unknown;
    try {
      rawPayload = await context.req.json();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }
    const parsed = ShiftCloseRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_shift_close" }, 400);

    const decision = await authorizeRequest({
      request: context.req.raw,
      storeId: parsed.data.storeId,
      capability: "shift.close",
      authProvider,
      authorizationService,
    });
    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: decision.identity,
        decision,
        capability: "shift.close",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "shift_close",
        storeScope: parsed.data.storeId,
      });
      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      return context.json(
        await shiftCloseService.close({ actorContext: decision.context, request: parsed.data }),
      );
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? "shift_close_rejected" : "shift_close_failed" },
        409,
      );
    }
  });

  api.post("/shift-closes/:closureId/handoff-acknowledgements", async (context) => {
    let rawPayload: unknown;
    try {
      rawPayload = await context.req.json();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }
    const parsed = ShiftHandoffAcknowledgementRequestSchema.safeParse({
      ...(typeof rawPayload === "object" && rawPayload !== null ? rawPayload : {}),
      closureId: context.req.param("closureId"),
    });
    if (!parsed.success) return context.json({ error: "invalid_shift_handoff" }, 400);

    const decision = await authorizeRequest({
      request: context.req.raw,
      storeId: parsed.data.storeId,
      capability: "shift.handoff_ack",
      authProvider,
      authorizationService,
    });
    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: decision.identity,
        decision,
        capability: "shift.handoff_ack",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "shift_handoff",
        storeScope: parsed.data.storeId,
      });
      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      return context.json(
        await shiftCloseService.acknowledgeHandoff({
          actorContext: decision.context,
          request: parsed.data,
        }),
      );
    } catch {
      return context.json({ error: "shift_handoff_rejected" }, 409);
    }
  });

  api.post("/shift-closes/:closureId/reopen", async (context) => {
    let rawPayload: unknown;
    try {
      rawPayload = await context.req.json();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }
    const parsed = ShiftCloseReopenRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_shift_reopen" }, 400);

    const decision = await authorizeRequest({
      request: context.req.raw,
      storeId: parsed.data.storeId,
      capability: "shift.close",
      authProvider,
      authorizationService,
    });
    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: decision.identity,
        decision,
        capability: "shift.close",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "shift_reopen",
        storeScope: parsed.data.storeId,
      });
      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      return context.json(
        await shiftCloseService.reopen({
          actorContext: decision.context,
          closureId: context.req.param("closureId"),
          request: parsed.data,
        }),
      );
    } catch {
      return context.json({ error: "shift_reopen_rejected" }, 409);
    }
  });

  api.get("/memberships", async (context) => {
    const storeId = context.req.query("storeId");
    if (storeId === undefined || storeId.trim().length === 0) {
      return context.json({ error: "missing_store_id" }, 400);
    }
    const decision = await authorizeRequest({
      request: context.req.raw,
      storeId,
      capability: "user.manage",
      authProvider,
      authorizationService,
    });
    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity: decision.identity,
        decision,
        capability: "user.manage",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "membership_list",
        storeScope: storeId,
      });
      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }
    return context.json(
      MembershipListResponseSchema.parse({
        items: await membershipService.list({ actorContext: decision.context, storeId }),
      }),
    );
  });

  api.post("/memberships", async (context) => {
    const rawPayload = await parseJsonBody(context);
    if (rawPayload === undefined) return context.json({ error: "invalid_json" }, 400);
    const parsed = CreateMembershipRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_membership_grant" }, 400);
    return handleMembershipMutation({
      context,
      storeId: parsed.data.storeId,
      authProvider,
      authorizationService,
      accessDeniedAuditRecorder,
      run: (actorContext) => membershipService.grant({ actorContext, request: parsed.data }),
    });
  });

  api.patch("/memberships/:membershipId/role", async (context) => {
    const rawPayload = await parseJsonBody(context);
    if (rawPayload === undefined) return context.json({ error: "invalid_json" }, 400);
    const parsed = ChangeMembershipRoleRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_membership_change" }, 400);
    return handleMembershipMutation({
      context,
      storeId: parsed.data.storeId,
      authProvider,
      authorizationService,
      accessDeniedAuditRecorder,
      run: (actorContext) =>
        membershipService.changeRole({
          actorContext,
          membershipId: context.req.param("membershipId"),
          request: parsed.data,
        }),
    });
  });

  api.post("/memberships/:membershipId/revoke", async (context) => {
    const rawPayload = await parseJsonBody(context);
    if (rawPayload === undefined) return context.json({ error: "invalid_json" }, 400);
    const parsed = RevokeMembershipRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return context.json({ error: "invalid_membership_revoke" }, 400);
    return handleMembershipMutation({
      context,
      storeId: parsed.data.storeId,
      authProvider,
      authorizationService,
      accessDeniedAuditRecorder,
      run: (actorContext) =>
        membershipService.revoke({
          actorContext,
          membershipId: context.req.param("membershipId"),
          request: parsed.data,
        }),
    });
  });

  api.get("/audit/events", async (context) => {
    let query: ReturnType<typeof parseAuditQueryFromUrl>;

    try {
      query = parseAuditQueryFromUrl(new URL(context.req.url).searchParams);
    } catch {
      return context.json({ error: "invalid_audit_query" }, 400);
    }

    const identity = await authProvider.verify(context.req.raw);
    const decision = await authorizationService.authorize({
      identity,
      capability: "audit.read_store",
      resourceStoreId: query.storeId,
    });

    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity,
        decision,
        capability: "audit.read_store",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "audit_query",
        storeScope: query.storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    return context.json(await auditService.queryStore(query));
  });

  api.get("/command-center", async (context) => {
    const storeId = context.req.query("storeId") ?? "loja-piloto";
    const identity = await authProvider.verify(context.req.raw);
    const decision = await authorizationService.authorize({
      identity,
      capability: "command_center.read_store",
      resourceStoreId: storeId,
    });

    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity,
        decision,
        capability: "command_center.read_store",
        reason: decision.reason ?? "capability_not_allowed",
        targetType: "command_center",
        storeScope: storeId,
      });

      return context.json(AuthorizationContract.denial.parse(denial), 403);
    }

    try {
      return context.json(
        CommandCenterProjectionSchema.parse(
          await commandCenterService.read({
            storeId,
            storeName: decision.context.membership.storeName,
          }),
        ),
      );
    } catch {
      return context.json({ error: "command_center_unavailable" }, 503);
    }
  });

  api.get("/session/context", async (context) => {
    const identity = await authProvider.verify(context.req.raw);
    const storeId = context.req.query("storeId") ?? "loja-piloto";
    const commandCenterReadDecision = await authorizationService.authorize({
      identity,
      capability: "command_center.read_store",
      resourceStoreId: storeId,
    });
    const taskDecision = await authorizationService.authorize({
      identity,
      capability: "task.act",
      resourceStoreId: storeId,
    });
    const productReviewDecision = await authorizationService.authorize({
      identity,
      capability: "catalog.review",
      resourceStoreId: storeId,
    });

    const userManagementDecision = await authorizationService.authorize({
      identity,
      capability: "user.manage",
      resourceStoreId: storeId,
    });
    const shiftCloseDecision = await authorizationService.authorize({
      identity,
      capability: "shift.close",
      resourceStoreId: storeId,
    });
    const auditReadDecision = await authorizationService.authorize({
      identity,
      capability: "audit.read_store",
      resourceStoreId: storeId,
    });
    const decision = commandCenterReadDecision.allowed
      ? commandCenterReadDecision
      : taskDecision.allowed
        ? taskDecision
        : productReviewDecision.allowed
          ? productReviewDecision
          : userManagementDecision.allowed
            ? userManagementDecision
            : shiftCloseDecision.allowed
              ? shiftCloseDecision
              : auditReadDecision.allowed
                ? auditReadDecision
                : commandCenterReadDecision;

    if (!decision.allowed) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity,
        decision,
        capability: "command_center.read_store",
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

    return context.json(
      SessionContextResponseSchema.parse({
        ...sessionContext,
        actions: {
          ...sessionContext.actions,
          canReadCommandCenter: commandCenterReadDecision.allowed,
          canActOnTask: taskDecision.allowed,
          canReviewProductDrafts: productReviewDecision.allowed,
          canCloseShift: shiftCloseDecision.allowed,
          canReadStoreAudit: auditReadDecision.allowed,
          canManageUsers: userManagementDecision.allowed,
        },
      }),
    );
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

function createLocalAuthSecrets(): AuthRepositorySecrets {
  return {
    tokenPepper: "validade-zero-local-token-pepper-not-for-deployment",
    passwordPepper: "validade-zero-local-password-pepper-not-for-deployment",
  };
}

function createConfiguredNeonAuthRepository(
  databaseUrl: string,
  secrets: AuthRepositorySecrets | undefined,
): AuthRepository {
  if (secrets === undefined) {
    throw new Error("Persistent authentication requires token and password peppers.");
  }
  return createNeonAuthRepository({ connectionString: databaseUrl, secrets });
}

async function recordSyncAuditEvents(input: {
  auditRepository: AuditEventRepository;
  batch: SyncTransportBatch;
  results: readonly SyncTransportResult[];
  storeId: string;
  storeName: string;
  receivedAt: string;
}): Promise<void> {
  const resultByCommandId = new Map(input.results.map((result) => [result.commandId, result]));

  for (const command of input.batch.commands) {
    const result = resultByCommandId.get(command.id);
    if (result === undefined) continue;

    const idempotencyKey = safeAuditIdentifier(
      `sync:${input.storeId}:${command.id}:${result.status}`,
    );

    await input.auditRepository.append(
      AuditEventRecordSchema.parse({
        eventId: safeAuditIdentifier(`audit:${idempotencyKey}`),
        idempotencyKey,
        type: "sync.changed",
        store: {
          storeId: input.storeId,
          storeName: input.storeName,
        },
        actor: {
          actorId: safeAuditIdentifier(`device:${input.batch.deviceId}`),
          displayName: command.payload.payload.actorLabel,
          roleSnapshot: "collaborator",
        },
        target: {
          type: "sync_command",
          id: command.id,
          label: syncTargetLabel(command),
        },
        occurredAt: command.payload.payload.occurredAt,
        receivedAt: input.receivedAt,
        summary: syncAuditSummary(command, result),
        ...(result.status === "conflict" ? { reason: result.conflict.reason } : {}),
        status:
          result.status === "conflict"
            ? "conflict"
            : result.status === "retry"
              ? "pending_ack"
              : "received",
        metadata: compactMetadata({
          commandKind: command.kind,
          resultStatus: result.status,
          taskId: command.taskId,
          lotId: command.lotId,
          productDisplayName: command.productDisplayName,
          lotIdentityValue: "value" in command.lotIdentity ? command.lotIdentity.value : undefined,
          locationKind: command.currentLocation.kind,
          riskState: command.riskState,
          requiredResolution: command.requiredResolution,
          commandCreatedAt: command.createdAt,
          commandSavedAt: command.savedAt,
          commandUpdatedAt: command.updatedAt,
          lastAttemptedAt: command.lastAttemptedAt,
          action:
            command.payload.kind === "resolve_task" ? command.payload.payload.action : undefined,
          actorLabel: command.payload.payload.actorLabel,
          deviceId: input.batch.deviceId,
          ...(result.status === "conflict" ? { conflictId: result.conflict.id } : {}),
          ...(result.status === "retry" ? { retryLabel: result.error } : {}),
        }),
      }),
    );
  }
}

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

export function createCentralCaptureSyncCommandService(input: {
  captureRepository: CaptureRepository;
  now?: () => Date;
}): SyncCommandService {
  const now = input.now ?? (() => new Date());

  return {
    async handleBatch(batch, context) {
      const receivedAt = context?.receivedAt ?? now().toISOString();
      const storeId = context?.storeId ?? "loja-piloto";
      const storeName = context?.storeName ?? normalizeStoreName(undefined, storeId);
      const deviceId = context?.deviceId ?? batch.deviceId;

      return Promise.all(
        batch.commands.map(async (command) => {
          try {
            return await input.captureRepository.applySyncCommand({
              storeId,
              storeName,
              actorId: context?.actorId ?? safeAuditIdentifier(`device:${deviceId}`),
              actorDisplayName: context?.actorDisplayName ?? command.payload.payload.actorLabel,
              actorRoleSnapshot: context?.actorRoleSnapshot ?? "collaborator",
              deviceId,
              command,
              receivedAt,
            });
          } catch {
            return SyncTransportResultSchema.parse({
              status: "retry",
              commandId: command.id,
              idempotencyKey: command.idempotencyKey,
              retryAfterSeconds: 60,
              error: "Falha temporaria ao aplicar comando central.",
            });
          }
        }),
      );
    },
  };
}

function syncTargetLabel(command: SyncCommandRecord): string {
  const lotCode = "value" in command.lotIdentity ? command.lotIdentity.value : command.lotId;
  return `${command.productDisplayName} - lote ${lotCode}`;
}

function syncAuditSummary(command: SyncCommandRecord, result: SyncTransportResult): string {
  if (result.status === "conflict") {
    return "Acao mobile sincronizada com conflito para revisao.";
  }

  if (result.status === "retry") {
    return "Acao mobile aguardando nova tentativa de sincronizacao.";
  }

  if (command.kind === "request_markdown") {
    return "Solicitacao de rebaixa sincronizada pelo mobile.";
  }

  if (command.kind === "decide_markdown") {
    return "Decisao de rebaixa sincronizada pelo mobile.";
  }

  if (command.kind === "record_markdown_application") {
    return "Aplicacao de rebaixa sincronizada pelo mobile.";
  }

  if (command.kind === "confirm_markdown_on_shelf") {
    return "Conferencia de etiqueta sincronizada pelo mobile.";
  }

  return "Acao operacional sincronizada pelo mobile.";
}

function normalizeStoreName(value: string | undefined, storeId: string): string {
  const trimmed = value?.trim();
  if (trimmed !== undefined && trimmed.length > 0) return trimmed.slice(0, 240);
  if (storeId === "loja-piloto") return "Loja Piloto - Staging";
  return storeId.slice(0, 240);
}

function normalizeOptionalQueryValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed.slice(0, 120);
}

function createPrepareTurnRequestId(deviceId: string): string {
  const devicePart = safeAuditIdentifier(deviceId).slice(0, 48);
  return `pt:${Date.now().toString(36)}:${devicePart}`.slice(0, 120);
}

function createProductCatalogRequestId(kind: string, value: string): string {
  const valuePart = safeAuditIdentifier(value).slice(0, 48);
  return `catalog:${kind}:${Date.now().toString(36)}:${valuePart}`.slice(0, 120);
}

function createLotWriteRequestId(
  kind: "create" | "observation",
  value: string,
  idempotencyKey: string | undefined,
): string {
  const stablePart = safeAuditIdentifier(idempotencyKey ?? value).slice(0, 48);
  return `lot:${kind}:${idempotencyKey === undefined ? Date.now().toString(36) : "idem"}:${stablePart}`.slice(
    0,
    120,
  );
}

function roleSnapshotForAudit(
  role: StoreMembership["role"] | undefined,
): "collaborator" | "lead" | "admin" {
  return role === "lead" || role === "admin" ? role : "collaborator";
}

function safeAuditIdentifier(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 160);
  return safe.length === 0 ? "sync-event" : safe;
}

function compactMetadata(
  value: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined,
      )
      .map(([key, item]) => [key, typeof item === "string" ? item.slice(0, 240) : item]),
  );
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

export function createCentralTaskAlertDispatchRepository(input: {
  captureRepository: CaptureRepository;
  registrations: readonly CentralAlertAudienceRegistration[];
}): AlertDispatchRepository {
  const deliveryResults: AlertDispatchResultRecord[] = [];

  return {
    async listDueAlerts({ now }) {
      const dueAlerts: DueAlertDispatchRecord[] = [];
      const registrationsByStore = groupAlertRegistrationsByStore(input.registrations);

      for (const [storeId, registrations] of registrationsByStore) {
        const storeName = registrations[0]?.storeName ?? storeId;
        const prepared = await input.captureRepository.prepareTurn({
          requestId: `alert-dispatch:${storeId}:${now}`,
          storeId,
          storeName,
          actorId: "alert-dispatch",
          actorDisplayName: "Despacho de alertas",
          actorRoleSnapshot: "lead",
          request: {
            deviceId: "alert-dispatch",
            requestedAt: now,
            appVersion: "api-alert-dispatch",
            localSnapshot: {
              knownProductCount: 0,
              knownLotCount: 0,
              pendingCommandCount: 0,
            },
          },
        });

        for (const task of prepared.activeTasks) {
          const audience = centralAlertAudienceForTask(task);
          const content = createPrivacySafeNotificationContent({
            productDisplayName: task.productDisplayName,
            currentLocation: task.currentLocation,
            requiredResolution: task.requiredResolution,
          });

          for (const registration of registrations) {
            if (!registrationMatchesAlertAudience(registration.audienceRole, audience)) {
              continue;
            }

            dueAlerts.push({
              expoPushToken: registration.expoPushToken,
              dispatch: {
                attemptId: createAlertAttemptId({
                  storeId,
                  taskId: task.centralTaskId,
                  deviceId: registration.deviceId,
                  referenceTime: now,
                }),
                taskId: task.centralTaskId,
                taskActiveKey: task.activeKey,
                audience,
                title: content.title,
                body: content.body,
                data: {
                  taskId: task.centralTaskId,
                  taskActiveKey: task.activeKey,
                },
                createdAt: now,
              },
            });
          }
        }
      }

      return dueAlerts;
    },
    recordDeliveryResult(result) {
      deliveryResults.push(result);
      return Promise.resolve();
    },
  };
}

function groupAlertRegistrationsByStore(
  registrations: readonly CentralAlertAudienceRegistration[],
): Map<string, CentralAlertAudienceRegistration[]> {
  const grouped = new Map<string, CentralAlertAudienceRegistration[]>();

  for (const registration of registrations) {
    const current = grouped.get(registration.storeId) ?? [];
    current.push(registration);
    grouped.set(registration.storeId, current);
  }

  return grouped;
}

function centralAlertAudienceForTask(task: ActiveTaskSnippet): AlertAudience {
  if (task.severity === "critical" || task.riskState === "expired") {
    return "responsible_and_leadership";
  }

  return task.ownerLabel.toLocaleLowerCase("pt-BR").includes("lider") ? "leadership" : "shift_team";
}

function registrationMatchesAlertAudience(
  role: CentralAlertAudienceRegistration["audienceRole"],
  audience: AlertAudience,
): boolean {
  if (audience === "responsible_and_leadership") {
    return role === "collaborator" || role === "shift_team" || role === "leadership";
  }

  if (audience === "responsible") {
    return role === "collaborator";
  }

  if (audience === "leadership") {
    return role === "leadership";
  }

  return role === "collaborator" || role === "shift_team";
}

function createAlertAttemptId(input: {
  storeId: string;
  taskId: string;
  deviceId: string;
  referenceTime: string;
}): string {
  return `central-alert:${input.storeId}:${input.taskId}:${input.deviceId}:${input.referenceTime}`
    .replace(/[^a-zA-Z0-9:._-]/g, "-")
    .slice(0, 160);
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

export function createWorkerApp(
  env: WorkerEnvironment,
): ReturnType<typeof createApiApp> | undefined {
  const databaseUrl = env.NEON_DATABASE_URL?.trim();
  const tokenPepper = env.AUTH_TOKEN_PEPPER;
  const passwordPepper = env.AUTH_PASSWORD_PEPPER;
  const appEnv = env.VALIDADE_ZERO_APP_ENV?.trim() || "production";
  const evidenceStore = createEvidenceStoreFromWorkerEnv(env, appEnv);
  if (
    databaseUrl === undefined ||
    databaseUrl.length === 0 ||
    tokenPepper === undefined ||
    tokenPepper.length === 0 ||
    passwordPepper === undefined ||
    passwordPepper.length === 0 ||
    evidenceStore === undefined
  ) {
    return undefined;
  }

  return createApiApp({
    databaseUrl,
    authSecrets: { tokenPepper, passwordPepper },
    evidenceStore: evidenceStore.store,
    loginAttemptLimiter: createNeonLoginAttemptLimiter({
      connectionString: databaseUrl,
      pepper: tokenPepper,
    }),
    runtimeConfig: {
      appEnv,
      evidenceStoreMode: evidenceStore.mode,
    },
    sessionTtlSeconds: parsePositiveSeconds(env.AUTH_SESSION_TTL_SECONDS, 28_800),
    recoveryTtlSeconds: parsePositiveSeconds(env.AUTH_RECOVERY_TTL_SECONDS, 1_800),
  });
}

const worker = {
  fetch(request: Request, env: WorkerEnvironment, context: ExecutionContext) {
    const configuredApp = createWorkerApp(env);
    if (configuredApp === undefined) {
      return Response.json({ error: "service_not_configured" }, { status: 503 });
    }
    return configuredApp.fetch(request, env, context);
  },
  scheduled,
};

export default worker;

function parsePositiveSeconds(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createEvidenceStoreFromWorkerEnv(
  env: WorkerEnvironment,
  appEnv: string,
): { mode: "memory" | "r2"; store: EvidenceStore } | undefined {
  const mode = env.EVIDENCE_STORE_MODE?.trim() || (appEnv === "local" ? "memory" : "r2");

  if (mode === "r2") {
    return env.EVIDENCE_BUCKET === undefined
      ? undefined
      : { mode: "r2", store: createR2EvidenceStore(env.EVIDENCE_BUCKET) };
  }

  if (mode === "memory" && appEnv === "local") {
    return { mode: "memory", store: createInMemoryEvidenceStore() };
  }

  return undefined;
}

async function authorizeRequest(input: {
  request: Request;
  storeId: string;
  capability: Capability;
  authProvider: AuthProvider;
  authorizationService: AuthorizationService;
}): Promise<
  ApiAuthorizationDecision & {
    identity: import("@validade-zero/domain").AuthenticatedIdentity | undefined;
    capability: Capability;
  }
> {
  const identity = await input.authProvider.verify(input.request);
  const decision = await input.authorizationService.authorize({
    identity,
    capability: input.capability,
    resourceStoreId: input.storeId,
  });

  return { ...decision, identity, capability: input.capability };
}

async function resolvePrepareTurnScope(input: {
  request: Request;
  requestedStoreId?: string | undefined;
  authProvider: AuthProvider;
  authorizationService: AuthorizationService;
  membershipRepository: MembershipRepository;
  capability: Capability;
}): Promise<
  | {
      allowed: true;
      identity: AuthenticatedIdentity;
      decision: ApiAuthorizationDecision & { context: AuthorizedActorContext };
    }
  | {
      allowed: false;
      identity?: AuthenticatedIdentity | undefined;
      decision: ApiAuthorizationDecision;
      reason: AuthorizationDenialReason;
      storeId?: string | undefined;
      storeName?: string | undefined;
    }
> {
  const identity = await input.authProvider.verify(input.request);

  if (identity === undefined) {
    return {
      allowed: false,
      decision: { allowed: false, reason: "unauthenticated" },
      reason: "unauthenticated",
      ...(input.requestedStoreId === undefined ? {} : { storeId: input.requestedStoreId }),
    };
  }

  const memberships = await input.membershipRepository.listActiveMemberships(identity.subjectId);
  const requestedMembership =
    input.requestedStoreId === undefined
      ? undefined
      : memberships.find((membership) => membership.storeId === input.requestedStoreId);
  const targetMembership = requestedMembership ?? memberships[0];
  const targetStoreId =
    input.requestedStoreId ?? targetMembership?.storeId ?? "loja-nao-autorizada";
  const decision = await input.authorizationService.authorize({
    identity,
    capability: input.capability,
    resourceStoreId: targetStoreId,
  });

  if (decision.allowed && decision.context !== undefined) {
    return {
      allowed: true,
      identity,
      decision: { ...decision, context: decision.context },
    };
  }

  return {
    allowed: false,
    identity,
    decision,
    reason: decision.reason ?? "capability_not_allowed",
    storeId: targetStoreId,
    storeName:
      (requestedMembership ?? targetMembership)?.storeName ??
      normalizeStoreName(undefined, targetStoreId),
  };
}

async function authorizeEvidenceRead(input: {
  request: Request;
  storeId: string;
  authProvider: AuthProvider;
  authorizationService: AuthorizationService;
}): Promise<
  ApiAuthorizationDecision & {
    identity: import("@validade-zero/domain").AuthenticatedIdentity | undefined;
    capability: "evidence.read_store" | "evidence.read_global";
  }
> {
  const storeDecision = await authorizeRequest({
    ...input,
    capability: "evidence.read_store",
  });

  if (storeDecision.allowed) {
    return { ...storeDecision, capability: "evidence.read_store" };
  }

  if (storeDecision.reason !== "capability_not_allowed") {
    return { ...storeDecision, capability: "evidence.read_store" };
  }

  const globalDecision = await input.authorizationService.authorize({
    identity: storeDecision.identity,
    capability: "evidence.read_global",
    resourceStoreId: input.storeId,
  });

  return {
    ...globalDecision,
    identity: storeDecision.identity,
    capability: "evidence.read_global",
  };
}

async function recordExceptionalEvidenceAccess(input: {
  auditRepository: AuditEventRepository;
  actorContext: import("@validade-zero/domain").AuthorizedActorContext;
  assetId: string;
  storeId: string;
  reason: string;
  now: () => Date;
}): Promise<void> {
  const occurredAt = input.now().toISOString();

  await input.auditRepository.append(
    AuditEventRecordSchema.parse({
      eventId: `audit:evidence-accessed-exceptionally:${input.assetId}:${occurredAt}`,
      idempotencyKey: `evidence-accessed-exceptionally:${input.assetId}:${occurredAt}`,
      type: "evidence.changed",
      store: {
        storeId: input.storeId,
        storeName: input.actorContext.membership.storeName,
      },
      actor: {
        actorId: input.actorContext.identity.subjectId,
        displayName:
          input.actorContext.identity.displayName ?? input.actorContext.membership.subjectId,
        roleSnapshot: input.actorContext.membership.role,
      },
      target: {
        type: "evidence",
        id: input.assetId,
        label: "Acesso excepcional a evidência",
      },
      occurredAt,
      receivedAt: occurredAt,
      summary: "Acesso administrativo excepcional a evidência confirmado.",
      reason: input.reason,
      status: "received",
      metadata: {
        action: "evidence.accessed_exceptionally",
        targetStore: input.storeId,
      },
    }),
  );
}

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

async function parseJsonBody(context: Context): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    return undefined;
  }
}

async function handleMembershipMutation(input: {
  context: Context;
  storeId: string;
  authProvider: AuthProvider;
  authorizationService: AuthorizationService;
  accessDeniedAuditRecorder: AccessDeniedAuditRecorder;
  run: (actorContext: AuthorizedActorContext) => Promise<{
    membership: import("@validade-zero/contracts").ManagedStoreMembership;
    replayed: boolean;
  }>;
}): Promise<Response> {
  const decision = await authorizeRequest({
    request: input.context.req.raw,
    storeId: input.storeId,
    capability: "user.manage",
    authProvider: input.authProvider,
    authorizationService: input.authorizationService,
  });
  if (!decision.allowed || decision.context === undefined) {
    const denial = await recordDeniedAccess({
      recorder: input.accessDeniedAuditRecorder,
      identity: decision.identity,
      decision,
      capability: "user.manage",
      reason: decision.reason ?? "capability_not_allowed",
      targetType: "membership_mutation",
      storeScope: input.storeId,
    });
    return input.context.json(AuthorizationContract.denial.parse(denial), 403);
  }

  try {
    return input.context.json(
      MembershipMutationResponseSchema.parse(await input.run(decision.context)),
    );
  } catch {
    return input.context.json({ error: "membership_mutation_rejected" }, 409);
  }
}
