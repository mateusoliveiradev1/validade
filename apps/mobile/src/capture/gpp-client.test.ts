import { describe, expect, it, vi } from "vitest";

import { GPP_COPY } from "./gpp-copy";
import {
  classifyGppMutationResponse,
  createFetchGppClient,
  type GppCreateRequest,
} from "./gpp-client";

const avariaRequest = {
  storeId: "loja-18",
  sector: "FLV",
  product: { code: "789000000001", name: "Maca FICTICIA" },
  quantity: { value: 2, unit: "kg" },
  finality: "baixa_gpp",
  destination: "Controle GPP",
  occurredAt: "2030-01-10T09:00:00.000Z",
  idempotencyKey: "gpp-avaria-001",
} as const;

const purchaseRequest = {
  storeId: "loja-18",
  sector: "FLV",
  product: { name: "Banana prata FICTICIA" },
  requestedQuantity: { value: 3, unit: "caixa" },
  finality: "Reposicao da avaria",
  requestedAt: "2030-01-10T09:05:00.000Z",
  idempotencyKey: "gpp-compra-001",
} as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GPP mobile client", () => {
  it("parses central confirmed and replayed mutation states as central success", () => {
    expect(
      classifyGppMutationResponse({
        state: "central_confirmed",
        requestId: "req-1",
        confirmedAt: "2030-01-10T09:00:00.000Z",
      }),
    ).toMatchObject({ state: "central_success", copy: GPP_COPY.centralSuccess });
    expect(
      classifyGppMutationResponse({
        state: "replayed",
        requestId: "req-1",
        replayedAt: "2030-01-10T09:01:00.000Z",
      }),
    ).toMatchObject({ state: "central_success", copy: GPP_COPY.replayedSuccess });
  });

  it("requires the avaria product code and accepts purchase requests without product code", async () => {
    const fetcher = vi.fn(() =>
      jsonResponse({
        response: {
          state: "central_confirmed",
          requestId: "req-1",
          confirmedAt: "2030-01-10T09:00:00.000Z",
        },
      }),
    );
    const client = createFetchGppClient({
      baseUrl: "https://api.example.test",
      fetcher,
    });

    await expect(client.createGppAvaria(avariaRequest)).resolves.toMatchObject({
      state: "central_success",
    });
    expect(() =>
      client.createGppAvaria({
        ...avariaRequest,
        product: { name: "Sem codigo" },
      } as never),
    ).toThrow();
    await expect(client.createGppPurchaseRequest(purchaseRequest)).resolves.toMatchObject({
      state: "central_success",
    });
  });

  it("keeps validation, authorization, feature flag, and business-rule failures central", async () => {
    const statuses = [400, 422, 401, 403, 503] as const;
    for (const status of statuses) {
      const fetcher = vi.fn(() => jsonResponse({ error: "central recusou" }, status));
      const client = createFetchGppClient({
        baseUrl: "https://api.example.test",
        fetcher,
      });
      await expect(client.createGppAvaria(avariaRequest)).resolves.toMatchObject({
        state: "central_failure",
      });
    }

    const fetcher = vi.fn(() =>
      jsonResponse({
        response: {
          state: "central_failed",
          requestId: "req-2",
          failedAt: "2030-01-10T09:10:00.000Z",
          retryable: true,
          message: "Saldo insuficiente",
        },
      }),
    );
    const client = createFetchGppClient({
      baseUrl: "https://api.example.test",
      fetcher,
    });
    await expect(client.createGppAvaria(avariaRequest)).resolves.toMatchObject({
      state: "central_failure",
      reason: "business_rule",
      retryable: true,
    });
  });

  it("returns an offline-pending candidate only for transport failures", async () => {
    const fetcher = vi.fn(() => {
      throw new TypeError("Network request failed");
    });
    const client = createFetchGppClient({
      baseUrl: "https://api.example.test",
      fetcher,
    });
    await expect(client.createGppPurchaseRequest(purchaseRequest)).resolves.toMatchObject({
      state: "offline_pending_candidate",
      kind: "purchase",
      request: purchaseRequest satisfies GppCreateRequest,
      idempotencyKey: purchaseRequest.idempotencyKey,
      message: "Pendente neste aparelho",
    });
  });
});
