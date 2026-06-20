import {
  AlertDeliveryResultSchema,
  AlertDispatchCommandSchema,
  type AlertDeliveryResult,
  type AlertDispatchCommand,
} from "@validade-zero/contracts";

export interface AlertDeliveryProviderSendInput {
  command: AlertDispatchCommand;
  expoPushToken: string;
}

export interface AlertDeliveryProvider {
  send(input: AlertDeliveryProviderSendInput): Promise<AlertDeliveryResult>;
}

export type ExpoPushProviderOutcome =
  | {
      kind: "ok";
      providerTicketId?: string;
      providerReceiptId?: string;
    }
  | {
      kind: "http_error";
      statusCode: number;
      retryAfterSeconds?: number;
      providerTicketId?: string;
      providerReceiptId?: string;
    }
  | {
      kind: "network_error";
      providerTicketId?: string;
      providerReceiptId?: string;
    }
  | {
      kind: "provider_error";
      code: string;
      statusCode?: number;
      providerTicketId?: string;
      providerReceiptId?: string;
    }
  | {
      kind: "invalid_payload";
      providerTicketId?: string;
      providerReceiptId?: string;
    };

export interface FakeExpoAlertDeliveryProviderOptions {
  send?: (input: {
    command: AlertDispatchCommand;
    tokenFingerprint: string;
  }) => Promise<ExpoPushProviderOutcome> | ExpoPushProviderOutcome;
}

export function createFakeExpoAlertDeliveryProvider(
  options: FakeExpoAlertDeliveryProviderOptions = {},
): AlertDeliveryProvider {
  return {
    async send(input) {
      const parsed = AlertDispatchCommandSchema.safeParse(input.command);

      if (!parsed.success) {
        return AlertDeliveryResultSchema.parse({
          status: "permanent_error",
          failureReason: "Invalid alert dispatch payload.",
        });
      }

      const outcome =
        (await options.send?.({
          command: parsed.data,
          tokenFingerprint: fingerprintToken(input.expoPushToken),
        })) ?? {
          kind: "ok",
          providerTicketId: `ticket-${parsed.data.attemptId}`,
        };

      return mapExpoPushOutcomeToDeliveryResult(outcome);
    },
  };
}

export function mapExpoPushOutcomeToDeliveryResult(
  outcome: ExpoPushProviderOutcome,
): AlertDeliveryResult {
  const providerIds = {
    ...(outcome.providerTicketId === undefined
      ? {}
      : { providerTicketId: outcome.providerTicketId }),
    ...(outcome.providerReceiptId === undefined
      ? {}
      : { providerReceiptId: outcome.providerReceiptId }),
  };

  if (outcome.kind === "ok") {
    return AlertDeliveryResultSchema.parse({
      status: "ok",
      ...providerIds,
    });
  }

  if (outcome.kind === "provider_error" && outcome.code === "DeviceNotRegistered") {
    return AlertDeliveryResultSchema.parse({
      status: "device_not_registered",
      providerCode: "DeviceNotRegistered",
      ...providerIds,
    });
  }

  if (isRetryableExpoPushOutcome(outcome)) {
    return AlertDeliveryResultSchema.parse({
      status: "retryable_error",
      failureReason: retryableFailureReason(outcome),
      ...(outcome.kind === "http_error" && outcome.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: outcome.retryAfterSeconds }
        : {}),
      ...providerIds,
    });
  }

  return AlertDeliveryResultSchema.parse({
    status: "permanent_error",
    failureReason: permanentFailureReason(outcome),
    ...providerIds,
  });
}

export function isRetryableExpoPushOutcome(outcome: ExpoPushProviderOutcome): boolean {
  if (outcome.kind === "network_error") {
    return true;
  }

  if (outcome.kind === "http_error") {
    return outcome.statusCode === 429 || outcome.statusCode >= 500;
  }

  if (outcome.kind === "provider_error" && outcome.statusCode !== undefined) {
    return outcome.statusCode === 429 || outcome.statusCode >= 500;
  }

  return false;
}

function retryableFailureReason(outcome: ExpoPushProviderOutcome): string {
  if (outcome.kind === "network_error") {
    return "Expo push provider network error; retry is allowed.";
  }

  const statusCode =
    outcome.kind === "http_error" || outcome.kind === "provider_error"
      ? outcome.statusCode
      : undefined;

  return statusCode === undefined
    ? "Expo push provider temporarily unavailable; retry is allowed."
    : `Expo push provider returned HTTP ${statusCode}; retry is allowed.`;
}

function permanentFailureReason(outcome: ExpoPushProviderOutcome): string {
  if (outcome.kind === "invalid_payload") {
    return "Expo push provider rejected the alert payload.";
  }

  if (outcome.kind === "provider_error") {
    return "Expo push provider returned a permanent alert error.";
  }

  if (outcome.kind === "http_error") {
    return `Expo push provider returned non-retryable HTTP ${outcome.statusCode}.`;
  }

  return "Expo push provider returned a permanent alert error.";
}

function fingerprintToken(token: string): string {
  return `len:${token.length}`;
}
