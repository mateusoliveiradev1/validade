import { describe, expect, it, vi } from "vitest";
import { matchesRecentLotLocation, type CaptureLotSnapshot } from "./repository";
import { formatObservationTimestamp, formatOperationalTime } from "./capture-copy";
import { createMemoryCaptureRepository } from "./memory-repository";
import {
  attention,
  centralStateLabel,
  centralStateShortLabel,
  effectiveObservationLocation,
  lotPrimaryDate,
} from "./RecentLotList";

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (styles: unknown) => styles },
  Text: "Text",
  View: "View",
}));

function recentLotSnapshot(input: Partial<CaptureLotSnapshot> = {}): CaptureLotSnapshot {
  return {
    id: "lote-recente-ficticio-001",
    productId: "produto-recente-ficticio-001",
    productDisplayName: "Melancia Recente FICTICIA",
    identity: { identitySource: "printed", value: "LOTE-RECENTE-001" },
    mode: "processed_repack_loss",
    expiresAt: "2020-01-01",
    approximateQuantity: 4,
    initialLocation: { kind: "area_de_venda" },
    currentObservation: {
      id: "observacao-recente-ficticia-001",
      lotId: "lote-recente-ficticio-001",
      status: "present",
      actorLabel: "Colaborador FICTICIO",
      occurredAt: "2030-01-10T10:00:00.000Z",
      location: { kind: "area_de_venda" },
      quantityState: "estimated",
      approximateQuantity: 4,
      isCorrection: false,
    },
    ...input,
  };
}

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

  it("keeps terminal loss observations under the withdrawal/loss filter", async () => {
    let id = 1;
    const repository = createMemoryCaptureRepository({
      clock: () => "2030-01-10T09:00:00.000Z",
      createId: () => `ficticio-terminal-${id++}`,
    });
    const product = await repository.createProduct({
      displayName: "Melancia Terminal FICTICIA",
      categoryId: "categoria-ficticia-terminal",
      categoryRuleProfile: {
        categoryId: "categoria-ficticia-terminal",
        mode: "processed_repack_loss",
      },
    });
    const lot = await repository.saveLot({
      lot: {
        productId: product.id,
        identity: { identitySource: "printed", value: "LOTE-TERMINAL-001" },
        mode: "processed_repack_loss",
        expiresAt: "2030-01-10",
        approximateQuantity: 4,
        initialLocation: { kind: "area_de_venda" },
      },
      actorLabel: "Colaborador FICTICIO",
    });

    await repository.appendObservation(lot.id, {
      status: "loss",
      actorLabel: "Colaborador FICTICIO",
      occurredAt: "2030-01-10T10:00:00.000Z",
      location: { kind: "area_de_venda" },
      quantityState: "estimated",
      approximateQuantity: 4,
      isCorrection: false,
    });

    await expect(
      repository.listRecentLots({ location: { kind: "retirada_perda" } }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: lot.id,
        currentObservation: expect.objectContaining({
          status: "loss",
          location: { kind: "retirada_perda" },
        }),
      }),
    ]);
    await expect(
      repository.listRecentLots({ location: { kind: "area_de_venda" } }),
    ).resolves.toEqual([]);
  });
});

describe("observation timestamp presentation", () => {
  it("shows the operational date and minute without exposing seconds", () => {
    expect(formatObservationTimestamp("2030-01-10T00:29:12.000Z")).toBe("09/01/2030, 21:29");
    expect(formatOperationalTime("2030-01-10T00:29:12.000Z")).toBe("21:29");
  });
});

describe("recent lot presentation", () => {
  it("treats terminal observations as withdrawal/loss even when old local data kept sales area", () => {
    const lot = recentLotSnapshot({
      currentObservation: {
        ...recentLotSnapshot().currentObservation,
        status: "loss",
        location: { kind: "area_de_venda" },
      },
    });

    expect(matchesRecentLotLocation(lot, { kind: "retirada_perda" })).toBe(true);
    expect(matchesRecentLotLocation(lot, { kind: "area_de_venda" })).toBe(false);
  });

  it("shows terminal loss as finalized instead of expired risk", () => {
    const lot = recentLotSnapshot({
      centralSource: "central",
      centralSyncState: "synchronized",
      currentObservation: {
        ...recentLotSnapshot().currentObservation,
        status: "loss",
        location: { kind: "area_de_venda" },
      },
    });

    expect(lotPrimaryDate(lot)).toEqual({
      label: "Status",
      value: "Perda",
      badge: "finalizado",
      tone: "neutral",
    });
    expect(attention(lot)).toBe("Finalizado: perda registrada");
    expect(centralStateShortLabel(lot)).toBe("Perda");
    expect(effectiveObservationLocation(lot)).toEqual({ kind: "retirada_perda" });
  });

  it("lets resolved central state win over the generic central badge", () => {
    const lot = recentLotSnapshot({
      centralSource: "central",
      centralSyncState: "resolved",
    });

    expect(centralStateShortLabel(lot)).toBe("Resolvido");
    expect(centralStateLabel(lot)).toBe("Resolvido na central");
  });
});
