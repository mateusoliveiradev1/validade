import {
  AccountAccessErrorResponseSchema,
  AuthenticatedSessionResponseSchema,
  AuthorizationContract,
  CreateInviteRequestSchema,
  FirstAccessActivationRequestSchema,
  InvalidCredentialsResponseSchema,
  InviteMutationResponseSchema,
  InviteValidationRequestSchema,
  InviteValidationResponseSchema,
  LoginRequestSchema,
  LogoutRequestSchema,
  LogoutResponseSchema,
  PasswordResetRequestSchema,
  PasswordResetResponseSchema,
  PrivacyRequestResponseSchema,
  PrivacyRequestSchema,
  RecoveryRequestedResponseSchema,
  RecoveryRequestSchema,
  RevokeInviteRequestSchema,
  SessionContextResponseSchema,
} from "@validade-zero/contracts";
import type {
  AuthAccountRecord,
  AuthRepository,
  AuthSessionRecord,
} from "@validade-zero/database/auth-repository";
import type { AuthorizationRole, Capability } from "@validade-zero/domain";
import { Hono, type Context } from "hono";

import {
  createSessionContext,
  PilotAuthProvider,
  readSessionToken,
  toClientSafeDenial,
  type AccessDeniedAuditRecorder,
  type AuthProvider,
  type AuthorizationService,
  type MembershipRepository,
} from "./auth";
import type { MembershipService } from "./memberships";

const SESSION_COOKIE = "vz_session";
const AUTH_CAPABILITIES: readonly Capability[] = [
  "command_center.read_store",
  "task.act",
  "catalog.review",
  "user.manage",
  "shift.close",
  "audit.read_store",
];

export interface RecoveryDeliveryProvider {
  deliver(input: { identifier: string; token: string; expiresAt: Date }): Promise<void>;
}

export interface InMemoryRecoveryDeliveryProvider extends RecoveryDeliveryProvider {
  readDeliveries(): readonly { identifier: string; token: string; expiresAt: Date }[];
}

export interface AuthSecurityEvent {
  eventId: string;
  subjectId?: string;
  storeId?: string;
  accountStatus?: "blocked" | "revoked" | "recovery_pending";
  operation: "login" | "invite_create" | "invite_revoke" | "privacy_request";
  reason: string;
  occurredAt: string;
}

export interface AuthSecurityAuditRecorder {
  record(event: AuthSecurityEvent): Promise<void>;
}

export interface InMemoryAuthSecurityAuditRecorder extends AuthSecurityAuditRecorder {
  readEvents(): readonly AuthSecurityEvent[];
}

export interface LoginAttemptLimiter {
  isAllowed(identifier: string, now: Date): boolean | Promise<boolean>;
  recordFailure(identifier: string, now: Date): void | Promise<void>;
  clear(identifier: string): void | Promise<void>;
}

export interface AuthenticationRouteDependencies {
  repository: AuthRepository;
  authProvider: AuthProvider;
  sessionProvider: PilotAuthProvider;
  authorizationService: AuthorizationService;
  membershipRepository: MembershipRepository;
  membershipService: MembershipService;
  accessDeniedAuditRecorder: AccessDeniedAuditRecorder;
  authSecurityAuditRecorder: AuthSecurityAuditRecorder;
  recoveryDeliveryProvider: RecoveryDeliveryProvider;
  loginAttemptLimiter: LoginAttemptLimiter;
  now: () => Date;
  sessionTtlSeconds: number;
  recoveryTtlSeconds: number;
}

export function registerAuthenticationRoutes(
  api: Hono,
  input: AuthenticationRouteDependencies,
): void {
  api.get("/auth/invites/:token", async (context) => {
    const parsed = InviteValidationRequestSchema.safeParse({ token: context.req.param("token") });
    if (!parsed.success) return context.json({ status: "invalid" as const }, 400);
    const result = await input.repository.validateInvite({
      token: parsed.data.token,
      now: input.now(),
    });
    return context.json(
      InviteValidationResponseSchema.parse(
        result.status === "valid"
          ? {
              status: "valid",
              expiresAt: result.invite.expiresAt.toISOString(),
              invite: {
                identifier: result.invite.identifier,
                displayName: result.invite.displayName,
                storeId: result.invite.storeId,
                storeName: result.invite.storeName,
                role: result.invite.role,
              },
            }
          : { status: result.status },
      ),
      result.status === "valid" ? 200 : 410,
    );
  });

  api.post("/auth/invites/:token/activate", async (context) => {
    const body = await parseJsonBody(context);
    const parsed = FirstAccessActivationRequestSchema.safeParse({
      ...(isRecord(body) ? body : {}),
      token: context.req.param("token"),
    });
    if (!parsed.success) return context.json({ error: "invalid_activation" }, 400);
    try {
      const account = await input.repository.activateAccount({
        token: parsed.data.token,
        password: parsed.data.password,
        activatedAt: input.now(),
      });
      const session = await createSession(input, account);
      setSessionCookie(context, session.token, session.record.expiresAt);
      return context.json(
        await sessionResponse(input, account, session.record, session.token, "account_activated"),
        201,
      );
    } catch {
      return context.json(InviteValidationResponseSchema.parse({ status: "invalid" }), 410);
    }
  });

  api.post("/auth/login", async (context) => {
    const parsed = LoginRequestSchema.safeParse(await parseJsonBody(context));
    if (!parsed.success)
      return context.json(
        InvalidCredentialsResponseSchema.parse({ error: "invalid_credentials" }),
        401,
      );
    const now = input.now();
    if (!(await input.loginAttemptLimiter.isAllowed(parsed.data.identifier, now))) {
      return context.json(
        InvalidCredentialsResponseSchema.parse({ error: "invalid_credentials" }),
        429,
      );
    }
    const account = await input.repository.verifyPassword(parsed.data);
    if (account === undefined) {
      await input.loginAttemptLimiter.recordFailure(parsed.data.identifier, now);
      await input.authSecurityAuditRecorder.record({
        eventId: createId("auth-login-denied"),
        operation: "login",
        reason: "invalid_credentials",
        occurredAt: now.toISOString(),
      });
      return context.json(
        InvalidCredentialsResponseSchema.parse({ error: "invalid_credentials" }),
        401,
      );
    }
    if (account.status !== "active") {
      await input.loginAttemptLimiter.recordFailure(parsed.data.identifier, now);
      await recordAccountDenial(input.authSecurityAuditRecorder, account, now);
      return context.json(
        AccountAccessErrorResponseSchema.parse({
          error:
            account.status === "blocked"
              ? "account_blocked"
              : account.status === "revoked"
                ? "account_revoked"
                : "recovery_required",
          accountStatus: account.status,
          canRequestRecovery: account.status !== "revoked",
        }),
        403,
      );
    }
    await input.loginAttemptLimiter.clear(parsed.data.identifier);
    try {
      const session = await createSession(input, account);
      setSessionCookie(context, session.token, session.record.expiresAt);
      return context.json(
        await sessionResponse(input, account, session.record, session.token, "authenticated"),
      );
    } catch {
      return context.json(
        AuthorizationContract.denial.parse(toClientSafeDenial({ reason: "inactive_membership" })),
        403,
      );
    }
  });

  api.post("/auth/logout", async (context) => {
    const parsed = LogoutRequestSchema.safeParse(await parseJsonBody(context));
    if (!parsed.success) return context.json({ error: "invalid_logout" }, 400);
    const token = readSessionToken(context.req.raw);
    if (token !== undefined) {
      const session = await input.repository.verifySession({ token, now: input.now() });
      if (parsed.data.allSessions === true && session !== undefined) {
        await input.repository.revokeSessionsForSubjectStore({
          subjectId: session.subjectId,
          storeId: session.storeId,
          revokedAt: input.now(),
        });
      } else {
        await input.repository.revokeSession({ token, revokedAt: input.now() });
      }
    }
    clearSessionCookie(context);
    return context.json(LogoutResponseSchema.parse({ status: "logged_out" }));
  });

  api.get("/auth/session", async (context) => {
    const token = readSessionToken(context.req.raw);
    const session = await input.sessionProvider.readSession(context.req.raw);
    if (token === undefined || session === undefined) {
      return context.json(
        AccountAccessErrorResponseSchema.parse({
          error: "session_expired",
          canRequestRecovery: true,
        }),
        401,
      );
    }
    const account = await input.repository.readAccount({
      subjectId: session.subjectId,
      storeId: session.storeId,
    });
    if (account === undefined || account.status !== "active") {
      return context.json(
        AccountAccessErrorResponseSchema.parse({
          error: "session_expired",
          canRequestRecovery: true,
        }),
        401,
      );
    }
    return context.json(await sessionResponse(input, account, session, token, "refreshed"));
  });

  api.post("/auth/recovery/request", async (context) => {
    const parsed = RecoveryRequestSchema.safeParse(await parseJsonBody(context));
    if (!parsed.success) return context.json({ error: "invalid_recovery_request" }, 400);
    const createdAt = input.now();
    const expiresAt = new Date(createdAt.getTime() + input.recoveryTtlSeconds * 1_000);
    const token = createToken();
    const created = await input.repository.createRecoveryRequest({
      recoveryId: createId("recovery"),
      idempotencyKey: createId("recovery-request"),
      identifier: parsed.data.identifier,
      token,
      expiresAt,
      createdAt,
    });
    if (created) {
      await input.recoveryDeliveryProvider.deliver({
        identifier: parsed.data.identifier,
        token,
        expiresAt,
      });
    }
    return context.json(
      RecoveryRequestedResponseSchema.parse({ status: "recovery_requested" }),
      202,
    );
  });

  api.post("/auth/recovery/complete", async (context) => {
    const parsed = PasswordResetRequestSchema.safeParse(await parseJsonBody(context));
    if (!parsed.success) return context.json({ error: "invalid_recovery" }, 400);
    const account = await input.repository.consumeRecoveryToken({
      token: parsed.data.token,
      password: parsed.data.password,
      consumedAt: input.now(),
    });
    if (account === undefined) return context.json({ error: "invalid_recovery" }, 410);
    return context.json(PasswordResetResponseSchema.parse({ status: "password_reset" }));
  });

  api.post("/privacy/requests", async (context) => {
    const session = await input.sessionProvider.readSession(context.req.raw);
    if (session === undefined) {
      await input.authSecurityAuditRecorder.record({
        eventId: createId("privacy-denied"),
        operation: "privacy_request",
        reason: "session_expired",
        occurredAt: input.now().toISOString(),
      });
      return context.json(
        AccountAccessErrorResponseSchema.parse({
          error: "session_expired",
          canRequestRecovery: true,
        }),
        401,
      );
    }
    const parsed = PrivacyRequestSchema.safeParse(await parseJsonBody(context));
    if (!parsed.success) return context.json({ error: "invalid_privacy_request" }, 400);
    const receipt = await input.repository.createPrivacyRequest({
      requestId: createId("privacy"),
      idempotencyKey: parsed.data.idempotencyKey,
      subjectId: session.subjectId,
      storeId: session.storeId,
      requestType: parsed.data.requestType,
      contactChannel: parsed.data.contact.channel,
      contactValue: parsed.data.contact.value,
      dataCategories: parsed.data.dataCategories,
      requestBody: parsed.data.body,
      receivedAt: input.now(),
    });
    return context.json(
      PrivacyRequestResponseSchema.parse({
        requestId: receipt.request.requestId,
        status: "received",
        receivedAt: receipt.request.receivedAt.toISOString(),
        replayed: receipt.replayed,
      }),
      202,
    );
  });

  api.post("/auth/invites", async (context) => {
    const parsed = CreateInviteRequestSchema.safeParse(await parseJsonBody(context));
    if (!parsed.success) return context.json({ error: "invalid_invite" }, 400);
    const actorContext = await authorizeAdmin(context, input, parsed.data.storeId, "invite_create");
    if (actorContext instanceof Response) return actorContext;
    const expiresAt = new Date(parsed.data.expiresAt);
    if (expiresAt <= input.now() || expiresAt.getTime() - input.now().getTime() > 30 * 86_400_000) {
      return context.json({ error: "invalid_invite_expiry" }, 400);
    }
    const inviteRoles = distinctRoles([parsed.data.role, ...(parsed.data.additionalRoles ?? [])]);
    const membership = await input.membershipService.grant({
      actorContext,
      request: {
        subjectId: createId("subject"),
        displayName: parsed.data.displayName,
        storeId: parsed.data.storeId,
        storeName: parsed.data.storeName,
        role: parsed.data.role,
        idempotencyKey: `membership:${parsed.data.idempotencyKey}`,
      },
    });
    for (const additionalRole of inviteRoles.filter((role) => role !== parsed.data.role)) {
      await input.membershipService.grant({
        actorContext,
        request: {
          subjectId: membership.membership.subjectId,
          displayName: parsed.data.displayName,
          storeId: parsed.data.storeId,
          storeName: parsed.data.storeName,
          role: additionalRole,
          idempotencyKey: `membership:${parsed.data.idempotencyKey}:${additionalRole}`,
        },
      });
    }
    const token = createToken();
    const receipt = await input.repository.createInvite({
      inviteId: createId("invite"),
      idempotencyKey: parsed.data.idempotencyKey,
      token,
      identifier: parsed.data.identifier,
      subjectId: membership.membership.subjectId,
      displayName: parsed.data.displayName,
      storeId: parsed.data.storeId,
      storeName: parsed.data.storeName,
      role: parsed.data.role,
      expiresAt,
      createdBy: actorContext.identity.subjectId,
      createdAt: input.now(),
    });
    return context.json(
      InviteMutationResponseSchema.parse({
        inviteId: receipt.invite.inviteId,
        ...(receipt.replayed ? {} : { token }),
        status: "created",
        expiresAt: receipt.invite.expiresAt.toISOString(),
        replayed: receipt.replayed,
      }),
      201,
    );
  });

  api.post("/auth/invites/:inviteId/revoke", async (context) => {
    const parsed = RevokeInviteRequestSchema.safeParse(await parseJsonBody(context));
    if (!parsed.success) return context.json({ error: "invalid_invite_revocation" }, 400);
    const actorContext = await authorizeAdmin(context, input, parsed.data.storeId, "invite_revoke");
    if (actorContext instanceof Response) return actorContext;
    const invite = await input.repository.revokeInvite({
      inviteId: context.req.param("inviteId"),
      storeId: parsed.data.storeId,
      revokedAt: input.now(),
    });
    if (invite === undefined) return context.json({ error: "invite_unavailable" }, 404);
    return context.json(
      InviteMutationResponseSchema.parse({
        inviteId: invite.inviteId,
        status: "revoked",
        expiresAt: invite.expiresAt.toISOString(),
        replayed: false,
      }),
    );
  });
}

export function createInMemoryRecoveryDeliveryProvider(): InMemoryRecoveryDeliveryProvider {
  const deliveries: { identifier: string; token: string; expiresAt: Date }[] = [];
  return {
    deliver(input) {
      deliveries.push(input);
      return Promise.resolve();
    },
    readDeliveries() {
      return deliveries;
    },
  };
}

export function createNoopRecoveryDeliveryProvider(): RecoveryDeliveryProvider {
  return { deliver: () => Promise.resolve() };
}

export function createInMemoryAuthSecurityAuditRecorder(): InMemoryAuthSecurityAuditRecorder {
  const events: AuthSecurityEvent[] = [];
  return {
    record(event) {
      events.push(event);
      return Promise.resolve();
    },
    readEvents() {
      return events;
    },
  };
}

export function createAccessDeniedAuthSecurityRecorder(input: {
  recorder: AccessDeniedAuditRecorder;
  memberships: MembershipRepository;
}): AuthSecurityAuditRecorder {
  return {
    async record(event) {
      const membership =
        event.subjectId === undefined
          ? undefined
          : (await input.memberships.listActiveMemberships(event.subjectId)).find(
              (candidate) => event.storeId === undefined || candidate.storeId === event.storeId,
            );
      if (event.subjectId === undefined || membership === undefined) return;
      await input.recorder.recordAccessDenied({
        eventId: event.eventId,
        actorSubjectId: event.subjectId,
        actorRoleSnapshot: membership.role,
        requestedCapability: "task.act",
        targetType: `auth_${event.operation}`,
        storeScope: membership.storeId,
        reason: "inactive_membership",
        occurredAt: event.occurredAt,
        summary: "Operacao sensivel de autenticacao bloqueada.",
      });
    },
  };
}

export function createInMemoryLoginAttemptLimiter(input?: {
  maxAttempts?: number;
  windowMs?: number;
}): LoginAttemptLimiter {
  const maxAttempts = input?.maxAttempts ?? 5;
  const windowMs = input?.windowMs ?? 15 * 60_000;
  const failures = new Map<string, Date[]>();
  const key = (identifier: string) => identifier.trim().toLocaleLowerCase("pt-BR");
  const active = (identifier: string, now: Date) =>
    (failures.get(key(identifier)) ?? []).filter(
      (attempt) => now.getTime() - attempt.getTime() < windowMs,
    );
  return {
    isAllowed(identifier, now) {
      const attempts = active(identifier, now);
      failures.set(key(identifier), attempts);
      return attempts.length < maxAttempts;
    },
    recordFailure(identifier, now) {
      failures.set(key(identifier), [...active(identifier, now), now]);
    },
    clear(identifier) {
      failures.delete(key(identifier));
    },
  };
}

async function authorizeAdmin(
  context: Context,
  input: AuthenticationRouteDependencies,
  storeId: string,
  operation: "invite_create" | "invite_revoke",
): Promise<import("@validade-zero/domain").AuthorizedActorContext | Response> {
  const identity = await input.authProvider.verify(context.req.raw);
  const decision = await input.authorizationService.authorize({
    identity,
    capability: "user.manage",
    resourceStoreId: storeId,
  });
  if (!decision.allowed || decision.context === undefined) {
    const eventId = createId(`auth-${operation}-denied`);
    await input.accessDeniedAuditRecorder.recordAccessDenied({
      eventId,
      actorSubjectId: identity?.subjectId,
      actorDisplayName: identity?.displayName,
      actorRoleSnapshot: decision.auditMembership?.role,
      requestedCapability: "user.manage",
      targetType: `auth_${operation}`,
      storeScope: storeId,
      reason: decision.reason ?? "capability_not_allowed",
      occurredAt: input.now().toISOString(),
      summary: "Operacao administrativa de autenticacao bloqueada.",
    });
    await input.authSecurityAuditRecorder.record({
      eventId,
      ...(identity === undefined ? {} : { subjectId: identity.subjectId }),
      storeId,
      operation,
      reason: decision.reason ?? "capability_not_allowed",
      occurredAt: input.now().toISOString(),
    });
    return context.json(
      AuthorizationContract.denial.parse(
        toClientSafeDenial({
          reason: decision.reason ?? "capability_not_allowed",
          denialId: eventId,
        }),
      ),
      403,
    );
  }
  return decision.context;
}

async function createSession(input: AuthenticationRouteDependencies, account: AuthAccountRecord) {
  const token = createToken();
  const occurredAt = input.now();
  const record = await input.repository.rotateSession({
    sessionId: createId("session"),
    subjectId: account.subjectId,
    storeId: account.storeId,
    nextToken: token,
    expiresAt: new Date(occurredAt.getTime() + input.sessionTtlSeconds * 1_000),
    occurredAt,
  });
  return { token, record };
}

async function sessionResponse(
  input: AuthenticationRouteDependencies,
  account: AuthAccountRecord,
  session: AuthSessionRecord,
  token: string,
  status: "account_activated" | "authenticated" | "refreshed",
) {
  const identity = {
    subjectId: account.subjectId,
    displayName: account.displayName,
    issuer: "pilot-auth-provider",
    expiresAt: session.expiresAt.toISOString(),
  };
  let allowedDecision: Awaited<ReturnType<AuthorizationService["authorize"]>> | undefined;
  for (const capability of AUTH_CAPABILITIES) {
    const decision = await input.authorizationService.authorize({
      identity,
      capability,
      resourceStoreId: account.storeId,
    });
    if (decision.allowed) {
      allowedDecision = decision;
      break;
    }
  }
  if (allowedDecision === undefined)
    throw new Error("Account has no active operational capability.");
  const base = createSessionContext(allowedDecision);
  if (base === undefined) throw new Error("Session context could not be created.");

  const actions = {
    canReadCommandCenter: false,
    canActOnTask: false,
    canReviewProductDrafts: false,
    canCloseShift: false,
    canReadStoreAudit: false,
    canManageUsers: false,
  };
  const capabilityActions = [
    ["command_center.read_store", "canReadCommandCenter"],
    ["task.act", "canActOnTask"],
    ["catalog.review", "canReviewProductDrafts"],
    ["shift.close", "canCloseShift"],
    ["audit.read_store", "canReadStoreAudit"],
    ["user.manage", "canManageUsers"],
  ] as const;
  for (const [capability, action] of capabilityActions) {
    actions[action] = (
      await input.authorizationService.authorize({
        identity,
        capability,
        resourceStoreId: account.storeId,
      })
    ).allowed;
  }

  return AuthenticatedSessionResponseSchema.parse({
    status,
    sessionToken: token,
    session: SessionContextResponseSchema.parse({
      ...base,
      sessionExpiresAt: session.expiresAt.toISOString(),
      accountStatus: account.status,
      canRequestRecovery: account.status !== "revoked",
      privacyCenterUrl: "/privacy",
      actions,
    }),
  });
}

async function recordAccountDenial(
  recorder: AuthSecurityAuditRecorder,
  account: AuthAccountRecord,
  now: Date,
): Promise<void> {
  if (
    account.status !== "blocked" &&
    account.status !== "revoked" &&
    account.status !== "recovery_pending"
  ) {
    return;
  }
  await recorder.record({
    eventId: createId("auth-account-denied"),
    subjectId: account.subjectId,
    storeId: account.storeId,
    accountStatus: account.status,
    operation: "login",
    reason: `account_${account.status}`,
    occurredAt: now.toISOString(),
  });
}

function setSessionCookie(context: Context, token: string, expiresAt: Date): void {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1_000));
  context.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`,
  );
}

function clearSessionCookie(context: Context): void {
  context.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
  );
}

function createToken(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function distinctRoles(roles: readonly AuthorizationRole[]): readonly AuthorizationRole[] {
  return [...new Set(roles)];
}

function bytesToHex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function parseJsonBody(context: Context): Promise<unknown> {
  try {
    return await context.req.json();
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
