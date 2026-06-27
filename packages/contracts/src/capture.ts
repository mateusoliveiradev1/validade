import {
  PHYSICAL_CONFIRMATION_STATUSES,
  PRODUCT_MODES,
  REQUIRED_RESOLUTIONS,
  TASK_RESOLUTION_ACTIONS,
  TODAY_ACTIONABLE_RISK_STATES,
  TODAY_TASK_SEVERITIES,
} from "@validade-zero/domain";
import { z } from "zod";

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

const ForbiddenHydrationFields = [
  "uri",
  "base64",
  "objectKey",
  "photoUri",
  "imageBytes",
] as const;

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

export const CaptureLotInputSchema = z.discriminatedUnion("mode", [
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

export const PrepareTurnRequestSchema = z
  .object({
    deviceId: IdentifierSchema,
    requestedAt: IsoDateTimeSchema,
    appVersion: RequiredTextSchema.optional(),
    localSnapshot: z
      .object({
        lastCentralReadAt: IsoDateTimeSchema.optional(),
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
    categoryRuleProfile: CategoryRuleProfileSchema,
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
    state: z.literal("conflict"),
    source: z.enum(["central", "pending_central"]),
  })
  .strict();

export const DeviceSnapshotSchema = z
  .object({
    deviceId: IdentifierSchema,
    preparedAt: IsoDateTimeSchema.optional(),
    lastCentralReadAt: IsoDateTimeSchema.optional(),
    lastHydratedAt: IsoDateTimeSchema.optional(),
    pendingCommandCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
    source: CentralPackageSourceSchema,
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
  prepareTurnRequest: PrepareTurnRequestSchema,
  prepareTurnResponse: PrepareTurnResponseSchema,
} as const;

export type CategoryRuleProfileInput = z.infer<typeof CategoryRuleProfileSchema>;
export type ProductRuleOverrideInput = z.infer<typeof ProductRuleOverrideSchema>;
export type CaptureProductInput = z.infer<typeof CaptureProductInputSchema>;
export type OperationalLocation = z.infer<typeof OperationalLocationSchema>;
export type LotIdentity = z.infer<typeof LotIdentitySchema>;
export type CaptureLotInput = z.infer<typeof CaptureLotInputSchema>;
export type PhysicalObservationInput = z.infer<typeof PhysicalObservationInputSchema>;
export type CentralPackageSource = z.infer<typeof CentralPackageSourceSchema>;
export type VisibleCentralSyncState = z.infer<typeof VisibleCentralSyncStateSchema>;
export type PrepareTurnRequest = z.infer<typeof PrepareTurnRequestSchema>;
export type CentralStoreSnapshot = z.infer<typeof CentralStoreSnapshotSchema>;
export type CentralProductSnippet = z.infer<typeof CentralProductSnippetSchema>;
export type CentralLotSnippet = z.infer<typeof CentralLotSnippetSchema>;
export type ActiveTaskSnippet = z.infer<typeof ActiveTaskSnippetSchema>;
export type ResolvedTaskHistorySnippet = z.infer<typeof ResolvedTaskHistorySnippetSchema>;
export type CentralConflictSnippet = z.infer<typeof CentralConflictSnippetSchema>;
export type DeviceSnapshot = z.infer<typeof DeviceSnapshotSchema>;
export type PrepareTurnCacheStatus = z.infer<typeof PrepareTurnCacheStatusSchema>;
export type PrepareTurnResponse = z.infer<typeof PrepareTurnResponseSchema>;

function rejectForbiddenHydrationFields(
  value: unknown,
  context: z.RefinementCtx,
  path: (string | number)[] = [],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      rejectForbiddenHydrationFields(item, context, [...path, index]),
    );
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];

    if (
      ForbiddenHydrationFields.includes(key as (typeof ForbiddenHydrationFields)[number])
    ) {
      context.addIssue({
        code: "custom",
        path: nextPath,
        message: `Prepare-turn payloads must not carry raw evidence/storage field '${key}'.`,
      });
    }

    rejectForbiddenHydrationFields(nestedValue, context, nextPath);
  }
}
