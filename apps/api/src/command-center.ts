import {
  CommandCenterProjectionSchema,
  type ActiveTaskSnippet,
  type AuditTimelineItem,
  type CentralConflictSnippet,
  type CentralLotSnippet,
  type CentralProductSnippet,
  type CommandCenterProjection,
  type PrepareTurnResponse,
  type ResolvedTaskHistorySnippet,
} from "@validade-zero/contracts";
import type { CaptureRepository } from "@validade-zero/database/capture-repository";
import type { AuditEventRepository } from "./audit";

export interface CommandCenterService {
  read(input: { storeId: string; storeName: string }): Promise<CommandCenterProjection>;
}

export function createInMemoryCommandCenterService(input?: {
  projection?: CommandCenterProjection;
  now?: () => Date;
}): CommandCenterService {
  const now = input?.now ?? (() => new Date());

  return {
    read(scope) {
      if (input?.projection !== undefined) {
        if (input.projection.storeId !== scope.storeId) {
          throw new Error("Command Center projection is outside the authorized store scope.");
        }

        return Promise.resolve(CommandCenterProjectionSchema.parse(input.projection));
      }

      return Promise.resolve(
        CommandCenterProjectionSchema.parse({
          storeId: scope.storeId,
          storeName: scope.storeName,
          refreshedAt: now().toISOString(),
          freshness: "stale",
          verdict: {
            state: "needs_review",
            title: "Area de venda precisa de conferencia",
            detail:
              "Ainda nao ha uma leitura central suficiente para confirmar a seguranca. Confira as tarefas no dispositivo da operacao.",
          },
          centralSnapshot: emptyCentralSnapshot({
            blockers: ["Ainda nao ha uma leitura central suficiente para confirmar a seguranca."],
            cacheState: "unavailable",
            readiness: "needs_review",
            source: "pending_central",
          }),
          criticalLots: [],
          overdueTasks: [],
          pendingMarkdowns: [],
          pendingProductDrafts: [],
          pendingEvidence: [],
          syncConflicts: [],
          discardedActions: [],
          resolvedHistory: [],
          pendingShiftCloses: [],
          shiftHistory: [],
          devices: [],
        }),
      );
    },
  };
}

export function createCaptureBackedCommandCenterService(input: {
  captureRepository: CaptureRepository;
  now?: () => Date;
}): CommandCenterService {
  const now = input.now ?? (() => new Date());

  return {
    async read(scope) {
      const readAt = now().toISOString();

      try {
        const prepared = await input.captureRepository.prepareTurn({
          requestId: `command-center:${scope.storeId}:${readAt}`,
          storeId: scope.storeId,
          storeName: scope.storeName,
          actorId: "command-center",
          actorDisplayName: "Command Center",
          actorRoleSnapshot: "lead",
          request: {
            deviceId: "command-center",
            requestedAt: readAt,
            appVersion: "web-command-center",
            localSnapshot: {
              knownProductCount: 0,
              knownLotCount: 0,
              pendingCommandCount: 0,
            },
          },
        });

        const devices = await input.captureRepository.listDeviceReadiness({
          storeId: scope.storeId,
          storeName: scope.storeName,
          now: now(),
        });

        return projectionFromCentralPrepareTurn(scope, prepared, readAt, devices);
      } catch {
        return failClosedProjection(scope, readAt);
      }
    },
  };
}

export function createAuditBackedCommandCenterService(input: {
  auditRepository: Pick<AuditEventRepository, "queryStore">;
  now?: () => Date;
}): CommandCenterService {
  const now = input.now ?? (() => new Date());

  return {
    async read(scope) {
      const page = await input.auditRepository.queryStore({
        storeId: scope.storeId,
        type: "sync.changed",
        limit: 50,
      });
      const syncEvents = page.items;

      if (syncEvents.length === 0) {
        return CommandCenterProjectionSchema.parse({
          storeId: scope.storeId,
          storeName: scope.storeName,
          refreshedAt: now().toISOString(),
          freshness: "stale",
          verdict: {
            state: "needs_review",
            title: "Area de venda precisa de conferencia",
            detail:
              "Ainda nao ha uma leitura central suficiente para confirmar a seguranca. Confira as tarefas no dispositivo da operacao.",
          },
          centralSnapshot: emptyCentralSnapshot({
            blockers: ["Ainda nao ha uma leitura central suficiente para confirmar a seguranca."],
            cacheState: "unavailable",
            readiness: "needs_review",
            source: "pending_central",
          }),
          criticalLots: [],
          overdueTasks: [],
          pendingMarkdowns: [],
          pendingProductDrafts: [],
          pendingEvidence: [],
          syncConflicts: [],
          discardedActions: [],
          resolvedHistory: [],
          pendingShiftCloses: [],
          shiftHistory: [],
          devices: [],
        });
      }

      const retryEvents = syncEvents.filter(
        (event) => metadataText(event, "resultStatus") === "retry",
      );
      const conflictEvents = syncEvents.filter(
        (event) =>
          event.status === "conflict" || metadataText(event, "resultStatus") === "conflict",
      );
      const pendingMarkdownEvents = syncEvents.filter((event) =>
        [
          "request_markdown",
          "decide_markdown",
          "record_markdown_application",
          "confirm_markdown_on_shelf",
        ].includes(metadataText(event, "commandKind") ?? ""),
      );
      const pendingProductDraftEvents = syncEvents.filter(
        (event) =>
          event.target.type === "product" &&
          metadataText(event, "action") === "product.draft_created" &&
          metadataText(event, "reviewStatus") === "pending_review",
      );
      const criticalEvents = [...retryEvents, ...conflictEvents].filter((event) =>
        ["expired", "critical"].includes(metadataText(event, "riskState") ?? ""),
      );

      const verdict =
        conflictEvents.length > 0
          ? {
              state: "blocked" as const,
              title: "Conflito de sincronizacao exige revisao",
              detail:
                "O mobile enviou uma acao, mas a leitura central pediu revisao antes de considerar a area segura.",
            }
          : retryEvents.length > 0 ||
              pendingMarkdownEvents.length > 0 ||
              pendingProductDraftEvents.length > 0
            ? {
                state: "needs_review" as const,
                title: "Mobile sincronizado com pendencias operacionais",
                detail:
                  "O Command Center recebeu dados do app, mas ainda ha produto, rebaixa, retry ou conferencia pendente.",
              }
            : {
                state: "safe" as const,
                title: "Mobile e Command Center sincronizados",
                detail:
                  "A leitura central recebeu a ultima acao enviada pelo app mobile desta loja.",
              };

      const projectedProductDrafts = uniqueBy(
        pendingProductDraftEvents.map((event) => ({
          draftId: event.target.id,
          label: event.target.label ?? "Produto em revisao",
          reviewStatus: "pending_review" as const,
          detail: productDraftDetail(event),
          similarCount: metadataNumber(event, "similarCandidateCount") ?? 0,
          requestedByLabel: event.actor.displayName,
          createdAt: event.occurredAt,
        })),
        (item) => item.draftId,
      );

      return CommandCenterProjectionSchema.parse({
        storeId: scope.storeId,
        storeName: scope.storeName,
        refreshedAt: now().toISOString(),
        freshness: "current",
        verdict,
        centralSnapshot: {
          source: "central",
          readiness:
            verdict.state === "blocked"
              ? "blocked"
              : verdict.state === "needs_review"
                ? "needs_review"
                : "prepared",
          cacheState: "ready",
          productCount: projectedProductDrafts.length,
          draftProductCount: projectedProductDrafts.length,
          lotCount: uniqueBy(
            criticalEvents,
            (event) => metadataText(event, "lotId") ?? event.target.id,
          ).length,
          activeTaskCount: retryEvents.length + pendingMarkdownEvents.length,
          conflictCount: conflictEvents.length,
          discardedActionCount: 0,
          resolvedHistoryCount: 0,
          pendingCommandCount: 0,
          lastCentralReadAt: now().toISOString(),
          lastHydratedAt: now().toISOString(),
          blockers:
            verdict.state === "safe"
              ? []
              : ["Leitura baseada em eventos de auditoria com pendencias operacionais."],
        },
        criticalLots: uniqueBy(
          criticalEvents.map((event) => ({
            lotId: metadataText(event, "lotId") ?? event.target.id,
            label: lotLabel(event),
            locationLabel: locationLabel(metadataText(event, "locationKind")),
            reason: criticalLotReason(event),
            cause: criticalLotCause(event),
          })),
          (item) => item.lotId,
        ),
        overdueTasks: retryEvents.map((event) => ({
          taskId: metadataText(event, "taskId") ?? event.target.id,
          label: metadataText(event, "productDisplayName") ?? event.target.label ?? "Tarefa mobile",
          ownerLabel: metadataText(event, "actorLabel") ?? event.actor.displayName,
          dueLabel:
            metadataText(event, "retryLabel") ?? "Aguardando nova tentativa de sincronizacao",
        })),
        pendingMarkdowns: uniqueBy(
          pendingMarkdownEvents.map((event) => ({
            markdownId: metadataText(event, "taskId") ?? event.target.id,
            label:
              metadataText(event, "productDisplayName") ?? event.target.label ?? "Rebaixa mobile",
            stage: markdownStageLabel(metadataText(event, "commandKind")),
          })),
          (item) => item.markdownId,
        ),
        pendingProductDrafts: projectedProductDrafts,
        pendingEvidence: [],
        syncConflicts: conflictEvents.map((event) => ({
          conflictId: metadataText(event, "conflictId") ?? event.eventId,
          label: metadataText(event, "productDisplayName") ?? event.target.label ?? "Acao offline",
          detail: event.reason ?? "Revise a mudanca atual antes de reenviar.",
        })),
        discardedActions: [],
        resolvedHistory: [],
        pendingShiftCloses: [],
        shiftHistory: [],
        devices: [],
      });
    },
  };
}

function failClosedProjection(
  scope: { storeId: string; storeName: string },
  refreshedAt: string,
): CommandCenterProjection {
  return CommandCenterProjectionSchema.parse({
    storeId: scope.storeId,
    storeName: scope.storeName,
    refreshedAt,
    freshness: "stale",
    verdict: {
      state: "needs_review",
      title: "Leitura central indisponivel",
      detail:
        "O Command Center nao recebeu a verdade central de captura. Confira a operacao no mobile antes de liberar a area.",
    },
    centralSnapshot: emptyCentralSnapshot({
      blockers: ["Command Center nao recebeu a verdade central de captura."],
      cacheState: "unavailable",
      readiness: "needs_review",
      source: "pending_central",
    }),
    criticalLots: [],
    overdueTasks: [],
    pendingMarkdowns: [],
    pendingProductDrafts: [],
    pendingEvidence: [],
    syncConflicts: [],
    discardedActions: [],
    resolvedHistory: [],
    pendingShiftCloses: [],
    shiftHistory: [],
    devices: [],
  });
}

function projectionFromCentralPrepareTurn(
  scope: { storeId: string; storeName: string },
  prepared: PrepareTurnResponse,
  refreshedAt: string,
  devices: CommandCenterProjection["devices"],
): CommandCenterProjection {
  const lotsById = new Map(prepared.lots.map((lot) => [lot.centralLotId, lot]));
  const pendingProductDrafts = prepared.products
    .filter((product) => product.status === "draft" || product.status === "rejected")
    .map(productDraftFromCentralProduct);
  const pendingMarkdowns = prepared.activeTasks
    .filter(isMarkdownTask)
    .map((task) => markdownFromCentralTask(task));
  const syncConflicts = prepared.conflicts
    .filter((conflict) => conflict.state === "conflict")
    .map(syncConflictFromCentralConflict);
  const discardedActions = prepared.conflicts
    .filter((conflict) => conflict.state === "discarded")
    .map(discardedActionFromCentralConflict);
  const criticalTasks = prepared.activeTasks.filter(
    (task) => task.riskState === "expired" || task.riskState === "critical",
  );
  const freshness =
    prepared.store.source === "central" && prepared.store.centralReadAt !== undefined
      ? "current"
      : "stale";
  const hasOperationalFacts =
    prepared.lots.length +
      prepared.activeTasks.length +
      prepared.resolvedHistory.length +
      prepared.conflicts.length >
    0;
  const blockerCount =
    prepared.activeTasks.length +
    pendingProductDrafts.length +
    syncConflicts.length +
    discardedActions.length +
    prepared.store.blockers.length;

  return CommandCenterProjectionSchema.parse({
    storeId: scope.storeId,
    storeName: scope.storeName,
    refreshedAt,
    freshness,
    verdict: centralVerdict({
      freshness,
      hasOperationalFacts,
      blockerCount,
      conflictCount: syncConflicts.length,
      activeTaskCount: prepared.activeTasks.length,
      storeBlockers: prepared.store.blockers,
    }),
    centralSnapshot: centralSnapshotFromPrepared(prepared, {
      discardedActionCount: discardedActions.length,
      draftProductCount: pendingProductDrafts.length,
      syncConflictCount: syncConflicts.length,
    }),
    criticalLots: criticalTasks.map((task) => criticalLotFromCentralTask(task, lotsById)),
    overdueTasks: prepared.activeTasks.map(taskFromCentralTask),
    pendingMarkdowns,
    pendingProductDrafts,
    pendingEvidence: [],
    syncConflicts,
    discardedActions,
    resolvedHistory: prepared.resolvedHistory.map(resolvedHistoryFromCentral),
    pendingShiftCloses: [],
    shiftHistory: [],
    devices,
  });
}

function centralVerdict(input: {
  freshness: CommandCenterProjection["freshness"];
  hasOperationalFacts: boolean;
  blockerCount: number;
  conflictCount: number;
  activeTaskCount: number;
  storeBlockers: readonly string[];
}): CommandCenterProjection["verdict"] {
  if (input.freshness !== "current" || !input.hasOperationalFacts) {
    return {
      state: "needs_review",
      title: "Area de venda precisa de conferencia",
      detail:
        input.storeBlockers[0] ??
        "Ainda nao ha leitura central suficiente para confirmar a seguranca.",
    };
  }

  if (input.conflictCount > 0) {
    return {
      state: "blocked",
      title: "Conflito de sincronizacao bloqueia a seguranca",
      detail: "Revise os conflitos antes de considerar a area de venda liberada.",
    };
  }

  if (input.activeTaskCount > 0) {
    return {
      state: "blocked",
      title: "Area de venda com tarefas ativas",
      detail: "Ha riscos centrais ativos que precisam de acao fisica compativel.",
    };
  }

  if (input.blockerCount > 0) {
    return {
      state: "needs_review",
      title: "Operacao central com pendencias",
      detail: "Existem revisoes pendentes antes de declarar a leitura totalmente limpa.",
    };
  }

  return {
    state: "safe",
    title: "Area de venda segura agora",
    detail: "A leitura central esta atual e nao ha tarefas, conflitos ou pendencias abertas.",
  };
}

function emptyCentralSnapshot(input: {
  blockers: readonly string[];
  cacheState: CommandCenterProjection["centralSnapshot"]["cacheState"];
  readiness: CommandCenterProjection["centralSnapshot"]["readiness"];
  source: CommandCenterProjection["centralSnapshot"]["source"];
}): CommandCenterProjection["centralSnapshot"] {
  return {
    source: input.source,
    readiness: input.readiness,
    cacheState: input.cacheState,
    productCount: 0,
    draftProductCount: 0,
    lotCount: 0,
    activeTaskCount: 0,
    conflictCount: 0,
    discardedActionCount: 0,
    resolvedHistoryCount: 0,
    pendingCommandCount: 0,
    blockers: [...input.blockers],
  };
}

function centralSnapshotFromPrepared(
  prepared: PrepareTurnResponse,
  counts: {
    discardedActionCount: number;
    draftProductCount: number;
    syncConflictCount: number;
  },
): CommandCenterProjection["centralSnapshot"] {
  return {
    source: prepared.store.source,
    readiness: prepared.store.readiness,
    cacheState: prepared.cache.state,
    productCount: prepared.cache.productCount,
    draftProductCount: counts.draftProductCount,
    lotCount: prepared.cache.lotCount,
    activeTaskCount: prepared.cache.activeTaskCount,
    conflictCount: counts.syncConflictCount,
    discardedActionCount: counts.discardedActionCount,
    resolvedHistoryCount: prepared.cache.resolvedHistoryCount,
    pendingCommandCount: prepared.device.pendingCommandCount,
    ...(prepared.cache.lastCentralReadAt === undefined
      ? {}
      : { lastCentralReadAt: prepared.cache.lastCentralReadAt }),
    ...(prepared.device.lastHydratedAt === undefined
      ? {}
      : { lastHydratedAt: prepared.device.lastHydratedAt }),
    blockers: [...prepared.store.blockers],
  };
}

function productDraftFromCentralProduct(
  product: CentralProductSnippet,
): CommandCenterProjection["pendingProductDrafts"][number] {
  const reviewStatus = product.status === "rejected" ? "rejected" : "pending_review";

  return {
    draftId: product.centralProductId,
    label: product.displayName,
    reviewStatus,
    detail:
      reviewStatus === "rejected"
        ? "Rascunho recusado pela central e mantido visivel para saneamento operacional."
        : "Rascunho criado no mobile e aguardando validacao central antes de virar catalogo.",
    similarCount: 0,
    requestedByLabel: "Captura mobile",
    createdAt: product.updatedAt,
  };
}

function isMarkdownTask(task: ActiveTaskSnippet): boolean {
  return [
    "request_markdown",
    "approve_markdown",
    "apply_markdown",
    "confirm_markdown_on_shelf",
  ].includes(task.requiredResolution);
}

function markdownFromCentralTask(
  task: ActiveTaskSnippet,
): CommandCenterProjection["pendingMarkdowns"][number] {
  return {
    markdownId: task.centralTaskId,
    label: task.productDisplayName,
    stage: markdownStageForResolution(task.requiredResolution),
  };
}

function syncConflictFromCentralConflict(
  conflict: CentralConflictSnippet,
): CommandCenterProjection["syncConflicts"][number] {
  return {
    conflictId: conflict.conflictId,
    label: formatLotLabel(conflict.productDisplayName, conflict.lotIdentity),
    detail: conflict.reason,
  };
}

function discardedActionFromCentralConflict(
  conflict: CentralConflictSnippet,
): CommandCenterProjection["discardedActions"][number] {
  return {
    commandId: conflict.commandId,
    label: formatLotLabel(conflict.productDisplayName, conflict.lotIdentity),
    reason: conflict.reason,
    discardedAt: conflict.createdAt,
  };
}

function criticalLotFromCentralTask(
  task: ActiveTaskSnippet,
  lotsById: ReadonlyMap<string, CentralLotSnippet>,
): CommandCenterProjection["criticalLots"][number] {
  const lot = lotsById.get(task.centralLotId);
  const cause = centralTaskCause(task, lot);

  return {
    lotId: task.centralLotId,
    label:
      lot === undefined
        ? task.productDisplayName
        : formatLotLabel(lot.productDisplayName, lot.lotIdentity),
    locationLabel: formatLocationLabel(task.currentLocation),
    reason: cause.detail,
    cause,
  };
}

function taskFromCentralTask(
  task: ActiveTaskSnippet,
): CommandCenterProjection["overdueTasks"][number] {
  return {
    taskId: task.centralTaskId,
    label: taskLabelForResolution(task),
    ownerLabel: task.ownerLabel,
    dueLabel:
      task.dueAt === undefined
        ? "Aberta no turno atual"
        : `Prazo central ${task.dueAt.slice(0, 16).replace("T", " ")}`,
  };
}

function resolvedHistoryFromCentral(
  history: ResolvedTaskHistorySnippet,
): CommandCenterProjection["resolvedHistory"][number] {
  const actionLabel = actionLabelForResolution(history.action);

  return {
    taskId: history.centralTaskId,
    label: formatLotLabel(history.productDisplayName, history.lotIdentity),
    actionLabel,
    actorLabel: history.actorLabel,
    resolvedAt: history.resolvedAt,
    detail: history.reason ?? `${actionLabel} confirmado na verdade central.`,
  };
}

function centralTaskCause(
  task: ActiveTaskSnippet,
  lot: CentralLotSnippet | undefined,
): CommandCenterProjection["criticalLots"][number]["cause"] {
  const isQualityExpired = task.riskState === "expired" && lot?.mode === "flv_inspection";
  const code =
    task.riskState === "expired"
      ? isQualityExpired
        ? "quality_window_expired"
        : "formal_expiry_passed"
      : "critical_unresolved";
  const label =
    code === "quality_window_expired"
      ? "Janela de qualidade venceu"
      : code === "formal_expiry_passed"
        ? "Prazo formal ja passou"
        : "Risco critico sem baixa";
  const detail =
    code === "quality_window_expired"
      ? "Lote FLV passou da janela de qualidade e precisa de decisao fisica."
      : code === "formal_expiry_passed"
        ? "Lote vencido ainda nao tem confirmacao central de retirada."
        : "Lote critico ainda precisa de acao fisica compativel.";

  return {
    code,
    label,
    detail,
    actionLabel: actionLabelForRequiredResolution(task.requiredResolution),
    ...(task.riskState === "expired" || task.riskState === "critical"
      ? { riskState: task.riskState }
      : {}),
    requiredResolution: task.requiredResolution,
    responsibleLabel: task.ownerLabel,
    sourceEventId: task.centralTaskId,
    sourceEventSummary: taskLabelForResolution(task),
    firstDetectedAt: task.updatedAt,
    lastObservedAt: task.updatedAt,
  };
}

function taskLabelForResolution(task: ActiveTaskSnippet): string {
  return `${actionLabelForRequiredResolution(task.requiredResolution)} - ${task.productDisplayName}`;
}

function markdownStageForResolution(
  requiredResolution: ActiveTaskSnippet["requiredResolution"],
): string {
  if (requiredResolution === "request_markdown") return "Solicitacao de rebaixa aberta";
  if (requiredResolution === "approve_markdown") return "Aguardando decisao da lideranca";
  if (requiredResolution === "apply_markdown") return "Aguardando aplicacao na etiqueta";
  if (requiredResolution === "confirm_markdown_on_shelf") {
    return "Aguardando conferencia na area de venda";
  }

  return "Rebaixa pendente";
}

function actionLabelForRequiredResolution(
  requiredResolution: ActiveTaskSnippet["requiredResolution"],
): string {
  if (requiredResolution === "withdraw_or_loss") {
    return "Retirar, registrar destino e reconferir a gondola";
  }
  if (requiredResolution === "repack_or_loss") return "Reembalar ou registrar perda";
  if (requiredResolution === "check_presence") return "Conferir presenca fisica";
  if (requiredResolution === "request_markdown") return "Solicitar rebaixa";
  if (requiredResolution === "approve_markdown") return "Decidir rebaixa";
  if (requiredResolution === "apply_markdown") return "Aplicar rebaixa";
  if (requiredResolution === "confirm_markdown_on_shelf") return "Confirmar etiqueta na gondola";
  return "Revisar area de venda";
}

function actionLabelForResolution(action: ResolvedTaskHistorySnippet["action"]): string {
  if (action === "withdraw") return "Retirada confirmada";
  if (action === "repack") return "Reembalagem confirmada";
  if (action === "record_loss") return "Perda registrada";
  if (action === "confirm_presence") return "Presenca confirmada";
  if (action === "request_markdown") return "Rebaixa solicitada";
  if (action === "approve_markdown") return "Rebaixa aprovada";
  if (action === "reject_markdown") return "Rebaixa recusada";
  if (action === "apply_markdown") return "Rebaixa aplicada";
  if (action === "confirm_markdown_on_shelf") return "Etiqueta conferida";
  if (action === "mark_not_found") return "Ausencia confirmada";
  if (action === "mark_probably_sold_out") return "Provavel esgotamento registrado";
  if (action === "move_lot") return "Lote movimentado";
  return "Reconferencia concluida";
}

function formatLotLabel(
  productDisplayName: string,
  lotIdentity: CentralLotSnippet["lotIdentity"],
): string {
  return `${productDisplayName} - lote ${lotIdentity.value}`;
}

function formatLocationLabel(location: ActiveTaskSnippet["currentLocation"]): string {
  if (location.kind === "area_de_venda") return "Area de venda";
  if (location.kind === "estoque") return "Estoque";
  if (location.kind === "camara_fria") return "Camara fria";
  if (location.kind === "ilha_promocional") return "Ilha promocional";
  if (location.kind === "retirada_perda") return "Retirada/perda";
  return location.customName;
}

function metadataText(event: AuditTimelineItem, key: string): string | undefined {
  const value = event.metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function metadataNumber(event: AuditTimelineItem, key: string): number | undefined {
  const value = event.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function productDraftDetail(event: AuditTimelineItem): string {
  const similarCount = metadataNumber(event, "similarCandidateCount") ?? 0;

  if (similarCount === 0) {
    return "Rascunho criado no mobile e aguardando validacao central antes de virar catalogo.";
  }

  return `${similarCount} produto(s) parecido(s) revisados antes do rascunho central.`;
}

function criticalLotReason(event: AuditTimelineItem): string {
  const cause = criticalLotCause(event);
  return cause.detail;
}

function criticalLotCause(
  event: AuditTimelineItem,
): CommandCenterProjection["criticalLots"][number]["cause"] {
  const resultStatus = metadataText(event, "resultStatus");
  const riskState = metadataText(event, "riskState");
  const responsibleLabel = metadataText(event, "actorLabel") ?? event.actor.displayName;
  const requiredResolution = metadataText(event, "requiredResolution");
  const sourceEvent = {
    sourceEventId: event.eventId,
    sourceEventSummary: event.summary,
  };
  const timestamps = compactCauseTimestamps({
    firstDetectedAt: metadataText(event, "commandCreatedAt") ?? event.occurredAt,
    lastObservedAt: metadataText(event, "commandSavedAt") ?? event.occurredAt,
    lastAttemptedAt: metadataText(event, "lastAttemptedAt") ?? event.occurredAt,
  });

  if (resultStatus === "conflict" || event.status === "conflict") {
    return {
      code: "sync_conflict",
      label: "Confirmacao central travou",
      detail: event.reason ?? "Conflito de sincronizacao precisa de decisao.",
      actionLabel: "Revisar conflito antes de liberar a area",
      ...(riskState === "expired" || riskState === "critical" ? { riskState } : {}),
      ...(requiredResolution === undefined ? {} : { requiredResolution }),
      responsibleLabel,
      ...sourceEvent,
      ...timestamps,
    };
  }

  if (resultStatus === "retry") {
    return {
      code: riskState === "expired" ? "formal_expiry_passed" : "sync_retry",
      label: riskState === "expired" ? "Prazo formal ja passou" : "Sync de risco critico falhou",
      detail:
        riskState === "expired"
          ? "Lote vencido ainda nao tem confirmacao central de retirada."
          : "Falha temporaria no sync de risco critico.",
      actionLabel:
        riskState === "expired"
          ? "Retirar, registrar destino e reconferir a gondola"
          : "Tentar sincronizar novamente e conferir o lote",
      ...(riskState === "expired" || riskState === "critical" ? { riskState } : {}),
      ...(requiredResolution === undefined ? {} : { requiredResolution }),
      responsibleLabel,
      ...sourceEvent,
      ...timestamps,
    };
  }

  return {
    code: riskState === "expired" ? "formal_expiry_passed" : "critical_unresolved",
    label: riskState === "expired" ? "Prazo formal ja passou" : "Risco critico sem baixa",
    detail:
      riskState === "expired"
        ? "Lote vencido precisa de retirada, perda ou reembalagem antes do fechamento."
        : "Lote critico ainda precisa de acao fisica compativel.",
    actionLabel:
      riskState === "expired"
        ? "Executar retirada/perda e confirmar ausencia na area de venda"
        : "Conferir lote, local e responsavel antes de liberar",
    ...(riskState === "expired" || riskState === "critical" ? { riskState } : {}),
    ...(requiredResolution === undefined ? {} : { requiredResolution }),
    responsibleLabel,
    ...sourceEvent,
    ...timestamps,
  };
}

function compactCauseTimestamps(input: {
  firstDetectedAt?: string;
  lastAttemptedAt?: string;
  lastObservedAt?: string;
}): {
  firstDetectedAt?: string;
  lastAttemptedAt?: string;
  lastObservedAt?: string;
} {
  return {
    ...(input.firstDetectedAt === undefined ? {} : { firstDetectedAt: input.firstDetectedAt }),
    ...(input.lastObservedAt === undefined ? {} : { lastObservedAt: input.lastObservedAt }),
    ...(input.lastAttemptedAt === undefined ? {} : { lastAttemptedAt: input.lastAttemptedAt }),
  };
}

function lotLabel(event: AuditTimelineItem): string {
  const product = metadataText(event, "productDisplayName") ?? event.target.label ?? "Lote mobile";
  const lot = metadataText(event, "lotIdentityValue");
  return lot === undefined ? product : `${product} - lote ${lot}`;
}

function locationLabel(locationKind: string | undefined): string {
  if (locationKind === "area_de_venda") return "Area de venda";
  if (locationKind === "estoque") return "Estoque";
  if (locationKind === "camara_fria") return "Camara fria";
  if (locationKind === "ilha_promocional") return "Ilha promocional";
  if (locationKind === "retirada_perda") return "Retirada/perda";
  if (locationKind === "reembalagem") return "Reembalagem";
  return "Local registrado no mobile";
}

function markdownStageLabel(commandKind: string | undefined): string {
  if (commandKind === "request_markdown") return "Solicitacao recebida do mobile";
  if (commandKind === "decide_markdown") return "Decisao de rebaixa sincronizada";
  if (commandKind === "record_markdown_application") return "Aplicacao de rebaixa sincronizada";
  if (commandKind === "confirm_markdown_on_shelf") return "Conferencia de etiqueta sincronizada";
  return "Rebaixa sincronizada pelo mobile";
}

function uniqueBy<TItem>(items: readonly TItem[], keyFor: (item: TItem) => string): TItem[] {
  const seen = new Set<string>();
  const result: TItem[] = [];

  for (const item of items) {
    const key = keyFor(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}
