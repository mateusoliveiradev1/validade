import { AUTHORIZATION_ROLES, CAPABILITIES, MEMBERSHIP_STATUSES } from "@validade-zero/domain";
import { z } from "zod";

const RequiredIdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(240);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const CapabilitySchema = z.enum(CAPABILITIES);

export const AuthorizationRoleSchema = z.enum(AUTHORIZATION_ROLES);

export const MembershipStatusSchema = z.enum(MEMBERSHIP_STATUSES);

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
    actions: z
      .object({
        canActOnTask: z.boolean(),
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

export const AuthorizationContract = {
  identity: AuthenticatedIdentitySchema,
  membership: StoreMembershipSchema,
  actorContext: AuthorizedActorContextSchema,
  denial: ClientSafeAuthorizationDenialSchema,
  sessionContext: SessionContextResponseSchema,
  protectedCapabilityProbe: ProtectedCapabilityProbeResponseSchema,
} as const;

export type Capability = z.infer<typeof CapabilitySchema>;
export type AuthorizationRole = z.infer<typeof AuthorizationRoleSchema>;
export type AuthenticatedIdentity = z.infer<typeof AuthenticatedIdentitySchema>;
export type StoreMembership = z.infer<typeof StoreMembershipSchema>;
export type AuthorizedActorContext = z.infer<typeof AuthorizedActorContextSchema>;
export type ClientSafeAuthorizationDenial = z.infer<typeof ClientSafeAuthorizationDenialSchema>;
export type SessionContextResponse = z.infer<typeof SessionContextResponseSchema>;
export type ProtectedCapabilityProbeResponse = z.infer<
  typeof ProtectedCapabilityProbeResponseSchema
>;
