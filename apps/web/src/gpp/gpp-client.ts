import {
  GppQueueSnapshotSchema,
  type GppHistoryRow,
  type GppQueueSnapshot,
} from "@validade-zero/contracts";
import type { WebFetcher } from "../auth/authenticated-fetch";

export interface GppClient {
  readQueue(input: { storeId: string }): Promise<GppQueueSnapshot>;
  readHistory(input: { storeId: string; limit?: number }): Promise<readonly GppHistoryRow[]>;
}

export function createFetchGppClient(fetcher: WebFetcher = fetch): GppClient {
  return {
    async readQueue(input) {
      const response = await fetcher(`/gpp/queue?storeId=${encodeURIComponent(input.storeId)}`);
      const payload: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error("Nao foi possivel atualizar o Controle GPP.");
      }

      return GppQueueSnapshotSchema.parse(payload);
    },
    async readHistory(input) {
      const params = new URLSearchParams({ storeId: input.storeId });
      if (input.limit !== undefined) params.set("limit", String(input.limit));
      const response = await fetcher(`/gpp/history?${params.toString()}`);
      const payload: unknown = await response.json().catch(() => undefined);

      if (!response.ok || !isHistoryPayload(payload)) {
        throw new Error("Nao foi possivel atualizar o historico GPP.");
      }

      return payload.history;
    },
  };
}

function isHistoryPayload(value: unknown): value is { history: readonly GppHistoryRow[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { history?: unknown }).history)
  );
}
