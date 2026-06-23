import {
  createFakeExpoAlertDeliveryProvider,
  createInMemoryEvidenceStore,
  createLocalProviderRegistry,
  type AlertDeliveryProvider,
  type EvidenceStore,
} from "@validade-zero/adapters";
import {
  AlertDeliveryResultSchema,
  AuditEventRecordSchema,
  AuthorizationContract,
  ChangeMembershipRoleRequestSchema,
  CreateMembershipRequestSchema,
  EvidenceExceptionalAccessRequestSchema,
  EvidenceInvalidationRequestSchema,
  EvidenceUploadIntentRequestSchema,
  HEALTH_SERVICE_NAME,
  HealthContract,
  MembershipListResponseSchema,
  MembershipMutationResponseSchema,
  ProtectedCapabilityProbeResponseSchema,
  SafeProbeContract,
  RevokeMembershipRequestSchema,
  SessionContextResponseSchema,
  ShiftCloseReopenRequestSchema,
  ShiftCloseRequestSchema,
  ShiftHandoffAcknowledgementRequestSchema,
  SyncTransportBatchSchema,
  SyncTransportResultSchema,
  type AlertDeliveryResult,
  type AlertDispatchCommand,
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
  type AuthRepository,
  type AuthRepositorySecrets,
} from "@validade-zero/database/auth-repository";
import {
  createInMemoryMembershipManagementRepository,
  createNeonMembershipRepository,
  type MembershipManagementRepository,
} from "@validade-zero/database/membership-repository";
import type { ShiftCloseRepository } from "@validade-zero/database/shift-close-repository";
import type { AuthorizedActorContext, Capability } from "@validade-zero/domain";
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
  createInMemoryCommandCenterService,
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
  createDatabaseShiftCloseRepository,
  createInMemoryShiftCloseRepository,
  createShiftCloseService,
  type ShiftCloseRevalidator,
  type ShiftCloseService,
} from "./shift-close";

export interface SyncCommandService {
  handleBatch(batch: SyncTransportBatch): Promise<readonly SyncTransportResult[]>;
}

export interface InMemorySyncCommandService extends SyncCommandService {
  readResults(): readonly SyncTransportResult[];
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
  now?: () => Date;
}): Hono {
  const api = new Hono();
  const providers = createLocalProviderRegistry();
  const now = input?.now ?? (() => new Date());
  const syncCommandService = input?.syncCommandService ?? createInMemorySyncCommandService();
  const commandCenterService = input?.commandCenterService ?? createInMemoryCommandCenterService({ now });
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
          secrets: createEphemeralAuthSecrets(),
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
  const evidenceService =
    input?.evidenceService ??
    createEvidenceService({
      repository: evidenceRepository,
      store: evidenceStore,
      auditRepository,
      now,
    });
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
      ...(input?.shiftCloseRevalidator === undefined
        ? {}
        : { revalidator: input.shiftCloseRevalidator }),
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
      capability: "audit.read_store",
      resourceStoreId: storeId,
    });

    if (!decision.allowed || decision.context === undefined) {
      const denial = await recordDeniedAccess({
        recorder: accessDeniedAuditRecorder,
        identity,
        decision,
        capability: "audit.read_store",
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
    const taskDecision = await authorizationService.authorize({
      identity,
      capability: "task.act",
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
    const decision = taskDecision.allowed
      ? taskDecision
      : userManagementDecision.allowed
        ? userManagementDecision
        : shiftCloseDecision.allowed
          ? shiftCloseDecision
          : auditReadDecision.allowed
            ? auditReadDecision
            : taskDecision;

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

    return context.json(
      SessionContextResponseSchema.parse({
        ...sessionContext,
        actions: {
          ...sessionContext.actions,
          canActOnTask: taskDecision.allowed,
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

function createEphemeralAuthSecrets(): AuthRepositorySecrets {
  return {
    tokenPepper: `${crypto.randomUUID()}:${crypto.randomUUID()}`,
    passwordPepper: `${crypto.randomUUID()}:${crypto.randomUUID()}`,
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
