import { createInMemoryCaptureRepository } from "@validade-zero/database/capture-repository";
import { describe, expect, it } from "vitest";
import { FakeAuthProvider, createInMemoryMembershipRepository } from "./auth";
import { createApiApp } from "./index";

const NOW = "2030-01-10T12:30:00.000Z";

describe("capture prepare-turn API", () => {
  it("serves the central package for the store resolved from the session", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct("loja-piloto")],
      lots: [centralLot("loja-piloto")],
      tasks: [centralTask("loja-piloto")],
      resolvedHistory: [],
      conflicts: [],
    });
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([leadMembership("loja-piloto")]),
      captureRepository,
      now: () => new Date(NOW),
    });

    const response = await app.request("/capture/prepare-turn", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(prepareTurnRequest()),
    });
    const body = (await response.json()) as {
      store?: { storeId?: string; readiness?: string };
      products?: unknown[];
      lots?: unknown[];
      activeTasks?: unknown[];
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      store: { storeId: "loja-piloto", readiness: "prepared" },
    });
    expect(body.products).toHaveLength(1);
    expect(body.lots).toHaveLength(1);
    expect(body.activeTasks).toHaveLength(1);
    expect(JSON.stringify(body)).not.toMatch(/uri|base64|objectKey|photoUri|imageBytes/i);
    expect(captureRepository.readAuditEvents()).toContainEqual(
      expect.objectContaining({
        type: "sync.changed",
        sanitized: true,
        storeId: "loja-piloto",
      }),
    );
    expect(captureRepository.readDeviceSnapshots()).toContainEqual(
      expect.objectContaining({
        deviceId: "device-pilot-001",
        storeId: "loja-piloto",
        pendingCommandCount: 2,
        source: "central",
      }),
    );
  });

  it("keeps an empty central package in needs-review instead of safe", async () => {
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([leadMembership("loja-piloto")]),
      captureRepository: createInMemoryCaptureRepository(),
      now: () => new Date(NOW),
    });

    const response = await app.request("/capture/prepare-turn", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(prepareTurnRequest()),
    });
    const body = (await response.json()) as {
      store?: { readiness?: string };
      cache?: { state?: string };
    };

    expect(response.status).toBe(200);
    expect(body.store?.readiness).toBe("needs_review");
    expect(body.cache?.state).toBe("needs_first_central_read");
  });

  it("denies cross-store prepare-turn attempts without leaking central facts", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct("loja-outra")],
      lots: [centralLot("loja-outra")],
      tasks: [centralTask("loja-outra")],
    });
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([leadMembership("loja-piloto")]),
      captureRepository,
      now: () => new Date(NOW),
    });

    const response = await app.request("/capture/prepare-turn?storeId=loja-outra", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(prepareTurnRequest()),
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      error: "access_denied",
      reason: "outside_store_scope",
    });
    expect(JSON.stringify(body)).not.toMatch(/Morango|LOTE-MORANGO|Bearer|authorization/i);
    expect(captureRepository.readAuditEvents()).toContainEqual(
      expect.objectContaining({
        type: "access.denied",
        reason: "outside_store_scope",
        sanitized: true,
      }),
    );
  });

  it("rejects forged store scope in the prepare-turn body", async () => {
    const response = await createApiApp().request("/capture/prepare-turn", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...prepareTurnRequest(),
        storeId: "loja-piloto",
      }),
    });

    expect(response.status).toBe(400);
  });
});

describe("capture product catalog API", () => {
  it("serves the shared category catalog without store-scoped category copies", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      categories: [
        {
          categoryId: "frutas",
          categoryName: "Frutas",
          categoryRuleProfile: {
            categoryId: "frutas",
            mode: "formal_validity",
            windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
          },
        },
      ],
    });
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([leadMembership("loja-piloto")]),
      captureRepository,
      now: () => new Date(NOW),
    });

    const response = await app.request("/capture/categories", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as { categories?: Array<{ categoryId?: string }> };

    expect(response.status).toBe(200);
    expect(body.categories).toEqual([expect.objectContaining({ categoryId: "frutas" })]);

    const denied = await app.request("/capture/categories?storeId=loja-outra", {
      headers: { authorization: "Bearer fake:lead-local" },
    });

    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({
      error: "access_denied",
      reason: "outside_store_scope",
    });
  });

  it("searches products only inside the store resolved from the session", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct("loja-piloto"), centralProduct("loja-outra")],
    });
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([leadMembership("loja-piloto")]),
      captureRepository,
      now: () => new Date(NOW),
    });

    const response = await app.request("/capture/products/search", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(productSearchRequest("Morango FICTICIO")),
    });
    const body = (await response.json()) as {
      reusableProducts?: Array<{ centralProductId?: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.reusableProducts).toEqual([
      expect.objectContaining({ centralProductId: "product-loja-piloto" }),
    ]);
    expect(JSON.stringify(body)).not.toContain("loja-outra");

    const denied = await app.request("/capture/products/search?storeId=loja-outra", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(productSearchRequest("Morango FICTICIO")),
    });

    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({
      error: "access_denied",
      reason: "outside_store_scope",
    });
  });

  it("returns duplicate and similar product states before creating drafts", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [
        {
          ...centralProduct("loja-piloto"),
          gtin: "7890000000001",
          normalizedKey: "morango ficticio",
        },
      ],
    });
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([leadMembership("loja-piloto")]),
      captureRepository,
      now: () => new Date(NOW),
    });

    const duplicate = await app.request("/capture/products/drafts", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(
        productDraftRequest({
          displayName: "Morango bandeja FICTICIO",
          gtin: "7890000000001",
        }),
      ),
    });
    const duplicateBody = (await duplicate.json()) as {
      outcome?: string;
      duplicateReason?: string;
    };

    expect(duplicate.status).toBe(200);
    expect(duplicateBody).toMatchObject({
      outcome: "reuse_existing",
      duplicateReason: "gtin",
    });

    const similar = await app.request("/capture/products/drafts", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(productDraftRequest({ displayName: "Morango Organico FICTICIO" })),
    });
    const similarBody = (await similar.json()) as {
      outcome?: string;
      similarCandidates?: Array<{ centralProductId: string }>;
    };

    expect(similar.status).toBe(200);
    expect(similarBody).toMatchObject({
      outcome: "similar_found",
      similarCandidates: [expect.objectContaining({ centralProductId: "product-loja-piloto" })],
    });

    const draft = await app.request("/capture/products/drafts", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(
        productDraftRequest({
          displayName: "Morango Organico FICTICIO",
          similarCandidateIds: ["product-loja-piloto"],
        }),
      ),
    });
    const draftBody = (await draft.json()) as {
      outcome?: string;
      draft?: { reviewStatus?: string };
    };

    expect(draft.status).toBe(200);
    expect(draftBody).toMatchObject({
      outcome: "draft_pending_review",
      draft: { reviewStatus: "pending_review" },
    });
    expect(captureRepository.readAuditEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "product",
          action: "product.draft_created",
          sanitized: true,
        }),
      ]),
    );
  });

  it("allows lead and admin catalog review but denies collaborators", async () => {
    const captureRepository = createInMemoryCaptureRepository();
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([
        leadMembership("loja-piloto"),
        collaboratorMembership("loja-piloto"),
        adminMembership("loja-piloto"),
      ]),
      captureRepository,
      now: () => new Date(NOW),
    });
    const created = await app.request("/capture/products/drafts", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(productDraftRequest({ displayName: "Produto Revisao FICTICIO" })),
    });
    const createdBody = (await created.json()) as { draft?: { draftId?: string } };
    const draftId = createdBody.draft?.draftId ?? "draft-nao-criado";

    const denied = await app.request(`/capture/products/drafts/${draftId}/review`, {
      method: "POST",
      headers: {
        authorization: "Bearer fake:collaborator-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        draftId,
        decision: "approve",
        reviewedAt: NOW,
      }),
    });

    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({
      error: "access_denied",
      reason: "capability_not_allowed",
    });

    const reviewedByAdmin = await app.request(`/capture/products/drafts/${draftId}/review`, {
      method: "POST",
      headers: {
        authorization: "Bearer fake:admin-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        draftId,
        decision: "approve",
        reviewedAt: NOW,
      }),
    });
    const reviewedByAdminBody = (await reviewedByAdmin.json()) as {
      draft?: { reviewStatus?: string };
      acknowledgement?: { state?: string };
    };

    expect(reviewedByAdmin.status).toBe(200);
    expect(reviewedByAdminBody).toMatchObject({
      draft: { reviewStatus: "validated" },
      acknowledgement: { state: "validated" },
    });
  });

  it("rejects forged product store authority in request bodies", async () => {
    const response = await createApiApp().request("/capture/products/drafts", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...productDraftRequest(),
        storeId: "loja-injetada",
      }),
    });

    expect(response.status).toBe(400);
  });
});

describe("capture central lot API", () => {
  it("creates a central lot idempotently and exposes it to a second prepare-turn", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct("loja-piloto")],
    });
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([leadMembership("loja-piloto")]),
      captureRepository,
      now: () => new Date(NOW),
    });

    const first = await app.request("/capture/lots", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(centralLotCreateRequest({ idempotencyKey: "lot-api-idem-001" })),
    });
    const firstBody = (await first.json()) as {
      lot?: { centralLotId?: string };
      taskProjection?: { attention?: string; riskState?: string };
    };
    const replay = await app.request("/capture/lots", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(centralLotCreateRequest({ idempotencyKey: "lot-api-idem-001" })),
    });
    const replayBody = (await replay.json()) as { lot?: { centralLotId?: string } };
    const secondPrepare = await app.request("/capture/prepare-turn", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(prepareTurnRequest({ deviceId: "device-second-002" })),
    });
    const packageBody = (await secondPrepare.json()) as {
      lots?: unknown[];
      activeTasks?: Array<{ centralLotId?: string; riskState?: string }>;
    };

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(firstBody.taskProjection).toMatchObject({
      attention: "active_task",
      riskState: "expired",
    });
    expect(replayBody.lot?.centralLotId).toBe(firstBody.lot?.centralLotId);
    expect(secondPrepare.status).toBe(200);
    expect(packageBody.lots).toHaveLength(1);
    expect(packageBody.activeTasks).toEqual([
      expect.objectContaining({
        centralLotId: firstBody.lot?.centralLotId,
        riskState: "expired",
      }),
    ]);
  });

  it("does not accept cross-store product or lot ids on central lot writes", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct("loja-outra")],
      lots: [centralLot("loja-outra")],
    });
    const app = createApiApp({
      authProvider: new FakeAuthProvider(),
      membershipRepository: createInMemoryMembershipRepository([leadMembership("loja-piloto")]),
      captureRepository,
      now: () => new Date(NOW),
    });

    const createDenied = await app.request("/capture/lots", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify(
        centralLotCreateRequest({
          productId: "product-loja-outra",
          idempotencyKey: "cross-product-idem",
        }),
      ),
    });
    const observationDenied = await app.request("/capture/lots/lot-loja-outra/observations", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        idempotencyKey: "cross-observation-idem",
        observation: {
          status: "present",
          actorLabel: "Pessoa Piloto",
          occurredAt: NOW,
          location: { kind: "area_de_venda" },
          isCorrection: false,
          quantityState: "estimated",
          approximateQuantity: 4,
        },
      }),
    });

    expect(createDenied.status).toBe(404);
    expect(await createDenied.json()).toEqual({ error: "central_product_not_found" });
    expect(observationDenied.status).toBe(404);
    expect(await observationDenied.json()).toEqual({ error: "central_lot_not_found" });
  });

  it("rejects forged store scope in central lot bodies", async () => {
    const response = await createApiApp().request("/capture/lots", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...centralLotCreateRequest(),
        storeId: "loja-injetada",
      }),
    });

    expect(response.status).toBe(400);
  });
});

function prepareTurnRequest(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: "device-pilot-001",
    requestedAt: NOW,
    appVersion: "phase-10-test",
    localSnapshot: {
      lastCentralReadAt: "2030-01-10T10:00:00.000Z",
      knownProductCount: 1,
      knownLotCount: 1,
      pendingCommandCount: 2,
    },
    ...overrides,
  };
}

function productSearchRequest(query: string) {
  return {
    query,
    requestedAt: NOW,
  };
}

function productDraftRequest(overrides: Record<string, unknown> = {}) {
  return {
    displayName: "Morango Organico FICTICIO",
    categoryId: "frutas",
    categoryName: "Frutas",
    categoryRuleProfile: {
      categoryId: "frutas",
      mode: "formal_validity",
      windows: {
        radarDays: 60,
        markdownDays: 15,
        criticalDays: 3,
        expiredDays: 0,
      },
    },
    requestedAt: NOW,
    ...overrides,
  };
}

function centralLotCreateRequest(overrides: Record<string, unknown> = {}) {
  const { productId, lot, ...requestOverrides } = overrides;
  const defaultLot = {
    productId: typeof productId === "string" ? productId : "product-loja-piloto",
    identity: {
      identitySource: "printed",
      value: "LOTE-MORANGO-EXPIRADO",
    },
    approximateQuantity: 5,
    initialLocation: { kind: "area_de_venda" },
    mode: "formal_validity",
    expiresAt: "2030-01-09",
    receivedAt: "2030-01-08",
  };

  return {
    lot:
      typeof lot === "object" && lot !== null && !Array.isArray(lot)
        ? { ...defaultLot, ...lot }
        : defaultLot,
    actorLabel: "Pessoa Piloto",
    occurredAt: NOW,
    idempotencyKey: "lot-api-idem-default",
    ...requestOverrides,
  };
}

function leadMembership(storeId: string) {
  return {
    subjectId: "lead-local",
    role: "lead" as const,
    storeId,
    storeName: storeId === "loja-piloto" ? "Loja Piloto" : "Loja Outra",
    status: "active" as const,
  };
}

function collaboratorMembership(storeId: string) {
  return {
    subjectId: "collaborator-local",
    role: "collaborator" as const,
    storeId,
    storeName: storeId === "loja-piloto" ? "Loja Piloto" : "Loja Outra",
    status: "active" as const,
  };
}

function adminMembership(storeId: string) {
  return {
    subjectId: "admin-local",
    role: "admin" as const,
    storeId,
    storeName: storeId === "loja-piloto" ? "Loja Piloto" : "Loja Outra",
    status: "active" as const,
  };
}

function centralProduct(storeId: string) {
  return {
    storeId,
    centralProductId: `product-${storeId}`,
    displayName: "Morango FICTICIO",
    categoryId: "frutas",
    categoryName: "Frutas",
    status: "validated" as const,
    state: "synchronized" as const,
    source: "central" as const,
    updatedAt: NOW,
    categoryRuleProfile: {
      categoryId: "frutas",
      mode: "formal_validity" as const,
      windows: {
        radarDays: 60,
        markdownDays: 15,
        criticalDays: 3,
        expiredDays: 0,
      },
    },
  };
}

function centralLot(storeId: string) {
  return {
    storeId,
    centralLotId: `lot-${storeId}`,
    centralProductId: `product-${storeId}`,
    productDisplayName: "Morango FICTICIO",
    lotIdentity: {
      identitySource: "printed" as const,
      value: "LOTE-MORANGO-FICTICIO",
    },
    mode: "formal_validity" as const,
    currentLocation: { kind: "area_de_venda" as const },
    state: "synchronized" as const,
    source: "central" as const,
    riskState: "expired" as const,
    expiresAt: "2030-01-09",
    approximateQuantity: 8,
    updatedAt: NOW,
  };
}

function centralTask(storeId: string) {
  return {
    storeId,
    centralTaskId: `task-${storeId}`,
    activeKey: `lot-${storeId}:expired:withdraw_or_loss:root`,
    centralLotId: `lot-${storeId}`,
    productDisplayName: "Morango FICTICIO",
    currentLocation: { kind: "area_de_venda" as const },
    riskState: "expired" as const,
    severity: "critical" as const,
    requiredResolution: "withdraw_or_loss" as const,
    state: "synchronized" as const,
    source: "central" as const,
    ownerLabel: "Equipe do turno",
    dueAt: NOW,
    updatedAt: NOW,
  };
}
