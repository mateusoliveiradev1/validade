import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const ignoredSegments = new Set([
  ".git",
  ".agents",
  ".codex",
  "node_modules",
  "dist",
  "coverage",
  ".turbo",
  ".expo",
]);
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const prohibitedPatterns = [
  { label: "device-local evidence URI", pattern: /\b(?:file|content|ph):\/\/[^\s'"`]+/i },
  {
    label: "embedded evidence binary",
    pattern: /data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]{32,}/i,
  },
  {
    label: "signed object query",
    pattern: /(?:X-Amz-(?:Algorithm|Credential|Signature)|[?&]Signature=)[A-Za-z0-9%._~\-/=+]+/i,
  },
  { label: "raw bearer token", pattern: /\bBearer\s+[A-Za-z0-9._~\-/+=]{24,}/i },
  {
    label: "private object key literal",
    pattern: /(?:r2|evidence|private)[_/-](?:prod|live)[_/-][A-Za-z0-9._/-]{12,}/i,
  },
];

function trackedFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output.split(/\r?\n/).filter(Boolean);
}

const violations = [];
let scanned = 0;

for (const relative of trackedFiles()) {
  const parts = relative.split(/[\\/]/);
  if (parts.some((part) => ignoredSegments.has(part))) continue;
  const absolute = path.join(repoRoot, relative);
  if (
    !existsSync(absolute) ||
    !statSync(absolute).isFile() ||
    !textExtensions.has(path.extname(relative))
  ) {
    continue;
  }
  const content = readFileSync(absolute, "utf8");
  scanned += 1;
  for (const [lineNumber, line] of content.split(/\r?\n/).entries()) {
    for (const { label, pattern } of prohibitedPatterns) {
      if (pattern.test(line) && !isNamedRejectionFixture(relative, line)) {
        violations.push(`${relative}:${lineNumber + 1}: ${label}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Sensitive evidence safety check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Sensitive evidence safety check passed for ${scanned} tracked text files.`);

function isNamedRejectionFixture(relative, line) {
  if (relative === "scripts/check-no-sensitive-evidence.mjs") return true;
  const namedFixtures = [
    "file:///private/foto-ficticia.jpg",
    "file:///device/private/evidence-001.jpg",
    "file:///device/private",
  ];
  return (
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relative) &&
    namedFixtures.some((fixture) => line.includes(fixture))
  );
}
