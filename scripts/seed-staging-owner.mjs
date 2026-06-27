import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "../packages/database/node_modules/@neondatabase/serverless/index.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_PROJECT_ID = "empty-scene-84209474";
const DEFAULT_BRANCH = "staging";
const DEFAULT_ROLE_NAME = "neondb_owner";
const DEFAULT_DATABASE_NAME = "neondb";
const DEFAULT_OWNER_DISPLAY_NAME = "Mateus Oliveira";
const DEFAULT_PILOT_STORE_ID = "loja-18";

const args = parseArgs(process.argv.slice(2));

try {
  const connectionString = await resolveConnectionString(args);
  const sql = neon(connectionString);
  const preview = await buildPreview(sql, args);

  if (args.dryRun) {
    console.log(JSON.stringify({ applied: false, dryRun: true, ...preview }, null, 2));
    process.exit(0);
  }

  const now = new Date().toISOString();
  const result = await applyOwnerSeed(sql, args, preview, now);
  console.log(JSON.stringify({ applied: true, dryRun: false, ...result }, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        applied: false,
        error: error instanceof Error ? redactDiagnostic(error.message) : "owner_seed_failed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}

function parseArgs(values) {
  const result = {
    projectId: DEFAULT_PROJECT_ID,
    branch: DEFAULT_BRANCH,
    roleName: DEFAULT_ROLE_NAME,
    databaseName: DEFAULT_DATABASE_NAME,
    ownerSubjectId: "",
    ownerDisplayName: DEFAULT_OWNER_DISPLAY_NAME,
    pilotStoreId: DEFAULT_PILOT_STORE_ID,
    dryRun: true,
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--") continue;
    else if (value === "--apply") result.dryRun = false;
    else if (value === "--dry-run") result.dryRun = true;
    else if (value === "--project-id") result.projectId = values[++index];
    else if (value === "--branch") result.branch = values[++index];
    else if (value === "--role-name") result.roleName = values[++index];
    else if (value === "--database-name") result.databaseName = values[++index];
    else if (value === "--owner-subject-id") result.ownerSubjectId = values[++index];
    else if (value === "--owner-display-name") result.ownerDisplayName = values[++index];
    else if (value === "--pilot-store-id") result.pilotStoreId = values[++index];
    else throw new Error(`Unsupported argument: ${value}`);
  }

  if (result.ownerSubjectId.trim().length === 0) {
    throw new Error("--owner-subject-id is required.");
  }
  for (const field of ["projectId", "branch", "roleName", "databaseName", "pilotStoreId"]) {
    const value = result[field];
    if (typeof value !== "string" || !/^[A-Za-z0-9._:-]+$/.test(value)) {
      throw new Error(`Invalid safe identifier argument: ${field}`);
    }
  }
  if (result.ownerDisplayName.trim().length < 1 || result.ownerDisplayName.length > 240) {
    throw new Error("--owner-display-name must contain 1 to 240 characters.");
  }

  return result;
}

async function buildPreview(db, input) {
  const ownerRows = await db.query(
    `select subject_id, display_name, store_id
       from auth_credentials
      where subject_id = $1 and status = 'active'
      order by store_id`,
    [input.ownerSubjectId],
  );
  if (ownerRows.length === 0) {
    throw new Error("Owner credential was not found as an active account.");
  }

  const stores = await db.query(
    `select store_id, store_name
       from stores
      where status = 'active'
      order by store_id`,
  );
  if (stores.length === 0) throw new Error("No active stores found.");

  const existingAdminRows = await db.query(
    `select store_id
       from store_memberships
      where subject_id = $1 and role = 'admin' and status = 'active'`,
    [input.ownerSubjectId],
  );
  const existingAdminStores = new Set(existingAdminRows.map((row) => row.store_id));
  const missingAdminStores = stores.filter((store) => !existingAdminStores.has(store.store_id));

  const leadRows = await db.query(
    `select membership_id
       from store_memberships
      where subject_id = $1 and store_id = $2 and role = 'lead' and status = 'active'
      limit 1`,
    [input.ownerSubjectId, input.pilotStoreId],
  );
  const inactiveStoreMembershipRows = await db.query(
    `select count(*)::int as count
       from store_memberships m
       left join stores s on s.store_id = m.store_id
      where m.status = 'active' and coalesce(s.status, 'inactive') <> 'active'`,
  );

  return {
    ownerSubjectId: input.ownerSubjectId,
    ownerDisplayName: input.ownerDisplayName,
    activeStoreCount: stores.length,
    missingAdminStoreCount: missingAdminStores.length,
    needsPilotLead: leadRows[0] === undefined,
    inactiveStoreMembershipsToArchive: Number(inactiveStoreMembershipRows[0]?.count ?? 0),
    stores,
  };
}

async function applyOwnerSeed(db, input, preview, now) {
  await db.query(
    `update auth_credentials
        set display_name = $1, updated_at = $2::timestamptz
      where subject_id = $3 and status = 'active'`,
    [input.ownerDisplayName, now, input.ownerSubjectId],
  );
  await db.query(
    `update store_memberships
        set actor_display_name = $1, updated_at = $2::timestamptz
      where subject_id = $3`,
    [input.ownerDisplayName, now, input.ownerSubjectId],
  );
  await db.query(
    `update auth_invites
        set display_name = $1
      where subject_id = $2`,
    [input.ownerDisplayName, input.ownerSubjectId],
  );

  const archivedRows = await db.query(
    `update store_memberships m
        set status = 'inactive', version = version + 1, updated_at = $1::timestamptz
       from stores s
      where m.store_id = s.store_id
        and s.status <> 'active'
        and m.status = 'active'
      returning m.membership_id`,
    [now],
  );

  let grantedAdmin = 0;
  let grantedLead = 0;
  for (const store of preview.stores) {
    grantedAdmin += await ensureMembership(db, {
      subjectId: input.ownerSubjectId,
      displayName: input.ownerDisplayName,
      role: "admin",
      store,
      now,
      reason: "Admin geral de staging para administracao multi-loja.",
    });
  }
  const pilotStore = preview.stores.find((store) => store.store_id === input.pilotStoreId);
  if (pilotStore === undefined) throw new Error("Pilot store is not active.");
  grantedLead += await ensureMembership(db, {
    subjectId: input.ownerSubjectId,
    displayName: input.ownerDisplayName,
    role: "lead",
    store: pilotStore,
    now,
    reason: "Lideranca operacional da Loja 18 em staging.",
  });

  return {
    ownerSubjectId: input.ownerSubjectId,
    ownerDisplayName: input.ownerDisplayName,
    activeStoreCount: preview.activeStoreCount,
    grantedAdmin,
    grantedLead,
    archivedInactiveStoreMemberships: archivedRows.length,
    fakeOperationalDataCreated: false,
  };
}

async function ensureMembership(db, input) {
  const existingRows = await db.query(
    `select membership_id
       from store_memberships
      where subject_id = $1 and store_id = $2 and role = $3 and status = 'active'
      limit 1`,
    [input.subjectId, input.store.store_id, input.role],
  );
  if (existingRows[0] !== undefined) return 0;

  const membershipId = stableId("membership", input.store.store_id, input.subjectId, input.role);
  await db.query(
    `insert into store_memberships (
       membership_id, subject_id, actor_display_name, role, store_id, store_name, status,
       version, created_at, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, 'active', 1, $7::timestamptz, $7::timestamptz)`,
    [
      membershipId,
      input.subjectId,
      input.displayName,
      input.role,
      input.store.store_id,
      input.store.store_name,
      input.now,
    ],
  );
  await appendMembershipReceipt(db, { ...input, membershipId });
  return 1;
}

async function appendMembershipReceipt(db, input) {
  const response = {
    membershipId: input.membershipId,
    subjectId: input.subjectId,
    displayName: input.displayName,
    role: input.role,
    storeId: input.store.store_id,
    storeName: input.store.store_name,
    status: "active",
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
  const idempotencyKey = `seed:owner:${input.store.store_id}:${input.subjectId}:${input.role}`;
  await db.query(
    `insert into membership_mutations (
       idempotency_key, membership_id, store_id, operation, response, occurred_at
     )
     values ($1, $2, $3, 'grant', $4::jsonb, $5::timestamptz)
     on conflict (idempotency_key) do nothing`,
    [idempotencyKey, input.membershipId, input.store.store_id, JSON.stringify(response), input.now],
  );
  await db.query(
    `insert into audit_events (
       event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
       actor_role_snapshot, occurred_at, received_at, target_type, target_id, target_label,
       summary, reason, status, metadata, sanitized
     )
     values (
       $1, $2, 'membership.changed', $3, $4, 'system:staging-owner-seed',
       'Seed staging admin geral', 'admin', $5::timestamptz, $5::timestamptz,
       'membership', $6, 'Vinculo operacional', 'Vinculo operacional concedido por seed.',
       $7, 'received', $8::jsonb, true
     )
     on conflict (idempotency_key) do nothing`,
    [
      `audit:seed:owner:${stableHash(idempotencyKey)}`,
      `audit:${idempotencyKey}`,
      input.store.store_id,
      input.store.store_name,
      input.now,
      input.membershipId,
      input.reason,
      JSON.stringify({ action: "staging.owner_seed", role: input.role }),
    ],
  );
}

async function resolveConnectionString(input) {
  const envConnection = process.env.NEON_DATABASE_URL?.trim();
  if (envConnection?.startsWith("postgres") === true) return envConnection;
  const stdout = await runNeon([
    "connection-string",
    input.branch,
    "--project-id",
    input.projectId,
    "--role-name",
    input.roleName,
    "--database-name",
    input.databaseName,
    "--no-color",
  ]);
  const connectionString = stdout.trim();
  if (!connectionString.startsWith("postgres")) {
    throw new Error("Neon returned no PostgreSQL connection string.");
  }
  return connectionString;
}

async function runNeon(neonArgs) {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx.cmd neonctl ${neonArgs.join(" ")}`]
      : ["neonctl", ...neonArgs];
  const { stdout } = await execFileAsync(command, commandArgs, {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

function stableId(prefix, ...parts) {
  return `${prefix}-${parts[0]}-${stableHash(parts.join(":"))}`.slice(0, 120);
}

function stableHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function redactDiagnostic(value) {
  return value.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redacted]");
}
