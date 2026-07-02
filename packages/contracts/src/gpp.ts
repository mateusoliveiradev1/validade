import { z } from "zod";
import { AuthorizationRoleSchema } from "./authorization";

const RequiredIdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(280);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const QuantityValueSchema = z.number().positive().finite();
const BalanceQuantityValueSchema = z.number().min(0).finite();

export const GppQuantityUnitSchema = z.enum(["un", "kg", "g", "l", "ml", "caixa", "pacote"]);

export const GppAvariaFinalitySchema = z.enum([
  "baixa_gpp",
  "reaproveitamento",
  "producao_interna",
  "transferencia",
]);

export const GppAvariaStatusSchema = z.enum([
  "pendente",
  "divergencia",
  "corrigido",
  "revisado_gpp",
  "baixado",
  "cancelado",
  "estornado",
  "correcao_administrativa",
]);

export const GppPurchaseStatusSchema = z.enum([
  "solicitado",
  "atendido",
  "atendido_parcial",
  "sem_produto",
  "cancelado",
]);

export const GppCentralFeedbackStateSchema = z.enum([
  "idle",
  "saving_central",
  "central_confirmed",
  "central_failed",
  "replayed",
]);

export const GppRealtimeEventKindSchema = z.enum([
  "gpp_entries_changed",
  "gpp_purchase_requests_changed",
  "gpp_divergences_changed",
  "gpp_history_changed",
]);

export const GppRealtimeRefreshTopicSchema = z.enum([
  "queue",
  "purchases",
  "divergences",
  "history",
]);

export const GppDivergenceReasonSchema = z.enum([
  "quantidade_diferente",
  "codigo_produto_errado",
  "etiqueta_fisica_nao_encontrada",
  "setor_destino_errado",
  "duplicado",
  "producao_sem_finalidade_clara",
  "outro",
]);

export const GppStoreScopeSchema = z
  .object({
    storeId: RequiredIdentifierSchema,
    storeName: RequiredTextSchema,
  })
  .strict();

export const GppActorSnapshotSchema = z
  .object({
    actorId: RequiredIdentifierSchema,
    displayName: RequiredTextSchema,
    roleSnapshot: AuthorizationRoleSchema,
  })
  .strict();

export const GppProductIdentitySchema = z
  .object({
    code: RequiredIdentifierSchema,
    name: RequiredTextSchema,
  })
  .strict();

export const GppPurchaseProductDraftSchema = z
  .object({
    code: RequiredIdentifierSchema.optional(),
    name: RequiredTextSchema,
  })
  .strict();

export const GppQuantitySchema = z
  .object({
    value: QuantityValueSchema,
    unit: GppQuantityUnitSchema,
  })
  .strict();

export const GppBalanceQuantitySchema = z
  .object({
    value: BalanceQuantityValueSchema,
    unit: GppQuantityUnitSchema,
  })
  .strict();

export const GppAvariaEntrySchema = z
  .object({
    avariaId: RequiredIdentifierSchema,
    store: GppStoreScopeSchema,
    sector: RequiredTextSchema,
    product: GppProductIdentitySchema,
    quantity: GppQuantitySchema,
    finality: GppAvariaFinalitySchema,
    destination: RequiredTextSchema,
    status: GppAvariaStatusSchema,
    baixaEligibility: z.enum(["eligible", "blocked_divergence", "not_eligible"]),
    balanceQuantity: GppBalanceQuantitySchema,
    actor: GppActorSnapshotSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    centralState: GppCentralFeedbackStateSchema.default("central_confirmed"),
    divergenceReason: GppDivergenceReasonSchema.optional(),
    correctionJustification: RequiredTextSchema.optional(),
    baixaAt: IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "divergencia" && value.baixaEligibility !== "blocked_divergence") {
      context.addIssue({
        code: "custom",
        path: ["baixaEligibility"],
        message: "Divergent GPP avarias cannot be represented as eligible for baixa.",
      });
    }

    if (value.status !== "divergencia" && value.baixaEligibility === "blocked_divergence") {
      context.addIssue({
        code: "custom",
        path: ["baixaEligibility"],
        message: "Only divergent GPP avarias can use blocked_divergence eligibility.",
      });
    }

    if (value.status === "divergencia" && value.divergenceReason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["divergenceReason"],
        message: "Divergent GPP avarias require a divergence reason.",
      });
    }

    if (
      (value.status === "corrigido" || value.status === "correcao_administrativa") &&
      value.correctionJustification === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["correctionJustification"],
        message: "GPP corrections require a bounded justification.",
      });
    }

    if (value.status === "baixado" && value.baixaAt === undefined) {
      context.addIssue({
        code: "custom",
        path: ["baixaAt"],
        message: "Baixado GPP avarias require the central baixa timestamp.",
      });
    }
  });

export const GppAvariaMovementSchema = z
  .object({
    movementId: RequiredIdentifierSchema,
    avariaId: RequiredIdentifierSchema,
    kind: GppAvariaFinalitySchema,
    quantity: GppQuantitySchema,
    remainingBalance: GppBalanceQuantitySchema,
    actor: GppActorSnapshotSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
    destination: RequiredTextSchema.optional(),
    justification: RequiredTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === "transferencia" && value.destination === undefined) {
      context.addIssue({
        code: "custom",
        path: ["destination"],
        message: "GPP transfer movements require a destination.",
      });
    }

    if (
      (value.kind === "baixa_gpp" || value.kind === "transferencia") &&
      value.justification === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["justification"],
        message: "GPP baixa and transfer movements require a justification.",
      });
    }
  });

export const GppPurchaseRequestSchema = z
  .object({
    purchaseRequestId: RequiredIdentifierSchema,
    store: GppStoreScopeSchema,
    sector: RequiredTextSchema,
    product: GppPurchaseProductDraftSchema,
    requestedQuantity: GppQuantitySchema,
    finality: RequiredTextSchema,
    requester: GppActorSnapshotSchema,
    status: GppPurchaseStatusSchema,
    requestedAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    attendedProduct: GppProductIdentitySchema.optional(),
    attendedQuantity: GppQuantitySchema.optional(),
    exceptionReason: RequiredTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.status === "atendido" || value.status === "atendido_parcial") &&
      value.attendedProduct === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["attendedProduct"],
        message: "Attended GPP purchases require a confirmed product code.",
      });
    }

    if (
      (value.status === "atendido" || value.status === "atendido_parcial") &&
      value.attendedQuantity === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["attendedQuantity"],
        message: "Attended GPP purchases require the attended quantity.",
      });
    }

    if (
      ["atendido_parcial", "sem_produto", "cancelado"].includes(value.status) &&
      value.exceptionReason === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["exceptionReason"],
        message: "Exceptional GPP purchase outcomes require a reason.",
      });
    }
  });

export const GppAvariaGroupSummarySchema = z
  .object({
    groupId: RequiredIdentifierSchema,
    sector: RequiredTextSchema,
    product: GppProductIdentitySchema,
    finality: GppAvariaFinalitySchema,
    totalQuantity: GppQuantitySchema,
    entryCount: z.number().int().positive(),
    divergenceCount: z.number().int().nonnegative(),
    latestActivityAt: IsoDateTimeSchema,
    eligibleForBaixa: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.divergenceCount > 0 && value.eligibleForBaixa) {
      context.addIssue({
        code: "custom",
        path: ["eligibleForBaixa"],
        message: "Groups with open divergences cannot be eligible for baixa.",
      });
    }
  });

export const GppHistoryRowSchema = z
  .object({
    historyId: RequiredIdentifierSchema,
    event: z.enum([
      "created",
      "edited",
      "divergence_marked",
      "corrected",
      "reviewed_by_gpp",
      "baixado",
      "canceled",
      "estornado",
      "purchase_attended",
      "purchase_partial",
      "purchase_without_product",
      "administrative_correction",
    ]),
    targetType: z.enum(["avaria", "movement", "purchase_request"]),
    targetId: RequiredIdentifierSchema,
    productCode: RequiredIdentifierSchema.optional(),
    productName: RequiredTextSchema.optional(),
    sector: RequiredTextSchema.optional(),
    actor: GppActorSnapshotSchema,
    occurredAt: IsoDateTimeSchema,
    summary: RequiredTextSchema,
    justification: RequiredTextSchema.optional(),
  })
  .strict();

export const GppDetailSnapshotSchema = z
  .object({
    group: GppAvariaGroupSummarySchema,
    entries: z.array(GppAvariaEntrySchema),
    movements: z.array(GppAvariaMovementSchema),
    history: z.array(GppHistoryRowSchema),
  })
  .strict();

export const GppQueueSnapshotSchema = z
  .object({
    store: GppStoreScopeSchema,
    generatedAt: IsoDateTimeSchema,
    centralState: z.enum(["available", "unavailable"]),
    avariaGroups: z.array(GppAvariaGroupSummarySchema),
    purchaseRequests: z.array(GppPurchaseRequestSchema),
    divergenceEntries: z.array(GppAvariaEntrySchema),
    history: z.array(GppHistoryRowSchema),
  })
  .strict();

export const GppAvariaCreateRequestSchema = z
  .object({
    storeId: RequiredIdentifierSchema,
    sector: RequiredTextSchema,
    product: GppProductIdentitySchema,
    quantity: GppQuantitySchema,
    finality: GppAvariaFinalitySchema,
    destination: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
    justification: RequiredTextSchema.optional(),
  })
  .strict();

export const GppDivergenceMarkRequestSchema = z
  .object({
    avariaId: RequiredIdentifierSchema,
    reason: GppDivergenceReasonSchema,
    observation: RequiredTextSchema,
    correctedProduct: GppProductIdentitySchema.optional(),
    correctedQuantity: GppQuantitySchema.optional(),
    correctedSector: RequiredTextSchema.optional(),
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
  })
  .strict();

export const GppBaixaRequestSchema = z
  .object({
    avariaIds: z.array(RequiredIdentifierSchema).min(1).max(80),
    expectedVersion: z.number().int().positive().optional(),
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
    justification: RequiredTextSchema,
  })
  .strict();

export const GppPurchaseCreateRequestSchema = z
  .object({
    storeId: RequiredIdentifierSchema,
    sector: RequiredTextSchema,
    product: GppPurchaseProductDraftSchema,
    requestedQuantity: GppQuantitySchema,
    finality: RequiredTextSchema,
    requestedAt: IsoDateTimeSchema,
    idempotencyKey: RequiredIdentifierSchema,
  })
  .strict();

export const GppPurchaseAttendanceRequestSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("atendido"),
      purchaseRequestId: RequiredIdentifierSchema,
      confirmedProduct: GppProductIdentitySchema,
      attendedQuantity: GppQuantitySchema,
      occurredAt: IsoDateTimeSchema,
      idempotencyKey: RequiredIdentifierSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("atendido_parcial"),
      purchaseRequestId: RequiredIdentifierSchema,
      confirmedProduct: GppProductIdentitySchema,
      attendedQuantity: GppQuantitySchema,
      reason: RequiredTextSchema,
      occurredAt: IsoDateTimeSchema,
      idempotencyKey: RequiredIdentifierSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("sem_produto"),
      purchaseRequestId: RequiredIdentifierSchema,
      reason: RequiredTextSchema,
      occurredAt: IsoDateTimeSchema,
      idempotencyKey: RequiredIdentifierSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("cancelado"),
      purchaseRequestId: RequiredIdentifierSchema,
      reason: RequiredTextSchema,
      occurredAt: IsoDateTimeSchema,
      idempotencyKey: RequiredIdentifierSchema,
    })
    .strict(),
]);

export const GppMutationResponseSchema = z.discriminatedUnion("state", [
  z
    .object({
      state: z.literal("central_confirmed"),
      requestId: RequiredIdentifierSchema,
      confirmedAt: IsoDateTimeSchema,
      snapshot: GppQueueSnapshotSchema.optional(),
    })
    .strict(),
  z
    .object({
      state: z.literal("central_failed"),
      requestId: RequiredIdentifierSchema,
      failedAt: IsoDateTimeSchema,
      retryable: z.boolean(),
      message: RequiredTextSchema,
    })
    .strict(),
  z
    .object({
      state: z.literal("replayed"),
      requestId: RequiredIdentifierSchema,
      replayedAt: IsoDateTimeSchema,
      snapshot: GppQueueSnapshotSchema.optional(),
    })
    .strict(),
]);

export const GppRealtimeEnvelopeSchema = z
  .object({
    eventId: RequiredIdentifierSchema,
    storeId: RequiredIdentifierSchema,
    kind: GppRealtimeEventKindSchema,
    occurredAt: IsoDateTimeSchema,
    actorLabel: RequiredTextSchema.optional(),
    refresh: z
      .object({
        reason: z.enum(["central_commit", "history_append", "fallback_poll"]),
        scope: z.enum(["queue", "purchases", "history", "all"]),
        topics: z.array(GppRealtimeRefreshTopicSchema).min(1).max(4),
        cursor: RequiredIdentifierSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const serialized = JSON.stringify(value).toLocaleLowerCase("pt-BR");
    const forbiddenClaims = [
      "baixado",
      "atendido",
      "resolvido",
      "central_confirmed",
      "sucesso",
      "success",
    ];

    for (const claim of forbiddenClaims) {
      if (serialized.includes(claim)) {
        context.addIssue({
          code: "custom",
          path: ["refresh"],
          message: "GPP realtime events must be refresh hints, not authoritative outcomes.",
        });
        return;
      }
    }
  });

export const GppRealtimeEventSchema = GppRealtimeEnvelopeSchema;

export const GppContract = {
  quantity: GppQuantitySchema,
  avariaEntry: GppAvariaEntrySchema,
  avariaMovement: GppAvariaMovementSchema,
  purchaseRequest: GppPurchaseRequestSchema,
  avariaGroupSummary: GppAvariaGroupSummarySchema,
  detailSnapshot: GppDetailSnapshotSchema,
  historyRow: GppHistoryRowSchema,
  queueSnapshot: GppQueueSnapshotSchema,
  avariaCreateRequest: GppAvariaCreateRequestSchema,
  divergenceMarkRequest: GppDivergenceMarkRequestSchema,
  baixaRequest: GppBaixaRequestSchema,
  purchaseCreateRequest: GppPurchaseCreateRequestSchema,
  purchaseAttendanceRequest: GppPurchaseAttendanceRequestSchema,
  mutationResponse: GppMutationResponseSchema,
  realtimeEnvelope: GppRealtimeEnvelopeSchema,
  realtimeEvent: GppRealtimeEventSchema,
} as const;

export type GppQuantityUnit = z.infer<typeof GppQuantityUnitSchema>;
export type GppAvariaFinality = z.infer<typeof GppAvariaFinalitySchema>;
export type GppAvariaStatus = z.infer<typeof GppAvariaStatusSchema>;
export type GppPurchaseStatus = z.infer<typeof GppPurchaseStatusSchema>;
export type GppCentralFeedbackState = z.infer<typeof GppCentralFeedbackStateSchema>;
export type GppRealtimeEventKind = z.infer<typeof GppRealtimeEventKindSchema>;
export type GppDivergenceReason = z.infer<typeof GppDivergenceReasonSchema>;
export type GppStoreScope = z.infer<typeof GppStoreScopeSchema>;
export type GppActorSnapshot = z.infer<typeof GppActorSnapshotSchema>;
export type GppProductIdentity = z.infer<typeof GppProductIdentitySchema>;
export type GppPurchaseProductDraft = z.infer<typeof GppPurchaseProductDraftSchema>;
export type GppQuantity = z.infer<typeof GppQuantitySchema>;
export type GppAvariaEntry = z.infer<typeof GppAvariaEntrySchema>;
export type GppAvariaMovement = z.infer<typeof GppAvariaMovementSchema>;
export type GppPurchaseRequest = z.infer<typeof GppPurchaseRequestSchema>;
export type GppAvariaGroupSummary = z.infer<typeof GppAvariaGroupSummarySchema>;
export type GppHistoryRow = z.infer<typeof GppHistoryRowSchema>;
export type GppDetailSnapshot = z.infer<typeof GppDetailSnapshotSchema>;
export type GppQueueSnapshot = z.infer<typeof GppQueueSnapshotSchema>;
export type GppAvariaCreateRequest = z.infer<typeof GppAvariaCreateRequestSchema>;
export type GppDivergenceMarkRequest = z.infer<typeof GppDivergenceMarkRequestSchema>;
export type GppBaixaRequest = z.infer<typeof GppBaixaRequestSchema>;
export type GppPurchaseCreateRequest = z.infer<typeof GppPurchaseCreateRequestSchema>;
export type GppPurchaseAttendanceRequest = z.infer<typeof GppPurchaseAttendanceRequestSchema>;
export type GppMutationResponse = z.infer<typeof GppMutationResponseSchema>;
export type GppRealtimeEnvelope = z.infer<typeof GppRealtimeEnvelopeSchema>;
export type GppRealtimeEvent = z.infer<typeof GppRealtimeEventSchema>;
