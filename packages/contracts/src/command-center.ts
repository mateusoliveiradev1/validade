import { z } from "zod";
import { SafePushTestTimelineItemSchema } from "./alerts";

const IdentifierSchema = z.string().trim().min(1).max(160);
const RequiredTextSchema = z.string().trim().min(1).max(240);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const ShortLabelSchema = z.string().trim().min(1).max(80);
const UNKNOWN_BUILD_LABEL = "nao informado";
const PublicSafeTextSchema = RequiredTextSchema.refine(
  (value) => !/(https?:\/\/|eas:\/\/|token|secret|password|ExpoPushToken|buildUrl)/i.test(value),
  "Public evidence text cannot contain private URLs, tokens, or build links.",
);

export const PilotDeviceReadinessVerdictSchema = z.enum(["apto", "atencao", "bloqueado"]);
export const PilotBuildCompatibilitySchema = z.enum([
  "atual",
  "desatualizado",
  "desconhecido",
  "incompativel",
]);

export const PilotDevicePermissionStateSchema = z.enum([
  "granted",
  "denied",
  "not_requested",
  "unknown",
]);

export const PilotDevicePushProviderStateSchema = z.enum([
  "remote_ready",
  "local_only",
  "token_registered",
  "token_invalid",
  "provider_failed",
  "not_configured",
  "unknown",
]);

export const PilotDeviceBlockerCodeSchema = z.enum([
  "invalid_store_or_user",
  "missing_first_central_read",
  "stale_critical_sync",
  "push_required_without_push",
  "camera_required_without_camera",
  "incompatible_build",
  "old_build_attention",
  "pending_product_review",
  "sync_conflict",
  "unsafe_shift_close",
]);

export const PilotDeviceBlockerSchema = z
  .object({
    code: PilotDeviceBlockerCodeSchema,
    label: RequiredTextSchema,
    detail: RequiredTextSchema,
    nextAction: RequiredTextSchema,
    severity: z.enum(["warning", "blocking"]),
  })
  .strict();

export const PilotDeviceReadinessSchema = z
  .object({
    deviceIdMasked: ShortLabelSchema,
    deviceLabel: RequiredTextSchema,
    activeUserLabel: RequiredTextSchema,
    storeId: IdentifierSchema,
    storeName: RequiredTextSchema,
    appVersion: ShortLabelSchema,
    appBuild: ShortLabelSchema,
    environment: ShortLabelSchema,
    apiTarget: RequiredTextSchema,
    buildCompatibility: PilotBuildCompatibilitySchema,
    approvedArtifactLabel: ShortLabelSchema,
    approvedAppVersion: ShortLabelSchema,
    approvedBuild: ShortLabelSchema,
    lastForegroundAt: IsoDateTimeSchema.optional(),
    lastSyncAt: IsoDateTimeSchema.optional(),
    lastCentralReadAt: IsoDateTimeSchema.optional(),
    pushPermission: PilotDevicePermissionStateSchema,
    pushProviderState: PilotDevicePushProviderStateSchema,
    cameraPermission: PilotDevicePermissionStateSchema,
    verdict: PilotDeviceReadinessVerdictSchema,
    blockers: z.array(PilotDeviceBlockerSchema).max(12),
    pushTests: z.array(SafePushTestTimelineItemSchema).max(10).optional(),
    nextAction: RequiredTextSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const hasBlocking = value.blockers.some((blocker) => blocker.severity === "blocking");
    const hasWarning = value.blockers.some((blocker) => blocker.severity === "warning");

    if (value.verdict === "apto" && value.blockers.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["verdict"],
        message: "Apto devices cannot carry active blockers.",
      });
    }

    if (value.verdict === "bloqueado" && !hasBlocking) {
      context.addIssue({
        code: "custom",
        path: ["blockers"],
        message: "Bloqueado devices require at least one blocking cause.",
      });
    }

    if (value.verdict === "atencao" && (hasBlocking || !hasWarning)) {
      context.addIssue({
        code: "custom",
        path: ["blockers"],
        message: "Atencao devices require warning causes and no blocking causes.",
      });
    }
  });

export const CommandCenterVerdictSchema = z
  .object({
    state: z.enum(["safe", "blocked", "needs_review"]),
    title: RequiredTextSchema,
    detail: RequiredTextSchema,
  })
  .strict();

export const CommandCenterCriticalLotCauseSchema = z
  .object({
    code: z.enum([
      "formal_expiry_passed",
      "quality_window_expired",
      "sync_conflict",
      "sync_retry",
      "critical_unresolved",
    ]),
    label: RequiredTextSchema,
    detail: RequiredTextSchema,
    actionLabel: RequiredTextSchema,
    riskState: z.enum(["expired", "critical"]).optional(),
    requiredResolution: RequiredTextSchema.optional(),
    responsibleLabel: RequiredTextSchema.optional(),
    sourceEventId: IdentifierSchema.optional(),
    sourceEventSummary: RequiredTextSchema.optional(),
    firstDetectedAt: IsoDateTimeSchema.optional(),
    lastObservedAt: IsoDateTimeSchema.optional(),
    lastAttemptedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export const CommandCenterCriticalLotSchema = z
  .object({
    lotId: IdentifierSchema,
    label: RequiredTextSchema,
    locationLabel: RequiredTextSchema,
    reason: RequiredTextSchema,
    cause: CommandCenterCriticalLotCauseSchema,
  })
  .strict();

export const CommandCenterTaskSchema = z
  .object({
    taskId: IdentifierSchema,
    label: RequiredTextSchema,
    ownerLabel: RequiredTextSchema,
    dueLabel: RequiredTextSchema,
  })
  .strict();

export const CommandCenterMarkdownSchema = z
  .object({
    markdownId: IdentifierSchema,
    label: RequiredTextSchema,
    stage: RequiredTextSchema,
  })
  .strict();

export const CommandCenterProductDraftSchema = z
  .object({
    draftId: IdentifierSchema,
    label: RequiredTextSchema,
    reviewStatus: z.enum(["pending_review", "rejected", "discarded"]),
    detail: RequiredTextSchema,
    similarCount: z.number().int().nonnegative(),
    requestedByLabel: RequiredTextSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strict();

export const CommandCenterEvidenceSchema = z
  .object({
    assetId: IdentifierSchema,
    label: RequiredTextSchema,
    state: z.enum(["upload_requested", "uploading", "failed"]),
    detail: RequiredTextSchema,
  })
  .strict();

export const CommandCenterSyncConflictSchema = z
  .object({
    conflictId: IdentifierSchema,
    label: RequiredTextSchema,
    detail: RequiredTextSchema,
  })
  .strict();

export const CommandCenterDiscardedActionSchema = z
  .object({
    commandId: IdentifierSchema,
    label: RequiredTextSchema,
    reason: RequiredTextSchema,
    discardedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export const CommandCenterResolvedHistorySchema = z
  .object({
    taskId: IdentifierSchema,
    label: RequiredTextSchema,
    actionLabel: RequiredTextSchema,
    actorLabel: RequiredTextSchema,
    resolvedAt: IsoDateTimeSchema,
    detail: RequiredTextSchema,
  })
  .strict();

export const CommandCenterCentralSnapshotSchema = z
  .object({
    source: z.enum(["central", "local_cache", "pending_central"]),
    readiness: z.enum(["needs_review", "cache_ready", "prepared", "blocked"]),
    cacheState: z.enum(["needs_first_central_read", "ready", "stale", "unavailable"]),
    productCount: z.number().int().nonnegative(),
    draftProductCount: z.number().int().nonnegative(),
    lotCount: z.number().int().nonnegative(),
    activeTaskCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
    discardedActionCount: z.number().int().nonnegative(),
    resolvedHistoryCount: z.number().int().nonnegative(),
    pendingCommandCount: z.number().int().nonnegative(),
    lastCentralReadAt: IsoDateTimeSchema.optional(),
    lastHydratedAt: IsoDateTimeSchema.optional(),
    blockers: z.array(RequiredTextSchema),
  })
  .strict();

export const CommandCenterPendingShiftSchema = z
  .object({
    closureId: IdentifierSchema,
    label: RequiredTextSchema,
    blockerCount: z.number().int().nonnegative(),
  })
  .strict();

export const CommandCenterShiftHistorySchema = z
  .object({
    closureId: IdentifierSchema,
    label: RequiredTextSchema,
    verdict: z.enum(["safe", "unsafe"]),
    occurredAt: IsoDateTimeSchema,
  })
  .strict();

export const PilotUatStepIdSchema = z.enum([
  "prepare_turn",
  "product_real_input",
  "lot_registration",
  "terminal_resolution",
  "second_device_convergence",
  "command_center_consistency",
  "safe_push_test",
  "camera_evidence_or_fallback",
  "shift_close",
]);

export const PILOT_UAT_STEP_IDS = PilotUatStepIdSchema.options;

export const PilotUatStepStateSchema = z.enum(["pending", "passed", "blocked", "external_blocked"]);

export const PilotUatStepSchema = z
  .object({
    stepId: PilotUatStepIdSchema,
    label: RequiredTextSchema,
    state: PilotUatStepStateSchema,
    ownerLabel: RequiredTextSchema,
    actionLabel: RequiredTextSchema,
    operatorNote: PublicSafeTextSchema.optional(),
    cause: PublicSafeTextSchema.optional(),
    nextAction: PublicSafeTextSchema.optional(),
    evidenceReferenceLabel: PublicSafeTextSchema.optional(),
    occurredAt: IsoDateTimeSchema.optional(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.state === "blocked" || value.state === "external_blocked") &&
      (value.cause === undefined || value.nextAction === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["state"],
        message: "Blocked UAT steps require cause and next action.",
      });
    }
  });

export const PilotUatChecklistSchema = z
  .object({
    title: RequiredTextSchema,
    storeId: IdentifierSchema,
    storeName: RequiredTextSchema,
    summary: PublicSafeTextSchema,
    updatedAt: IsoDateTimeSchema,
    steps: z.array(PilotUatStepSchema).length(PILOT_UAT_STEP_IDS.length),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set(value.steps.map((step) => step.stepId));

    for (const stepId of PILOT_UAT_STEP_IDS) {
      if (!seen.has(stepId)) {
        context.addIssue({
          code: "custom",
          path: ["steps"],
          message: `Missing required UAT step ${stepId}.`,
        });
      }
    }

    if (seen.size !== value.steps.length) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message: "UAT checklist steps must be unique.",
      });
    }
  });

export const CommandCenterProjectionSchema = z
  .object({
    storeId: IdentifierSchema,
    storeName: RequiredTextSchema,
    refreshedAt: IsoDateTimeSchema,
    freshness: z.enum(["current", "stale"]),
    verdict: CommandCenterVerdictSchema,
    centralSnapshot: CommandCenterCentralSnapshotSchema,
    criticalLots: z.array(CommandCenterCriticalLotSchema),
    overdueTasks: z.array(CommandCenterTaskSchema),
    pendingMarkdowns: z.array(CommandCenterMarkdownSchema),
    pendingProductDrafts: z.array(CommandCenterProductDraftSchema),
    pendingEvidence: z.array(CommandCenterEvidenceSchema),
    syncConflicts: z.array(CommandCenterSyncConflictSchema),
    discardedActions: z.array(CommandCenterDiscardedActionSchema),
    resolvedHistory: z.array(CommandCenterResolvedHistorySchema),
    pendingShiftCloses: z.array(CommandCenterPendingShiftSchema),
    shiftHistory: z.array(CommandCenterShiftHistorySchema),
    devices: z.array(PilotDeviceReadinessSchema),
    pilotUat: PilotUatChecklistSchema,
  })
  .strict();

export type CommandCenterProjection = z.infer<typeof CommandCenterProjectionSchema>;
export type PilotDeviceReadiness = z.infer<typeof PilotDeviceReadinessSchema>;
export type PilotDeviceReadinessVerdict = z.infer<typeof PilotDeviceReadinessVerdictSchema>;
export type PilotBuildCompatibility = z.infer<typeof PilotBuildCompatibilitySchema>;
export type PilotUatChecklist = z.infer<typeof PilotUatChecklistSchema>;
export type PilotUatStep = z.infer<typeof PilotUatStepSchema>;
export type PilotUatStepId = z.infer<typeof PilotUatStepIdSchema>;
export type PilotUatStepState = z.infer<typeof PilotUatStepStateSchema>;

export interface ResolvePilotBuildCompatibilityInput {
  appVersion?: string | undefined;
  appBuild?: string | undefined;
  approvedAppVersion: string;
  approvedBuild: string;
}

export function resolvePilotBuildCompatibility(
  input: ResolvePilotBuildCompatibilityInput,
): PilotBuildCompatibility {
  const appVersion = normalizeBuildLabel(input.appVersion);
  const appBuild = normalizeBuildLabel(input.appBuild);
  const approvedAppVersion = normalizeBuildLabel(input.approvedAppVersion);
  const approvedBuild = normalizeBuildLabel(input.approvedBuild);

  if (
    appVersion === UNKNOWN_BUILD_LABEL ||
    appVersion === "0.0.0" ||
    appBuild === UNKNOWN_BUILD_LABEL
  ) {
    return "desconhecido";
  }

  const versionDiff = compareSemver(appVersion, approvedAppVersion);
  if (versionDiff === undefined) return "desconhecido";
  if (versionDiff < 0) return "desatualizado";
  if (versionDiff > 0) return "incompativel";

  const buildDiff = compareBuildNumber(appBuild, approvedBuild);
  if (buildDiff === undefined) return "desconhecido";
  if (buildDiff < 0) return "desatualizado";
  if (buildDiff > 0) return "incompativel";
  return "atual";
}

function normalizeBuildLabel(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? UNKNOWN_BUILD_LABEL : trimmed;
}

function compareBuildNumber(left: string, right: string): number | undefined {
  const leftNumber = Number.parseInt(left, 10);
  const rightNumber = Number.parseInt(right, 10);
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return undefined;
  return Math.sign(leftNumber - rightNumber);
}

function compareSemver(left: string, right: string): number | undefined {
  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);
  if (leftParts === undefined || rightParts === undefined) return undefined;

  for (const index of [0, 1, 2] as const) {
    const diff = leftParts[index] - rightParts[index];
    if (diff !== 0) return Math.sign(diff);
  }

  return 0;
}

function parseSemver(value: string): readonly [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (match === null) return undefined;

  const major = Number.parseInt(match[1] ?? "", 10);
  const minor = Number.parseInt(match[2] ?? "", 10);
  const patch = Number.parseInt(match[3] ?? "", 10);

  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
    return undefined;
  }

  return [major, minor, patch];
}
export type PilotDeviceBlocker = z.infer<typeof PilotDeviceBlockerSchema>;
export type PilotDeviceBlockerCode = z.infer<typeof PilotDeviceBlockerCodeSchema>;
export type PilotDevicePermissionState = z.infer<typeof PilotDevicePermissionStateSchema>;
export type PilotDevicePushProviderState = z.infer<typeof PilotDevicePushProviderStateSchema>;
