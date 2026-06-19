import { z } from "zod";

export const RuntimeEnvironmentSchema = z.enum(["local", "preview", "production"]);

export const RuntimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VALIDADE_ZERO_APP_ENV: RuntimeEnvironmentSchema.default("local"),
  API_BASE_URL: z.url().optional(),
  SAFE_PROBE_DEFAULT_VALUE: z.string().min(1).default("sonda-segura-ficticia"),
});

export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;
export type RuntimeEnvInput = z.input<typeof RuntimeEnvSchema>;
export type AppConfig = z.infer<typeof RuntimeEnvSchema>;

export function parseRuntimeEnv(env: RuntimeEnvInput): AppConfig {
  return RuntimeEnvSchema.parse(env);
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
