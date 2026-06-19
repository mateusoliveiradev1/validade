import { Hono } from "hono";
import { createLocalProviderRegistry } from "@validade-zero/adapters";
import { HealthContract, SafeProbeContract } from "@validade-zero/contracts";

const app = new Hono();
const providers = createLocalProviderRegistry();

app.get("/health", (context) => {
  const payload = HealthContract.response.parse({
    status: "ok",
    service: "validade-zero-api",
    checkedAt: new Date().toISOString(),
  });

  return context.json(payload);
});

app.get("/probe", async (context) => {
  const payload = SafeProbeContract.payload.parse(await providers.safeProbe.read());

  return context.json(payload);
});

app.post("/probe", async (context) => {
  let rawPayload: unknown;

  try {
    rawPayload = await context.req.json();
  } catch {
    return context.json({ error: "invalid_json" }, 400);
  }

  const parsed = SafeProbeContract.write.safeParse(rawPayload);

  if (!parsed.success) {
    return context.json({ error: "invalid_probe_payload" }, 400);
  }

  const payload = SafeProbeContract.payload.parse(
    await providers.safeProbe.write(parsed.data),
  );

  return context.json(payload);
});

export default app;
