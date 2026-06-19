import { PHYSICAL_CONFIRMATION_STATUSES, PRODUCT_MODES } from "@validade-zero/domain";
import { z } from "zod";

const RequiredTextSchema = z.string().trim().min(1).max(160);
const IdentifierSchema = z.string().trim().min(1).max(120);
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

export type CategoryRuleProfileInput = z.infer<typeof CategoryRuleProfileSchema>;
export type ProductRuleOverrideInput = z.infer<typeof ProductRuleOverrideSchema>;
export type CaptureProductInput = z.infer<typeof CaptureProductInputSchema>;
export type OperationalLocation = z.infer<typeof OperationalLocationSchema>;
export type LotIdentity = z.infer<typeof LotIdentitySchema>;
export type CaptureLotInput = z.infer<typeof CaptureLotInputSchema>;
export type PhysicalObservationInput = z.infer<typeof PhysicalObservationInputSchema>;
