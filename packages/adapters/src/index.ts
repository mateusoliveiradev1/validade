import { createLocalConfig, type AppConfig, type RuntimeEnvInput } from "@validade-zero/config";
import {
  SafeProbePayloadSchema,
  type SafeProbePayload,
  type SafeProbeWriteInput,
} from "@validade-zero/contracts";

export * from "./alerts";

export interface SafeProbeAdapter {
  read(): Promise<SafeProbePayload>;
  write(input: SafeProbeWriteInput): Promise<SafeProbePayload>;
}

export interface ProviderAdapterRegistry {
  safeProbe: SafeProbeAdapter;
  config: AppConfig;
}

export interface InMemorySafeProbeOptions {
  initialValue?: string;
  now?: () => Date;
  probeId?: string;
}

export function createInMemorySafeProbeAdapter(
  options: InMemorySafeProbeOptions = {},
): SafeProbeAdapter {
  const now = options.now ?? (() => new Date());
  const probeId = options.probeId ?? "safe-probe-local";
  let current = SafeProbePayloadSchema.parse({
    probeId,
    value: options.initialValue ?? "sonda-segura-ficticia",
    updatedAt: now().toISOString(),
  });

  return {
    read() {
      return Promise.resolve(current);
    },
    write(input) {
      current = SafeProbePayloadSchema.parse({
        probeId,
        value: input.value,
        updatedAt: now().toISOString(),
        actor: input.actor,
        store: input.store,
      });

      return Promise.resolve(current);
    },
  };
}

export function createLocalProviderRegistry(env: RuntimeEnvInput = {}): ProviderAdapterRegistry {
  const config = createLocalConfig(env);

  return {
    config,
    safeProbe: createInMemorySafeProbeAdapter({
      initialValue: config.SAFE_PROBE_DEFAULT_VALUE,
    }),
  };
}
