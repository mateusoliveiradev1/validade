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

export interface MembershipRepository {
  listActiveMemberships(subjectId: string): Promise<readonly StoreMembership[]>;
}

export interface AccessDeniedEvent {
  eventId: string;
  actorSubjectId?: string;
  actorRoleSnapshot?: string;
  requestedCapability: Capability;
  targetType: string;
  storeScope?: string;
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
    identity?: AuthenticatedIdentity;
    capability: Capability;
    resourceStoreId: string;
  }): Promise<AuthorizationDecision>;
}

export interface InMemoryMembershipRepository extends MembershipRepository {
  replaceMemberships(memberships: readonly StoreMembership[]): void;
}

export class FakeAuthProvider implements AuthProvider {
  constructor(private readonly defaultSubjectId?: string) {}

  async verify(request: Request): Promise<AuthenticatedIdentity | undefined> {
    const authorizationHeader = request.headers.get("authorization");
    const subjectFromHeader = authorizationHeader?.startsWith("Bearer fake:")
      ? authorizationHeader.slice("Bearer fake:".length).trim()
      : undefined;
    const subjectFromTestHeader = request.headers.get("x-validade-subject")?.trim();
    const subjectId = subjectFromHeader ?? subjectFromTestHeader ?? this.defaultSubjectId;

    if (subjectId === undefined || subjectId.length === 0) {
      return undefined;
    }

    return {
      subjectId,
      displayName: subjectIdToDisplayName(subjectId),
      issuer: "fake-auth-provider",
    };
  }
}

export function createInMemoryMembershipRepository(
  memberships: readonly StoreMembership[] = createDefaultMemberships(),
): InMemoryMembershipRepository {
  let records = [...memberships];

  return {
    async listActiveMemberships(subjectId) {
      return records.filter(
        (membership) => membership.subjectId === subjectId && membership.status === "active",
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

      return authorizeStoreCapability({
        identity: request.identity,
        memberships,
        capability: request.capability,
        resourceStoreId: request.resourceStoreId,
      });
    },
  };
}

export function createInMemoryAccessDeniedAuditRecorder(): InMemoryAccessDeniedAuditRecorder {
  const events: AccessDeniedEvent[] = [];

  return {
    async recordAccessDenied(event) {
      events.push(event);
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
