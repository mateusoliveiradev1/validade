import { describe, expect, it } from "vitest";
import { formatObservationTimestamp, formatOperationalTime } from "./capture-copy";
import { createMemoryCaptureRepository } from "./memory-repository";

describe("recent physical presence", () => {
  it("finds and filters current snapshots while making uncertainty explicit", async () => {
    let id = 1;
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => `ficticio-${id++}`,
    });
    const product = await repository.createProduct({
      displayName: "Maçã Exemplo FICTICIA",
      categoryId: "categoria-ficticia",
      gtin: "7890000000001",
      categoryRuleProfile: { categoryId: "categoria-ficticia", mode: "formal_validity" },
    });
    const lot = await repository.saveLot({
      lot: {
        productId: product.id,
        identity: { identitySource: "printed", value: "LOTE-FICTICIO-001" },
        mode: "formal_validity",
        expiresAt: "2030-01-15",
        approximateQuantity: 8,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaborador FICTICIO",
    });
    await repository.appendObservation(lot.id, {
      status: "not_found",
      actorLabel: "Colaborador FICTICIO",
      occurredAt: "2030-01-10T10:00:00.000Z",
      location: { kind: "estoque" },
      quantityState: "not_estimable",
      isCorrection: false,
    });
    for (const query of ["MAÇÃ", "7890000000001", "LOTE-FICTICIO-001"])
      expect(await repository.listRecentLots({ query })).toHaveLength(1);
    expect(await repository.listRecentLots({ location: { kind: "estoque" } })).toHaveLength(1);
    expect(await repository.listRecentLots({ location: { kind: "area_de_venda" } })).toHaveLength(
      0,
    );
    const [current] = await repository.listRecentLots();
    expect(current?.currentObservation.status).toBe("not_found");
    expect(current?.currentObservation.quantityState).toBe("not_estimable");
    expect((await repository.loadLotDetail(lot.id))?.currentObservation.actorLabel).toBe(
      "Colaborador FICTICIO",
    );
  });
});

describe("observation timestamp presentation", () => {
  it("shows the operational date and minute without exposing seconds", () => {
    expect(formatObservationTimestamp("2030-01-10T00:29:12.000Z")).toBe("09/01/2030, 21:29");
    expect(formatOperationalTime("2030-01-10T00:29:12.000Z")).toBe("21:29");
  });
});
