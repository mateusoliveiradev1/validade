import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
// The monorepo keeps provider dependencies inside their owning package.
// Importing this local package entry avoids adding a privileged driver to root tooling.
import { neon } from "../packages/database/node_modules/@neondatabase/serverless/index.mjs";

const execFileAsync = promisify(execFile);
const args = parseArgs(process.argv.slice(2));
const branchName = args.name ?? `phase-08-verify-${Date.now()}`;
const migrations = args.migrations ?? [
  "0001_phase_08_identity_audit.sql",
  "0002_phase_08_evidence.sql",
  "0003_phase_08_shift_close.sql",
  "0004_phase_08_memberships.sql",
];
let branchId;

try {
  const created = await runNeon([
    "branches",
    "create",
    "--project-id",
    args.projectId,
    "--parent",
    args.parent,
    "--name",
    branchName,
    "--output",
    "json",
    "--no-color",
  ]);
  branchId = findBranchId(JSON.parse(created));
  const connectionString = await runNeon([
    "connection-string",
    branchId,
    "--project-id",
    args.projectId,
    "--role-name",
    args.roleName,
    "--database-name",
    args.databaseName,
    "--no-color",
  ]);

  if (!connectionString.startsWith("postgres"))
    throw new Error("Neon returned no PostgreSQL connection string.");
  const sql = neon(connectionString.trim());
  for (const migration of migrations) {
    const source = await readFile(path.join("packages", "database", "drizzle", migration), "utf8");
    for (const statement of splitStatements(source)) await sql.query(statement);
  }
  const verification = await sql.query(`
    select
      to_regclass('public.shift_closures') is not null as shift_closures_present,
      to_regclass('public.shift_handoffs') is not null as shift_handoffs_present,
      to_regclass('public.membership_mutations') is not null as membership_mutations_present,
      exists (select 1 from pg_trigger where tgname = 'shift_closures_append_only_guard') as closure_guard_present,
      exists (select 1 from pg_trigger where tgname = 'membership_mutations_append_only_guard') as membership_guard_present
  `);
  const row = verification[0] ?? {};
  if (Object.values(row).some((value) => value !== true))
    throw new Error("Disposable migration verification failed.");
  console.log(
    JSON.stringify({ branchCreated: true, migrationsApplied: migrations.length, verified: true }),
  );
} catch {
  console.error(
    JSON.stringify({
      branchCreated: branchId !== undefined,
      verified: false,
      error: "disposable_migration_or_verification_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  if (branchId !== undefined && !args.keep) {
    try {
      await runNeon(["branches", "delete", branchId, "--project-id", args.projectId, "--no-color"]);
    } catch {
      console.error(
        JSON.stringify({ branchDeleted: false, error: "disposable_branch_cleanup_failed" }),
      );
      process.exitCode = 1;
    }
  }
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
      `Neon CLI ${neonArgs.slice(0, 2).join(" ")} failed (exit ${exitCode}) without printing connection details.${stderr === "" ? "" : ` ${stderr}`}`,
      { cause: error },
    );
  }
}

function redactDiagnostic(value) {
  return value
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted connection]")
    .replace(/(?:password|token|api[-_ ]?key)\s*[=:]\s*\S+/gi, "credential=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function parseArgs(values) {
  const result = { roleName: "neondb_owner", databaseName: "neondb", keep: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--keep") {
      result.keep = true;
      continue;
    }
    if (value === "--project-id") result.projectId = values[++index];
    else if (value === "--parent") result.parent = values[++index];
    else if (value === "--name") result.name = values[++index];
    else if (value === "--role-name") result.roleName = values[++index];
    else if (value === "--database-name") result.databaseName = values[++index];
    else if (value === "--migration") (result.migrations ??= []).push(values[++index]);
    else throw new Error(`Unsupported argument: ${value}`);
  }
  if (!result.projectId || !result.parent) {
    throw new Error(
      "Usage: --project-id <id> --parent <branch-id-or-name> [--migration <file>] [--keep]",
    );
  }
  for (const value of [
    result.projectId,
    result.parent,
    result.name,
    result.roleName,
    result.databaseName,
    ...(result.migrations ?? []),
  ]) {
    if (value !== undefined && !/^[A-Za-z0-9._:-]+$/.test(value)) {
      throw new Error("Neon helper arguments may contain only safe identifier characters.");
    }
  }
  return result;
}

function findBranchId(value) {
  const candidates = [];
  collectBranchIds(value, candidates);
  if (candidates[0] === undefined)
    throw new Error("Neon branch response did not contain a branch id.");
  return candidates[0];
}

function collectBranchIds(value, candidates) {
  if (typeof value !== "object" || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "id" && typeof nested === "string" && nested.startsWith("br-"))
      candidates.push(nested);
    else collectBranchIds(nested, candidates);
  }
}

function splitStatements(source) {
  const statements = [];
  let current = "";
  let quote;
  let dollarTag;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const rest = source.slice(index);
    if (lineComment) {
      current += character;
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      current += character;
      if (rest.startsWith("*/")) {
        current += "/";
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (quote === undefined && dollarTag === undefined && rest.startsWith("--")) {
      current += "--";
      index += 1;
      lineComment = true;
      continue;
    }
    if (quote === undefined && dollarTag === undefined && rest.startsWith("/*")) {
      current += "/*";
      index += 1;
      blockComment = true;
      continue;
    }
    const dollar = rest.match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
    if (dollarTag !== undefined && rest.startsWith(dollarTag)) {
      current += dollarTag;
      index += dollarTag.length - 1;
      dollarTag = undefined;
      continue;
    }
    if (quote === undefined && dollarTag === undefined && dollar !== null) {
      dollarTag = dollar[0];
      current += dollarTag;
      index += dollarTag.length - 1;
      continue;
    }
    if (dollarTag === undefined && (character === "'" || character === '"')) {
      if (quote === character) quote = undefined;
      else if (quote === undefined) quote = character;
    }
    if (character === ";" && quote === undefined && dollarTag === undefined) {
      if (current.trim().length > 0) statements.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim().length > 0) statements.push(current);
  return statements;
}
