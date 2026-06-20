import {
  ALERT_ATTEMPT_STATES,
  ALERT_AUDIENCES,
  ALERT_CHANNEL_STATES,
  ESCALATION_STATES,
} from "@validade-zero/domain";
import { z } from "zod";

const RequiredTextSchema = z.string().trim().min(1).max(240);
const IdentifierSchema = z.string().trim().min(1).max(160);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const RetryCountSchema = z.number().int().min(0).max(20);

export const AlertAudienceSchema = z.enum(ALERT_AUDIENCES);

export const AlertAttemptStateSchema = z.enum(ALERT_ATTEMPT_STATES);

export const AlertChannelStateSchema = z.enum(ALERT_CHANNEL_STATES);

export const EscalationStateSchema = z.enum(ESCALATION_STATES);

export const TaskAlertStateRecordSchema = z
  .object({
    taskId: IdentifierSchema,
    taskActiveKey: IdentifierSchema,
    channelState: AlertChannelStateSchema,
    attemptState: AlertAttemptStateSchema,
    audience: AlertAudienceSchema,
    escalationState: EscalationStateSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    lastReminderAt: IsoDateTimeSchema.optional(),
    nextReminderAt: IsoDateTimeSchema.optional(),
    escalatedAt: IsoDateTimeSchema.optional(),
    leadershipAcknowledgedAt: IsoDateTimeSchema.optional(),
    retryCount: RetryCountSchema.optional(),
    failureReason: RequiredTextSchema.optional(),
    lastAttemptId: IdentifierSchema.optional(),
  })
  .strict();

export const DevicePushRegistrationCommandSchema = z
  .object({
    deviceId: IdentifierSchema,
    deviceLabel: RequiredTextSchema,
    audienceRole: z.enum(["collaborator", "shift_team", "leadership"]),
    permissionStatus: z.enum(["not_requested", "granted", "denied", "unavailable"]),
    expoPushToken: RequiredTextSchema.max(240).optional(),
    registeredAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.permissionStatus === "granted" && value.expoPushToken === undefined) {
      context.addIssue({
        code: "custom",
        path: ["expoPushToken"],
        message: "Granted push permission must include a push token.",
      });
    }
  });

export const AlertDispatchCommandSchema = z
  .object({
    attemptId: IdentifierSchema,
    taskId: IdentifierSchema,
    taskActiveKey: IdentifierSchema,
    audience: AlertAudienceSchema,
    title: RequiredTextSchema,
    body: RequiredTextSchema,
    data: z
      .object({
        taskId: IdentifierSchema,
        taskActiveKey: IdentifierSchema,
      })
      .strict(),
    createdAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.data.taskId !== value.taskId) {
      context.addIssue({
        code: "custom",
        path: ["data", "taskId"],
        message: "Dispatch payload task id must match the command task id.",
      });
    }

    if (value.data.taskActiveKey !== value.taskActiveKey) {
      context.addIssue({
        code: "custom",
        path: ["data", "taskActiveKey"],
        message: "Dispatch payload active key must match the command active key.",
      });
    }

    const visibleContent = `${value.title} ${value.body}`.toLowerCase();
    const forbiddenTerms = ["lot", "lote", value.taskId.toLowerCase(), value.taskActiveKey.toLowerCase()];

    for (const term of forbiddenTerms) {
      if (visibleContent.includes(term)) {
        context.addIssue({
          code: "custom",
          path: ["title"],
          message: "Lock-screen alert content must not expose lot or task identity details.",
        });
        return;
      }
    }
  });

const ProviderIdsSchema = {
  providerTicketId: IdentifierSchema.optional(),
  providerReceiptId: IdentifierSchema.optional(),
} as const;

export const AlertDeliveryResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("ok"),
      ...ProviderIdsSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("retryable_error"),
      failureReason: RequiredTextSchema,
      retryAfterSeconds: z.number().int().positive().max(86_400).optional(),
      ...ProviderIdsSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("permanent_error"),
      failureReason: RequiredTextSchema,
      ...ProviderIdsSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("device_not_registered"),
      providerCode: z.literal("DeviceNotRegistered"),
      ...ProviderIdsSchema,
    })
    .strict(),
]);

export const PushOpenIntentSchema = z
  .object({
    taskId: IdentifierSchema,
    taskActiveKey: IdentifierSchema,
    openedAt: IsoDateTimeSchema,
    result: z.enum(["current_task", "task_updated", "task_resolved", "task_missing"]),
  })
  .strict();

export type AlertAudienceContract = z.infer<typeof AlertAudienceSchema>;
export type AlertAttemptStateContract = z.infer<typeof AlertAttemptStateSchema>;
export type AlertChannelStateContract = z.infer<typeof AlertChannelStateSchema>;
export type EscalationStateContract = z.infer<typeof EscalationStateSchema>;
export type TaskAlertStateRecord = z.infer<typeof TaskAlertStateRecordSchema>;
export type DevicePushRegistrationCommand = z.infer<typeof DevicePushRegistrationCommandSchema>;
export type AlertDispatchCommand = z.infer<typeof AlertDispatchCommandSchema>;
export type AlertDeliveryResult = z.infer<typeof AlertDeliveryResultSchema>;
export type PushOpenIntent = z.infer<typeof PushOpenIntentSchema>;
