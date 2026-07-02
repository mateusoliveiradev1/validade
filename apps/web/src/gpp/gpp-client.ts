import {
  GppBaixaRequestSchema,
  GppDetailSnapshotSchema,
  GppDivergenceMarkRequestSchema,
  GppHistoryRowSchema,
  GppMutationResponseSchema,
  GppPurchaseAttendanceRequestSchema,
  GppQueueSnapshotSchema,
  type GppBaixaRequest,
  type GppDetailSnapshot,
  type GppDivergenceMarkRequest,
  type GppHistoryRow,
  type GppMutationResponse,
  type GppPurchaseAttendanceRequest,
  type GppQueueSnapshot,
} from "@validade-zero/contracts";
import type { WebFetcher } from "../auth/authenticated-fetch";

export interface GppClient {
  readQueue(input: { storeId: string }): Promise<GppQueueSnapshot>;
  readDetail(input: { storeId: string; groupId: string }): Promise<GppDetailSnapshot>;
  readHistory(input: { storeId: string; limit?: number }): Promise<readonly GppHistoryRow[]>;
  baixarAvarias(input: GppBaixaRequest): Promise<GppMutationResponse>;
  markDivergence(input: GppDivergenceMarkRequest): Promise<GppMutationResponse>;
  reviewCorrection(input: GppReviewCorrectionRequest): Promise<GppMutationResponse>;
  attendPurchase(input: GppPurchaseAttendanceRequest): Promise<GppMutationResponse>;
}

export interface GppReviewCorrectionRequest {
  avariaId: string;
  approved: boolean;
  justification: string;
  occurredAt: string;
  idempotencyKey: string;
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
    async readDetail(input) {
      const response = await fetcher(
        `/gpp/detail/${encodeURIComponent(input.groupId)}?storeId=${encodeURIComponent(input.storeId)}`,
      );
      const payload: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error("Nao foi possivel carregar os detalhes GPP.");
      }

      return GppDetailSnapshotSchema.parse(payload);
    },
    async readHistory(input) {
      const params = new URLSearchParams({ storeId: input.storeId });
      if (input.limit !== undefined) params.set("limit", String(input.limit));
      const response = await fetcher(`/gpp/history?${params.toString()}`);
      const payload: unknown = await response.json().catch(() => undefined);

      if (!response.ok || !isHistoryPayload(payload)) {
        throw new Error("Nao foi possivel atualizar o historico GPP.");
      }

      return payload.history.map((row) => GppHistoryRowSchema.parse(row));
    },
    async baixarAvarias(input) {
      return postMutation(fetcher, "/gpp/avarias/baixa", GppBaixaRequestSchema.parse(input));
    },
    async markDivergence(input) {
      const parsed = GppDivergenceMarkRequestSchema.parse(input);
      return postMutation(
        fetcher,
        `/gpp/avarias/${encodeURIComponent(parsed.avariaId)}/divergence`,
        parsed,
      );
    },
    async reviewCorrection(input) {
      return postMutation(fetcher, `/gpp/avarias/${encodeURIComponent(input.avariaId)}/review`, {
        approved: input.approved,
        justification: input.justification,
        occurredAt: input.occurredAt,
        idempotencyKey: input.idempotencyKey,
      });
    },
    async attendPurchase(input) {
      const parsed = GppPurchaseAttendanceRequestSchema.parse(input);
      return postMutation(
        fetcher,
        `/gpp/purchases/${encodeURIComponent(parsed.purchaseRequestId)}/attendance`,
        parsed,
      );
    },
  };
}

async function postMutation(
  fetcher: WebFetcher,
  path: string,
  body: unknown,
): Promise<GppMutationResponse> {
  const response = await fetcher(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => undefined);
  const mutationResponse = mutationResponseFromPayload(payload);

  if (mutationResponse !== undefined) {
    return mutationResponse;
  }

  if (!response.ok) {
    throw new Error("Nao conseguimos salvar agora.");
  }

  throw new Error("Resposta GPP invalida.");
}

function mutationResponseFromPayload(payload: unknown): GppMutationResponse | undefined {
  if (!isRecord(payload) || !("response" in payload)) {
    return undefined;
  }

  return GppMutationResponseSchema.parse(payload.response);
}

function isHistoryPayload(value: unknown): value is { history: readonly unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { history?: unknown }).history)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
