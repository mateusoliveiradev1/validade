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
  });
});
