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
        NEON_DATABASE_URL: databaseUrl,
        AUTH_TOKEN_PEPPER: "token-pepper-for-test-only",
        AUTH_PASSWORD_PEPPER: "password-pepper-for-test-only",
      }),
    ).toBeDefined();
  });
});
