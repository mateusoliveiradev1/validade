import { describe, expect, it, vi } from "vitest";
import type { PrepareTurnResponse } from "@validade-zero/contracts";
import { createMemoryCaptureRepository } from "./memory-repository";
import {
  PendingCentralLotSyncError,
  pendingCentralLotWriteBlocker,
  productDraftToLocalRecord,
} from "./repository";

const categoryRuleProfile = {
  categoryId: "categoria-ficticia-folhas",
  mode: "flv_inspection" as const,
  windows: {
    radarDays: 7,
    markdownDays: 3,
    criticalDays: 1,
    expiredDays: 0,
    qualityWindowDays: 2,
  },
};

function createDeterministicRepository() {
  const identifiers = [
    "produto-ficticio-001",
    "lote-ficticio-001",
    "observacao-inicial-ficticia-001",
    "observacao-correcao-ficticia-002",
    "observacao-incerta-ficticia-003",
  ];

  return createMemoryCaptureRepository({
    clock: () => "2030-01-10T09:00:00.000Z",
    createId: () => identifiers.shift() ?? "identificador-ficticio-extra",
  });
}

function preparedRecentLotResponse({
  activeTask = false,
  resolvedHistory = false,
}: {
  activeTask?: boolean;
  resolvedHistory?: boolean;
}): PrepareTurnResponse {
  const centralLotId = "lote-central-recentes-001";
  const centralProductId = "produto-central-recentes-001";
  const generatedAt = "2030-01-10T09:05:00.000Z";
  const product = {
    centralProductId,
    displayName: "Mamao Recentes FICTICIO",
    categoryId: "categoria-ficticia-frutas",
    categoryName: "Frutas",
    categoryRuleProfile: {
      categoryId: "categoria-ficticia-frutas",
      mode: "formal_validity",
      windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
    },
    status: "validated",
    state: "synchronized",
    source: "central",
    updatedAt: generatedAt,
  } satisfies PrepareTurnResponse["products"][number];
  const lot = {
    centralLotId,
    centralProductId,
    productDisplayName: product.displayName,
    lotIdentity: { identitySource: "printed", value: "LOTE-RECENTES-001" },
    mode: "formal_validity",
    currentLocation: { kind: "area_de_venda" },
    state: "synchronized",
    source: "central",
    riskState: "critical",
    expiresAt: "2030-01-10",
    receivedAt: "2030-01-09",
    approximateQuantity: 2,
    updatedAt: generatedAt,
  } satisfies PrepareTurnResponse["lots"][number];
  const active = {
    centralTaskId: "tarefa-central-recentes-ativa-001",
    activeKey: `${centralLotId}:critical:check_presence:central`,
    centralLotId,
    productDisplayName: product.displayName,
    currentLocation: { kind: "area_de_venda" },
    riskState: "critical",
    severity: "high",
    requiredResolution: "check_presence",
    state: "synchronized",
    source: "central",
    ownerLabel: "Equipe do turno",
    updatedAt: generatedAt,
  } satisfies PrepareTurnResponse["activeTasks"][number];
  const resolved = {
    centralTaskId: "tarefa-central-recentes-resolvida-001",
    centralLotId,
    productDisplayName: product.displayName,
    lotIdentity: lot.lotIdentity,
    currentLocation: lot.currentLocation,
    action: "confirm_presence",
    actorLabel: "Lideranca FICTICIA",
    resolvedAt: "2030-01-10T09:10:00.000Z",
    state: "resolved",
    source: "central",
  } satisfies PrepareTurnResponse["resolvedHistory"][number];

  return {
    requestId: `prepare-turn-recentes-${activeTask ? "ativo" : "sem-ativo"}-${
      resolvedHistory ? "resolvido" : "sem-resolvido"
    }`,
    store: {
      storeId: "loja-ficticia",
      storeName: "Loja FICTICIA",
      centralVersion: 1,
      generatedAt,
      centralReadAt: generatedAt,
      source: "central",
      readiness: "prepared",
      blockers: [],
    },
    device: {
      deviceId: "validade-zero-mobile:loja-ficticia",
      preparedAt: generatedAt,
      lastCentralReadAt: generatedAt,
      lastHydratedAt: generatedAt,
      pendingCommandCount: 0,
      conflictCount: 0,
      source: "central",
    },
    cache: {
      state: "ready",
      source: "central",
      updatedAt: generatedAt,
      lastCentralReadAt: generatedAt,
      staleAfterHours: 4,
      productCount: 1,
      lotCount: 1,
      activeTaskCount: activeTask ? 1 : 0,
      conflictCount: 0,
      resolvedHistoryCount: resolvedHistory ? 1 : 0,
    },
    products: [product],
    lots: [lot],
    activeTasks: activeTask ? [active] : [],
    resolvedHistory: resolvedHistory ? [resolved] : [],
    conflicts: [],
  };
}

describe("memory capture repository", () => {
  it("classifies pending central lot write failures without blaming every case on permission", () => {
    const noPermission = Object.assign(new Error("no_permission"), { code: "no_permission" });
    const sessionExpired = Object.assign(new Error("session_expired"), {
      code: "session_expired",
    });

    expect(pendingCentralLotWriteBlocker(noPermission)).toBe("central_lot_auth_required");
    expect(pendingCentralLotWriteBlocker(sessionExpired)).toBe("central_lot_auth_required");
    expect(pendingCentralLotWriteBlocker(new Error("central_product_not_found"))).toBe(
      "central_product_not_ready",
    );
    expect(
      pendingCentralLotWriteBlocker(
        Object.assign(new Error("central_product_not_found"), { code: "network" }),
      ),
    ).toBe("central_product_not_ready");
    expect(pendingCentralLotWriteBlocker(new Error("invalid_central_lot_request"))).toBe(
      "central_lot_local_replay_failed",
    );
    expect(pendingCentralLotWriteBlocker(new Error("network unavailable"))).toBe(
      "central_lot_network_unavailable",
    );
    expect(pendingCentralLotWriteBlocker(new Error("central_lot_unavailable"))).toBe(
      "central_lot_write_failed",
    );
    expect(pendingCentralLotWriteBlocker(new Error("central denied"))).toBe(
      "central_lot_write_failed",
    );
  });

  it("ranks frequent products by registered lots with a stable name tie-breaker", async () => {
    let nextIdentifier = 1;
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => `identificador-ficticio-${nextIdentifier++}`,
    });
    const profile = {
      categoryId: "categoria-ficticia-ovos",
      mode: "formal_validity" as const,
      windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
    };
    const banana = await repository.createProduct({
      displayName: "Banana Exemplo FICTICIA",
      categoryId: profile.categoryId,
      categoryRuleProfile: profile,
    });
    const abacate = await repository.createProduct({
      displayName: "Abacate Exemplo FICTICIA",
      categoryId: profile.categoryId,
      categoryRuleProfile: profile,
    });

    async function registerLot(productId: string, identity: string): Promise<void> {
      await repository.saveLot({
        lot: {
          productId,
          identity: { identitySource: "generated_internal", value: identity },
          mode: "formal_validity",
          expiresAt: "2030-02-10",
          receivedAt: "2030-01-10",
          approximateQuantity: 4,
          initialLocation: { kind: "area_de_venda" },
        },
        actorLabel: "Colaboradora Exemplo FICTICIA",
      });
    }

    await registerLot(banana.id, "LOTE-FICTICIO-BANANA-001");
    await registerLot(banana.id, "LOTE-FICTICIO-BANANA-002");
    await registerLot(abacate.id, "LOTE-FICTICIO-ABACATE-001");

    await expect(repository.listFrequentProducts?.()).resolves.toEqual([banana, abacate]);
  });

  it("searches products and retains append-only observations with the latest snapshot", async () => {
    const repository = createDeterministicRepository();
    await repository.initialize();

    const product = await repository.createProduct({
      displayName: "Alface Crespa Exemplo FICTICIA",
      categoryId: "categoria-ficticia-folhas",
      categoryRuleProfile,
      gtin: "7890000000001",
    });

    await expect(repository.findProducts("ALFACE")).resolves.toEqual([product]);
    await expect(repository.findProducts("7890000000001")).resolves.toEqual([product]);

    const otherProduct = await repository.createProduct({
      displayName: "Ovos Brancos Exemplo FICTICIA",
      categoryId: "categoria-ficticia-ovos",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-ovos",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
    });

    const lot = await repository.saveLot({
      lot: {
        productId: product.id,
        identity: {
          identitySource: "generated_internal",
          value: "INTERNO-FICTICIO-ALFACE-001",
        },
        mode: "flv_inspection",
        receivedAt: "2030-01-10",
        qualityWindowDays: 2,
        approximateQuantity: 14,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora Exemplo FICTICIA",
    });

    expect(lot.identity).toEqual({
      identitySource: "generated_internal",
      value: "INTERNO-FICTICIO-ALFACE-001",
    });
    expect(lot.currentObservation.status).toBe("present");
    expect(lot.currentObservation.occurredAt).toBe("2030-01-10T09:00:00.000Z");

    await repository.appendObservation(lot.id, {
      status: "moved",
      actorLabel: "Colaboradora Exemplo FICTICIA",
      occurredAt: "2030-01-10T10:00:00.000Z",
      location: { kind: "camara_fria" },
      quantityState: "estimated",
      approximateQuantity: 12,
      isCorrection: true,
      correctionReason: "Local inicial registrado incorretamente na conferencia FICTICIA.",
    });

    const afterCorrection = await repository.loadLotDetail(lot.id);

    expect(afterCorrection?.observations).toHaveLength(2);
    expect(afterCorrection?.observations[0]?.occurredAt).toBe("2030-01-10T09:00:00.000Z");
    expect(afterCorrection?.currentObservation).toMatchObject({
      status: "moved",
      location: { kind: "camara_fria" },
      quantityState: "estimated",
      approximateQuantity: 12,
    });

    await repository.appendObservation(lot.id, {
      status: "not_found",
      actorLabel: "Colaboradora Exemplo FICTICIA",
      occurredAt: "2030-01-10T11:00:00.000Z",
      location: { kind: "camara_fria" },
      quantityState: "not_estimable",
      isCorrection: false,
    });

    const detail = await repository.loadLotDetail(lot.id);

    expect(detail).not.toBeNull();
    expect(detail?.observations).toHaveLength(3);
    expect(detail?.observations[0]?.occurredAt).toBe("2030-01-10T09:00:00.000Z");
    expect(detail?.currentObservation).toMatchObject({
      status: "not_found",
      location: { kind: "camara_fria" },
      quantityState: "not_estimable",
    });
    expect(detail?.observations[1]).toMatchObject({
      status: "moved",
      isCorrection: true,
      correctionReason: "Local inicial registrado incorretamente na conferencia FICTICIA.",
    });
    await expect(repository.listRecentLots()).resolves.toEqual([
      expect.objectContaining({
        id: lot.id,
        currentObservation: expect.objectContaining({ quantityState: "not_estimable" }),
      }),
    ]);

    const frequentProducts = await repository.listFrequentProducts?.();
    const categories = await repository.listProductCategories?.();
    const productsByCategory = await repository.findProductsByCategory?.(
      "categoria-ficticia-folhas",
    );

    expect(frequentProducts).toEqual([product]);
    expect(categories).toEqual([
      {
        categoryId: "categoria-ficticia-folhas",
        categoryName: "categoria-ficticia-folhas",
        categoryRuleProfile,
        productCount: 1,
      },
      {
        categoryId: "categoria-ficticia-ovos",
        categoryName: "categoria-ficticia-ovos",
        categoryRuleProfile: {
          categoryId: "categoria-ficticia-ovos",
          mode: "formal_validity",
          windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
        },
        productCount: 1,
      },
    ]);
    expect(productsByCategory).toEqual([product]);
    expect(productsByCategory).not.toContain(otherProduct);
  });

  it("writes ready central-cache lots through the central API and clears projection after resolved ack", async () => {
    const createCentralLot = vi.fn((request) =>
      Promise.resolve({
        requestId: "write-lot-central-ficticio",
        lot: {
          centralLotId: "lote-central-alface-001",
          centralProductId: request.lot.productId,
          productDisplayName: "Alface Central FICTICIA",
          lotIdentity: request.lot.identity,
          mode: "formal_validity" as const,
          expiresAt: "2030-01-12",
          receivedAt: "2030-01-10",
          approximateQuantity: request.lot.approximateQuantity,
          initialLocation: request.lot.initialLocation,
          currentObservation: {
            centralObservationId: "observacao-central-alface-001",
            centralLotId: "lote-central-alface-001",
            status: "present" as const,
            actorLabel: request.actorLabel,
            occurredAt: request.occurredAt,
            location: request.lot.initialLocation,
            quantityState: "estimated" as const,
            approximateQuantity: request.lot.approximateQuantity,
            isCorrection: false,
          },
          lifecycleStatus: "active" as const,
          state: "synchronized" as const,
          source: "central" as const,
          riskState: "critical" as const,
          taskProjection: {
            attention: "active_task" as const,
            centralTaskId: "tarefa-central-alface-001",
            activeKey: "lote-central-alface-001:critical:check_presence:root",
            riskState: "critical" as const,
            severity: "high" as const,
            requiredResolution: "check_presence" as const,
            ownerLabel: "Equipe do turno",
            updatedAt: "2030-01-10T09:00:00.000Z",
          },
          createdAt: "2030-01-10T09:00:00.000Z",
          updatedAt: "2030-01-10T09:00:00.000Z",
        },
        taskProjection: {
          attention: "active_task" as const,
          centralTaskId: "tarefa-central-alface-001",
          activeKey: "lote-central-alface-001:critical:check_presence:root",
          riskState: "critical" as const,
          severity: "high" as const,
          requiredResolution: "check_presence" as const,
          ownerLabel: "Equipe do turno",
          updatedAt: "2030-01-10T09:00:00.000Z",
        },
        acknowledgement: {
          acknowledgementId: "ack-central-alface-001",
          centralLotId: "lote-central-alface-001",
          state: "synchronized" as const,
          acknowledgedAt: "2030-01-10T09:00:00.000Z",
          message: "Lote confirmado na central.",
        },
      }),
    );
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => "identificador-local-nao-usado",
      createCentralLot,
    });

    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-central-ficticio",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:00:00.000Z",
        centralReadAt: "2030-01-10T09:00:00.000Z",
        source: "central",
        readiness: "prepared",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:00:00.000Z",
        lastCentralReadAt: "2030-01-10T09:00:00.000Z",
        lastHydratedAt: "2030-01-10T09:00:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:00:00.000Z",
        lastCentralReadAt: "2030-01-10T09:00:00.000Z",
        staleAfterHours: 4,
        productCount: 1,
        lotCount: 0,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [
        {
          centralProductId: "produto-central-alface-001",
          displayName: "Alface Central FICTICIA",
          categoryId: categoryRuleProfile.categoryId,
          categoryName: "Folhas",
          categoryRuleProfile: {
            categoryId: "categoria-ficticia-folhas",
            mode: "formal_validity",
            windows: {
              radarDays: 60,
              markdownDays: 15,
              criticalDays: 3,
              expiredDays: 0,
            },
          },
          status: "validated",
          state: "synchronized",
          source: "central",
          updatedAt: "2030-01-10T09:00:00.000Z",
        },
      ],
      lots: [],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    const saved = await repository.saveLot({
      lot: {
        productId: "produto-central-alface-001",
        identity: { identitySource: "printed", value: "LOTE-CENTRAL-FICTICIO-001" },
        mode: "formal_validity",
        expiresAt: "2030-01-12",
        receivedAt: "2030-01-10",
        approximateQuantity: 9,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora Central FICTICIA",
    });

    expect(createCentralLot).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey:
          "mobile-lot:produto-central-alface-001:printed:LOTE-CENTRAL-FICTICIO-001:formal_validity:area_de_venda",
      }),
    );
    expect(saved).toMatchObject({
      id: "lote-central-alface-001",
      centralLotId: "lote-central-alface-001",
      centralSyncState: "synchronized",
      centralSource: "central",
      centralAcknowledgementMessage: "Lote confirmado na central.",
    });
    await expect(repository.listRecentLots()).resolves.toEqual([
      expect.objectContaining({ id: "lote-central-alface-001" }),
    ]);
    await expect(repository.listActiveTodayTasks()).resolves.toEqual([
      expect.objectContaining({
        id: "tarefa-central-alface-001",
        lotId: "lote-central-alface-001",
        requiredResolution: "check_presence",
      }),
    ]);

    const refreshed = await repository.refreshTodayTasks({
      currentDate: "2030-01-10",
      currentTimestamp: "2030-01-10T09:05:00.000Z",
      source: "manual_refresh",
    });

    expect(refreshed.tasks).toHaveLength(1);
    expect(refreshed.tasks[0]).toMatchObject({
      id: "tarefa-central-alface-001",
      lotId: "lote-central-alface-001",
      productDisplayName: "Alface Central FICTICIA",
    });
    await expect(repository.listActiveTodayTasks()).resolves.toHaveLength(1);

    const command = await repository.saveOfflineAction({
      kind: "resolve_task",
      payload: {
        taskId: "tarefa-central-alface-001",
        action: "confirm_presence",
        actorLabel: "Colaboradora Central FICTICIA",
        occurredAt: "2030-01-10T09:10:00.000Z",
      },
    });
    await repository.applySyncTransportResult({
      status: "ack",
      commandId: command.id,
      idempotencyKey: command.idempotencyKey,
      syncedAt: "2030-01-10T09:11:00.000Z",
      centralResult: {
        kind: "resolved_history",
        history: {
          centralTaskId: "tarefa-central-alface-001",
          activeKey: "lote-central-alface-001:critical:check_presence:root",
          lotId: "lote-central-alface-001",
          productDisplayName: "Alface Central FICTICIA",
          lotIdentity: { identitySource: "printed", value: "LOTE-CENTRAL-FICTICIO-001" },
          currentLocation: { kind: "area_de_venda" },
          action: "confirm_presence",
          actorLabel: "Colaboradora Central FICTICIA",
          occurredAt: "2030-01-10T09:10:00.000Z",
          resolutionState: "resolved",
          source: "central",
          updatedAt: "2030-01-10T09:11:00.000Z",
        },
      },
    });

    await expect(repository.loadTodayTask("tarefa-central-alface-001")).resolves.toMatchObject({
      status: "resolved",
      resolvedAt: "2030-01-10T09:10:00.000Z",
    });

    const afterResolvedRefresh = await repository.refreshTodayTasks({
      currentDate: "2030-01-10",
      currentTimestamp: "2030-01-10T09:12:00.000Z",
      source: "manual_refresh",
    });

    expect(afterResolvedRefresh.tasks).toHaveLength(0);
    const recentLots = await repository.listRecentLots();
    expect(recentLots[0]).toMatchObject({
      id: "lote-central-alface-001",
      centralSyncState: "resolved",
    });
    expect(recentLots[0]?.taskProjection).toBeUndefined();
  });

  it("reuses a hydrated central product by barcode and links a newly scanned code", async () => {
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => "identificador-local-nao-usado",
    });

    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-central-ficticio",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:00:00.000Z",
        centralReadAt: "2030-01-10T09:00:00.000Z",
        source: "central",
        readiness: "prepared",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:00:00.000Z",
        lastCentralReadAt: "2030-01-10T09:00:00.000Z",
        lastHydratedAt: "2030-01-10T09:00:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:00:00.000Z",
        lastCentralReadAt: "2030-01-10T09:00:00.000Z",
        staleAfterHours: 4,
        productCount: 1,
        lotCount: 0,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [
        {
          centralProductId: "produto-central-alface-001",
          displayName: "Alface Central FICTICIA",
          categoryId: "categoria-ficticia-folhas",
          categoryName: "Folhas",
          categoryRuleProfile,
          status: "validated",
          state: "synchronized",
          source: "central",
          updatedAt: "2030-01-10T09:00:00.000Z",
          identifiers: [
            {
              type: "barcode",
              value: "7890000000099",
              normalizedValue: "7890000000099",
              source: "central",
              isPrimary: true,
            },
          ],
        },
      ],
      lots: [],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    const existingCodeLookup = await repository.searchCentralProducts?.({
      identifier: { type: "barcode", value: "7890000000099" },
      requestedAt: "2030-01-10T09:00:00.000Z",
    });
    expect(existingCodeLookup).toMatchObject({
      resultState: "reuse_available",
      reusableProducts: [
        {
          centralProductId: "produto-central-alface-001",
          matchReasons: ["exact_identifier"],
        },
      ],
    });

    const reusedProduct = await repository.createProductDraft?.({
      displayName: "Alface Central FICTICIA",
      categoryId: "categoria-ficticia-folhas",
      categoryName: "Folhas",
      categoryRuleProfile,
      requestedAt: "2030-01-10T09:00:00.000Z",
      identifiers: [{ type: "barcode", value: "7890000000100" }],
    });
    expect(reusedProduct).toMatchObject({
      outcome: "reuse_existing",
      reusableProduct: {
        centralProductId: "produto-central-alface-001",
        identifiers: expect.arrayContaining([
          expect.objectContaining({ type: "barcode", value: "7890000000100" }),
        ]),
      },
    });

    const newCodeLookup = await repository.searchCentralProducts?.({
      identifier: { type: "barcode", value: "7890000000100" },
      requestedAt: "2030-01-10T09:00:00.000Z",
    });
    expect(newCodeLookup).toMatchObject({
      resultState: "reuse_available",
      reusableProducts: [{ centralProductId: "produto-central-alface-001" }],
    });
  });

  it("saves lots for pending product drafts without writing draft ids to central", async () => {
    const identifiers = [
      "produto-rascunho-local-001",
      "lote-rascunho-local-001",
      "observacao-rascunho-local-001",
    ];
    const createCentralLot = vi.fn(() => Promise.reject(new Error("central should not be used")));
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => identifiers.shift() ?? "identificador-rascunho-extra",
      createCentralLot,
    });
    const response = await repository.createProductDraft?.({
      displayName: "Couve Rascunho FICTICIA",
      categoryId: "categoria-ficticia-folhas",
      categoryName: "Folhas",
      categoryRuleProfile,
      requestedAt: "2030-01-10T09:00:00.000Z",
    });

    if (response?.draft === undefined) {
      throw new Error("Expected a pending central draft.");
    }

    const draftProduct = productDraftToLocalRecord(response.draft);
    const snapshot = await repository.saveLot({
      lot: {
        productId: draftProduct.id,
        identity: { identitySource: "printed", value: "LOTE-RASCUNHO-FICTICIO-001" },
        mode: "formal_validity",
        expiresAt: "2030-01-12",
        receivedAt: "2030-01-10",
        approximateQuantity: 6,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora Rascunho FICTICIA",
    });

    expect(createCentralLot).not.toHaveBeenCalled();
    expect(snapshot.productId).toBe("produto-rascunho-local-001");
    expect(snapshot.centralSyncState).toBe("pending_central");
    expect(snapshot.centralSource).toBe("pending_central");
    await expect(repository.listSyncQueue()).resolves.toMatchObject({
      state: "has_pending",
      totalCount: 1,
      mediumCount: 1,
      commands: [],
    });
    await expect(repository.loadLotDetail(snapshot.id)).resolves.toMatchObject({
      id: "lote-rascunho-local-001",
      product: {
        centralProductId: draftProduct.id,
        reviewStatus: "pending_review",
      },
    });
  });

  it("replays an existing pending lot once its draft product is validated under the central product id", async () => {
    const createCentralLot = vi.fn((request) =>
      Promise.resolve({
        requestId: "write-pending-lot-central-ficticio",
        lot: {
          centralLotId: "lote-central-melao-001",
          centralProductId: request.lot.productId,
          productDisplayName: "Melao Amarelo KG PED FICTICIO",
          lotIdentity: request.lot.identity,
          mode: "formal_validity" as const,
          expiresAt: "2030-01-12",
          receivedAt: "2030-01-10",
          approximateQuantity: request.lot.approximateQuantity,
          initialLocation: request.lot.initialLocation,
          currentObservation: {
            centralObservationId: "observacao-central-melao-001",
            centralLotId: "lote-central-melao-001",
            status: "present" as const,
            actorLabel: request.actorLabel,
            occurredAt: request.occurredAt,
            location: request.lot.initialLocation,
            quantityState: "estimated" as const,
            approximateQuantity: request.lot.approximateQuantity,
            isCorrection: false,
          },
          lifecycleStatus: "active" as const,
          state: "synchronized" as const,
          source: "central" as const,
          riskState: "radar" as const,
          taskProjection: {
            attention: "future_attention" as const,
            riskState: "radar" as const,
            observedAt: "2030-01-10T09:00:00.000Z",
          },
          createdAt: "2030-01-10T09:00:00.000Z",
          updatedAt: "2030-01-10T09:00:00.000Z",
        },
        taskProjection: {
          attention: "future_attention" as const,
          riskState: "radar" as const,
          observedAt: "2030-01-10T09:00:00.000Z",
        },
        acknowledgement: {
          acknowledgementId: "ack-central-melao-001",
          centralLotId: "lote-central-melao-001",
          state: "synchronized" as const,
          acknowledgedAt: "2030-01-10T09:00:00.000Z",
          message: "Lote confirmado na central.",
        },
      }),
    );
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: (() => {
        const identifiers = ["produto-melao-local", "lote-melao-local", "obs-melao-local"];
        return () => identifiers.shift() ?? "id-melao-extra";
      })(),
      createCentralLot,
    });
    const draftResponse = await repository.createProductDraft?.({
      displayName: "Melao Amarelo KG PED FICTICIO",
      categoryId: "categoria-ficticia-frutas",
      categoryName: "Frutas",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-frutas",
        mode: "formal_validity",
        windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
      },
      requestedAt: "2030-01-10T09:00:00.000Z",
    });

    if (draftResponse?.draft === undefined) {
      throw new Error("Expected draft product.");
    }

    const validatedCentralProductId = "product:loja-ficticia:melao-amarelo-kg-ped-ficticio";
    const pendingLot = await repository.saveLot({
      lot: {
        productId: draftResponse.draft.centralProductId,
        identity: { identitySource: "generated_internal", value: "INTERNO-LOCAL-MELAO" },
        mode: "formal_validity",
        expiresAt: "2030-01-12",
        receivedAt: "2030-01-10",
        approximateQuantity: 4,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaborador local",
    });

    expect(pendingLot.centralSyncState).toBe("pending_central");
    expect(createCentralLot).not.toHaveBeenCalled();

    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-melao-validado",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:05:00.000Z",
        centralReadAt: "2030-01-10T09:05:00.000Z",
        source: "central",
        readiness: "prepared",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        lastHydratedAt: "2030-01-10T09:05:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        staleAfterHours: 4,
        productCount: 1,
        lotCount: 0,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [
        {
          centralProductId: validatedCentralProductId,
          displayName: "Melao Amarelo KG PED FICTICIO",
          categoryId: "categoria-ficticia-frutas",
          categoryName: "Frutas",
          categoryRuleProfile: {
            categoryId: "categoria-ficticia-frutas",
            mode: "formal_validity",
            windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
          },
          status: "validated",
          state: "synchronized",
          source: "central",
          updatedAt: "2030-01-10T09:05:00.000Z",
        },
      ],
      lots: [],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    await expect(repository.syncPendingCentralLots?.()).resolves.toEqual([
      expect.objectContaining({
        id: "lote-central-melao-001",
        centralSyncState: "synchronized",
        centralSource: "central",
      }),
    ]);
    expect(createCentralLot).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey:
          "mobile-lot:product:loja-ficticia:melao-am:INTERNO-LOCAL-MELAO:formal_validity:area_de_venda:01yemza4",
      }),
    );
    await expect(repository.listRecentLots()).resolves.toEqual([
      expect.objectContaining({ id: "lote-central-melao-001" }),
    ]);
  });

  it("clears a pending local lot when prepare-turn already returns the matching central lot", async () => {
    const createCentralLot = vi.fn(() => Promise.reject(new Error("central should not be called")));
    const identifiers = ["produto-melancia-local", "lote-melancia-local", "obs-melancia-local"];
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => identifiers.shift() ?? "id-melancia-extra",
      createCentralLot,
    });
    const categoryProfile = {
      categoryId: "reembalados-fracionados-loja",
      mode: "processed_repack_loss" as const,
      windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
    };
    const draftResponse = await repository.createProductDraft?.({
      displayName: "Melancia KG PED",
      categoryId: "reembalados-fracionados-loja",
      categoryName: "Reembalados fracionados loja",
      categoryRuleProfile: categoryProfile,
      storePresentation: "store_fractioned_repacked",
      requestedAt: "2030-01-10T09:00:00.000Z",
    });

    if (draftResponse?.draft === undefined) {
      throw new Error("Expected draft product.");
    }

    const pendingLot = await repository.saveLot({
      lot: {
        productId: draftResponse.draft.centralProductId,
        identity: { identitySource: "generated_internal", value: "INTERNO-LOCAL-MELANCIA" },
        mode: "processed_repack_loss",
        expiresAt: "2030-01-12",
        receivedAt: "2030-01-10",
        approximateQuantity: 1,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaborador local",
    });

    expect(pendingLot.centralSyncState).toBe("pending_central");
    await expect(repository.listSyncQueue()).resolves.toMatchObject({ totalCount: 1 });

    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-melancia-ja-central",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:05:00.000Z",
        centralReadAt: "2030-01-10T09:05:00.000Z",
        source: "central",
        readiness: "prepared",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        lastHydratedAt: "2030-01-10T09:05:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        staleAfterHours: 4,
        productCount: 1,
        lotCount: 1,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [
        {
          centralProductId: "product:loja-ficticia:melancia-kg-ped",
          displayName: "Melancia KG PED",
          categoryId: "reembalados-fracionados-loja",
          categoryName: "Reembalados fracionados loja",
          categoryRuleProfile: categoryProfile,
          status: "validated",
          state: "synchronized",
          source: "central",
          updatedAt: "2030-01-10T09:05:00.000Z",
        },
      ],
      lots: [
        {
          centralLotId: "lote-central-melancia-001",
          centralProductId: "product:loja-ficticia:melancia-kg-ped",
          productDisplayName: "Melancia KG PED",
          lotIdentity: { identitySource: "generated_internal", value: "INTERNO-LOCAL-MELANCIA" },
          mode: "processed_repack_loss",
          currentLocation: { kind: "area_de_venda" },
          state: "synchronized",
          source: "central",
          riskState: "radar",
          expiresAt: "2030-01-12",
          receivedAt: "2030-01-10",
          approximateQuantity: 1,
          updatedAt: "2030-01-10T09:05:00.000Z",
        },
      ],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    await expect(repository.listSyncQueue()).resolves.toMatchObject({ totalCount: 0 });
    await expect(repository.syncPendingCentralLots?.()).resolves.toEqual([]);
    expect(createCentralLot).not.toHaveBeenCalled();
    await expect(repository.listRecentLots()).resolves.toEqual([
      expect.objectContaining({
        id: "lote-central-melancia-001",
        centralSyncState: "synchronized",
        centralSource: "central",
      }),
    ]);
  });

  it("removes stale local tasks when prepare-turn replaces a pending local lot with central truth", async () => {
    const identifiers = [
      "produto-melancia-local",
      "lote-melancia-local",
      "obs-melancia-local",
      "tarefa-melancia-local",
    ];
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => identifiers.shift() ?? "id-melancia-extra",
    });
    const categoryProfile = {
      categoryId: "reembalados-fracionados-loja",
      mode: "processed_repack_loss" as const,
      windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
    };
    const draftResponse = await repository.createProductDraft?.({
      displayName: "Melancia KG PED",
      categoryId: "reembalados-fracionados-loja",
      categoryName: "Reembalados fracionados loja",
      categoryRuleProfile: categoryProfile,
      storePresentation: "store_fractioned_repacked",
      requestedAt: "2030-01-10T09:00:00.000Z",
    });

    if (draftResponse?.draft === undefined) {
      throw new Error("Expected draft product.");
    }

    await repository.saveLot({
      lot: {
        productId: draftResponse.draft.centralProductId,
        identity: { identitySource: "generated_internal", value: "INTERNO-LOCAL-MELANCIA" },
        mode: "processed_repack_loss",
        expiresAt: "2030-01-10",
        receivedAt: "2030-01-09",
        approximateQuantity: 1,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaborador local",
    });

    const localRefresh = await repository.refreshTodayTasks({
      currentDate: "2030-01-10",
      currentTimestamp: "2030-01-10T09:00:00.000Z",
      source: "today_open",
    });
    expect(localRefresh.tasks).toHaveLength(1);
    expect(localRefresh.tasks[0]?.id).toBe("tarefa-melancia-local");

    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-melancia-central-substitui-local",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:05:00.000Z",
        centralReadAt: "2030-01-10T09:05:00.000Z",
        source: "central",
        readiness: "prepared",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        lastHydratedAt: "2030-01-10T09:05:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        staleAfterHours: 4,
        productCount: 1,
        lotCount: 1,
        activeTaskCount: 1,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [
        {
          centralProductId: "product:loja-ficticia:melancia-kg-ped",
          displayName: "Melancia KG PED",
          categoryId: "reembalados-fracionados-loja",
          categoryName: "Reembalados fracionados loja",
          categoryRuleProfile: categoryProfile,
          status: "validated",
          state: "synchronized",
          source: "central",
          updatedAt: "2030-01-10T09:05:00.000Z",
        },
      ],
      lots: [
        {
          centralLotId: "lote-central-melancia-001",
          centralProductId: "product:loja-ficticia:melancia-kg-ped",
          productDisplayName: "Melancia KG PED",
          lotIdentity: { identitySource: "generated_internal", value: "INTERNO-LOCAL-MELANCIA" },
          mode: "processed_repack_loss",
          currentLocation: { kind: "area_de_venda" },
          state: "synchronized",
          source: "central",
          riskState: "critical",
          expiresAt: "2030-01-10",
          receivedAt: "2030-01-09",
          approximateQuantity: 1,
          updatedAt: "2030-01-10T09:05:00.000Z",
        },
      ],
      activeTasks: [
        {
          centralTaskId: "tarefa-central-melancia-001",
          activeKey: "lote-central-melancia-001:critical:check_presence:central",
          centralLotId: "lote-central-melancia-001",
          productDisplayName: "Melancia KG PED",
          currentLocation: { kind: "area_de_venda" },
          riskState: "critical",
          severity: "high",
          requiredResolution: "check_presence",
          state: "synchronized",
          source: "central",
          ownerLabel: "Equipe do turno",
          updatedAt: "2030-01-10T09:05:00.000Z",
        },
      ],
      resolvedHistory: [],
      conflicts: [],
    });

    const centralRefresh = await repository.refreshTodayTasks({
      currentDate: "2030-01-10",
      currentTimestamp: "2030-01-10T09:06:00.000Z",
      source: "today_open",
    });

    expect(centralRefresh.tasks).toHaveLength(1);
    expect(centralRefresh.tasks[0]).toMatchObject({
      id: "tarefa-central-melancia-001",
      lotId: "lote-central-melancia-001",
      sync: expect.objectContaining({ state: "synced" }),
    });
    await expect(repository.listActiveTodayTasks()).resolves.toEqual([
      expect.objectContaining({ id: "tarefa-central-melancia-001" }),
    ]);
  });

  it("keeps centrally resolved lots visible in recent history as resolved", async () => {
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => "id-nao-usado",
    });

    await repository.hydratePrepareTurn?.(
      preparedRecentLotResponse({ resolvedHistory: true, activeTask: false }),
    );

    await expect(repository.listRecentLots()).resolves.toEqual([
      expect.objectContaining({
        id: "lote-central-recentes-001",
        centralSyncState: "resolved",
        centralSource: "central",
        centralAcknowledgementMessage: expect.stringContaining(
          "Resolvido na central por Lideranca FICTICIA",
        ),
      }),
    ]);
    await expect(repository.listActiveTodayTasks()).resolves.toEqual([]);
  });

  it("does not mark recent lots as resolved while central still sends an active task", async () => {
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => "id-nao-usado",
    });

    await repository.hydratePrepareTurn?.(
      preparedRecentLotResponse({ resolvedHistory: true, activeTask: true }),
    );

    await expect(repository.listRecentLots()).resolves.toEqual([
      expect.objectContaining({
        id: "lote-central-recentes-001",
        centralSyncState: "synchronized",
      }),
    ]);
    await expect(repository.listActiveTodayTasks()).resolves.toEqual([
      expect.objectContaining({ id: "tarefa-central-recentes-ativa-001" }),
    ]);
  });

  it("replays a pending lot after central search finds a reusable product missing from local cache", async () => {
    const alhoCategoryProfile = {
      categoryId: "alho-inteiro-embalado-fornecedor",
      mode: "formal_validity" as const,
      windows: { radarDays: 90, markdownDays: 30, criticalDays: 7, expiredDays: 0 },
    };
    const searchCentralProducts = vi.fn(() =>
      Promise.resolve({
        requestId: "search-central-alho-ficticio",
        normalizedQuery: "alho inteiro embalado ficticio",
        resultState: "reuse_available" as const,
        reusableProducts: [
          {
            centralProductId: "produto-central-alho-inteiro-001",
            displayName: "Alho Inteiro Embalado FICTICIO",
            normalizedKey: "alho inteiro embalado ficticio",
            categoryId: "alho-inteiro-embalado-fornecedor",
            categoryName: "Alho inteiro embalado pelo fornecedor",
            categoryRuleProfile: alhoCategoryProfile,
            source: "central" as const,
            reviewStatus: "validated" as const,
            syncState: "synchronized" as const,
            updatedAt: "2030-01-10T09:06:00.000Z",
            storePresentation: "supplier_packaged" as const,
            matchKind: "reusable_central" as const,
            matchReasons: ["exact_normalized_name" as const],
          },
        ],
        similarCandidates: [],
      }),
    );
    const createCentralLot = vi.fn((request) =>
      Promise.resolve({
        requestId: "write-alho-central-ficticio",
        lot: {
          centralLotId: "lote-central-alho-inteiro-001",
          centralProductId: request.lot.productId,
          productDisplayName: "Alho Inteiro Embalado FICTICIO",
          lotIdentity: request.lot.identity,
          mode: "formal_validity" as const,
          expiresAt: request.lot.expiresAt,
          receivedAt: request.lot.receivedAt,
          approximateQuantity: request.lot.approximateQuantity,
          initialLocation: request.lot.initialLocation,
          currentObservation: {
            centralObservationId: "observacao-central-alho-inteiro-001",
            centralLotId: "lote-central-alho-inteiro-001",
            status: "present" as const,
            actorLabel: request.actorLabel,
            occurredAt: request.occurredAt,
            location: request.lot.initialLocation,
            quantityState: "estimated" as const,
            approximateQuantity: request.lot.approximateQuantity,
            isCorrection: false,
          },
          lifecycleStatus: "active" as const,
          state: "synchronized" as const,
          source: "central" as const,
          riskState: "radar" as const,
          taskProjection: {
            attention: "future_attention" as const,
            riskState: "radar" as const,
            observedAt: "2030-01-10T09:00:00.000Z",
          },
          createdAt: "2030-01-10T09:00:00.000Z",
          updatedAt: "2030-01-10T09:00:00.000Z",
        },
        taskProjection: {
          attention: "future_attention" as const,
          riskState: "radar" as const,
          observedAt: "2030-01-10T09:00:00.000Z",
        },
        acknowledgement: {
          acknowledgementId: "ack-central-alho-inteiro-001",
          centralLotId: "lote-central-alho-inteiro-001",
          state: "synchronized" as const,
          acknowledgedAt: "2030-01-10T09:00:00.000Z",
          message: "Lote confirmado na central.",
        },
      }),
    );
    const identifiers = ["produto-alho-local", "lote-alho-local", "obs-alho-local"];
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => identifiers.shift() ?? "id-alho-extra",
      createCentralLot,
      searchCentralProducts,
    });
    const draftResponse = await repository.createProductDraft?.({
      displayName: "Alho Inteiro Embalado FICTICIO",
      categoryId: "alho-inteiro-embalado-fornecedor",
      categoryName: "Alho inteiro embalado pelo fornecedor",
      categoryRuleProfile: alhoCategoryProfile,
      storePresentation: "supplier_packaged",
      requestedAt: "2030-01-10T09:00:00.000Z",
    });

    if (draftResponse?.draft === undefined) {
      throw new Error("Expected draft product.");
    }

    const pendingLot = await repository.saveLot({
      lot: {
        productId: draftResponse.draft.centralProductId,
        identity: { identitySource: "printed", value: "LOTE-ALHO-FICTICIO-001" },
        mode: "formal_validity",
        expiresAt: "2030-04-10",
        receivedAt: "2030-01-10",
        approximateQuantity: 10,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora local",
    });

    expect(pendingLot.centralSyncState).toBe("pending_central");
    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-alho-sem-produto-cache",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:05:00.000Z",
        centralReadAt: "2030-01-10T09:05:00.000Z",
        source: "central",
        readiness: "cache_ready",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        lastHydratedAt: "2030-01-10T09:05:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        staleAfterHours: 4,
        productCount: 0,
        lotCount: 0,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [],
      lots: [],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    await expect(repository.syncPendingCentralLots?.()).resolves.toEqual([
      expect.objectContaining({
        id: "lote-central-alho-inteiro-001",
        centralSyncState: "synchronized",
        centralSource: "central",
      }),
    ]);
    expect(searchCentralProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Alho Inteiro Embalado FICTICIO",
        categoryId: "alho-inteiro-embalado-fornecedor",
        includeDrafts: true,
      }),
    );
    expect(createCentralLot).toHaveBeenCalledWith(
      expect.objectContaining({
        lot: expect.objectContaining({ productId: "produto-central-alho-inteiro-001" }),
      }),
    );
  });

  it("retries product lookup without category before leaving a pending lot blocked", async () => {
    const localCategoryProfile = {
      categoryId: "categoria-local-pedidos",
      mode: "formal_validity" as const,
      windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
    };
    const approvedCategoryProfile = {
      categoryId: "categoria-central-higienizados",
      mode: "formal_validity" as const,
      windows: { radarDays: 45, markdownDays: 10, criticalDays: 2, expiredDays: 0 },
    };
    const searchCentralProducts = vi.fn((request) =>
      Promise.resolve(
        request.categoryId === undefined
          ? {
              requestId: "search-central-cabotia-sem-categoria",
              normalizedQuery: "cabotia kg ped",
              resultState: "reuse_available" as const,
              reusableProducts: [
                {
                  centralProductId: "produto-central-cabotia-validado",
                  displayName: "Cabotia KG PED",
                  normalizedKey: "cabotia kg ped",
                  categoryId: "categoria-central-higienizados",
                  categoryName: "Higienizados",
                  categoryRuleProfile: approvedCategoryProfile,
                  source: "central" as const,
                  reviewStatus: "validated" as const,
                  syncState: "synchronized" as const,
                  updatedAt: "2030-01-10T09:06:00.000Z",
                  matchKind: "reusable_central" as const,
                  matchReasons: ["exact_normalized_name" as const],
                },
              ],
              similarCandidates: [],
            }
          : {
              requestId: "search-central-cabotia-com-categoria",
              normalizedQuery: "cabotia kg ped",
              resultState: "no_safe_reuse" as const,
              reusableProducts: [],
              similarCandidates: [],
            },
      ),
    );
    const createCentralLot = vi.fn((request) =>
      Promise.resolve({
        requestId: "write-cabotia-central-ficticio",
        lot: {
          centralLotId: "lote-central-cabotia-001",
          centralProductId: request.lot.productId,
          productDisplayName: "Cabotia KG PED",
          lotIdentity: request.lot.identity,
          mode: "formal_validity" as const,
          expiresAt: request.lot.expiresAt,
          receivedAt: request.lot.receivedAt,
          approximateQuantity: request.lot.approximateQuantity,
          initialLocation: request.lot.initialLocation,
          currentObservation: {
            centralObservationId: "observacao-central-cabotia-001",
            centralLotId: "lote-central-cabotia-001",
            status: "present" as const,
            actorLabel: request.actorLabel,
            occurredAt: request.occurredAt,
            location: request.lot.initialLocation,
            quantityState: "estimated" as const,
            approximateQuantity: request.lot.approximateQuantity,
            isCorrection: false,
          },
          lifecycleStatus: "active" as const,
          state: "synchronized" as const,
          source: "central" as const,
          riskState: "radar" as const,
          taskProjection: {
            attention: "future_attention" as const,
            riskState: "radar" as const,
            observedAt: "2030-01-10T09:00:00.000Z",
          },
          createdAt: "2030-01-10T09:00:00.000Z",
          updatedAt: "2030-01-10T09:00:00.000Z",
        },
        taskProjection: {
          attention: "future_attention" as const,
          riskState: "radar" as const,
          observedAt: "2030-01-10T09:00:00.000Z",
        },
        acknowledgement: {
          acknowledgementId: "ack-central-cabotia-001",
          centralLotId: "lote-central-cabotia-001",
          state: "synchronized" as const,
          acknowledgedAt: "2030-01-10T09:00:00.000Z",
          message: "Lote confirmado na central.",
        },
      }),
    );
    const identifiers = ["produto-cabotia-local", "lote-cabotia-local", "obs-cabotia-local"];
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => identifiers.shift() ?? "id-cabotia-extra",
      createCentralLot,
      searchCentralProducts,
    });
    const draftResponse = await repository.createProductDraft?.({
      displayName: "Cabotia KG PED",
      categoryId: "categoria-local-pedidos",
      categoryName: "Pedidos",
      categoryRuleProfile: localCategoryProfile,
      requestedAt: "2030-01-10T09:00:00.000Z",
    });

    if (draftResponse?.draft === undefined) {
      throw new Error("Expected draft product.");
    }

    const pendingLot = await repository.saveLot({
      lot: {
        productId: draftResponse.draft.centralProductId,
        identity: { identitySource: "printed", value: "LOTE-CABOTIA-FICTICIO-001" },
        mode: "formal_validity",
        expiresAt: "2030-02-10",
        receivedAt: "2030-01-10",
        approximateQuantity: 6,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora local",
    });

    expect(pendingLot.centralSyncState).toBe("pending_central");
    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-cabotia-sem-produto-cache",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:05:00.000Z",
        centralReadAt: "2030-01-10T09:05:00.000Z",
        source: "central",
        readiness: "cache_ready",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        lastHydratedAt: "2030-01-10T09:05:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        staleAfterHours: 4,
        productCount: 0,
        lotCount: 0,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [],
      lots: [],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    await expect(repository.syncPendingCentralLots?.()).resolves.toEqual([
      expect.objectContaining({
        id: "lote-central-cabotia-001",
        centralSyncState: "synchronized",
        centralSource: "central",
      }),
    ]);
    expect(searchCentralProducts).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        query: "Cabotia KG PED",
        categoryId: "categoria-local-pedidos",
        includeDrafts: true,
      }),
    );
    expect(searchCentralProducts).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({ categoryId: expect.any(String) }),
    );
    expect(createCentralLot).toHaveBeenCalledWith(
      expect.objectContaining({
        lot: expect.objectContaining({ productId: "produto-central-cabotia-validado" }),
      }),
    );
  });

  it("replays a pending lot with the known central product id when search cannot prove reuse", async () => {
    const categoryProfile = {
      categoryId: "categoria-ficticia-legumes",
      mode: "formal_validity" as const,
      windows: { radarDays: 45, markdownDays: 10, criticalDays: 2, expiredDays: 0 },
    };
    const searchCentralProducts = vi.fn(() =>
      Promise.resolve({
        requestId: "search-central-abobrinha-sem-reuso",
        normalizedQuery: "abobrinha kg ped",
        resultState: "no_safe_reuse" as const,
        reusableProducts: [],
        similarCandidates: [],
      }),
    );
    const createCentralLot = vi.fn((request) =>
      Promise.resolve({
        requestId: "write-abobrinha-central-ficticio",
        lot: {
          centralLotId: "lote-central-abobrinha-001",
          centralProductId: request.lot.productId,
          productDisplayName: "Abobrinha KG PED",
          lotIdentity: request.lot.identity,
          mode: "formal_validity" as const,
          expiresAt: request.lot.expiresAt,
          receivedAt: request.lot.receivedAt,
          approximateQuantity: request.lot.approximateQuantity,
          initialLocation: request.lot.initialLocation,
          currentObservation: {
            centralObservationId: "observacao-central-abobrinha-001",
            centralLotId: "lote-central-abobrinha-001",
            status: "present" as const,
            actorLabel: request.actorLabel,
            occurredAt: request.occurredAt,
            location: request.lot.initialLocation,
            quantityState: "estimated" as const,
            approximateQuantity: request.lot.approximateQuantity,
            isCorrection: false,
          },
          lifecycleStatus: "active" as const,
          state: "synchronized" as const,
          source: "central" as const,
          riskState: "radar" as const,
          taskProjection: {
            attention: "future_attention" as const,
            riskState: "radar" as const,
            observedAt: "2030-01-10T09:00:00.000Z",
          },
          createdAt: "2030-01-10T09:00:00.000Z",
          updatedAt: "2030-01-10T09:00:00.000Z",
        },
        taskProjection: {
          attention: "future_attention" as const,
          riskState: "radar" as const,
          observedAt: "2030-01-10T09:00:00.000Z",
        },
        acknowledgement: {
          acknowledgementId: "ack-central-abobrinha-001",
          centralLotId: "lote-central-abobrinha-001",
          state: "synchronized" as const,
          acknowledgedAt: "2030-01-10T09:00:00.000Z",
          message: "Lote confirmado na central.",
        },
      }),
    );
    const identifiers = ["produto-abobrinha-local", "lote-abobrinha-local", "obs-abobrinha-local"];
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => identifiers.shift() ?? "id-abobrinha-extra",
      createCentralLot,
      searchCentralProducts,
    });
    const draftResponse = await repository.createProductDraft?.({
      displayName: "Abobrinha KG PED",
      categoryId: "categoria-ficticia-legumes",
      categoryName: "Legumes",
      categoryRuleProfile: categoryProfile,
      requestedAt: "2030-01-10T09:00:00.000Z",
    });

    if (draftResponse?.draft === undefined) {
      throw new Error("Expected draft product.");
    }

    await repository.saveLot({
      lot: {
        productId: draftResponse.draft.centralProductId,
        identity: { identitySource: "printed", value: "LOTE-ABOBRINHA-FICTICIO-001" },
        mode: "formal_validity",
        expiresAt: "2030-02-10",
        receivedAt: "2030-01-10",
        approximateQuantity: 4,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora local",
    });

    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-abobrinha-sem-produto-cache",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:05:00.000Z",
        centralReadAt: "2030-01-10T09:05:00.000Z",
        source: "central",
        readiness: "cache_ready",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        lastHydratedAt: "2030-01-10T09:05:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        staleAfterHours: 4,
        productCount: 0,
        lotCount: 0,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [],
      lots: [],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    await expect(repository.syncPendingCentralLots?.()).resolves.toEqual([
      expect.objectContaining({
        id: "lote-central-abobrinha-001",
        centralSyncState: "synchronized",
        centralSource: "central",
      }),
    ]);
    expect(searchCentralProducts).toHaveBeenCalledTimes(2);
    expect(createCentralLot).toHaveBeenCalledWith(
      expect.objectContaining({
        lot: expect.objectContaining({ productId: draftResponse.draft.centralProductId }),
      }),
    );
  });

  it("reports central write blockers when replaying a pending lot fails", async () => {
    const formalCategoryProfile = {
      categoryId: "categoria-ficticia-frutas",
      mode: "formal_validity" as const,
      windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
    };
    const createCentralLot = vi.fn(() => Promise.reject(new Error("central denied")));
    const identifiers = ["produto-melao-local", "lote-melao-local", "obs-melao-local"];
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => identifiers.shift() ?? "id-extra",
      createCentralLot,
    });
    const draftResponse = await repository.createProductDraft?.({
      displayName: "Melao Amarelo KG PED FICTICIO",
      categoryId: "categoria-ficticia-frutas",
      categoryName: "Frutas",
      categoryRuleProfile: formalCategoryProfile,
      storePresentation: "supplier_packaged",
      requestedAt: "2030-01-10T09:00:00.000Z",
    });

    if (draftResponse?.draft === undefined) {
      throw new Error("Expected draft product.");
    }

    await repository.saveLot({
      lot: {
        productId: draftResponse.draft.centralProductId,
        identity: { identitySource: "printed", value: "LOTE-MELAO-FICTICIO-001" },
        mode: "formal_validity",
        expiresAt: "2030-01-12",
        receivedAt: "2030-01-10",
        approximateQuantity: 4,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaborador local",
    });

    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-melao-validado",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:05:00.000Z",
        centralReadAt: "2030-01-10T09:05:00.000Z",
        source: "central",
        readiness: "prepared",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        lastHydratedAt: "2030-01-10T09:05:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:05:00.000Z",
        lastCentralReadAt: "2030-01-10T09:05:00.000Z",
        staleAfterHours: 4,
        productCount: 1,
        lotCount: 0,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [
        {
          centralProductId: "produto-central-melao-001",
          displayName: "Melao Amarelo KG PED FICTICIO",
          categoryId: "categoria-ficticia-frutas",
          categoryName: "Frutas",
          categoryRuleProfile: formalCategoryProfile,
          status: "validated",
          state: "synchronized",
          source: "central",
          updatedAt: "2030-01-10T09:05:00.000Z",
        },
      ],
      lots: [],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    await expect(repository.syncPendingCentralLots?.()).rejects.toMatchObject({
      name: "PendingCentralLotSyncError",
      blocker: "central_lot_write_failed",
    } satisfies Partial<PendingCentralLotSyncError>);
    await expect(repository.listRecentLots()).resolves.toEqual([
      expect.objectContaining({ centralSyncState: "pending_central" }),
    ]);
  });

  it("keeps central-cache lots local and retryable when the immediate central write fails", async () => {
    const createCentralLot = vi.fn(() => Promise.reject(new Error("network unavailable")));
    const identifiers = ["lote-alface-local", "obs-alface-local"];
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => identifiers.shift() ?? "id-alface-extra",
      createCentralLot,
    });

    await repository.hydratePrepareTurn?.({
      requestId: "prepare-turn-central-ficticio",
      store: {
        storeId: "loja-ficticia",
        storeName: "Loja FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:00:00.000Z",
        centralReadAt: "2030-01-10T09:00:00.000Z",
        source: "central",
        readiness: "prepared",
        blockers: [],
      },
      device: {
        deviceId: "validade-zero-mobile:loja-ficticia",
        preparedAt: "2030-01-10T09:00:00.000Z",
        lastCentralReadAt: "2030-01-10T09:00:00.000Z",
        lastHydratedAt: "2030-01-10T09:00:00.000Z",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "ready",
        source: "central",
        updatedAt: "2030-01-10T09:00:00.000Z",
        lastCentralReadAt: "2030-01-10T09:00:00.000Z",
        staleAfterHours: 4,
        productCount: 1,
        lotCount: 0,
        activeTaskCount: 0,
        conflictCount: 0,
        resolvedHistoryCount: 0,
      },
      products: [
        {
          centralProductId: "produto-central-alface-001",
          displayName: "Alface Central FICTICIA",
          categoryId: "categoria-ficticia-folhas",
          categoryName: "Folhas",
          categoryRuleProfile: {
            categoryId: "categoria-ficticia-folhas",
            mode: "formal_validity",
            windows: {
              radarDays: 60,
              markdownDays: 15,
              criticalDays: 3,
              expiredDays: 0,
            },
          },
          status: "validated",
          state: "synchronized",
          source: "central",
          updatedAt: "2030-01-10T09:00:00.000Z",
        },
      ],
      lots: [],
      activeTasks: [],
      resolvedHistory: [],
      conflicts: [],
    });

    const localLot = await repository.saveLot({
      lot: {
        productId: "produto-central-alface-001",
        identity: { identitySource: "printed", value: "LOTE-CENTRAL-FICTICIO-001" },
        mode: "formal_validity",
        expiresAt: "2030-01-12",
        receivedAt: "2030-01-10",
        approximateQuantity: 9,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaboradora Central FICTICIA",
    });

    expect(createCentralLot).toHaveBeenCalledOnce();
    expect(localLot).toMatchObject({
      id: "lote-alface-local",
      centralSyncState: "local",
      centralSource: "local_cache",
      centralAcknowledgementMessage:
        "Acao salva neste aparelho. Ainda falta sincronizar para confirmacao central.",
    });
    await expect(repository.listRecentLots()).resolves.toEqual([
      expect.objectContaining({
        id: "lote-alface-local",
        centralSyncState: "local",
        centralSource: "local_cache",
      }),
    ]);
  });
});
