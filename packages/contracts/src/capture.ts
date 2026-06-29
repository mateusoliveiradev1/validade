import {
  PHYSICAL_CONFIRMATION_STATUSES,
  PRODUCT_MODES,
  REQUIRED_RESOLUTIONS,
  TASK_RESOLUTION_ACTIONS,
  TODAY_ACTIONABLE_RISK_STATES,
  TODAY_TASK_SEVERITIES,
} from "@validade-zero/domain";
import { z } from "zod";
import {
  PilotDeviceBlockerSchema,
  PilotDevicePermissionStateSchema,
  PilotDevicePushProviderStateSchema,
  PilotDeviceReadinessVerdictSchema,
} from "./command-center";

const RequiredTextSchema = z.string().trim().min(1).max(160);
const IdentifierSchema = z.string().trim().min(1).max(120);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Use a valid ISO date in YYYY-MM-DD format.");

const RiskWindowsSchema = z
  .object({
    radarDays: z.number().int().nonnegative().optional(),
    markdownDays: z.number().int().nonnegative().optional(),
    criticalDays: z.number().int().nonnegative().optional(),
    expiredDays: z.number().int().nonnegative().optional(),
    qualityWindowDays: z.number().int().positive().optional(),
  })
  .strict();

const ForbiddenHydrationFields = ["uri", "base64", "objectKey", "photoUri", "imageBytes"] as const;

const CentralRiskStateSchema = z.enum([...TODAY_ACTIONABLE_RISK_STATES, "radar"] as const);

export const CentralPackageSourceSchema = z.enum(["central", "local_cache", "pending_central"]);

export const VisibleCentralSyncStateSchema = z.enum([
  "local",
  "pending_central",
  "synchronized",
  "conflict",
  "discarded",
  "resolved",
]);

export const CategoryRuleProfileSchema = z
  .object({
    categoryId: IdentifierSchema,
    mode: z.enum(PRODUCT_MODES),
    windows: RiskWindowsSchema.optional(),
    maxPhysicalConfirmationAgeHours: z.number().positive().optional(),
  })
  .strict();

export const ProductRuleOverrideSchema = z
  .object({
    mode: z.enum(PRODUCT_MODES).optional(),
    windows: RiskWindowsSchema.optional(),
    maxPhysicalConfirmationAgeHours: z.number().positive().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.mode !== undefined ||
      value.windows !== undefined ||
      value.maxPhysicalConfirmationAgeHours !== undefined,
    "Provide at least one explicit product-rule override.",
  );

export const CaptureProductInputSchema = z
  .object({
    displayName: RequiredTextSchema,
    categoryId: IdentifierSchema,
    categoryRuleProfile: CategoryRuleProfileSchema,
    supplierName: RequiredTextSchema.optional(),
    gtin: IdentifierSchema.optional(),
    productRuleOverride: ProductRuleOverrideSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.categoryRuleProfile.categoryId !== value.categoryId) {
      context.addIssue({
        code: "custom",
        path: ["categoryRuleProfile", "categoryId"],
        message: "The category rule profile must belong to the selected category.",
      });
    }
  });

export const OperationalLocationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("area_de_venda") }).strict(),
  z.object({ kind: z.literal("estoque") }).strict(),
  z.object({ kind: z.literal("camara_fria") }).strict(),
  z.object({ kind: z.literal("ilha_promocional") }).strict(),
  z.object({ kind: z.literal("retirada_perda") }).strict(),
  z.object({ kind: z.literal("other"), customName: RequiredTextSchema }).strict(),
]);

export const LotIdentitySchema = z.discriminatedUnion("identitySource", [
  z.object({ identitySource: z.literal("printed"), value: IdentifierSchema }).strict(),
  z.object({ identitySource: z.literal("generated_internal"), value: IdentifierSchema }).strict(),
]);

const CaptureLotBaseSchema = z.object({
  productId: IdentifierSchema,
  identity: LotIdentitySchema,
  approximateQuantity: z.number().nonnegative(),
  initialLocation: OperationalLocationSchema,
});

export const CaptureLotInputSchema = z.union([
  CaptureLotBaseSchema.extend({
    mode: z.literal("formal_validity"),
    expiresAt: IsoDateSchema,
    receivedAt: IsoDateSchema.optional(),
  }).strict(),
  CaptureLotBaseSchema.extend({
    mode: z.literal("processed_repack_loss"),
    expiresAt: IsoDateSchema,
    receivedAt: IsoDateSchema.optional(),
  }).strict(),
  CaptureLotBaseSchema.extend({
    mode: z.literal("flv_inspection"),
    receivedAt: IsoDateSchema,
    qualityInspectionDueAt: IsoDateSchema.optional(),
    qualityWindowDays: z.number().int().positive().optional(),
  })
    .strict()
    .refine(
      (value) =>
        value.qualityInspectionDueAt !== undefined || value.qualityWindowDays !== undefined,
      "Provide a quality inspection date or quality window for FLV lots.",
    ),
  CaptureLotBaseSchema.extend({
    mode: z.literal("receiving_monitored"),
    receivedAt: IsoDateSchema,
  }).strict(),
]);

const ObservationBaseSchema = z.object({
  status: z.enum(PHYSICAL_CONFIRMATION_STATUSES),
  actorLabel: RequiredTextSchema,
  occurredAt: z.string().datetime({ offset: true }),
  location: OperationalLocationSchema,
  isCorrection: z.boolean(),
  correctionReason: RequiredTextSchema.optional(),
});

export const PhysicalObservationInputSchema = z
  .discriminatedUnion("quantityState", [
    ObservationBaseSchema.extend({
      quantityState: z.literal("estimated"),
      approximateQuantity: z.number().nonnegative(),
    }).strict(),
    ObservationBaseSchema.extend({
      quantityState: z.literal("not_estimable"),
    }).strict(),
  ])
  .superRefine((value, context) => {
    if (value.isCorrection && value.correctionReason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["correctionReason"],
        message: "A correction requires an explicit reason.",
      });
    }
  });

const CentralObservationBaseSchema = ObservationBaseSchema.extend({
  centralObservationId: IdentifierSchema,
  centralLotId: IdentifierSchema,
});

export const CentralPhysicalObservationSchema = z.discriminatedUnion("quantityState", [
  CentralObservationBaseSchema.extend({
    quantityState: z.literal("estimated"),
    approximateQuantity: z.number().nonnegative(),
  }).strict(),
  CentralObservationBaseSchema.extend({
    quantityState: z.literal("not_estimable"),
  }).strict(),
]);

export const CentralLotLifecycleStatusSchema = z.enum(["active", "resolved", "archived"]);

export const CentralLotTaskProjectionSummarySchema = z.discriminatedUnion("attention", [
  z
    .object({
      attention: z.literal("active_task"),
      centralTaskId: IdentifierSchema,
      activeKey: IdentifierSchema,
      riskState: z.enum(TODAY_ACTIONABLE_RISK_STATES),
      severity: z.enum(TODAY_TASK_SEVERITIES),
      requiredResolution: z.enum(REQUIRED_RESOLUTIONS),
      ownerLabel: RequiredTextSchema,
      updatedAt: IsoDateTimeSchema,
    })
    .strict(),
  z
    .object({
      attention: z.literal("future_attention"),
      riskState: z.literal("radar"),
      observedAt: IsoDateTimeSchema,
    })
    .strict(),
  z
    .object({
      attention: z.literal("none"),
      riskState: z.literal("safe"),
      observedAt: IsoDateTimeSchema,
    })
    .strict(),
]);

const CentralLotSnapshotBaseSchema = z.object({
  centralLotId: IdentifierSchema,
  centralProductId: IdentifierSchema,
  productDisplayName: RequiredTextSchema,
  lotIdentity: LotIdentitySchema,
  approximateQuantity: z.number().nonnegative(),
  initialLocation: OperationalLocationSchema,
  currentObservation: CentralPhysicalObservationSchema,
  lifecycleStatus: CentralLotLifecycleStatusSchema,
  state: VisibleCentralSyncStateSchema,
  source: CentralPackageSourceSchema,
  riskState: CentralRiskStateSchema.optional(),
  taskProjection: CentralLotTaskProjectionSummarySchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const CentralLotSnapshotSchema = z.union([
  CentralLotSnapshotBaseSchema.extend({
    mode: z.literal("formal_validity"),
    expiresAt: IsoDateSchema,
    receivedAt: IsoDateSchema.optional(),
  }).strict(),
  CentralLotSnapshotBaseSchema.extend({
    mode: z.literal("processed_repack_loss"),
    expiresAt: IsoDateSchema,
    receivedAt: IsoDateSchema.optional(),
  }).strict(),
  CentralLotSnapshotBaseSchema.extend({
    mode: z.literal("flv_inspection"),
    receivedAt: IsoDateSchema,
    qualityInspectionDueAt: IsoDateSchema.optional(),
    qualityWindowDays: z.number().int().positive().optional(),
  })
    .strict()
    .refine(
      (value) =>
        value.qualityInspectionDueAt !== undefined || value.qualityWindowDays !== undefined,
      "Central FLV lot snapshots require a quality inspection date or quality window.",
    ),
  CentralLotSnapshotBaseSchema.extend({
    mode: z.literal("receiving_monitored"),
    receivedAt: IsoDateSchema,
  }).strict(),
]);

export const CentralLotCreateRequestSchema = z
  .object({
    lot: CaptureLotInputSchema,
    actorLabel: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: IdentifierSchema.optional(),
  })
  .strict();

export const CentralLotWriteResponseSchema = z
  .object({
    requestId: IdentifierSchema,
    lot: CentralLotSnapshotSchema,
    taskProjection: CentralLotTaskProjectionSummarySchema,
    acknowledgement: z
      .object({
        acknowledgementId: IdentifierSchema,
        centralLotId: IdentifierSchema,
        state: VisibleCentralSyncStateSchema,
        acknowledgedAt: IsoDateTimeSchema,
        message: RequiredTextSchema.optional(),
      })
      .strict(),
  })
  .strict();

export const CentralObservationAppendRequestSchema = z
  .object({
    observation: PhysicalObservationInputSchema,
    idempotencyKey: IdentifierSchema.optional(),
  })
  .strict();

export const PrepareTurnRequestSchema = z
  .object({
    deviceId: IdentifierSchema,
    requestedAt: IsoDateTimeSchema,
    appVersion: RequiredTextSchema.optional(),
    deviceLabel: RequiredTextSchema.optional(),
    appBuild: RequiredTextSchema.optional(),
    environment: RequiredTextSchema.optional(),
    apiTarget: RequiredTextSchema.optional(),
    lastForegroundAt: IsoDateTimeSchema.optional(),
    pushPermission: PilotDevicePermissionStateSchema.optional(),
    pushProviderState: PilotDevicePushProviderStateSchema.optional(),
    cameraPermission: PilotDevicePermissionStateSchema.optional(),
    localSnapshot: z
      .object({
        lastCentralReadAt: IsoDateTimeSchema.optional(),
        lastSyncedAt: IsoDateTimeSchema.optional(),
        knownProductCount: z.number().int().nonnegative(),
        knownLotCount: z.number().int().nonnegative(),
        pendingCommandCount: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const CentralStoreSnapshotSchema = z
  .object({
    storeId: IdentifierSchema,
    storeName: RequiredTextSchema,
    centralVersion: z.number().int().positive(),
    generatedAt: IsoDateTimeSchema,
    centralReadAt: IsoDateTimeSchema.optional(),
    source: CentralPackageSourceSchema,
    readiness: z.enum(["needs_review", "cache_ready", "prepared", "blocked"]),
    blockers: z.array(RequiredTextSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.readiness === "prepared" && value.source !== "central") {
      context.addIssue({
        code: "custom",
        path: ["readiness"],
        message: "Prepared turns require a fresh central source.",
      });
    }

    if (value.readiness === "prepared" && value.centralReadAt === undefined) {
      context.addIssue({
        code: "custom",
        path: ["centralReadAt"],
        message: "Prepared turns require the central read timestamp.",
      });
    }
  });

export const CentralProductSnippetSchema = z
  .object({
    centralProductId: IdentifierSchema,
    displayName: RequiredTextSchema,
    categoryId: IdentifierSchema,
    categoryName: RequiredTextSchema,
    status: z.enum(["validated", "draft", "rejected", "archived"]),
    state: VisibleCentralSyncStateSchema,
    source: CentralPackageSourceSchema,
    updatedAt: IsoDateTimeSchema,
    gtin: IdentifierSchema.optional(),
    identifiers: z
      .array(z.lazy(() => ProductIdentifierSchema))
      .max(12)
      .optional(),
    categoryRuleProfile: CategoryRuleProfileSchema,
  })
  .strict();

export const CentralCategoryCatalogItemSchema = z
  .object({
    categoryId: IdentifierSchema,
    categoryName: RequiredTextSchema,
    categoryRuleProfile: CategoryRuleProfileSchema,
  })
  .strict()
  .superRefine((value, context) => {
    ensureCategoryProfileMatches(value.categoryId, value.categoryRuleProfile, context);
  });

export const CentralCategoryCatalogResponseSchema = z
  .object({
    categories: z.array(CentralCategoryCatalogItemSchema).max(80),
  })
  .strict();

const NormalizedProductKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine(
    (value) => value === value.toLocaleLowerCase("pt-BR"),
    "Normalized product keys must be lowercase.",
  )
  .refine(
    (value) => !/\s{2,}/.test(value),
    "Normalized product keys cannot contain double spaces.",
  );

const ProductGtinSchema = z
  .string()
  .trim()
  .regex(/^\d{8,14}$/);

export const ProductIdentifierTypeSchema = z.enum([
  "gtin",
  "ean",
  "barcode",
  "plu",
  "internal",
  "supplier_code",
]);

export const ProductIdentifierInputSchema = z
  .object({
    type: ProductIdentifierTypeSchema,
    value: IdentifierSchema,
  })
  .strict();

export const ProductIdentifierSchema = ProductIdentifierInputSchema.extend({
  normalizedValue: NormalizedProductKeySchema,
  source: z.enum(["central", "scan", "manual", "migration"]).optional(),
  isPrimary: z.boolean().optional(),
}).strict();

export const ProductCatalogSourceSchema = z.enum(["central", "draft_pending_review"]);

export const ProductReviewStatusSchema = z.enum([
  "validated",
  "pending_review",
  "rejected",
  "discarded",
]);

export const ProductMatchReasonSchema = z.enum([
  "exact_normalized_name",
  "exact_gtin",
  "exact_identifier",
  "similar_name",
  "similar_category",
]);

export const ProductDraftOutcomeSchema = z.enum([
  "reuse_existing",
  "similar_found",
  "draft_pending_review",
  "conflict",
]);

export const ProductDuplicateReasonSchema = z.enum(["gtin", "identifier", "normalized_name"]);

export const ProductReviewDecisionSchema = z.enum(["approve", "reject", "merge", "discard"]);

const ProductCatalogItemFields = {
  centralProductId: IdentifierSchema,
  displayName: RequiredTextSchema,
  normalizedKey: NormalizedProductKeySchema,
  categoryId: IdentifierSchema,
  categoryName: RequiredTextSchema,
  categoryRuleProfile: CategoryRuleProfileSchema,
  source: ProductCatalogSourceSchema,
  reviewStatus: ProductReviewStatusSchema,
  syncState: VisibleCentralSyncStateSchema,
  updatedAt: IsoDateTimeSchema,
  gtin: ProductGtinSchema.optional(),
  identifiers: z.array(ProductIdentifierSchema).max(12).optional(),
} as const;

export const ProductCatalogItemSchema = z
  .object(ProductCatalogItemFields)
  .strict()
  .superRefine((value, context) => {
    ensureCategoryProfileMatches(value.categoryId, value.categoryRuleProfile, context);
    ensureProductReviewStateMatchesSource(value.source, value.reviewStatus, context);
  });

export const ProductSearchCandidateSchema = z
  .object({
    ...ProductCatalogItemFields,
    matchKind: z.enum(["reusable_central", "similar_candidate", "draft_pending_review"]),
    matchReasons: z.array(ProductMatchReasonSchema).min(1).max(4),
    similarityScore: z.number().min(0).max(1).optional(),
    warning: RequiredTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    ensureCategoryProfileMatches(value.categoryId, value.categoryRuleProfile, context);
    ensureProductReviewStateMatchesSource(value.source, value.reviewStatus, context);

    if (value.matchKind === "similar_candidate" && value.warning === undefined) {
      context.addIssue({
        code: "custom",
        path: ["warning"],
        message: "Similar candidates require visible warning copy.",
      });
    }

    if (value.matchKind === "draft_pending_review" && value.reviewStatus !== "pending_review") {
      context.addIssue({
        code: "custom",
        path: ["reviewStatus"],
        message: "Draft pending-review candidates must expose pending_review state.",
      });
    }
  });

export const ProductDraftReviewStateSchema = z
  .object({
    draftId: IdentifierSchema,
    centralProductId: IdentifierSchema,
    displayName: RequiredTextSchema,
    normalizedKey: NormalizedProductKeySchema,
    categoryId: IdentifierSchema,
    categoryName: RequiredTextSchema,
    categoryRuleProfile: CategoryRuleProfileSchema,
    source: z.literal("draft_pending_review"),
    reviewStatus: ProductReviewStatusSchema,
    syncState: VisibleCentralSyncStateSchema,
    requestedByLabel: RequiredTextSchema,
    requestedAt: IsoDateTimeSchema,
    similarCandidates: z.array(ProductSearchCandidateSchema).max(5),
    gtin: ProductGtinSchema.optional(),
    identifiers: z.array(ProductIdentifierSchema).max(12).optional(),
    reviewReason: RequiredTextSchema.optional(),
    reviewedAt: IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    ensureCategoryProfileMatches(value.categoryId, value.categoryRuleProfile, context);

    if (value.reviewStatus !== "pending_review" && value.reviewReason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["reviewReason"],
        message: "Reviewed product drafts require a bounded review reason.",
      });
    }
  });

export const ProductSearchRequestSchema = z
  .object({
    query: RequiredTextSchema.optional(),
    gtin: ProductGtinSchema.optional(),
    categoryId: IdentifierSchema.optional(),
    identifier: ProductIdentifierInputSchema.optional(),
    requestedAt: IsoDateTimeSchema,
    includeDrafts: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.query !== undefined ||
      value.gtin !== undefined ||
      value.categoryId !== undefined ||
      value.identifier !== undefined,
    "Search by name, GTIN, identifier, or category before operating on a product.",
  );

export const ProductSearchResponseSchema = z
  .object({
    requestId: IdentifierSchema,
    normalizedQuery: NormalizedProductKeySchema.optional(),
    resultState: z.enum([
      "reuse_available",
      "similar_requires_review",
      "draft_pending_review",
      "no_safe_reuse",
    ]),
    reusableProducts: z.array(ProductSearchCandidateSchema).max(20),
    similarCandidates: z.array(ProductSearchCandidateSchema).max(10),
    draft: ProductDraftReviewStateSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.resultState === "reuse_available" && value.reusableProducts.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["reusableProducts"],
        message: "Reuse-available searches must return at least one reusable product.",
      });
    }

    if (value.resultState === "similar_requires_review" && value.similarCandidates.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["similarCandidates"],
        message: "Similar-review searches must return visible similar candidates.",
      });
    }

    if (value.resultState === "draft_pending_review" && value.draft === undefined) {
      context.addIssue({
        code: "custom",
        path: ["draft"],
        message: "Draft-pending searches must include the visible draft state.",
      });
    }
  });

export const ProductDraftCreateRequestSchema = z
  .object({
    displayName: RequiredTextSchema,
    categoryId: IdentifierSchema,
    categoryName: RequiredTextSchema,
    categoryRuleProfile: CategoryRuleProfileSchema,
    requestedAt: IsoDateTimeSchema,
    gtin: ProductGtinSchema.optional(),
    identifiers: z.array(ProductIdentifierInputSchema).max(8).optional(),
    supplierName: RequiredTextSchema.optional(),
    reason: RequiredTextSchema.optional(),
    similarCandidateIds: z.array(IdentifierSchema).max(5).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    ensureCategoryProfileMatches(value.categoryId, value.categoryRuleProfile, context);
  });

export const CentralProductAcknowledgementSchema = z
  .object({
    acknowledgementId: IdentifierSchema,
    centralProductId: IdentifierSchema,
    state: z.enum([
      "reused_existing",
      "draft_pending_review",
      "validated",
      "conflict",
      "discarded",
    ]),
    syncState: VisibleCentralSyncStateSchema,
    reviewStatus: ProductReviewStatusSchema,
    acknowledgedAt: IsoDateTimeSchema,
    message: RequiredTextSchema.optional(),
  })
  .strict();

export const ProductDraftCreateResponseSchema = z
  .object({
    requestId: IdentifierSchema,
    normalizedKey: NormalizedProductKeySchema,
    outcome: ProductDraftOutcomeSchema,
    duplicateReason: ProductDuplicateReasonSchema.optional(),
    reusableProduct: ProductCatalogItemSchema.optional(),
    similarCandidates: z.array(ProductSearchCandidateSchema).max(10),
    draft: ProductDraftReviewStateSchema.optional(),
    acknowledgement: CentralProductAcknowledgementSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.outcome === "reuse_existing") {
      if (value.duplicateReason === undefined) {
        context.addIssue({
          code: "custom",
          path: ["duplicateReason"],
          message: "Duplicate reuse responses must identify GTIN or normalized-name reuse.",
        });
      }

      if (value.reusableProduct === undefined) {
        context.addIssue({
          code: "custom",
          path: ["reusableProduct"],
          message: "Duplicate reuse responses must include the central product to reuse.",
        });
      }
    }

    if (value.outcome === "similar_found" && value.similarCandidates.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["similarCandidates"],
        message: "Similar-found responses must include visible product candidates.",
      });
    }

    if (value.outcome === "draft_pending_review") {
      if (value.draft === undefined) {
        context.addIssue({
          code: "custom",
          path: ["draft"],
          message: "Draft-created responses must expose pending review state.",
        });
      }

      if (value.acknowledgement?.state !== "draft_pending_review") {
        context.addIssue({
          code: "custom",
          path: ["acknowledgement"],
          message: "Draft-created responses require a draft-pending acknowledgement.",
        });
      }
    }
  });

export const ProductDraftReviewRequestSchema = z
  .object({
    draftId: IdentifierSchema,
    decision: ProductReviewDecisionSchema,
    reviewedAt: IsoDateTimeSchema,
    reason: RequiredTextSchema.optional(),
    mergeIntoCentralProductId: IdentifierSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.decision === "reject" || value.decision === "discard") &&
      value.reason === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Rejecting or discarding a draft requires a bounded reason.",
      });
    }

    if (value.decision === "merge" && value.mergeIntoCentralProductId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["mergeIntoCentralProductId"],
        message: "Merging a draft requires the central product that will receive it.",
      });
    }
  });

export const ProductDraftReviewResponseSchema = z
  .object({
    draft: ProductDraftReviewStateSchema,
    acknowledgement: CentralProductAcknowledgementSchema,
  })
  .strict();

export const CentralLotSnippetSchema = z
  .object({
    centralLotId: IdentifierSchema,
    centralProductId: IdentifierSchema,
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    mode: z.enum(PRODUCT_MODES),
    currentLocation: OperationalLocationSchema,
    state: VisibleCentralSyncStateSchema,
    source: CentralPackageSourceSchema,
    riskState: CentralRiskStateSchema.optional(),
    expiresAt: IsoDateSchema.optional(),
    receivedAt: IsoDateSchema.optional(),
    qualityInspectionDueAt: IsoDateSchema.optional(),
    approximateQuantity: z.number().nonnegative().optional(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const ActiveTaskSnippetSchema = z
  .object({
    centralTaskId: IdentifierSchema,
    activeKey: IdentifierSchema,
    centralLotId: IdentifierSchema,
    productDisplayName: RequiredTextSchema,
    currentLocation: OperationalLocationSchema,
    riskState: z.enum(TODAY_ACTIONABLE_RISK_STATES),
    severity: z.enum(TODAY_TASK_SEVERITIES),
    requiredResolution: z.enum(REQUIRED_RESOLUTIONS),
    state: VisibleCentralSyncStateSchema,
    source: CentralPackageSourceSchema,
    ownerLabel: RequiredTextSchema,
    dueAt: IsoDateTimeSchema.optional(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const ResolvedTaskHistorySnippetSchema = z
  .object({
    centralTaskId: IdentifierSchema,
    centralLotId: IdentifierSchema,
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    currentLocation: OperationalLocationSchema,
    action: z.enum(TASK_RESOLUTION_ACTIONS),
    actorLabel: RequiredTextSchema,
    reason: RequiredTextSchema.optional(),
    resolvedAt: IsoDateTimeSchema,
    state: z.literal("resolved"),
    source: z.literal("central"),
  })
  .strict();

export const CentralConflictSnippetSchema = z
  .object({
    conflictId: IdentifierSchema,
    commandId: IdentifierSchema,
    productDisplayName: RequiredTextSchema,
    lotIdentity: LotIdentitySchema,
    currentLocation: OperationalLocationSchema,
    reason: RequiredTextSchema,
    createdAt: IsoDateTimeSchema,
    state: z.enum(["conflict", "discarded"]),
    source: z.enum(["central", "pending_central"]),
  })
  .strict();

export const DeviceSnapshotSchema = z
  .object({
    deviceId: IdentifierSchema,
    deviceLabel: RequiredTextSchema.optional(),
    activeUserLabel: RequiredTextSchema.optional(),
    storeId: IdentifierSchema.optional(),
    storeName: RequiredTextSchema.optional(),
    appVersion: RequiredTextSchema.optional(),
    appBuild: RequiredTextSchema.optional(),
    environment: RequiredTextSchema.optional(),
    apiTarget: RequiredTextSchema.optional(),
    preparedAt: IsoDateTimeSchema.optional(),
    lastForegroundAt: IsoDateTimeSchema.optional(),
    lastSyncAt: IsoDateTimeSchema.optional(),
    lastCentralReadAt: IsoDateTimeSchema.optional(),
    lastHydratedAt: IsoDateTimeSchema.optional(),
    pendingCommandCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
    source: CentralPackageSourceSchema,
    pushPermission: PilotDevicePermissionStateSchema.optional(),
    pushProviderState: PilotDevicePushProviderStateSchema.optional(),
    cameraPermission: PilotDevicePermissionStateSchema.optional(),
    readinessVerdict: PilotDeviceReadinessVerdictSchema.optional(),
    readinessBlockers: z.array(PilotDeviceBlockerSchema).max(12).optional(),
  })
  .strict();

export const PrepareTurnCacheStatusSchema = z
  .object({
    state: z.enum(["needs_first_central_read", "ready", "stale", "unavailable"]),
    source: CentralPackageSourceSchema,
    updatedAt: IsoDateTimeSchema,
    lastCentralReadAt: IsoDateTimeSchema.optional(),
    staleAfterHours: z.number().positive(),
    productCount: z.number().int().nonnegative(),
    lotCount: z.number().int().nonnegative(),
    activeTaskCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
    resolvedHistoryCount: z.number().int().nonnegative(),
  })
  .strict();

export const PrepareTurnResponseSchema = z
  .object({
    requestId: IdentifierSchema,
    store: CentralStoreSnapshotSchema,
    device: DeviceSnapshotSchema,
    cache: PrepareTurnCacheStatusSchema,
    products: z.array(CentralProductSnippetSchema),
    lots: z.array(CentralLotSnippetSchema),
    activeTasks: z.array(ActiveTaskSnippetSchema),
    resolvedHistory: z.array(ResolvedTaskHistorySnippetSchema),
    conflicts: z.array(CentralConflictSnippetSchema),
  })
  .strict()
  .superRefine((value, context) => {
    rejectForbiddenHydrationFields(value, context);

    const centralFactCount =
      value.products.length +
      value.lots.length +
      value.activeTasks.length +
      value.resolvedHistory.length +
      value.conflicts.length;

    if (centralFactCount === 0 && value.store.readiness === "prepared") {
      context.addIssue({
        code: "custom",
        path: ["store", "readiness"],
        message: "An empty central package must stay needs_review or cache_ready, never prepared.",
      });
    }
  });

export const CaptureContract = {
  productInput: CaptureProductInputSchema,
  lotInput: CaptureLotInputSchema,
  physicalObservation: PhysicalObservationInputSchema,
  centralPhysicalObservation: CentralPhysicalObservationSchema,
  centralLotCreateRequest: CentralLotCreateRequestSchema,
  centralObservationAppendRequest: CentralObservationAppendRequestSchema,
  centralLotWriteResponse: CentralLotWriteResponseSchema,
  centralLotSnapshot: CentralLotSnapshotSchema,
  prepareTurnRequest: PrepareTurnRequestSchema,
  prepareTurnResponse: PrepareTurnResponseSchema,
  centralCategoryCatalogItem: CentralCategoryCatalogItemSchema,
  centralCategoryCatalogResponse: CentralCategoryCatalogResponseSchema,
  productSearchRequest: ProductSearchRequestSchema,
  productSearchResponse: ProductSearchResponseSchema,
  productDraftCreateRequest: ProductDraftCreateRequestSchema,
  productDraftCreateResponse: ProductDraftCreateResponseSchema,
  productDraftReviewRequest: ProductDraftReviewRequestSchema,
  productDraftReviewResponse: ProductDraftReviewResponseSchema,
} as const;

export type CategoryRuleProfileInput = z.infer<typeof CategoryRuleProfileSchema>;
export type ProductRuleOverrideInput = z.infer<typeof ProductRuleOverrideSchema>;
export type CaptureProductInput = z.infer<typeof CaptureProductInputSchema>;
export type OperationalLocation = z.infer<typeof OperationalLocationSchema>;
export type LotIdentity = z.infer<typeof LotIdentitySchema>;
export type CaptureLotInput = z.infer<typeof CaptureLotInputSchema>;
export type PhysicalObservationInput = z.infer<typeof PhysicalObservationInputSchema>;
export type CentralPhysicalObservation = z.infer<typeof CentralPhysicalObservationSchema>;
export type CentralLotLifecycleStatus = z.infer<typeof CentralLotLifecycleStatusSchema>;
export type CentralLotTaskProjectionSummary = z.infer<typeof CentralLotTaskProjectionSummarySchema>;
export type CentralLotSnapshot = z.infer<typeof CentralLotSnapshotSchema>;
export type CentralLotCreateRequest = z.infer<typeof CentralLotCreateRequestSchema>;
export type CentralLotWriteResponse = z.infer<typeof CentralLotWriteResponseSchema>;
export type CentralObservationAppendRequest = z.infer<typeof CentralObservationAppendRequestSchema>;
export type CentralPackageSource = z.infer<typeof CentralPackageSourceSchema>;
export type VisibleCentralSyncState = z.infer<typeof VisibleCentralSyncStateSchema>;
export type PrepareTurnRequest = z.infer<typeof PrepareTurnRequestSchema>;
export type CentralStoreSnapshot = z.infer<typeof CentralStoreSnapshotSchema>;
export type CentralProductSnippet = z.infer<typeof CentralProductSnippetSchema>;
export type CentralCategoryCatalogItem = z.infer<typeof CentralCategoryCatalogItemSchema>;
export type CentralCategoryCatalogResponse = z.infer<typeof CentralCategoryCatalogResponseSchema>;
export type CentralLotSnippet = z.infer<typeof CentralLotSnippetSchema>;
export type ActiveTaskSnippet = z.infer<typeof ActiveTaskSnippetSchema>;
export type ResolvedTaskHistorySnippet = z.infer<typeof ResolvedTaskHistorySnippetSchema>;
export type CentralConflictSnippet = z.infer<typeof CentralConflictSnippetSchema>;
export type DeviceSnapshot = z.infer<typeof DeviceSnapshotSchema>;
export type PrepareTurnCacheStatus = z.infer<typeof PrepareTurnCacheStatusSchema>;
export type PrepareTurnResponse = z.infer<typeof PrepareTurnResponseSchema>;
export type ProductCatalogSource = z.infer<typeof ProductCatalogSourceSchema>;
export type ProductIdentifierType = z.infer<typeof ProductIdentifierTypeSchema>;
export type ProductIdentifierInput = z.infer<typeof ProductIdentifierInputSchema>;
export type ProductIdentifier = z.infer<typeof ProductIdentifierSchema>;
export type ProductReviewStatus = z.infer<typeof ProductReviewStatusSchema>;
export type ProductMatchReason = z.infer<typeof ProductMatchReasonSchema>;
export type ProductDraftOutcome = z.infer<typeof ProductDraftOutcomeSchema>;
export type ProductDuplicateReason = z.infer<typeof ProductDuplicateReasonSchema>;
export type ProductReviewDecision = z.infer<typeof ProductReviewDecisionSchema>;
export type ProductCatalogItem = z.infer<typeof ProductCatalogItemSchema>;
export type ProductSearchCandidate = z.infer<typeof ProductSearchCandidateSchema>;
export type ProductDraftReviewState = z.infer<typeof ProductDraftReviewStateSchema>;
export type ProductSearchRequest = z.infer<typeof ProductSearchRequestSchema>;
export type ProductSearchResponse = z.infer<typeof ProductSearchResponseSchema>;
export type ProductDraftCreateRequest = z.infer<typeof ProductDraftCreateRequestSchema>;
export type CentralProductAcknowledgement = z.infer<typeof CentralProductAcknowledgementSchema>;
export type ProductDraftCreateResponse = z.infer<typeof ProductDraftCreateResponseSchema>;
export type ProductDraftReviewRequest = z.infer<typeof ProductDraftReviewRequestSchema>;
export type ProductDraftReviewResponse = z.infer<typeof ProductDraftReviewResponseSchema>;

function ensureCategoryProfileMatches(
  categoryId: string,
  categoryRuleProfile: CategoryRuleProfileInput,
  context: z.RefinementCtx,
): void {
  if (categoryRuleProfile.categoryId !== categoryId) {
    context.addIssue({
      code: "custom",
      path: ["categoryRuleProfile", "categoryId"],
      message: "The category rule profile must belong to the selected category.",
    });
  }
}

function ensureProductReviewStateMatchesSource(
  source: ProductCatalogSource,
  reviewStatus: ProductReviewStatus,
  context: z.RefinementCtx,
): void {
  if (source === "central" && reviewStatus === "pending_review") {
    context.addIssue({
      code: "custom",
      path: ["reviewStatus"],
      message: "Central reusable products cannot be hidden pending-review drafts.",
    });
  }

  if (source === "draft_pending_review" && reviewStatus === "validated") {
    context.addIssue({
      code: "custom",
      path: ["reviewStatus"],
      message: "Draft sources must remain visibly pending, rejected, or discarded.",
    });
  }
}

function rejectForbiddenHydrationFields(
  value: unknown,
  context: z.RefinementCtx,
  path: (string | number)[] = [],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectForbiddenHydrationFields(item, context, [...path, index]));
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];

    if (ForbiddenHydrationFields.includes(key as (typeof ForbiddenHydrationFields)[number])) {
      context.addIssue({
        code: "custom",
        path: nextPath,
        message: `Prepare-turn payloads must not carry raw evidence/storage field '${key}'.`,
      });
    }

    rejectForbiddenHydrationFields(nestedValue, context, nextPath);
  }
}
