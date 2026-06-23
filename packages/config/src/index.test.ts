import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseEnvExample, parseRuntimeEnv } from "./index";

function readEnvExample() {
  const envPath = fileURLToPath(new URL("../../../.env.example", import.meta.url));
  const content = readFileSync(envPath, "utf8");
  const entries = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const [key, ...valueParts] = line.split("=");
      return [key, valueParts.join("=")] as const;
    });

  return Object.fromEntries(entries);
}

describe("public repo env example", () => {
  it("accepts staging as a runtime environment for pre-production builds", () => {
    const parsed = parseRuntimeEnv({
      NODE_ENV: "production",
      VALIDADE_ZERO_APP_ENV: "staging",
      API_BASE_URL: "https://validade-zero-api-staging.validadezero.workers.dev",
    });

    expect(parsed.VALIDADE_ZERO_APP_ENV).toBe("staging");
    expect(parsed.API_BASE_URL).toBe("https://validade-zero-api-staging.validadezero.workers.dev");
  });

  it("parses the committed .env.example as safe fake config", () => {
    const parsed = parseEnvExample(readEnvExample());

    expect(parsed.API_BASE_URL).toBe("https://api.localhost.example.invalid");
    expect(parsed.NEON_DATABASE_URL).toBe("NEON_DATABASE_URL_EXAMPLE_INVALID");
    expect(parsed.CLOUDFLARE_ACCOUNT_ID).toBe("example-cloudflare-account-id");
  });

  it("rejects missing required provider placeholders", () => {
    expect(() =>
      parseEnvExample({
        NODE_ENV: "development",
        VALIDADE_ZERO_APP_ENV: "local",
      }),
    ).toThrow();
  });
});
