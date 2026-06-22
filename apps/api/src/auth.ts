import {
  authorizeStoreCapability,
  listRoleCapabilities,
  roleAllowsCapability,
  type AuthenticatedIdentity,
  type AuthorizationDecision,
  type AuthorizationDenialReason,
  type Capability,
  type StoreMembership,
} from "@validade-zero/domain";

export interface AuthProvider {
  verify(request: Request): Promise<AuthenticatedIdentity | undefined>;
}

export interface JwtVerificationResult {
  subjectId: string;
  displayName?: string;
  issuer?: string;
  expiresAt?: string;
}

export interface JwtVerifier {
  verify(token: string): Promise<JwtVerificationResult | undefined>;
}

export interface MembershipRepository {
  listActiveMemberships(subjectId: string): Promise<readonly StoreMembership[]>;
}

export interface AccessDeniedEvent {
  eventId: string;
  actorSubjectId?: string | undefined;
  actorRoleSnapshot?: string | undefined;
  actorDisplayName?: string | undefined;
  requestedCapability: Capability;
  targetType: string;
  storeScope?: string | undefined;
  reason: AuthorizationDenialReason;
  occurredAt: string;
  summary: string;
}

export interface AccessDeniedAuditRecorder {
  recordAccessDenied(event: AccessDeniedEvent): Promise<void>;
}

export interface InMemoryAccessDeniedAuditRecorder extends AccessDeniedAuditRecorder {
  readEvents(): readonly AccessDeniedEvent[];
}

export interface AuthorizationService {
  authorize(input: {
    identity?: AuthenticatedIdentity | undefined;
    capability: Capability;
    resourceStoreId: string;
  }): Promise<ApiAuthorizationDecision>;
}

export interface ApiAuthorizationDecision extends AuthorizationDecision {
  auditMembership?: StoreMembership | undefined;
}

export interface InMemoryMembershipRepository extends MembershipRepository {
  replaceMemberships(memberships: readonly StoreMembership[]): void;
}

export class FakeAuthProvider implements AuthProvider {
  constructor(private readonly defaultSubjectId?: string) {}

  verify(request: Request): Promise<AuthenticatedIdentity | undefined> {
    const authorizationHeader = request.headers.get("authorization");
    const isExpired =
      authorizationHeader?.startsWith("Bearer expired:") === true ||
      request.headers.get("x-validade-expired") === "true";
    const isInvalid =
      authorizationHeader?.startsWith("Bearer invalid") === true ||
      request.headers.get("x-validade-invalid") === "true";

    if (isExpired || isInvalid) {
      return Promise.resolve(undefined);
    }

    const subjectFromHeader = authorizationHeader?.startsWith("Bearer fake:")
      ? authorizationHeader.slice("Bearer fake:".length).trim()
      : undefined;
    const subjectFromTestHeader = request.headers.get("x-validade-subject")?.trim();
    const subjectId = subjectFromHeader ?? subjectFromTestHeader ?? this.defaultSubjectId;

    if (subjectId === undefined || subjectId.length === 0) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve({
      subjectId,
      displayName: subjectIdToDisplayName(subjectId),
      issuer: "fake-auth-provider",
    });
  }
}

export class JwtAuthProvider implements AuthProvider {
  constructor(private readonly verifier: JwtVerifier) {}

  async verify(request: Request): Promise<AuthenticatedIdentity | undefined> {
    const authorizationHeader = request.headers.get("authorization");

    if (authorizationHeader === null || !authorizationHeader.startsWith("Bearer ")) {
      return undefined;
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();
    const verified = await this.verifier.verify(token);

    if (verified === undefined || isExpired(verified.expiresAt)) {
      return undefined;
    }

    return {
      subjectId: verified.subjectId,
      ...(verified.displayName === undefined ? {} : { displayName: verified.displayName }),
      ...(verified.issuer === undefined ? {} : { issuer: verified.issuer }),
      ...(verified.expiresAt === undefined ? {} : { expiresAt: verified.expiresAt }),
    };
  }
}

export function createInMemoryMembershipRepository(
  memberships: readonly StoreMembership[] = createDefaultMemberships(),
): InMemoryMembershipRepository {
  let records = [...memberships];

  return {
    listActiveMemberships(subjectId) {
      return Promise.resolve(
        records.filter(
          (membership) => membership.subjectId === subjectId && membership.status === "active",
        ),
      );
    },
    replaceMemberships(nextMemberships) {
      records = [...nextMemberships];
    },
  };
}

export function createAuthorizationService(input: {
  memberships: MembershipRepository;
}): AuthorizationService {
  return {
    async authorize(request) {
      const memberships =
        request.identity === undefined
          ? []
          : await input.memberships.listActiveMemberships(request.identity.subjectId);

      const decision = authorizeStoreCapability({
        identity: request.identity,
        memberships,
        capability: request.capability,
        resourceStoreId: request.resourceStoreId,
      });

      if (decision.allowed) {
        return decision;
      }

      return {
        ...decision,
        auditMembership: findAuditMembership(memberships, request.resourceStoreId),
      };
    },
  };
}

export function createInMemoryAccessDeniedAuditRecorder(): InMemoryAccessDeniedAuditRecorder {
  const events: AccessDeniedEvent[] = [];

  return {
    recordAccessDenied(event) {
      events.push(event);
      return Promise.resolve();
    },
    readEvents() {
      return events;
    },
  };
}

export function createDefaultMemberships(): readonly StoreMembership[] {
  return [
    {
      subjectId: "collaborator-local",
      role: "collaborator",
      storeId: "loja-piloto",
      storeName: "Loja Piloto",
      status: "active",
    },
    {
      subjectId: "lead-local",
      role: "lead",
      storeId: "loja-piloto",
      storeName: "Loja Piloto",
      status: "active",
    },
    {
      subjectId: "admin-local",
      role: "admin",
      storeId: "loja-piloto",
      storeName: "Loja Piloto",
      status: "active",
    },
  ];
}

export function createSessionContext(decision: AuthorizationDecision) {
  if (!decision.allowed || decision.context === undefined) {
    return undefined;
  }

  const role = decision.context.membership.role;
  const capabilities = listRoleCapabilities(role);

  return {
    actor: decision.context.identity,
    store: {
      storeId: decision.context.membership.storeId,
      storeName: decision.context.membership.storeName,
    },
    activeRole: role,
    capabilities: [...capabilities],
    actions: {
      canActOnTask: roleAllowsCapability(role, "task.act"),
      canCloseShift: roleAllowsCapability(role, "shift.close"),
      canReadStoreAudit: roleAllowsCapability(role, "audit.read_store"),
      canManageUsers: roleAllowsCapability(role, "user.manage"),
    },
  };
}

export function toClientSafeDenial(input: {
  reason: AuthorizationDenialReason;
  denialId?: string;
}) {
  return {
    error: "access_denied" as const,
    reason: input.reason,
    message: clientDenialMessage(input.reason),
    ...(input.denialId === undefined ? {} : { denialId: input.denialId }),
  };
}

export function clientDenialMessage(reason: AuthorizationDenialReason): string {
  if (reason === "unauthenticated") {
    return "Entre novamente para carregar seu escopo operacional.";
  }

  if (reason === "outside_store_scope") {
    return "Acesso bloqueado para este escopo operacional.";
  }

  if (reason === "inactive_membership") {
    return "Seu vinculo operacional nao esta ativo para esta loja.";
  }

  return "Esta acao exige lideranca autorizada nesta loja.";
}

function subjectIdToDisplayName(subjectId: string): string {
  if (subjectId === "lead-local") {
    return "Lideranca local";
  }

  if (subjectId === "admin-local") {
    return "Administracao local";
  }

  return "Colaborador local";
}

function findAuditMembership(
  memberships: readonly StoreMembership[],
  resourceStoreId: string,
): StoreMembership | undefined {
  return (
    memberships.find((membership) => membership.storeId === resourceStoreId) ?? memberships[0]
  );
}

function isExpired(expiresAt: string | undefined): boolean {
  return expiresAt !== undefined && new Date(expiresAt).getTime() <= Date.now();
}
