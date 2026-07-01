import { z } from "zod";

const RequiredIdentifierSchema = z.string().trim().min(1).max(160);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const MOBILE_FIRST_TURN_ONBOARDING_FLOW_ID = "mobile_first_turn" as const;
export const MOBILE_FIRST_TURN_ONBOARDING_VERSION = "first_turn_assist_v1" as const;

export const OnboardingFlowIdSchema = z.literal(MOBILE_FIRST_TURN_ONBOARDING_FLOW_ID);
export const OnboardingVersionSchema = z.literal(MOBILE_FIRST_TURN_ONBOARDING_VERSION);
export const OnboardingProgressStatusSchema = z.enum(["not_started", "skipped", "completed"]);
export const OnboardingProgressMutationStatusSchema = z.enum(["skipped", "completed"]);
export const OnboardingProgressSourceSchema = z.enum(["none", "central", "derived"]);
export const OnboardingActivationSignalSchema = z.enum([
  "central_progress",
  "central_operational_fact",
]);

export const OnboardingProgressQuerySchema = z
  .object({
    flowId: OnboardingFlowIdSchema,
    version: OnboardingVersionSchema,
  })
  .strict();

export const OnboardingProgressMutationRequestSchema = OnboardingProgressQuerySchema.extend({
  status: OnboardingProgressMutationStatusSchema,
  occurredAt: IsoDateTimeSchema,
  deviceId: RequiredIdentifierSchema.optional(),
}).strict();

export const OnboardingProgressResponseSchema = OnboardingProgressQuerySchema.extend({
  status: OnboardingProgressStatusSchema,
  shouldShow: z.boolean(),
  source: OnboardingProgressSourceSchema,
  activationSignals: z.array(OnboardingActivationSignalSchema),
  completedAt: IsoDateTimeSchema.optional(),
  skippedAt: IsoDateTimeSchema.optional(),
  updatedAt: IsoDateTimeSchema.optional(),
}).strict();

export const OnboardingContract = {
  progressQuery: OnboardingProgressQuerySchema,
  progressMutation: OnboardingProgressMutationRequestSchema,
  progressResponse: OnboardingProgressResponseSchema,
} as const;

export type OnboardingFlowId = z.infer<typeof OnboardingFlowIdSchema>;
export type OnboardingVersion = z.infer<typeof OnboardingVersionSchema>;
export type OnboardingProgressStatus = z.infer<typeof OnboardingProgressStatusSchema>;
export type OnboardingProgressMutationStatus = z.infer<
  typeof OnboardingProgressMutationStatusSchema
>;
export type OnboardingProgressSource = z.infer<typeof OnboardingProgressSourceSchema>;
export type OnboardingActivationSignal = z.infer<typeof OnboardingActivationSignalSchema>;
export type OnboardingProgressQuery = z.infer<typeof OnboardingProgressQuerySchema>;
export type OnboardingProgressMutationRequest = z.infer<
  typeof OnboardingProgressMutationRequestSchema
>;
export type OnboardingProgressResponse = z.infer<typeof OnboardingProgressResponseSchema>;
