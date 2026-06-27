import { createFakeExpoAlertDeliveryProvider } from "@validade-zero/adapters";
import { AlertDispatchCommandSchema, type AlertDispatchCommand } from "@validade-zero/contracts";
import { createInMemoryCaptureRepository } from "@validade-zero/database/capture-repository";
import { describe, expect, it } from "vitest";
import {
  createAlertDispatchService,
  createCentralTaskAlertDispatchRepository,
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

  it("dispatches only unresolved central tasks for the registered store audience", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      tasks: [
        centralTask("loja-piloto", {
          centralTaskId: "task-central-alert-01",
          activeKey: "active-central-alert-01",
        }),
        centralTask("loja-outra", {
          centralTaskId: "task-outra-alert-01",
          activeKey: "active-outra-alert-01",
        }),
        {
          ...centralTask("loja-piloto", {
            centralTaskId: "task-resolvida-alert-01",
            activeKey: "active-resolvida-alert-01",
          }),
          taskStatus: "resolved" as const,
        },
      ],
    });
    const sent: Array<{ command: AlertDispatchCommand }> = [];
    const repository = createCentralTaskAlertDispatchRepository({
      captureRepository,
      registrations: [
        {
          storeId: "loja-piloto",
          storeName: "Loja Piloto",
          deviceId: "device-shift-piloto",
          deviceLabel: "Celular do turno",
          audienceRole: "shift_team",
          expoPushToken: FAKE_TOKEN,
          registeredBySubjectId: "lead-local",
          registeredAt: NOW,
        },
      ],
    });
    const service = createAlertDispatchService({
      repository,
      provider: createFakeExpoAlertDeliveryProvider({
        send: (input) => {
          sent.push(input);
          return { kind: "ok", providerTicketId: "ticket-central" };
        },
      }),
    });

    const result = await service.dispatchDueAlerts(NOW);
    const preparedAfterDispatch = await captureRepository.prepareTurn({
      requestId: "prepare-after-alert-dispatch",
      storeId: "loja-piloto",
      storeName: "Loja Piloto",
      actorId: "lead-local",
      actorDisplayName: "Lideranca local",
      actorRoleSnapshot: "lead",
      request: {
        deviceId: "device-after-alert",
        requestedAt: NOW,
        localSnapshot: {
          knownProductCount: 0,
          knownLotCount: 0,
          pendingCommandCount: 0,
        },
      },
    });

    expect(result.attempted).toBe(1);
    expect(sent).toEqual([
      expect.objectContaining({
        command: expect.objectContaining({
          taskId: "task-central-alert-01",
          taskActiveKey: "active-central-alert-01",
          audience: "responsible_and_leadership",
          data: {
            taskId: "task-central-alert-01",
            taskActiveKey: "active-central-alert-01",
          },
        }),
      }),
    ]);
    expect(`${sent[0]?.command.title} ${sent[0]?.command.body}`).not.toMatch(
      /task-central-alert-01|active-central-alert-01|resolve|resolved/i,
    );
    expect(JSON.stringify(result)).not.toContain(FAKE_TOKEN);
    expect(preparedAfterDispatch.activeTasks).toEqual([
      expect.objectContaining({ centralTaskId: "task-central-alert-01" }),
    ]);
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

function centralTask(storeId: string, overrides: Partial<ReturnType<typeof centralTaskBase>> = {}) {
  return {
    ...centralTaskBase(storeId),
    ...overrides,
  };
}

function centralTaskBase(storeId: string) {
  return {
    storeId,
    centralTaskId: "task-central-alert-base",
    activeKey: "active-central-alert-base",
    centralLotId: `lot-${storeId}`,
    productDisplayName: "Ovos FICTICIOS",
    currentLocation: { kind: "area_de_venda" as const },
    riskState: "expired" as const,
    severity: "critical" as const,
    requiredResolution: "withdraw_or_loss" as const,
    state: "synchronized" as const,
    source: "central" as const,
    ownerLabel: "Equipe do turno",
    updatedAt: NOW,
  };
}
