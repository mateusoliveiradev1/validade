import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env.example");
const requiredKeys = [
  "NODE_ENV",
  "VALIDADE_ZERO_APP_ENV",
  "API_BASE_URL",
  "EXPO_PUBLIC_API_URL",
  "SAFE_PROBE_DEFAULT_VALUE",
  "NEON_DATABASE_URL",
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "EXPO_PROJECT_ID",
  "AUTH_SESSION_TTL_SECONDS",
  "AUTH_INVITE_TTL_SECONDS",
  "AUTH_RECOVERY_TTL_SECONDS",
  "AUTH_TOKEN_PEPPER",
  "AUTH_PASSWORD_PEPPER",
];
const intentionallyEmptyKeys = new Set(["AUTH_TOKEN_PEPPER", "AUTH_PASSWORD_PEPPER"]);
const numericKeys = new Set([
  "AUTH_SESSION_TTL_SECONDS",
  "AUTH_INVITE_TTL_SECONDS",
  "AUTH_RECOVERY_TTL_SECONDS",
]);
const safeMarker = /(example|fictici|placeholder|localhost|00000000)/i;
const secretLike = /(sk_live_|AKIA[0-9A-Z]{16}|-----BEGIN|xox[baprs]-|ghp_[A-Za-z0-9_]{20,})/;

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key, valueParts.join("=")];
      }),
  );
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const failures = [];

for (const key of requiredKeys) {
  const value = env[key];

  if (value === undefined || (value.trim().length === 0 && !intentionallyEmptyKeys.has(key))) {
    failures.push(`${key} is missing or empty`);
    continue;
  }

  if (secretLike.test(value)) {
    failures.push(`${key} looks like a real secret`);
  }

  if (intentionallyEmptyKeys.has(key)) {
    if (value.length > 0) failures.push(`${key} must stay empty in the public example`);
    continue;
  }

  if (numericKeys.has(key)) {
    if (!/^\d+$/.test(value) || Number(value) <= 0) {
      failures.push(`${key} must be a positive integer`);
    }
    continue;
  }

  if (!["NODE_ENV", "VALIDADE_ZERO_APP_ENV"].includes(key) && !safeMarker.test(value)) {
    failures.push(`${key} must be visibly fake/example/local`);
  }
}

for (const key of Object.keys(env)) {
  if (!requiredKeys.includes(key)) {
    failures.push(`${key} is not documented in the required env contract`);
  }
}

if (failures.length > 0) {
  console.error(".env.example safety check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`.env.example safety check passed for ${requiredKeys.length} keys.`);
