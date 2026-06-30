import { describe, expect, it } from "vitest";
import { createExpoAlertDeliveryProvider } from "./alerts";
import type { AlertDispatchCommand } from "@validade-zero/contracts";

const command: AlertDispatchCommand = {
  attemptId: "attempt-safe-push-test",
  taskId: "safe-push-test",
  taskActiveKey: "safe-push-test-active",
  audience: "responsible_and_leadership",
  title: "Teste Validade Zero",
  body: "Toque para confirmar canal de lembrete.",
  data: {
    taskId: "safe-push-test",
    taskActiveKey: "safe-push-test-active",
  },
  createdAt: "2030-01-10T12:00:00.000Z",
};

describe("Expo alert delivery provider", () => {
  it("maps accepted Expo tickets to ok delivery results", async () => {
    const provider = createExpoAlertDeliveryProvider({
      fetch: (_url, init) => {
        expect(JSON.parse(init.body)).toMatchObject({
          to: "ExponentPushToken[secret-device-id]",
          title: "Teste Validade Zero",
        });
        return Promise.resolve(response(200, { data: { status: "ok", id: "ticket-safe" } }));
      },
    });

    const result = await provider.send({
      command,
      expoPushToken: "ExponentPushToken[secret-device-id]",
    });

    expect(result).toEqual({ status: "ok", providerTicketId: "ticket-safe" });
  });

  it("maps DeviceNotRegistered tickets to invalid device delivery results", async () => {
    const provider = createExpoAlertDeliveryProvider({
      fetch: () =>
        Promise.resolve(
          response(200, {
            data: {
              status: "error",
              message: "Device not registered",
              details: { error: "DeviceNotRegistered" },
            },
          }),
        ),
    });

    const result = await provider.send({
      command,
      expoPushToken: "ExponentPushToken[invalid-device]",
    });

    expect(result).toEqual({
      status: "device_not_registered",
      providerCode: "DeviceNotRegistered",
    });
  });
});

function response(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(payload),
  };
}
