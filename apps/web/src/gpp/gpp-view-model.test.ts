import { describe, expect, it } from "vitest";
import type { GppQueueSnapshot } from "@validade-zero/contracts";
import {
  buildAvariaSectorPanels,
  buildPurchaseQueueSummary,
  buildPurchaseSectorPanels,
  filterHistoryRows,
  initialOpenAvariaSector,
  toAvariaGroupRow,
} from "./gpp-view-model";

describe("GPP view model", () => {
  it("opens the sector with the highest pending workload first", () => {
    const snapshot = queueSnapshot();

    expect(initialOpenAvariaSector(snapshot)).toBe("FLV");
  });

  it("groups avarias by sector and keeps divergent groups blocked for baixa", () => {
    const snapshot = queueSnapshot();
    const panels = buildAvariaSectorPanels(snapshot, "");

    expect(panels).toHaveLength(2);
    expect(panels[0]).toMatchObject({
      sector: "FLV",
      entryCount: 3,
      divergenceCount: 1,
      totalSummary: "5 kg",
      baixadasToday: 1,
    });
    expect(toAvariaGroupRow(snapshot.avariaGroups[1]).baixa).toEqual({
      enabled: false,
      reason: "Corrigir divergencia antes da baixa",
    });
  });

  it("filters groups by product code, name, sector, or entry id", () => {
    const panels = buildAvariaSectorPanels(queueSnapshot(), "pao");

    expect(panels).toHaveLength(1);
    expect(panels[0]?.sector).toBe("Padaria");
    expect(panels[0]?.groups[0]?.productLabel).toContain("Pao frances");
  });

  it("filters history by period, product, event, sector, and actor", () => {
    const rows = filterHistoryRows(queueSnapshot().history, {
      actor: "GPP",
      event: "baixado",
      from: "2030-01-10T00:00:00.000Z",
      query: "banana",
      sector: "FLV",
      to: "2030-01-11T00:00:00.000Z",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.summary).toContain("Banana");
  });

  it("keeps completed purchase requests out of the active purchase queue", () => {
    const snapshot = queueSnapshot();
    const pending = purchaseRequest("purchase-open", "FLV", "Tomate salada", "solicitado");
    const closed = purchaseRequest("purchase-done", "FLV", "Queijo minas", "atendido");
    const canceled = purchaseRequest("purchase-canceled", "Padaria", "Pao frances", "cancelado");

    const nextSnapshot: GppQueueSnapshot = {
      ...snapshot,
      purchaseRequests: [pending, closed, canceled],
    };

    const panels = buildPurchaseSectorPanels(nextSnapshot, "");
    const summary = buildPurchaseQueueSummary(nextSnapshot, "");

    expect(summary).toEqual({ closedCount: 2, pendingCount: 1, totalCount: 3 });
    expect(panels).toHaveLength(1);
    expect(panels[0]?.sector).toBe("FLV");
    expect(panels[0]?.requests).toEqual([pending]);
  });
});

function queueSnapshot(): GppQueueSnapshot {
  return {
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    generatedAt: "2030-01-10T12:00:00.000Z",
    centralState: "available",
    avariaGroups: [
      {
        groupId: "FLV:162:baixa_gpp",
        sector: "FLV",
        product: { code: "162", name: "Banana prata" },
        finality: "baixa_gpp",
        totalQuantity: { value: 3, unit: "kg" },
        entryCount: 2,
        divergenceCount: 0,
        latestActivityAt: "2030-01-10T11:58:00.000Z",
        eligibleForBaixa: true,
      },
      {
        groupId: "FLV:163:baixa_gpp",
        sector: "FLV",
        product: { code: "163", name: "Maca gala" },
        finality: "baixa_gpp",
        totalQuantity: { value: 2, unit: "kg" },
        entryCount: 1,
        divergenceCount: 1,
        latestActivityAt: "2030-01-10T11:59:00.000Z",
        eligibleForBaixa: false,
      },
      {
        groupId: "PAD:900:baixa_gpp",
        sector: "Padaria",
        product: { code: "900", name: "Pao frances" },
        finality: "baixa_gpp",
        totalQuantity: { value: 10, unit: "un" },
        entryCount: 1,
        divergenceCount: 0,
        latestActivityAt: "2030-01-10T10:00:00.000Z",
        eligibleForBaixa: true,
      },
    ],
    purchaseRequests: [],
    divergenceEntries: [],
    history: [
      {
        historyId: "hist-001",
        event: "baixado",
        targetType: "avaria",
        targetId: "avaria-001",
        productCode: "162",
        productName: "Banana prata",
        sector: "FLV",
        actor: {
          actorId: "gpp-local",
          displayName: "GPP Loja",
          roleSnapshot: "gpp",
        },
        occurredAt: "2030-01-10T11:00:00.000Z",
        summary: "Banana baixada na central",
      },
      {
        historyId: "hist-002",
        event: "created",
        targetType: "avaria",
        targetId: "avaria-002",
        productCode: "900",
        productName: "Pao frances",
        sector: "Padaria",
        actor: {
          actorId: "lead-local",
          displayName: "Lideranca Loja",
          roleSnapshot: "lead",
        },
        occurredAt: "2030-01-09T11:00:00.000Z",
        summary: "Pao registrado",
      },
    ],
  };
}

function purchaseRequest(
  purchaseRequestId: string,
  sector: string,
  productName: string,
  status: GppQueueSnapshot["purchaseRequests"][number]["status"],
): GppQueueSnapshot["purchaseRequests"][number] {
  return {
    purchaseRequestId,
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    sector,
    product: { code: "410", name: productName },
    requestedQuantity: { value: 1, unit: "kg" },
    finality: "Teste",
    requester: {
      actorId: "lead-local",
      displayName: "Lideranca Loja",
      roleSnapshot: "lead",
    },
    status,
    requestedAt: "2030-01-10T10:30:00.000Z",
    updatedAt: "2030-01-10T10:30:00.000Z",
  };
}
