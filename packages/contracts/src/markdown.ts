import {
  MARKDOWN_REQUEST_REASONS,
  MARKDOWN_WORKFLOW_STATUSES,
  type MarkdownWorkflowStatus,
} from "@validade-zero/domain";
import { z } from "zod";
import { EvidencePromptMetadataSchema } from "./tasks";

const RequiredTextSchema = z.string().trim().min(1).max(240);
const IdentifierSchema = z.string().trim().min(1).max(160);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const MarkdownWorkflowStatusSchema = z.enum(MARKDOWN_WORKFLOW_STATUSES);

export const ActiveMarkdownStageSchema = z.enum(["requested", "approved", "applied"]);

export const MarkdownRequestReasonSchema = z.enum(MARKDOWN_REQUEST_REASONS);

export const CompletedEvidenceMetadataSchema = EvidencePromptMetadataSchema.refine(
  (value) => value.kind !== "photo_pending",
  "Markdown application and shelf confirmation require recorded photo metadata or explicit no-photo reason.",
);

export const MarkdownStageHistoryEntrySchema = z
  .object({
    stage: MarkdownWorkflowStatusSchema,
    action: z.enum([
      "request_markdown",
      "approve_markdown",
      "reject_markdown",
      "apply_markdown",
      "confirm_markdown_on_shelf",
    ]),
    actorLabel: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    reason: RequiredTextSchema.optional(),
    evidence: CompletedEvidenceMetadataSchema.optional(),
  })
  .strict();

export const MarkdownWorkflowRecordSchema = z
  .object({
    id: IdentifierSchema,
    lotId: IdentifierSchema,
    status: MarkdownWorkflowStatusSchema,
    currentStage: MarkdownWorkflowStatusSchema,
    requestedAt: IsoDateTimeSchema,
    requestedBy: RequiredTextSchema,
    requestReason: MarkdownRequestReasonSchema,
    earlyJustification: RequiredTextSchema.optional(),
    approvedAt: IsoDateTimeSchema.optional(),
    approvedBy: RequiredTextSchema.optional(),
    rejectedAt: IsoDateTimeSchema.optional(),
    rejectedBy: RequiredTextSchema.optional(),
    rejectionReason: RequiredTextSchema.optional(),
    appliedAt: IsoDateTimeSchema.optional(),
    appliedBy: RequiredTextSchema.optional(),
    applicationEvidence: CompletedEvidenceMetadataSchema.optional(),
    shelfConfirmedAt: IsoDateTimeSchema.optional(),
    shelfConfirmedBy: RequiredTextSchema.optional(),
    shelfConfirmationEvidence: CompletedEvidenceMetadataSchema.optional(),
    stageHistory: z.array(MarkdownStageHistoryEntrySchema).min(1),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.requestReason !== "rule_window" && value.earlyJustification === undefined) {
      context.addIssue({
        code: "custom",
        path: ["earlyJustification"],
        message: "Early markdown requests require an explicit justification.",
      });
    }

    if (value.status === "rejected" && value.rejectionReason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "Rejected markdown workflows require a rejection reason.",
      });
    }
  });

export const MarkdownRequestCommandSchema = z
  .object({
    lotId: IdentifierSchema,
    sourceTaskId: IdentifierSchema.optional(),
    actorLabel: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    reason: MarkdownRequestReasonSchema,
    earlyJustification: RequiredTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.reason !== "rule_window" && value.earlyJustification === undefined) {
      context.addIssue({
        code: "custom",
        path: ["earlyJustification"],
        message: "Early markdown requests require an explicit justification.",
      });
    }
  });

export const MarkdownApprovalCommandSchema = z
  .object({
    workflowId: IdentifierSchema,
    taskId: IdentifierSchema,
    actorLabel: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    decision: z.enum(["approved", "rejected"]),
    rejectionReason: RequiredTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "rejected" && value.rejectionReason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "Rejected markdown decisions require a reason.",
      });
    }

    if (value.decision === "approved" && value.rejectionReason !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "Approved markdown decisions must not include a rejection reason.",
      });
    }
  });

export const MarkdownApplicationCommandSchema = z
  .object({
    workflowId: IdentifierSchema,
    taskId: IdentifierSchema,
    actorLabel: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    evidence: CompletedEvidenceMetadataSchema,
  })
  .strict();

export const MarkdownShelfConfirmationCommandSchema = z
  .object({
    workflowId: IdentifierSchema,
    taskId: IdentifierSchema,
    actorLabel: RequiredTextSchema,
    occurredAt: IsoDateTimeSchema,
    evidence: CompletedEvidenceMetadataSchema,
  })
  .strict();

export function isActiveMarkdownStage(
  value: MarkdownWorkflowStatus,
): value is z.infer<typeof ActiveMarkdownStageSchema> {
  return ActiveMarkdownStageSchema.safeParse(value).success;
}

export type MarkdownWorkflowRecord = z.infer<typeof MarkdownWorkflowRecordSchema>;
export type MarkdownStageHistoryEntry = z.infer<typeof MarkdownStageHistoryEntrySchema>;
export type MarkdownRequestCommand = z.infer<typeof MarkdownRequestCommandSchema>;
export type MarkdownApprovalCommand = z.infer<typeof MarkdownApprovalCommandSchema>;
export type MarkdownApplicationCommand = z.infer<typeof MarkdownApplicationCommandSchema>;
export type MarkdownShelfConfirmationCommand = z.infer<
  typeof MarkdownShelfConfirmationCommandSchema
>;
export type CompletedEvidenceMetadata = z.infer<typeof CompletedEvidenceMetadataSchema>;
