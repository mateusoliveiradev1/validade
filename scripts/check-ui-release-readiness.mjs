import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["apps/web/src", "apps/mobile/src"];
const textExtensions = new Set([".ts", ".tsx", ".json", ".md", ".yaml", ".yml"]);
const requiredPrivacySections = [
  "Politica de Privacidade",
  "Termos de Uso",
  "Seguranca da conta",
  "Permissoes do aparelho",
  "Dados usados pelo app",
  "Canal/encarregado",
  "Solicitacao de direitos LGPD",
];
const violations = [];

function filesIn(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) return filesIn(absolute);
    if (!textExtensions.has(path.extname(absolute)) || /\.test\.[cm]?[jt]sx?$/.test(absolute))
      return [];
    return [absolute];
  });
}

function inspect(relative, content) {
  for (const phrase of [
    "Ambiente seguro para desenvolvimento",
    "Smoke web ficticio",
    "API ainda nao verificada",
  ]) {
    if (content.includes(phrase)) violations.push(`${relative}: provisional copy '${phrase}'`);
  }
  if (/\b(?:smoke|demo)\b/i.test(content))
    violations.push(`${relative}: provisional smoke/demo copy`);
  if (/(?:label|children)=\{?['"](?:OK|Salvar|Enviar|Continuar)['"]\}?/.test(content))
    violations.push(`${relative}: generic primary action label`);
}

for (const absolute of sourceRoots.flatMap((directory) => filesIn(path.join(root, directory)))) {
  const relative = path.relative(root, absolute);
  inspect(relative, readFileSync(absolute, "utf8"));
}

const webPrivacy = readFileSync(path.join(root, "apps/web/src/privacy/PrivacyCenter.tsx"), "utf8");
const mobilePrivacy = readFileSync(
  path.join(root, "apps/mobile/src/privacy/PrivacyCenterScreen.tsx"),
  "utf8",
);
for (const section of requiredPrivacySections) {
  if (!webPrivacy.includes(section))
    violations.push(`apps/web/src/privacy/PrivacyCenter.tsx: missing '${section}'`);
  if (!mobilePrivacy.includes(section))
    violations.push(`apps/mobile/src/privacy/PrivacyCenterScreen.tsx: missing '${section}'`);
}

const mobileApp = readFileSync(path.join(root, "apps/mobile/App.tsx"), "utf8");
const webApp = readFileSync(path.join(root, "apps/web/src/App.tsx"), "utf8");
const commandCenter = readFileSync(
  path.join(root, "apps/web/src/command-center/CommandCenter.tsx"),
  "utf8",
);
if (!mobileApp.includes("AuthGate"))
  violations.push("apps/mobile/App.tsx: normal composition bypasses AuthGate");
if (!webApp.includes("session === undefined"))
  violations.push("apps/web/src/App.tsx: normal composition bypasses session gate");
if (/\b(?:sales|inventory|forecast|supplier|revenue|BI)\b/i.test(commandCenter))
  violations.push(
    "apps/web/src/command-center/CommandCenter.tsx: unsupported operational metric vocabulary",
  );

const appConfig = readFileSync(path.join(root, "apps/mobile/app.json"), "utf8");
if (!appConfig.includes("./assets/icon.png") || !appConfig.includes("./assets/splash.png"))
  violations.push("apps/mobile/app.json: missing generated brand icon or splash");

if (process.argv.includes("--self-test")) {
  const before = violations.length;
  inspect("fixture.tsx", "<p>Ambiente seguro para desenvolvimento</p>");
  if (violations.length === before)
    throw new Error("UI scanner self-test did not reject provisional copy.");
  console.log("UI release readiness scanner self-test passed.");
  process.exit(0);
}

if (violations.length > 0) {
  console.error("UI release readiness check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("UI release readiness check passed.");
