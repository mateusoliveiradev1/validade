import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { neon } from "../packages/database/node_modules/@neondatabase/serverless/index.mjs";

const execFileAsync = promisify(execFile);
const args = parseArgs(process.argv.slice(2));
const createdAt = new Date();
const backupName =
  args.name ??
  `backup-staging-${createdAt.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "z")}`;

try {
  const created = await runNeon([
    "branches",
    "create",
    "--project-id",
    args.projectId,
    "--parent",
    args.parent,
    "--name",
    backupName,
    "--output",
    "json",
    "--no-color",
  ]);
  const branchId = findBranchId(JSON.parse(created));
  const connectionString = (
    await runNeon([
      "connection-string",
      branchId,
      "--project-id",
      args.projectId,
      "--role-name",
      args.roleName,
      "--database-name",
      args.databaseName,
      "--no-color",
    ])
  ).trim();
  if (!connectionString.startsWith("postgres")) {
    throw new Error("Neon returned no PostgreSQL connection string.");
  }

  const sql = neon(connectionString);
  const [verification] = await sql.query(`
    select
      to_regclass('public.central_products') is not null as central_products_present,
      to_regclass('public.central_categories') is not null as central_categories_present,
      to_regclass('public.audit_events') is not null as audit_events_present,
      to_regclass('public.store_memberships') is not null as store_memberships_present,
      (select count(*)::int from central_products) as central_products,
      (select count(*)::int from central_lots) as central_lots,
      (select count(*)::int from audit_events) as audit_events,
      (select count(*)::int from store_memberships) as store_memberships
  `);
  const requiredChecks = [
    verification?.central_products_present,
    verification?.central_categories_present,
    verification?.audit_events_present,
    verification?.store_memberships_present,
  ];
  if (requiredChecks.some((value) => value !== true)) {
    throw new Error("Backup branch verification failed.");
  }

  console.log(
    JSON.stringify(
      {
        backupBranchCreated: true,
        branchId,
        branchName: backupName,
        parent: args.parent,
        createdAt: createdAt.toISOString(),
        verified: true,
        counts: {
          centralProducts: verification.central_products,
          centralLots: verification.central_lots,
          auditEvents: verification.audit_events,
          storeMemberships: verification.store_memberships,
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        backupBranchCreated: false,
        verified: false,
        error: error instanceof Error ? redactDiagnostic(error.message) : "backup_failed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
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
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "number"
        ? error.code
        : "unknown";
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

function parseArgs(values) {
  const result = {
    parent: "staging",
    roleName: "neondb_owner",
    databaseName: "neondb",
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--project-id") result.projectId = values[++index];
    else if (value === "--parent") result.parent = values[++index];
    else if (value === "--name") result.name = values[++index];
    else if (value === "--role-name") result.roleName = values[++index];
    else if (value === "--database-name") result.databaseName = values[++index];
    else throw new Error(`Unsupported argument: ${value}`);
  }
  if (!result.projectId) {
    throw new Error(
      "Usage: node scripts/neon-staging-backup.mjs --project-id <id> [--parent staging] [--name backup-name]",
    );
  }
  for (const value of [
    result.projectId,
    result.parent,
    result.name,
    result.roleName,
    result.databaseName,
  ]) {
    if (value !== undefined && !/^[A-Za-z0-9._:-]+$/.test(value)) {
      throw new Error("Neon backup helper arguments may contain only safe identifier characters.");
    }
  }
  return result;
}

function findBranchId(value) {
  const candidates = [];
  collectBranchIds(value, candidates);
  if (candidates[0] === undefined) {
    throw new Error("Neon branch response did not contain a branch id.");
  }
  return candidates[0];
}

function collectBranchIds(value, candidates) {
  if (typeof value !== "object" || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "id" && typeof nested === "string" && nested.startsWith("br-")) {
      candidates.push(nested);
    } else {
      collectBranchIds(nested, candidates);
    }
  }
}

function redactDiagnostic(value) {
  return value
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted connection]")
    .replace(/(?:password|token|api[-_ ]?key)\s*[=:]\s*\S+/gi, "credential=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}
