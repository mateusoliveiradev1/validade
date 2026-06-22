import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { AuthorizationRole, MembershipStatus, StoreMembership } from "@validade-zero/domain";

export interface ManagedMembershipRecord extends StoreMembership {
  membershipId: string;
  displayName: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipMutationReceipt {
  membership: ManagedMembershipRecord;
  replayed: boolean;
}

export interface MembershipRepository {
  listActiveMemberships(subjectId: string): Promise<readonly StoreMembership[]>;
}

export interface MembershipManagementRepository extends MembershipRepository {
  listStoreMemberships(storeId: string): Promise<readonly ManagedMembershipRecord[]>;
  createMembership(input: {
    membershipId: string;
    subjectId: string;
    displayName: string;
    role: AuthorizationRole;
    storeId: string;
    storeName: string;
    idempotencyKey: string;
    occurredAt: Date;
  }): Promise<MembershipMutationReceipt>;
  changeRole(input: {
    membershipId: string;
    storeId: string;
    role: AuthorizationRole;
    expectedVersion: number;
    idempotencyKey: string;
    occurredAt: Date;
  }): Promise<MembershipMutationReceipt>;
  revokeMembership(input: {
    membershipId: string;
    storeId: string;
    expectedVersion: number;
    idempotencyKey: string;
    occurredAt: Date;
  }): Promise<MembershipMutationReceipt>;
}

export interface InMemoryMembershipManagementRepository extends MembershipManagementRepository {
  readMemberships(): readonly ManagedMembershipRecord[];
}

interface MembershipRow {
  membership_id: string;
  subject_id: string;
  actor_display_name: string;
  role: AuthorizationRole;
  store_id: string;
  store_name: string;
  status: MembershipStatus;
  version: number;
  created_at: string | Date;
  updated_at: string | Date;
}

interface ActiveMembershipRow {
  subject_id: string;
  role: AuthorizationRole;
  store_id: string;
  store_name: string;
  status: MembershipStatus;
}

interface MembershipMutationRow {
  response: unknown;
}

const MEMBERSHIP_COLUMNS = `
  membership_id, subject_id, actor_display_name, role, store_id, store_name, status, version,
  created_at, updated_at
`;

export function createNeonMembershipRepository(input: {
  connectionString: string;
}): MembershipManagementRepository {
  return createMembershipRepositoryFromQuery(neon(input.connectionString));
}

export function createInMemoryMembershipManagementRepository(
  records: readonly ManagedMembershipRecord[] = [],
): InMemoryMembershipManagementRepository {
  const memberships = new Map(records.map((record) => [record.membershipId, record]));
  const mutations = new Map<string, ManagedMembershipRecord>();

  function replay(idempotencyKey: string): MembershipMutationReceipt | undefined {
    const membership = mutations.get(idempotencyKey);
    return membership === undefined ? undefined : { membership, replayed: true };
  }

  function persistMutation(input: {
    idempotencyKey: string;
    membership: ManagedMembershipRecord;
  }): MembershipMutationReceipt {
    memberships.set(input.membership.membershipId, input.membership);
    mutations.set(input.idempotencyKey, input.membership);
    return { membership: input.membership, replayed: false };
  }

  return {
    listActiveMemberships(subjectId) {
      return Promise.resolve(
        [...memberships.values()]
          .filter(
            (membership) => membership.subjectId === subjectId && membership.status === "active",
          )
          .map(toStoreMembership),
      );
    },
    listStoreMemberships(storeId) {
      return Promise.resolve(
        [...memberships.values()]
          .filter((membership) => membership.storeId === storeId)
          .sort((left, right) => left.displayName.localeCompare(right.displayName)),
      );
    },
    createMembership(input) {
      const existingReplay = replay(input.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);

      const duplicate = [...memberships.values()].find(
        (membership) =>
          membership.subjectId === input.subjectId &&
          membership.storeId === input.storeId &&
          membership.role === input.role &&
          membership.status === "active",
      );
      if (duplicate !== undefined) {
        return Promise.reject(
          new Error("An active membership already grants this role in the store."),
        );
      }

      const record: ManagedMembershipRecord = {
        membershipId: input.membershipId,
        subjectId: input.subjectId,
        displayName: input.displayName,
        role: input.role,
        storeId: input.storeId,
        storeName: input.storeName,
        status: "active",
        version: 1,
        createdAt: input.occurredAt,
        updatedAt: input.occurredAt,
      };
      return Promise.resolve(
        persistMutation({ idempotencyKey: input.idempotencyKey, membership: record }),
      );
    },
    changeRole(input) {
      const existingReplay = replay(input.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const current = memberships.get(input.membershipId);
      if (
        current === undefined ||
        current.storeId !== input.storeId ||
        current.status !== "active"
      ) {
        return Promise.reject(
          new Error("Membership is unavailable in the authorized store scope."),
        );
      }
      if (current.version !== input.expectedVersion) {
        return Promise.reject(
          new Error("Membership changed before this request. Refresh and try again."),
        );
      }
      const duplicate = [...memberships.values()].find(
        (membership) =>
          membership.membershipId !== current.membershipId &&
          membership.subjectId === current.subjectId &&
          membership.storeId === current.storeId &&
          membership.role === input.role &&
          membership.status === "active",
      );
      if (duplicate !== undefined) {
        return Promise.reject(
          new Error("An active membership already grants this role in the store."),
        );
      }
      return Promise.resolve(
        persistMutation({
          idempotencyKey: input.idempotencyKey,
          membership: {
            ...current,
            role: input.role,
            version: current.version + 1,
            updatedAt: input.occurredAt,
          },
        }),
      );
    },
    revokeMembership(input) {
      const existingReplay = replay(input.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const current = memberships.get(input.membershipId);
      if (
        current === undefined ||
        current.storeId !== input.storeId ||
        current.status !== "active"
      ) {
        return Promise.reject(
          new Error("Membership is unavailable in the authorized store scope."),
        );
      }
      if (current.version !== input.expectedVersion) {
        return Promise.reject(
          new Error("Membership changed before this request. Refresh and try again."),
        );
      }
      return Promise.resolve(
        persistMutation({
          idempotencyKey: input.idempotencyKey,
          membership: {
            ...current,
            status: "inactive",
            version: current.version + 1,
            updatedAt: input.occurredAt,
          },
        }),
      );
    },
    readMemberships() {
      return [...memberships.values()];
    },
  };
}

export function createMembershipRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
): MembershipManagementRepository {
  async function readReplay(
    idempotencyKey: string,
  ): Promise<MembershipMutationReceipt | undefined> {
    const rows = (await sql.query(
      "select response from membership_mutations where idempotency_key = $1 limit 1",
      [idempotencyKey],
    )) as MembershipMutationRow[];
    if (rows[0] === undefined) return undefined;
    return { membership: mapManagedMembership(rows[0].response), replayed: true };
  }

  async function saveReceipt(input: {
    idempotencyKey: string;
    membership: ManagedMembershipRecord;
    operation: "grant" | "change_role" | "revoke";
    occurredAt: Date;
  }): Promise<void> {
    await sql.query(
      `insert into membership_mutations (idempotency_key, membership_id, store_id, operation, response, occurred_at)
       values ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)
       on conflict (idempotency_key) do nothing`,
      [
        input.idempotencyKey,
        input.membership.membershipId,
        input.membership.storeId,
        input.operation,
        JSON.stringify(serializeMembership(input.membership)),
        input.occurredAt.toISOString(),
      ],
    );
  }

  async function getStoreMembership(membershipId: string, storeId: string) {
    const rows = (await sql.query(
      `select ${MEMBERSHIP_COLUMNS} from store_memberships
       where membership_id = $1 and store_id = $2 limit 1`,
      [membershipId, storeId],
    )) as MembershipRow[];
    return rows[0] === undefined ? undefined : mapMembershipRow(rows[0]);
  }

  return {
    async listActiveMemberships(subjectId) {
      const rows = await sql`
        select subject_id, role, store_id, store_name, status
        from store_memberships
        where subject_id = ${subjectId}
          and status = 'active'
        order by store_id, role
      `;
      return (rows as ActiveMembershipRow[]).map(mapActiveMembershipRow);
    },
    async listStoreMemberships(storeId) {
      const rows = (await sql.query(
        `select ${MEMBERSHIP_COLUMNS} from store_memberships
         where store_id = $1 order by actor_display_name, role`,
        [storeId],
      )) as MembershipRow[];
      return rows.map(mapMembershipRow);
    },
    async createMembership(input) {
      const replay = await readReplay(input.idempotencyKey);
      if (replay !== undefined) return replay;

      const duplicateRows = (await sql.query(
        `select membership_id from store_memberships
         where subject_id = $1 and store_id = $2 and role = $3 and status = 'active' limit 1`,
        [input.subjectId, input.storeId, input.role],
      )) as unknown as readonly { membership_id: string }[];
      if (duplicateRows[0] !== undefined) {
        throw new Error("An active membership already grants this role in the store.");
      }

      const rows = (await sql.query(
        `insert into store_memberships (
          membership_id, subject_id, actor_display_name, role, store_id, store_name, status, version,
          created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, 'active', 1, $7::timestamptz, $7::timestamptz)
        returning ${MEMBERSHIP_COLUMNS}`,
        [
          input.membershipId,
          input.subjectId,
          input.displayName,
          input.role,
          input.storeId,
          input.storeName,
          input.occurredAt.toISOString(),
        ],
      )) as MembershipRow[];
      const membership = mapMembershipRow(requiredRow(rows, "Membership grant was not persisted."));
      await saveReceipt({ ...input, membership, operation: "grant" });
      return { membership, replayed: false };
    },
    async changeRole(input) {
      const replay = await readReplay(input.idempotencyKey);
      if (replay !== undefined) return replay;
      const current = await getStoreMembership(input.membershipId, input.storeId);
      assertActiveVersion(current, input.expectedVersion);

      const rows = (await sql.query(
        `update store_memberships
         set role = $1, version = version + 1, updated_at = $2::timestamptz
         where membership_id = $3 and store_id = $4 and status = 'active' and version = $5
         returning ${MEMBERSHIP_COLUMNS}`,
        [
          input.role,
          input.occurredAt.toISOString(),
          input.membershipId,
          input.storeId,
          input.expectedVersion,
        ],
      )) as MembershipRow[];
      const membership = mapMembershipRow(
        requiredRow(rows, "Membership changed before this request. Refresh and try again."),
      );
      await saveReceipt({ ...input, membership, operation: "change_role" });
      return { membership, replayed: false };
    },
    async revokeMembership(input) {
      const replay = await readReplay(input.idempotencyKey);
      if (replay !== undefined) return replay;
      const current = await getStoreMembership(input.membershipId, input.storeId);
      assertActiveVersion(current, input.expectedVersion);

      const rows = (await sql.query(
        `update store_memberships
         set status = 'inactive', version = version + 1, updated_at = $1::timestamptz
         where membership_id = $2 and store_id = $3 and status = 'active' and version = $4
         returning ${MEMBERSHIP_COLUMNS}`,
        [input.occurredAt.toISOString(), input.membershipId, input.storeId, input.expectedVersion],
      )) as MembershipRow[];
      const membership = mapMembershipRow(
        requiredRow(rows, "Membership changed before this request. Refresh and try again."),
      );
      await saveReceipt({ ...input, membership, operation: "revoke" });
      return { membership, replayed: false };
    },
  };
}

function assertActiveVersion(
  membership: ManagedMembershipRecord | undefined,
  expectedVersion: number,
): asserts membership is ManagedMembershipRecord {
  if (membership === undefined || membership.status !== "active") {
    throw new Error("Membership is unavailable in the authorized store scope.");
  }
  if (membership.version !== expectedVersion) {
    throw new Error("Membership changed before this request. Refresh and try again.");
  }
}

function requiredRow<T>(rows: readonly T[], message: string): T {
  if (rows[0] === undefined) throw new Error(message);
  return rows[0];
}

function mapMembershipRow(row: MembershipRow): ManagedMembershipRecord {
  return {
    membershipId: row.membership_id,
    subjectId: row.subject_id,
    displayName: row.actor_display_name,
    role: row.role,
    storeId: row.store_id,
    storeName: row.store_name,
    status: row.status,
    version: row.version,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

function mapManagedMembership(value: unknown): ManagedMembershipRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Membership mutation receipt is invalid.");
  }
  const row = value as Record<string, unknown>;
  return {
    membershipId: requiredString(row.membershipId),
    subjectId: requiredString(row.subjectId),
    displayName: requiredString(row.displayName),
    role: requiredRole(row.role),
    storeId: requiredString(row.storeId),
    storeName: requiredString(row.storeName),
    status: requiredStatus(row.status),
    version: requiredVersion(row.version),
    createdAt: toDate(requiredString(row.createdAt)),
    updatedAt: toDate(requiredString(row.updatedAt)),
  };
}

function serializeMembership(record: ManagedMembershipRecord): Record<string, unknown> {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toStoreMembership(record: ManagedMembershipRecord): StoreMembership {
  return {
    subjectId: record.subjectId,
    role: record.role,
    storeId: record.storeId,
    storeName: record.storeName,
    status: record.status,
  };
}

function mapActiveMembershipRow(row: ActiveMembershipRow): StoreMembership {
  return {
    subjectId: row.subject_id,
    role: row.role,
    storeId: row.store_id,
    storeName: row.store_name,
    status: row.status,
  };
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Membership mutation receipt is invalid.");
  }
  return value;
}

function requiredRole(value: unknown): AuthorizationRole {
  if (value === "collaborator" || value === "lead" || value === "admin") return value;
  throw new Error("Membership mutation receipt is invalid.");
}

function requiredStatus(value: unknown): MembershipStatus {
  if (value === "active" || value === "inactive") return value;
  throw new Error("Membership mutation receipt is invalid.");
}

function requiredVersion(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  throw new Error("Membership mutation receipt is invalid.");
}

function toDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Membership timestamp is invalid.");
  return date;
}
