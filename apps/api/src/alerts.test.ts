import { createFakeExpoAlertDeliveryProvider } from "@validade-zero/adapters";
import { AlertDispatchCommandSchema, type AlertDispatchCommand } from "@validade-zero/contracts";
import { describe, expect, it } from "vitest";
import {
  createAlertDispatchService,
  createInMemoryAlertDispatchRepository,
  createScheduledAlertHandler,
} from "./index";

const NOW = "2026-06-20T16:45:00.000Z";
const FAKE_TOKEN = "ExponentPushToken[fake-api-test-token]";

describe("alert dispatch API seam", () => {
  it("dispatches due alerts from a scheduled invocation", async () => {
    const repository = createInMemoryAlertDispatchRepository([
      {
        dispatch: createDispatchCommand(),
        expoPushToken: FAKE_TOKEN,
      },
    ]);
    const service = createAlertDispatchService({
      repository,
      provider: createFakeExpoAlertDeliveryProvider(),
    });
    const handler = createScheduledAlertHandler(() => service);

    await handler({ scheduledTime: Date.parse(NOW), cron: "*/15 * * * *" });

    expect(repository.readDeliveryResults()).toHaveLength(1);
    expect(repository.readDeliveryResults()[0]).toMatchObject({
      attemptId: "attempt-critical-01",
      taskId: "task-critical-01",
      dispatchedAt: NOW,
      result: {
        status: "ok",
        providerTicketId: "ticket-attempt-critical-01",
      },
    });
  });

  it("keeps provider payload privacy-safe while preserving task routing keys", async () => {
    let sentCommand: AlertDispatchCommand | undefined;
    const repository = createInMemoryAlertDispatchRepository([
      {
        dispatch: createDispatchCommand(),
        expoPushToken: FAKE_TOKEN,
      },
    ]);
    const service = createAlertDispatchService({
      repository,
      provider: createFakeExpoAlertDeliveryProvider({
        send: ({ command }) => {
          sentCommand = command;
          return { kind: "ok", providerTicketId: "ticket-safe" };
        },
      }),
    });

    const result = await service.dispatchDueAlerts(NOW);

    expect(sentCommand).toBeDefined();
    expect(sentCommand?.data).toEqual({
      taskId: "task-critical-01",
      taskActiveKey: "active-critical-01",
    });
    expect(`${sentCommand?.title} ${sentCommand?.body}`).not.toMatch(
      /lote|lot|task-critical-01|active-critical-01/i,
    );
    expect(JSON.stringify(result)).not.toContain(FAKE_TOKEN);
    expect(JSON.stringify(result)).not.toMatch(
      /taskResolution|resolutionAction|resolveTask|resolvedTask/i,
    );
  });

  it("maps temporary provider failures to retryable delivery results", async () => {
    const service = createAlertDispatchService({
      repository: createInMemoryAlertDispatchRepository([
        {
          dispatch: createDispatchCommand(),
          expoPushToken: FAKE_TOKEN,
        },
      ]),
      provider: createFakeExpoAlertDeliveryProvider({
        send: () => ({ kind: "http_error", statusCode: 503, retryAfterSeconds: 90 }),
      }),
    });

    const result = await service.dispatchDueAlerts(NOW);

    expect(result.attempts[0]).toMatchObject({
      status: "retryable_error",
      result: {
        status: "retryable_error",
        retryAfterSeconds: 90,
      },
    });
    expect(JSON.stringify(result)).not.toContain(FAKE_TOKEN);
  });

  it("maps DeviceNotRegistered as an invalid device state", async () => {
    const service = createAlertDispatchService({
      repository: createInMemoryAlertDispatchRepository([
        {
          dispatch: createDispatchCommand(),
          expoPushToken: FAKE_TOKEN,
        },
      ]),
      provider: createFakeExpoAlertDeliveryProvider({
        send: () => ({ kind: "provider_error", code: "DeviceNotRegistered" }),
      }),
    });

    const result = await service.dispatchDueAlerts(NOW);

    expect(result.attempts[0]?.result).toEqual({
      status: "device_not_registered",
      providerCode: "DeviceNotRegistered",
    });
    expect(JSON.stringify(result)).not.toContain(FAKE_TOKEN);
  });

  it("maps invalid provider payload responses to permanent errors", async () => {
    const service = createAlertDispatchService({
      repository: createInMemoryAlertDispatchRepository([
        {
          dispatch: createDispatchCommand(),
          expoPushToken: FAKE_TOKEN,
        },
      ]),
      provider: createFakeExpoAlertDeliveryProvider({
        send: () => ({ kind: "invalid_payload" }),
      }),
    });

    const result = await service.dispatchDueAlerts(NOW);

    expect(result.attempts[0]).toMatchObject({
      status: "permanent_error",
      result: {
        status: "permanent_error",
      },
    });
    expect(JSON.stringify(result)).not.toContain(FAKE_TOKEN);
  });
});

function createDispatchCommand(): AlertDispatchCommand {
  return AlertDispatchCommandSchema.parse({
    attemptId: "attempt-critical-01",
    taskId: "task-critical-01",
    taskActiveKey: "active-critical-01",
    audience: "responsible_and_leadership",
    title: "Retirar agora: Banana prata",
    body: "area de venda - Abrir tarefa",
    data: {
      taskId: "task-critical-01",
      taskActiveKey: "active-critical-01",
    },
    createdAt: NOW,
  });
}
