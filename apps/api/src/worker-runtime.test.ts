import { describe, expect, it } from "vitest";
import worker, { createWorkerApp } from "./index";

describe("Worker runtime configuration", () => {
  it("refuses to serve the API when persistent auth configuration is missing", async () => {
    const response = await worker.fetch(
      new Request("https://api.example.invalid/health"),
      {},
      {} as ExecutionContext,
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "service_not_configured" });
  });

  it("composes the persistent API only when the database URL and both peppers exist", () => {
    const databaseUrl = "postgresql://user:password@example.invalid/neondb?sslmode=require";
    expect(createWorkerApp({ NEON_DATABASE_URL: databaseUrl })).toBeUndefined();
    expect(
      createWorkerApp({
        VALIDADE_ZERO_APP_ENV: "local",
        NEON_DATABASE_URL: databaseUrl,
        AUTH_TOKEN_PEPPER: "token-pepper-for-test-only",
        AUTH_PASSWORD_PEPPER: "password-pepper-for-test-only",
      }),
    ).toBeDefined();
  });

  it("requires private R2 evidence storage outside local runtime", () => {
    const databaseUrl = "postgresql://user:password@example.invalid/neondb?sslmode=require";
    const env = {
      VALIDADE_ZERO_APP_ENV: "staging",
      NEON_DATABASE_URL: databaseUrl,
      AUTH_TOKEN_PEPPER: "token-pepper-for-test-only",
      AUTH_PASSWORD_PEPPER: "password-pepper-for-test-only",
      EVIDENCE_STORE_MODE: "r2",
    };

    expect(createWorkerApp(env)).toBeUndefined();
    expect(createWorkerApp({ ...env, EVIDENCE_BUCKET: createFakeR2Bucket() })).toBeDefined();
    expect(createWorkerApp({ ...env, EVIDENCE_STORE_MODE: "memory" })).toBeUndefined();
  });

  it("can serve staging with binary evidence explicitly disabled", () => {
    const databaseUrl = "postgresql://user:password@example.invalid/neondb?sslmode=require";

    expect(
      createWorkerApp({
        VALIDADE_ZERO_APP_ENV: "staging",
        NEON_DATABASE_URL: databaseUrl,
        AUTH_TOKEN_PEPPER: "token-pepper-for-test-only",
        AUTH_PASSWORD_PEPPER: "password-pepper-for-test-only",
        EVIDENCE_STORE_MODE: "disabled",
      }),
    ).toBeDefined();
  });
});

function createFakeR2Bucket() {
  return {
    put: () =>
      Promise.resolve({
        size: 1,
        uploaded: new Date("2030-01-10T12:00:00.000Z"),
        httpMetadata: { contentType: "image/jpeg" },
        customMetadata: {
          sha256: "0".repeat(64),
        },
      }),
    head: () => Promise.resolve(null),
    get: () => Promise.resolve(null),
    delete: () => Promise.resolve(),
  };
}
