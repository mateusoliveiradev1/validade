import {
  SHIFT_CLOSE_BLOCKER_CODES,
  SHIFT_CLOSE_CHECKLIST_KEYS,
  SHIFT_CLOSE_ELIGIBILITIES,
  SHIFT_CLOSE_RULE_VERSION,
  SHIFT_CLOSE_VERDICTS,
} from "@validade-zero/domain";
import { z } from "zod";

const IdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(240);
const LongTextSchema = z.string().trim().min(1).max(1_000);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const ShiftCloseChecklistSchema = z
  .array(z.enum(SHIFT_CLOSE_CHECKLIST_KEYS))
  .length(SHIFT_CLOSE_CHECKLIST_KEYS.length)
  .superRefine((value, context) => {
    value.forEach((item, index) => {
      if (item !== SHIFT_CLOSE_CHECKLIST_KEYS[index]) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Shift close checklist confirmations must follow the required order.",
        });
      }
    });
  });

export const ShiftCloseBlockerSchema = z
  .object({
    code: z.enum(SHIFT_CLOSE_BLOCKER_CODES),
    label: RequiredTextSchema,
    actionLabel: RequiredTextSchema,
  })
  .strict();

export const ShiftCloseEvaluationSchema = z
  .object({
    eligibility: z.enum(SHIFT_CLOSE_ELIGIBILITIES),
    blockers: z.array(ShiftCloseBlockerSchema),
    checklistComplete: z.boolean(),
    ruleVersion: z.literal(SHIFT_CLOSE_RULE_VERSION),
  })
  .strict();

const ShiftCloseBaseRequestSchema = z
  .object({
    storeId: IdentifierSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: IdentifierSchema,
  })
  .strict();

export const ShiftCloseUnsafeRequestSchema = ShiftCloseBaseRequestSchema.extend({
  verdict: z.literal("unsafe"),
  reason: RequiredTextSchema,
  continuityOwner: RequiredTextSchema,
  continuityDeadline: IsoDateTimeSchema,
  note: LongTextSchema,
  checklist: z.array(z.enum(SHIFT_CLOSE_CHECKLIST_KEYS)).max(SHIFT_CLOSE_CHECKLIST_KEYS.length),
}).strict();

export const ShiftCloseSafeRequestSchema = ShiftCloseBaseRequestSchema.extend({
  verdict: z.literal("safe"),
  checklist: ShiftCloseChecklistSchema,
}).strict();

export const ShiftCloseRequestSchema = z.discriminatedUnion("verdict", [
  ShiftCloseUnsafeRequestSchema,
  ShiftCloseSafeRequestSchema,
]);

export const ShiftClosureSnapshotSchema = z
  .object({
    closureId: IdentifierSchema,
    idempotencyKey: IdentifierSchema,
    storeId: IdentifierSchema,
    storeName: RequiredTextSchema,
    verdict: z.enum(SHIFT_CLOSE_VERDICTS),
    eligibility: z.enum(SHIFT_CLOSE_ELIGIBILITIES),
    blockers: z.array(ShiftCloseBlockerSchema),
    checklist: z.array(z.enum(SHIFT_CLOSE_CHECKLIST_KEYS)),
    actor: z
      .object({
        actorId: IdentifierSchema,
        displayName: RequiredTextSchema,
        roleSnapshot: z.enum(["collaborator", "lead", "admin"]),
      })
      .strict(),
    occurredAt: IsoDateTimeSchema,
    receivedAt: IsoDateTimeSchema,
    ruleVersion: z.literal(SHIFT_CLOSE_RULE_VERSION),
    reason: RequiredTextSchema.optional(),
    continuityOwner: RequiredTextSchema.optional(),
    continuityDeadline: IsoDateTimeSchema.optional(),
    note: LongTextSchema.optional(),
    revisionOfClosureId: IdentifierSchema.optional(),
    reopenReason: RequiredTextSchema.optional(),
    reopenSummary: LongTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.verdict === "unsafe" &&
      (value.reason === undefined ||
        value.continuityOwner === undefined ||
        value.continuityDeadline === undefined ||
        value.note === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Unsafe close snapshots require continuity details.",
      });
    }
  });

export const ShiftHandoffAcknowledgementRequestSchema = z
  .object({
    storeId: IdentifierSchema,
    closureId: IdentifierSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: IdentifierSchema,
  })
  .strict();

export const ShiftHandoffReceiptSchema = z
  .object({
    handoffId: IdentifierSchema,
    closureId: IdentifierSchema,
    storeId: IdentifierSchema,
    acknowledgedBy: IdentifierSchema,
    acknowledgedAt: IsoDateTimeSchema,
    receivedAt: IsoDateTimeSchema,
  })
  .strict();

export const ShiftCloseReopenRequestSchema = z
  .object({
    storeId: IdentifierSchema,
    reason: RequiredTextSchema,
    summary: LongTextSchema,
    occurredAt: IsoDateTimeSchema,
    idempotencyKey: IdentifierSchema,
  })
  .strict();

export type ShiftCloseChecklist = z.infer<typeof ShiftCloseChecklistSchema>;
export type ShiftCloseBlocker = z.infer<typeof ShiftCloseBlockerSchema>;
export type ShiftCloseEvaluation = z.infer<typeof ShiftCloseEvaluationSchema>;
export type ShiftCloseRequest = z.infer<typeof ShiftCloseRequestSchema>;
export type ShiftCloseUnsafeRequest = z.infer<typeof ShiftCloseUnsafeRequestSchema>;
export type ShiftCloseSafeRequest = z.infer<typeof ShiftCloseSafeRequestSchema>;
export type ShiftClosureSnapshot = z.infer<typeof ShiftClosureSnapshotSchema>;
export type ShiftHandoffAcknowledgementRequest = z.infer<
  typeof ShiftHandoffAcknowledgementRequestSchema
>;
export type ShiftHandoffReceipt = z.infer<typeof ShiftHandoffReceiptSchema>;
export type ShiftCloseReopenRequest = z.infer<typeof ShiftCloseReopenRequestSchema>;
