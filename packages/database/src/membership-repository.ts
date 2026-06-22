import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { StoreMembership } from "@validade-zero/domain";

export interface MembershipRepository {
  listActiveMemberships(subjectId: string): Promise<readonly StoreMembership[]>;
}

interface MembershipRow {
  subject_id: string;
  role: StoreMembership["role"];
  store_id: string;
  store_name: string;
  status: StoreMembership["status"];
}

export function createNeonMembershipRepository(input: {
  connectionString: string;
}): MembershipRepository {
  return createMembershipRepositoryFromQuery(neon(input.connectionString));
}

export function createMembershipRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
): MembershipRepository {
  return {
    async listActiveMemberships(subjectId) {
      const rows = await sql`
        select subject_id, role, store_id, store_name, status
        from store_memberships
        where subject_id = ${subjectId}
          and status = 'active'
        order by store_id, role
      `;

      return rows.map(toStoreMembership);
    },
  };
}

function toStoreMembership(row: unknown): StoreMembership {
  const membership = row as MembershipRow;

  return {
    subjectId: membership.subject_id,
    role: membership.role,
    storeId: membership.store_id,
    storeName: membership.store_name,
    status: membership.status,
  };
}
