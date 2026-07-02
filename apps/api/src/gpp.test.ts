import { createInMemoryGppRepository } from "@validade-zero/database/gpp-repository";
import type { StoreMembership } from "@validade-zero/domain";
import { describe, expect, it } from "vitest";
import { createInMemoryAuditRepository } from "./audit";
import { FakeAuthProvider, createInMemoryMembershipRepository } from "./auth";
import type { GppRealtimePublisher } from "./gpp";
import { createApiApp } from "./index";

const NOW = "2030-01-10T12:30:00.000Z";

describe("GPP API", () => {
  it("keeps GPP routes inaccessible while the feature flag is disabled", async () => {
    const app = createGppApp();

    const response = await app.request("/gpp/queue?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:gpp-local" },
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("gpp_disabled");
  });

  it("requires GPP read capability, store scope, and central availability for reads", async () => {
    const collaboratorApp = createGppApp({ enabled: true });
    const collaborator = await collaboratorApp.request("/gpp/queue?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:collaborator-local" },
    });

    expect(collaborator.status).toBe(403);

    const crossStoreApp = createGppApp({ enabled: true });
    const crossStore = await crossStoreApp.request("/gpp/queue?storeId=loja-999", {
      headers: { authorization: "Bearer fake:gpp-local" },
    });
    const crossStoreBody = (await crossStore.json()) as { reason?: string };

    expect(crossStore.status).toBe(403);
    expect(crossStoreBody.reason).toBe("outside_store_scope");

    const failingRepository = {
      ...createInMemoryGppRepository(),
      readQueue: () => Promise.reject(new Error("database down")),
    };
    const unavailableApp = createGppApp({
      enabled: true,
      repository: failingRepository,
    });
    const unavailable = await unavailableApp.request("/gpp/queue?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:gpp-local" },
    });
    const unavailableBody = (await unavailable.json()) as { message?: string };

    expect(unavailable.status).toBe(503);
    expect(unavailableBody.message).toMatch(/Central indisponivel/);
  });

  it("allows collaborator create and own-pending correction but denies baixa and other-owner edits", async () => {
    const repository = createInMemoryGppRepository();
    const auditRepository = createInMemoryAuditRepository();
    const app = createGppApp({ enabled: true, repository, auditRepository });

    const created = await app.request("/gpp/avarias", {
      method: "POST",
      headers: collaboratorHeaders(),
      body: JSON.stringify(avariaCreateRequest("colab-avaria-001")),
    });
    const createdBody = (await created.json()) as {
      response?: { state?: string };
      data?: { avariaId?: string };
    };

    expect(created.status, JSON.stringify(createdBody)).toBe(200);
    expect(createdBody.response?.state).toBe("central_confirmed");
    expect(repository.readEntries()).toHaveLength(1);

    const corrected = await app.request(`/gpp/avarias/${createdBody.data?.avariaId}/correct`, {
      method: "POST",
      headers: collaboratorHeaders(),
      body: JSON.stringify({
        correctedQuantity: { value: 1.5, unit: "kg" },
        justification: "Ajuste conferido fisicamente.",
        occurredAt: NOW,
        idempotencyKey: "colab-correct-own-001",
      }),
    });

    expect(corrected.status).toBe(200);

    await repository.createAvaria({
      requestId: "avaria-other-owner",
      store: storeScope(),
      actor: {
        actorId: "other-local",
        displayName: "Outro colaborador",
        roleSnapshot: "collaborator",
      },
      request: avariaCreateRequest("other-owner-001"),
    });

    const deniedCorrection = await app.request("/gpp/avarias/avaria-other-owner/correct", {
      method: "POST",
      headers: collaboratorHeaders(),
      body: JSON.stringify({
        correctedQuantity: { value: 1, unit: "kg" },
        justification: "Tentativa sobre item de outro colaborador.",
        occurredAt: NOW,
        idempotencyKey: "colab-correct-other-001",
      }),
    });

    expect(deniedCorrection.status).toBe(403);

    const deniedBaixa = await app.request("/gpp/avarias/baixa", {
      method: "POST",
      headers: collaboratorHeaders(),
      body: JSON.stringify(
        baixaRequest("colab-baixa-denied-001", [createdBody.data?.avariaId ?? ""]),
      ),
    });

    expect(deniedBaixa.status).toBe(403);
    expect(
      auditRepository.readEvents().filter((event) => event.type === "gpp.changed"),
    ).toHaveLength(2);
  });

  it("enforces GPP divergence review before baixa and records audit metadata", async () => {
    const repository = createInMemoryGppRepository();
    const auditRepository = createInMemoryAuditRepository();
    const publisher = createRecordingPublisher();
    const app = createGppApp({ enabled: true, repository, auditRepository, publisher });

    const created = await app.request("/gpp/avarias", {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify(avariaCreateRequest("gpp-avaria-001")),
    });
    const createdBody = (await created.json()) as { data?: { avariaId?: string } };
    const avariaId = createdBody.data?.avariaId ?? "missing";

    const divergence = await app.request(`/gpp/avarias/${avariaId}/divergence`, {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify({
        reason: "quantidade_diferente",
        observation: "Saldo fisico divergente.",
        correctedQuantity: { value: 2, unit: "kg" },
        occurredAt: NOW,
        idempotencyKey: "gpp-divergence-001",
      }),
    });

    expect(divergence.status, await divergence.text()).toBe(200);

    const blockedBaixa = await app.request("/gpp/avarias/baixa", {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify(baixaRequest("gpp-baixa-blocked-001", [avariaId])),
    });

    expect(blockedBaixa.status).toBe(409);

    const corrected = await app.request(`/gpp/avarias/${avariaId}/correct`, {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify({
        correctedQuantity: { value: 2, unit: "kg" },
        justification: "Correcao conferida pelo GPP.",
        occurredAt: NOW,
        idempotencyKey: "gpp-correct-001",
      }),
    });
    const reviewed = await app.request(`/gpp/avarias/${avariaId}/review`, {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify({
        approved: true,
        justification: "Revisao aprovada pelo GPP.",
        occurredAt: NOW,
        idempotencyKey: "gpp-review-001",
      }),
    });
    const baixa = await app.request("/gpp/avarias/baixa", {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify(baixaRequest("gpp-baixa-001", [avariaId])),
    });

    expect(corrected.status).toBe(200);
    expect(reviewed.status).toBe(200);
    expect(baixa.status).toBe(200);
    expect(repository.readEntries()[0]?.status).toBe("baixado");
    expect(publisher.events).toHaveLength(5);
    expect(auditRepository.readEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "gpp.changed",
          target: expect.objectContaining({ type: "gpp_avaria", id: avariaId }),
          metadata: expect.objectContaining({
            action: "gpp.avaria.baixado",
            previousState: expect.any(String),
            nextState: expect.any(String),
          }),
        }),
      ]),
    );
  });

  it("keeps compras internas separate from avarias and validates attendance requirements", async () => {
    const repository = createInMemoryGppRepository();
    const auditRepository = createInMemoryAuditRepository();
    const app = createGppApp({ enabled: true, repository, auditRepository });

    const created = await app.request("/gpp/purchases", {
      method: "POST",
      headers: collaboratorHeaders(),
      body: JSON.stringify(purchaseCreateRequest("purchase-001")),
    });
    const missingProduct = await app.request(
      "/gpp/purchases/gpp-purchase:purchase-001/attendance",
      {
        method: "POST",
        headers: gppHeaders(),
        body: JSON.stringify({
          action: "atendido",
          purchaseRequestId: "gpp-purchase:purchase-001",
          attendedQuantity: { value: 2, unit: "kg" },
          occurredAt: NOW,
          idempotencyKey: "purchase-attend-invalid-001",
        }),
      },
    );
    const attended = await app.request("/gpp/purchases/gpp-purchase:purchase-001/attendance", {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify({
        action: "atendido",
        purchaseRequestId: "gpp-purchase:purchase-001",
        confirmedProduct: { code: "162", name: "Tomate selecionado" },
        attendedQuantity: { value: 2, unit: "kg" },
        occurredAt: NOW,
        idempotencyKey: "purchase-attend-001",
      }),
    });

    expect(created.status, await created.text()).toBe(200);
    expect(missingProduct.status).toBe(400);
    expect(attended.status).toBe(200);
    expect(repository.readEntries()).toHaveLength(0);
    expect(repository.readPurchases()[0]).toMatchObject({
      purchaseRequestId: "gpp-purchase:purchase-001",
      status: "atendido",
    });
    expect(auditRepository.readEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: expect.objectContaining({ type: "gpp_purchase_request" }),
          metadata: expect.objectContaining({ action: "gpp.purchase.atendido" }),
        }),
      ]),
    );
  });

  it("publishes realtime only after central mutation and audit append, not on replay or audit failure", async () => {
    const repository = createInMemoryGppRepository();
    const auditRepository = createInMemoryAuditRepository();
    const publisher = createRecordingPublisher();
    const app = createGppApp({ enabled: true, repository, auditRepository, publisher });

    const first = await app.request("/gpp/avarias", {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify(avariaCreateRequest("replay-avaria-001")),
    });
    const replay = await app.request("/gpp/avarias", {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify(avariaCreateRequest("replay-avaria-001")),
    });
    const replayBody = (await replay.json()) as { replayed?: boolean };

    expect(first.status, await first.text()).toBe(200);
    expect(replay.status).toBe(200);
    expect(replayBody.replayed).toBe(true);
    expect(
      auditRepository.readEvents().filter((event) => event.type === "gpp.changed"),
    ).toHaveLength(1);
    expect(publisher.events).toHaveLength(1);

    const failingAudit = createInMemoryAuditRepository();
    const failingPublisher = createRecordingPublisher();
    const failingApp = createGppApp({
      enabled: true,
      repository: createInMemoryGppRepository(),
      auditRepository: {
        ...failingAudit,
        append: () => Promise.reject(new Error("audit down")),
      },
      publisher: failingPublisher,
    });
    const failed = await failingApp.request("/gpp/avarias", {
      method: "POST",
      headers: gppHeaders(),
      body: JSON.stringify(avariaCreateRequest("audit-fail-avaria-001")),
    });

    expect(failed.status).toBe(503);
    expect(failingPublisher.events).toHaveLength(0);
  });
});

function createGppApp(
  input: {
    enabled?: boolean;
    repository?: ReturnType<typeof createInMemoryGppRepository>;
    auditRepository?: ReturnType<typeof createInMemoryAuditRepository>;
    publisher?: GppRealtimePublisher;
  } = {},
) {
  return createApiApp({
    authProvider: new FakeAuthProvider(),
    membershipRepository: createInMemoryMembershipRepository([
      membership("collaborator-local", "collaborator"),
      membership("lead-local", "lead"),
      membership("gpp-local", "gpp"),
      membership("admin-local", "admin"),
    ]),
    gppRepository: input.repository ?? createInMemoryGppRepository(),
    auditRepository: input.auditRepository ?? createInMemoryAuditRepository(),
    gppRealtimePublisher: input.publisher,
    runtimeConfig: { controleGppEnabled: input.enabled === true },
    now: () => new Date(NOW),
  });
}

function createRecordingPublisher(): GppRealtimePublisher & {
  events: Array<Parameters<GppRealtimePublisher["publish"]>[0]>;
} {
  const events: Array<Parameters<GppRealtimePublisher["publish"]>[0]> = [];

  return {
    events,
    publish(event) {
      events.push(event);
      return Promise.resolve();
    },
  };
}

function collaboratorHeaders() {
  return {
    authorization: "Bearer fake:collaborator-local",
    "content-type": "application/json",
  };
}

function gppHeaders() {
  return {
    authorization: "Bearer fake:gpp-local",
    "content-type": "application/json",
  };
}

function storeScope() {
  return {
    storeId: "loja-piloto",
    storeName: "Loja Ficticia Piloto",
  };
}

function membership(
  subjectId: string,
  role: StoreMembership["role"],
  storeId = "loja-piloto",
): StoreMembership {
  return {
    subjectId,
    role,
    storeId,
    storeName: storeId === "loja-piloto" ? "Loja Ficticia Piloto" : storeId,
    status: "active",
  };
}

function avariaCreateRequest(idempotencyKey: string) {
  return {
    storeId: "loja-piloto",
    sector: "FLV",
    product: { code: "162", name: "Banana prata" },
    quantity: { value: 2, unit: "kg" },
    finality: "baixa_gpp",
    destination: "Caixa GPP",
    occurredAt: NOW,
    idempotencyKey,
  };
}

function baixaRequest(idempotencyKey: string, avariaIds: readonly string[]) {
  return {
    avariaIds: [...avariaIds],
    occurredAt: NOW,
    idempotencyKey,
    justification: "Baixa conferida fisicamente pelo GPP.",
  };
}

function purchaseCreateRequest(idempotencyKey: string) {
  return {
    storeId: "loja-piloto",
    sector: "Pizzaria",
    product: { name: "Tomate selecionado" },
    requestedQuantity: { value: 2, unit: "kg" },
    finality: "Preparo de pizza",
    requestedAt: NOW,
    idempotencyKey,
  };
}
