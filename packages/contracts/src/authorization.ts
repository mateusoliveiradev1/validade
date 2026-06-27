import { AUTHORIZATION_ROLES, CAPABILITIES, MEMBERSHIP_STATUSES } from "@validade-zero/domain";
import { z } from "zod";

const RequiredIdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(240);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const VersionSchema = z.number().int().min(1).max(2_147_483_647);

export const CapabilitySchema = z.enum(CAPABILITIES);

export const AuthorizationRoleSchema = z.enum(AUTHORIZATION_ROLES);

export const MembershipStatusSchema = z.enum(MEMBERSHIP_STATUSES);

export const AccountStatusSchema = z.enum([
  "invited",
  "active",
  "blocked",
  "revoked",
  "recovery_pending",
]);

export const AuthenticatedIdentitySchema = z
  .object({
    subjectId: RequiredIdentifierSchema,
    displayName: RequiredTextSchema.optional(),
    issuer: RequiredIdentifierSchema.optional(),
    expiresAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export const StoreMembershipSchema = z
  .object({
    subjectId: RequiredIdentifierSchema,
    role: AuthorizationRoleSchema,
    storeId: RequiredIdentifierSchema,
    storeName: RequiredTextSchema,
    status: MembershipStatusSchema,
  })
  .strict();

export const AuthorizedActorContextSchema = z
  .object({
    identity: AuthenticatedIdentitySchema,
    membership: StoreMembershipSchema,
    capabilities: z.array(CapabilitySchema),
  })
  .strict();

export const AuthorizationDenialReasonSchema = z.enum([
  "unauthenticated",
  "inactive_membership",
  "capability_not_allowed",
  "outside_store_scope",
]);

export const ClientSafeAuthorizationDenialSchema = z
  .object({
    error: z.literal("access_denied"),
    reason: AuthorizationDenialReasonSchema,
    message: RequiredTextSchema,
    denialId: RequiredIdentifierSchema.optional(),
  })
  .strict();

export const SessionContextResponseSchema = z
  .object({
    actor: AuthenticatedIdentitySchema,
    store: z
      .object({
        storeId: RequiredIdentifierSchema,
        storeName: RequiredTextSchema,
      })
      .strict(),
    activeRole: AuthorizationRoleSchema,
    capabilities: z.array(CapabilitySchema),
    sessionExpiresAt: IsoDateTimeSchema,
    accountStatus: AccountStatusSchema,
    canRequestRecovery: z.boolean(),
    privacyCenterUrl: z.string().trim().min(1).max(500),
    actions: z
      .object({
        canReadCommandCenter: z.boolean(),
        canActOnTask: z.boolean(),
        canReviewProductDrafts: z.boolean(),
        canCloseShift: z.boolean(),
        canReadStoreAudit: z.boolean(),
        canManageUsers: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const ProtectedCapabilityProbeResponseSchema = z
  .object({
    status: z.literal("authorized"),
    capability: CapabilitySchema,
    checkedAt: IsoDateTimeSchema,
  })
  .strict();

export const ManagedStoreMembershipSchema = z
  .object({
    membershipId: RequiredIdentifierSchema,
    subjectId: RequiredIdentifierSchema,
    displayName: RequiredTextSchema,
    role: AuthorizationRoleSchema,
    storeId: RequiredIdentifierSchema,
    storeName: RequiredTextSchema,
    status: MembershipStatusSchema,
    version: VersionSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

const MembershipMutationBaseSchema = z
  .object({
    storeId: RequiredIdentifierSchema,
    idempotencyKey: RequiredIdentifierSchema,
  })
  .strict();

export const CreateMembershipRequestSchema = MembershipMutationBaseSchema.extend({
  subjectId: RequiredIdentifierSchema,
  displayName: RequiredTextSchema,
  storeName: RequiredTextSchema,
  role: AuthorizationRoleSchema,
}).strict();

export const ChangeMembershipRoleRequestSchema = MembershipMutationBaseSchema.extend({
  role: AuthorizationRoleSchema,
  expectedVersion: VersionSchema,
}).strict();

export const RevokeMembershipRequestSchema = MembershipMutationBaseSchema.extend({
  expectedVersion: VersionSchema,
  reason: RequiredTextSchema,
}).strict();

export const MembershipListResponseSchema = z
  .object({
    items: z.array(ManagedStoreMembershipSchema),
  })
  .strict();

export const MembershipMutationResponseSchema = z
  .object({
    membership: ManagedStoreMembershipSchema,
    replayed: z.boolean(),
  })
  .strict();

export const AuthorizationContract = {
  identity: AuthenticatedIdentitySchema,
  membership: StoreMembershipSchema,
  actorContext: AuthorizedActorContextSchema,
  denial: ClientSafeAuthorizationDenialSchema,
  sessionContext: SessionContextResponseSchema,
  protectedCapabilityProbe: ProtectedCapabilityProbeResponseSchema,
  managedMembership: ManagedStoreMembershipSchema,
  createMembership: CreateMembershipRequestSchema,
  changeMembershipRole: ChangeMembershipRoleRequestSchema,
  revokeMembership: RevokeMembershipRequestSchema,
  membershipList: MembershipListResponseSchema,
  membershipMutation: MembershipMutationResponseSchema,
} as const;

export type Capability = z.infer<typeof CapabilitySchema>;
export type AuthorizationRole = z.infer<typeof AuthorizationRoleSchema>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
export type AuthenticatedIdentity = z.infer<typeof AuthenticatedIdentitySchema>;
export type StoreMembership = z.infer<typeof StoreMembershipSchema>;
export type AuthorizedActorContext = z.infer<typeof AuthorizedActorContextSchema>;
export type ClientSafeAuthorizationDenial = z.infer<typeof ClientSafeAuthorizationDenialSchema>;
export type SessionContextResponse = z.infer<typeof SessionContextResponseSchema>;
export type ProtectedCapabilityProbeResponse = z.infer<
  typeof ProtectedCapabilityProbeResponseSchema
>;
export type ManagedStoreMembership = z.infer<typeof ManagedStoreMembershipSchema>;
export type CreateMembershipRequest = z.infer<typeof CreateMembershipRequestSchema>;
export type ChangeMembershipRoleRequest = z.infer<typeof ChangeMembershipRoleRequestSchema>;
export type RevokeMembershipRequest = z.infer<typeof RevokeMembershipRequestSchema>;
export type MembershipListResponse = z.infer<typeof MembershipListResponseSchema>;
export type MembershipMutationResponse = z.infer<typeof MembershipMutationResponseSchema>;
