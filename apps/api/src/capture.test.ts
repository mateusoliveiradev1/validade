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

function prepareTurnRequest() {
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
