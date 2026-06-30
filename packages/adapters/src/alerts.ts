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

type ExpoPushFetch = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

export interface ExpoAlertDeliveryProviderOptions {
  endpoint?: string;
  fetch?: ExpoPushFetch;
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

      const outcome = (await options.send?.({
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

export function createExpoAlertDeliveryProvider(
  options: ExpoAlertDeliveryProviderOptions = {},
): AlertDeliveryProvider {
  const endpoint = options.endpoint ?? "https://exp.host/--/api/v2/push/send";
  const fetcher = options.fetch ?? defaultFetch();

  return {
    async send(input) {
      const parsed = AlertDispatchCommandSchema.safeParse(input.command);

      if (!parsed.success) {
        return AlertDeliveryResultSchema.parse({
          status: "permanent_error",
          failureReason: "Invalid alert dispatch payload.",
        });
      }

      if (fetcher === undefined) {
        return AlertDeliveryResultSchema.parse({
          status: "retryable_error",
          failureReason: "Expo push provider fetch unavailable; retry is allowed.",
        });
      }

      let response: Awaited<ReturnType<ExpoPushFetch>>;
      try {
        response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: input.expoPushToken,
            title: parsed.data.title,
            body: parsed.data.body,
            data: parsed.data.data,
            sound: "default",
          }),
        });
      } catch {
        return mapExpoPushOutcomeToDeliveryResult({ kind: "network_error" });
      }

      const retryAfterSeconds = retryAfterSecondsFrom(response.headers.get("retry-after"));
      const payload = await response.json().catch(() => undefined);

      if (!response.ok) {
        const providerError = expoProviderErrorFromPayload(payload, response.status);
        if (providerError !== undefined) return mapExpoPushOutcomeToDeliveryResult(providerError);

        return mapExpoPushOutcomeToDeliveryResult({
          kind: "http_error",
          statusCode: response.status,
          ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
        });
      }

      return mapExpoPushOutcomeToDeliveryResult(expoOutcomeFromPayload(payload, response.status));
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

function defaultFetch(): ExpoPushFetch | undefined {
  const fetcher = (globalThis as { fetch?: unknown }).fetch;
  return typeof fetcher === "function" ? (fetcher as ExpoPushFetch) : undefined;
}

function retryAfterSecondsFrom(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 86_400) : undefined;
}

function expoOutcomeFromPayload(payload: unknown, statusCode: number): ExpoPushProviderOutcome {
  const ticket = firstExpoTicket(payload);
  if (ticket === undefined) return { kind: "invalid_payload" };

  const ticketStatus = readString(ticket, "status");
  if (ticketStatus === "ok") {
    const providerTicketId = readString(ticket, "id");
    return {
      kind: "ok",
      ...(providerTicketId === undefined ? {} : { providerTicketId }),
    };
  }

  if (ticketStatus === "error") {
    const code = expoTicketErrorCode(ticket) ?? "ExpoProviderError";
    return { kind: "provider_error", code, statusCode };
  }

  return { kind: "invalid_payload" };
}

function expoProviderErrorFromPayload(
  payload: unknown,
  statusCode: number,
): ExpoPushProviderOutcome | undefined {
  const ticket = firstExpoTicket(payload);
  if (ticket === undefined) return undefined;
  const ticketStatus = readString(ticket, "status");
  if (ticketStatus !== "error") return undefined;

  return {
    kind: "provider_error",
    code: expoTicketErrorCode(ticket) ?? "ExpoProviderError",
    statusCode,
  };
}

function firstExpoTicket(payload: unknown): Record<string, unknown> | undefined {
  if (!isRecord(payload)) return undefined;
  const data: unknown = payload.data;
  if (Array.isArray(data)) {
    const first: unknown = data[0];
    return isRecord(first) ? first : undefined;
  }

  return isRecord(data) ? data : undefined;
}

function expoTicketErrorCode(ticket: Record<string, unknown>): string | undefined {
  const details = ticket.details;
  if (!isRecord(details)) return undefined;
  return readString(details, "error");
}

function readString(value: Record<string, unknown>, key: string): string | undefined {
  const result = value[key];
  return typeof result === "string" && result.trim().length > 0 ? result.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
