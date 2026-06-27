import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export interface DatabaseMaintenanceRetentionPolicy {
  authLoginAttemptHours: number;
  expiredAuthRecordDays: number;
}

export interface DatabaseMaintenanceResult {
  checkedAt: string;
  deleted: {
    authLoginAttempts: number;
    authSessions: number;
    authRecoveryTokens: number;
    authInvites: number;
  };
}

export interface DatabaseMaintenanceRepository {
  run(input: {
    now: Date;
    retention?: Partial<DatabaseMaintenanceRetentionPolicy>;
  }): Promise<DatabaseMaintenanceResult>;
}

const DEFAULT_RETENTION: DatabaseMaintenanceRetentionPolicy = {
  authLoginAttemptHours: 48,
  expiredAuthRecordDays: 30,
};

export function createNeonMaintenanceRepository(input: {
  connectionString: string;
}): DatabaseMaintenanceRepository {
  return createMaintenanceRepositoryFromQuery(neon(input.connectionString));
}

export function createMaintenanceRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
): DatabaseMaintenanceRepository {
  return {
    async run(input) {
      const retention = { ...DEFAULT_RETENTION, ...input.retention };
      const loginAttemptCutoff = new Date(
        input.now.getTime() - retention.authLoginAttemptHours * 60 * 60 * 1_000,
      );
      const authCutoff = new Date(
        input.now.getTime() - retention.expiredAuthRecordDays * 24 * 60 * 60 * 1_000,
      );

      return {
        checkedAt: input.now.toISOString(),
        deleted: {
          authLoginAttempts: await deleteCount(
            sql,
            `delete from auth_login_attempts where attempted_at < $1::timestamptz`,
            [loginAttemptCutoff.toISOString()],
          ),
          authSessions: await deleteCount(
            sql,
            `delete from auth_sessions
             where (expires_at < $1::timestamptz or revoked_at < $1::timestamptz)`,
            [authCutoff.toISOString()],
          ),
          authRecoveryTokens: await deleteCount(
            sql,
            `delete from auth_recovery_tokens
             where (expires_at < $1::timestamptz or consumed_at < $1::timestamptz)`,
            [authCutoff.toISOString()],
          ),
          authInvites: await deleteCount(
            sql,
            `delete from auth_invites
             where expires_at < $1::timestamptz and status <> 'active'`,
            [authCutoff.toISOString()],
          ),
        },
      };
    },
  };
}

async function deleteCount(
  sql: NeonQueryFunction<false, false>,
  deleteStatement: string,
  values: readonly unknown[],
): Promise<number> {
  const rows = (await sql.query(
    `with deleted as (${deleteStatement} returning 1)
     select count(*)::int as deleted_count from deleted`,
    [...values],
  )) as Array<{ deleted_count: number }>;

  return rows[0]?.deleted_count ?? 0;
}
