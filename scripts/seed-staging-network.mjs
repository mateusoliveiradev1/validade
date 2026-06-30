import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "../packages/database/node_modules/@neondatabase/serverless/index.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_PROJECT_ID = "empty-scene-84209474";
const DEFAULT_BRANCH = "staging";
const DEFAULT_ROLE_NAME = "neondb_owner";
const DEFAULT_DATABASE_NAME = "neondb";
const DEFAULT_SOURCE_STORE_ID = "loja-piloto";
const DEFAULT_STORE_COUNT = 23;
const DEFAULT_PILOT_STORE_NUMBER = 18;

const CATEGORY_CATALOG = [
  {
    id: "frutas-climatericas",
    name: "Frutas climatericas",
    mode: "flv_inspection",
    windows: {
      radarDays: 5,
      markdownDays: 2,
      criticalDays: 1,
      expiredDays: 0,
      qualityWindowDays: 3,
    },
    maxPhysicalConfirmationAgeHours: 24,
  },
  {
    id: "frutas-citricas-nao-climatericas",
    name: "Frutas citricas e nao climatericas",
    mode: "flv_inspection",
    windows: {
      radarDays: 7,
      markdownDays: 3,
      criticalDays: 1,
      expiredDays: 0,
      qualityWindowDays: 5,
    },
    maxPhysicalConfirmationAgeHours: 36,
  },
  {
    id: "frutas-delicadas",
    name: "Frutas delicadas e berries",
    mode: "flv_inspection",
    windows: {
      radarDays: 3,
      markdownDays: 1,
      criticalDays: 1,
      expiredDays: 0,
      qualityWindowDays: 2,
    },
    maxPhysicalConfirmationAgeHours: 12,
  },
  {
    id: "frutas-cortadas-prontas",
    name: "Frutas cortadas e prontas",
    mode: "processed_repack_loss",
    windows: { radarDays: 2, markdownDays: 1, criticalDays: 1, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 8,
  },
  {
    id: "folhosos-ervas",
    name: "Folhosos e ervas",
    mode: "flv_inspection",
    windows: {
      radarDays: 3,
      markdownDays: 1,
      criticalDays: 1,
      expiredDays: 0,
      qualityWindowDays: 2,
    },
    maxPhysicalConfirmationAgeHours: 12,
  },
  {
    id: "legumes-fruto",
    name: "Legumes de fruto",
    mode: "flv_inspection",
    windows: {
      radarDays: 5,
      markdownDays: 2,
      criticalDays: 1,
      expiredDays: 0,
      qualityWindowDays: 4,
    },
    maxPhysicalConfirmationAgeHours: 24,
  },
  {
    id: "raizes-tuberculos-bulbos",
    name: "Raizes, tuberculos e bulbos",
    mode: "flv_inspection",
    windows: {
      radarDays: 10,
      markdownDays: 4,
      criticalDays: 2,
      expiredDays: 0,
      qualityWindowDays: 7,
    },
    maxPhysicalConfirmationAgeHours: 48,
  },
  {
    id: "alho-inteiro-embalado-fornecedor",
    name: "Alho inteiro embalado pelo fornecedor",
    mode: "formal_validity",
    windows: { radarDays: 90, markdownDays: 30, criticalDays: 7, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 72,
  },
  {
    id: "alho-processado-embalado-fornecedor",
    name: "Alho processado embalado pelo fornecedor",
    mode: "formal_validity",
    windows: { radarDays: 30, markdownDays: 7, criticalDays: 2, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 24,
  },
  {
    id: "verduras-flor-caule",
    name: "Verduras de flor e caule",
    mode: "flv_inspection",
    windows: {
      radarDays: 4,
      markdownDays: 2,
      criticalDays: 1,
      expiredDays: 0,
      qualityWindowDays: 3,
    },
    maxPhysicalConfirmationAgeHours: 24,
  },
  {
    id: "cogumelos-frescos",
    name: "Cogumelos frescos",
    mode: "formal_validity",
    windows: { radarDays: 7, markdownDays: 2, criticalDays: 1, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 12,
  },
  {
    id: "ovos",
    name: "Ovos",
    mode: "formal_validity",
    windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 24,
  },
  {
    id: "minimamente-processados-refrigerados",
    name: "Minimamente processados refrigerados",
    mode: "formal_validity",
    windows: { radarDays: 10, markdownDays: 3, criticalDays: 1, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 8,
  },
  {
    id: "polpas-sucos-refrigerados",
    name: "Polpas, sucos e refrigerados FLV",
    mode: "formal_validity",
    windows: { radarDays: 30, markdownDays: 7, criticalDays: 2, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 24,
  },
  {
    id: "reembalados-fracionados-loja",
    name: "Reembalados e fracionados na loja",
    mode: "processed_repack_loss",
    windows: { radarDays: 3, markdownDays: 1, criticalDays: 1, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 8,
  },
  {
    id: "embalados-secos-flv",
    name: "Frutas secas, castanhas e embalados secos",
    mode: "formal_validity",
    windows: { radarDays: 90, markdownDays: 30, criticalDays: 7, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 72,
  },
  {
    id: "flores-plantas",
    name: "Flores e plantas",
    mode: "receiving_monitored",
    windows: { radarDays: 3, markdownDays: 1, criticalDays: 1, expiredDays: 0 },
    maxPhysicalConfirmationAgeHours: 24,
  },
];

const args = parseArgs(process.argv.slice(2));
const stores = buildStores(args.storeCount);
const pilotStore = stores.find((store) => store.storeId === args.pilotStoreId);

if (pilotStore === undefined) {
  throw new Error(`Pilot store ${args.pilotStoreId} is outside the configured store count.`);
}

let sql;

try {
  const connectionString = await resolveConnectionString(args);
  sql = neon(connectionString);
  const before = await readCounts(sql, args.sourceStoreId, args.pilotStoreId, stores);

  if (args.dryRun) {
    const membershipCopy = args.copyMemberships
      ? await previewMembershipCopy(sql, {
          sourceStoreId: args.sourceStoreId,
          pilotStoreId: pilotStore.storeId,
        })
      : { copied: 0, alreadyPresent: 0, sourceActiveMemberships: 0 };
    const authPromotion = args.promoteAuth
      ? await previewAuthPromotion(sql, {
          sourceStoreId: args.sourceStoreId,
          pilotStoreId: pilotStore.storeId,
          copyMemberships: args.copyMemberships,
        })
      : { promotedCredentials: 0, movedSessions: 0, skippedWithoutMembership: 0 };

    console.log(
      JSON.stringify(
        {
          applied: false,
          dryRun: true,
          branch: args.branch,
          storeCount: stores.length,
          pilotStore: {
            storeId: pilotStore.storeId,
            storeName: pilotStore.storeName,
          },
          globalCategoryCount: CATEGORY_CATALOG.length,
          sourceStoreId: args.sourceStoreId,
          membershipCopy,
          authPromotion,
          before,
          after: projectDryRunCounts(before, membershipCopy, authPromotion, stores.length),
          fakeOperationalDataCreated: false,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const now = new Date().toISOString();
  await upsertStores(sql, stores, now);
  await upsertCategories(sql, now);
  await archiveLegacyStoreCatalog(sql, stores, now);
  const membershipCopy = args.copyMemberships
    ? await copyMembershipsToPilot(sql, {
        sourceStoreId: args.sourceStoreId,
        pilotStore,
        now,
      })
    : { copied: 0, alreadyPresent: 0, sourceActiveMemberships: 0 };
  const authPromotion = args.promoteAuth
    ? await promoteAuthStore(sql, {
        sourceStoreId: args.sourceStoreId,
        pilotStoreId: pilotStore.storeId,
        now,
      })
    : { promotedCredentials: 0, movedSessions: 0, skippedWithoutMembership: 0 };

  await appendSeedAudit(sql, stores, now);
  const after = await readCounts(sql, args.sourceStoreId, args.pilotStoreId, stores);

  console.log(
    JSON.stringify(
      {
        applied: true,
        dryRun: false,
        branch: args.branch,
        storeCount: stores.length,
        pilotStore: {
          storeId: pilotStore.storeId,
          storeName: pilotStore.storeName,
        },
        globalCategoryCount: CATEGORY_CATALOG.length,
        sourceStoreId: args.sourceStoreId,
        membershipCopy,
        authPromotion,
        before,
        after,
        fakeOperationalDataCreated: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        applied: false,
        error: error instanceof Error ? redactDiagnostic(error.message) : "seed_failed",
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
    sourceStoreId: DEFAULT_SOURCE_STORE_ID,
    storeCount: DEFAULT_STORE_COUNT,
    pilotStoreId: storeIdFromNumber(DEFAULT_PILOT_STORE_NUMBER),
    dryRun: true,
    promoteAuth: false,
    copyMemberships: true,
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
    else if (value === "--source-store-id") result.sourceStoreId = values[++index];
    else if (value === "--pilot-store-id") result.pilotStoreId = values[++index];
    else if (value === "--pilot-store-number")
      result.pilotStoreId = storeIdFromNumber(Number.parseInt(values[++index] ?? "", 10));
    else if (value === "--store-count")
      result.storeCount = Number.parseInt(values[++index] ?? "", 10);
    else if (value === "--promote-auth") result.promoteAuth = true;
    else if (value === "--skip-membership-copy") result.copyMemberships = false;
    else throw new Error(`Unsupported argument: ${value}`);
  }

  for (const field of [
    "projectId",
    "branch",
    "roleName",
    "databaseName",
    "sourceStoreId",
    "pilotStoreId",
  ]) {
    const value = result[field];
    if (typeof value !== "string" || !/^[A-Za-z0-9._:-]+$/.test(value)) {
      throw new Error(`Invalid safe identifier argument: ${field}`);
    }
  }
  if (!Number.isInteger(result.storeCount) || result.storeCount < 1 || result.storeCount > 999) {
    throw new Error("--store-count must be an integer from 1 to 999.");
  }

  return result;
}

async function resolveConnectionString(input) {
  const envConnection = process.env.NEON_DATABASE_URL?.trim();
  if (envConnection?.startsWith("postgres") === true) {
    return envConnection;
  }

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
  try {
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
  } catch (error) {
    const exitCode =
      typeof error === "object" && error !== null && "code" in error ? error.code : "unknown";
    const stderr =
      typeof error === "object" &&
      error !== null &&
      "stderr" in error &&
      typeof error.stderr === "string"
        ? redactDiagnostic(error.stderr)
        : "";
    throw new Error(
      `Neon CLI ${neonArgs.slice(0, 2).join(" ")} failed (exit ${exitCode}).${
        stderr === "" ? "" : ` ${stderr}`
      }`,
      { cause: error },
    );
  }
}

function buildStores(count) {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const padded = String(number).padStart(2, "0");
    return {
      storeId: `loja-${padded}`,
      storeCode: `LOJA_${padded}`,
      storeName: `Loja ${padded} - Staging`,
    };
  });
}

function storeIdFromNumber(number) {
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    throw new Error("Pilot store number must be an integer from 1 to 999.");
  }
  return `loja-${String(number).padStart(2, "0")}`;
}

async function upsertStores(db, storeRows, now) {
  for (const store of storeRows) {
    await db.query(
      `insert into stores (store_id, store_code, store_name, status, created_at, updated_at)
       values ($1, $2, $3, 'active', $4::timestamptz, $4::timestamptz)
       on conflict (store_id) do update set
         store_code = excluded.store_code,
         store_name = excluded.store_name,
         status = 'active',
         updated_at = excluded.updated_at`,
      [store.storeId, store.storeCode, store.storeName, now],
    );
  }
}

async function upsertCategories(db, now) {
  const activeCategoryIds = CATEGORY_CATALOG.map((category) => category.id);

  for (const category of CATEGORY_CATALOG) {
    const profile = {
      categoryId: category.id,
      mode: category.mode,
      windows: category.windows,
      maxPhysicalConfirmationAgeHours: category.maxPhysicalConfirmationAgeHours,
    };
    await db.query(
      `insert into central_category_catalog (
         category_id, category_name, category_rule_profile, status, created_at, updated_at
       )
       values ($1, $2, $3::jsonb, 'active', $4::timestamptz, $4::timestamptz)
       on conflict (category_id) do update set
         category_name = excluded.category_name,
         category_rule_profile = excluded.category_rule_profile,
         status = 'active',
         updated_at = excluded.updated_at`,
      [category.id, category.name, JSON.stringify(profile), now],
    );
  }

  await db.query(
    `update central_category_catalog
        set status = 'archived', updated_at = $1::timestamptz
      where not (category_id = any($2::text[])) and status = 'active'`,
    [now, activeCategoryIds],
  );
}

async function archiveLegacyStoreCatalog(db, storeRows, now) {
  const activeStoreIds = storeRows.map((store) => store.storeId);
  await db.query(
    `update central_categories
        set status = 'archived', updated_at = $1::timestamptz
      where status = 'active'`,
    [now],
  );
  await db.query(
    `update stores
        set status = 'inactive', updated_at = $1::timestamptz
      where not (store_id = any($2::text[])) and status = 'active'`,
    [now, activeStoreIds],
  );
}

async function previewMembershipCopy(db, input) {
  const sourceRows = await db.query(
    `select subject_id, role
       from store_memberships
      where store_id = $1 and status = 'active'
      order by subject_id, role`,
    [input.sourceStoreId],
  );
  let copied = 0;
  let alreadyPresent = 0;

  for (const row of sourceRows) {
    const existing = await db.query(
      `select 1
         from store_memberships
        where subject_id = $1 and store_id = $2 and role = $3 and status = 'active'
        limit 1`,
      [row.subject_id, input.pilotStoreId, row.role],
    );
    if (existing[0] === undefined) copied += 1;
    else alreadyPresent += 1;
  }

  return { copied, alreadyPresent, sourceActiveMemberships: sourceRows.length };
}

async function previewAuthPromotion(db, input) {
  const credentialRows = await db.query(
    `select c.subject_id
       from auth_credentials c
      where c.store_id = $1 and c.status = 'active'
      order by c.subject_id`,
    [input.sourceStoreId],
  );
  let promotedCredentials = 0;
  let movedSessions = 0;
  let skippedWithoutMembership = 0;

  for (const row of credentialRows) {
    const membershipRows = await db.query(
      `select 1
         from store_memberships
        where subject_id = $1
          and status = 'active'
          and (store_id = $2 or ($3::boolean and store_id = $4))
        limit 1`,
      [row.subject_id, input.pilotStoreId, input.copyMemberships, input.sourceStoreId],
    );
    if (membershipRows[0] === undefined) {
      skippedWithoutMembership += 1;
      continue;
    }
    const duplicateRows = await db.query(
      `select 1 from auth_credentials where subject_id = $1 and store_id = $2 limit 1`,
      [row.subject_id, input.pilotStoreId],
    );
    if (duplicateRows[0] === undefined) promotedCredentials += 1;
    const sessionRows = await db.query(
      `select session_id
         from auth_sessions
        where subject_id = $1 and store_id = $2 and revoked_at is null`,
      [row.subject_id, input.sourceStoreId],
    );
    movedSessions += sessionRows.length;
  }

  return { promotedCredentials, movedSessions, skippedWithoutMembership };
}

async function copyMembershipsToPilot(db, input) {
  const sourceRows = await db.query(
    `select subject_id, actor_display_name, role
       from store_memberships
      where store_id = $1 and status = 'active'
      order by subject_id, role`,
    [input.sourceStoreId],
  );
  let copied = 0;
  let alreadyPresent = 0;

  for (const row of sourceRows) {
    const existing = await db.query(
      `select membership_id
         from store_memberships
        where subject_id = $1 and store_id = $2 and role = $3 and status = 'active'
        limit 1`,
      [row.subject_id, input.pilotStore.storeId, row.role],
    );
    if (existing[0] !== undefined) {
      alreadyPresent += 1;
      continue;
    }

    const membershipId = stableId("membership", input.pilotStore.storeId, row.subject_id, row.role);
    await db.query(
      `insert into store_memberships (
         membership_id, subject_id, actor_display_name, role, store_id, store_name, status,
         version, created_at, updated_at
       )
       values ($1, $2, $3, $4, $5, $6, 'active', 1, $7::timestamptz, $7::timestamptz)`,
      [
        membershipId,
        row.subject_id,
        row.actor_display_name,
        row.role,
        input.pilotStore.storeId,
        input.pilotStore.storeName,
        input.now,
      ],
    );
    await appendMembershipReceipt(db, {
      membershipId,
      row,
      pilotStore: input.pilotStore,
      sourceStoreId: input.sourceStoreId,
      now: input.now,
    });
    copied += 1;
  }

  return { copied, alreadyPresent, sourceActiveMemberships: sourceRows.length };
}

async function appendMembershipReceipt(db, input) {
  const response = {
    membershipId: input.membershipId,
    subjectId: input.row.subject_id,
    displayName: input.row.actor_display_name,
    role: input.row.role,
    storeId: input.pilotStore.storeId,
    storeName: input.pilotStore.storeName,
    status: "active",
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
  await db.query(
    `insert into membership_mutations (
       idempotency_key, membership_id, store_id, operation, response, occurred_at
     )
     values ($1, $2, $3, 'grant', $4::jsonb, $5::timestamptz)
     on conflict (idempotency_key) do nothing`,
    [
      `seed:loja18:membership:${input.sourceStoreId}:${input.membershipId}`,
      input.membershipId,
      input.pilotStore.storeId,
      JSON.stringify(response),
      input.now,
    ],
  );
  await db.query(
    `insert into audit_events (
       event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
       actor_role_snapshot, occurred_at, received_at, target_type, target_id, target_label,
       summary, reason, status, metadata, sanitized
     )
     values (
       $1, $2, 'membership.changed', $3, $4, 'system:staging-seed', 'Seed staging Loja 18',
       'admin', $5::timestamptz, $5::timestamptz, 'membership', $6, 'Vinculo operacional',
       'Vinculo operacional replicado para UAT da Loja 18.', $7, 'received', $8::jsonb, true
     )
     on conflict (idempotency_key) do nothing`,
    [
      `audit:seed:loja18:membership:${stableHash(input.membershipId)}`,
      `audit:seed:loja18:membership:${input.sourceStoreId}:${input.membershipId}`,
      input.pilotStore.storeId,
      input.pilotStore.storeName,
      input.now,
      input.membershipId,
      `Origem staging: ${input.sourceStoreId}`,
      JSON.stringify({
        action: "staging.membership_seed",
        sourceStoreId: input.sourceStoreId,
      }),
    ],
  );
}

async function promoteAuthStore(db, input) {
  const credentialRows = await db.query(
    `select c.subject_id
       from auth_credentials c
      where c.store_id = $1 and c.status = 'active'
      order by c.subject_id`,
    [input.sourceStoreId],
  );
  let promotedCredentials = 0;
  let movedSessions = 0;
  let skippedWithoutMembership = 0;

  for (const row of credentialRows) {
    const membershipRows = await db.query(
      `select 1
         from store_memberships
        where subject_id = $1 and store_id = $2 and status = 'active'
        limit 1`,
      [row.subject_id, input.pilotStoreId],
    );
    if (membershipRows[0] === undefined) {
      skippedWithoutMembership += 1;
      continue;
    }
    const duplicateRows = await db.query(
      `select 1 from auth_credentials where subject_id = $1 and store_id = $2 limit 1`,
      [row.subject_id, input.pilotStoreId],
    );
    if (duplicateRows[0] === undefined) {
      const updated = await db.query(
        `update auth_credentials
            set store_id = $1, updated_at = $2::timestamptz
          where subject_id = $3 and store_id = $4
          returning subject_id`,
        [input.pilotStoreId, input.now, row.subject_id, input.sourceStoreId],
      );
      if (updated[0] !== undefined) promotedCredentials += 1;
    }
    const sessions = await db.query(
      `update auth_sessions
          set store_id = $1
        where subject_id = $2 and store_id = $3 and revoked_at is null
        returning session_id`,
      [input.pilotStoreId, row.subject_id, input.sourceStoreId],
    );
    movedSessions += sessions.length;
  }

  return { promotedCredentials, movedSessions, skippedWithoutMembership };
}

async function appendSeedAudit(db, storeRows, now) {
  for (const store of storeRows) {
    await db.query(
      `insert into audit_events (
         event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
         actor_role_snapshot, occurred_at, received_at, target_type, target_id, target_label,
         summary, status, metadata, sanitized
       )
       values (
         $1, $2, 'sync.changed', $3, $4, 'system:staging-seed', 'Seed staging lojas',
         'admin', $5::timestamptz, $5::timestamptz, 'store_catalog', $3, $4,
         'Catalogo de loja e categorias atualizado para UAT staging.', 'received', $6::jsonb, true
       )
       on conflict (idempotency_key) do nothing`,
      [
        `audit:seed:network:${store.storeId}`,
        `audit:seed:network:${store.storeId}:v1`,
        store.storeId,
        store.storeName,
        now,
        JSON.stringify({
          action: "staging.network_seed",
          categoryCount: CATEGORY_CATALOG.length,
        }),
      ],
    );
  }
}

async function readCounts(db, sourceStoreId, pilotStoreId, storeRows) {
  const networkStoreIds = storeRows.map((store) => store.storeId);
  const [row] = await db.query(
    `select
       (select count(*)::int from stores) as stores,
       (select count(*)::int from stores where status = 'active') as active_stores,
       (select count(*)::int from stores where store_id = any($3::text[])) as network_stores,
       (select count(*)::int from central_category_catalog where status = 'active') as global_categories,
       (select count(*)::int from central_categories where status = 'active') as active_legacy_store_categories,
       (select count(*)::int from central_products where store_id = $2) as pilot_products,
       (select count(*)::int from central_lots where store_id = $2) as pilot_lots,
       (select count(*)::int from store_memberships where store_id = $1 and status = 'active') as source_memberships,
       (select count(*)::int from store_memberships where store_id = $2 and status = 'active') as pilot_memberships,
       (select count(*)::int from auth_credentials where store_id = $1 and status = 'active') as source_credentials,
       (select count(*)::int from auth_credentials where store_id = $2 and status = 'active') as pilot_credentials`,
    [sourceStoreId, pilotStoreId, networkStoreIds],
  );
  return row;
}

function projectDryRunCounts(before, membershipCopy, authPromotion, storeCount) {
  const missingNetworkStores = Math.max(0, storeCount - Number(before.network_stores ?? 0));
  return {
    ...before,
    stores: Number(before.stores ?? 0) + missingNetworkStores,
    active_stores: storeCount,
    network_stores: storeCount,
    global_categories: CATEGORY_CATALOG.length,
    active_legacy_store_categories: 0,
    pilot_memberships: Number(before.pilot_memberships ?? 0) + membershipCopy.copied,
    source_credentials: Number(before.source_credentials ?? 0) - authPromotion.promotedCredentials,
    pilot_credentials: Number(before.pilot_credentials ?? 0) + authPromotion.promotedCredentials,
  };
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
