import {
  CommandCenterProjectionSchema,
  type AuditTimelineItem,
  type CommandCenterProjection,
} from "@validade-zero/contracts";
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
          criticalLots: [],
          overdueTasks: [],
          pendingMarkdowns: [],
          pendingProductDrafts: [],
          pendingEvidence: [],
          syncConflicts: [],
          pendingShiftCloses: [],
          shiftHistory: [],
        }),
      );
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
          criticalLots: [],
          overdueTasks: [],
          pendingMarkdowns: [],
          pendingProductDrafts: [],
          pendingEvidence: [],
          syncConflicts: [],
          pendingShiftCloses: [],
          shiftHistory: [],
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

      return CommandCenterProjectionSchema.parse({
        storeId: scope.storeId,
        storeName: scope.storeName,
        refreshedAt: now().toISOString(),
        freshness: "current",
        verdict,
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
        pendingProductDrafts: uniqueBy(
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
        ),
        pendingEvidence: [],
        syncConflicts: conflictEvents.map((event) => ({
          conflictId: metadataText(event, "conflictId") ?? event.eventId,
          label: metadataText(event, "productDisplayName") ?? event.target.label ?? "Acao offline",
          detail: event.reason ?? "Revise a mudanca atual antes de reenviar.",
        })),
        pendingShiftCloses: [],
        shiftHistory: [],
      });
    },
  };
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
