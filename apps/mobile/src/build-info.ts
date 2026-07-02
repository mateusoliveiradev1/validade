import {
  resolvePilotBuildCompatibility,
  type PilotBuildCompatibility,
} from "@validade-zero/contracts";

const STAGING_API_BASE_URL = "https://validade-zero-api-staging.validadezero.workers.dev";

export const APPROVED_PILOT_BUILD = {
  artifactLabel: "uat34-init-central-refresh-apk-164",
  appVersion: "0.12.0",
  build: "164",
} as const;

interface ExpoApplicationPort {
  applicationId?: string | null;
  nativeApplicationVersion?: string | null;
  nativeBuildVersion?: string | null;
}

interface ExpoConstantsConfigPort {
  default?: {
    expoConfig?: ExpoConfig | null;
  };
  expoConfig?: ExpoConfig | null;
}

interface ExpoConfig {
  version?: string | null;
  android?: {
    package?: string | null;
    versionCode?: number | string | null;
  } | null;
  extra?: Record<string, unknown> | null;
}

export interface MobileBuildInfo {
  appVersion: string;
  appBuild: string;
  environment: string;
  apiTarget: string;
  packageId: string;
  approvedArtifactLabel: string;
  approvedAppVersion: string;
  approvedBuild: string;
  buildRef: string;
  buildCompatibility: PilotBuildCompatibility;
}

export function readMobileBuildInfo(
  input: {
    apiTarget?: string | undefined;
    application?: ExpoApplicationPort | undefined;
    constants?: ExpoConstantsConfigPort | undefined;
  } = {},
): MobileBuildInfo {
  const application = input.application ?? loadExpoApplicationModule();
  const constants = input.constants ?? loadExpoConstantsConfig();
  const expoConfig = expoConfigFrom(constants);
  const extra = expoConfig?.extra;

  const approvedAppVersion = publicLabel(
    extraText(extra, "VALIDADE_ZERO_APPROVED_APP_VERSION"),
    APPROVED_PILOT_BUILD.appVersion,
  );
  const approvedBuild = publicLabel(
    extraText(extra, "VALIDADE_ZERO_APPROVED_BUILD"),
    APPROVED_PILOT_BUILD.build,
  );
  const appVersion = publicLabel(
    textFrom(application?.nativeApplicationVersion) ?? textFrom(expoConfig?.version),
    "nao informado",
  );
  const appBuild = publicLabel(
    textFrom(application?.nativeBuildVersion) ?? textFrom(expoConfig?.android?.versionCode),
    "nao informado",
  );

  return {
    appVersion,
    appBuild,
    environment: publicLabel(extraText(extra, "VALIDADE_ZERO_APP_ENV"), "staging"),
    apiTarget: publicApiTarget(
      input.apiTarget ??
        publicEnv("EXPO_PUBLIC_API_URL") ??
        extraText(extra, "EXPO_PUBLIC_API_URL") ??
        STAGING_API_BASE_URL,
    ),
    packageId: publicLabel(
      textFrom(application?.applicationId) ?? textFrom(expoConfig?.android?.package),
      "nao informado",
    ),
    approvedArtifactLabel: publicLabel(
      extraText(extra, "VALIDADE_ZERO_APPROVED_ARTIFACT_LABEL"),
      APPROVED_PILOT_BUILD.artifactLabel,
    ),
    approvedAppVersion,
    approvedBuild,
    buildRef: publicLabel(
      extraText(extra, "VALIDADE_ZERO_BUILD_REF"),
      "init-central-refresh-164",
      24,
    ),
    buildCompatibility: resolvePilotBuildCompatibility({
      appVersion,
      appBuild,
      approvedAppVersion,
      approvedBuild,
    }),
  };
}

function expoConfigFrom(constants: ExpoConstantsConfigPort | undefined): ExpoConfig | undefined {
  return constants?.default?.expoConfig ?? constants?.expoConfig ?? undefined;
}

function loadExpoApplicationModule(): ExpoApplicationPort | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Optional native Expo module must not crash Node/Vitest.
    return require("expo-application") as ExpoApplicationPort;
  } catch {
    const globalRequire = (globalThis as { require?: (moduleName: string) => unknown }).require;
    if (typeof globalRequire !== "function") return undefined;
    try {
      return globalRequire("expo-application") as ExpoApplicationPort;
    } catch {
      return undefined;
    }
  }
}

function loadExpoConstantsConfig(): ExpoConstantsConfigPort | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Optional Expo config read mirrors the app's runtime fallback.
    return require("expo-constants") as ExpoConstantsConfigPort;
  } catch {
    const globalRequire = (globalThis as { require?: (moduleName: string) => unknown }).require;
    if (typeof globalRequire !== "function") return undefined;
    try {
      return globalRequire("expo-constants") as ExpoConstantsConfigPort;
    } catch {
      return undefined;
    }
  }
}

function extraText(
  extra: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  if (extra === undefined || extra === null) return undefined;
  return textFrom(extra[key]);
}

function publicEnv(key: "EXPO_PUBLIC_API_URL"): string | undefined {
  return textFrom((process.env as { EXPO_PUBLIC_API_URL?: string | undefined })[key]);
}

function textFrom(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function publicLabel(value: string | undefined, fallback: string, maxLength = 80): string {
  const resolved = textFrom(value) ?? fallback;
  if (/(https?:\/\/|eas:\/\/|token|secret|password)/i.test(resolved)) return fallback;
  return maskLongLabel(resolved, maxLength);
}

function publicApiTarget(value: string | undefined): string {
  const resolved = textFrom(value) ?? STAGING_API_BASE_URL;
  if (!/^https?:\/\//.test(resolved)) return "API nao informada";
  return maskLongLabel(resolved.replace(/\/$/, ""), 120);
}

function maskLongLabel(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const head = value.slice(0, Math.max(8, Math.floor(maxLength / 2) - 3));
  const tail = value.slice(-Math.max(6, Math.floor(maxLength / 2) - 3));
  return `${head}...${tail}`;
}
