import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { AuthorizationRole, StoreMembership } from "@validade-zero/domain";

import type { MembershipRepository } from "./membership-repository";

const PASSWORD_ITERATIONS = 310_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";
const PASSWORD_ALGORITHM = `pbkdf2-${PASSWORD_DIGEST}:${PASSWORD_ITERATIONS}`;
const textEncoder = new TextEncoder();

export type AuthAccountStatus =
  | "invited"
  | "active"
  | "blocked"
  | "revoked"
  | "recovery_pending";

export interface AuthRepositorySecrets {
  tokenPepper: string;
  passwordPepper: string;
}

export interface AuthInviteRecord {
  inviteId: string;
  identifier: string;
  subjectId: string;
  displayName: string;
  storeId: string;
  storeName: string;
  role: AuthorizationRole;
  status: AuthAccountStatus;
  expiresAt: Date;
  activatedAt?: Date;
  revokedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

interface StoredAuthInviteRecord extends AuthInviteRecord {
  idempotencyKey: string;
  tokenHash: string;
}

export interface AuthAccountRecord {
  subjectId: string;
  storeId: string;
  identifier: string;
  displayName: string;
  status: AuthAccountStatus;
  passwordUpdatedAt: Date;
}

interface StoredAuthAccountRecord extends AuthAccountRecord {
  passwordHash: string;
  passwordSalt: string;
  passwordAlgorithm: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSessionRecord {
  sessionId: string;
  subjectId: string;
  storeId: string;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date;
  rotatedFromSessionId?: string;
}

interface StoredAuthSessionRecord extends AuthSessionRecord {
  tokenHash: string;
  revokedAt?: Date;
}

export interface PrivacyRequestRecord {
  requestId: string;
  idempotencyKey: string;
  subjectId: string;
  storeId: string;
  requestType: string;
  contactChannel: "email" | "phone";
  contactValue: string;
  dataCategories: readonly string[];
  requestBody: string;
  status: "received";
  receivedAt: Date;
}

interface StoredRecoveryRecord {
  recoveryId: string;
  idempotencyKey: string;
  tokenHash: string;
  subjectId: string;
  storeId: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}

export interface InviteMutationReceipt {
  invite: AuthInviteRecord;
  replayed: boolean;
}

export interface PrivacyRequestReceipt {
  request: PrivacyRequestRecord;
  replayed: boolean;
}

export type InviteValidationResult =
  | { status: "invalid" | "expired" | "revoked" | "activated" }
  | { status: "valid"; invite: AuthInviteRecord };

export interface AuthRepository {
  createInvite(input: {
    inviteId: string;
    idempotencyKey: string;
    token: string;
    identifier: string;
    subjectId: string;
    displayName: string;
    storeId: string;
    storeName: string;
    role: AuthorizationRole;
    expiresAt: Date;
    createdBy: string;
    createdAt: Date;
  }): Promise<InviteMutationReceipt>;
  validateInvite(input: { token: string; now: Date }): Promise<InviteValidationResult>;
  revokeInvite(input: {
    inviteId: string;
    storeId: string;
    revokedAt: Date;
  }): Promise<AuthInviteRecord | undefined>;
  activateAccount(input: {
    token: string;
    password: string;
    activatedAt: Date;
  }): Promise<AuthAccountRecord>;
  verifyPassword(input: {
    identifier: string;
    password: string;
  }): Promise<AuthAccountRecord | undefined>;
  changeAccountStatus(input: {
    subjectId: string;
    storeId: string;
    status: "active" | "blocked" | "revoked";
    occurredAt: Date;
  }): Promise<AuthAccountRecord | undefined>;
  rotateSession(input: {
    sessionId: string;
    subjectId: string;
    storeId: string;
    nextToken: string;
    expiresAt: Date;
    occurredAt: Date;
    currentToken?: string;
  }): Promise<AuthSessionRecord>;
  verifySession(input: { token: string; now: Date }): Promise<AuthSessionRecord | undefined>;
  revokeSession(input: { token: string; revokedAt: Date }): Promise<boolean>;
  revokeSessionsForSubjectStore(input: {
    subjectId: string;
    storeId: string;
    revokedAt: Date;
  }): Promise<number>;
  createRecoveryRequest(input: {
    recoveryId: string;
    idempotencyKey: string;
    identifier: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<boolean>;
  consumeRecoveryToken(input: {
    token: string;
    password: string;
    consumedAt: Date;
  }): Promise<AuthAccountRecord | undefined>;
  createPrivacyRequest(input: Omit<PrivacyRequestRecord, "status">): Promise<PrivacyRequestReceipt>;
}

export interface InMemoryAuthRepository extends AuthRepository {
  readStoredState(): {
    invites: readonly StoredAuthInviteRecord[];
    credentials: readonly StoredAuthAccountRecord[];
    sessions: readonly StoredAuthSessionRecord[];
    recoveryTokens: readonly StoredRecoveryRecord[];
    privacyRequests: readonly PrivacyRequestRecord[];
  };
}

export function createNeonAuthRepository(input: {
  connectionString: string;
  secrets: AuthRepositorySecrets;
}): AuthRepository {
  return createAuthRepositoryFromQuery(neon(input.connectionString), input.secrets);
}

export function createInMemoryAuthRepository(input: {
  memberships: MembershipRepository;
  secrets: AuthRepositorySecrets;
}): InMemoryAuthRepository {
  assertSecrets(input.secrets);
  const invites = new Map<string, StoredAuthInviteRecord>();
  const inviteIdempotency = new Map<string, string>();
  const credentials = new Map<string, StoredAuthAccountRecord>();
  const sessions = new Map<string, StoredAuthSessionRecord>();
  const recoveries = new Map<string, StoredRecoveryRecord>();
  const recoveryIdempotency = new Set<string>();
  const privacyRequests = new Map<string, PrivacyRequestRecord>();
  const privacyIdempotency = new Map<string, string>();

  async function requireActiveMembership(subjectId: string, storeId: string): Promise<StoreMembership> {
    const memberships = await input.memberships.listActiveMemberships(subjectId);
    const membership = memberships.find((candidate) => candidate.storeId === storeId);
    if (membership === undefined) {
      throw new Error("The account no longer has an active membership for this store.");
    }
    return membership;
  }

  async function findSession(token: string, now: Date): Promise<StoredAuthSessionRecord | undefined> {
    const tokenHash = await hashToken(token, input.secrets.tokenPepper);
    const session = [...sessions.values()].find((candidate) => candidate.tokenHash === tokenHash);
    if (session === undefined || session.revokedAt !== undefined || session.expiresAt <= now) {
      return undefined;
    }
    const account = credentials.get(accountKey(session.subjectId, session.storeId));
    if (account?.status !== "active") return undefined;
    try {
      await requireActiveMembership(session.subjectId, session.storeId);
    } catch {
      return undefined;
    }
    session.lastSeenAt = now;
    return session;
  }

  return {
    async createInvite(request) {
      const replayId = inviteIdempotency.get(request.idempotencyKey);
      if (replayId !== undefined) {
        return { invite: publicInvite(requiredMapValue(invites, replayId)), replayed: true };
      }
      const tokenHash = await hashToken(request.token, input.secrets.tokenPepper);
      if ([...invites.values()].some((invite) => invite.tokenHash === tokenHash)) {
        throw new Error("Invite token has already been used.");
      }
      const invite: StoredAuthInviteRecord = {
        inviteId: request.inviteId,
        idempotencyKey: request.idempotencyKey,
        identifier: normalizeIdentifier(request.identifier),
        subjectId: request.subjectId,
        displayName: request.displayName,
        storeId: request.storeId,
        storeName: request.storeName,
        role: request.role,
        expiresAt: request.expiresAt,
        createdBy: request.createdBy,
        createdAt: request.createdAt,
        tokenHash,
        status: "invited",
      };
      invites.set(invite.inviteId, invite);
      inviteIdempotency.set(invite.idempotencyKey, invite.inviteId);
      return { invite: publicInvite(invite), replayed: false };
    },
    async validateInvite({ token, now }) {
      const tokenHash = await hashToken(token, input.secrets.tokenPepper);
      const invite = [...invites.values()].find((candidate) => candidate.tokenHash === tokenHash);
      return validateStoredInvite(invite, now);
    },
    revokeInvite({ inviteId, storeId, revokedAt }) {
      const invite = invites.get(inviteId);
      if (invite === undefined || invite.storeId !== storeId || invite.status !== "invited") {
        return Promise.resolve(undefined);
      }
      invite.status = "revoked";
      invite.revokedAt = revokedAt;
      return Promise.resolve(publicInvite(invite));
    },
    async activateAccount({ token, password, activatedAt }) {
      const tokenHash = await hashToken(token, input.secrets.tokenPepper);
      const invite = [...invites.values()].find((candidate) => candidate.tokenHash === tokenHash);
      const validation = validateStoredInvite(invite, activatedAt);
      if (validation.status !== "valid" || invite === undefined) {
        throw new Error("Invite is invalid or expired.");
      }
      await requireActiveMembership(invite.subjectId, invite.storeId);
      const verifier = await createPasswordVerifier(password, input.secrets.passwordPepper);
      const account: StoredAuthAccountRecord = {
        subjectId: invite.subjectId,
        storeId: invite.storeId,
        identifier: invite.identifier,
        displayName: invite.displayName,
        status: "active",
        ...verifier,
        passwordUpdatedAt: activatedAt,
        createdAt: activatedAt,
        updatedAt: activatedAt,
      };
      credentials.set(accountKey(account.subjectId, account.storeId), account);
      invite.status = "active";
      invite.activatedAt = activatedAt;
      return publicAccount(account);
    },
    async verifyPassword({ identifier, password }) {
      const account = [...credentials.values()].find(
        (candidate) => candidate.identifier === normalizeIdentifier(identifier),
      );
      if (account === undefined) return undefined;
      const valid = await verifyPasswordValue(password, account, input.secrets.passwordPepper);
      return valid ? publicAccount(account) : undefined;
    },
    async changeAccountStatus({ subjectId, storeId, status, occurredAt }) {
      const account = credentials.get(accountKey(subjectId, storeId));
      if (account === undefined) return undefined;
      account.status = status;
      account.updatedAt = occurredAt;
      if (status !== "active") {
        await this.revokeSessionsForSubjectStore({ subjectId, storeId, revokedAt: occurredAt });
      }
      return publicAccount(account);
    },
    async rotateSession(request) {
      await requireActiveMembership(request.subjectId, request.storeId);
      const account = credentials.get(accountKey(request.subjectId, request.storeId));
      if (account?.status !== "active") throw new Error("The account is not active.");
      let rotatedFromSessionId: string | undefined;
      if (request.currentToken !== undefined) {
        const current = await findSession(request.currentToken, request.occurredAt);
        if (
          current === undefined ||
          current.subjectId !== request.subjectId ||
          current.storeId !== request.storeId
        ) {
          throw new Error("The current session is invalid or expired.");
        }
        current.revokedAt = request.occurredAt;
        rotatedFromSessionId = current.sessionId;
      }
      const stored: StoredAuthSessionRecord = {
        sessionId: request.sessionId,
        subjectId: request.subjectId,
        storeId: request.storeId,
        tokenHash: await hashToken(request.nextToken, input.secrets.tokenPepper),
        expiresAt: request.expiresAt,
        createdAt: request.occurredAt,
        lastSeenAt: request.occurredAt,
        ...(rotatedFromSessionId === undefined ? {} : { rotatedFromSessionId }),
      };
      sessions.set(stored.sessionId, stored);
      return publicSession(stored);
    },
    async verifySession(request) {
      const session = await findSession(request.token, request.now);
      return session === undefined ? undefined : publicSession(session);
    },
    async revokeSession({ token, revokedAt }) {
      const tokenHash = await hashToken(token, input.secrets.tokenPepper);
      const session = [...sessions.values()].find((candidate) => candidate.tokenHash === tokenHash);
      if (session === undefined || session.revokedAt !== undefined) return false;
      session.revokedAt = revokedAt;
      return true;
    },
    revokeSessionsForSubjectStore({ subjectId, storeId, revokedAt }) {
      let revoked = 0;
      for (const session of sessions.values()) {
        if (session.subjectId === subjectId && session.storeId === storeId && session.revokedAt === undefined) {
          session.revokedAt = revokedAt;
          revoked += 1;
        }
      }
      return Promise.resolve(revoked);
    },
    async createRecoveryRequest(request) {
      if (recoveryIdempotency.has(request.idempotencyKey)) return true;
      const account = [...credentials.values()].find(
        (candidate) => candidate.identifier === normalizeIdentifier(request.identifier),
      );
      if (account === undefined || account.status === "revoked") return false;
      const recovery: StoredRecoveryRecord = {
        recoveryId: request.recoveryId,
        idempotencyKey: request.idempotencyKey,
        tokenHash: await hashToken(request.token, input.secrets.tokenPepper),
        subjectId: account.subjectId,
        storeId: account.storeId,
        expiresAt: request.expiresAt,
        createdAt: request.createdAt,
      };
      recoveries.set(recovery.recoveryId, recovery);
      recoveryIdempotency.add(recovery.idempotencyKey);
      account.status = "recovery_pending";
      account.updatedAt = request.createdAt;
      return true;
    },
    async consumeRecoveryToken({ token, password, consumedAt }) {
      const tokenHash = await hashToken(token, input.secrets.tokenPepper);
      const recovery = [...recoveries.values()].find((candidate) => candidate.tokenHash === tokenHash);
      if (recovery === undefined || recovery.consumedAt !== undefined || recovery.expiresAt <= consumedAt) {
        return undefined;
      }
      const account = credentials.get(accountKey(recovery.subjectId, recovery.storeId));
      if (account === undefined || account.status === "revoked" || account.status === "blocked") {
        return undefined;
      }
      const verifier = await createPasswordVerifier(password, input.secrets.passwordPepper);
      Object.assign(account, verifier, {
        status: "active" as const,
        passwordUpdatedAt: consumedAt,
        updatedAt: consumedAt,
      });
      recovery.consumedAt = consumedAt;
      await this.revokeSessionsForSubjectStore({
        subjectId: account.subjectId,
        storeId: account.storeId,
        revokedAt: consumedAt,
      });
      return publicAccount(account);
    },
    createPrivacyRequest(request) {
      validatePrivacyRequest(request);
      const replayId = privacyIdempotency.get(request.idempotencyKey);
      if (replayId !== undefined) {
        return Promise.resolve({
          request: requiredMapValue(privacyRequests, replayId),
          replayed: true,
        });
      }
      const record: PrivacyRequestRecord = { ...request, status: "received" };
      privacyRequests.set(record.requestId, record);
      privacyIdempotency.set(record.idempotencyKey, record.requestId);
      return Promise.resolve({ request: record, replayed: false });
    },
    readStoredState() {
      return {
        invites: [...invites.values()],
        credentials: [...credentials.values()],
        sessions: [...sessions.values()],
        recoveryTokens: [...recoveries.values()],
        privacyRequests: [...privacyRequests.values()],
      };
    },
  };
}

export function createAuthRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
  secrets: AuthRepositorySecrets,
): AuthRepository {
  assertSecrets(secrets);

  async function activeMembershipExists(subjectId: string, storeId: string): Promise<boolean> {
    const rows = (await sql.query(
      `select membership_id from store_memberships
       where subject_id = $1 and store_id = $2 and status = 'active' limit 1`,
      [subjectId, storeId],
    )) as { membership_id: string }[];
    return rows[0] !== undefined;
  }

  async function findSession(token: string, now: Date): Promise<AuthSessionRow | undefined> {
    const tokenHash = await hashToken(token, secrets.tokenPepper);
    const rows = (await sql.query(
      `select s.session_id, s.subject_id, s.store_id, s.expires_at, s.created_at,
              s.last_seen_at, s.rotated_from_session_id
       from auth_sessions s
       join auth_credentials c on c.subject_id = s.subject_id and c.store_id = s.store_id
       where s.token_hash = $1 and s.revoked_at is null and s.expires_at > $2::timestamptz
         and c.status = 'active'
         and exists (
           select 1 from store_memberships m
           where m.subject_id = s.subject_id and m.store_id = s.store_id and m.status = 'active'
         )
       limit 1`,
      [tokenHash, now.toISOString()],
    )) as AuthSessionRow[];
    if (rows[0] !== undefined) {
      await sql.query("update auth_sessions set last_seen_at = $1 where session_id = $2", [
        now.toISOString(),
        rows[0].session_id,
      ]);
    }
    return rows[0];
  }

  return {
    async createInvite(request) {
      const replayRows = (await sql.query(
        `select ${INVITE_COLUMNS} from auth_invites where idempotency_key = $1 limit 1`,
        [request.idempotencyKey],
      )) as AuthInviteRow[];
      if (replayRows[0] !== undefined) return { invite: mapInvite(replayRows[0]), replayed: true };
      const rows = (await sql.query(
        `insert into auth_invites (
          invite_id, idempotency_key, token_hash, identifier, subject_id, display_name,
          store_id, store_name, role, status, expires_at, created_by, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'invited', $10, $11, $12)
        on conflict (idempotency_key) do nothing returning ${INVITE_COLUMNS}`,
        [
          request.inviteId,
          request.idempotencyKey,
          await hashToken(request.token, secrets.tokenPepper),
          normalizeIdentifier(request.identifier),
          request.subjectId,
          request.displayName,
          request.storeId,
          request.storeName,
          request.role,
          request.expiresAt.toISOString(),
          request.createdBy,
          request.createdAt.toISOString(),
        ],
      )) as AuthInviteRow[];
      if (rows[0] !== undefined) return { invite: mapInvite(rows[0]), replayed: false };
      const retryRows = (await sql.query(
        `select ${INVITE_COLUMNS} from auth_invites where idempotency_key = $1 limit 1`,
        [request.idempotencyKey],
      )) as AuthInviteRow[];
      return { invite: mapInvite(requiredRow(retryRows, "Invite was not persisted.")), replayed: true };
    },
    async validateInvite({ token, now }) {
      const rows = (await sql.query(
        `select ${INVITE_COLUMNS} from auth_invites where token_hash = $1 limit 1`,
        [await hashToken(token, secrets.tokenPepper)],
      )) as AuthInviteRow[];
      return validateStoredInvite(rows[0] === undefined ? undefined : mapStoredInvite(rows[0]), now);
    },
    async revokeInvite({ inviteId, storeId, revokedAt }) {
      const rows = (await sql.query(
        `update auth_invites set status = 'revoked', revoked_at = $1
         where invite_id = $2 and store_id = $3 and status = 'invited' returning ${INVITE_COLUMNS}`,
        [revokedAt.toISOString(), inviteId, storeId],
      )) as AuthInviteRow[];
      return rows[0] === undefined ? undefined : mapInvite(rows[0]);
    },
    async activateAccount({ token, password, activatedAt }) {
      const tokenHash = await hashToken(token, secrets.tokenPepper);
      const inviteRows = (await sql.query(
        `select ${INVITE_COLUMNS} from auth_invites
         where token_hash = $1 and status = 'invited' and expires_at > $2 limit 1`,
        [tokenHash, activatedAt.toISOString()],
      )) as AuthInviteRow[];
      const invite = mapInvite(requiredRow(inviteRows, "Invite is invalid or expired."));
      if (!(await activeMembershipExists(invite.subjectId, invite.storeId))) {
        throw new Error("The account no longer has an active membership for this store.");
      }
      const verifier = await createPasswordVerifier(password, secrets.passwordPepper);
      const rows = (await sql.query(
        `with activated as (
           update auth_invites set status = 'active', activated_at = $1
           where invite_id = $2 and status = 'invited' and expires_at > $1 returning *
         )
         insert into auth_credentials (
           subject_id, store_id, identifier, display_name, password_hash, password_salt,
           password_algorithm, status, password_updated_at, created_at, updated_at
         ) select subject_id, store_id, identifier, display_name, $3, $4, $5, 'active', $1, $1, $1
           from activated
         on conflict (subject_id, store_id) do update set
           password_hash = excluded.password_hash, password_salt = excluded.password_salt,
           password_algorithm = excluded.password_algorithm, status = 'active',
           password_updated_at = excluded.password_updated_at, updated_at = excluded.updated_at
         returning ${ACCOUNT_COLUMNS}`,
        [activatedAt.toISOString(), invite.inviteId, verifier.passwordHash, verifier.passwordSalt, verifier.passwordAlgorithm],
      )) as AuthAccountRow[];
      return mapAccount(requiredRow(rows, "Invite activation was not persisted."));
    },
    async verifyPassword({ identifier, password }) {
      const rows = (await sql.query(
        `select ${ACCOUNT_COLUMNS} from auth_credentials where identifier = $1 limit 1`,
        [normalizeIdentifier(identifier)],
      )) as AuthAccountRow[];
      const row = rows[0];
      if (row === undefined) return undefined;
      const valid = await verifyPasswordValue(password, mapStoredAccount(row), secrets.passwordPepper);
      return valid ? mapAccount(row) : undefined;
    },
    async changeAccountStatus({ subjectId, storeId, status, occurredAt }) {
      const rows = (await sql.query(
        `with changed as (
           update auth_credentials set status = $1, updated_at = $2
           where subject_id = $3 and store_id = $4 returning ${ACCOUNT_COLUMNS}
         ), revoked as (
           update auth_sessions s set revoked_at = $2 from changed c
           where $1 <> 'active' and s.subject_id = c.subject_id and s.store_id = c.store_id
             and s.revoked_at is null
         ) select * from changed`,
        [status, occurredAt.toISOString(), subjectId, storeId],
      )) as AuthAccountRow[];
      return rows[0] === undefined ? undefined : mapAccount(rows[0]);
    },
    async rotateSession(request) {
      if (!(await activeMembershipExists(request.subjectId, request.storeId))) {
        throw new Error("The account no longer has an active membership for this store.");
      }
      let rotatedFromSessionId: string | undefined;
      if (request.currentToken !== undefined) {
        const current = await findSession(request.currentToken, request.occurredAt);
        if (current === undefined || current.subject_id !== request.subjectId || current.store_id !== request.storeId) {
          throw new Error("The current session is invalid or expired.");
        }
        rotatedFromSessionId = current.session_id;
        await sql.query("update auth_sessions set revoked_at = $1 where session_id = $2 and revoked_at is null", [
          request.occurredAt.toISOString(),
          current.session_id,
        ]);
      }
      const rows = (await sql.query(
        `insert into auth_sessions (
          session_id, token_hash, subject_id, store_id, expires_at, rotated_from_session_id,
          created_at, last_seen_at
        ) select $1, $2, c.subject_id, c.store_id, $5, $6, $7, $7
          from auth_credentials c
          where c.subject_id = $3 and c.store_id = $4 and c.status = 'active'
        returning ${SESSION_COLUMNS}`,
        [
          request.sessionId,
          await hashToken(request.nextToken, secrets.tokenPepper),
          request.subjectId,
          request.storeId,
          request.expiresAt.toISOString(),
          rotatedFromSessionId ?? null,
          request.occurredAt.toISOString(),
        ],
      )) as AuthSessionRow[];
      return mapSession(requiredRow(rows, "Session was not created for an active account."));
    },
    async verifySession(request) {
      const row = await findSession(request.token, request.now);
      return row === undefined ? undefined : mapSession({ ...row, last_seen_at: request.now });
    },
    async revokeSession({ token, revokedAt }) {
      const rows = (await sql.query(
        `update auth_sessions set revoked_at = $1
         where token_hash = $2 and revoked_at is null returning session_id`,
        [revokedAt.toISOString(), await hashToken(token, secrets.tokenPepper)],
      )) as { session_id: string }[];
      return rows[0] !== undefined;
    },
    async revokeSessionsForSubjectStore({ subjectId, storeId, revokedAt }) {
      const rows = (await sql.query(
        `update auth_sessions set revoked_at = $1
         where subject_id = $2 and store_id = $3 and revoked_at is null returning session_id`,
        [revokedAt.toISOString(), subjectId, storeId],
      )) as { session_id: string }[];
      return rows.length;
    },
    async createRecoveryRequest(request) {
      const rows = (await sql.query(
        `insert into auth_recovery_tokens (
          recovery_id, idempotency_key, token_hash, subject_id, store_id, expires_at, created_at
        ) select $1, $2, $3, subject_id, store_id, $5, $6
          from auth_credentials where identifier = $4 and status <> 'revoked'
        on conflict (idempotency_key) do nothing returning recovery_id, subject_id, store_id`,
        [
          request.recoveryId,
          request.idempotencyKey,
          await hashToken(request.token, secrets.tokenPepper),
          normalizeIdentifier(request.identifier),
          request.expiresAt.toISOString(),
          request.createdAt.toISOString(),
        ],
      )) as { recovery_id: string; subject_id: string; store_id: string }[];
      const row = rows[0];
      if (row !== undefined) {
        await sql.query(
          `update auth_credentials set status = 'recovery_pending', updated_at = $1
           where subject_id = $2 and store_id = $3 and status = 'active'`,
          [request.createdAt.toISOString(), row.subject_id, row.store_id],
        );
      }
      return row !== undefined;
    },
    async consumeRecoveryToken({ token, password, consumedAt }) {
      const verifier = await createPasswordVerifier(password, secrets.passwordPepper);
      const rows = (await sql.query(
        `with consumed as (
           update auth_recovery_tokens set consumed_at = $1
           where token_hash = $2 and consumed_at is null and expires_at > $1
           returning subject_id, store_id
         ), revoked as (
           update auth_sessions s set revoked_at = $1 from consumed c
           where s.subject_id = c.subject_id and s.store_id = c.store_id and s.revoked_at is null
         )
         update auth_credentials a set password_hash = $3, password_salt = $4,
           password_algorithm = $5, status = 'active', password_updated_at = $1, updated_at = $1
         from consumed c where a.subject_id = c.subject_id and a.store_id = c.store_id
           and a.status not in ('blocked', 'revoked') returning ${ACCOUNT_COLUMNS}`,
        [
          consumedAt.toISOString(),
          await hashToken(token, secrets.tokenPepper),
          verifier.passwordHash,
          verifier.passwordSalt,
          verifier.passwordAlgorithm,
        ],
      )) as AuthAccountRow[];
      return rows[0] === undefined ? undefined : mapAccount(rows[0]);
    },
    async createPrivacyRequest(request) {
      validatePrivacyRequest(request);
      const existingRows = (await sql.query(
        `select ${PRIVACY_COLUMNS} from privacy_requests where idempotency_key = $1 limit 1`,
        [request.idempotencyKey],
      )) as PrivacyRequestRow[];
      if (existingRows[0] !== undefined) {
        return { request: mapPrivacyRequest(existingRows[0]), replayed: true };
      }
      const rows = (await sql.query(
        `insert into privacy_requests (
          request_id, idempotency_key, subject_id, store_id, request_type, contact_channel,
          contact_value, data_categories, request_body, status, received_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, 'received', $10)
        on conflict (idempotency_key) do nothing returning ${PRIVACY_COLUMNS}`,
        [
          request.requestId,
          request.idempotencyKey,
          request.subjectId,
          request.storeId,
          request.requestType,
          request.contactChannel,
          request.contactValue,
          JSON.stringify(request.dataCategories),
          request.requestBody,
          request.receivedAt.toISOString(),
        ],
      )) as PrivacyRequestRow[];
      if (rows[0] !== undefined) return { request: mapPrivacyRequest(rows[0]), replayed: false };
      const replayRows = (await sql.query(
        `select ${PRIVACY_COLUMNS} from privacy_requests where idempotency_key = $1 limit 1`,
        [request.idempotencyKey],
      )) as PrivacyRequestRow[];
      return { request: mapPrivacyRequest(requiredRow(replayRows, "Privacy request was not persisted.")), replayed: true };
    },
  };
}

const INVITE_COLUMNS = `
  invite_id, idempotency_key, token_hash, identifier, subject_id, display_name, store_id,
  store_name, role, status, expires_at, activated_at, revoked_at, created_by, created_at
`;
const ACCOUNT_COLUMNS = `
  subject_id, store_id, identifier, display_name, password_hash, password_salt,
  password_algorithm, status, password_updated_at, created_at, updated_at
`;
const SESSION_COLUMNS = `
  session_id, subject_id, store_id, expires_at, created_at, last_seen_at, rotated_from_session_id
`;
const PRIVACY_COLUMNS = `
  request_id, idempotency_key, subject_id, store_id, request_type, contact_channel,
  contact_value, data_categories, request_body, status, received_at
`;

interface AuthInviteRow {
  invite_id: string;
  idempotency_key: string;
  token_hash: string;
  identifier: string;
  subject_id: string;
  display_name: string;
  store_id: string;
  store_name: string;
  role: AuthorizationRole;
  status: AuthAccountStatus;
  expires_at: string | Date;
  activated_at: string | Date | null;
  revoked_at: string | Date | null;
  created_by: string;
  created_at: string | Date;
}

interface AuthAccountRow {
  subject_id: string;
  store_id: string;
  identifier: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  password_algorithm: string;
  status: AuthAccountStatus;
  password_updated_at: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
}

interface AuthSessionRow {
  session_id: string;
  subject_id: string;
  store_id: string;
  expires_at: string | Date;
  created_at: string | Date;
  last_seen_at: string | Date;
  rotated_from_session_id: string | null;
}

interface PrivacyRequestRow {
  request_id: string;
  idempotency_key: string;
  subject_id: string;
  store_id: string;
  request_type: string;
  contact_channel: "email" | "phone";
  contact_value: string;
  data_categories: readonly string[] | string;
  request_body: string;
  status: "received";
  received_at: string | Date;
}

function validateStoredInvite(
  invite: StoredAuthInviteRecord | undefined,
  now: Date,
): InviteValidationResult {
  if (invite === undefined) return { status: "invalid" };
  if (invite.status === "revoked") return { status: "revoked" };
  if (invite.status === "active") return { status: "activated" };
  if (invite.status !== "invited") return { status: "invalid" };
  if (invite.expiresAt <= now) return { status: "expired" };
  return { status: "valid", invite: publicInvite(invite) };
}

function publicInvite(invite: StoredAuthInviteRecord): AuthInviteRecord {
  const { idempotencyKey: _idempotencyKey, tokenHash: _tokenHash, ...record } = invite;
  void _idempotencyKey;
  void _tokenHash;
  return record;
}

function publicAccount(account: StoredAuthAccountRecord): AuthAccountRecord {
  const {
    passwordHash: _passwordHash,
    passwordSalt: _passwordSalt,
    passwordAlgorithm: _passwordAlgorithm,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...record
  } = account;
  void _passwordHash;
  void _passwordSalt;
  void _passwordAlgorithm;
  void _createdAt;
  void _updatedAt;
  return record;
}

function publicSession(session: StoredAuthSessionRecord): AuthSessionRecord {
  const { tokenHash: _tokenHash, revokedAt: _revokedAt, ...record } = session;
  void _tokenHash;
  void _revokedAt;
  return record;
}

function mapStoredInvite(row: AuthInviteRow): StoredAuthInviteRecord {
  return {
    ...mapInvite(row),
    idempotencyKey: row.idempotency_key,
    tokenHash: row.token_hash,
  };
}

function mapInvite(row: AuthInviteRow): AuthInviteRecord {
  return {
    inviteId: row.invite_id,
    identifier: row.identifier,
    subjectId: row.subject_id,
    displayName: row.display_name,
    storeId: row.store_id,
    storeName: row.store_name,
    role: row.role,
    status: row.status,
    expiresAt: toDate(row.expires_at),
    ...(row.activated_at === null ? {} : { activatedAt: toDate(row.activated_at) }),
    ...(row.revoked_at === null ? {} : { revokedAt: toDate(row.revoked_at) }),
    createdBy: row.created_by,
    createdAt: toDate(row.created_at),
  };
}

function mapStoredAccount(row: AuthAccountRow): StoredAuthAccountRecord {
  return {
    ...mapAccount(row),
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    passwordAlgorithm: row.password_algorithm,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

function mapAccount(row: AuthAccountRow): AuthAccountRecord {
  return {
    subjectId: row.subject_id,
    storeId: row.store_id,
    identifier: row.identifier,
    displayName: row.display_name,
    status: row.status,
    passwordUpdatedAt: toDate(row.password_updated_at),
  };
}

function mapSession(row: AuthSessionRow): AuthSessionRecord {
  return {
    sessionId: row.session_id,
    subjectId: row.subject_id,
    storeId: row.store_id,
    expiresAt: toDate(row.expires_at),
    createdAt: toDate(row.created_at),
    lastSeenAt: toDate(row.last_seen_at),
    ...(row.rotated_from_session_id === null ? {} : { rotatedFromSessionId: row.rotated_from_session_id }),
  };
}

function mapPrivacyRequest(row: PrivacyRequestRow): PrivacyRequestRecord {
  const categories =
    typeof row.data_categories === "string"
      ? (JSON.parse(row.data_categories) as unknown)
      : row.data_categories;
  if (!Array.isArray(categories) || !categories.every((value) => typeof value === "string")) {
    throw new Error("Privacy request categories are invalid.");
  }
  return {
    requestId: row.request_id,
    idempotencyKey: row.idempotency_key,
    subjectId: row.subject_id,
    storeId: row.store_id,
    requestType: row.request_type,
    contactChannel: row.contact_channel,
    contactValue: row.contact_value,
    dataCategories: categories,
    requestBody: row.request_body,
    status: row.status,
    receivedAt: toDate(row.received_at),
  };
}

async function createPasswordVerifier(password: string, pepper: string) {
  const passwordSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await derivePassword(password, passwordSalt, pepper);
  return { passwordHash, passwordSalt, passwordAlgorithm: PASSWORD_ALGORITHM };
}

async function verifyPasswordValue(
  password: string,
  account: Pick<StoredAuthAccountRecord, "passwordHash" | "passwordSalt" | "passwordAlgorithm">,
  pepper: string,
): Promise<boolean> {
  if (account.passwordAlgorithm !== PASSWORD_ALGORITHM) return false;
  const candidate = await derivePassword(password, account.passwordSalt, pepper);
  return constantTimeHexEqual(account.passwordHash, candidate);
}

async function derivePassword(password: string, salt: string, pepper: string): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(`${password}\u0000${pepper}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const value = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(salt).buffer as ArrayBuffer,
      iterations: PASSWORD_ITERATIONS,
    },
    material,
    PASSWORD_KEY_LENGTH * 8,
  );
  return bytesToHex(new Uint8Array(value));
}

async function hashToken(token: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(token));
  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    throw new Error("Authentication hash encoding is invalid.");
  }
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function constantTimeHexEqual(left: string, right: string): boolean {
  const leftBytes = hexToBytes(left);
  const rightBytes = hexToBytes(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function assertSecrets(secrets: AuthRepositorySecrets): void {
  if (secrets.tokenPepper.length < 16 || secrets.passwordPepper.length < 16) {
    throw new Error("Authentication peppers must be configured with at least 16 characters.");
  }
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLocaleLowerCase("pt-BR");
}

function accountKey(subjectId: string, storeId: string): string {
  return `${subjectId}\u0000${storeId}`;
}

function requiredMapValue<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error("Stored authentication record is unavailable.");
  return value;
}

function requiredRow<T>(rows: readonly T[], message: string): T {
  if (rows[0] === undefined) throw new Error(message);
  return rows[0];
}

function toDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Authentication timestamp is invalid.");
  return date;
}

function validatePrivacyRequest(input: Omit<PrivacyRequestRecord, "status">): void {
  if (input.requestBody.trim().length < 20 || input.requestBody.length > 2_000) {
    throw new Error("Privacy request body must contain between 20 and 2000 characters.");
  }
  if (input.contactValue.trim().length === 0 || input.contactValue.length > 160) {
    throw new Error("Privacy request contact is invalid.");
  }
  if (input.dataCategories.length < 1 || input.dataCategories.length > 8) {
    throw new Error("Privacy request categories are invalid.");
  }
  const serialized = JSON.stringify(input);
  if (/signed.?url|base64|device.?uri|authorization|bearer|password|secret/i.test(serialized)) {
    throw new Error("Privacy request contains a forbidden secret or evidence reference.");
  }
}
