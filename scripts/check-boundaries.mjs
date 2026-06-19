import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourceRoots = ["apps", "packages"];
const ignoredSegments = new Set(["node_modules", "dist", "coverage", ".turbo", ".expo"]);
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?["']([^"']+)["']|import\(["']([^"']+)["']\)/g;

const providerOrUiImports = [
  "react",
  "react-dom",
  "react-native",
  "expo",
  "expo-notifications",
  "hono",
  "wrangler",
  "drizzle-orm",
  "@neondatabase/",
  "@cloudflare/",
  "pg",
];

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

    if (stats.isFile() && sourceExtensions.has(path.extname(fullPath))) {
      return [fullPath];
    }

    return [];
  });
}

function normalizeRelativeImport(sourceFile, specifier) {
  if (!specifier.startsWith(".")) {
    return specifier;
  }

  return path.normalize(path.join(path.dirname(sourceFile), specifier));
}

function isInside(candidate, directory) {
  const relative = path.relative(directory, candidate);

  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function collectImports(filePath) {
  const source = readFileSync(filePath, "utf8");
  const imports = [];
  let match = importPattern.exec(source);

  while (match !== null) {
    const specifier = match[1] ?? match[2];

    if (specifier !== undefined) {
      imports.push(specifier);
    }

    match = importPattern.exec(source);
  }

  return imports;
}

function report(violations, filePath, specifier, message) {
  violations.push(`${path.relative(repoRoot, filePath)} imports "${specifier}" - ${message}`);
}

const files = sourceRoots.flatMap((root) => walk(path.join(repoRoot, root)));
const violations = [];

for (const filePath of files) {
  const imports = collectImports(filePath);
  const inApps = isInside(filePath, path.join(repoRoot, "apps"));
  const inDomain = isInside(filePath, path.join(repoRoot, "packages", "domain"));
  const inContracts = isInside(filePath, path.join(repoRoot, "packages", "contracts"));
  const inConfig = isInside(filePath, path.join(repoRoot, "packages", "config"));
  const inAdapters = isInside(filePath, path.join(repoRoot, "packages", "adapters"));

  for (const specifier of imports) {
    const normalized = normalizeRelativeImport(filePath, specifier);

    if (inApps && specifier.includes("../packages/")) {
      report(violations, filePath, specifier, "apps must import workspace packages by name");
    }

    if ((inContracts || inConfig) && specifier.startsWith("@validade-zero/adapters")) {
      report(violations, filePath, specifier, "contracts/config cannot depend on adapters");
    }

    if ((inContracts || inConfig || inAdapters) && specifier.includes("../apps/")) {
      report(violations, filePath, specifier, "shared packages cannot import app code");
    }

    if (inDomain) {
      const targetsAdapters = specifier.startsWith("@validade-zero/adapters");
      const targetsApp =
        specifier.startsWith("apps/") || normalized.includes(`${path.sep}apps${path.sep}`);
      const targetsProviderOrUi = providerOrUiImports.some((blocked) =>
        blocked.endsWith("/") ? specifier.startsWith(blocked) : specifier === blocked,
      );
      const targetsAdapterPath = normalized.includes(
        `${path.sep}packages${path.sep}adapters${path.sep}`,
      );

      if (targetsAdapters || targetsApp || targetsProviderOrUi || targetsAdapterPath) {
        report(
          violations,
          filePath,
          specifier,
          "domain cannot import app, UI, provider, database, or adapter layers",
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Dependency boundary violations found:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Dependency boundary check passed for ${files.length} source files.`);
