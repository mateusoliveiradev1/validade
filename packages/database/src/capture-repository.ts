import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  CentralResolvedTaskHistorySchema,
  PilotDeviceBlockerSchema,
  PilotDeviceReadinessSchema,
  CentralLotWriteResponseSchema,
  OnboardingProgressMutationStatusSchema,
  CentralCategoryCatalogItemSchema,
  CentralProductAcknowledgementSchema,
  PrepareTurnResponseSchema,
  ProductCatalogItemSchema,
  ProductIdentifierSchema,
  ProductDraftCreateResponseSchema,
  ProductDraftReviewResponseSchema,
  ProductSearchResponseSchema,
  SyncConflictRecordSchema,
  SyncTransportResultSchema,
  resolvePilotBuildCompatibility,
  type ActiveTaskSnippet,
  type CaptureLotInput,
  type CentralLotCreateRequest,
  type CentralLotSnapshot,
  type CentralLotTaskProjectionSummary,
  type CentralLotWriteResponse,
  type CentralObservationAppendRequest,
  type CentralPhysicalObservation,
  type CentralCategoryCatalogItem,
  type CentralProductAcknowledgement,
  type CentralConflictSnippet,
  type CentralLotSnippet,
  type CentralProductSnippet,
  type CentralResolvedTaskHistory,
  type OperationalLocation,
  type OnboardingFlowId,
  type OnboardingProgressMutationStatus,
  type OnboardingVersion,
  type PrepareTurnRequest,
  type PrepareTurnResponse,
  type PhysicalObservationInput,
  type ProductCatalogItem,
  type ProductDraftCreateRequest,
  type ProductDraftCreateResponse,
  type ProductDraftReviewRequest,
  type ProductDraftReviewResponse,
  type ProductDraftReviewState,
  type ProductDuplicateReason,
  type ProductIdentifier,
  type ProductIdentifierInput,
  type PilotBuildCompatibility,
  type PilotDeviceBlocker,
  type PilotDevicePermissionState,
  type PilotDevicePushProviderState,
  type PilotDeviceReadiness,
  type PilotDeviceReadinessVerdict,
  type ProductReviewStatus,
  type ProductSearchCandidate,
  type ProductSearchRequest,
  type ProductSearchResponse,
  type ResolvedTaskHistorySnippet,
  type SyncCommandRecord,
  type SyncConflictRecord,
  type SyncTransportResult,
  type VisibleCentralSyncState,
} from "@validade-zero/contracts";
import {
  projectCentralLotTask,
  resolveCentralTerminalOutcome,
  type CategoryRuleProfile,
  type RiskAssessment,
  type TaskResolutionAction,
  type TodayTaskLocation,
} from "@validade-zero/domain";

export type CaptureActorRoleSnapshot = "collaborator" | "lead" | "admin";

export interface PrepareTurnInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  request: PrepareTurnRequest;
}

export interface PrepareTurnDeniedInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  reason:
    | "unauthenticated"
    | "inactive_membership"
    | "capability_not_allowed"
    | "outside_store_scope";
  occurredAt: Date;
}

export interface DeviceSnapshotInput {
  deviceId: string;
  storeId: string;
  storeName?: string;
  deviceLabel?: string;
  activeUserLabel?: string;
  appVersion?: string;
  appBuild?: string;
  environment?: string;
  apiTarget?: string;
  preparedAt?: Date;
  lastForegroundAt?: Date;
  lastSyncAt?: Date;
  lastCentralReadAt?: Date;
  lastHydratedAt?: Date;
  pendingCommandCount: number;
  conflictCount: number;
  source: "central" | "local_cache" | "pending_central";
  pushPermission?: PilotDevicePermissionState;
  pushProviderState?: PilotDevicePushProviderState;
  expoPushToken?: string | undefined;
  cameraPermission?: PilotDevicePermissionState;
  readinessVerdict?: PilotDeviceReadinessVerdict;
  readinessBlockers?: readonly PilotDeviceBlocker[];
  updatedAt: Date;
}

export interface DevicePushChannelRegistrationInput {
  deviceId: string;
  storeId: string;
  storeName: string;
  deviceLabel: string;
  activeUserLabel: string;
  pushPermission: PilotDevicePermissionState;
  pushProviderState: PilotDevicePushProviderState;
  expoPushToken?: string;
  registeredAt: Date;
}

export interface DevicePushTarget {
  deviceId: string;
  deviceIdMasked: string;
  deviceLabel: string;
  storeId: string;
  pushPermission: PilotDevicePermissionState;
  pushProviderState: PilotDevicePushProviderState;
  expoPushToken: string;
  updatedAt: Date;
}

export interface OnboardingProgressLookupInput {
  subjectId: string;
  storeId: string;
  flowId: OnboardingFlowId;
  version: OnboardingVersion;
}

export interface OnboardingProgressSaveInput extends OnboardingProgressLookupInput {
  status: OnboardingProgressMutationStatus;
  occurredAt: Date;
  deviceId?: string | undefined;
}

export interface OnboardingProgressPersistenceRecord extends OnboardingProgressLookupInput {
  status: OnboardingProgressMutationStatus;
  completedAt?: string | undefined;
  skippedAt?: string | undefined;
  deviceId?: string | undefined;
  updatedAt: string;
}

export interface ListDeviceReadinessInput {
  storeId: string;
  storeName: string;
  now?: Date;
  requireRemotePush?: boolean;
  requireCamera?: boolean;
  staleCriticalSyncMinutes?: number;
  approvedArtifactLabel?: string;
  approvedAppVersion?: string;
  approvedBuild?: string;
}

export interface ProductSearchInput {
  requestId: string;
  storeId: string;
  request: ProductSearchRequest;
}

export interface ProductDraftCreateInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  request: ProductDraftCreateRequest;
}

export interface ProductDraftReviewInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  request: ProductDraftReviewRequest;
}

export interface CentralLotCreateInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  request: CentralLotCreateRequest;
}

export interface CentralObservationAppendInput {
  requestId: string;
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  centralLotId: string;
  request: CentralObservationAppendRequest;
}

export interface CentralSyncCommandApplyInput {
  storeId: string;
  storeName: string;
  actorId: string;
  actorDisplayName: string;
  actorRoleSnapshot: CaptureActorRoleSnapshot;
  deviceId: string;
  command: SyncCommandRecord;
  receivedAt: string;
}

export interface CaptureRepository {
  prepareTurn(input: PrepareTurnInput): Promise<PrepareTurnResponse>;
  loadOnboardingProgress(
    input: OnboardingProgressLookupInput,
  ): Promise<OnboardingProgressPersistenceRecord | null>;
  saveOnboardingProgress(
    input: OnboardingProgressSaveInput,
  ): Promise<OnboardingProgressPersistenceRecord>;
  hasOnboardingActivationSignal(input: { storeId: string }): Promise<boolean>;
  listCategories(): Promise<readonly CentralCategoryCatalogItem[]>;
  searchProducts(input: ProductSearchInput): Promise<ProductSearchResponse>;
  createProductDraft(input: ProductDraftCreateInput): Promise<ProductDraftCreateResponse>;
  reviewProductDraft(input: ProductDraftReviewInput): Promise<ProductDraftReviewResponse>;
  createLot(input: CentralLotCreateInput): Promise<CentralLotWriteResponse>;
  appendObservation(input: CentralObservationAppendInput): Promise<CentralLotWriteResponse>;
  applySyncCommand(input: CentralSyncCommandApplyInput): Promise<SyncTransportResult>;
  upsertDeviceSnapshot(input: DeviceSnapshotInput): Promise<void>;
  registerDevicePushChannel(input: DevicePushChannelRegistrationInput): Promise<void>;
  findDevicePushTarget(input: {
    storeId: string;
    deviceIdMasked: string;
    deviceLabel?: string | undefined;
  }): Promise<DevicePushTarget | null>;
  listDeviceReadiness(input: ListDeviceReadinessInput): Promise<readonly PilotDeviceReadiness[]>;
  recordPrepareTurnRejected(input: PrepareTurnDeniedInput): Promise<void>;
}

interface ProductRow {
  store_id?: string;
  central_product_id: string;
  display_name: string;
  normalized_key: string;
  category_id: string;
  category_name: string;
  status: CentralProductSnippet["status"];
  state: VisibleCentralSyncState;
  gtin: string | null;
  identifiers?: unknown;
  category_rule_profile: Record<string, unknown> | string;
  updated_at: string | Date;
}

interface CategoryRow {
  category_id: string;
  category_name: string;
  category_rule_profile: Record<string, unknown> | string;
}

interface LotRow {
  store_id?: string;
  central_lot_id: string;
  central_product_id: string;
  product_display_name: string;
  lot_identity: Record<string, unknown> | string;
  lot_identity_key?: string;
  mode: CentralLotSnippet["mode"];
  current_location: Record<string, unknown> | string;
  state: VisibleCentralSyncState;
  source: CentralLotSnippet["source"];
  risk_state: CentralLotSnippet["riskState"] | null;
  expires_at: string | null;
  received_at: string | null;
  quality_inspection_due_at: string | null;
  approximate_quantity: number | null;
  created_at?: string | Date;
  updated_at: string | Date;
}

interface LotProjectionRow extends LotRow {
  category_id: string;
  category_name: string;
  category_rule_profile: Record<string, unknown> | string;
  observation_id: string | null;
  observation_actor_display_name: string | null;
  observation_status: CentralPhysicalObservation["status"] | null;
  observation_location: Record<string, unknown> | string | null;
  observation_quantity: Record<string, unknown> | string | null;
  observation_occurred_at: string | Date | null;
}

interface ProjectionRefreshLotRow {
  central_lot_id: string;
}

interface TaskRow {
  central_task_id: string;
  active_key: string;
  central_lot_id: string;
  product_display_name: string;
  current_location: Record<string, unknown> | string;
  risk_state: ActiveTaskSnippet["riskState"];
  severity: ActiveTaskSnippet["severity"];
  required_resolution: ActiveTaskSnippet["requiredResolution"];
  state: VisibleCentralSyncState;
  owner_label: string;
  due_at: string | Date | null;
  updated_at: string | Date;
}

interface SyncTaskRow extends TaskRow {
  lot_identity: Record<string, unknown> | string;
  version: number;
}

interface ResolvedSyncTaskRow extends SyncTaskRow {
  resolution_action: ResolvedTaskHistorySnippet["action"] | null;
  actor_label: string | null;
  resolution_reason: string | null;
  resolved_at: string | Date | null;
}

interface ResolvedTaskRow {
  central_task_id: string;
  central_lot_id: string;
  product_display_name: string;
  lot_identity: Record<string, unknown> | string;
  current_location: Record<string, unknown> | string;
  resolution_action: ResolvedTaskHistorySnippet["action"];
  actor_label: string;
  resolution_reason: string | null;
  resolved_at: string | Date;
}

interface ConflictRow {
  conflict_id: string;
  command_id: string;
  product_display_name: string;
  lot_identity: Record<string, unknown> | string;
  current_location: Record<string, unknown> | string;
  reason: string;
  created_at: string | Date;
  state: "conflict" | "discarded";
}

interface DeviceSnapshotRow {
  device_id: string;
  store_id: string;
  device_label: string | null;
  active_user_label: string | null;
  store_name: string | null;
  app_version: string | null;
  app_build: string | null;
  environment: string | null;
  api_target: string | null;
  prepared_at: string | Date | null;
  last_foreground_at: string | Date | null;
  last_sync_at: string | Date | null;
  last_central_read_at: string | Date | null;
  last_hydrated_at: string | Date | null;
  pending_command_count: number;
  conflict_count: number;
  source: DeviceSnapshotInput["source"];
  push_permission: string | null;
  push_provider_state: string | null;
  expo_push_token?: string | null;
  camera_permission: string | null;
  readiness_verdict: string | null;
  readiness_blockers: unknown;
  updated_at: string | Date;
}

interface LegacyDevicePushChannelRow {
  device_id: string;
  payload: unknown;
  updated_at: string | Date;
}

interface OnboardingProgressRow {
  subject_id: string;
  store_id: string;
  flow_id: string;
  version: string;
  status: string;
  completed_at: string | Date | null;
  skipped_at: string | Date | null;
  device_id: string | null;
  updated_at: string | Date;
}

type StoredProduct = CentralProductSnippet & { storeId: string; normalizedKey?: string };
type StoredCategory = CentralCategoryCatalogItem;
type StoredProductDraft = ProductDraftReviewState & { storeId: string };
type StoredLot = CentralLotSnippet & { storeId: string };
type StoredTask = ActiveTaskSnippet & {
  storeId: string;
  taskStatus?: "active" | "resolved" | "blocked";
};
type StoredResolved = ResolvedTaskHistorySnippet & { storeId: string };
type StoredConflict = CentralConflictSnippet & { storeId: string };
type ActiveCentralTaskProjection = Extract<
  ReturnType<typeof projectCentralLotTask>,
  { attention: "active_task" }
>["task"];
type CentralObservationQuantity =
  | { quantityState: "estimated"; approximateQuantity: number }
  | { quantityState: "not_estimable" };

interface CentralLotProjectionContext {
  storeId: string;
  centralLotId: string;
  centralProductId: string;
  productDisplayName: string;
  categoryRuleProfile: CategoryRuleProfile;
  lotIdentity: CaptureLotInput["identity"];
  lotIdentityKey: string;
  mode: CaptureLotInput["mode"];
  initialLocation: OperationalLocation;
  currentLocation: OperationalLocation;
  state: VisibleCentralSyncState;
  source: CentralLotSnippet["source"];
  expiresAt?: string;
  receivedAt?: string;
  qualityInspectionDueAt?: string;
  qualityWindowDays?: number;
  approximateQuantity: number;
  createdAt: string;
  updatedAt: string;
  currentObservation: CentralPhysicalObservation;
}

interface CentralLotProjectionResult {
  response: CentralLotWriteResponse;
  activeTask?: ActiveTaskSnippet;
  assessment: RiskAssessment;
}

export function createNeonCaptureRepository(input: {
  connectionString: string;
}): CaptureRepository {
  return createCaptureRepositoryFromQuery(neon(input.connectionString));
}

export function createCaptureRepositoryFromQuery(
  sql: NeonQueryFunction<false, false>,
): CaptureRepository {
  async function upsertDeviceSnapshot(input: DeviceSnapshotInput): Promise<void> {
    await sql.query(
      `insert into central_device_snapshots (
        device_id, store_id, device_label, active_user_label, store_name, app_version, app_build,
        environment, api_target, prepared_at, last_foreground_at, last_sync_at,
        last_central_read_at, last_hydrated_at, pending_command_count, conflict_count, source,
        push_permission, push_provider_state, camera_permission, readiness_verdict,
        readiness_blockers, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10::timestamptz, $11::timestamptz, $12::timestamptz, $13::timestamptz, $14::timestamptz,
        $15, $16, $17, $18, $19, $20, $21, $22::jsonb, $23::timestamptz
      )
      on conflict (device_id, store_id) do update set
        device_label = coalesce(excluded.device_label, central_device_snapshots.device_label),
        active_user_label = coalesce(
          excluded.active_user_label,
          central_device_snapshots.active_user_label
        ),
        store_name = coalesce(excluded.store_name, central_device_snapshots.store_name),
        app_version = coalesce(excluded.app_version, central_device_snapshots.app_version),
        app_build = coalesce(excluded.app_build, central_device_snapshots.app_build),
        environment = coalesce(excluded.environment, central_device_snapshots.environment),
        api_target = coalesce(excluded.api_target, central_device_snapshots.api_target),
        prepared_at = excluded.prepared_at,
        last_foreground_at = coalesce(
          excluded.last_foreground_at,
          central_device_snapshots.last_foreground_at
        ),
        last_sync_at = coalesce(excluded.last_sync_at, central_device_snapshots.last_sync_at),
        last_central_read_at = excluded.last_central_read_at,
        last_hydrated_at = excluded.last_hydrated_at,
        pending_command_count = excluded.pending_command_count,
        conflict_count = excluded.conflict_count,
        source = excluded.source,
        push_permission = excluded.push_permission,
        push_provider_state = excluded.push_provider_state,
        camera_permission = excluded.camera_permission,
        readiness_verdict = excluded.readiness_verdict,
        readiness_blockers = excluded.readiness_blockers,
        updated_at = excluded.updated_at`,
      [
        input.deviceId,
        input.storeId,
        input.deviceLabel ?? null,
        input.activeUserLabel ?? null,
        input.storeName ?? null,
        input.appVersion ?? null,
        input.appBuild ?? null,
        input.environment ?? null,
        input.apiTarget ?? null,
        input.preparedAt?.toISOString() ?? null,
        input.lastForegroundAt?.toISOString() ?? null,
        input.lastSyncAt?.toISOString() ?? null,
        input.lastCentralReadAt?.toISOString() ?? null,
        input.lastHydratedAt?.toISOString() ?? null,
        input.pendingCommandCount,
        input.conflictCount,
        input.source,
        input.pushPermission ?? "unknown",
        input.pushProviderState ?? "unknown",
        input.cameraPermission ?? "unknown",
        input.readinessVerdict ?? null,
        JSON.stringify(input.readinessBlockers ?? []),
        input.updatedAt.toISOString(),
      ],
    );
  }

  async function registerDevicePushChannel(
    input: DevicePushChannelRegistrationInput,
  ): Promise<void> {
    try {
      await sql.query(
        `insert into central_device_snapshots (
          device_id, store_id, device_label, active_user_label, store_name, source,
          push_permission, push_provider_state, expo_push_token, updated_at
        ) values (
          $1, $2, $3, $4, $5, 'central', $6, $7, $8, $9::timestamptz
        )
        on conflict (device_id, store_id) do update set
          device_label = excluded.device_label,
          active_user_label = excluded.active_user_label,
          store_name = excluded.store_name,
          push_permission = excluded.push_permission,
          push_provider_state = excluded.push_provider_state,
          expo_push_token = excluded.expo_push_token,
          updated_at = excluded.updated_at`,
        [
          input.deviceId,
          input.storeId,
          input.deviceLabel,
          input.activeUserLabel,
          input.storeName,
          input.pushPermission,
          input.pushProviderState,
          input.expoPushToken ?? null,
          input.registeredAt.toISOString(),
        ],
      );
      return;
    } catch (error) {
      if (!isMissingExpoPushTokenColumn(error)) throw error;
    }

    await registerDevicePushChannelLegacy(input);
  }

  async function findDevicePushTarget(input: {
    storeId: string;
    deviceIdMasked: string;
    deviceLabel?: string | undefined;
  }): Promise<DevicePushTarget | null> {
    try {
      const rows = (await sql.query(
        `select device_id, store_id, device_label, push_permission, push_provider_state,
          expo_push_token, updated_at
        from central_device_snapshots
        where store_id = $1
          and expo_push_token is not null
          and btrim(expo_push_token) <> ''
        order by updated_at desc
        limit 200`,
        [input.storeId],
      )) as DeviceSnapshotRow[];

      const match = rows.find((row) => {
        const masked = maskDeviceId(row.device_id);
        if (masked !== input.deviceIdMasked) return false;
        return input.deviceLabel === undefined || row.device_label === input.deviceLabel;
      });

      if (match !== undefined) return devicePushTargetFromRow(match);
    } catch (error) {
      if (!isMissingExpoPushTokenColumn(error)) throw error;
    }

    return findDevicePushTargetLegacy(input);
  }

  async function registerDevicePushChannelLegacy(
    input: DevicePushChannelRegistrationInput,
  ): Promise<void> {
    const commandId = createStableId("push-channel", input.storeId, input.deviceId);
    const payload = {
      deviceLabel: input.deviceLabel,
      activeUserLabel: input.activeUserLabel,
      pushPermission: input.pushPermission,
      pushProviderState: input.pushProviderState,
      ...(input.expoPushToken === undefined ? {} : { expoPushToken: input.expoPushToken }),
      registeredAt: input.registeredAt.toISOString(),
    };

    await sql.query(
      `insert into central_sync_commands (
        command_id, idempotency_key, store_id, device_id, kind, state, payload, central_version,
        accepted_at, created_at, updated_at
      ) values (
        $1, $1, $2, $3, 'push_channel', 'synchronized', $4::jsonb, 1,
        $5::timestamptz, $5::timestamptz, $5::timestamptz
      )
      on conflict (command_id) do update set
        state = 'synchronized',
        payload = excluded.payload,
        accepted_at = excluded.accepted_at,
        updated_at = excluded.updated_at`,
      [
        commandId,
        input.storeId,
        input.deviceId,
        JSON.stringify(payload),
        input.registeredAt.toISOString(),
      ],
    );
  }

  async function findDevicePushTargetLegacy(input: {
    storeId: string;
    deviceIdMasked: string;
    deviceLabel?: string | undefined;
  }): Promise<DevicePushTarget | null> {
    const rows = (await sql.query(
      `select device_id, payload, updated_at
      from central_sync_commands
      where store_id = $1
        and kind = 'push_channel'
        and state = 'synchronized'
      order by updated_at desc
      limit 200`,
      [input.storeId],
    )) as LegacyDevicePushChannelRow[];

    const match = rows
      .map((row) => devicePushTargetFromLegacyRow(row, input.storeId))
      .filter((target): target is DevicePushTarget => target !== null)
      .find((target) => {
        if (target.deviceIdMasked !== input.deviceIdMasked) return false;
        return input.deviceLabel === undefined || target.deviceLabel === input.deviceLabel;
      });

    return match ?? null;
  }

  async function listDeviceReadiness(
    input: ListDeviceReadinessInput,
  ): Promise<readonly PilotDeviceReadiness[]> {
    const rows = (await sql.query(
      `select device_id, store_id, device_label, active_user_label, store_name, app_version,
        app_build, environment, api_target, prepared_at, last_foreground_at, last_sync_at,
        last_central_read_at, last_hydrated_at, pending_command_count, conflict_count, source,
        push_permission, push_provider_state, camera_permission, readiness_verdict,
        readiness_blockers, updated_at
      from central_device_snapshots
      where store_id = $1
        and coalesce(app_version, '') <> 'web-command-center'
        and active_user_label is not null
        and store_name is not null
      order by updated_at desc`,
      [input.storeId],
    )) as DeviceSnapshotRow[];

    return rows
      .map((row) => buildPilotDeviceReadiness(deviceSnapshotFromRow(row), input))
      .sort(comparePilotDeviceReadiness);
  }

  async function loadOnboardingProgress(
    input: OnboardingProgressLookupInput,
  ): Promise<OnboardingProgressPersistenceRecord | null> {
    const rows = (await sql.query(
      `select subject_id, store_id, flow_id, version, status, completed_at, skipped_at,
        device_id, updated_at
      from user_onboarding_progress
      where subject_id = $1
        and store_id = $2
        and flow_id = $3
        and version = $4
      limit 1`,
      [input.subjectId, input.storeId, input.flowId, input.version],
    )) as OnboardingProgressRow[];

    return rows[0] === undefined ? null : onboardingProgressFromRow(rows[0]);
  }

  async function saveOnboardingProgress(
    input: OnboardingProgressSaveInput,
  ): Promise<OnboardingProgressPersistenceRecord> {
    const completedAt = input.status === "completed" ? input.occurredAt.toISOString() : null;
    const skippedAt = input.status === "skipped" ? input.occurredAt.toISOString() : null;
    const rows = (await sql.query(
      `insert into user_onboarding_progress (
        subject_id, store_id, flow_id, version, status, completed_at, skipped_at, device_id,
        updated_at
      ) values (
        $1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8, $9::timestamptz
      )
      on conflict (subject_id, store_id, flow_id, version) do update set
        status = excluded.status,
        completed_at = excluded.completed_at,
        skipped_at = excluded.skipped_at,
        device_id = coalesce(excluded.device_id, user_onboarding_progress.device_id),
        updated_at = excluded.updated_at
      returning subject_id, store_id, flow_id, version, status, completed_at, skipped_at,
        device_id, updated_at`,
      [
        input.subjectId,
        input.storeId,
        input.flowId,
        input.version,
        input.status,
        completedAt,
        skippedAt,
        input.deviceId ?? null,
        input.occurredAt.toISOString(),
      ],
    )) as OnboardingProgressRow[];

    if (rows[0] === undefined) {
      throw new Error("onboarding_progress_not_saved");
    }

    return onboardingProgressFromRow(rows[0]);
  }

  async function hasOnboardingActivationSignal(input: { storeId: string }): Promise<boolean> {
    const rows = (await sql.query(
      `select exists (
        select 1 from central_lots
        where store_id = $1 and state <> 'discarded'
        union all
        select 1 from central_projected_tasks
        where store_id = $1 and status in ('active', 'resolved')
      ) as has_signal`,
      [input.storeId],
    )) as Array<{ has_signal: boolean | string | number }>;

    return booleanFromSql(rows[0]?.has_signal);
  }

  async function appendPrepareTurnAudit(input: PrepareTurnInput, response: PrepareTurnResponse) {
    await sql.query(
      `insert into audit_events (
        event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
        actor_role_snapshot, occurred_at, target_type, target_id, target_label, summary,
        status, metadata, sanitized
      ) values ($1, $2, 'sync.changed', $3, $4, $5, $6, $7, $8::timestamptz,
        'sync_command', $9, $10, $11, 'received', $12::jsonb, true
      ) on conflict (idempotency_key) do nothing`,
      [
        `${input.requestId}:audit`,
        `prepare-turn:${input.requestId}`,
        input.storeId,
        input.storeName,
        input.actorId,
        input.actorDisplayName,
        input.actorRoleSnapshot,
        input.request.requestedAt,
        input.requestId,
        "Preparar turno",
        "Leitura central servida para o aparelho autorizado.",
        JSON.stringify({
          deviceId: input.request.deviceId,
          readiness: response.store.readiness,
          activeTaskCount: response.activeTasks.length,
          conflictCount: response.conflicts.length,
        }),
      ],
    );
  }

  async function recordPrepareTurnRejected(input: PrepareTurnDeniedInput): Promise<void> {
    await sql.query(
      `insert into audit_events (
        event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
        actor_role_snapshot, occurred_at, target_type, target_id, target_label, summary,
        reason, status, metadata, sanitized
      ) values ($1, $2, 'access.denied', $3, $4, $5, $6, $7, $8::timestamptz,
        'access_request', $9, $10, $11, $12, 'denied', $13::jsonb, true
      ) on conflict (idempotency_key) do nothing`,
      [
        `${input.requestId}:denied`,
        `prepare-turn-denied:${input.requestId}`,
        input.storeId,
        input.storeName,
        input.actorId,
        input.actorDisplayName,
        input.actorRoleSnapshot,
        input.occurredAt.toISOString(),
        input.requestId,
        "Preparar turno negado",
        "Leitura central negada sem vazar dados da loja.",
        input.reason,
        JSON.stringify({ reason: input.reason }),
      ],
    );
  }

  async function appendProductAudit(input: {
    requestId: string;
    storeId: string;
    storeName: string;
    actorId: string;
    actorDisplayName: string;
    actorRoleSnapshot: CaptureActorRoleSnapshot;
    productId: string;
    productLabel: string;
    action: "product.reused" | "product.draft_created" | "product.reviewed";
    summary: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
    reason?: string;
  }): Promise<void> {
    await sql.query(
      `insert into audit_events (
        event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
        actor_role_snapshot, occurred_at, target_type, target_id, target_label, summary,
        reason, status, metadata, sanitized
      ) values ($1, $2, 'sync.changed', $3, $4, $5, $6, $7, $8::timestamptz,
        'product', $9, $10, $11, $12, 'received', $13::jsonb, true
      ) on conflict (idempotency_key) do nothing`,
      [
        `${input.requestId}:audit`,
        `product:${input.action}:${input.requestId}`,
        input.storeId,
        input.storeName,
        input.actorId,
        input.actorDisplayName,
        input.actorRoleSnapshot,
        input.occurredAt,
        input.productId,
        input.productLabel,
        input.summary,
        input.reason ?? null,
        JSON.stringify({
          action: input.action,
          ...sanitizeProductAuditMetadata(input.metadata ?? {}),
        }),
      ],
    );
  }

  async function appendLotAudit(input: {
    requestId: string;
    storeId: string;
    storeName: string;
    actorId: string;
    actorDisplayName: string;
    actorRoleSnapshot: CaptureActorRoleSnapshot;
    centralLotId: string;
    productDisplayName: string;
    action: "lot.created" | "lot.observation_appended";
    summary: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await sql.query(
      `insert into audit_events (
        event_id, idempotency_key, type, store_id, store_name, actor_id, actor_display_name,
        actor_role_snapshot, occurred_at, target_type, target_id, target_label, summary,
        status, metadata, sanitized
      ) values ($1, $2, 'task.changed', $3, $4, $5, $6, $7, $8::timestamptz,
        'lot', $9, $10, $11, 'received', $12::jsonb, true
      ) on conflict (idempotency_key) do nothing`,
      [
        `${input.requestId}:audit`,
        `lot:${input.action}:${input.requestId}`,
        input.storeId,
        input.storeName,
        input.actorId,
        input.actorDisplayName,
        input.actorRoleSnapshot,
        input.occurredAt,
        input.centralLotId,
        input.productDisplayName,
        input.summary,
        JSON.stringify({
          action: input.action,
          ...sanitizeProductAuditMetadata(input.metadata ?? {}),
        }),
      ],
    );
  }

  async function selectProductForLot(input: {
    storeId: string;
    centralProductId: string;
  }): Promise<ProductCatalogItem | undefined> {
    const rows = (await sql.query(
      `select p.central_product_id, p.store_id, p.display_name, p.normalized_key, p.category_id,
        p.category_name, p.status, p.state, p.gtin, p.category_rule_profile, p.updated_at,
        coalesce(
          (
            select json_agg(
              json_build_object(
                'type', i.identifier_type,
                'value', i.identifier_value,
                'normalizedValue', i.normalized_value,
                'source', i.source,
                'isPrimary', i.is_primary
              )
              order by i.is_primary desc, i.updated_at desc, i.identifier_value asc
            )
            from central_product_identifiers i
            where i.store_id = p.store_id
              and i.central_product_id = p.central_product_id
              and i.status = 'active'
          ),
          '[]'::json
        ) as identifiers
      from central_products p
      where p.store_id = $1 and p.central_product_id = $2 and p.status = 'validated'
      limit 1`,
      [input.storeId, input.centralProductId],
    )) as ProductRow[];

    return rows[0] === undefined ? undefined : mapCatalogProductRow(rows[0]);
  }

  async function selectLotProjectionContext(input: {
    storeId: string;
    centralLotId: string;
  }): Promise<CentralLotProjectionContext | undefined> {
    const rows = (await sql.query(
      `select l.store_id, l.central_lot_id, l.central_product_id, l.product_display_name,
        l.lot_identity, l.lot_identity_key, l.mode, l.current_location, l.state, l.source,
        l.risk_state, l.expires_at, l.received_at, l.quality_inspection_due_at,
        l.approximate_quantity, l.created_at, l.updated_at,
        p.category_id, p.category_name, p.category_rule_profile,
        o.observation_id, o.actor_display_name as observation_actor_display_name,
        o.status as observation_status, o.location as observation_location,
        o.quantity as observation_quantity, o.occurred_at as observation_occurred_at
      from central_lots l
      join central_products p on p.store_id = l.store_id and p.central_product_id = l.central_product_id
      left join lateral (
        select observation_id, actor_display_name, status, location, quantity, occurred_at
        from central_observations
        where store_id = l.store_id and central_lot_id = l.central_lot_id
        order by occurred_at desc, created_at desc
        limit 1
      ) o on true
      where l.store_id = $1 and l.central_lot_id = $2
      limit 1`,
      [input.storeId, input.centralLotId],
    )) as LotProjectionRow[];

    return rows[0] === undefined ? undefined : mapLotProjectionRow(rows[0]);
  }

  async function upsertCentralTaskProjection(input: {
    context: CentralLotProjectionContext;
    requestId: string;
    updatedAt: string;
  }): Promise<CentralLotProjectionResult> {
    const result = buildCentralLotProjectionResult({
      requestId: input.requestId,
      context: input.context,
      updatedAt: input.updatedAt,
    });

    if (result.activeTask === undefined) {
      await sql.query(
        `update central_projected_tasks
        set status = 'resolved',
          resolved_at = $1::timestamptz,
          resolution_reason = 'projection_cleared',
          actor_label = $2,
          updated_at = $1::timestamptz
        where store_id = $3 and central_lot_id = $4 and status = 'active'`,
        [
          input.updatedAt,
          input.context.currentObservation.actorLabel,
          input.context.storeId,
          input.context.centralLotId,
        ],
      );

      return result;
    }

    if (result.activeTask !== undefined) {
      await sql.query(
        `update central_projected_tasks
        set status = 'resolved',
          resolved_at = $1::timestamptz,
          resolution_reason = 'projection_replaced',
          actor_label = $2,
          updated_at = $1::timestamptz
        where store_id = $3 and central_lot_id = $4 and status = 'active' and active_key <> $5`,
        [
          input.updatedAt,
          input.context.currentObservation.actorLabel,
          input.context.storeId,
          input.context.centralLotId,
          result.activeTask.activeKey,
        ],
      );
      await sql.query(
        `insert into central_projected_tasks (
          central_task_id, active_key, store_id, central_lot_id, product_display_name,
          current_location, risk_state, severity, required_resolution, status, state,
          owner_label, due_at, version, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, 'active',
          'synchronized', $10, $11::timestamptz, 1, $11::timestamptz, $11::timestamptz
        )
        on conflict (store_id, active_key) do update set
          central_lot_id = excluded.central_lot_id,
          product_display_name = excluded.product_display_name,
          current_location = excluded.current_location,
          risk_state = excluded.risk_state,
          severity = excluded.severity,
          required_resolution = excluded.required_resolution,
          status = 'active',
          state = 'synchronized',
          owner_label = excluded.owner_label,
          due_at = excluded.due_at,
          resolved_at = null,
          resolution_action = null,
          resolution_reason = null,
          actor_label = null,
          version = central_projected_tasks.version + 1,
          updated_at = excluded.updated_at
        where central_projected_tasks.status <> 'resolved'`,
        [
          result.activeTask.centralTaskId,
          result.activeTask.activeKey,
          input.context.storeId,
          input.context.centralLotId,
          input.context.productDisplayName,
          JSON.stringify(input.context.currentLocation),
          result.activeTask.riskState,
          result.activeTask.severity,
          result.activeTask.requiredResolution,
          result.activeTask.ownerLabel,
          input.updatedAt,
        ],
      );
    } else {
      await sql.query(
        `update central_projected_tasks
        set status = 'resolved',
          resolved_at = $1::timestamptz,
          resolution_reason = 'projection_no_active_task',
          actor_label = $2,
          updated_at = $1::timestamptz
        where store_id = $3 and central_lot_id = $4 and status = 'active'`,
        [
          input.updatedAt,
          input.context.currentObservation.actorLabel,
          input.context.storeId,
          input.context.centralLotId,
        ],
      );
    }

    return result;
  }

  async function refreshCentralTaskProjectionsForPrepareTurn(
    input: PrepareTurnInput,
  ): Promise<void> {
    const rows = (await sql.query(
      `select central_lot_id
      from central_lots
      where store_id = $1
        and state <> 'discarded'
        and (
          expires_at is not null
          or received_at is not null
          or quality_inspection_due_at is not null
        )
      order by updated_at desc
      limit 150`,
      [input.storeId],
    )) as ProjectionRefreshLotRow[];

    for (const row of rows) {
      const context = await selectLotProjectionContext({
        storeId: input.storeId,
        centralLotId: row.central_lot_id,
      });

      if (context === undefined) continue;

      const result = await upsertCentralTaskProjection({
        context,
        requestId: createStableId(
          "prepare-projection",
          input.storeId,
          `${input.requestId}:${row.central_lot_id}`,
        ),
        updatedAt: input.request.requestedAt,
      });
      const riskState = centralRiskStateFromAssessment(result.assessment);

      await sql.query(
        `update central_lots
        set risk_state = $1,
          version = version + 1,
          updated_at = $2::timestamptz
        where store_id = $3
          and central_lot_id = $4
          and risk_state is distinct from $1`,
        [riskState, input.request.requestedAt, input.storeId, row.central_lot_id],
      );
    }
  }

  async function selectCatalogProducts(input: {
    storeId: string;
    normalizedKey?: string;
    gtin?: string;
    identifier?: ProductIdentifierInput;
    categoryId?: string;
    limit?: number;
  }): Promise<readonly ProductCatalogItem[]> {
    const normalizedGtin =
      input.gtin === undefined ? undefined : normalizeIdentifierValue(input.gtin);
    const normalizedIdentifier =
      input.identifier === undefined ? undefined : normalizeIdentifierValue(input.identifier.value);
    const rows = (await sql.query(
      `select p.central_product_id, p.store_id, p.display_name, p.normalized_key, p.category_id,
        p.category_name, p.status, p.state, p.gtin, p.category_rule_profile, p.updated_at,
        coalesce(
          (
            select json_agg(
              json_build_object(
                'type', i.identifier_type,
                'value', i.identifier_value,
                'normalizedValue', i.normalized_value,
                'source', i.source,
                'isPrimary', i.is_primary
              )
              order by i.is_primary desc, i.updated_at desc, i.identifier_value asc
            )
            from central_product_identifiers i
            where i.store_id = p.store_id
              and i.central_product_id = p.central_product_id
              and i.status = 'active'
          ),
          '[]'::json
        ) as identifiers
      from central_products p
      where p.store_id = $1
        and p.status <> 'archived'
        and (
          ($2::text is null and $3::text is null and $4::text is null and $6::product_identifier_type is null)
          or ($2::text is not null and (p.normalized_key = $2 or p.normalized_key like $5))
          or ($3::text is not null and (
            p.gtin = $3
            or exists (
              select 1
              from central_product_identifiers gi
              where gi.store_id = p.store_id
                and gi.central_product_id = p.central_product_id
                and gi.status = 'active'
                and gi.identifier_type in ('gtin', 'ean', 'barcode')
                and gi.normalized_value = $8
            )
          ))
          or ($4::text is not null and p.category_id = $4)
          or ($6::product_identifier_type is not null and exists (
            select 1
            from central_product_identifiers qi
            where qi.store_id = p.store_id
              and qi.central_product_id = p.central_product_id
              and qi.status = 'active'
              and qi.identifier_type = $6
              and qi.normalized_value = $7
          ))
        )
      order by
        case when p.normalized_key = $2 then 0 else 1 end,
        case
          when $3::text is not null and p.gtin = $3 then 0
          when $6::product_identifier_type is not null and exists (
            select 1
            from central_product_identifiers oi
            where oi.store_id = p.store_id
              and oi.central_product_id = p.central_product_id
              and oi.status = 'active'
              and oi.identifier_type = $6
              and oi.normalized_value = $7
          ) then 0
          else 1
        end,
        p.updated_at desc,
        p.display_name asc
      limit $9`,
      [
        input.storeId,
        input.normalizedKey ?? null,
        input.gtin ?? null,
        input.categoryId ?? null,
        input.normalizedKey === undefined ? null : `%${input.normalizedKey}%`,
        input.identifier?.type ?? null,
        normalizedIdentifier ?? null,
        normalizedGtin ?? null,
        input.limit ?? 20,
      ],
    )) as ProductRow[];

    return rows.map(mapCatalogProductRow);
  }

  async function listCategories(): Promise<readonly CentralCategoryCatalogItem[]> {
    const rows = (await sql.query(
      `select category_id, category_name, category_rule_profile
      from central_category_catalog
      where status = 'active'
      order by category_name asc, category_id asc`,
    )) as CategoryRow[];

    return rows.map(mapCategoryRow);
  }

  async function upsertProductIdentifiers(input: {
    storeId: string;
    centralProductId: string;
    identifiers: readonly ProductIdentifierInput[];
    source: ProductIdentifier["source"];
    occurredAt: string;
  }): Promise<void> {
    const identifiers = requestIdentifiers(input);

    for (const [index, identifier] of identifiers.entries()) {
      const normalizedValue = normalizeIdentifierValue(identifier.value);
      await sql.query(
        `insert into central_product_identifiers (
          identifier_id, store_id, central_product_id, identifier_type, identifier_value,
          normalized_value, status, source, is_primary, created_at, updated_at
        ) values ($1, $2, $3, $4::product_identifier_type, $5, $6, 'active', $7, $8, $9::timestamptz, $9::timestamptz)
        on conflict do nothing`,
        [
          createStableId(
            "product-identifier",
            input.storeId,
            `${input.centralProductId}:${identifier.type}:${normalizedValue}`,
          ),
          input.storeId,
          input.centralProductId,
          identifier.type,
          identifier.value,
          normalizedValue,
          input.source ?? "central",
          index === 0,
          input.occurredAt,
        ],
      );
    }
  }

  async function searchProducts(input: ProductSearchInput): Promise<ProductSearchResponse> {
    const normalizedKey = input.request.query && normalizeProductKey(input.request.query);
    const candidates = await selectCatalogProducts({
      storeId: input.storeId,
      ...(normalizedKey === undefined ? {} : { normalizedKey }),
      ...(input.request.gtin === undefined ? {} : { gtin: input.request.gtin }),
      ...(input.request.identifier === undefined ? {} : { identifier: input.request.identifier }),
      ...(input.request.categoryId === undefined ? {} : { categoryId: input.request.categoryId }),
      limit: 20,
    });

    return buildProductSearchResponse({
      requestId: input.requestId,
      request: input.request,
      products: candidates,
    });
  }

  async function createProductDraft(
    input: ProductDraftCreateInput,
  ): Promise<ProductDraftCreateResponse> {
    const normalizedKey = normalizeProductKey(input.request.displayName);
    const identifiers = requestIdentifiers(input.request);
    const primaryIdentifier =
      identifiers.find((identifier) => identifier.type !== "gtin") ?? identifiers[0];
    const exactMatches = await selectCatalogProducts({
      storeId: input.storeId,
      normalizedKey,
      ...(input.request.gtin === undefined ? {} : { gtin: input.request.gtin }),
      ...(primaryIdentifier === undefined ? {} : { identifier: primaryIdentifier }),
      limit: 10,
    });
    const exact = exactMatches.find(
      (candidate) =>
        candidate.normalizedKey === normalizedKey ||
        (input.request.gtin !== undefined && candidate.gtin === input.request.gtin) ||
        productHasAnyIdentifier(candidate, identifiers),
    );

    if (exact !== undefined) {
      await upsertProductIdentifiers({
        storeId: input.storeId,
        centralProductId: exact.centralProductId,
        identifiers,
        source: "scan",
        occurredAt: input.request.requestedAt,
      });
      const response = buildExistingProductCreateResponse({
        requestId: input.requestId,
        normalizedKey,
        product: exact,
        duplicateReason:
          input.request.gtin !== undefined && exact.gtin === input.request.gtin
            ? "gtin"
            : identifiers.length > 0 && productHasAnyIdentifier(exact, identifiers)
              ? "identifier"
              : "normalized_name",
      });
      await appendProductAudit({
        requestId: input.requestId,
        storeId: input.storeId,
        storeName: input.storeName,
        actorId: input.actorId,
        actorDisplayName: input.actorDisplayName,
        actorRoleSnapshot: input.actorRoleSnapshot,
        productId: exact.centralProductId,
        productLabel: exact.displayName,
        action: "product.reused",
        summary: "Produto central reutilizado durante criacao de rascunho.",
        occurredAt: input.request.requestedAt,
        metadata: {
          duplicateReason: response.duplicateReason ?? "normalized_name",
          linkedIdentifierCount: identifiers.length,
        },
      });

      return response;
    }

    const similarCandidates = buildSimilarCandidates({
      request: input.request,
      products: await selectCatalogProducts({
        storeId: input.storeId,
        normalizedKey,
        categoryId: input.request.categoryId,
        limit: 10,
      }),
    });
    const acknowledgedSimilarCandidates = new Set(input.request.similarCandidateIds ?? []);

    if (
      similarCandidates.length > 0 &&
      !similarCandidates.every((candidate) =>
        acknowledgedSimilarCandidates.has(candidate.centralProductId),
      )
    ) {
      return ProductDraftCreateResponseSchema.parse({
        requestId: input.requestId,
        normalizedKey,
        outcome: "similar_found",
        similarCandidates,
      });
    }

    const centralProductId = createStableId("product", input.storeId, normalizedKey);
    const draftId = createStableId("draft", input.storeId, normalizedKey);
    const requestedAt = new Date(input.request.requestedAt).toISOString();
    const categoryRuleProfile = JSON.stringify(input.request.categoryRuleProfile);

    await upsertCentralCategory({
      categoryId: input.request.categoryId,
      categoryName: input.request.categoryName,
      categoryRuleProfile,
      occurredAt: requestedAt,
    });
    await sql.query(
      `insert into central_products (
        central_product_id, store_id, display_name, normalized_key, category_id,
        category_name, status, state, gtin, category_rule_profile, version, created_at, updated_at
      ) values ($1, $2, $3, $4, $5, $6, 'draft', 'pending_central', $7, $8::jsonb, 1, $9::timestamptz, $9::timestamptz)
      on conflict (store_id, normalized_key) do nothing`,
      [
        centralProductId,
        input.storeId,
        input.request.displayName,
        normalizedKey,
        input.request.categoryId,
        input.request.categoryName,
        input.request.gtin ?? null,
        categoryRuleProfile,
        requestedAt,
      ],
    );
    await sql.query(
      `insert into central_product_drafts (
        draft_id, store_id, central_product_id, requested_by, requested_by_label,
        review_status, similar_product_ids, reason, created_at
      ) values ($1, $2, $3, $4, $5, 'pending', $6::jsonb, $7, $8::timestamptz)
      on conflict (draft_id) do nothing`,
      [
        draftId,
        input.storeId,
        centralProductId,
        input.actorId,
        input.actorDisplayName,
        JSON.stringify(similarCandidates.map((candidate) => candidate.centralProductId)),
        input.request.reason ?? null,
        requestedAt,
      ],
    );
    await upsertProductIdentifiers({
      storeId: input.storeId,
      centralProductId,
      identifiers,
      source: "scan",
      occurredAt: requestedAt,
    });

    const draft = buildDraftState({
      draftId,
      centralProductId,
      request: input.request,
      normalizedKey,
      requestedByLabel: input.actorDisplayName,
      requestedAt,
      similarCandidates,
    });
    const acknowledgement = buildProductAcknowledgement({
      requestId: input.requestId,
      centralProductId,
      state: "draft_pending_review",
      syncState: "pending_central",
      reviewStatus: "pending_review",
      acknowledgedAt: requestedAt,
      message:
        "Cadastro do produto em revisao. O lote entra com risco conservador ate a validacao.",
    });

    await appendProductAudit({
      requestId: input.requestId,
      storeId: input.storeId,
      storeName: input.storeName,
      actorId: input.actorId,
      actorDisplayName: input.actorDisplayName,
      actorRoleSnapshot: input.actorRoleSnapshot,
      productId: centralProductId,
      productLabel: input.request.displayName,
      action: "product.draft_created",
      summary: "Rascunho operacional de produto criado para revisao central.",
      occurredAt: requestedAt,
      metadata: {
        reviewStatus: "pending_review",
        similarCandidateCount: similarCandidates.length,
      },
    });

    return ProductDraftCreateResponseSchema.parse({
      requestId: input.requestId,
      normalizedKey,
      outcome: "draft_pending_review",
      similarCandidates,
      draft,
      acknowledgement,
    });
  }

  async function upsertCentralCategory(input: {
    categoryId: string;
    categoryName: string;
    categoryRuleProfile: string;
    occurredAt: string;
  }): Promise<void> {
    await sql.query(
      `insert into central_category_catalog (
        category_id, category_name, category_rule_profile, status, created_at, updated_at
      ) values ($1, $2, $3::jsonb, 'active', $4::timestamptz, $4::timestamptz)
      on conflict (category_id) do update set
        category_name = excluded.category_name,
        category_rule_profile = excluded.category_rule_profile,
        status = 'active',
        updated_at = excluded.updated_at`,
      [input.categoryId, input.categoryName, input.categoryRuleProfile, input.occurredAt],
    );
  }

  async function reviewProductDraft(
    input: ProductDraftReviewInput,
  ): Promise<ProductDraftReviewResponse> {
    const rows = (await sql.query(
      `select p.central_product_id, p.store_id, p.display_name, p.normalized_key, p.category_id,
        p.category_name, p.status, p.state, p.gtin, p.category_rule_profile, p.updated_at,
        coalesce(
          (
            select json_agg(
              json_build_object(
                'type', i.identifier_type,
                'value', i.identifier_value,
                'normalizedValue', i.normalized_value,
                'source', i.source,
                'isPrimary', i.is_primary
              )
              order by i.is_primary desc, i.updated_at desc, i.identifier_value asc
            )
            from central_product_identifiers i
            where i.store_id = p.store_id
              and i.central_product_id = p.central_product_id
              and i.status = 'active'
          ),
          '[]'::json
        ) as identifiers,
        d.draft_id, d.requested_by_label, d.created_at
      from central_product_drafts d
      join central_products p on p.central_product_id = d.central_product_id and p.store_id = d.store_id
      where d.store_id = $1 and (d.draft_id = $2 or d.central_product_id = $2)
      limit 1`,
      [input.storeId, input.request.draftId],
    )) as (ProductRow & {
      draft_id: string;
      requested_by_label: string;
      created_at: string | Date;
    })[];
    const row = rows[0];

    if (row === undefined) {
      throw new Error("product_draft_not_found");
    }

    const nextReviewStatus = reviewStatusForDecision(input.request.decision);
    const nextProductStatus =
      nextReviewStatus === "validated"
        ? "validated"
        : nextReviewStatus === "discarded"
          ? "archived"
          : "rejected";
    const reviewedAt = new Date(input.request.reviewedAt).toISOString();

    await sql.query(
      `update central_products
      set status = $1, state = $2, updated_at = $3::timestamptz
      where store_id = $4 and central_product_id = $5`,
      [
        nextProductStatus,
        nextReviewStatus === "validated" ? "synchronized" : "discarded",
        reviewedAt,
        input.storeId,
        row.central_product_id,
      ],
    );
    await sql.query(
      `update central_product_drafts
      set review_status = $1, reason = $2, reviewed_at = $3::timestamptz
      where store_id = $4 and draft_id = $5`,
      [nextReviewStatus, input.request.reason ?? null, reviewedAt, input.storeId, row.draft_id],
    );

    const product = mapCatalogProductRow({
      ...row,
      status: nextProductStatus,
      state: nextReviewStatus === "validated" ? "synchronized" : "discarded",
      updated_at: reviewedAt,
    });
    const draft = buildDraftStateFromProduct({
      draftId: row.draft_id,
      product,
      requestedByLabel: row.requested_by_label,
      requestedAt: toIso(row.created_at),
      reviewStatus: nextReviewStatus,
      ...(input.request.reason === undefined ? {} : { reviewReason: input.request.reason }),
      reviewedAt,
    });
    const acknowledgement = buildProductAcknowledgement({
      requestId: input.requestId,
      centralProductId: product.centralProductId,
      state: nextReviewStatus === "validated" ? "validated" : "discarded",
      syncState: nextReviewStatus === "validated" ? "synchronized" : "discarded",
      reviewStatus: nextReviewStatus,
      acknowledgedAt: reviewedAt,
      message:
        nextReviewStatus === "validated"
          ? "Produto validado para operacao central."
          : "Rascunho de produto encerrado com motivo registrado.",
    });

    await appendProductAudit({
      requestId: input.requestId,
      storeId: input.storeId,
      storeName: input.storeName,
      actorId: input.actorId,
      actorDisplayName: input.actorDisplayName,
      actorRoleSnapshot: input.actorRoleSnapshot,
      productId: product.centralProductId,
      productLabel: product.displayName,
      action: "product.reviewed",
      summary: "Rascunho operacional de produto revisado pela lideranca.",
      occurredAt: reviewedAt,
      ...(input.request.reason === undefined ? {} : { reason: input.request.reason }),
      metadata: {
        decision: input.request.decision,
        reviewStatus: nextReviewStatus,
        mergeIntoCentralProductId: input.request.mergeIntoCentralProductId ?? null,
      },
    });

    return ProductDraftReviewResponseSchema.parse({ draft, acknowledgement });
  }

  async function createLot(input: CentralLotCreateInput): Promise<CentralLotWriteResponse> {
    const product = await selectProductForLot({
      storeId: input.storeId,
      centralProductId: input.request.lot.productId,
    });

    if (product === undefined) {
      throw new Error("central_product_not_found");
    }

    const occurredAt = new Date(input.request.occurredAt).toISOString();
    const centralLotId = createStableId(
      "lot",
      input.storeId,
      input.request.idempotencyKey ??
        `${input.request.lot.productId}:${lotIdentityKey(input.request.lot.identity)}`,
    );
    const existingContext = await selectLotProjectionContext({
      storeId: input.storeId,
      centralLotId,
    });

    if (existingContext !== undefined) {
      const replay = await upsertCentralTaskProjection({
        context: existingContext,
        requestId: input.requestId,
        updatedAt: existingContext.updatedAt,
      });

      return replay.response;
    }

    const observation = buildCentralObservation({
      centralLotId,
      centralObservationId: createStableId(
        "obs",
        input.storeId,
        `${centralLotId}:${input.request.idempotencyKey ?? occurredAt}:initial`,
      ),
      observation: initialObservationFromLot(input.request),
    });
    const context = buildLotProjectionContextFromCreate({
      storeId: input.storeId,
      centralLotId,
      lot: input.request.lot,
      product,
      observation,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    const projection = buildCentralLotProjectionResult({
      requestId: input.requestId,
      context,
      updatedAt: occurredAt,
    });

    await sql.query(
      `insert into central_lots (
        central_lot_id, store_id, central_product_id, product_display_name, lot_identity,
        lot_identity_key, mode, current_location, state, source, risk_state, expires_at,
        received_at, quality_inspection_due_at, approximate_quantity, version, created_at, updated_at
      ) values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, 'synchronized',
        'central', $9, $10, $11, $12, $13, 1, $14::timestamptz, $14::timestamptz
      )
      on conflict (central_lot_id) do nothing`,
      [
        context.centralLotId,
        context.storeId,
        context.centralProductId,
        context.productDisplayName,
        JSON.stringify(context.lotIdentity),
        context.lotIdentityKey,
        context.mode,
        JSON.stringify(context.currentLocation),
        centralRiskStateFromAssessment(projection.assessment),
        context.expiresAt ?? null,
        context.receivedAt ?? null,
        context.qualityInspectionDueAt ?? null,
        context.approximateQuantity,
        occurredAt,
      ],
    );
    await insertCentralObservation({
      observation,
      storeId: input.storeId,
      actorId: input.actorId,
    });
    const result = await upsertCentralTaskProjection({
      context,
      requestId: input.requestId,
      updatedAt: occurredAt,
    });
    await appendLotAudit({
      requestId: input.requestId,
      storeId: input.storeId,
      storeName: input.storeName,
      actorId: input.actorId,
      actorDisplayName: input.actorDisplayName,
      actorRoleSnapshot: input.actorRoleSnapshot,
      centralLotId,
      productDisplayName: product.displayName,
      action: "lot.created",
      summary: "Lote central criado e projetado para a fila operacional.",
      occurredAt,
      metadata: {
        taskAttention: result.response.taskProjection.attention,
        riskState: result.response.lot.riskState ?? "safe",
      },
    });

    return result.response;
  }

  async function appendObservation(
    input: CentralObservationAppendInput,
  ): Promise<CentralLotWriteResponse> {
    const currentContext = await selectLotProjectionContext({
      storeId: input.storeId,
      centralLotId: input.centralLotId,
    });

    if (currentContext === undefined) {
      throw new Error("central_lot_not_found");
    }

    const occurredAt = new Date(input.request.observation.occurredAt).toISOString();
    const observation = buildCentralObservation({
      centralLotId: input.centralLotId,
      centralObservationId: createStableId(
        "obs",
        input.storeId,
        `${input.centralLotId}:${input.request.idempotencyKey ?? occurredAt}`,
      ),
      observation: input.request.observation,
    });
    const context: CentralLotProjectionContext = {
      ...currentContext,
      currentLocation: observation.location,
      approximateQuantity:
        observation.quantityState === "estimated"
          ? observation.approximateQuantity
          : currentContext.approximateQuantity,
      currentObservation: observation,
      updatedAt: occurredAt,
    };
    const projection = buildCentralLotProjectionResult({
      requestId: input.requestId,
      context,
      updatedAt: occurredAt,
    });

    await insertCentralObservation({
      observation,
      storeId: input.storeId,
      actorId: input.actorId,
    });
    await sql.query(
      `update central_lots
      set current_location = $1::jsonb,
        approximate_quantity = $2,
        risk_state = $3,
        version = version + 1,
        updated_at = $4::timestamptz
      where store_id = $5 and central_lot_id = $6`,
      [
        JSON.stringify(context.currentLocation),
        context.approximateQuantity,
        centralRiskStateFromAssessment(projection.assessment),
        occurredAt,
        input.storeId,
        input.centralLotId,
      ],
    );
    const result = await upsertCentralTaskProjection({
      context,
      requestId: input.requestId,
      updatedAt: occurredAt,
    });
    await appendLotAudit({
      requestId: input.requestId,
      storeId: input.storeId,
      storeName: input.storeName,
      actorId: input.actorId,
      actorDisplayName: input.actorDisplayName,
      actorRoleSnapshot: input.actorRoleSnapshot,
      centralLotId: input.centralLotId,
      productDisplayName: context.productDisplayName,
      action: "lot.observation_appended",
      summary: "Observacao fisica central registrada e tarefa recalculada.",
      occurredAt,
      metadata: {
        observationStatus: observation.status,
        taskAttention: result.response.taskProjection.attention,
        riskState: result.response.lot.riskState ?? "safe",
      },
    });

    return result.response;
  }

  async function insertCentralObservation(input: {
    observation: CentralPhysicalObservation;
    storeId: string;
    actorId: string;
  }): Promise<void> {
    await sql.query(
      `insert into central_observations (
        observation_id, store_id, central_lot_id, actor_id, actor_display_name,
        status, location, quantity, occurred_at, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::timestamptz, $9::timestamptz)
      on conflict (observation_id) do nothing`,
      [
        input.observation.centralObservationId,
        input.storeId,
        input.observation.centralLotId,
        input.actorId,
        input.observation.actorLabel,
        input.observation.status,
        JSON.stringify(input.observation.location),
        JSON.stringify(quantitySnapshotFromObservation(input.observation)),
        input.observation.occurredAt,
      ],
    );
  }

  async function registerCentralSyncCommand(input: CentralSyncCommandApplyInput): Promise<boolean> {
    const rows = (await sql.query(
      `insert into central_sync_commands (
        command_id, idempotency_key, store_id, device_id, kind, state, payload,
        central_version, created_at, updated_at
      ) values ($1, $2, $3, $4, $5, 'pending_central', $6::jsonb, 1,
        $7::timestamptz, $7::timestamptz
      ) on conflict (idempotency_key) do nothing
      returning command_id`,
      [
        input.command.id,
        input.command.idempotencyKey,
        input.storeId,
        input.deviceId,
        input.command.kind,
        JSON.stringify(input.command.payload),
        input.receivedAt,
      ],
    )) as Array<{ command_id: string }>;

    return rows.length > 0;
  }

  async function selectSyncActiveTask(
    input: CentralSyncCommandApplyInput,
  ): Promise<SyncTaskRow | undefined> {
    const rows = (await sql.query(
      `select t.central_task_id, t.active_key, t.central_lot_id, t.product_display_name,
        l.lot_identity, t.current_location, t.risk_state, t.severity, t.required_resolution,
        t.state, t.owner_label, t.due_at, t.updated_at, t.version
      from central_projected_tasks t
      join central_lots l on l.central_lot_id = t.central_lot_id and l.store_id = t.store_id
      where t.store_id = $1
        and t.central_task_id = $2
        and t.active_key = $3
        and t.status = 'active'
      limit 1`,
      [input.storeId, input.command.taskId, input.command.taskActiveKey],
    )) as SyncTaskRow[];

    return rows[0];
  }

  async function selectResolvedSyncTask(
    input: CentralSyncCommandApplyInput,
  ): Promise<ResolvedSyncTaskRow | undefined> {
    const rows = (await sql.query(
      `select t.central_task_id, t.active_key, t.central_lot_id, t.product_display_name,
        l.lot_identity, t.current_location, t.risk_state, t.severity, t.required_resolution,
        t.state, t.owner_label, t.due_at, t.updated_at, t.version,
        t.resolution_action, t.actor_label, t.resolution_reason, t.resolved_at
      from central_projected_tasks t
      join central_lots l on l.central_lot_id = t.central_lot_id and l.store_id = t.store_id
      where t.store_id = $1
        and t.central_task_id = $2
        and t.active_key = $3
        and t.status = 'resolved'
      limit 1`,
      [input.storeId, input.command.taskId, input.command.taskActiveKey],
    )) as ResolvedSyncTaskRow[];

    return rows[0];
  }

  async function acknowledgeResolvedSyncCommand(
    input: CentralSyncCommandApplyInput,
    task: ResolvedSyncTaskRow,
    acceptedAt: string,
  ): Promise<SyncTransportResult> {
    await sql.query(
      `update central_sync_commands
      set state = 'resolved',
        accepted_at = $1::timestamptz,
        updated_at = $1::timestamptz
      where store_id = $2 and idempotency_key = $3`,
      [acceptedAt, input.storeId, input.command.idempotencyKey],
    );
    await sql.query(
      `update central_sync_conflicts
      set state = 'resolved',
        resolved_at = $1::timestamptz,
        resolution_reason = $2
      where store_id = $3 and command_id = $4 and state = 'conflict'`,
      [
        acceptedAt,
        "Comando reconciliado porque a tarefa central ja estava resolvida com a mesma acao.",
        input.storeId,
        input.command.id,
      ],
    );

    return buildCentralSyncAckResult(
      input.command,
      acceptedAt,
      buildResolvedHistoryFromResolvedSyncTask({
        command: input.command,
        task,
        updatedAt: acceptedAt,
      }),
    );
  }

  async function replayCentralSyncCommand(
    input: CentralSyncCommandApplyInput,
  ): Promise<SyncTransportResult> {
    const resolvedTask = await selectResolvedSyncTask(input);

    if (resolvedTask !== undefined && resolvedTaskMatchesCommand(resolvedTask, input.command)) {
      return acknowledgeResolvedSyncCommand(input, resolvedTask, input.receivedAt);
    }

    const conflict = await selectStoredCentralSyncConflict(input);
    if (conflict !== undefined) {
      return SyncTransportResultSchema.parse({
        status: "conflict",
        commandId: input.command.id,
        idempotencyKey: input.command.idempotencyKey,
        conflict,
      });
    }

    return SyncTransportResultSchema.parse({
      status: "retry",
      commandId: input.command.id,
      idempotencyKey: input.command.idempotencyKey,
      retryAfterSeconds: 60,
      error: "Comando central ainda esta em processamento.",
    });
  }

  async function selectStoredCentralSyncConflict(
    input: CentralSyncCommandApplyInput,
  ): Promise<SyncConflictRecord | undefined> {
    const rows = (await sql.query(
      `select conflict_id, command_id, product_display_name, lot_identity, current_location,
        reason, created_at, state
      from central_sync_conflicts
      where store_id = $1 and command_id = $2 and state = 'conflict'
      order by created_at desc
      limit 1`,
      [input.storeId, input.command.id],
    )) as ConflictRow[];
    const row = rows[0];
    if (row === undefined) return undefined;

    return buildCentralSyncConflict(input.command, {
      id: row.conflict_id,
      now: toIso(row.created_at),
      kind: "task_changed",
      reason: row.reason,
      summary: row.reason,
    });
  }

  async function persistCentralSyncConflict(
    input: CentralSyncCommandApplyInput,
    conflict: SyncConflictRecord,
  ): Promise<SyncTransportResult> {
    await sql.query(
      `insert into central_sync_conflicts (
        conflict_id, command_id, store_id, product_display_name, lot_identity,
        current_location, reason, state, created_at
      ) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, 'conflict', $8::timestamptz)
      on conflict (conflict_id) do nothing`,
      [
        conflict.id,
        input.command.id,
        input.storeId,
        input.command.productDisplayName,
        JSON.stringify(input.command.lotIdentity),
        JSON.stringify(input.command.currentLocation),
        conflict.reason,
        conflict.createdAt,
      ],
    );
    await sql.query(
      `update central_sync_commands
      set state = 'conflict',
        updated_at = $1::timestamptz
      where store_id = $2 and idempotency_key = $3`,
      [conflict.createdAt, input.storeId, input.command.idempotencyKey],
    );

    return SyncTransportResultSchema.parse({
      status: "conflict",
      commandId: input.command.id,
      idempotencyKey: input.command.idempotencyKey,
      conflict,
    });
  }

  async function applySyncCommand(
    input: CentralSyncCommandApplyInput,
  ): Promise<SyncTransportResult> {
    const registered = await registerCentralSyncCommand(input);
    if (!registered) {
      return replayCentralSyncCommand(input);
    }

    const task = await selectSyncActiveTask(input);
    if (task === undefined) {
      const resolvedTask = await selectResolvedSyncTask(input);

      if (resolvedTask !== undefined && resolvedTaskMatchesCommand(resolvedTask, input.command)) {
        return acknowledgeResolvedSyncCommand(input, resolvedTask, input.receivedAt);
      }

      return persistCentralSyncConflict(
        input,
        buildCentralSyncConflict(input.command, {
          now: input.receivedAt,
          kind: "task_already_resolved",
          reason: "A tarefa central ja foi resolvida ou mudou de chave ativa.",
          summary: "A tarefa atual nao esta mais ativa para este aparelho.",
        }),
      );
    }

    const action = commandResolutionAction(input.command);
    const destination = commandDestination(input.command);
    const evidenceState = commandEvidenceState(input.command);
    const policy = resolveCentralTerminalOutcome({
      taskId: input.command.taskId,
      lotId: input.command.lotId,
      productDisplayName: input.command.productDisplayName,
      lotIdentity: lotIdentityKey(input.command.lotIdentity),
      currentLocation: parseJson(task.current_location) as TodayTaskLocation,
      requiredResolution: task.required_resolution,
      action,
      actorLabel: commandActorLabel(input.command),
      occurredAt: commandOccurredAt(input.command),
      ...(destination === undefined ? {} : { destination }),
      ...(evidenceState === undefined ? {} : { evidenceState }),
    });

    if (policy.status === "rejected") {
      return persistCentralSyncConflict(
        input,
        buildCentralSyncConflict(input.command, {
          now: input.receivedAt,
          kind: "critical_command_blocked",
          reason: syncPolicyRejectionReason(policy.reason),
          summary: syncPolicyRejectionReason(policy.reason),
        }),
      );
    }

    const history = buildResolvedHistoryFromTask({
      command: input.command,
      task,
      updatedAt: input.receivedAt,
      ...(policy.outcome.nextLocation === undefined
        ? {}
        : { nextLocation: policy.outcome.nextLocation }),
    });
    const updatedRows = (await sql.query(
      `update central_projected_tasks
      set status = 'resolved',
        state = 'resolved',
        current_location = $1::jsonb,
        resolved_at = $2::timestamptz,
        resolution_action = $3,
        resolution_reason = $4,
        actor_label = $5,
        version = version + 1,
        updated_at = $6::timestamptz
      where store_id = $7
        and central_task_id = $8
        and active_key = $9
        and status = 'active'
        and version = $10
      returning central_task_id`,
      [
        JSON.stringify(history.currentLocation),
        history.occurredAt,
        history.action,
        centralSyncResolutionReason(input.command),
        history.actorLabel,
        history.updatedAt,
        input.storeId,
        input.command.taskId,
        input.command.taskActiveKey,
        task.version,
      ],
    )) as Array<{ central_task_id: string }>;

    if (updatedRows.length === 0) {
      return persistCentralSyncConflict(
        input,
        buildCentralSyncConflict(input.command, {
          now: input.receivedAt,
          kind: "task_changed",
          reason: "A tarefa central mudou durante a sincronizacao.",
          summary: "A versao central da tarefa mudou antes da gravacao.",
        }),
      );
    }

    await sql.query(
      `update central_lots
      set current_location = $1::jsonb,
        updated_at = $2::timestamptz
      where store_id = $3 and central_lot_id = $4`,
      [JSON.stringify(history.currentLocation), history.updatedAt, input.storeId, history.lotId],
    );
    await sql.query(
      `update central_sync_commands
      set state = 'resolved',
        accepted_at = $1::timestamptz,
        updated_at = $1::timestamptz
      where store_id = $2 and idempotency_key = $3`,
      [input.receivedAt, input.storeId, input.command.idempotencyKey],
    );

    return buildCentralSyncAckResult(input.command, input.receivedAt, history);
  }

  return {
    async prepareTurn(input) {
      await refreshCentralTaskProjectionsForPrepareTurn(input);

      const [productRows, lotRows, taskRows, resolvedRows, conflictRows] = await Promise.all([
        sql.query(
          `select p.central_product_id, p.display_name, p.normalized_key, p.category_id, p.category_name,
            p.status, p.state, p.gtin, p.category_rule_profile, p.updated_at,
            coalesce(
              (
                select json_agg(
                  json_build_object(
                    'type', i.identifier_type,
                    'value', i.identifier_value,
                    'normalizedValue', i.normalized_value,
                    'source', i.source,
                    'isPrimary', i.is_primary
                  )
                  order by i.is_primary desc, i.updated_at desc, i.identifier_value asc
                )
                from central_product_identifiers i
                where i.store_id = p.store_id
                  and i.central_product_id = p.central_product_id
                  and i.status = 'active'
              ),
              '[]'::json
            ) as identifiers
          from central_products p
          where p.store_id = $1 and p.status <> 'archived'
          order by p.updated_at desc, p.display_name asc
          limit 100`,
          [input.storeId],
        ) as unknown as Promise<ProductRow[]>,
        sql.query(
          `select central_lot_id, central_product_id, product_display_name, lot_identity, mode,
            current_location, state, source, risk_state, expires_at, received_at,
            quality_inspection_due_at, approximate_quantity, updated_at
          from central_lots
          where store_id = $1 and state <> 'discarded'
          order by updated_at desc
          limit 150`,
          [input.storeId],
        ) as unknown as Promise<LotRow[]>,
        sql.query(
          `select central_task_id, active_key, central_lot_id, product_display_name,
            current_location, risk_state, severity, required_resolution, state, owner_label,
            due_at, updated_at
          from central_projected_tasks
          where store_id = $1 and status = 'active'
          order by due_at asc nulls last, updated_at desc
          limit 100`,
          [input.storeId],
        ) as unknown as Promise<TaskRow[]>,
        sql.query(
          `select t.central_task_id, t.central_lot_id, t.product_display_name, l.lot_identity,
            t.current_location, t.resolution_action, t.actor_label, t.resolution_reason,
            t.resolved_at
          from central_projected_tasks t
          join central_lots l on l.central_lot_id = t.central_lot_id and l.store_id = t.store_id
          where t.store_id = $1 and t.status = 'resolved'
          order by t.resolved_at desc
          limit 40`,
          [input.storeId],
        ) as unknown as Promise<ResolvedTaskRow[]>,
        sql.query(
          `select conflict_id, command_id, product_display_name, lot_identity, current_location,
            reason, created_at, state
          from central_sync_conflicts
          where store_id = $1 and state in ('conflict', 'discarded')
          order by created_at desc
          limit 40`,
          [input.storeId],
        ) as unknown as Promise<ConflictRow[]>,
      ]);

      const response = buildPrepareTurnResponse({
        input,
        products: productRows.map(mapProductRow),
        lots: lotRows.map(mapLotRow),
        activeTasks: taskRows.map(mapTaskRow),
        resolvedHistory: resolvedRows.map(mapResolvedRow),
        conflicts: conflictRows.map(mapConflictRow),
      });

      await upsertDeviceSnapshot({
        deviceId: input.request.deviceId,
        storeId: input.storeId,
        storeName: input.storeName,
        activeUserLabel: input.actorDisplayName,
        ...(input.request.deviceLabel === undefined
          ? {}
          : { deviceLabel: input.request.deviceLabel }),
        ...(input.request.appVersion === undefined ? {} : { appVersion: input.request.appVersion }),
        ...(input.request.appBuild === undefined ? {} : { appBuild: input.request.appBuild }),
        ...(input.request.environment === undefined
          ? {}
          : { environment: input.request.environment }),
        ...(input.request.apiTarget === undefined ? {} : { apiTarget: input.request.apiTarget }),
        preparedAt: new Date(input.request.requestedAt),
        ...(input.request.lastForegroundAt === undefined
          ? {}
          : { lastForegroundAt: new Date(input.request.lastForegroundAt) }),
        ...(input.request.localSnapshot?.lastSyncedAt === undefined
          ? {}
          : { lastSyncAt: new Date(input.request.localSnapshot.lastSyncedAt) }),
        ...(response.store.centralReadAt === undefined
          ? {}
          : { lastCentralReadAt: new Date(response.store.centralReadAt) }),
        lastHydratedAt: new Date(input.request.requestedAt),
        pendingCommandCount: input.request.localSnapshot?.pendingCommandCount ?? 0,
        conflictCount: response.conflicts.length,
        source: "central",
        ...(input.request.pushPermission === undefined
          ? {}
          : { pushPermission: input.request.pushPermission }),
        ...(input.request.pushProviderState === undefined
          ? {}
          : { pushProviderState: input.request.pushProviderState }),
        ...(input.request.cameraPermission === undefined
          ? {}
          : { cameraPermission: input.request.cameraPermission }),
        updatedAt: new Date(input.request.requestedAt),
      });
      await appendPrepareTurnAudit(input, response);

      return response;
    },
    loadOnboardingProgress,
    saveOnboardingProgress,
    hasOnboardingActivationSignal,
    listCategories,
    searchProducts,
    createProductDraft,
    reviewProductDraft,
    createLot,
    appendObservation,
    applySyncCommand,
    upsertDeviceSnapshot,
    registerDevicePushChannel,
    findDevicePushTarget,
    listDeviceReadiness,
    recordPrepareTurnRejected,
  };
}

export function createInMemoryCaptureRepository(input?: {
  categories?: readonly StoredCategory[];
  products?: readonly StoredProduct[];
  productDrafts?: readonly StoredProductDraft[];
  lots?: readonly StoredLot[];
  tasks?: readonly StoredTask[];
  resolvedHistory?: readonly StoredResolved[];
  conflicts?: readonly StoredConflict[];
}): CaptureRepository & {
  readAuditEvents(): readonly Record<string, unknown>[];
  readDeviceSnapshots(): readonly DeviceSnapshotInput[];
  readProductDrafts(): readonly StoredProductDraft[];
} {
  const categories = [...(input?.categories ?? [])];
  const products = [...(input?.products ?? [])];
  const productDrafts = [...(input?.productDrafts ?? [])];
  const lots = [...(input?.lots ?? [])];
  const tasks = [...(input?.tasks ?? [])];
  const resolvedHistory = [...(input?.resolvedHistory ?? [])];
  const conflicts = [...(input?.conflicts ?? [])];
  const auditEvents: Record<string, unknown>[] = [];
  const syncResultsByIdempotencyKey = new Map<string, SyncTransportResult>();
  const deviceSnapshots = new Map<string, DeviceSnapshotInput>();
  const onboardingProgress = new Map<string, OnboardingProgressPersistenceRecord>();
  const onboardingProgressKey = (input: OnboardingProgressLookupInput): string =>
    `${input.subjectId}:${input.storeId}:${input.flowId}:${input.version}`;
  const upsertDeviceSnapshot = (snapshot: DeviceSnapshotInput): Promise<void> => {
    const key = `${snapshot.storeId}:${snapshot.deviceId}`;
    const existing = deviceSnapshots.get(key);
    deviceSnapshots.set(key, { ...(existing ?? {}), ...snapshot });
    return Promise.resolve();
  };
  const registerDevicePushChannel = (
    registration: DevicePushChannelRegistrationInput,
  ): Promise<void> => {
    const key = `${registration.storeId}:${registration.deviceId}`;
    const existing =
      deviceSnapshots.get(key) ??
      ({
        deviceId: registration.deviceId,
        storeId: registration.storeId,
        pendingCommandCount: 0,
        conflictCount: 0,
        source: "central",
        updatedAt: registration.registeredAt,
      } satisfies DeviceSnapshotInput);
    const { expoPushToken: _existingExpoPushToken, ...existingWithoutToken } = existing;
    void _existingExpoPushToken;
    deviceSnapshots.set(key, {
      ...existingWithoutToken,
      deviceId: registration.deviceId,
      storeId: registration.storeId,
      storeName: registration.storeName,
      deviceLabel: registration.deviceLabel,
      activeUserLabel: registration.activeUserLabel,
      pushPermission: registration.pushPermission,
      pushProviderState: registration.pushProviderState,
      ...(registration.expoPushToken === undefined
        ? {}
        : { expoPushToken: registration.expoPushToken }),
      updatedAt: registration.registeredAt,
    });
    return Promise.resolve();
  };
  const findDevicePushTarget = (input: {
    storeId: string;
    deviceIdMasked: string;
    deviceLabel?: string | undefined;
  }): Promise<DevicePushTarget | null> => {
    const match = [...deviceSnapshots.values()]
      .filter(
        (snapshot) =>
          snapshot.storeId === input.storeId &&
          snapshot.expoPushToken !== undefined &&
          snapshot.expoPushToken.trim().length > 0,
      )
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .find((snapshot) => {
        const masked = maskDeviceId(snapshot.deviceId);
        if (masked !== input.deviceIdMasked) return false;
        return input.deviceLabel === undefined || snapshot.deviceLabel === input.deviceLabel;
      });

    return Promise.resolve(match === undefined ? null : devicePushTargetFromSnapshot(match));
  };
  const loadOnboardingProgress = (
    input: OnboardingProgressLookupInput,
  ): Promise<OnboardingProgressPersistenceRecord | null> =>
    Promise.resolve(onboardingProgress.get(onboardingProgressKey(input)) ?? null);
  const saveOnboardingProgress = (
    input: OnboardingProgressSaveInput,
  ): Promise<OnboardingProgressPersistenceRecord> => {
    const record: OnboardingProgressPersistenceRecord = {
      subjectId: input.subjectId,
      storeId: input.storeId,
      flowId: input.flowId,
      version: input.version,
      status: input.status,
      ...(input.status === "completed" ? { completedAt: input.occurredAt.toISOString() } : {}),
      ...(input.status === "skipped" ? { skippedAt: input.occurredAt.toISOString() } : {}),
      ...(input.deviceId === undefined ? {} : { deviceId: input.deviceId }),
      updatedAt: input.occurredAt.toISOString(),
    };
    onboardingProgress.set(onboardingProgressKey(input), record);
    return Promise.resolve(record);
  };
  const hasOnboardingActivationSignal = (input: { storeId: string }): Promise<boolean> =>
    Promise.resolve(
      lots.some((lot) => lot.storeId === input.storeId && lot.state !== "discarded") ||
        tasks.some(
          (task) =>
            task.storeId === input.storeId &&
            ((task.taskStatus ?? "active") === "active" || task.taskStatus === "resolved"),
        ),
    );
  const productForLot = (
    storeId: string,
    centralProductId: string,
  ): ProductCatalogItem | undefined => {
    const product = products.find(
      (item) =>
        item.storeId === storeId &&
        item.centralProductId === centralProductId &&
        item.status === "validated",
    );

    return product === undefined ? undefined : toCatalogItem(product);
  };
  const contextFromStoredLot = (
    storeId: string,
    lot: StoredLot,
  ): CentralLotProjectionContext | undefined => {
    const product = productForLot(storeId, lot.centralProductId);
    if (product === undefined) return undefined;

    return {
      storeId,
      centralLotId: lot.centralLotId,
      centralProductId: lot.centralProductId,
      productDisplayName: lot.productDisplayName,
      categoryRuleProfile: toDomainCategoryProfile(product.categoryRuleProfile),
      lotIdentity: lot.lotIdentity,
      lotIdentityKey: lotIdentityKey(lot.lotIdentity),
      mode: lot.mode,
      initialLocation: lot.currentLocation,
      currentLocation: lot.currentLocation,
      state: lot.state,
      source: lot.source,
      ...(lot.expiresAt === undefined ? {} : { expiresAt: lot.expiresAt }),
      ...(lot.receivedAt === undefined ? {} : { receivedAt: lot.receivedAt }),
      ...(lot.qualityInspectionDueAt === undefined
        ? {}
        : { qualityInspectionDueAt: lot.qualityInspectionDueAt }),
      approximateQuantity: lot.approximateQuantity ?? 0,
      createdAt: lot.updatedAt,
      updatedAt: lot.updatedAt,
      currentObservation: {
        centralObservationId: createStableId("obs", storeId, `${lot.centralLotId}:memory`),
        centralLotId: lot.centralLotId,
        status: "present",
        actorLabel: "Leitura central",
        occurredAt: lot.updatedAt,
        location: lot.currentLocation,
        isCorrection: false,
        quantityState: "estimated",
        approximateQuantity: lot.approximateQuantity ?? 0,
      },
    };
  };
  const persistLotProjection = (
    context: CentralLotProjectionContext,
    requestId: string,
    updatedAt: string,
  ): CentralLotProjectionResult => {
    const result = buildCentralLotProjectionResult({ requestId, context, updatedAt });

    for (const task of tasks) {
      if (
        task.storeId === context.storeId &&
        task.centralLotId === context.centralLotId &&
        (task.taskStatus ?? "active") === "active" &&
        task.activeKey !== result.activeTask?.activeKey
      ) {
        task.taskStatus = "resolved";
      }
    }

    if (result.activeTask !== undefined) {
      const taskIndex = tasks.findIndex(
        (task) =>
          task.storeId === context.storeId && task.activeKey === result.activeTask?.activeKey,
      );
      const storedTask: StoredTask = {
        ...result.activeTask,
        storeId: context.storeId,
        taskStatus: "active",
      };

      if (taskIndex === -1) {
        tasks.push(storedTask);
      } else if ((tasks[taskIndex]?.taskStatus ?? "active") !== "resolved") {
        tasks[taskIndex] = storedTask;
      }
    }

    return result;
  };
  const currentCategories = (): readonly CentralCategoryCatalogItem[] => {
    const merged = new Map<string, CentralCategoryCatalogItem>();

    for (const category of categories) {
      merged.set(category.categoryId, category);
    }

    for (const product of products) {
      if (merged.has(product.categoryId)) continue;
      merged.set(
        product.categoryId,
        CentralCategoryCatalogItemSchema.parse({
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          categoryRuleProfile: product.categoryRuleProfile,
        }),
      );
    }

    return [...merged.values()].sort((left, right) =>
      left.categoryName.localeCompare(right.categoryName, "pt-BR"),
    );
  };

  return {
    async prepareTurn(prepareInput) {
      for (const [lotIndex, lot] of lots.entries()) {
        if (lot.storeId !== prepareInput.storeId || lot.state === "discarded") continue;

        const context = contextFromStoredLot(prepareInput.storeId, lot);
        if (context === undefined) continue;

        const result = persistLotProjection(
          context,
          createStableId(
            "prepare-projection",
            prepareInput.storeId,
            `${prepareInput.requestId}:${lot.centralLotId}`,
          ),
          prepareInput.request.requestedAt,
        );
        const riskState = centralRiskStateFromAssessment(result.assessment);
        const nextLot: StoredLot = {
          ...lot,
          updatedAt:
            riskState === (lot.riskState ?? null)
              ? lot.updatedAt
              : prepareInput.request.requestedAt,
        };

        if (riskState === null) {
          delete nextLot.riskState;
        } else {
          nextLot.riskState = riskState;
        }

        lots[lotIndex] = nextLot;
      }

      const response = buildPrepareTurnResponse({
        input: prepareInput,
        products: products.filter((item) => item.storeId === prepareInput.storeId),
        lots: lots.filter((item) => item.storeId === prepareInput.storeId),
        activeTasks: tasks.filter(
          (item) =>
            item.storeId === prepareInput.storeId && (item.taskStatus ?? "active") === "active",
        ),
        resolvedHistory: resolvedHistory.filter((item) => item.storeId === prepareInput.storeId),
        conflicts: conflicts.filter((item) => item.storeId === prepareInput.storeId),
      });

      await upsertDeviceSnapshot({
        deviceId: prepareInput.request.deviceId,
        storeId: prepareInput.storeId,
        storeName: prepareInput.storeName,
        activeUserLabel: prepareInput.actorDisplayName,
        ...(prepareInput.request.deviceLabel === undefined
          ? {}
          : { deviceLabel: prepareInput.request.deviceLabel }),
        ...(prepareInput.request.appVersion === undefined
          ? {}
          : { appVersion: prepareInput.request.appVersion }),
        ...(prepareInput.request.appBuild === undefined
          ? {}
          : { appBuild: prepareInput.request.appBuild }),
        ...(prepareInput.request.environment === undefined
          ? {}
          : { environment: prepareInput.request.environment }),
        ...(prepareInput.request.apiTarget === undefined
          ? {}
          : { apiTarget: prepareInput.request.apiTarget }),
        preparedAt: new Date(prepareInput.request.requestedAt),
        ...(prepareInput.request.lastForegroundAt === undefined
          ? {}
          : { lastForegroundAt: new Date(prepareInput.request.lastForegroundAt) }),
        ...(prepareInput.request.localSnapshot?.lastSyncedAt === undefined
          ? {}
          : { lastSyncAt: new Date(prepareInput.request.localSnapshot.lastSyncedAt) }),
        ...(response.store.centralReadAt === undefined
          ? {}
          : { lastCentralReadAt: new Date(response.store.centralReadAt) }),
        lastHydratedAt: new Date(prepareInput.request.requestedAt),
        pendingCommandCount: prepareInput.request.localSnapshot?.pendingCommandCount ?? 0,
        conflictCount: response.conflicts.length,
        source: "central",
        ...(prepareInput.request.pushPermission === undefined
          ? {}
          : { pushPermission: prepareInput.request.pushPermission }),
        ...(prepareInput.request.pushProviderState === undefined
          ? {}
          : { pushProviderState: prepareInput.request.pushProviderState }),
        ...(prepareInput.request.cameraPermission === undefined
          ? {}
          : { cameraPermission: prepareInput.request.cameraPermission }),
        updatedAt: new Date(prepareInput.request.requestedAt),
      });
      auditEvents.push({
        type: "sync.changed",
        storeId: prepareInput.storeId,
        targetId: prepareInput.requestId,
        summary: "Leitura central servida para o aparelho autorizado.",
        sanitized: true,
      });

      return response;
    },
    loadOnboardingProgress,
    saveOnboardingProgress,
    hasOnboardingActivationSignal,
    listCategories() {
      return Promise.resolve(currentCategories());
    },
    searchProducts(searchInput) {
      const storeProducts = products
        .filter((item) => item.storeId === searchInput.storeId)
        .map(toCatalogItem);

      return Promise.resolve(
        buildProductSearchResponse({
          requestId: searchInput.requestId,
          request: searchInput.request,
          products: storeProducts,
        }),
      );
    },
    createProductDraft(createInput) {
      const normalizedKey = normalizeProductKey(createInput.request.displayName);
      const identifiers = requestIdentifiers(createInput.request);
      const storeProducts = products.filter((item) => item.storeId === createInput.storeId);
      const exact = storeProducts
        .map(toCatalogItem)
        .find(
          (candidate) =>
            candidate.normalizedKey === normalizedKey ||
            (createInput.request.gtin !== undefined &&
              candidate.gtin === createInput.request.gtin) ||
            productHasAnyIdentifier(candidate, identifiers),
        );

      if (exact !== undefined) {
        const productIndex = products.findIndex(
          (product) =>
            product.storeId === createInput.storeId &&
            product.centralProductId === exact.centralProductId,
        );
        if (productIndex !== -1) {
          products[productIndex] = mergeProductIdentifiers(
            products[productIndex] as StoredProduct,
            identifiers,
          );
        }
        const response = buildExistingProductCreateResponse({
          requestId: createInput.requestId,
          normalizedKey,
          product: exact,
          duplicateReason:
            createInput.request.gtin !== undefined && exact.gtin === createInput.request.gtin
              ? "gtin"
              : identifiers.length > 0 && productHasAnyIdentifier(exact, identifiers)
                ? "identifier"
                : "normalized_name",
        });
        auditEvents.push(
          productAuditEvent(createInput, {
            productId: exact.centralProductId,
            productLabel: exact.displayName,
            action: "product.reused",
            summary: "Produto central reutilizado durante criacao de rascunho.",
            metadata: { duplicateReason: response.duplicateReason ?? "normalized_name" },
          }),
        );

        return Promise.resolve(response);
      }

      const similarCandidates = buildSimilarCandidates({
        request: createInput.request,
        products: storeProducts.map(toCatalogItem),
      });
      const acknowledgedSimilarCandidates = new Set(createInput.request.similarCandidateIds ?? []);

      if (
        similarCandidates.length > 0 &&
        !similarCandidates.every((candidate) =>
          acknowledgedSimilarCandidates.has(candidate.centralProductId),
        )
      ) {
        return Promise.resolve(
          ProductDraftCreateResponseSchema.parse({
            requestId: createInput.requestId,
            normalizedKey,
            outcome: "similar_found",
            similarCandidates,
          }),
        );
      }

      const centralProductId = createStableId("product", createInput.storeId, normalizedKey);
      const draftId = createStableId("draft", createInput.storeId, normalizedKey);
      const requestedAt = new Date(createInput.request.requestedAt).toISOString();
      const existingDraft = productDrafts.find(
        (draft) =>
          draft.storeId === createInput.storeId &&
          (draft.normalizedKey === normalizedKey ||
            (createInput.request.gtin !== undefined && draft.gtin === createInput.request.gtin)),
      );
      const draft =
        existingDraft ??
        buildDraftState({
          draftId,
          centralProductId,
          request: createInput.request,
          normalizedKey,
          requestedByLabel: createInput.actorDisplayName,
          requestedAt,
          similarCandidates,
        });

      if (existingDraft === undefined) {
        productDrafts.push({ ...draft, storeId: createInput.storeId });
        products.push({
          storeId: createInput.storeId,
          centralProductId,
          displayName: createInput.request.displayName,
          categoryId: createInput.request.categoryId,
          categoryName: createInput.request.categoryName,
          status: "draft",
          state: "pending_central",
          source: "central",
          updatedAt: requestedAt,
          ...(createInput.request.gtin === undefined ? {} : { gtin: createInput.request.gtin }),
          ...(requestIdentifiersForResponse(createInput.request).length === 0
            ? {}
            : { identifiers: requestIdentifiersForResponse(createInput.request) }),
          categoryRuleProfile: createInput.request.categoryRuleProfile,
          normalizedKey,
        });
      }

      const acknowledgement = buildProductAcknowledgement({
        requestId: createInput.requestId,
        centralProductId: draft.centralProductId,
        state: "draft_pending_review",
        syncState: "pending_central",
        reviewStatus: "pending_review",
        acknowledgedAt: requestedAt,
        message:
          "Cadastro do produto em revisao. O lote entra com risco conservador ate a validacao.",
      });
      auditEvents.push(
        productAuditEvent(createInput, {
          productId: draft.centralProductId,
          productLabel: draft.displayName,
          action: "product.draft_created",
          summary: "Rascunho operacional de produto criado para revisao central.",
          metadata: {
            reviewStatus: "pending_review",
            similarCandidateCount: similarCandidates.length,
          },
        }),
      );

      return Promise.resolve(
        ProductDraftCreateResponseSchema.parse({
          requestId: createInput.requestId,
          normalizedKey,
          outcome: "draft_pending_review",
          similarCandidates,
          draft,
          acknowledgement,
        }),
      );
    },
    reviewProductDraft(reviewInput) {
      const draftIndex = productDrafts.findIndex(
        (draft) =>
          draft.storeId === reviewInput.storeId &&
          (draft.draftId === reviewInput.request.draftId ||
            draft.centralProductId === reviewInput.request.draftId),
      );

      if (draftIndex === -1) {
        return Promise.reject(new Error("product_draft_not_found"));
      }

      const currentDraft = productDrafts[draftIndex] as StoredProductDraft;
      const reviewStatus = reviewStatusForDecision(reviewInput.request.decision);
      const reviewedAt = new Date(reviewInput.request.reviewedAt).toISOString();
      const reviewReason = reviewInput.request.reason ?? currentDraft.reviewReason;
      const reviewedDraft = buildDraftStateFromProduct({
        draftId: currentDraft.draftId,
        product: {
          centralProductId: currentDraft.centralProductId,
          displayName: currentDraft.displayName,
          normalizedKey: currentDraft.normalizedKey,
          categoryId: currentDraft.categoryId,
          categoryName: currentDraft.categoryName,
          categoryRuleProfile: currentDraft.categoryRuleProfile,
          source: "draft_pending_review",
          reviewStatus,
          syncState: reviewStatus === "validated" ? "synchronized" : "discarded",
          updatedAt: reviewedAt,
          ...(currentDraft.gtin === undefined ? {} : { gtin: currentDraft.gtin }),
        },
        requestedByLabel: currentDraft.requestedByLabel,
        requestedAt: currentDraft.requestedAt,
        reviewStatus,
        ...(reviewReason === undefined ? {} : { reviewReason }),
        reviewedAt,
      });
      productDrafts[draftIndex] = { ...reviewedDraft, storeId: reviewInput.storeId };

      const productIndex = products.findIndex(
        (product) =>
          product.storeId === reviewInput.storeId &&
          product.centralProductId === currentDraft.centralProductId,
      );

      if (productIndex !== -1) {
        const currentProduct = products[productIndex] as StoredProduct;
        products[productIndex] = {
          ...currentProduct,
          status:
            reviewStatus === "validated"
              ? "validated"
              : reviewStatus === "discarded"
                ? "archived"
                : "rejected",
          state: reviewStatus === "validated" ? "synchronized" : "discarded",
          updatedAt: reviewedAt,
        };
      }

      const acknowledgement = buildProductAcknowledgement({
        requestId: reviewInput.requestId,
        centralProductId: currentDraft.centralProductId,
        state: reviewStatus === "validated" ? "validated" : "discarded",
        syncState: reviewStatus === "validated" ? "synchronized" : "discarded",
        reviewStatus,
        acknowledgedAt: reviewedAt,
        message:
          reviewStatus === "validated"
            ? "Produto validado para operacao central."
            : "Rascunho de produto encerrado com motivo registrado.",
      });
      auditEvents.push(
        productAuditEvent(reviewInput, {
          productId: currentDraft.centralProductId,
          productLabel: currentDraft.displayName,
          action: "product.reviewed",
          summary: "Rascunho operacional de produto revisado pela lideranca.",
          ...(reviewInput.request.reason === undefined
            ? {}
            : { reason: reviewInput.request.reason }),
          metadata: {
            decision: reviewInput.request.decision,
            reviewStatus,
            mergeIntoCentralProductId: reviewInput.request.mergeIntoCentralProductId ?? null,
          },
        }),
      );

      return Promise.resolve(
        ProductDraftReviewResponseSchema.parse({
          draft: reviewedDraft,
          acknowledgement,
        }),
      );
    },
    createLot(createInput) {
      const product = productForLot(createInput.storeId, createInput.request.lot.productId);

      if (product === undefined) {
        return Promise.reject(new Error("central_product_not_found"));
      }

      const occurredAt = new Date(createInput.request.occurredAt).toISOString();
      const centralLotId = createStableId(
        "lot",
        createInput.storeId,
        createInput.request.idempotencyKey ??
          `${createInput.request.lot.productId}:${lotIdentityKey(createInput.request.lot.identity)}`,
      );
      const existingLot = lots.find(
        (lot) => lot.storeId === createInput.storeId && lot.centralLotId === centralLotId,
      );

      if (existingLot !== undefined) {
        const existingContext = contextFromStoredLot(createInput.storeId, existingLot);
        if (existingContext === undefined) {
          return Promise.reject(new Error("central_product_not_found"));
        }

        return Promise.resolve(
          persistLotProjection(existingContext, createInput.requestId, existingContext.updatedAt)
            .response,
        );
      }

      const observation = buildCentralObservation({
        centralLotId,
        centralObservationId: createStableId(
          "obs",
          createInput.storeId,
          `${centralLotId}:${createInput.request.idempotencyKey ?? occurredAt}:initial`,
        ),
        observation: initialObservationFromLot(createInput.request),
      });
      const context = buildLotProjectionContextFromCreate({
        storeId: createInput.storeId,
        centralLotId,
        lot: createInput.request.lot,
        product,
        observation,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
      const result = persistLotProjection(context, createInput.requestId, occurredAt);
      const riskState = centralRiskStateFromAssessment(result.assessment);
      lots.push({
        storeId: createInput.storeId,
        centralLotId,
        centralProductId: context.centralProductId,
        productDisplayName: context.productDisplayName,
        lotIdentity: context.lotIdentity,
        mode: context.mode,
        currentLocation: context.currentLocation,
        state: "synchronized",
        source: "central",
        ...(riskState === null ? {} : { riskState }),
        ...(context.expiresAt === undefined ? {} : { expiresAt: context.expiresAt }),
        ...(context.receivedAt === undefined ? {} : { receivedAt: context.receivedAt }),
        ...(context.qualityInspectionDueAt === undefined
          ? {}
          : { qualityInspectionDueAt: context.qualityInspectionDueAt }),
        approximateQuantity: context.approximateQuantity,
        updatedAt: occurredAt,
      });
      auditEvents.push({
        type: "task.changed",
        storeId: createInput.storeId,
        targetType: "lot",
        targetId: centralLotId,
        targetLabel: product.displayName,
        action: "lot.created",
        summary: "Lote central criado e projetado para a fila operacional.",
        sanitized: true,
      });

      return Promise.resolve(result.response);
    },
    appendObservation(observationInput) {
      const lotIndex = lots.findIndex(
        (lot) =>
          lot.storeId === observationInput.storeId &&
          lot.centralLotId === observationInput.centralLotId,
      );

      if (lotIndex === -1) {
        return Promise.reject(new Error("central_lot_not_found"));
      }

      const currentLot = lots[lotIndex] as StoredLot;
      const currentContext = contextFromStoredLot(observationInput.storeId, currentLot);

      if (currentContext === undefined) {
        return Promise.reject(new Error("central_product_not_found"));
      }

      const occurredAt = new Date(observationInput.request.observation.occurredAt).toISOString();
      const observation = buildCentralObservation({
        centralLotId: observationInput.centralLotId,
        centralObservationId: createStableId(
          "obs",
          observationInput.storeId,
          `${observationInput.centralLotId}:${observationInput.request.idempotencyKey ?? occurredAt}`,
        ),
        observation: observationInput.request.observation,
      });
      const context: CentralLotProjectionContext = {
        ...currentContext,
        currentLocation: observation.location,
        approximateQuantity:
          observation.quantityState === "estimated"
            ? observation.approximateQuantity
            : currentContext.approximateQuantity,
        currentObservation: observation,
        updatedAt: occurredAt,
      };
      const result = persistLotProjection(context, observationInput.requestId, occurredAt);
      const riskState = centralRiskStateFromAssessment(result.assessment);
      const nextLot: StoredLot = {
        ...currentLot,
        currentLocation: context.currentLocation,
        approximateQuantity: context.approximateQuantity,
        updatedAt: occurredAt,
      };
      if (riskState === null) {
        delete nextLot.riskState;
      } else {
        nextLot.riskState = riskState;
      }
      lots[lotIndex] = nextLot;
      auditEvents.push({
        type: "task.changed",
        storeId: observationInput.storeId,
        targetType: "lot",
        targetId: observationInput.centralLotId,
        targetLabel: context.productDisplayName,
        action: "lot.observation_appended",
        summary: "Observacao fisica central registrada e tarefa recalculada.",
        sanitized: true,
      });

      return Promise.resolve(result.response);
    },
    applySyncCommand(syncInput) {
      const existing = syncResultsByIdempotencyKey.get(syncInput.command.idempotencyKey);
      if (existing !== undefined && existing.status !== "conflict") {
        return Promise.resolve(existing);
      }

      const taskIndex = tasks.findIndex(
        (task) =>
          task.storeId === syncInput.storeId &&
          task.centralTaskId === syncInput.command.taskId &&
          task.activeKey === syncInput.command.taskActiveKey &&
          (task.taskStatus ?? "active") === "active",
      );

      if (taskIndex === -1) {
        const resolvedTask = tasks.find(
          (task) =>
            task.storeId === syncInput.storeId &&
            task.centralTaskId === syncInput.command.taskId &&
            task.activeKey === syncInput.command.taskActiveKey &&
            (task.taskStatus ?? "active") === "resolved",
        );
        const resolved = resolvedHistory.find(
          (history) =>
            history.storeId === syncInput.storeId &&
            history.centralTaskId === syncInput.command.taskId &&
            history.action === commandResolutionAction(syncInput.command),
        );

        if (resolvedTask !== undefined && resolved !== undefined) {
          const history = buildResolvedHistoryFromStoredTask({
            command: syncInput.command,
            task: resolvedTask,
            updatedAt: syncInput.receivedAt,
          });
          const result = buildCentralSyncAckResult(syncInput.command, syncInput.receivedAt, {
            ...history,
            action: resolved.action,
            actorLabel: resolved.actorLabel,
            occurredAt: resolved.resolvedAt,
            resolutionState: resolutionStateForAction(resolved.action),
          });

          for (let index = conflicts.length - 1; index >= 0; index -= 1) {
            const conflict = conflicts[index];
            if (
              conflict?.storeId === syncInput.storeId &&
              conflict.commandId === syncInput.command.id
            ) {
              conflicts.splice(index, 1);
            }
          }
          syncResultsByIdempotencyKey.set(syncInput.command.idempotencyKey, result);
          auditEvents.push(syncAuditEvent(syncInput, "resolved", "Tarefa central ja resolvida."));

          return Promise.resolve(result);
        }

        const result = buildCentralSyncConflictResult(syncInput.command, {
          now: syncInput.receivedAt,
          kind: "task_already_resolved",
          reason: "A tarefa central ja foi resolvida ou mudou de chave ativa.",
          summary: "A tarefa atual nao esta mais ativa para este aparelho.",
        });
        conflicts.push(conflictSnippetFromSyncResult(syncInput.storeId, result.conflict));
        syncResultsByIdempotencyKey.set(syncInput.command.idempotencyKey, result);
        auditEvents.push(syncAuditEvent(syncInput, "conflict", result.conflict.reason));
        return Promise.resolve(result);
      }

      const task = tasks[taskIndex] as StoredTask;
      const destination = commandDestination(syncInput.command);
      const evidenceState = commandEvidenceState(syncInput.command);
      const policy = resolveCentralTerminalOutcome({
        taskId: syncInput.command.taskId,
        lotId: syncInput.command.lotId,
        productDisplayName: syncInput.command.productDisplayName,
        lotIdentity: lotIdentityKey(syncInput.command.lotIdentity),
        currentLocation: task.currentLocation,
        requiredResolution: task.requiredResolution,
        action: commandResolutionAction(syncInput.command),
        actorLabel: commandActorLabel(syncInput.command),
        occurredAt: commandOccurredAt(syncInput.command),
        ...(destination === undefined ? {} : { destination }),
        ...(evidenceState === undefined ? {} : { evidenceState }),
      });

      if (policy.status === "rejected") {
        const result = buildCentralSyncConflictResult(syncInput.command, {
          now: syncInput.receivedAt,
          kind: "critical_command_blocked",
          reason: syncPolicyRejectionReason(policy.reason),
          summary: syncPolicyRejectionReason(policy.reason),
        });
        conflicts.push(conflictSnippetFromSyncResult(syncInput.storeId, result.conflict));
        syncResultsByIdempotencyKey.set(syncInput.command.idempotencyKey, result);
        auditEvents.push(syncAuditEvent(syncInput, "conflict", result.conflict.reason));
        return Promise.resolve(result);
      }

      const history = buildResolvedHistoryFromStoredTask({
        command: syncInput.command,
        task,
        updatedAt: syncInput.receivedAt,
        ...(policy.outcome.nextLocation === undefined
          ? {}
          : { nextLocation: policy.outcome.nextLocation }),
      });
      tasks[taskIndex] = {
        ...task,
        currentLocation: history.currentLocation,
        taskStatus: "resolved",
        state: "resolved",
        updatedAt: history.updatedAt,
      };

      const lotIndex = lots.findIndex(
        (lot) => lot.storeId === syncInput.storeId && lot.centralLotId === syncInput.command.lotId,
      );
      if (lotIndex !== -1) {
        const lot = lots[lotIndex] as StoredLot;
        lots[lotIndex] = {
          ...lot,
          currentLocation: history.currentLocation,
          updatedAt: history.updatedAt,
        };
      }

      resolvedHistory.unshift({
        storeId: syncInput.storeId,
        centralTaskId: history.centralTaskId,
        centralLotId: history.lotId,
        productDisplayName: history.productDisplayName,
        lotIdentity: history.lotIdentity,
        currentLocation: history.currentLocation,
        action: history.action,
        actorLabel: history.actorLabel,
        resolvedAt: history.occurredAt,
        state: "resolved",
        source: "central",
      });
      const result = buildCentralSyncAckResult(syncInput.command, syncInput.receivedAt, history);
      syncResultsByIdempotencyKey.set(syncInput.command.idempotencyKey, result);
      auditEvents.push(syncAuditEvent(syncInput, "resolved", "Tarefa central resolvida."));

      return Promise.resolve(result);
    },
    upsertDeviceSnapshot,
    registerDevicePushChannel,
    findDevicePushTarget,
    listDeviceReadiness(input) {
      return Promise.resolve(
        [...deviceSnapshots.values()]
          .filter(
            (snapshot) =>
              snapshot.storeId === input.storeId &&
              snapshot.appVersion !== "web-command-center" &&
              snapshot.activeUserLabel !== undefined &&
              snapshot.storeName !== undefined,
          )
          .map((snapshot) => buildPilotDeviceReadiness(snapshot, input))
          .sort(comparePilotDeviceReadiness),
      );
    },
    recordPrepareTurnRejected(denied) {
      auditEvents.push({
        type: "access.denied",
        storeId: denied.storeId,
        targetId: denied.requestId,
        reason: denied.reason,
        sanitized: true,
      });
      return Promise.resolve();
    },
    readAuditEvents() {
      return auditEvents;
    },
    readDeviceSnapshots() {
      return [...deviceSnapshots.values()];
    },
    readProductDrafts() {
      return productDrafts;
    },
  };
}

function buildPilotDeviceReadiness(
  snapshot: DeviceSnapshotInput,
  input: ListDeviceReadinessInput,
): PilotDeviceReadiness {
  const approvedBuild = approvedPilotBuildFor(input);
  const buildCompatibility = deviceBuildCompatibility(snapshot, input);
  const appVersion = publicReadinessLabel(snapshot.appVersion, "nao informado");
  const appBuild = publicReadinessLabel(snapshot.appBuild, "nao informado");
  const environment = publicReadinessLabel(snapshot.environment, "nao informado");
  const apiTarget = publicApiTargetLabel(snapshot.apiTarget);
  const blockers = [
    ...(snapshot.readinessBlockers ?? []),
    ...derivedDeviceBlockers(snapshot, input),
  ];
  const hasBlocking = blockers.some((blocker) => blocker.severity === "blocking");
  const hasWarning = blockers.some((blocker) => blocker.severity === "warning");
  const verdict: PilotDeviceReadinessVerdict =
    hasBlocking || snapshot.readinessVerdict === "bloqueado"
      ? "bloqueado"
      : hasWarning || snapshot.readinessVerdict === "atencao"
        ? "atencao"
        : "apto";

  return PilotDeviceReadinessSchema.parse({
    deviceIdMasked: maskDeviceId(snapshot.deviceId),
    deviceLabel: snapshot.deviceLabel ?? `Aparelho ${maskDeviceId(snapshot.deviceId)}`,
    activeUserLabel: snapshot.activeUserLabel ?? "Usuario nao confirmado",
    storeId: snapshot.storeId,
    storeName: snapshot.storeName ?? input.storeName,
    appVersion,
    appBuild,
    environment,
    apiTarget,
    buildCompatibility,
    approvedArtifactLabel: approvedBuild.artifactLabel,
    approvedAppVersion: approvedBuild.appVersion,
    approvedBuild: approvedBuild.build,
    ...(snapshot.lastForegroundAt === undefined
      ? {}
      : { lastForegroundAt: snapshot.lastForegroundAt.toISOString() }),
    ...(snapshot.lastSyncAt === undefined ? {} : { lastSyncAt: snapshot.lastSyncAt.toISOString() }),
    ...(snapshot.lastCentralReadAt === undefined
      ? {}
      : { lastCentralReadAt: snapshot.lastCentralReadAt.toISOString() }),
    pushPermission: snapshot.pushPermission ?? "unknown",
    pushProviderState: snapshot.pushProviderState ?? "unknown",
    cameraPermission: snapshot.cameraPermission ?? "unknown",
    verdict,
    blockers,
    nextAction:
      blockers[0]?.nextAction ??
      "Aparelho apto para iniciar o proximo passo do UAT guiado nesta loja.",
    updatedAt: snapshot.updatedAt.toISOString(),
  });
}

const DEFAULT_APPROVED_ARTIFACT_LABEL = "uat20-onboarding-shift-e2e-apk-150";
const DEFAULT_APPROVED_APP_VERSION = "0.12.0";
const DEFAULT_APPROVED_BUILD = "150";

function approvedPilotBuildFor(input: ListDeviceReadinessInput): {
  artifactLabel: string;
  appVersion: string;
  build: string;
} {
  return {
    artifactLabel: shortReadinessLabel(
      input.approvedArtifactLabel,
      DEFAULT_APPROVED_ARTIFACT_LABEL,
    ),
    appVersion: shortReadinessLabel(input.approvedAppVersion, DEFAULT_APPROVED_APP_VERSION),
    build: shortReadinessLabel(input.approvedBuild, DEFAULT_APPROVED_BUILD),
  };
}

function shortReadinessLabel(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  const resolved = trimmed === undefined || trimmed.length === 0 ? fallback : trimmed;
  if (/(https?:\/\/|eas:\/\/|token|secret|password)/i.test(resolved)) return fallback;
  return resolved.length <= 80 ? resolved : `${resolved.slice(0, 36)}...${resolved.slice(-36)}`;
}

function publicReadinessLabel(value: string | undefined, fallback: string): string {
  return shortReadinessLabel(value, fallback);
}

function publicApiTargetLabel(value: string | undefined): string {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return "API nao informada";
  if (/token|secret|password/i.test(trimmed)) return "API nao informada";
  return trimmed.length <= 240 ? trimmed : `${trimmed.slice(0, 112)}...${trimmed.slice(-112)}`;
}

function deviceBuildCompatibility(
  snapshot: DeviceSnapshotInput,
  input: ListDeviceReadinessInput,
): PilotBuildCompatibility {
  const approvedBuild = approvedPilotBuildFor(input);

  return resolvePilotBuildCompatibility({
    appVersion: snapshot.appVersion,
    appBuild: snapshot.appBuild,
    approvedAppVersion: approvedBuild.appVersion,
    approvedBuild: approvedBuild.build,
  });
}

function derivedDeviceBlockers(
  snapshot: DeviceSnapshotInput,
  input: ListDeviceReadinessInput,
): PilotDeviceBlocker[] {
  const blockers: PilotDeviceBlocker[] = [];
  const approvedBuild = approvedPilotBuildFor(input);

  if (snapshot.activeUserLabel === undefined || snapshot.storeName === undefined) {
    blockers.push({
      code: "invalid_store_or_user",
      label: "Usuario ou loja sem confirmacao",
      detail: "O aparelho nao tem usuario ativo e loja confirmada na ultima leitura central.",
      nextAction: "Entrar novamente com convite ativo da loja antes do UAT.",
      severity: "blocking",
    });
  }

  if (snapshot.lastCentralReadAt === undefined) {
    blockers.push({
      code: "missing_first_central_read",
      label: "Sem primeira leitura central",
      detail: "O aparelho ainda nao recebeu produtos, lotes ou tarefas centrais desta loja.",
      nextAction: "Abrir Preparar turno com internet e sessao ativa.",
      severity: "blocking",
    });
  }

  if (hasStaleCriticalSync(snapshot, input)) {
    blockers.push({
      code: "stale_critical_sync",
      label: "Sync critico desatualizado",
      detail:
        "Existe comando pendente ou conflito sem leitura recente suficiente para liberar UAT.",
      nextAction: "Sincronizar o aparelho, revisar conflitos e reler a central.",
      severity: "blocking",
    });
  }

  if (
    input.requireRemotePush === true &&
    (snapshot.pushPermission !== "granted" ||
      !["remote_ready", "token_registered"].includes(snapshot.pushProviderState ?? "unknown"))
  ) {
    blockers.push({
      code: "push_required_without_push",
      label: "Push remoto indisponivel",
      detail: "A etapa atual precisa provar push remoto e este aparelho nao esta pronto.",
      nextAction: "Conceder permissao, reinstalar o APK nativo ou revisar a credencial de push.",
      severity: "blocking",
    });
  } else if (
    input.requireRemotePush !== true &&
    (snapshot.pushPermission === "denied" ||
      snapshot.pushProviderState === "local_only" ||
      snapshot.pushProviderState === "not_configured")
  ) {
    blockers.push({
      code: "push_required_without_push",
      label: "Push remoto ainda nao provado",
      detail: "O aparelho pode seguir em etapas sem push remoto, mas nao prova cobranca externa.",
      nextAction: "Manter como atencao ate o teste seguro de push ser executado.",
      severity: "warning",
    });
  }

  if (input.requireCamera === true && snapshot.cameraPermission !== "granted") {
    blockers.push({
      code: "camera_required_without_camera",
      label: "Camera bloqueada",
      detail: "A etapa de evidencia exige camera e a permissao do aparelho nao esta concedida.",
      nextAction: "Conceder permissao de camera ou registrar bloqueio externo do aparelho.",
      severity: "blocking",
    });
  }

  const buildCompatibility = deviceBuildCompatibility(snapshot, input);
  if (buildCompatibility === "incompativel") {
    const appVersion = publicReadinessLabel(snapshot.appVersion, "versao desconhecida");
    const appBuild = publicReadinessLabel(snapshot.appBuild, "build desconhecido");
    blockers.push({
      code: "incompatible_build",
      label: "Build fora do APK aprovado",
      detail: `Este aparelho informa ${appVersion} (${appBuild}), diferente do APK aprovado ${approvedBuild.appVersion} (${approvedBuild.build}).`,
      nextAction: `Instalar o artefato ${approvedBuild.artifactLabel} antes de continuar o piloto.`,
      severity: "blocking",
    });
  } else if (buildCompatibility === "desatualizado") {
    blockers.push({
      code: "old_build_attention",
      label: "Build antigo em observacao",
      detail: `O aparelho ainda nao esta no APK aprovado ${approvedBuild.appVersion} (${approvedBuild.build}).`,
      nextAction: `Atualizar para o artefato ${approvedBuild.artifactLabel} antes de declarar rollout pronto.`,
      severity: "warning",
    });
  } else if (buildCompatibility === "desconhecido") {
    blockers.push({
      code: "old_build_attention",
      label: "Build sem identificacao confiavel",
      detail:
        "O aparelho nao informa versao e versionCode suficientes para comparar com o APK aprovado.",
      nextAction: `Reinstalar ou reabrir o APK ${approvedBuild.artifactLabel} e preparar turno novamente.`,
      severity: "warning",
    });
  }

  return blockers;
}

function hasStaleCriticalSync(
  snapshot: DeviceSnapshotInput,
  input: ListDeviceReadinessInput,
): boolean {
  if (snapshot.pendingCommandCount === 0 && snapshot.conflictCount === 0) return false;

  if (snapshot.conflictCount > 0) return true;

  const staleMinutes = input.staleCriticalSyncMinutes ?? 30;
  const lastSyncAt = snapshot.lastSyncAt ?? snapshot.lastHydratedAt ?? snapshot.preparedAt;
  if (lastSyncAt === undefined) return true;

  const now = input.now ?? new Date();
  return now.getTime() - lastSyncAt.getTime() > staleMinutes * 60_000;
}

function comparePilotDeviceReadiness(
  left: PilotDeviceReadiness,
  right: PilotDeviceReadiness,
): number {
  const rank: Record<PilotDeviceReadinessVerdict, number> = {
    bloqueado: 0,
    atencao: 1,
    apto: 2,
  };
  const verdictDiff = rank[left.verdict] - rank[right.verdict];
  if (verdictDiff !== 0) return verdictDiff;
  return right.updatedAt.localeCompare(left.updatedAt);
}

function deviceSnapshotFromRow(row: DeviceSnapshotRow): DeviceSnapshotInput {
  const pushPermission = parsePermissionState(row.push_permission);
  const pushProviderState = parsePushProviderState(row.push_provider_state);
  const cameraPermission = parsePermissionState(row.camera_permission);

  return {
    deviceId: row.device_id,
    storeId: row.store_id,
    ...(row.store_name === null ? {} : { storeName: row.store_name }),
    ...(row.device_label === null ? {} : { deviceLabel: row.device_label }),
    ...(row.active_user_label === null ? {} : { activeUserLabel: row.active_user_label }),
    ...(row.app_version === null ? {} : { appVersion: row.app_version }),
    ...(row.app_build === null ? {} : { appBuild: row.app_build }),
    ...(row.environment === null ? {} : { environment: row.environment }),
    ...(row.api_target === null ? {} : { apiTarget: row.api_target }),
    ...(row.prepared_at === null ? {} : { preparedAt: new Date(row.prepared_at) }),
    ...(row.last_foreground_at === null
      ? {}
      : { lastForegroundAt: new Date(row.last_foreground_at) }),
    ...(row.last_sync_at === null ? {} : { lastSyncAt: new Date(row.last_sync_at) }),
    ...(row.last_central_read_at === null
      ? {}
      : { lastCentralReadAt: new Date(row.last_central_read_at) }),
    ...(row.last_hydrated_at === null ? {} : { lastHydratedAt: new Date(row.last_hydrated_at) }),
    pendingCommandCount: row.pending_command_count,
    conflictCount: row.conflict_count,
    source: row.source,
    ...(pushPermission === undefined ? {} : { pushPermission }),
    ...(pushProviderState === undefined ? {} : { pushProviderState }),
    ...(cameraPermission === undefined ? {} : { cameraPermission }),
    ...(isReadinessVerdict(row.readiness_verdict)
      ? { readinessVerdict: row.readiness_verdict }
      : {}),
    readinessBlockers: parseStoredBlockers(row.readiness_blockers),
    updatedAt: new Date(row.updated_at),
  };
}

function devicePushTargetFromRow(row: DeviceSnapshotRow): DevicePushTarget {
  const pushPermission = parsePermissionState(row.push_permission);
  const pushProviderState = parsePushProviderState(row.push_provider_state);
  const snapshot: DeviceSnapshotInput = {
    deviceId: row.device_id,
    storeId: row.store_id,
    ...(row.device_label === null ? {} : { deviceLabel: row.device_label }),
    ...(row.expo_push_token === null || row.expo_push_token === undefined
      ? {}
      : { expoPushToken: row.expo_push_token }),
    ...(pushPermission === undefined ? {} : { pushPermission }),
    ...(pushProviderState === undefined ? {} : { pushProviderState }),
    pendingCommandCount: 0,
    conflictCount: 0,
    source: "central",
    updatedAt: new Date(row.updated_at),
  };

  return devicePushTargetFromSnapshot(snapshot);
}

function devicePushTargetFromLegacyRow(
  row: LegacyDevicePushChannelRow,
  storeId: string,
): DevicePushTarget | null {
  const payload = typeof row.payload === "string" ? parseJson<unknown>(row.payload) : row.payload;
  if (!isUnknownRecord(payload)) return null;

  const token = readUnknownRecordString(payload, "expoPushToken");
  if (token === undefined) return null;

  const pushPermission =
    parsePermissionState(readUnknownRecordString(payload, "pushPermission") ?? null) ?? "unknown";
  const pushProviderState =
    parsePushProviderState(readUnknownRecordString(payload, "pushProviderState") ?? null) ??
    "unknown";

  return devicePushTargetFromSnapshot({
    deviceId: row.device_id,
    storeId,
    deviceLabel:
      readUnknownRecordString(payload, "deviceLabel") ?? `Aparelho ${maskDeviceId(row.device_id)}`,
    pushPermission,
    pushProviderState,
    expoPushToken: token,
    pendingCommandCount: 0,
    conflictCount: 0,
    source: "central",
    updatedAt: new Date(row.updated_at),
  });
}

function devicePushTargetFromSnapshot(snapshot: DeviceSnapshotInput): DevicePushTarget {
  const token = snapshot.expoPushToken?.trim();
  if (token === undefined || token.length === 0) {
    throw new Error("Device push target requires an Expo push token.");
  }

  return {
    deviceId: snapshot.deviceId,
    deviceIdMasked: maskDeviceId(snapshot.deviceId),
    deviceLabel: snapshot.deviceLabel ?? `Aparelho ${maskDeviceId(snapshot.deviceId)}`,
    storeId: snapshot.storeId,
    pushPermission: snapshot.pushPermission ?? "unknown",
    pushProviderState: snapshot.pushProviderState ?? "unknown",
    expoPushToken: token,
    updatedAt: snapshot.updatedAt,
  };
}

function isMissingExpoPushTokenColumn(error: unknown): boolean {
  if (!isUnknownRecord(error)) return false;
  return (
    error.code === "42703" ||
    (typeof error.message === "string" && error.message.includes("expo_push_token"))
  );
}

function readUnknownRecordString(value: Record<string, unknown>, key: string): string | undefined {
  const item = value[key];
  return typeof item === "string" && item.trim().length > 0 ? item.trim() : undefined;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredBlockers(value: unknown): PilotDeviceBlocker[] {
  const raw = typeof value === "string" ? parseJson<unknown>(value) : value;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => PilotDeviceBlockerSchema.safeParse(item))
    .filter((result): result is { success: true; data: PilotDeviceBlocker } => result.success)
    .map((result) => result.data);
}

function parsePermissionState(value: string | null): PilotDevicePermissionState | undefined {
  if (
    value === "granted" ||
    value === "denied" ||
    value === "not_requested" ||
    value === "unknown"
  ) {
    return value;
  }

  return undefined;
}

function parsePushProviderState(value: string | null): PilotDevicePushProviderState | undefined {
  if (
    value === "remote_ready" ||
    value === "local_only" ||
    value === "token_registered" ||
    value === "token_invalid" ||
    value === "provider_failed" ||
    value === "not_configured" ||
    value === "unknown"
  ) {
    return value;
  }

  return undefined;
}

function isReadinessVerdict(value: string | null): value is PilotDeviceReadinessVerdict {
  return value === "apto" || value === "atencao" || value === "bloqueado";
}

function maskDeviceId(deviceId: string): string {
  const compact = deviceId.trim();
  if (compact.length <= 6) return "***";
  return `${compact.slice(0, 4)}...${compact.slice(-3)}`;
}

function buildPrepareTurnResponse(input: {
  input: PrepareTurnInput;
  products: readonly CentralProductSnippet[];
  lots: readonly CentralLotSnippet[];
  activeTasks: readonly ActiveTaskSnippet[];
  resolvedHistory: readonly ResolvedTaskHistorySnippet[];
  conflicts: readonly CentralConflictSnippet[];
}): PrepareTurnResponse {
  const centralFactCount =
    input.products.length +
    input.lots.length +
    input.activeTasks.length +
    input.resolvedHistory.length +
    input.conflicts.length;
  const requestedAt = input.input.request.requestedAt;
  const readiness =
    centralFactCount === 0 ? "needs_review" : input.conflicts.length > 0 ? "blocked" : "prepared";
  const blockers =
    centralFactCount === 0
      ? ["Leitura central sem fatos do turno. Confira a loja antes de declarar area segura."]
      : input.conflicts.length > 0
        ? ["Conflito de sincronizacao exige revisao antes da operacao normal."]
        : [];

  return PrepareTurnResponseSchema.parse({
    requestId: input.input.requestId,
    store: {
      storeId: input.input.storeId,
      storeName: input.input.storeName,
      centralVersion: 1,
      generatedAt: requestedAt,
      ...(centralFactCount > 0 ? { centralReadAt: requestedAt } : {}),
      source: "central",
      readiness,
      blockers,
    },
    device: {
      deviceId: input.input.request.deviceId,
      ...(input.input.request.deviceLabel === undefined
        ? {}
        : { deviceLabel: input.input.request.deviceLabel }),
      activeUserLabel: input.input.actorDisplayName,
      storeId: input.input.storeId,
      storeName: input.input.storeName,
      ...(input.input.request.appVersion === undefined
        ? {}
        : { appVersion: input.input.request.appVersion }),
      ...(input.input.request.appBuild === undefined
        ? {}
        : { appBuild: input.input.request.appBuild }),
      ...(input.input.request.environment === undefined
        ? {}
        : { environment: input.input.request.environment }),
      ...(input.input.request.apiTarget === undefined
        ? {}
        : { apiTarget: input.input.request.apiTarget }),
      preparedAt: requestedAt,
      ...(input.input.request.lastForegroundAt === undefined
        ? {}
        : { lastForegroundAt: input.input.request.lastForegroundAt }),
      ...(input.input.request.localSnapshot?.lastSyncedAt === undefined
        ? {}
        : { lastSyncAt: input.input.request.localSnapshot.lastSyncedAt }),
      ...(centralFactCount > 0 ? { lastCentralReadAt: requestedAt } : {}),
      lastHydratedAt: requestedAt,
      pendingCommandCount: input.input.request.localSnapshot?.pendingCommandCount ?? 0,
      conflictCount: input.conflicts.length,
      source: "central",
      ...(input.input.request.pushPermission === undefined
        ? {}
        : { pushPermission: input.input.request.pushPermission }),
      ...(input.input.request.pushProviderState === undefined
        ? {}
        : { pushProviderState: input.input.request.pushProviderState }),
      ...(input.input.request.cameraPermission === undefined
        ? {}
        : { cameraPermission: input.input.request.cameraPermission }),
    },
    cache: {
      state: centralFactCount > 0 ? "ready" : "needs_first_central_read",
      source: "central",
      updatedAt: requestedAt,
      ...(centralFactCount > 0 ? { lastCentralReadAt: requestedAt } : {}),
      staleAfterHours: 4,
      productCount: input.products.length,
      lotCount: input.lots.length,
      activeTaskCount: input.activeTasks.length,
      conflictCount: input.conflicts.length,
      resolvedHistoryCount: input.resolvedHistory.length,
    },
    products: input.products.map(stripStoreId),
    lots: input.lots.map(stripStoreId),
    activeTasks: input.activeTasks.map(stripStoreId),
    resolvedHistory: input.resolvedHistory.map(stripStoreId),
    conflicts: input.conflicts.map(stripStoreId),
  });
}

function buildCentralSyncAckResult(
  command: SyncCommandRecord,
  syncedAt: string,
  history: CentralResolvedTaskHistory,
): Extract<SyncTransportResult, { status: "ack" }> {
  const result = SyncTransportResultSchema.parse({
    status: "ack",
    commandId: command.id,
    idempotencyKey: command.idempotencyKey,
    syncedAt,
    centralResult: {
      kind: "resolved_history",
      history,
    },
  });

  if (result.status !== "ack") {
    throw new Error("invalid_central_sync_ack");
  }

  return result;
}

function buildCentralSyncConflictResult(
  command: SyncCommandRecord,
  input: {
    now: string;
    kind: SyncConflictRecord["remoteChange"]["kind"];
    reason: string;
    summary: string;
  },
): Extract<SyncTransportResult, { status: "conflict" }> {
  const result = SyncTransportResultSchema.parse({
    status: "conflict",
    commandId: command.id,
    idempotencyKey: command.idempotencyKey,
    conflict: buildCentralSyncConflict(command, input),
  });

  if (result.status !== "conflict") {
    throw new Error("invalid_central_sync_conflict");
  }

  return result;
}

function buildCentralSyncConflict(
  command: SyncCommandRecord,
  input: {
    id?: string;
    now: string;
    kind: SyncConflictRecord["remoteChange"]["kind"];
    reason: string;
    summary: string;
  },
): SyncConflictRecord {
  return SyncConflictRecordSchema.parse({
    id: input.id ?? `conflict:${command.id}`,
    commandId: command.id,
    severity: command.urgency,
    reason: input.reason,
    localAction: {
      commandId: command.id,
      kind: command.kind,
      label: commandResolutionAction(command),
      actorLabel: commandActorLabel(command),
      occurredAt: commandOccurredAt(command),
      productDisplayName: command.productDisplayName,
      lotIdentity: command.lotIdentity,
      currentLocation: command.currentLocation,
    },
    remoteChange: {
      kind: input.kind,
      summary: input.summary,
      changedAt: input.now,
    },
    allowedActions: ["keep_local_and_retry", "use_current_task", "discard_offline_action"],
    createdAt: input.now,
  });
}

function buildResolvedHistoryFromTask(input: {
  command: SyncCommandRecord;
  task: SyncTaskRow;
  updatedAt: string;
  nextLocation?: TodayTaskLocation;
}): CentralResolvedTaskHistory {
  return buildCentralResolvedTaskHistory({
    command: input.command,
    lotIdentity: parseJson(input.task.lot_identity) as CaptureLotInput["identity"],
    currentLocation: parseJson(input.task.current_location) as OperationalLocation,
    updatedAt: input.updatedAt,
    ...(input.nextLocation === undefined ? {} : { nextLocation: input.nextLocation }),
  });
}

function buildResolvedHistoryFromResolvedSyncTask(input: {
  command: SyncCommandRecord;
  task: ResolvedSyncTaskRow;
  updatedAt: string;
}): CentralResolvedTaskHistory {
  const action = input.task.resolution_action ?? commandResolutionAction(input.command);
  const actorLabel = input.task.actor_label ?? commandActorLabel(input.command);
  const occurredAt =
    input.task.resolved_at === null
      ? commandOccurredAt(input.command)
      : toIso(input.task.resolved_at);
  const result = CentralResolvedTaskHistorySchema.parse({
    centralTaskId: input.command.taskId,
    activeKey: input.command.taskActiveKey,
    lotId: input.command.lotId,
    productDisplayName: input.command.productDisplayName,
    lotIdentity: parseJson(input.task.lot_identity) as CaptureLotInput["identity"],
    currentLocation: parseJson(input.task.current_location) as OperationalLocation,
    action,
    actorLabel,
    occurredAt,
    resolutionState: resolutionStateForAction(action),
    source: "central",
    updatedAt: input.updatedAt,
  });

  return result;
}

function resolvedTaskMatchesCommand(
  task: Pick<ResolvedSyncTaskRow, "resolution_action">,
  command: SyncCommandRecord,
): boolean {
  return task.resolution_action === commandResolutionAction(command);
}

function buildResolvedHistoryFromStoredTask(input: {
  command: SyncCommandRecord;
  task: StoredTask;
  updatedAt: string;
  nextLocation?: TodayTaskLocation;
}): CentralResolvedTaskHistory {
  return buildCentralResolvedTaskHistory({
    command: input.command,
    lotIdentity: input.command.lotIdentity,
    currentLocation: input.task.currentLocation,
    updatedAt: input.updatedAt,
    ...(input.nextLocation === undefined ? {} : { nextLocation: input.nextLocation }),
  });
}

function buildCentralResolvedTaskHistory(input: {
  command: SyncCommandRecord;
  lotIdentity: CaptureLotInput["identity"];
  currentLocation: OperationalLocation;
  updatedAt: string;
  nextLocation?: TodayTaskLocation;
}): CentralResolvedTaskHistory {
  const action = commandResolutionAction(input.command);
  const evidence = commandCompletedEvidence(input.command);

  return CentralResolvedTaskHistorySchema.parse({
    centralTaskId: input.command.taskId,
    activeKey: input.command.taskActiveKey,
    lotId: input.command.lotId,
    productDisplayName: input.command.productDisplayName,
    lotIdentity: input.lotIdentity,
    currentLocation: input.nextLocation ?? input.currentLocation,
    action,
    actorLabel: commandActorLabel(input.command),
    occurredAt: commandOccurredAt(input.command),
    ...(evidence === undefined ? {} : { evidence }),
    resolutionState: resolutionStateForAction(action),
    source: "central",
    updatedAt: input.updatedAt,
  });
}

function commandResolutionAction(command: SyncCommandRecord): TaskResolutionAction {
  if (command.payload.kind === "resolve_task") {
    return command.payload.payload.action;
  }

  if (command.payload.kind === "request_markdown") {
    return "request_markdown";
  }

  if (command.payload.kind === "decide_markdown") {
    return command.payload.payload.decision === "approved" ? "approve_markdown" : "reject_markdown";
  }

  if (command.payload.kind === "record_markdown_application") {
    return "apply_markdown";
  }

  return "confirm_markdown_on_shelf";
}

function commandActorLabel(command: SyncCommandRecord): string {
  return command.payload.payload.actorLabel;
}

function commandOccurredAt(command: SyncCommandRecord): string {
  return command.payload.payload.occurredAt;
}

function commandDestination(command: SyncCommandRecord): OperationalLocation | undefined {
  if (
    command.payload.kind === "resolve_task" &&
    command.payload.payload.destination !== undefined
  ) {
    return command.payload.payload.destination;
  }

  const action = commandResolutionAction(command);
  if (action === "withdraw" || action === "record_loss") {
    return { kind: "retirada_perda" };
  }

  return undefined;
}

function commandEvidenceState(
  command: SyncCommandRecord,
): "photo_recorded" | "no_photo_reason" | "not_required" | undefined {
  const evidence = commandEvidence(command);
  if (evidence === undefined) return "not_required";
  if (evidence.kind === "photo_recorded") return "photo_recorded";
  if (evidence.kind === "no_photo_reason") return "no_photo_reason";
  return undefined;
}

function commandCompletedEvidence(command: SyncCommandRecord) {
  const evidence = commandEvidence(command);
  if (evidence?.kind === "photo_recorded" || evidence?.kind === "no_photo_reason") {
    return evidence;
  }

  return undefined;
}

function commandEvidence(command: SyncCommandRecord) {
  if (command.payload.kind === "resolve_task") {
    return command.payload.payload.evidence;
  }

  if (command.payload.kind === "record_markdown_application") {
    return command.payload.payload.evidence;
  }

  if (command.payload.kind === "confirm_markdown_on_shelf") {
    return command.payload.payload.evidence;
  }

  return undefined;
}

function resolutionStateForAction(
  action: TaskResolutionAction,
): CentralResolvedTaskHistory["resolutionState"] {
  if (action === "move_lot") return "moved";
  if (
    action === "request_markdown" ||
    action === "approve_markdown" ||
    action === "reject_markdown" ||
    action === "apply_markdown" ||
    action === "confirm_markdown_on_shelf"
  ) {
    return "markdown_stage_completed";
  }

  return "resolved";
}

function syncPolicyRejectionReason(reason: string): string {
  if (reason === "incompatible_action") {
    return "Acao offline incompativel com a tarefa central atual.";
  }

  if (reason === "destination_required") {
    return "Movimentacao offline precisa de destino antes de fechar risco.";
  }

  return "Evidencia ou motivo sem foto e obrigatorio para esta conclusao.";
}

function centralSyncResolutionReason(command: SyncCommandRecord): string {
  return `central_sync:${command.kind}:${commandResolutionAction(command)}`.slice(0, 120);
}

function conflictSnippetFromSyncResult(
  storeId: string,
  conflict: SyncConflictRecord,
): StoredConflict {
  return {
    storeId,
    conflictId: conflict.id,
    commandId: conflict.commandId,
    productDisplayName: conflict.localAction.productDisplayName,
    lotIdentity: conflict.localAction.lotIdentity,
    currentLocation: conflict.localAction.currentLocation,
    reason: conflict.reason,
    createdAt: conflict.createdAt,
    state: "conflict",
    source: "central",
  };
}

function syncAuditEvent(
  input: CentralSyncCommandApplyInput,
  status: "resolved" | "conflict",
  summary: string,
): Record<string, unknown> {
  return {
    type: status === "resolved" ? "task.changed" : "sync.changed",
    storeId: input.storeId,
    targetType: status === "resolved" ? "task" : "sync_command",
    targetId: input.command.taskId,
    targetLabel: input.command.productDisplayName,
    action: `${input.command.kind}.${status}`,
    summary,
    metadata: sanitizeProductAuditMetadata({
      commandId: input.command.id,
      idempotencyKey: input.command.idempotencyKey,
      activeKey: input.command.taskActiveKey,
      action: commandResolutionAction(input.command),
      deviceId: input.deviceId,
    }),
    sanitized: true,
  };
}

function mapProductRow(row: ProductRow): CentralProductSnippet {
  return {
    centralProductId: row.central_product_id,
    displayName: row.display_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    status: row.status,
    state: row.state,
    source: "central",
    updatedAt: toIso(row.updated_at),
    ...(row.gtin === null ? {} : { gtin: row.gtin }),
    ...(parseProductIdentifiers(row) === undefined
      ? {}
      : { identifiers: parseProductIdentifiers(row) }),
    categoryRuleProfile: parseJson(row.category_rule_profile),
  } as CentralProductSnippet;
}

function mapCatalogProductRow(row: ProductRow): ProductCatalogItem {
  return ProductCatalogItemSchema.parse({
    centralProductId: row.central_product_id,
    displayName: row.display_name,
    normalizedKey: row.normalized_key,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryRuleProfile: parseJson(row.category_rule_profile),
    source: row.status === "draft" ? "draft_pending_review" : "central",
    reviewStatus: productReviewStatusFromCentralStatus(row.status),
    syncState: row.state,
    updatedAt: toIso(row.updated_at),
    ...(row.gtin === null ? {} : { gtin: row.gtin }),
    ...(parseProductIdentifiers(row) === undefined
      ? {}
      : { identifiers: parseProductIdentifiers(row) }),
  });
}

function mapCategoryRow(row: CategoryRow): CentralCategoryCatalogItem {
  return CentralCategoryCatalogItemSchema.parse({
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryRuleProfile: parseJson(row.category_rule_profile),
  });
}

function mapLotRow(row: LotRow): CentralLotSnippet {
  return {
    centralLotId: row.central_lot_id,
    centralProductId: row.central_product_id,
    productDisplayName: row.product_display_name,
    lotIdentity: parseJson(row.lot_identity),
    mode: row.mode,
    currentLocation: parseJson(row.current_location),
    state: row.state,
    source: row.source,
    ...(row.risk_state === null ? {} : { riskState: row.risk_state }),
    ...(row.expires_at === null ? {} : { expiresAt: row.expires_at }),
    ...(row.received_at === null ? {} : { receivedAt: row.received_at }),
    ...(row.quality_inspection_due_at === null
      ? {}
      : { qualityInspectionDueAt: row.quality_inspection_due_at }),
    ...(row.approximate_quantity === null ? {} : { approximateQuantity: row.approximate_quantity }),
    updatedAt: toIso(row.updated_at),
  } as CentralLotSnippet;
}

function mapTaskRow(row: TaskRow): ActiveTaskSnippet {
  return {
    centralTaskId: row.central_task_id,
    activeKey: row.active_key,
    centralLotId: row.central_lot_id,
    productDisplayName: row.product_display_name,
    currentLocation: parseJson(row.current_location),
    riskState: row.risk_state,
    severity: row.severity,
    requiredResolution: row.required_resolution,
    state: row.state,
    source: "central",
    ownerLabel: row.owner_label,
    ...(row.due_at === null ? {} : { dueAt: toIso(row.due_at) }),
    updatedAt: toIso(row.updated_at),
  } as ActiveTaskSnippet;
}

function mapResolvedRow(row: ResolvedTaskRow): ResolvedTaskHistorySnippet {
  return {
    centralTaskId: row.central_task_id,
    centralLotId: row.central_lot_id,
    productDisplayName: row.product_display_name,
    lotIdentity: parseJson(row.lot_identity),
    currentLocation: parseJson(row.current_location),
    action: row.resolution_action,
    actorLabel: row.actor_label,
    ...(row.resolution_reason === null ? {} : { reason: row.resolution_reason }),
    resolvedAt: toIso(row.resolved_at),
    state: "resolved",
    source: "central",
  } as ResolvedTaskHistorySnippet;
}

function mapConflictRow(row: ConflictRow): CentralConflictSnippet {
  return {
    conflictId: row.conflict_id,
    commandId: row.command_id,
    productDisplayName: row.product_display_name,
    lotIdentity: parseJson(row.lot_identity),
    currentLocation: parseJson(row.current_location),
    reason: row.reason,
    createdAt: toIso(row.created_at),
    state: row.state,
    source: "central",
  } as CentralConflictSnippet;
}

function mapLotProjectionRow(row: LotProjectionRow): CentralLotProjectionContext {
  const lotIdentity = parseJson(row.lot_identity) as CaptureLotInput["identity"];
  const currentLocation = parseJson(row.current_location) as OperationalLocation;
  const quantity =
    row.observation_quantity === null
      ? quantitySnapshotFromApproximate(row.approximate_quantity)
      : parseObservationQuantity(row.observation_quantity);
  const observationLocation =
    row.observation_location === null
      ? currentLocation
      : (parseJson(row.observation_location) as OperationalLocation);
  const approximateQuantity =
    quantity.quantityState === "estimated"
      ? quantity.approximateQuantity
      : (row.approximate_quantity ?? 0);
  const updatedAt = toIso(row.updated_at);
  const observationBase = {
    centralObservationId:
      row.observation_id ??
      createStableId("obs", row.store_id ?? "store", `${row.central_lot_id}:legacy`),
    centralLotId: row.central_lot_id,
    status: row.observation_status ?? "present",
    actorLabel: row.observation_actor_display_name ?? "Leitura central",
    occurredAt: toIso(row.observation_occurred_at ?? row.updated_at),
    location: observationLocation,
    isCorrection: false,
  };
  const currentObservation: CentralPhysicalObservation =
    quantity.quantityState === "estimated"
      ? {
          ...observationBase,
          quantityState: "estimated",
          approximateQuantity: quantity.approximateQuantity,
        }
      : {
          ...observationBase,
          quantityState: "not_estimable",
        };

  return {
    storeId: row.store_id ?? "",
    centralLotId: row.central_lot_id,
    centralProductId: row.central_product_id,
    productDisplayName: row.product_display_name,
    categoryRuleProfile: toDomainCategoryProfile(
      parseJson(row.category_rule_profile) as ProductCatalogItem["categoryRuleProfile"],
    ),
    lotIdentity,
    lotIdentityKey: row.lot_identity_key ?? lotIdentityKey(lotIdentity),
    mode: row.mode,
    initialLocation: currentLocation,
    currentLocation,
    state: row.state,
    source: row.source,
    ...(row.expires_at === null ? {} : { expiresAt: row.expires_at }),
    ...(row.received_at === null ? {} : { receivedAt: row.received_at }),
    ...(row.quality_inspection_due_at === null
      ? {}
      : { qualityInspectionDueAt: row.quality_inspection_due_at }),
    approximateQuantity,
    createdAt: toIso(row.created_at ?? row.updated_at),
    updatedAt,
    currentObservation,
  };
}

function buildLotProjectionContextFromCreate(input: {
  storeId: string;
  centralLotId: string;
  lot: CaptureLotInput;
  product: ProductCatalogItem;
  observation: CentralPhysicalObservation;
  createdAt: string;
  updatedAt: string;
}): CentralLotProjectionContext {
  return {
    storeId: input.storeId,
    centralLotId: input.centralLotId,
    centralProductId: input.product.centralProductId,
    productDisplayName: input.product.displayName,
    categoryRuleProfile: toDomainCategoryProfile(input.product.categoryRuleProfile),
    lotIdentity: input.lot.identity,
    lotIdentityKey: lotIdentityKey(input.lot.identity),
    mode: input.lot.mode,
    initialLocation: input.lot.initialLocation,
    currentLocation: input.observation.location,
    state: "synchronized",
    source: "central",
    ...dateFieldsFromLot(input.lot),
    approximateQuantity: input.lot.approximateQuantity,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    currentObservation: input.observation,
  };
}

function buildCentralLotProjectionResult(input: {
  requestId: string;
  context: CentralLotProjectionContext;
  updatedAt: string;
}): CentralLotProjectionResult {
  const projected = projectCentralLotTask({
    currentDate: input.updatedAt.slice(0, 10),
    currentTimestamp: input.updatedAt,
    lotId: input.context.centralLotId,
    productDisplayName: input.context.productDisplayName,
    lotIdentity: input.context.lotIdentity.value,
    currentLocation: input.context.currentLocation,
    lot: riskLotFromContext(input.context),
    categoryProfile: input.context.categoryRuleProfile,
    lastPhysicalObservation: {
      status: input.context.currentObservation.status,
      observedAt: input.context.currentObservation.occurredAt,
      quantityState: input.context.currentObservation.quantityState,
      ...(input.context.currentObservation.quantityState === "estimated"
        ? { approximateQuantity: input.context.currentObservation.approximateQuantity }
        : {}),
    },
  });
  const activeTask =
    projected.attention === "active_task"
      ? (() => {
          const activeKey = createCentralProjectedTaskActiveKey({
            storeId: input.context.storeId,
            projectedActiveKey: projected.task.activeKey,
            riskState: projected.task.riskState,
            requiredResolution: projected.task.requiredResolution,
          });

          return activeTaskSnippetFromProjection({
            centralTaskId: createStableId("task", input.context.storeId, activeKey),
            context: input.context,
            task: { ...projected.task, activeKey },
            updatedAt: input.updatedAt,
          });
        })()
      : undefined;
  const taskProjection = taskProjectionSummaryFromProjection({
    projected,
    updatedAt: input.updatedAt,
    ...(activeTask === undefined ? {} : { activeTask }),
  });
  const lot = buildCentralLotSnapshot({
    context: input.context,
    taskProjection,
    assessment: projected.assessment,
  });

  return {
    response: CentralLotWriteResponseSchema.parse({
      requestId: input.requestId,
      lot,
      taskProjection,
      acknowledgement: {
        acknowledgementId: createStableId("ack", input.context.storeId, input.requestId),
        centralLotId: input.context.centralLotId,
        state: "synchronized",
        acknowledgedAt: input.updatedAt,
        message: "Lote sincronizado com a central. Verifique se ainda existe bloqueio operacional.",
      },
    }),
    ...(activeTask === undefined ? {} : { activeTask }),
    assessment: projected.assessment,
  };
}

function buildCentralLotSnapshot(input: {
  context: CentralLotProjectionContext;
  taskProjection: CentralLotTaskProjectionSummary;
  assessment: RiskAssessment;
}): CentralLotSnapshot {
  const riskState = centralRiskStateFromAssessment(input.assessment);
  const base = {
    centralLotId: input.context.centralLotId,
    centralProductId: input.context.centralProductId,
    productDisplayName: input.context.productDisplayName,
    lotIdentity: input.context.lotIdentity,
    approximateQuantity: input.context.approximateQuantity,
    initialLocation: input.context.initialLocation,
    currentObservation: input.context.currentObservation,
    lifecycleStatus: "active" as const,
    state: input.context.state,
    source: input.context.source,
    ...(riskState === null ? {} : { riskState }),
    taskProjection: input.taskProjection,
    createdAt: input.context.createdAt,
    updatedAt: input.context.updatedAt,
  };

  if (input.context.mode === "formal_validity") {
    return {
      ...base,
      mode: "formal_validity",
      expiresAt: input.context.expiresAt ?? input.context.updatedAt.slice(0, 10),
      ...(input.context.receivedAt === undefined ? {} : { receivedAt: input.context.receivedAt }),
    };
  }

  if (input.context.mode === "processed_repack_loss") {
    return {
      ...base,
      mode: "processed_repack_loss",
      expiresAt: input.context.expiresAt ?? input.context.updatedAt.slice(0, 10),
      ...(input.context.receivedAt === undefined ? {} : { receivedAt: input.context.receivedAt }),
    };
  }

  if (input.context.mode === "flv_inspection") {
    return {
      ...base,
      mode: "flv_inspection",
      receivedAt: input.context.receivedAt ?? input.context.updatedAt.slice(0, 10),
      ...(input.context.qualityInspectionDueAt === undefined
        ? {}
        : { qualityInspectionDueAt: input.context.qualityInspectionDueAt }),
      ...(input.context.qualityWindowDays === undefined
        ? {}
        : { qualityWindowDays: input.context.qualityWindowDays }),
    };
  }

  return {
    ...base,
    mode: "receiving_monitored",
    receivedAt: input.context.receivedAt ?? input.context.updatedAt.slice(0, 10),
  };
}

function activeTaskSnippetFromProjection(input: {
  centralTaskId: string;
  context: CentralLotProjectionContext;
  task: ActiveCentralTaskProjection;
  updatedAt: string;
}): ActiveTaskSnippet {
  return {
    centralTaskId: input.centralTaskId,
    activeKey: input.task.activeKey,
    centralLotId: input.context.centralLotId,
    productDisplayName: input.context.productDisplayName,
    currentLocation: input.task.currentLocation,
    riskState: input.task.riskState,
    severity: input.task.severity,
    requiredResolution: input.task.requiredResolution,
    state: "synchronized",
    source: "central",
    ownerLabel: input.task.ownerLabel,
    dueAt: input.updatedAt,
    updatedAt: input.updatedAt,
  };
}

function taskProjectionSummaryFromProjection(input: {
  projected: ReturnType<typeof projectCentralLotTask>;
  activeTask?: ActiveTaskSnippet;
  updatedAt: string;
}): CentralLotTaskProjectionSummary {
  if (input.projected.attention === "active_task") {
    if (input.activeTask === undefined) {
      throw new Error("central_task_projection_missing_active_task");
    }

    return {
      attention: "active_task",
      centralTaskId: input.activeTask.centralTaskId,
      activeKey: input.activeTask.activeKey,
      riskState: input.activeTask.riskState,
      severity: input.activeTask.severity,
      requiredResolution: input.activeTask.requiredResolution,
      ownerLabel: input.activeTask.ownerLabel,
      updatedAt: input.updatedAt,
    };
  }

  if (input.projected.attention === "future_attention") {
    return {
      attention: "future_attention",
      riskState: "radar",
      observedAt: input.updatedAt,
    };
  }

  return {
    attention: "none",
    riskState: "safe",
    observedAt: input.updatedAt,
  };
}

function initialObservationFromLot(request: CentralLotCreateRequest): PhysicalObservationInput {
  return {
    status: "present",
    actorLabel: request.actorLabel,
    occurredAt: request.occurredAt,
    location: request.lot.initialLocation,
    isCorrection: false,
    quantityState: "estimated",
    approximateQuantity: request.lot.approximateQuantity,
  };
}

function buildCentralObservation(input: {
  centralLotId: string;
  centralObservationId: string;
  observation: PhysicalObservationInput;
}): CentralPhysicalObservation {
  const base = {
    centralObservationId: input.centralObservationId,
    centralLotId: input.centralLotId,
    status: input.observation.status,
    actorLabel: input.observation.actorLabel,
    occurredAt: input.observation.occurredAt,
    location: input.observation.location,
    isCorrection: input.observation.isCorrection,
    ...(input.observation.correctionReason === undefined
      ? {}
      : { correctionReason: input.observation.correctionReason }),
  };

  if (input.observation.quantityState === "estimated") {
    return {
      ...base,
      quantityState: "estimated",
      approximateQuantity: input.observation.approximateQuantity,
    };
  }

  return {
    ...base,
    quantityState: "not_estimable",
  };
}

function quantitySnapshotFromObservation(
  observation: CentralPhysicalObservation,
): CentralObservationQuantity {
  return observation.quantityState === "estimated"
    ? { quantityState: "estimated", approximateQuantity: observation.approximateQuantity }
    : { quantityState: "not_estimable" };
}

function quantitySnapshotFromApproximate(
  approximateQuantity: number | null,
): CentralObservationQuantity {
  return approximateQuantity === null
    ? { quantityState: "not_estimable" }
    : { quantityState: "estimated", approximateQuantity };
}

function parseObservationQuantity(
  value: Record<string, unknown> | string,
): CentralObservationQuantity {
  const parsed = parseJson(value);
  if (
    parsed.quantityState === "estimated" &&
    typeof parsed.approximateQuantity === "number" &&
    parsed.approximateQuantity >= 0
  ) {
    return {
      quantityState: "estimated",
      approximateQuantity: parsed.approximateQuantity,
    };
  }

  return { quantityState: "not_estimable" };
}

function toDomainCategoryProfile(
  profile: ProductCatalogItem["categoryRuleProfile"],
): CategoryRuleProfile {
  const windows: NonNullable<CategoryRuleProfile["windows"]> = {};

  if (profile.windows?.radarDays !== undefined) windows.radarDays = profile.windows.radarDays;
  if (profile.windows?.markdownDays !== undefined) {
    windows.markdownDays = profile.windows.markdownDays;
  }
  if (profile.windows?.criticalDays !== undefined) {
    windows.criticalDays = profile.windows.criticalDays;
  }
  if (profile.windows?.expiredDays !== undefined) {
    windows.expiredDays = profile.windows.expiredDays;
  }
  if (profile.windows?.qualityWindowDays !== undefined) {
    windows.qualityWindowDays = profile.windows.qualityWindowDays;
  }

  return {
    categoryId: profile.categoryId,
    mode: profile.mode,
    ...(Object.keys(windows).length === 0 ? {} : { windows }),
    ...(profile.maxPhysicalConfirmationAgeHours === undefined
      ? {}
      : { maxPhysicalConfirmationAgeHours: profile.maxPhysicalConfirmationAgeHours }),
  };
}

function riskLotFromContext(
  context: CentralLotProjectionContext,
): Parameters<typeof projectCentralLotTask>[0]["lot"] {
  if (context.mode === "formal_validity") {
    return {
      mode: "formal_validity",
      productId: context.centralProductId,
      lotCode: context.lotIdentity.value,
      ...(context.expiresAt === undefined ? {} : { expiresAt: context.expiresAt }),
    };
  }

  if (context.mode === "processed_repack_loss") {
    return {
      mode: "processed_repack_loss",
      productId: context.centralProductId,
      lotCode: context.lotIdentity.value,
      ...(context.expiresAt === undefined ? {} : { expiresAt: context.expiresAt }),
    };
  }

  if (context.mode === "flv_inspection") {
    return {
      mode: "flv_inspection",
      productId: context.centralProductId,
      lotCode: context.lotIdentity.value,
      ...(context.receivedAt === undefined ? {} : { receivedAt: context.receivedAt }),
      ...(context.qualityInspectionDueAt === undefined
        ? {}
        : { qualityInspectionDueAt: context.qualityInspectionDueAt }),
      ...(context.qualityWindowDays === undefined
        ? {}
        : { qualityWindowDays: context.qualityWindowDays }),
    };
  }

  return {
    mode: "receiving_monitored",
    productId: context.centralProductId,
    lotCode: context.lotIdentity.value,
    ...(context.receivedAt === undefined ? {} : { receivedAt: context.receivedAt }),
  };
}

function dateFieldsFromLot(
  lot: CaptureLotInput,
): Partial<
  Pick<
    CentralLotProjectionContext,
    "expiresAt" | "receivedAt" | "qualityInspectionDueAt" | "qualityWindowDays"
  >
> {
  if (lot.mode === "formal_validity" || lot.mode === "processed_repack_loss") {
    return {
      expiresAt: lot.expiresAt,
      ...(lot.receivedAt === undefined ? {} : { receivedAt: lot.receivedAt }),
    };
  }

  if (lot.mode === "flv_inspection") {
    const qualityInspectionDueAt =
      lot.qualityInspectionDueAt ?? deriveDateAfterDays(lot.receivedAt, lot.qualityWindowDays);

    return {
      receivedAt: lot.receivedAt,
      ...(lot.qualityWindowDays === undefined ? {} : { qualityWindowDays: lot.qualityWindowDays }),
      ...(qualityInspectionDueAt === undefined ? {} : { qualityInspectionDueAt }),
    };
  }

  return { receivedAt: lot.receivedAt };
}

function deriveDateAfterDays(startDate: string, days: number | undefined): string | undefined {
  if (days === undefined) return undefined;
  const date = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function centralRiskStateFromAssessment(
  assessment: RiskAssessment,
): CentralLotSnippet["riskState"] | null {
  return assessment.state === "safe" ? null : assessment.state;
}

function lotIdentityKey(identity: CaptureLotInput["identity"]): string {
  return `${identity.identitySource}:${identity.value}`.toLocaleLowerCase("pt-BR");
}

function stripStoreId<TItem>(item: TItem): Omit<TItem, "storeId"> {
  const rest = { ...(item as Record<string, unknown>) };
  delete rest.storeId;
  delete rest.taskStatus;

  return rest as Omit<TItem, "storeId">;
}

function buildProductSearchResponse(input: {
  requestId: string;
  request: ProductSearchRequest;
  products: readonly ProductCatalogItem[];
}): ProductSearchResponse {
  const normalizedQuery =
    input.request.query === undefined ? undefined : normalizeProductKey(input.request.query);
  const exactMatches = input.products.filter((product) =>
    isExactCatalogMatch(product, {
      ...input.request,
      ...(normalizedQuery === undefined ? {} : { normalizedQuery }),
    }),
  );
  const draftMatch = exactMatches.find((product) => product.reviewStatus === "pending_review");
  const reusableProducts = exactMatches
    .filter((product) => product.reviewStatus === "validated")
    .map((product) =>
      productSearchCandidate(
        product,
        "reusable_central",
        exactMatchReasons(product, input.request),
      ),
    );
  const similarCandidates = buildSimilarCandidates({
    request: input.request,
    products: input.products.filter(
      (product) =>
        !exactMatches.some((exact) => exact.centralProductId === product.centralProductId),
    ),
  });
  const draft =
    draftMatch === undefined
      ? undefined
      : buildDraftStateFromProduct({
          draftId: createStableId("draft", "catalog", draftMatch.centralProductId),
          product: draftMatch,
          requestedByLabel: "Catalogo central",
          requestedAt: draftMatch.updatedAt,
          reviewStatus: "pending_review",
        });

  return ProductSearchResponseSchema.parse({
    requestId: input.requestId,
    ...(normalizedQuery === undefined ? {} : { normalizedQuery }),
    resultState:
      reusableProducts.length > 0
        ? "reuse_available"
        : draft !== undefined
          ? "draft_pending_review"
          : similarCandidates.length > 0
            ? "similar_requires_review"
            : "no_safe_reuse",
    reusableProducts,
    similarCandidates,
    ...(draft === undefined ? {} : { draft }),
  });
}

function buildSimilarCandidates(input: {
  request: ProductDraftCreateRequest | ProductSearchRequest;
  products: readonly ProductCatalogItem[];
}): readonly ProductSearchCandidate[] {
  const normalizedQuery =
    "displayName" in input.request
      ? normalizeProductKey(input.request.displayName)
      : input.request.query === undefined
        ? undefined
        : normalizeProductKey(input.request.query);
  const categoryId = input.request.categoryId;
  const tokens = normalizedQuery?.split(" ").filter((token) => token.length >= 3) ?? [];

  return input.products
    .filter((product) => {
      if (normalizedQuery !== undefined && product.normalizedKey === normalizedQuery) return false;
      if (
        "gtin" in input.request &&
        input.request.gtin !== undefined &&
        product.gtin === input.request.gtin
      ) {
        return false;
      }

      const sharesToken = tokens.some((token) => product.normalizedKey.includes(token));
      const sharesCategory =
        categoryId !== undefined && product.categoryId === categoryId && sharesToken;

      return sharesToken || sharesCategory;
    })
    .slice(0, 10)
    .map((product) =>
      productSearchCandidate(
        product,
        "similar_candidate",
        similarMatchReasons(product, {
          ...(normalizedQuery === undefined ? {} : { normalizedQuery }),
          ...(categoryId === undefined ? {} : { categoryId }),
        }),
        {
          similarityScore: estimateSimilarity(product.normalizedKey, normalizedQuery),
          warning: "Produto parecido encontrado. Reutilize se for o mesmo item.",
        },
      ),
    );
}

function buildExistingProductCreateResponse(input: {
  requestId: string;
  normalizedKey: string;
  product: ProductCatalogItem;
  duplicateReason: ProductDuplicateReason;
}): ProductDraftCreateResponse {
  if (input.product.reviewStatus === "pending_review") {
    const draft = buildDraftStateFromProduct({
      draftId: createStableId("draft", "catalog", input.product.centralProductId),
      product: input.product,
      requestedByLabel: "Catalogo central",
      requestedAt: input.product.updatedAt,
      reviewStatus: "pending_review",
    });

    return ProductDraftCreateResponseSchema.parse({
      requestId: input.requestId,
      normalizedKey: input.normalizedKey,
      outcome: "draft_pending_review",
      similarCandidates: [],
      draft,
      acknowledgement: buildProductAcknowledgement({
        requestId: input.requestId,
        centralProductId: input.product.centralProductId,
        state: "draft_pending_review",
        syncState: "pending_central",
        reviewStatus: "pending_review",
        acknowledgedAt: input.product.updatedAt,
        message: "Cadastro do produto ja existe e segue pendente de validacao.",
      }),
    });
  }

  return ProductDraftCreateResponseSchema.parse({
    requestId: input.requestId,
    normalizedKey: input.normalizedKey,
    outcome: "reuse_existing",
    duplicateReason: input.duplicateReason,
    reusableProduct: input.product,
    similarCandidates: [],
  });
}

function buildDraftState(input: {
  draftId: string;
  centralProductId: string;
  request: ProductDraftCreateRequest;
  normalizedKey: string;
  requestedByLabel: string;
  requestedAt: string;
  similarCandidates: readonly ProductSearchCandidate[];
}): ProductDraftReviewState {
  return {
    draftId: input.draftId,
    centralProductId: input.centralProductId,
    displayName: input.request.displayName,
    normalizedKey: input.normalizedKey,
    categoryId: input.request.categoryId,
    categoryName: input.request.categoryName,
    categoryRuleProfile: input.request.categoryRuleProfile,
    source: "draft_pending_review",
    reviewStatus: "pending_review",
    syncState: "pending_central",
    requestedByLabel: input.requestedByLabel,
    requestedAt: input.requestedAt,
    similarCandidates: [...input.similarCandidates],
    ...(input.request.gtin === undefined ? {} : { gtin: input.request.gtin }),
    ...(requestIdentifiersForResponse(input.request).length === 0
      ? {}
      : { identifiers: requestIdentifiersForResponse(input.request) }),
  };
}

function buildDraftStateFromProduct(input: {
  draftId: string;
  product: ProductCatalogItem;
  requestedByLabel: string;
  requestedAt: string;
  reviewStatus: ProductReviewStatus;
  reviewReason?: string;
  reviewedAt?: string;
}): ProductDraftReviewState {
  return {
    draftId: input.draftId,
    centralProductId: input.product.centralProductId,
    displayName: input.product.displayName,
    normalizedKey: input.product.normalizedKey,
    categoryId: input.product.categoryId,
    categoryName: input.product.categoryName,
    categoryRuleProfile: input.product.categoryRuleProfile,
    source: "draft_pending_review",
    reviewStatus: input.reviewStatus,
    syncState: input.product.syncState,
    requestedByLabel: input.requestedByLabel,
    requestedAt: input.requestedAt,
    similarCandidates: [],
    ...(input.product.gtin === undefined ? {} : { gtin: input.product.gtin }),
    ...(input.product.identifiers === undefined
      ? {}
      : { identifiers: [...input.product.identifiers] }),
    ...(input.reviewStatus === "pending_review"
      ? {}
      : {
          reviewReason:
            input.reviewReason ??
            (input.reviewStatus === "validated"
              ? "Produto validado para operacao central."
              : "Rascunho encerrado pela revisao central."),
        }),
    ...(input.reviewedAt === undefined ? {} : { reviewedAt: input.reviewedAt }),
  };
}

function buildProductAcknowledgement(input: {
  requestId: string;
  centralProductId: string;
  state: CentralProductAcknowledgement["state"];
  syncState: VisibleCentralSyncState;
  reviewStatus: ProductReviewStatus;
  acknowledgedAt: string;
  message: string;
}): CentralProductAcknowledgement {
  return CentralProductAcknowledgementSchema.parse({
    acknowledgementId: `${input.requestId}:ack`,
    centralProductId: input.centralProductId,
    state: input.state,
    syncState: input.syncState,
    reviewStatus: input.reviewStatus,
    acknowledgedAt: input.acknowledgedAt,
    message: input.message,
  });
}

function toCatalogItem(product: StoredProduct): ProductCatalogItem {
  return ProductCatalogItemSchema.parse({
    centralProductId: product.centralProductId,
    displayName: product.displayName,
    normalizedKey: product.normalizedKey ?? normalizeProductKey(product.displayName),
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    categoryRuleProfile: product.categoryRuleProfile,
    source: product.status === "draft" ? "draft_pending_review" : "central",
    reviewStatus: productReviewStatusFromCentralStatus(product.status),
    syncState: product.state,
    updatedAt: product.updatedAt,
    ...(product.gtin === undefined ? {} : { gtin: product.gtin }),
    ...(product.identifiers === undefined ? {} : { identifiers: [...product.identifiers] }),
  });
}

function productSearchCandidate(
  product: ProductCatalogItem,
  matchKind: ProductSearchCandidate["matchKind"],
  matchReasons: readonly ProductSearchCandidate["matchReasons"][number][],
  extras: Partial<ProductSearchCandidate> = {},
): ProductSearchCandidate {
  return {
    ...product,
    matchKind,
    matchReasons: [...matchReasons],
    ...extras,
  };
}

function isExactCatalogMatch(
  product: ProductCatalogItem,
  request: ProductSearchRequest & { normalizedQuery?: string },
): boolean {
  return (
    (request.normalizedQuery !== undefined && product.normalizedKey === request.normalizedQuery) ||
    (request.gtin !== undefined && product.gtin === request.gtin) ||
    (request.identifier !== undefined && productHasIdentifier(product, request.identifier))
  );
}

function exactMatchReasons(
  product: ProductCatalogItem,
  request: ProductSearchRequest,
): ProductSearchCandidate["matchReasons"] {
  const normalizedQuery =
    request.query === undefined ? undefined : normalizeProductKey(request.query);
  const reasons: ProductSearchCandidate["matchReasons"] = [];

  if (normalizedQuery !== undefined && product.normalizedKey === normalizedQuery) {
    reasons.push("exact_normalized_name");
  }

  if (request.gtin !== undefined && product.gtin === request.gtin) {
    reasons.push("exact_gtin");
  }

  if (request.identifier !== undefined && productHasIdentifier(product, request.identifier)) {
    reasons.push("exact_identifier");
  }

  return reasons.length === 0 ? ["exact_normalized_name"] : reasons;
}

function similarMatchReasons(
  product: ProductCatalogItem,
  input: { normalizedQuery?: string; categoryId?: string },
): ProductSearchCandidate["matchReasons"] {
  const reasons: ProductSearchCandidate["matchReasons"] = ["similar_name"];

  if (input.categoryId !== undefined && product.categoryId === input.categoryId) {
    reasons.push("similar_category");
  }

  return reasons;
}

function estimateSimilarity(
  productKey: string,
  requestedKey: string | undefined,
): number | undefined {
  if (requestedKey === undefined) return undefined;
  const productTokens = new Set(productKey.split(" "));
  const requestedTokens = requestedKey.split(" ");
  const overlap = requestedTokens.filter((token) => productTokens.has(token)).length;

  return Math.min(1, Math.max(0.1, overlap / Math.max(1, requestedTokens.length)));
}

function productReviewStatusFromCentralStatus(
  status: CentralProductSnippet["status"],
): ProductReviewStatus {
  if (status === "draft") return "pending_review";
  if (status === "rejected") return "rejected";
  if (status === "archived") return "discarded";
  return "validated";
}

function reviewStatusForDecision(
  decision: ProductDraftReviewRequest["decision"],
): ProductReviewStatus {
  if (decision === "approve") return "validated";
  if (decision === "reject") return "rejected";
  return "discarded";
}

function normalizeProductKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .slice(0, 160);
}

function normalizeIdentifierValue(value: string): string {
  return value.trim().replace(/\s+/g, "").toLocaleLowerCase("pt-BR").slice(0, 160);
}

function requestIdentifiers(request: {
  gtin?: string | undefined;
  identifiers?: readonly ProductIdentifierInput[] | undefined;
}): ProductIdentifierInput[] {
  const byKey = new Map<string, ProductIdentifierInput>();

  if (request.gtin !== undefined) {
    byKey.set(`gtin:${normalizeIdentifierValue(request.gtin)}`, {
      type: "gtin",
      value: request.gtin,
    });
  }

  for (const identifier of request.identifiers ?? []) {
    const key = `${identifier.type}:${normalizeIdentifierValue(identifier.value)}`;
    if (!byKey.has(key)) byKey.set(key, identifier);
  }

  return [...byKey.values()];
}

function requestIdentifiersForResponse(request: {
  gtin?: string | undefined;
  identifiers?: readonly ProductIdentifierInput[] | undefined;
}): ProductIdentifier[] {
  return requestIdentifiers(request).map((identifier, index) => ({
    ...identifier,
    normalizedValue: normalizeIdentifierValue(identifier.value),
    source: index === 0 && identifier.type === "gtin" ? "central" : "manual",
    isPrimary: index === 0,
  }));
}

function productHasIdentifier(
  product: ProductCatalogItem,
  identifier: ProductIdentifierInput,
): boolean {
  const normalizedValue = normalizeIdentifierValue(identifier.value);

  if (
    (identifier.type === "gtin" || identifier.type === "ean" || identifier.type === "barcode") &&
    product.gtin !== undefined &&
    normalizeIdentifierValue(product.gtin) === normalizedValue
  ) {
    return true;
  }

  return (product.identifiers ?? []).some(
    (candidate) =>
      candidate.type === identifier.type &&
      normalizeIdentifierValue(candidate.value) === normalizedValue,
  );
}

function productHasAnyIdentifier(
  product: ProductCatalogItem,
  identifiers: readonly ProductIdentifierInput[],
): boolean {
  return identifiers.some((identifier) => productHasIdentifier(product, identifier));
}

function mergeProductIdentifiers(
  product: StoredProduct,
  identifiers: readonly ProductIdentifierInput[],
): StoredProduct {
  const current = [...(product.identifiers ?? [])];
  const seen = new Set(
    current.map((identifier) => `${identifier.type}:${normalizeIdentifierValue(identifier.value)}`),
  );

  for (const identifier of identifiers) {
    const key = `${identifier.type}:${normalizeIdentifierValue(identifier.value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    current.push({
      ...identifier,
      normalizedValue: normalizeIdentifierValue(identifier.value),
      source: "scan",
      isPrimary: current.length === 0,
    });
  }

  const firstGtin = current.find((identifier) => identifier.type === "gtin")?.value;

  return {
    ...product,
    ...(product.gtin === undefined && firstGtin !== undefined ? { gtin: firstGtin } : {}),
    ...(current.length === 0 ? {} : { identifiers: current }),
  };
}

function parseProductIdentifiers(
  row: Pick<ProductRow, "gtin" | "identifiers">,
): ProductIdentifier[] | undefined {
  const rawIdentifiers =
    row.identifiers === undefined || row.identifiers === null
      ? []
      : Array.isArray(row.identifiers)
        ? row.identifiers
        : typeof row.identifiers === "string"
          ? parseJson<unknown[]>(row.identifiers)
          : [];
  const identifiers = rawIdentifiers
    .map((raw) => ProductIdentifierSchema.safeParse(raw))
    .filter((result): result is { success: true; data: ProductIdentifier } => result.success)
    .map((result) => result.data);

  if (
    row.gtin !== null &&
    !identifiers.some(
      (identifier) =>
        identifier.type === "gtin" &&
        normalizeIdentifierValue(identifier.value) === normalizeIdentifierValue(row.gtin ?? ""),
    )
  ) {
    identifiers.unshift({
      type: "gtin",
      value: row.gtin,
      normalizedValue: normalizeIdentifierValue(row.gtin),
      source: "central",
      isPrimary: true,
    });
  }

  return identifiers.length === 0 ? undefined : identifiers;
}

function createStableId(prefix: string, storeId: string, value: string): string {
  return `${prefix}:${storeId}:${value}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function createCentralProjectedTaskActiveKey(input: {
  storeId: string;
  projectedActiveKey: string;
  riskState: ActiveTaskSnippet["riskState"];
  requiredResolution: ActiveTaskSnippet["requiredResolution"];
}): string {
  return createStableId(
    "task-key",
    input.storeId,
    `${stableShortHash(input.projectedActiveKey)}:${input.riskState}:${input.requiredResolution}`,
  );
}

function stableShortHash(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x811c9dc5 ^ 0x9e3779b9;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x01000193);
  }

  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

function productAuditEvent(
  input: ProductDraftCreateInput | ProductDraftReviewInput,
  event: {
    productId: string;
    productLabel: string;
    action: "product.reused" | "product.draft_created" | "product.reviewed";
    summary: string;
    metadata?: Record<string, unknown>;
    reason?: string;
  },
): Record<string, unknown> {
  return {
    type: "sync.changed",
    storeId: input.storeId,
    targetType: "product",
    targetId: event.productId,
    targetLabel: event.productLabel,
    action: event.action,
    summary: event.summary,
    ...(event.reason === undefined ? {} : { reason: event.reason }),
    metadata: sanitizeProductAuditMetadata(event.metadata ?? {}),
    sanitized: true,
  };
}

function sanitizeProductAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (
      key.toLocaleLowerCase("en-US").includes("token") ||
      key.toLocaleLowerCase("en-US").includes("authorization") ||
      key.toLocaleLowerCase("en-US").includes("payload")
    ) {
      continue;
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function onboardingProgressFromRow(
  row: OnboardingProgressRow,
): OnboardingProgressPersistenceRecord {
  const completedAt = row.completed_at === null ? undefined : toIso(row.completed_at);
  const skippedAt = row.skipped_at === null ? undefined : toIso(row.skipped_at);
  const deviceId = row.device_id === null ? undefined : row.device_id;

  return {
    subjectId: row.subject_id,
    storeId: row.store_id,
    flowId: row.flow_id as OnboardingFlowId,
    version: row.version as OnboardingVersion,
    status: OnboardingProgressMutationStatusSchema.parse(row.status),
    ...(completedAt === undefined ? {} : { completedAt }),
    ...(skippedAt === undefined ? {} : { skippedAt }),
    ...(deviceId === undefined ? {} : { deviceId }),
    updatedAt: toIso(row.updated_at),
  };
}

function booleanFromSql(value: boolean | string | number | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return value === "true" || value === "t" || value === "1";
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
