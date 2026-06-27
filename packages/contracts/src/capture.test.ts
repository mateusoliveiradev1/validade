import { describe, expect, it } from "vitest";
import {
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  PrepareTurnRequestSchema,
  PrepareTurnResponseSchema,
  type PrepareTurnResponse,
} from "./capture";

describe("capture runtime contracts", () => {
  it("accepts processed lots only with a validity date for repack-or-loss handling", () => {
    expect(
      CaptureLotInputSchema.parse({
        productId: "produto-processado-ficticio-001",
        mode: "processed_repack_loss",
        identity: {
          identitySource: "printed",
          value: "MELANCIA-PROC-FICTICIA-001",
        },
        approximateQuantity: 8,
        initialLocation: { kind: "area_de_venda" },
        expiresAt: "2030-01-10",
        receivedAt: "2030-01-09",
      }),
    ).toMatchObject({
      mode: "processed_repack_loss",
      expiresAt: "2030-01-10",
    });

    expect(() =>
      CaptureLotInputSchema.parse({
        productId: "produto-processado-ficticio-001",
        mode: "processed_repack_loss",
        identity: {
          identitySource: "printed",
          value: "MELANCIA-PROC-FICTICIA-001",
        },
        approximateQuantity: 8,
        initialLocation: { kind: "area_de_venda" },
        receivedAt: "2030-01-09",
      }),
    ).toThrow();
  });

  it("allows processed category rule profiles without reusing the FLV inspection mode", () => {
    expect(
      CaptureProductInputSchema.parse({
        displayName: "Melancia processada FICTICIA",
        categoryId: "processados-ficticios",
        categoryRuleProfile: {
          categoryId: "processados-ficticios",
          mode: "processed_repack_loss",
          windows: {
            radarDays: 7,
            markdownDays: 0,
            criticalDays: 1,
            expiredDays: 0,
          },
        },
      }),
    ).toMatchObject({
      categoryRuleProfile: {
        mode: "processed_repack_loss",
      },
    });
  });

  it("keeps prepare-turn requests client-scoped and rejects role or store authority", () => {
    expect(
      PrepareTurnRequestSchema.parse({
        deviceId: "aparelho-ficticio-001",
        requestedAt: "2030-01-10T09:00:00.000Z",
        localSnapshot: {
          knownProductCount: 0,
          knownLotCount: 0,
          pendingCommandCount: 0,
        },
      }),
    ).toMatchObject({
      deviceId: "aparelho-ficticio-001",
    });

    expect(() =>
      PrepareTurnRequestSchema.parse({
        deviceId: "aparelho-ficticio-001",
        requestedAt: "2030-01-10T09:00:00.000Z",
        storeId: "loja-injetada",
      }),
    ).toThrow();
    expect(() =>
      PrepareTurnRequestSchema.parse({
        deviceId: "aparelho-ficticio-001",
        requestedAt: "2030-01-10T09:00:00.000Z",
        role: "admin",
      }),
    ).toThrow();
    expect(() =>
      PrepareTurnRequestSchema.parse({
        deviceId: "aparelho-ficticio-001",
        requestedAt: "2030-01-10T09:00:00.000Z",
        capability: "shift.close",
      }),
    ).toThrow();
  });

  it("represents empty central packages as needs-review instead of prepared", () => {
    const emptyPackage: PrepareTurnResponse = {
      requestId: "leitura-ficticia-001",
      store: {
        storeId: "loja-ficticia-001",
        storeName: "Loja Piloto FICTICIA",
        centralVersion: 1,
        generatedAt: "2030-01-10T09:00:00.000Z",
        source: "central",
        readiness: "needs_review",
        blockers: ["Leitura central sem fatos do turno."],
      },
      device: {
        deviceId: "aparelho-ficticio-001",
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
      },
      cache: {
        state: "needs_first_central_read",
        source: "central",
        updatedAt: "2030-01-10T09:00:00.000Z",
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
    };

    expect(PrepareTurnResponseSchema.parse(emptyPackage).store.readiness).toBe("needs_review");
    expect(() =>
      PrepareTurnResponseSchema.parse({
        ...emptyPackage,
        store: {
          ...emptyPackage.store,
          centralReadAt: "2030-01-10T09:00:00.000Z",
          readiness: "prepared",
        },
      }),
    ).toThrow();
  });

  it.each(["uri", "base64", "objectKey", "photoUri", "imageBytes"] as const)(
    "rejects raw evidence/storage field %s in prepare-turn hydration",
    (field) => {
      expect(() =>
        PrepareTurnResponseSchema.parse({
          requestId: "leitura-ficticia-001",
          store: {
            storeId: "loja-ficticia-001",
            storeName: "Loja Piloto FICTICIA",
            centralVersion: 2,
            generatedAt: "2030-01-10T09:00:00.000Z",
            centralReadAt: "2030-01-10T09:00:00.000Z",
            source: "central",
            readiness: "prepared",
            blockers: [],
          },
          device: {
            deviceId: "aparelho-ficticio-001",
            preparedAt: "2030-01-10T09:00:00.000Z",
            lastCentralReadAt: "2030-01-10T09:00:00.000Z",
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
              centralProductId: "produto-ficticio-001",
              displayName: "Ovos Brancos FICTICIOS",
              categoryId: "categoria-ficticia-ovos",
              categoryName: "Ovos ficticios",
              status: "validated",
              state: "synchronized",
              source: "central",
              updatedAt: "2030-01-10T09:00:00.000Z",
              categoryRuleProfile: {
                categoryId: "categoria-ficticia-ovos",
                mode: "formal_validity",
              },
              [field]: "valor-ficticio",
            },
          ],
          lots: [],
          activeTasks: [],
          resolvedHistory: [],
          conflicts: [],
        }),
      ).toThrow();
    },
  );
});
