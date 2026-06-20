import { describe, expect, it } from "vitest";
import { createMemoryCaptureRepository } from "./memory-repository";

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
      { categoryId: "categoria-ficticia-folhas", productCount: 1 },
      { categoryId: "categoria-ficticia-ovos", productCount: 1 },
    ]);
    expect(productsByCategory).toEqual([product]);
    expect(productsByCategory).not.toContain(otherProduct);
  });
});
