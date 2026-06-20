import type {
  AlertDeliveryResult,
  CaptureProductInput,
  DevicePushRegistrationCommand,
  FutureAttentionRecord,
  MarkdownWorkflowRecord,
  PhysicalObservationInput,
  PushOpenIntent,
  TaskAlertStateRecord,
  TaskResolutionCommand,
  TodayTaskRecord,
} from "@validade-zero/contracts";
import { canStartMarkdownWorkflow } from "@validade-zero/domain";
import type {
  AcknowledgeEscalationInput,
  CaptureLotDetail,
  CaptureLotSnapshot,
  CaptureObservationRecord,
  CaptureProductCategory,
  CaptureProductRecord,
  CaptureRepository,
  CaptureRepositoryDependencies,
  RecordAlertAttemptInput,
  RecentLotsQuery,
  RefreshTaskAlertStatesInput,
  ResolvePushOpenIntentInput,
  RefreshTodayTasksInput,
  TodayTaskRefreshResult,
  LoadMarkdownEntryStateInput,
  MarkdownEntryState,
  SaveLotInput,
} from "./repository";
import {
  assertRecheckResolutionHasEvidence,
  alertChannelStateForRegistration,
  applyAlertDeliveryResult,
  calculateAssessmentForLot,
  createFutureAttentionRecord,
  createInitialObservation,
  createMarkdownStageTodayTaskRecord,
  createSalesAreaRecheckTask,
  createTodayTaskRecord,
  deriveMarkdownEntryState,
  deriveRefreshedTaskAlertState,
  deriveTaskCandidateFromLot,
  maxPhysicalConfirmationAgeHoursForLot,
  nextGeneratedId,
  normalizeProductLookup,
  parseMarkdownApplicationCommand,
  parseMarkdownApprovalCommand,
  parseMarkdownRequestCommand,
  parseMarkdownShelfConfirmationCommand,
  parseMarkdownWorkflowRecord,
  parseAlertDeliveryResult,
  parseAlertDeviceRegistration,
  parseLotId,
  parseLotInput,
  parseObservationInput,
  parseProductCategoryId,
  parseProductInput,
  parseRecentLotsQuery,
  parseTaskResolutionCommand,
  parsePushOpenIntent,
  parseTodayTaskRecord,
  shouldCreateSalesAreaRecheck,
  sortTodayTasks,
} from "./repository";

export function createMemoryCaptureRepository(
  dependencies: CaptureRepositoryDependencies,
): CaptureRepository {
  const products = new Map<string, CaptureProductRecord>();
  const lots = new Map<string, CaptureLotSnapshot>();
  const observations = new Map<string, CaptureObservationRecord[]>();
  const todayTasks = new Map<string, TodayTaskRecord>();
  const futureAttention = new Map<string, FutureAttentionRecord>();
  const markdownWorkflows = new Map<string, MarkdownWorkflowRecord>();
  const alertDevices = new Map<string, DevicePushRegistrationCommand>();
  const taskAlertStates = new Map<string, TaskAlertStateRecord>();
  const alertAttempts: RecordAlertAttemptInput[] = [];
  const escalationReceipts: AcknowledgeEscalationInput[] = [];

  async function initialize(): Promise<void> {
    return Promise.resolve();
  }

  function createProduct(input: CaptureProductInput): Promise<CaptureProductRecord> {
    const product = parseProductInput(input);
    const normalizedName = normalizeProductLookup(product.displayName);
    const existing = [...products.values()].find(
      (candidate) =>
        candidate.normalizedName === normalizedName ||
        (product.gtin !== undefined && candidate.gtin === product.gtin),
    );

    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    const record: CaptureProductRecord = {
      ...product,
      id: nextGeneratedId(dependencies),
      normalizedName,
      createdAt: dependencies.clock(),
    };
    products.set(record.id, record);

    return Promise.resolve(record);
  }

  function findProducts(query: string): Promise<readonly CaptureProductRecord[]> {
    const normalizedQuery = normalizeProductLookup(query);

    if (normalizedQuery.length === 0) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      [...products.values()]
        .filter(
          (product) =>
            product.normalizedName.includes(normalizedQuery) ||
            product.gtin?.includes(normalizedQuery) === true,
        )
        .sort((left, right) => left.displayName.localeCompare(right.displayName, "pt-BR")),
    );
  }

  function listFrequentProducts(): Promise<readonly CaptureProductRecord[]> {
    const lotCounts = new Map<string, number>();

    for (const lot of lots.values()) {
      lotCounts.set(lot.productId, (lotCounts.get(lot.productId) ?? 0) + 1);
    }

    return Promise.resolve(
      [...products.values()]
        .filter((product) => (lotCounts.get(product.id) ?? 0) > 0)
        .sort((left, right) => {
          const frequencyDifference =
            (lotCounts.get(right.id) ?? 0) - (lotCounts.get(left.id) ?? 0);

          return frequencyDifference || left.displayName.localeCompare(right.displayName, "pt-BR");
        }),
    );
  }

  function listProductCategories(): Promise<readonly CaptureProductCategory[]> {
    const counts = new Map<string, number>();

    for (const product of products.values()) {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }

    return Promise.resolve(
      [...counts.entries()]
        .map(([categoryId, productCount]) => ({ categoryId, productCount }))
        .sort((left, right) => left.categoryId.localeCompare(right.categoryId, "pt-BR")),
    );
  }

  function findProductsByCategory(categoryId: string): Promise<readonly CaptureProductRecord[]> {
    const parsedCategoryId = parseProductCategoryId(categoryId);

    return Promise.resolve(
      [...products.values()]
        .filter((product) => product.categoryId === parsedCategoryId)
        .sort((left, right) => left.displayName.localeCompare(right.displayName, "pt-BR")),
    );
  }

  function saveLot(input: SaveLotInput): Promise<CaptureLotSnapshot> {
    const lot = parseLotInput(input.lot);
    const product = products.get(lot.productId);

    if (product === undefined) {
      throw new Error(`Cannot save a lot for an unknown product: ${lot.productId}`);
    }

    const lotId = nextGeneratedId(dependencies);
    const observation: CaptureObservationRecord = {
      ...createInitialObservation(lot, input.actorLabel, dependencies.clock()),
      id: nextGeneratedId(dependencies),
      lotId,
    };
    const snapshot: CaptureLotSnapshot = {
      ...lot,
      id: lotId,
      productDisplayName: product.displayName,
      currentObservation: observation,
    };

    lots.set(lotId, snapshot);
    observations.set(lotId, [observation]);

    return Promise.resolve(snapshot);
  }

  function appendObservation(
    lotId: string,
    input: PhysicalObservationInput,
  ): Promise<CaptureObservationRecord> {
    const validatedLotId = parseLotId(lotId);
    const snapshot = lots.get(validatedLotId);

    if (snapshot === undefined) {
      throw new Error(`Cannot append an observation for an unknown lot: ${validatedLotId}`);
    }

    const observation: CaptureObservationRecord = {
      ...parseObservationInput(input),
      id: nextGeneratedId(dependencies),
      lotId: validatedLotId,
    };
    const history = observations.get(validatedLotId) ?? [];

    observations.set(validatedLotId, [...history, observation]);
    lots.set(validatedLotId, { ...snapshot, currentObservation: observation });

    return Promise.resolve(observation);
  }

  function listRecentLots(query?: RecentLotsQuery): Promise<readonly CaptureLotSnapshot[]> {
    const parsedQuery = parseRecentLotsQuery(query);
    const normalizedQuery =
      parsedQuery.query === undefined ? undefined : normalizeProductLookup(parsedQuery.query);

    return Promise.resolve(
      [...lots.values()]
        .filter((lot) => {
          const matchesQuery =
            normalizedQuery === undefined ||
            normalizeProductLookup(lot.productDisplayName).includes(normalizedQuery) ||
            products.get(lot.productId)?.gtin?.includes(normalizedQuery) === true ||
            lot.identity.value.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
          const matchesLocation =
            parsedQuery.location === undefined ||
            (lot.currentObservation.location.kind === parsedQuery.location.kind &&
              (lot.currentObservation.location.kind !== "other" ||
                parsedQuery.location.kind !== "other" ||
                lot.currentObservation.location.customName === parsedQuery.location.customName));

          return matchesQuery && matchesLocation;
        })
        .sort((left, right) =>
          right.currentObservation.occurredAt.localeCompare(left.currentObservation.occurredAt),
        )
        .slice(0, parsedQuery.limit ?? 20),
    );
  }

  function loadLotDetail(lotId: string): Promise<CaptureLotDetail | null> {
    const validatedLotId = parseLotId(lotId);
    const snapshot = lots.get(validatedLotId);

    if (snapshot === undefined) {
      return Promise.resolve(null);
    }

    const product = products.get(snapshot.productId);

    if (product === undefined) {
      throw new Error(`Lot ${validatedLotId} has no stored product.`);
    }

    return Promise.resolve({
      ...snapshot,
      product,
      observations: observations.get(validatedLotId) ?? [],
    });
  }

  async function refreshTodayTasks(input: RefreshTodayTasksInput): Promise<TodayTaskRefreshResult> {
    const refreshedAt = dependencies.clock();
    futureAttention.clear();

    for (const lotId of lots.keys()) {
      const detail = await loadLotDetail(lotId);

      if (detail === null) {
        continue;
      }

      const candidate = deriveTaskCandidateFromLot({
        lot: detail,
        currentDate: input.currentDate,
        currentTimestamp: input.currentTimestamp,
      });
      const future = createFutureAttentionRecord({
        lot: detail,
        id: `future:${detail.id}:radar`,
        observedAt: input.currentTimestamp,
        currentDate: input.currentDate,
        currentTimestamp: input.currentTimestamp,
      });

      if (future !== null) {
        futureAttention.set(future.id, future);
      }

      if (candidate === null) {
        continue;
      }

      if (
        candidate.requiredResolution === "request_markdown" &&
        findActiveMarkdownWorkflow(detail.id) !== undefined
      ) {
        continue;
      }

      const existing = [...todayTasks.values()].find(
        (task) => task.activeKey === candidate.activeKey,
      );

      if (existing === undefined) {
        const record = createTodayTaskRecord({
          candidate,
          lotIdentity: detail.identity,
          id: nextGeneratedId(dependencies),
          createdAt: refreshedAt,
          updatedAt: refreshedAt,
        });
        todayTasks.set(record.id, record);
        continue;
      }

      if (existing.status !== "active") {
        continue;
      }

      todayTasks.set(
        existing.id,
        parseTodayTaskRecord({
          ...existing,
          productDisplayName: candidate.productDisplayName,
          lotIdentity: detail.identity,
          currentLocation: candidate.currentLocation,
          riskState: candidate.riskState,
          severity: candidate.severity,
          dueBucket: candidate.dueBucket,
          requiredResolution: candidate.requiredResolution,
          section: candidate.section,
          sourceRisk: candidate.sourceRisk,
          priority: candidate.priority,
          updatedAt: refreshedAt,
        }),
      );
    }

    const tasks = await listActiveTodayTasks();
    const future = await listFutureAttention();

    return {
      metadata: {
        refreshedAt,
        activeTaskCount: tasks.length,
        futureAttentionCount: future.length,
        source: input.source,
      },
      tasks,
      futureAttention: future,
    };
  }

  function listActiveTodayTasks(): Promise<readonly TodayTaskRecord[]> {
    return Promise.resolve(sortTodayTasks([...todayTasks.values()].filter(isActiveTask)));
  }

  function listFutureAttention(): Promise<readonly FutureAttentionRecord[]> {
    return Promise.resolve([...futureAttention.values()]);
  }

  function resolveTodayTask(input: TaskResolutionCommand): Promise<TodayTaskRecord> {
    return Promise.resolve().then(() => {
      const command = parseTaskResolutionCommand(input);
      const existing = todayTasks.get(command.taskId);

      if (existing === undefined) {
        throw new Error(`Cannot resolve an unknown Today task: ${command.taskId}`);
      }

      assertRecheckResolutionHasEvidence(existing, command);

      const resolutionHistory = [
        ...(existing.resolutionHistory ?? []),
        {
          action: command.action,
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          ...(command.evidence === undefined ? {} : { evidence: command.evidence }),
        },
      ];
      const resolved = parseTodayTaskRecord({
        ...existing,
        status: "resolved",
        updatedAt: command.occurredAt,
        resolvedAt: command.occurredAt,
        responsibleActorLabel: command.actorLabel,
        resolutionHistory,
      });

      todayTasks.set(resolved.id, resolved);

      if (shouldCreateSalesAreaRecheck(existing, command)) {
        const recheck = createSalesAreaRecheckTask({
          parentTask: existing,
          id: nextGeneratedId(dependencies),
          occurredAt: command.occurredAt,
        });

        todayTasks.set(recheck.id, recheck);
      }

      return resolved;
    });
  }

  function loadTodayTask(taskId: string): Promise<TodayTaskRecord | null> {
    const validatedTaskId = parseLotId(taskId);

    return Promise.resolve(todayTasks.get(validatedTaskId) ?? null);
  }

  async function requestMarkdown(input: Parameters<CaptureRepository["requestMarkdown"]>[0]) {
    const command = parseMarkdownRequestCommand(input);
    const detail = await requireLotDetail(command.lotId);
    const existing = findActiveMarkdownWorkflow(command.lotId);

    if (existing !== undefined) {
      throw new Error(`An active markdown workflow already exists for lot ${command.lotId}.`);
    }

    const assessment = calculateAssessmentForLot({
      lot: detail,
      currentDate: command.occurredAt.slice(0, 10),
      currentTimestamp: command.occurredAt,
    });
    const eligibility = canStartMarkdownWorkflow({
      riskState: assessment.state,
      physicalConfirmation: {
        status: detail.currentObservation.status,
        confirmedAt: detail.currentObservation.occurredAt,
        ...(detail.currentObservation.quantityState === "estimated"
          ? { approximateQuantity: detail.currentObservation.approximateQuantity }
          : {}),
      },
      currentTimestamp: command.occurredAt,
      maxPhysicalConfirmationAgeHours: maxPhysicalConfirmationAgeHoursForLot(detail),
      requestReason: command.reason,
      ...(command.earlyJustification === undefined
        ? {}
        : { earlyJustification: command.earlyJustification }),
    });

    if (eligibility.status === "blocked") {
      throw new Error(eligibility.blocker.label);
    }

    if (command.sourceTaskId !== undefined) {
      await resolveTodayTask({
        taskId: command.sourceTaskId,
        action: "request_markdown",
        actorLabel: command.actorLabel,
        occurredAt: command.occurredAt,
      });
    }

    const workflow = parseMarkdownWorkflowRecord({
      id: nextGeneratedId(dependencies),
      lotId: command.lotId,
      status: "requested",
      currentStage: "requested",
      requestedAt: command.occurredAt,
      requestedBy: command.actorLabel,
      requestReason: command.reason,
      ...(command.earlyJustification === undefined
        ? {}
        : { earlyJustification: command.earlyJustification }),
      stageHistory: [
        {
          stage: "requested",
          action: "request_markdown",
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          reason:
            command.reason === "rule_window"
              ? "Janela de rebaixa"
              : command.earlyJustification,
        },
      ],
      createdAt: command.occurredAt,
      updatedAt: command.occurredAt,
    });
    const task = createMarkdownStageTodayTaskRecord({
      workflow,
      lot: detail,
      assessment,
      id: nextGeneratedId(dependencies),
      createdAt: command.occurredAt,
      updatedAt: command.occurredAt,
    });

    markdownWorkflows.set(workflow.id, workflow);
    todayTasks.set(task.id, task);

    return workflow;
  }

  async function decideMarkdown(input: Parameters<CaptureRepository["decideMarkdown"]>[0]) {
    const command = parseMarkdownApprovalCommand(input);
    const workflow = requireWorkflow(command.workflowId, "requested");
    const detail = await requireLotDetail(workflow.lotId);

    await requireMarkdownTask(command.taskId, workflow.id, "approve_markdown");
    await resolveTodayTask({
      taskId: command.taskId,
      action: command.decision === "approved" ? "approve_markdown" : "reject_markdown",
      actorLabel: command.actorLabel,
      occurredAt: command.occurredAt,
    });

    const updated =
      command.decision === "approved"
        ? parseMarkdownWorkflowRecord({
            ...workflow,
            status: "approved",
            currentStage: "approved",
            approvedAt: command.occurredAt,
            approvedBy: command.actorLabel,
            updatedAt: command.occurredAt,
            stageHistory: [
              ...workflow.stageHistory,
              {
                stage: "approved",
                action: "approve_markdown",
                actorLabel: command.actorLabel,
                occurredAt: command.occurredAt,
              },
            ],
          })
        : parseMarkdownWorkflowRecord({
            ...workflow,
            status: "rejected",
            currentStage: "rejected",
            rejectedAt: command.occurredAt,
            rejectedBy: command.actorLabel,
            rejectionReason: command.rejectionReason,
            updatedAt: command.occurredAt,
            stageHistory: [
              ...workflow.stageHistory,
              {
                stage: "rejected",
                action: "reject_markdown",
                actorLabel: command.actorLabel,
                occurredAt: command.occurredAt,
                reason: command.rejectionReason,
              },
            ],
          });

    markdownWorkflows.set(updated.id, updated);

    if (updated.currentStage === "approved") {
      const assessment = calculateAssessmentForLot({
        lot: detail,
        currentDate: command.occurredAt.slice(0, 10),
        currentTimestamp: command.occurredAt,
      });
      const task = createMarkdownStageTodayTaskRecord({
        workflow: updated,
        lot: detail,
        assessment,
        id: nextGeneratedId(dependencies),
        createdAt: command.occurredAt,
        updatedAt: command.occurredAt,
      });

      todayTasks.set(task.id, task);
    }

    return updated;
  }

  async function recordMarkdownApplication(
    input: Parameters<CaptureRepository["recordMarkdownApplication"]>[0],
  ) {
    const command = parseMarkdownApplicationCommand(input);
    const workflow = requireWorkflow(command.workflowId, "approved");
    const detail = await requireLotDetail(workflow.lotId);

    await requireMarkdownTask(command.taskId, workflow.id, "apply_markdown");
    await resolveTodayTask({
      taskId: command.taskId,
      action: "apply_markdown",
      actorLabel: command.actorLabel,
      occurredAt: command.occurredAt,
      evidence: command.evidence,
    });

    const updated = parseMarkdownWorkflowRecord({
      ...workflow,
      status: "applied",
      currentStage: "applied",
      appliedAt: command.occurredAt,
      appliedBy: command.actorLabel,
      applicationEvidence: command.evidence,
      updatedAt: command.occurredAt,
      stageHistory: [
        ...workflow.stageHistory,
        {
          stage: "applied",
          action: "apply_markdown",
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          evidence: command.evidence,
        },
      ],
    });
    const assessment = calculateAssessmentForLot({
      lot: detail,
      currentDate: command.occurredAt.slice(0, 10),
      currentTimestamp: command.occurredAt,
    });
    const task = createMarkdownStageTodayTaskRecord({
      workflow: updated,
      lot: detail,
      assessment,
      id: nextGeneratedId(dependencies),
      createdAt: command.occurredAt,
      updatedAt: command.occurredAt,
    });

    markdownWorkflows.set(updated.id, updated);
    todayTasks.set(task.id, task);

    return updated;
  }

  async function confirmMarkdownOnShelf(
    input: Parameters<CaptureRepository["confirmMarkdownOnShelf"]>[0],
  ) {
    const command = parseMarkdownShelfConfirmationCommand(input);
    const workflow = requireWorkflow(command.workflowId, "applied");

    await requireMarkdownTask(command.taskId, workflow.id, "confirm_markdown_on_shelf");
    await resolveTodayTask({
      taskId: command.taskId,
      action: "confirm_markdown_on_shelf",
      actorLabel: command.actorLabel,
      occurredAt: command.occurredAt,
      evidence: command.evidence,
    });

    const updated = parseMarkdownWorkflowRecord({
      ...workflow,
      status: "shelf_confirmed",
      currentStage: "shelf_confirmed",
      shelfConfirmedAt: command.occurredAt,
      shelfConfirmedBy: command.actorLabel,
      shelfConfirmationEvidence: command.evidence,
      updatedAt: command.occurredAt,
      stageHistory: [
        ...workflow.stageHistory,
        {
          stage: "shelf_confirmed",
          action: "confirm_markdown_on_shelf",
          actorLabel: command.actorLabel,
          occurredAt: command.occurredAt,
          evidence: command.evidence,
        },
      ],
    });

    markdownWorkflows.set(updated.id, updated);

    return updated;
  }

  function loadMarkdownWorkflowForLot(lotId: string): Promise<MarkdownWorkflowRecord | null> {
    const validatedLotId = parseLotId(lotId);
    const workflows = [...markdownWorkflows.values()]
      .filter((workflow) => workflow.lotId === validatedLotId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return Promise.resolve(workflows.find(isActiveMarkdownWorkflow) ?? workflows[0] ?? null);
  }

  function listActiveMarkdownWorkflows(): Promise<readonly MarkdownWorkflowRecord[]> {
    return Promise.resolve(
      [...markdownWorkflows.values()]
        .filter(isActiveMarkdownWorkflow)
        .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)),
    );
  }

  async function loadMarkdownEntryState(
    input: LoadMarkdownEntryStateInput,
  ): Promise<MarkdownEntryState> {
    const lot = await requireLotDetail(input.lotId);
    const activeWorkflow = findActiveMarkdownWorkflow(lot.id);
    const assessment = calculateAssessmentForLot({
      lot,
      currentDate: input.currentDate,
      currentTimestamp: input.currentTimestamp,
    });

    return deriveMarkdownEntryState({
      lot,
      assessment,
      ...(activeWorkflow === undefined ? {} : { activeWorkflow }),
      currentTimestamp: input.currentTimestamp,
    });
  }

  async function requireLotDetail(lotId: string): Promise<CaptureLotDetail> {
    const detail = await loadLotDetail(lotId);

    if (detail === null) {
      throw new Error(`Cannot load markdown workflow for an unknown lot: ${lotId}`);
    }

    return detail;
  }

  function findActiveMarkdownWorkflow(lotId: string): MarkdownWorkflowRecord | undefined {
    return [...markdownWorkflows.values()].find(
      (workflow) => workflow.lotId === lotId && isActiveMarkdownWorkflow(workflow),
    );
  }

  function requireWorkflow(
    workflowId: string,
    expectedStage: MarkdownWorkflowRecord["currentStage"],
  ): MarkdownWorkflowRecord {
    const workflow = markdownWorkflows.get(parseLotId(workflowId));

    if (workflow === undefined) {
      throw new Error(`Cannot advance an unknown markdown workflow: ${workflowId}`);
    }

    if (workflow.currentStage !== expectedStage || !isActiveMarkdownWorkflow(workflow)) {
      throw new Error(
        `Markdown workflow ${workflowId} is not waiting at stage ${expectedStage}.`,
      );
    }

    return workflow;
  }

  async function requireMarkdownTask(
    taskId: string,
    workflowId: string,
    requiredResolution: TodayTaskRecord["requiredResolution"],
  ): Promise<TodayTaskRecord> {
    const task = await loadTodayTask(taskId);

    if (task === null) {
      throw new Error(`Cannot resolve an unknown markdown task: ${taskId}`);
    }

    if (
      task.status !== "active" ||
      task.markdownWorkflowId !== workflowId ||
      task.requiredResolution !== requiredResolution
    ) {
      throw new Error(`Task ${taskId} is not the active ${requiredResolution} markdown task.`);
    }

    return task;
  }

  function registerAlertDevice(
    input: DevicePushRegistrationCommand,
  ): Promise<DevicePushRegistrationCommand> {
    const registration = parseAlertDeviceRegistration(input);

    alertDevices.set(registration.deviceId, registration);

    return Promise.resolve(registration);
  }

  function loadAlertChannelState(): Promise<DevicePushRegistrationCommand | null> {
    const latest = [...alertDevices.values()].sort((left, right) =>
      right.registeredAt.localeCompare(left.registeredAt),
    )[0];

    return Promise.resolve(latest ?? null);
  }

  async function refreshTaskAlertStates(
    input: RefreshTaskAlertStatesInput,
  ): Promise<readonly TaskAlertStateRecord[]> {
    const registration = await loadAlertChannelState();
    const channelState = alertChannelStateForRegistration(registration);
    const activeTasks = await listActiveTodayTasks();

    for (const task of activeTasks) {
      const existing = taskAlertStates.get(task.id);
      const refreshed = deriveRefreshedTaskAlertState({
        task,
        ...(existing === undefined ? {} : { existing }),
        channelState,
        referenceTime: input.referenceTime,
        ...(input.isWithinShift === undefined ? {} : { isWithinShift: input.isWithinShift }),
        isOverdue: input.overdueTaskIds?.includes(task.id) === true,
      });

      taskAlertStates.set(refreshed.taskId, refreshed);
    }

    return listTaskAlertStates();
  }

  function listTaskAlertStates(): Promise<readonly TaskAlertStateRecord[]> {
    return Promise.resolve(
      [...taskAlertStates.values()].sort((left, right) =>
        left.updatedAt.localeCompare(right.updatedAt),
      ),
    );
  }

  async function recordAlertAttempt(input: RecordAlertAttemptInput): Promise<TaskAlertStateRecord> {
    const result: AlertDeliveryResult = parseAlertDeliveryResult(input.result);
    const task = todayTasks.get(parseLotId(input.taskId));

    if (task === undefined) {
      throw new Error(`Cannot record an alert attempt for an unknown task: ${input.taskId}`);
    }

    const existing =
      taskAlertStates.get(input.taskId) ??
      deriveRefreshedTaskAlertState({
        task,
        channelState: alertChannelStateForRegistration(await loadAlertChannelState()),
        referenceTime: input.attemptedAt,
      });
    const updated = applyAlertDeliveryResult({
      existing,
      attemptId: input.attemptId,
      attemptedAt: input.attemptedAt,
      result,
    });

    alertAttempts.push({ ...input, result });
    taskAlertStates.set(updated.taskId, updated);

    return updated;
  }

  function acknowledgeEscalation(input: AcknowledgeEscalationInput): Promise<TaskAlertStateRecord> {
    return Promise.resolve().then(() => {
      const task = todayTasks.get(parseLotId(input.taskId));

      if (task === undefined) {
        throw new Error(`Cannot acknowledge escalation for an unknown task: ${input.taskId}`);
      }

      const existing =
        taskAlertStates.get(task.id) ??
        deriveRefreshedTaskAlertState({
          task,
          channelState: alertChannelStateForRegistration(
            [...alertDevices.values()].sort((left, right) =>
              right.registeredAt.localeCompare(left.registeredAt),
            )[0] ?? null,
          ),
          referenceTime: input.acknowledgedAt,
        });
      const acknowledged = {
        ...existing,
        escalationState: "leadership_acknowledged",
        leadershipAcknowledgedAt: input.acknowledgedAt,
        updatedAt: input.acknowledgedAt,
      } satisfies TaskAlertStateRecord;

      escalationReceipts.push(input);
      taskAlertStates.set(acknowledged.taskId, acknowledged);

      return acknowledged;
    });
  }

  function resolvePushOpenIntent(input: ResolvePushOpenIntentInput): Promise<PushOpenIntent> {
    return Promise.resolve().then(() => {
      const task = todayTasks.get(parseLotId(input.taskId));
      const recheckReplacement = [...todayTasks.values()].find(
        (candidate) => candidate.status === "active" && candidate.recheckParentId === input.taskId,
      );

      if (recheckReplacement !== undefined) {
        return parsePushOpenIntent({ ...input, result: "task_updated" });
      }

      if (task === undefined) {
        return parsePushOpenIntent({ ...input, result: "task_missing" });
      }

      if (task.status === "resolved") {
        return parsePushOpenIntent({ ...input, result: "task_resolved" });
      }

      if (task.activeKey !== input.taskActiveKey) {
        return parsePushOpenIntent({ ...input, result: "task_updated" });
      }

      return parsePushOpenIntent({ ...input, result: "current_task" });
    });
  }

  return {
    initialize,
    createProduct,
    findProducts,
    listFrequentProducts,
    listProductCategories,
    findProductsByCategory,
    saveLot,
    appendObservation,
    listRecentLots,
    loadLotDetail,
    refreshTodayTasks,
    listActiveTodayTasks,
    listFutureAttention,
    resolveTodayTask,
    loadTodayTask,
    requestMarkdown,
    decideMarkdown,
    recordMarkdownApplication,
    confirmMarkdownOnShelf,
    loadMarkdownWorkflowForLot,
    listActiveMarkdownWorkflows,
    loadMarkdownEntryState,
    registerAlertDevice,
    loadAlertChannelState,
    refreshTaskAlertStates,
    listTaskAlertStates,
    recordAlertAttempt,
    acknowledgeEscalation,
    resolvePushOpenIntent,
  };
}

function isActiveTask(task: TodayTaskRecord): boolean {
  return task.status === "active";
}

function isActiveMarkdownWorkflow(workflow: MarkdownWorkflowRecord): boolean {
  return workflow.status !== "rejected" && workflow.status !== "shelf_confirmed";
}
