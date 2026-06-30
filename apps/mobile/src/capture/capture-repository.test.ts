import { describe, expect, it, vi } from "vitest";
import { createMemoryCaptureRepository } from "./memory-repository";
import { productDraftToLocalRecord } from "./repository";

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

describe("memory capture repository", () => {
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

  it("writes ready central-cache lots through the central API and keeps the projected task visible", async () => {
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

  it("does not confirm central-cache lots locally when the central write fails", async () => {
    const createCentralLot = vi.fn(() => Promise.reject(new Error("network unavailable")));
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

    await expect(
      repository.saveLot({
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
      }),
    ).rejects.toThrow("central_lot_write_failed");
    expect(createCentralLot).toHaveBeenCalledOnce();
    await expect(repository.listRecentLots()).resolves.toEqual([]);
  });
});
