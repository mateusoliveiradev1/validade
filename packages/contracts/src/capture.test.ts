import { describe, expect, it } from "vitest";
import {
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  ProductDraftCreateRequestSchema,
  ProductDraftCreateResponseSchema,
  ProductDraftReviewRequestSchema,
  ProductSearchResponseSchema,
  PrepareTurnRequestSchema,
  PrepareTurnResponseSchema,
  type ProductCatalogItem,
  type ProductDraftReviewState,
  type ProductSearchCandidate,
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

  it("returns exact central products as explicit reuse candidates", () => {
    const product = centralProduct({
      centralProductId: "produto-central-ovos-001",
      displayName: "Ovos Brancos FICTICIOS",
      normalizedKey: "ovos brancos ficticios",
      gtin: "7890000000001",
    });

    expect(
      ProductSearchResponseSchema.parse({
        requestId: "busca-produto-ficticia-001",
        normalizedQuery: "ovos brancos ficticios",
        resultState: "reuse_available",
        reusableProducts: [
          searchCandidate(product, {
            matchKind: "reusable_central",
            matchReasons: ["exact_normalized_name", "exact_gtin"],
          }),
        ],
        similarCandidates: [],
      }),
    ).toMatchObject({
      resultState: "reuse_available",
      reusableProducts: [{ source: "central", reviewStatus: "validated" }],
    });

    expect(() =>
      ProductSearchResponseSchema.parse({
        requestId: "busca-produto-ficticia-001",
        resultState: "reuse_available",
        reusableProducts: [],
        similarCandidates: [],
      }),
    ).toThrow();
  });

  it("keeps similar-product warnings visible before draft creation", () => {
    const similar = searchCandidate(centralProduct(), {
      matchKind: "similar_candidate",
      matchReasons: ["similar_name", "similar_category"],
      similarityScore: 0.82,
      warning: "Produto parecido encontrado. Reutilize se for o mesmo item.",
    });

    expect(
      ProductSearchResponseSchema.parse({
        requestId: "busca-produto-ficticia-002",
        normalizedQuery: "ovos vermelhos ficticios",
        resultState: "similar_requires_review",
        reusableProducts: [],
        similarCandidates: [similar],
      }),
    ).toMatchObject({
      resultState: "similar_requires_review",
      similarCandidates: [{ matchKind: "similar_candidate" }],
    });

    expect(() =>
      ProductSearchResponseSchema.parse({
        requestId: "busca-produto-ficticia-002",
        normalizedQuery: "ovos vermelhos ficticios",
        resultState: "similar_requires_review",
        reusableProducts: [],
        similarCandidates: [
          searchCandidate(centralProduct(), {
            matchKind: "similar_candidate",
            matchReasons: ["similar_name"],
          }),
        ],
      }),
    ).toThrow();
  });

  it("requires category profile data and rejects privileged product draft fields", () => {
    expect(
      ProductDraftCreateRequestSchema.parse({
        displayName: "Ovos Caipiras FICTICIOS",
        categoryId: "categoria-ficticia-ovos",
        categoryName: "Ovos ficticios",
        categoryRuleProfile: categoryRuleProfile(),
        requestedAt: "2030-01-10T09:00:00.000Z",
        gtin: "7890000000002",
        reason: "Produto visto no corredor durante o piloto.",
      }),
    ).toMatchObject({
      displayName: "Ovos Caipiras FICTICIOS",
    });

    expect(() =>
      ProductDraftCreateRequestSchema.parse({
        displayName: "Ovos sem categoria FICTICIOS",
        categoryName: "Ovos ficticios",
        categoryRuleProfile: categoryRuleProfile(),
        requestedAt: "2030-01-10T09:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      ProductDraftCreateRequestSchema.parse({
        displayName: "Ovos injetados FICTICIOS",
        categoryId: "categoria-ficticia-ovos",
        categoryName: "Ovos ficticios",
        categoryRuleProfile: categoryRuleProfile(),
        requestedAt: "2030-01-10T09:00:00.000Z",
        storeId: "loja-injetada",
        role: "admin",
        capability: "catalog.review",
      }),
    ).toThrow();
  });

  it("returns duplicate GTIN and normalized-name cases as explicit reuse outcomes", () => {
    const product = centralProduct();

    expect(
      ProductDraftCreateResponseSchema.parse({
        requestId: "produto-draft-ficticio-001",
        normalizedKey: product.normalizedKey,
        outcome: "reuse_existing",
        duplicateReason: "gtin",
        reusableProduct: product,
        similarCandidates: [],
      }),
    ).toMatchObject({
      outcome: "reuse_existing",
      duplicateReason: "gtin",
    });

    expect(
      ProductDraftCreateResponseSchema.parse({
        requestId: "produto-draft-ficticio-002",
        normalizedKey: product.normalizedKey,
        outcome: "reuse_existing",
        duplicateReason: "normalized_name",
        reusableProduct: product,
        similarCandidates: [],
      }),
    ).toMatchObject({
      duplicateReason: "normalized_name",
    });

    expect(() =>
      ProductDraftCreateResponseSchema.parse({
        requestId: "produto-draft-ficticio-003",
        normalizedKey: product.normalizedKey,
        outcome: "reuse_existing",
        reusableProduct: product,
        similarCandidates: [],
      }),
    ).toThrow();
  });

  it("exposes draft pending review with enough state for mobile and web", () => {
    const draft = productDraft();

    expect(
      ProductDraftCreateResponseSchema.parse({
        requestId: "produto-draft-ficticio-004",
        normalizedKey: draft.normalizedKey,
        outcome: "draft_pending_review",
        similarCandidates: draft.similarCandidates,
        draft,
        acknowledgement: {
          acknowledgementId: "ack-produto-ficticio-001",
          centralProductId: draft.centralProductId,
          state: "draft_pending_review",
          syncState: "pending_central",
          reviewStatus: "pending_review",
          acknowledgedAt: "2030-01-10T09:00:00.000Z",
          message: "Produto em rascunho. O lote entra com risco conservador ate a validacao.",
        },
      }),
    ).toMatchObject({
      outcome: "draft_pending_review",
      draft: {
        source: "draft_pending_review",
        reviewStatus: "pending_review",
      },
    });

    expect(() =>
      ProductDraftCreateResponseSchema.parse({
        requestId: "produto-draft-ficticio-004",
        normalizedKey: draft.normalizedKey,
        outcome: "draft_pending_review",
        similarCandidates: [],
        draft,
      }),
    ).toThrow();
  });

  it("bounds review requests and keeps merge/reject decisions explicit", () => {
    expect(
      ProductDraftReviewRequestSchema.parse({
        draftId: "draft-produto-ficticio-001",
        decision: "approve",
        reviewedAt: "2030-01-10T10:00:00.000Z",
      }),
    ).toMatchObject({
      decision: "approve",
    });

    expect(() =>
      ProductDraftReviewRequestSchema.parse({
        draftId: "draft-produto-ficticio-001",
        decision: "reject",
        reviewedAt: "2030-01-10T10:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      ProductDraftReviewRequestSchema.parse({
        draftId: "draft-produto-ficticio-001",
        decision: "merge",
        reviewedAt: "2030-01-10T10:00:00.000Z",
      }),
    ).toThrow();
  });
});

function categoryRuleProfile() {
  return {
    categoryId: "categoria-ficticia-ovos",
    mode: "formal_validity" as const,
    windows: {
      radarDays: 10,
      markdownDays: 5,
      criticalDays: 2,
      expiredDays: 0,
    },
  };
}

function centralProduct(overrides: Partial<ProductCatalogItem> = {}): ProductCatalogItem {
  return {
    centralProductId: "produto-central-ficticio-001",
    displayName: "Ovos Brancos FICTICIOS",
    normalizedKey: "ovos brancos ficticios",
    categoryId: "categoria-ficticia-ovos",
    categoryName: "Ovos ficticios",
    categoryRuleProfile: categoryRuleProfile(),
    source: "central",
    reviewStatus: "validated",
    syncState: "synchronized",
    updatedAt: "2030-01-10T09:00:00.000Z",
    gtin: "7890000000001",
    ...overrides,
  };
}

function searchCandidate(
  product: ProductCatalogItem,
  overrides: Partial<ProductSearchCandidate> = {},
): ProductSearchCandidate {
  return {
    ...product,
    matchKind: "reusable_central",
    matchReasons: ["exact_normalized_name"],
    ...overrides,
  };
}

function productDraft(overrides: Partial<ProductDraftReviewState> = {}): ProductDraftReviewState {
  return {
    draftId: "draft-produto-ficticio-001",
    centralProductId: "produto-draft-ficticio-001",
    displayName: "Ovos Caipiras FICTICIOS",
    normalizedKey: "ovos caipiras ficticios",
    categoryId: "categoria-ficticia-ovos",
    categoryName: "Ovos ficticios",
    categoryRuleProfile: categoryRuleProfile(),
    source: "draft_pending_review",
    reviewStatus: "pending_review",
    syncState: "pending_central",
    requestedByLabel: "Colaborador FICTICIO",
    requestedAt: "2030-01-10T09:00:00.000Z",
    similarCandidates: [
      searchCandidate(centralProduct(), {
        matchKind: "similar_candidate",
        matchReasons: ["similar_name"],
        warning: "Produto parecido encontrado. Reutilize se for o mesmo item.",
      }),
    ],
    gtin: "7890000000002",
    ...overrides,
  };
}
