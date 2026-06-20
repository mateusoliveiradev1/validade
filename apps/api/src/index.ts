import {
  createFakeExpoAlertDeliveryProvider,
  createLocalProviderRegistry,
  type AlertDeliveryProvider,
} from "@validade-zero/adapters";
import {
  AlertDeliveryResultSchema,
  HEALTH_SERVICE_NAME,
  HealthContract,
  SafeProbeContract,
  type AlertDeliveryResult,
  type AlertDispatchCommand,
} from "@validade-zero/contracts";
import { Hono } from "hono";

export const app = new Hono();
const providers = createLocalProviderRegistry();

app.get("/health", (context) => {
  const payload = HealthContract.response.parse({
    status: "ok",
    service: HEALTH_SERVICE_NAME,
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

  const payload = SafeProbeContract.payload.parse(await providers.safeProbe.write(parsed.data));

  return context.json(payload);
});

export interface DueAlertDispatchRecord {
  dispatch: AlertDispatchCommand;
  expoPushToken: string;
}

export interface AlertDispatchResultRecord {
  attemptId: string;
  taskId: string;
  result: AlertDeliveryResult;
  dispatchedAt: string;
}

export interface AlertDispatchRepository {
  listDueAlerts(input: { now: string }): Promise<readonly DueAlertDispatchRecord[]>;
  recordDeliveryResult(input: AlertDispatchResultRecord): Promise<void>;
}

export interface AlertDispatchService {
  dispatchDueAlerts(referenceTime?: string): Promise<ScheduledAlertDispatchResult>;
}

export interface ScheduledAlertDispatchAttempt {
  attemptId: string;
  taskId: string;
  status: AlertDeliveryResult["status"];
  result: AlertDeliveryResult;
}

export interface ScheduledAlertDispatchResult {
  checkedAt: string;
  attempted: number;
  attempts: ScheduledAlertDispatchAttempt[];
}

export interface InMemoryAlertDispatchRepository extends AlertDispatchRepository {
  readDeliveryResults(): readonly AlertDispatchResultRecord[];
}

export function createInMemoryAlertDispatchRepository(
  dueAlerts: readonly DueAlertDispatchRecord[] = [],
): InMemoryAlertDispatchRepository {
  const deliveryResults: AlertDispatchResultRecord[] = [];

  return {
    listDueAlerts() {
      return Promise.resolve(dueAlerts);
    },
    recordDeliveryResult(input) {
      deliveryResults.push(input);
      return Promise.resolve();
    },
    readDeliveryResults() {
      return deliveryResults;
    },
  };
}

export function createAlertDispatchService(input: {
  repository: AlertDispatchRepository;
  provider: AlertDeliveryProvider;
  now?: () => Date;
}): AlertDispatchService {
  const now = input.now ?? (() => new Date());

  return {
    async dispatchDueAlerts(referenceTime = now().toISOString()) {
      const dueAlerts = await input.repository.listDueAlerts({ now: referenceTime });
      const attempts: ScheduledAlertDispatchAttempt[] = [];

      for (const dueAlert of dueAlerts) {
        const result = AlertDeliveryResultSchema.parse(
          await input.provider.send({
            command: dueAlert.dispatch,
            expoPushToken: dueAlert.expoPushToken,
          }),
        );

        await input.repository.recordDeliveryResult({
          attemptId: dueAlert.dispatch.attemptId,
          taskId: dueAlert.dispatch.taskId,
          result,
          dispatchedAt: referenceTime,
        });

        attempts.push({
          attemptId: dueAlert.dispatch.attemptId,
          taskId: dueAlert.dispatch.taskId,
          status: result.status,
          result,
        });
      }

      return {
        checkedAt: referenceTime,
        attempted: attempts.length,
        attempts,
      };
    },
  };
}

export function createDefaultAlertDispatchService(): AlertDispatchService {
  return createAlertDispatchService({
    repository: createInMemoryAlertDispatchRepository(),
    provider: createFakeExpoAlertDeliveryProvider(),
  });
}

export interface ScheduledControllerLike {
  scheduledTime?: number;
  cron?: string;
}

export function createScheduledAlertHandler(
  serviceFactory: () => AlertDispatchService = createDefaultAlertDispatchService,
) {
  return async function scheduledAlertDispatch(
    event: ScheduledControllerLike,
    _env?: unknown,
    _context?: ExecutionContext,
  ): Promise<void> {
    void _env;
    void _context;

    const referenceTime =
      event.scheduledTime === undefined
        ? new Date().toISOString()
        : new Date(event.scheduledTime).toISOString();

    await serviceFactory().dispatchDueAlerts(referenceTime);
  };
}

export const scheduled = createScheduledAlertHandler();

const worker = {
  fetch(request: Request, env: unknown, context: ExecutionContext) {
    return app.fetch(request, env, context);
  },
  scheduled,
};

export default worker;
