import { z } from "zod";

import {
  AccountStatusSchema,
  AuthorizationRoleSchema,
  SessionContextResponseSchema,
} from "./authorization";

const RequiredIdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(240);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const OpaqueTokenSchema = z.string().trim().min(32).max(512);
const PasswordSchema = z.string().min(12).max(128);
const IdempotencyKeySchema = z.string().trim().min(8).max(160);

export const InviteStatusSchema = z.enum([
  "valid",
  "invalid",
  "expired",
  "revoked",
  "activated",
]);

export const InviteValidationRequestSchema = z
  .object({
    token: OpaqueTokenSchema,
  })
  .strict();

export const InviteValidationResponseSchema = z
  .object({
    status: InviteStatusSchema,
    expiresAt: IsoDateTimeSchema.optional(),
    invite: z
      .object({
        identifier: RequiredIdentifierSchema,
        displayName: RequiredTextSchema,
        storeId: RequiredIdentifierSchema,
        storeName: RequiredTextSchema,
        role: AuthorizationRoleSchema,
      })
      .strict()
      .optional(),
  })
  .strict();

export const FirstAccessActivationRequestSchema = z
  .object({
    token: OpaqueTokenSchema,
    password: PasswordSchema,
  })
  .strict();

export const LoginRequestSchema = z
  .object({
    identifier: RequiredIdentifierSchema,
    password: PasswordSchema,
  })
  .strict();

export const LogoutRequestSchema = z
  .object({
    allSessions: z.boolean().optional(),
  })
  .strict();

export const RecoveryRequestSchema = z
  .object({
    identifier: RequiredIdentifierSchema,
  })
  .strict();

export const PasswordResetRequestSchema = z
  .object({
    token: OpaqueTokenSchema,
    password: PasswordSchema,
  })
  .strict();

export const SessionRefreshRequestSchema = z.object({}).strict();

export const SessionStatusResponseSchema = SessionContextResponseSchema;

export const AccountAccessErrorResponseSchema = z
  .object({
    error: z.enum([
      "account_blocked",
      "account_revoked",
      "recovery_required",
      "session_expired",
    ]),
    accountStatus: AccountStatusSchema.optional(),
    canRequestRecovery: z.boolean(),
  })
  .strict();

export const InvalidCredentialsResponseSchema = z
  .object({
    error: z.literal("invalid_credentials"),
  })
  .strict();

export const AuthenticatedSessionResponseSchema = z
  .object({
    status: z.enum(["account_activated", "authenticated", "refreshed"]),
    sessionToken: OpaqueTokenSchema,
    session: SessionContextResponseSchema,
  })
  .strict();

export const LogoutResponseSchema = z
  .object({
    status: z.literal("logged_out"),
  })
  .strict();

export const RecoveryRequestedResponseSchema = z
  .object({
    status: z.literal("recovery_requested"),
  })
  .strict();

export const PasswordResetResponseSchema = z
  .object({
    status: z.literal("password_reset"),
  })
  .strict();

export const CreateInviteRequestSchema = z
  .object({
    identifier: RequiredIdentifierSchema,
    displayName: RequiredTextSchema,
    storeId: RequiredIdentifierSchema,
    storeName: RequiredTextSchema,
    role: AuthorizationRoleSchema,
    idempotencyKey: IdempotencyKeySchema,
    expiresAt: IsoDateTimeSchema,
  })
  .strict();

export const RevokeInviteRequestSchema = z
  .object({
    storeId: RequiredIdentifierSchema,
    idempotencyKey: IdempotencyKeySchema,
  })
  .strict();

export const InviteMutationResponseSchema = z
  .object({
    inviteId: RequiredIdentifierSchema,
    token: OpaqueTokenSchema.optional(),
    status: z.enum(["created", "revoked"]),
    expiresAt: IsoDateTimeSchema,
    replayed: z.boolean(),
  })
  .strict();

export const PrivacyRightsRequestTypeSchema = z.enum([
  "access",
  "correction",
  "deletion",
  "portability",
  "processing_information",
  "consent_revocation",
  "processing_objection",
  "automated_decision_review",
]);

export const PrivacyDataCategorySchema = z.enum([
  "identity",
  "store_and_role",
  "physical_actions",
  "lots_and_tasks",
  "evidence",
  "timestamps_and_audit",
  "sync_state",
  "device_permissions",
]);

export const PrivacyRequestSchema = z
  .object({
    requestType: PrivacyRightsRequestTypeSchema,
    contact: z
      .object({
        channel: z.enum(["email", "phone"]),
        value: RequiredIdentifierSchema,
      })
      .strict(),
    dataCategories: z.array(PrivacyDataCategorySchema).min(1).max(8),
    body: z.string().trim().min(20).max(2_000),
    idempotencyKey: IdempotencyKeySchema,
  })
  .strict();

export const PrivacyRequestResponseSchema = z
  .object({
    requestId: RequiredIdentifierSchema,
    status: z.literal("received"),
    receivedAt: IsoDateTimeSchema,
    replayed: z.boolean(),
  })
  .strict();

export const AuthenticationContract = {
  inviteValidation: InviteValidationRequestSchema,
  inviteValidationResponse: InviteValidationResponseSchema,
  firstAccessActivation: FirstAccessActivationRequestSchema,
  login: LoginRequestSchema,
  logout: LogoutRequestSchema,
  recoveryRequest: RecoveryRequestSchema,
  passwordReset: PasswordResetRequestSchema,
  sessionRefresh: SessionRefreshRequestSchema,
  sessionStatus: SessionStatusResponseSchema,
  accountAccessError: AccountAccessErrorResponseSchema,
  invalidCredentials: InvalidCredentialsResponseSchema,
  authenticatedSession: AuthenticatedSessionResponseSchema,
  logoutResponse: LogoutResponseSchema,
  recoveryRequestedResponse: RecoveryRequestedResponseSchema,
  passwordResetResponse: PasswordResetResponseSchema,
  createInvite: CreateInviteRequestSchema,
  revokeInvite: RevokeInviteRequestSchema,
  inviteMutation: InviteMutationResponseSchema,
  privacyRequest: PrivacyRequestSchema,
  privacyRequestResponse: PrivacyRequestResponseSchema,
} as const;

export type InviteStatus = z.infer<typeof InviteStatusSchema>;
export type InviteValidationRequest = z.infer<typeof InviteValidationRequestSchema>;
export type InviteValidationResponse = z.infer<typeof InviteValidationResponseSchema>;
export type FirstAccessActivationRequest = z.infer<typeof FirstAccessActivationRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
export type RecoveryRequest = z.infer<typeof RecoveryRequestSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type SessionRefreshRequest = z.infer<typeof SessionRefreshRequestSchema>;
export type SessionStatusResponse = z.infer<typeof SessionStatusResponseSchema>;
export type AccountAccessErrorResponse = z.infer<typeof AccountAccessErrorResponseSchema>;
export type AuthenticatedSessionResponse = z.infer<typeof AuthenticatedSessionResponseSchema>;
export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;
export type RevokeInviteRequest = z.infer<typeof RevokeInviteRequestSchema>;
export type PrivacyRightsRequestType = z.infer<typeof PrivacyRightsRequestTypeSchema>;
export type PrivacyDataCategory = z.infer<typeof PrivacyDataCategorySchema>;
export type PrivacyRequest = z.infer<typeof PrivacyRequestSchema>;
export type PrivacyRequestResponse = z.infer<typeof PrivacyRequestResponseSchema>;
