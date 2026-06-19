import { describe, expect, it } from "vitest";
import app from "./index";

describe("validade zero API smoke", () => {
  it("returns a safe health response", async () => {
    const response = await app.request("/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      service: "validade-zero-api",
    });
    expect(JSON.stringify(body)).not.toMatch(/secret|token|password|database_url/i);
  });

  it("writes and returns a safe probe value", async () => {
    const response = await app.request("/probe", {
      method: "POST",
      body: JSON.stringify({ value: "checagem-ficticia-api" }),
      headers: {
        "content-type": "application/json",
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      probeId: "safe-probe-local",
      value: "checagem-ficticia-api",
    });
    expect(JSON.stringify(body)).not.toMatch(/secret|token|password|database_url/i);
  });

  it("rejects invalid probe input without stack traces", async () => {
    const response = await app.request("/probe", {
      method: "POST",
      body: JSON.stringify({ value: "" }),
      headers: {
        "content-type": "application/json",
      },
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(JSON.stringify(body)).toContain("invalid_probe_payload");
    expect(JSON.stringify(body)).not.toMatch(/stack|trace|at /i);
  });
});
