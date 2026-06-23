export type MobileAuthErrorCode =
  | "account_blocked"
  | "account_revoked"
  | "invalid_credentials"
  | "invalid_invite"
  | "network"
  | "no_permission"
  | "recovery_required"
  | "session_expired";

export class MobileAuthError extends Error {
  constructor(
    readonly code: MobileAuthErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}
