import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const scanRoots = ["apps", "packages", "scripts", "docs"];
const rootFiles = [".env.example", "README.md"];
const ignoredSegments = new Set([
  ".git",
  ".planning",
  ".agents",
  ".codex",
  "node_modules",
  "dist",
  "coverage",
  ".turbo",
  ".expo",
  ".wrangler",
  "playwright-report",
  "test-results",
]);
const textExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const forbiddenPatterns = [
  {
    label: "AWS access key",
    pattern: /AKIA[0-9A-Z]{16}/,
  },
  {
    label: "private key",
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  },
  {
    label: "GitHub token",
    pattern: /ghp_[A-Za-z0-9_]{20,}/,
  },
  {
    label: "Slack token",
    pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/,
  },
  {
    label: "live Stripe secret",
    pattern: /sk_live_[A-Za-z0-9]{16,}/,
  },
];
const realDataHints = [
  /\bCPF\b/i,
  /\bCNPJ\b/i,
  /\bloja\s+(?!ficticia|exemplo)[A-Z][\p{L}0-9-]+/u,
  /\b(supermercado|rede)\s+(?!ficticia|exemplo)[A-Z][\p{L}]+/iu,
];
const fakeMarker = /(fictici|exemplo|example|placeholder|localhost|00000000)/i;

function walk(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    const relativeParts = path.relative(repoRoot, fullPath).split(path.sep);

    if (relativeParts.some((part) => ignoredSegments.has(part))) {
      return [];
    }

    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return walk(fullPath);
    }

    if (stats.isFile() && textExtensions.has(path.extname(fullPath))) {
      return [fullPath];
    }

    return [];
  });
}

const files = [
  ...scanRoots.flatMap((root) => walk(path.join(repoRoot, root))),
  ...rootFiles.map((file) => path.join(repoRoot, file)).filter((file) => existsSync(file)),
];
const violations = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const relative = path.relative(repoRoot, file);

  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) {
      violations.push(`${relative}: ${label}`);
    }
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (realDataHints.some((pattern) => pattern.test(line)) && !fakeMarker.test(line)) {
      violations.push(`${relative}:${index + 1}: possible real operational data`);
    }
  });
}

if (violations.length > 0) {
  console.error("Real-data safety check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Real-data safety check passed for ${files.length} files.`);
