import {
  AuditCursorPageSchema,
  AuditQuerySchema,
  type AuditCursorPage,
  type AuditQuery,
} from "@validade-zero/contracts";

export interface AuditClient {
  listEvents(query: AuditQuery): Promise<AuditCursorPage>;
}

export function createFetchAuditClient(fetcher: typeof fetch = fetch): AuditClient {
  return {
    async listEvents(query) {
      const parsedQuery = AuditQuerySchema.parse(query);
      const response = await fetcher(`/audit/events?${toSearchParams(parsedQuery).toString()}`);
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(errorMessageFromPayload(payload));
      }

      return AuditCursorPageSchema.parse(payload);
    },
  };
}

function toSearchParams(query: AuditQuery): URLSearchParams {
  const params = new URLSearchParams();

  params.set("storeId", query.storeId);
  params.set("limit", String(query.limit));

  for (const key of [
    "from",
    "to",
    "actorId",
    "type",
    "targetType",
    "targetId",
    "cursor",
  ] as const) {
    const value = query[key];

    if (value !== undefined) {
      params.set(key, value);
    }
  }

  return params;
}

function errorMessageFromPayload(payload: unknown): string {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return "Nao foi possivel carregar a auditoria.";
}
