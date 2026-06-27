import { SyncTransportResultSchema } from "@validade-zero/contracts";
import type { SyncTransport } from "./sync-engine";

type SyncTransportHeaders = Record<string, string>;

export function createFetchSyncTransport(input: {
  baseUrl: string;
  storeId: string;
  storeName?: string | undefined;
  headers?:
    | SyncTransportHeaders
    | (() => SyncTransportHeaders | Promise<SyncTransportHeaders>)
    | undefined;
  fetcher?: typeof fetch | undefined;
}): SyncTransport {
  const fetcher = input.fetcher ?? fetch;
  const baseUrl = normalizeBaseUrl(input.baseUrl);

  return {
    async sendBatch(batch) {
      const url = new URL(`${baseUrl}/sync/commands`);
      url.searchParams.set("storeId", input.storeId);
      if (input.storeName !== undefined && input.storeName.trim().length > 0) {
        url.searchParams.set("storeName", input.storeName);
      }

      const response = await fetcher(url.toString(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(await resolveHeaders(input.headers)),
        },
        body: JSON.stringify(batch),
      });
      const payload = (await response.json().catch(() => undefined)) as
        | { results?: unknown }
        | undefined;

      if (!response.ok) {
        throw new Error("Central sync rejected the command batch.");
      }

      return SyncTransportResultSchema.array().parse(payload?.results);
    },
  };
}

async function resolveHeaders(
  headers:
    | SyncTransportHeaders
    | (() => SyncTransportHeaders | Promise<SyncTransportHeaders>)
    | undefined,
): Promise<Record<string, string>> {
  const resolved = typeof headers === "function" ? await headers() : headers;
  return resolved ?? {};
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//.test(trimmed)) {
    throw new Error("Sync API base URL must be an absolute HTTP URL.");
  }

  return trimmed;
}
