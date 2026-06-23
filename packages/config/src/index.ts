import { z } from "zod";

export const RuntimeEnvironmentSchema = z.enum(["local", "preview", "staging", "production"]);

export const RuntimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VALIDADE_ZERO_APP_ENV: RuntimeEnvironmentSchema.default("local"),
  API_BASE_URL: z.url().optional(),
  SAFE_PROBE_DEFAULT_VALUE: z.string().min(1).default("sonda-segura-ficticia"),
});

const safeExampleMarker = /(example|fictici|placeholder|localhost|00000000)/i;

const SafeExampleStringSchema = z
  .string()
  .min(1)
  .refine((value) => safeExampleMarker.test(value), {
    message: "Value must be an obvious fake/example placeholder.",
  });

export const EnvExampleSchema = RuntimeEnvSchema.extend({
  API_BASE_URL: z.url().refine((value) => safeExampleMarker.test(value), {
    message: "API_BASE_URL must use an example or localhost URL.",
  }),
  EXPO_PUBLIC_API_URL: z.url().refine((value) => safeExampleMarker.test(value), {
    message: "EXPO_PUBLIC_API_URL must use an example or localhost URL.",
  }),
  SAFE_PROBE_DEFAULT_VALUE: SafeExampleStringSchema,
  NEON_DATABASE_URL: SafeExampleStringSchema,
  CLOUDFLARE_ACCOUNT_ID: SafeExampleStringSchema,
  R2_BUCKET_NAME: SafeExampleStringSchema,
  EXPO_PROJECT_ID: z.uuid().refine((value) => value === "00000000-0000-0000-0000-000000000000", {
    message: "EXPO_PROJECT_ID must be the all-zero placeholder UUID.",
  }),
});

export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;
export type RuntimeEnvInput = z.input<typeof RuntimeEnvSchema>;
export type AppConfig = z.infer<typeof RuntimeEnvSchema>;
export type EnvExample = z.infer<typeof EnvExampleSchema>;

export function parseRuntimeEnv(env: RuntimeEnvInput): AppConfig {
  return RuntimeEnvSchema.parse(env);
}

export function parseEnvExample(env: Record<string, string | undefined>): EnvExample {
  return EnvExampleSchema.parse(env);
}

export function createLocalConfig(overrides: Partial<RuntimeEnvInput> = {}): AppConfig {
  return parseRuntimeEnv({
    NODE_ENV: "development",
    VALIDADE_ZERO_APP_ENV: "local",
    SAFE_PROBE_DEFAULT_VALUE: "sonda-segura-ficticia",
    ...overrides,
  });
}

export function summarizeConfigForLogs(config: AppConfig): {
  appEnv: RuntimeEnvironment;
  hasApiBaseUrl: boolean;
  safeProbeDefaultValue: string;
} {
  return {
    appEnv: config.VALIDADE_ZERO_APP_ENV,
    hasApiBaseUrl: config.API_BASE_URL !== undefined,
    safeProbeDefaultValue: config.SAFE_PROBE_DEFAULT_VALUE,
  };
}
