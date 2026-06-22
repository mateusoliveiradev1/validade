export const CAPABILITIES = [
  "task.act",
  "evidence.attach",
  "markdown.request",
  "task.assign",
  "markdown.decide",
  "escalation.assume",
  "audit.read_store",
  "evidence.read_store",
  "evidence.invalidate",
  "shift.close",
  "shift.handoff_ack",
  "user.manage",
  "role.manage",
  "store.manage",
  "policy.manage",
  "audit.read_global",
  "evidence.read_global",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const AUTHORIZATION_ROLES = ["collaborator", "lead", "admin"] as const;

export type AuthorizationRole = (typeof AUTHORIZATION_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["active", "inactive"] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export type AuthorizationDenialReason =
  | "unauthenticated"
  | "inactive_membership"
  | "capability_not_allowed"
  | "outside_store_scope";

export interface StoreMembership {
  subjectId: string;
  role: AuthorizationRole;
  storeId: string;
  storeName: string;
  status: MembershipStatus;
}

export interface AuthenticatedIdentity {
  subjectId: string;
  displayName?: string;
  issuer?: string;
  expiresAt?: string;
}

export interface AuthorizedActorContext {
  identity: AuthenticatedIdentity;
  membership: StoreMembership;
  capabilities: readonly Capability[];
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: AuthorizationDenialReason;
  context?: AuthorizedActorContext;
}

export interface StoreCapabilityAuthorizationInput {
  identity?: AuthenticatedIdentity | undefined;
  memberships: readonly StoreMembership[];
  capability: Capability;
  resourceStoreId: string;
}

const COLLABORATOR_CAPABILITIES = [
  "task.act",
  "evidence.attach",
  "markdown.request",
] as const satisfies readonly Capability[];

const LEAD_CAPABILITIES = [
  ...COLLABORATOR_CAPABILITIES,
  "task.assign",
  "markdown.decide",
  "escalation.assume",
  "audit.read_store",
  "evidence.read_store",
  "evidence.invalidate",
  "shift.close",
  "shift.handoff_ack",
] as const satisfies readonly Capability[];

const ADMIN_CAPABILITIES = [
  "user.manage",
  "role.manage",
  "store.manage",
  "policy.manage",
  "audit.read_global",
  "evidence.read_global",
] as const satisfies readonly Capability[];

export const ROLE_CAPABILITIES = {
  collaborator: COLLABORATOR_CAPABILITIES,
  lead: LEAD_CAPABILITIES,
  admin: ADMIN_CAPABILITIES,
} as const satisfies Record<AuthorizationRole, readonly Capability[]>;

export function roleAllowsCapability(role: AuthorizationRole, capability: Capability): boolean {
  return (ROLE_CAPABILITIES[role] as readonly Capability[]).includes(capability);
}

export function listRoleCapabilities(role: AuthorizationRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role];
}

export function authorizeStoreCapability(
  input: StoreCapabilityAuthorizationInput,
): AuthorizationDecision {
  if (input.identity === undefined) {
    return { allowed: false, reason: "unauthenticated" };
  }

  const activeMemberships = input.memberships.filter(
    (membership) => membership.status === "active",
  );

  if (activeMemberships.length === 0) {
    return { allowed: false, reason: "inactive_membership" };
  }

  const sameStoreMemberships = activeMemberships.filter(
    (membership) => membership.storeId === input.resourceStoreId,
  );

  if (sameStoreMemberships.length === 0) {
    return { allowed: false, reason: "outside_store_scope" };
  }

  const authorizedMembership = sameStoreMemberships.find((membership) =>
    roleAllowsCapability(membership.role, input.capability),
  );

  if (authorizedMembership === undefined) {
    return { allowed: false, reason: "capability_not_allowed" };
  }

  return {
    allowed: true,
    context: {
      identity: input.identity,
      membership: authorizedMembership,
      capabilities: listRoleCapabilities(authorizedMembership.role),
    },
  };
}
