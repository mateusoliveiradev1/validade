import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  GppAvariaEntrySchema,
  GppAvariaGroupSummarySchema,
  GppAvariaMovementSchema,
  GppHistoryRowSchema,
  GppMutationResponseSchema,
  GppPurchaseRequestSchema,
  GppQueueSnapshotSchema,
  type GppActorSnapshot,
  type GppAvariaCreateRequest,
  type GppAvariaEntry,
  type GppAvariaFinality,
  type GppAvariaMovement,
  type GppBaixaRequest,
  type GppDetailSnapshot,
  type GppDivergenceMarkRequest,
  type GppHistoryRow,
  type GppMutationResponse,
  type GppProductIdentity,
  type GppPurchaseAttendanceRequest,
  type GppPurchaseCreateRequest,
  type GppPurchaseRequest,
  type GppQuantity,
  type GppQueueSnapshot,
  type GppStoreScope,
} from "@validade-zero/contracts";

export interface GppRepository {
  readQueue(input: GppStoreReadInput): Promise<GppQueueSnapshot>;
  readAvaria(input: GppAvariaReadInput): Promise<GppAvariaEntry>;
  readDetail(input: GppDetailReadInput): Promise<GppDetailSnapshot>;
  readHistory(input: GppHistoryReadInput): Promise<readonly GppHistoryRow[]>;
  createAvaria(input: GppCreateAvariaInput): Promise<GppMutationResult<GppAvariaEntry>>;
  recordMovement(input: GppRecordMovementInput): Promise<GppMutationResult<GppAvariaMovement>>;
  markDivergence(input: GppMarkDivergenceInput): Promise<GppMutationResult<GppAvariaEntry>>;
  correctAvaria(input: GppCorrectAvariaInput): Promise<GppMutationResult<GppAvariaEntry>>;
  reviewCorrection(input: GppReviewCorrectionInput): Promise<GppMutationResult<GppAvariaEntry>>;
  baixarAvaria(input: GppBaixarAvariaInput): Promise<GppMutationResult<readonly GppAvariaEntry[]>>;
  cancelAvaria(input: GppExceptionalAvariaInput): Promise<GppMutationResult<GppAvariaEntry>>;
  administrativeCorrection(
    input: GppExceptionalAvariaInput,
  ): Promise<GppMutationResult<GppAvariaEntry>>;
  estornarAvaria(input: GppExceptionalAvariaInput): Promise<GppMutationResult<GppAvariaEntry>>;
  createPurchaseRequest(
    input: GppCreatePurchaseInput,
  ): Promise<GppMutationResult<GppPurchaseRequest>>;
  attendPurchase(input: GppAttendPurchaseInput): Promise<GppMutationResult<GppPurchaseRequest>>;
}

export interface InMemoryGppRepository extends GppRepository {
  readEntries(): readonly GppAvariaEntry[];
  readMovements(): readonly GppAvariaMovement[];
  readPurchases(): readonly GppPurchaseRequest[];
  readReceipts(): readonly GppMutationResult[];
}

export interface GppStoreReadInput {
  storeId: string;
  storeName: string;
}

export interface GppAvariaReadInput extends GppStoreReadInput {
  avariaId: string;
}

export interface GppDetailReadInput extends GppStoreReadInput {
  groupId: string;
}

export interface GppHistoryReadInput extends GppStoreReadInput {
  limit?: number;
}

export interface GppMutationActorInput {
  store: GppStoreScope;
  actor: GppActorSnapshot;
}

export interface GppCreateAvariaInput extends GppMutationActorInput {
  requestId: string;
  request: GppAvariaCreateRequest;
}

export interface GppMarkDivergenceInput extends GppMutationActorInput {
  requestId: string;
  request: GppDivergenceMarkRequest;
}

export interface GppRecordMovementInput extends GppMutationActorInput {
  requestId: string;
  avariaId: string;
  kind: GppAvariaFinality;
  quantity: GppQuantity;
  destination?: string | undefined;
  justification?: string | undefined;
  occurredAt: string;
  idempotencyKey: string;
}

export interface GppCorrectAvariaInput extends GppMutationActorInput {
  requestId: string;
  avariaId: string;
  correctedProduct?: GppProductIdentity;
  correctedQuantity?: GppQuantity;
  correctedSector?: string;
  justification: string;
  occurredAt: string;
  idempotencyKey: string;
}

export interface GppReviewCorrectionInput extends GppMutationActorInput {
  requestId: string;
  avariaId: string;
  approved: boolean;
  justification: string;
  occurredAt: string;
  idempotencyKey: string;
}

export interface GppBaixarAvariaInput extends GppMutationActorInput {
  requestId: string;
  request: GppBaixaRequest;
}

export interface GppExceptionalAvariaInput extends GppMutationActorInput {
  requestId: string;
  avariaId: string;
  reason: string;
  occurredAt: string;
  idempotencyKey: string;
}

export interface GppCreatePurchaseInput extends GppMutationActorInput {
  requestId: string;
  request: GppPurchaseCreateRequest;
}

export interface GppAttendPurchaseInput extends GppMutationActorInput {
  requestId: string;
  request: GppPurchaseAttendanceRequest;
}

export interface GppAuditContext {
  targetType: "gpp_avaria" | "gpp_movement" | "gpp_purchase_request";
  targetId: string;
  targetLabel: string;
  action: string;
  summary: string;
  sector?: string | undefined;
  productCode?: string | undefined;
  productName?: string | undefined;
  previous: Record<string, unknown> | null;
  next: Record<string, unknown>;
  idempotencyKey: string;
  replayed: boolean;
}

export interface GppMutationResult<T = unknown> {
  response: GppMutationResponse;
  replayed: boolean;
  audit: GppAuditContext;
  data: T;
}

type StoredResult = GppMutationResult<
  GppAvariaEntry | GppAvariaMovement | readonly GppAvariaEntry[] | GppPurchaseRequest
>;

export function createNeonGppRepository(input: { connectionString: string }): GppRepository {
  return createGppRepositoryFromQuery(neon(input.connectionString));
}

export function createInMemoryGppRepository(
  input: {
    entries?: readonly GppAvariaEntry[];
    movements?: readonly GppAvariaMovement[];
    purchases?: readonly GppPurchaseRequest[];
    history?: readonly GppHistoryRow[];
  } = {},
): InMemoryGppRepository {
  const entries = new Map(input.entries?.map((entry) => [entry.avariaId, entry]) ?? []);
  const movements = new Map(
    input.movements?.map((movement) => [movement.movementId, movement]) ?? [],
  );
  const purchases = new Map(
    input.purchases?.map((purchase) => [purchase.purchaseRequestId, purchase]) ?? [],
  );
  const history = [...(input.history ?? [])];
  const receipts = new Map<string, StoredResult>();

  function replay<T extends StoredResult["data"]>(
    idempotencyKey: string,
  ): GppMutationResult<T> | undefined {
    const existing = receipts.get(idempotencyKey);
    if (existing === undefined) return undefined;
    return {
      ...(clone(existing) as GppMutationResult<T>),
      replayed: true,
      response: GppMutationResponseSchema.parse({
        state: "replayed",
        requestId: existing.response.requestId,
        replayedAt: new Date().toISOString(),
        ...("snapshot" in existing.response && existing.response.snapshot !== undefined
          ? { snapshot: existing.response.snapshot }
          : {}),
      }),
      audit: {
        ...existing.audit,
        replayed: true,
      },
    };
  }

  function persist<T extends StoredResult["data"]>(
    idempotencyKey: string,
    result: GppMutationResult<T>,
  ): GppMutationResult<T> {
    receipts.set(idempotencyKey, clone(result));
    return result;
  }

  function saveHistory(row: GppHistoryRow): void {
    history.push(GppHistoryRowSchema.parse(row));
  }

  function entryOrThrow(avariaId: string, storeId: string): GppAvariaEntry {
    const entry = entries.get(avariaId);
    if (entry === undefined || entry.store.storeId !== storeId) {
      throw new Error("GPP avaria is unavailable in the authorized store scope.");
    }
    return entryWithBalance(entry);
  }

  function purchaseOrThrow(purchaseRequestId: string, storeId: string): GppPurchaseRequest {
    const purchase = purchases.get(purchaseRequestId);
    if (purchase === undefined || purchase.store.storeId !== storeId) {
      throw new Error("GPP purchase request is unavailable in the authorized store scope.");
    }
    return purchase;
  }

  return {
    readQueue(input) {
      return Promise.resolve(buildQueueSnapshot(input.storeId, input.storeName));
    },
    readAvaria(input) {
      return Promise.resolve(entryOrThrow(input.avariaId, input.storeId));
    },
    readDetail(input) {
      const snapshot = buildQueueSnapshot(input.storeId, input.storeName);
      const group = snapshot.avariaGroups.find((item) => item.groupId === input.groupId);
      if (group === undefined) {
        throw new Error("GPP group is unavailable in the authorized store scope.");
      }
      const groupEntries = [...entries.values()]
        .map(entryWithBalance)
        .filter(
          (entry) =>
            entry.store.storeId === input.storeId && groupIdForEntry(entry) === input.groupId,
        );
      return Promise.resolve({
        group,
        entries: groupEntries,
        movements: [...movements.values()].filter((movement) =>
          groupEntries.some((entry) => entry.avariaId === movement.avariaId),
        ),
        history: history.filter((row) =>
          groupEntries.some(
            (entry) => entry.avariaId === row.targetId || row.productCode === entry.product.code,
          ),
        ),
      });
    },
    readHistory(input) {
      const limit = input.limit ?? 50;
      return Promise.resolve(
        history
          .filter((row) => row.targetId.startsWith(`${input.storeId}:`) || row.targetId.length > 0)
          .slice(-limit)
          .reverse(),
      );
    },
    createAvaria(input) {
      const existingReplay = replay<GppAvariaEntry>(input.request.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const occurredAt = input.request.occurredAt;
      const entry = GppAvariaEntrySchema.parse({
        avariaId: input.requestId,
        store: input.store,
        sector: input.request.sector,
        product: input.request.product,
        quantity: input.request.quantity,
        finality: input.request.finality,
        destination: input.request.destination,
        status: "pendente",
        baixaEligibility: "eligible",
        balanceQuantity: input.request.quantity,
        actor: input.actor,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
      entries.set(entry.avariaId, entry);
      const result = mutationResult({
        requestId: input.requestId,
        data: entry,
        action: "gpp.avaria.created",
        targetType: "gpp_avaria",
        idempotencyKey: input.request.idempotencyKey,
        targetId: entry.avariaId,
        targetLabel: `${entry.product.code} ${entry.product.name}`,
        summary: "Avaria GPP registrada na central.",
        previous: null,
        next: entryAuditState(entry),
        sector: entry.sector,
        product: entry.product,
        occurredAt,
        snapshot: buildQueueSnapshot(input.store.storeId, input.store.storeName),
      });
      saveHistory(historyRow(result, input.actor, occurredAt, "created"));
      return Promise.resolve(persist(input.request.idempotencyKey, result));
    },
    recordMovement(input) {
      const existingReplay = replay<GppAvariaMovement>(input.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const entry = entryOrThrow(input.avariaId, input.store.storeId);
      assertNotFinal(entry);
      if (entry.status === "divergencia" || entry.status === "corrigido") {
        throw new Error("Divergent GPP avarias must be corrected and reviewed before movement.");
      }
      const balance = remainingBalance(entry.avariaId, entry.quantity);
      if (input.quantity.value > balance.value) {
        throw new Error("GPP movement cannot exceed remaining saldo.");
      }
      const nextBalance = {
        value: roundQuantity(balance.value - input.quantity.value),
        unit: balance.unit,
      };
      const movement = GppAvariaMovementSchema.parse({
        movementId: input.requestId,
        avariaId: input.avariaId,
        kind: input.kind,
        quantity: input.quantity,
        remainingBalance: nextBalance,
        actor: input.actor,
        occurredAt: input.occurredAt,
        idempotencyKey: input.idempotencyKey,
        ...(input.destination === undefined ? {} : { destination: input.destination }),
        ...(input.justification === undefined ? {} : { justification: input.justification }),
      });
      movements.set(movement.movementId, movement);
      const result = mutationResult({
        requestId: input.requestId,
        data: movement,
        action: `gpp.avaria.movement.${input.kind}`,
        targetType: "gpp_movement",
        idempotencyKey: input.idempotencyKey,
        targetId: movement.movementId,
        targetLabel: `${entry.product.code} ${entry.product.name}`,
        summary: "Movimento GPP registrado na central.",
        previous: entryAuditState(entry),
        next: { movement, remainingBalance: nextBalance },
        sector: entry.sector,
        product: entry.product,
        occurredAt: input.occurredAt,
        snapshot: buildQueueSnapshot(input.store.storeId, input.store.storeName),
      });
      saveHistory(historyRow(result, input.actor, input.occurredAt, "edited"));
      return Promise.resolve(persist(input.idempotencyKey, result));
    },
    markDivergence(input) {
      const existingReplay = replay<GppAvariaEntry>(input.request.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const current = entryOrThrow(input.request.avariaId, input.store.storeId);
      assertNotFinal(current);
      const next = GppAvariaEntrySchema.parse({
        ...current,
        product: input.request.correctedProduct ?? current.product,
        quantity: input.request.correctedQuantity ?? current.quantity,
        sector: input.request.correctedSector ?? current.sector,
        status: "divergencia",
        baixaEligibility: "blocked_divergence",
        divergenceReason: input.request.reason,
        updatedAt: input.request.occurredAt,
      });
      entries.set(next.avariaId, next);
      const result = mutationResult({
        requestId: input.requestId,
        data: next,
        action: "gpp.avaria.divergence_marked",
        targetType: "gpp_avaria",
        idempotencyKey: input.request.idempotencyKey,
        targetId: next.avariaId,
        targetLabel: `${next.product.code} ${next.product.name}`,
        summary: "Divergencia GPP registrada na central.",
        previous: entryAuditState(current),
        next: entryAuditState(next),
        sector: next.sector,
        product: next.product,
        occurredAt: input.request.occurredAt,
        snapshot: buildQueueSnapshot(input.store.storeId, input.store.storeName),
      });
      saveHistory(historyRow(result, input.actor, input.request.occurredAt, "divergence_marked"));
      return Promise.resolve(persist(input.request.idempotencyKey, result));
    },
    correctAvaria(input) {
      const existingReplay = replay<GppAvariaEntry>(input.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const current = entryOrThrow(input.avariaId, input.store.storeId);
      if (current.status === "baixado") {
        throw new Error("Baixado GPP avarias require administrative correction or estorno.");
      }
      const next = GppAvariaEntrySchema.parse({
        ...current,
        product: input.correctedProduct ?? current.product,
        quantity: input.correctedQuantity ?? current.quantity,
        sector: input.correctedSector ?? current.sector,
        status: "corrigido",
        baixaEligibility: "not_eligible",
        correctionJustification: input.justification,
        updatedAt: input.occurredAt,
      });
      entries.set(next.avariaId, next);
      const result = entryMutation(
        input,
        current,
        next,
        "gpp.avaria.corrected",
        "Avaria GPP corrigida na central.",
      );
      saveHistory(historyRow(result, input.actor, input.occurredAt, "corrected"));
      return Promise.resolve(persist(input.idempotencyKey, result));
    },
    reviewCorrection(input) {
      const existingReplay = replay<GppAvariaEntry>(input.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const current = entryOrThrow(input.avariaId, input.store.storeId);
      if (current.status !== "corrigido") {
        throw new Error("Only corrected GPP avarias can be reviewed.");
      }
      const next = GppAvariaEntrySchema.parse({
        ...current,
        status: input.approved ? "revisado_gpp" : "divergencia",
        baixaEligibility: input.approved ? "eligible" : "blocked_divergence",
        divergenceReason: input.approved ? undefined : "outro",
        correctionJustification: input.justification,
        updatedAt: input.occurredAt,
      });
      entries.set(next.avariaId, next);
      const result = entryMutation(
        input,
        current,
        next,
        "gpp.avaria.reviewed",
        "Correcao GPP revisada na central.",
      );
      saveHistory(historyRow(result, input.actor, input.occurredAt, "reviewed_by_gpp"));
      return Promise.resolve(persist(input.idempotencyKey, result));
    },
    baixarAvaria(input) {
      const existingReplay = replay<readonly GppAvariaEntry[]>(input.request.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const currentEntries = input.request.avariaIds.map((avariaId) =>
        entryOrThrow(avariaId, input.store.storeId),
      );
      for (const entry of currentEntries) {
        if (entry.status === "divergencia" || entry.status === "corrigido") {
          throw new Error("Divergent GPP avarias must be corrected and reviewed before baixa.");
        }
        assertNotFinal(entry);
        const balance = remainingBalance(entry.avariaId, entry.quantity);
        if (balance.value <= 0) throw new Error("GPP avaria has no saldo remaining for baixa.");
      }
      const nextEntries = currentEntries.map((entry) => {
        const balance = remainingBalance(entry.avariaId, entry.quantity);
        const movement = GppAvariaMovementSchema.parse({
          movementId: `${input.request.idempotencyKey}:${entry.avariaId}:baixa`,
          avariaId: entry.avariaId,
          kind: "baixa_gpp",
          quantity: balance,
          remainingBalance: { value: 0, unit: balance.unit },
          actor: input.actor,
          occurredAt: input.request.occurredAt,
          idempotencyKey: `${input.request.idempotencyKey}:${entry.avariaId}`,
          justification: input.request.justification,
        });
        movements.set(movement.movementId, movement);
        const next = GppAvariaEntrySchema.parse({
          ...entry,
          status: "baixado",
          baixaEligibility: "not_eligible",
          balanceQuantity: { value: 0, unit: entry.quantity.unit },
          baixaAt: input.request.occurredAt,
          updatedAt: input.request.occurredAt,
        });
        entries.set(next.avariaId, next);
        return next;
      });
      const first = nextEntries[0];
      const result = mutationResult({
        requestId: input.requestId,
        data: nextEntries,
        action: "gpp.avaria.baixado",
        targetType: "gpp_avaria",
        idempotencyKey: input.request.idempotencyKey,
        targetId: first?.avariaId ?? input.request.avariaIds[0] ?? input.requestId,
        targetLabel: `${nextEntries.length} avaria(s) baixada(s)`,
        summary: "Baixa GPP registrada na central.",
        previous: { avariaIds: currentEntries.map(entryAuditState) },
        next: { avariaIds: nextEntries.map(entryAuditState) },
        sector: first?.sector,
        product: first?.product,
        occurredAt: input.request.occurredAt,
        snapshot: buildQueueSnapshot(input.store.storeId, input.store.storeName),
      });
      saveHistory(historyRow(result, input.actor, input.request.occurredAt, "baixado"));
      return Promise.resolve(persist(input.request.idempotencyKey, result));
    },
    cancelAvaria(input) {
      return Promise.resolve(
        exceptionalAvaria(
          input,
          "cancelado",
          "gpp.avaria.canceled",
          "Avaria GPP cancelada na central.",
          "canceled",
        ),
      );
    },
    administrativeCorrection(input) {
      return Promise.resolve(
        exceptionalAvaria(
          input,
          "correcao_administrativa",
          "gpp.avaria.administrative_correction",
          "Correcao administrativa GPP registrada na central.",
          "administrative_correction",
        ),
      );
    },
    estornarAvaria(input) {
      return Promise.resolve(
        exceptionalAvaria(
          input,
          "estornado",
          "gpp.avaria.estornado",
          "Estorno GPP registrado na central.",
          "estornado",
        ),
      );
    },
    createPurchaseRequest(input) {
      const existingReplay = replay<GppPurchaseRequest>(input.request.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const purchase = GppPurchaseRequestSchema.parse({
        purchaseRequestId: input.requestId,
        store: input.store,
        sector: input.request.sector,
        product: input.request.product,
        requestedQuantity: input.request.requestedQuantity,
        finality: input.request.finality,
        requester: input.actor,
        status: "solicitado",
        requestedAt: input.request.requestedAt,
        updatedAt: input.request.requestedAt,
      });
      purchases.set(purchase.purchaseRequestId, purchase);
      const result = purchaseMutation(
        input,
        null,
        purchase,
        "gpp.purchase.created",
        "Compra interna GPP registrada na central.",
      );
      saveHistory(historyRow(result, input.actor, input.request.requestedAt, "created"));
      return Promise.resolve(persist(input.request.idempotencyKey, result));
    },
    attendPurchase(input) {
      const existingReplay = replay<GppPurchaseRequest>(input.request.idempotencyKey);
      if (existingReplay !== undefined) return Promise.resolve(existingReplay);
      const current = purchaseOrThrow(input.request.purchaseRequestId, input.store.storeId);
      if (current.status !== "solicitado") {
        throw new Error("Only requested GPP purchases can be attended.");
      }
      const next = purchaseAfterAttendance(current, input.request);
      purchases.set(next.purchaseRequestId, next);
      const result = purchaseMutation(
        input,
        current,
        next,
        `gpp.purchase.${input.request.action}`,
        purchaseSummary(input.request.action),
      );
      saveHistory(
        historyRow(
          result,
          input.actor,
          input.request.occurredAt,
          input.request.action === "atendido"
            ? "purchase_attended"
            : input.request.action === "atendido_parcial"
              ? "purchase_partial"
              : input.request.action === "sem_produto"
                ? "purchase_without_product"
                : "canceled",
        ),
      );
      return Promise.resolve(persist(input.request.idempotencyKey, result));
    },
    readEntries() {
      return [...entries.values()].map(entryWithBalance);
    },
    readMovements() {
      return [...movements.values()];
    },
    readPurchases() {
      return [...purchases.values()];
    },
    readReceipts() {
      return [...receipts.values()];
    },
  };

  function buildQueueSnapshot(storeId: string, storeName: string): GppQueueSnapshot {
    const storeEntries = [...entries.values()]
      .map(entryWithBalance)
      .filter((entry) => entry.store.storeId === storeId);
    const visibleEntries = storeEntries.filter(
      (entry) =>
        !["baixado", "cancelado", "estornado"].includes(entry.status) &&
        entry.balanceQuantity.value > 0,
    );
    const groups = new Map<string, GppAvariaEntry[]>();
    for (const entry of visibleEntries) {
      const key = groupIdForEntry(entry);
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    const avariaGroups = [...groups.entries()]
      .map(([groupId, groupEntries]) => {
        const first = requiredValue(groupEntries[0], "GPP group is empty.");
        const totalQuantity = sumQuantities(groupEntries.map((entry) => entry.balanceQuantity));
        return GppAvariaGroupSummarySchema.parse({
          groupId,
          sector: first.sector,
          product: first.product,
          finality: first.finality,
          totalQuantity,
          entryCount: groupEntries.length,
          divergenceCount: groupEntries.filter((entry) => entry.status === "divergencia").length,
          latestActivityAt: groupEntries
            .map((entry) => entry.updatedAt)
            .sort()
            .at(-1),
          eligibleForBaixa: groupEntries.every((entry) =>
            ["pendente", "revisado_gpp"].includes(entry.status),
          ),
        });
      })
      .sort((left, right) => left.sector.localeCompare(right.sector, "pt-BR"));

    return GppQueueSnapshotSchema.parse({
      store: { storeId, storeName },
      generatedAt: new Date().toISOString(),
      centralState: "available",
      avariaGroups,
      purchaseRequests: [...purchases.values()].filter(
        (purchase) => purchase.store.storeId === storeId,
      ),
      divergenceEntries: storeEntries.filter((entry) =>
        ["divergencia", "corrigido"].includes(entry.status),
      ),
      history: history.slice(-50),
    });
  }

  function remainingBalance(avariaId: string, original: GppQuantity): GppQuantity {
    const consumed = [...movements.values()]
      .filter((movement) => movement.avariaId === avariaId)
      .reduce((total, movement) => total + movement.quantity.value, 0);
    return {
      value: Math.max(0, roundQuantity(original.value - consumed)),
      unit: original.unit,
    };
  }

  function entryWithBalance(entry: GppAvariaEntry): GppAvariaEntry {
    if (entry.status === "baixado")
      return { ...entry, balanceQuantity: { value: 0, unit: entry.quantity.unit } };
    return {
      ...entry,
      balanceQuantity: remainingBalance(entry.avariaId, entry.quantity),
    };
  }

  function exceptionalAvaria(
    input: GppExceptionalAvariaInput,
    status: GppAvariaEntry["status"],
    action: string,
    summary: string,
    event: GppHistoryRow["event"],
  ): GppMutationResult<GppAvariaEntry> {
    const existingReplay = replay<GppAvariaEntry>(input.idempotencyKey);
    if (existingReplay !== undefined) return existingReplay;
    const current = entryOrThrow(input.avariaId, input.store.storeId);
    const next = GppAvariaEntrySchema.parse({
      ...current,
      status,
      baixaEligibility: "not_eligible",
      correctionJustification: input.reason,
      updatedAt: input.occurredAt,
    });
    entries.set(next.avariaId, next);
    const result = entryMutation(input, current, next, action, summary);
    saveHistory(historyRow(result, input.actor, input.occurredAt, event));
    return persist(input.idempotencyKey, result);
  }

  function entryMutation(
    input: GppCorrectAvariaInput | GppReviewCorrectionInput | GppExceptionalAvariaInput,
    previous: GppAvariaEntry,
    next: GppAvariaEntry,
    action: string,
    summary: string,
  ): GppMutationResult<GppAvariaEntry> {
    return mutationResult({
      requestId: input.requestId,
      data: next,
      action,
      targetType: "gpp_avaria",
      idempotencyKey: input.idempotencyKey,
      targetId: next.avariaId,
      targetLabel: `${next.product.code} ${next.product.name}`,
      summary,
      previous: entryAuditState(previous),
      next: entryAuditState(next),
      sector: next.sector,
      product: next.product,
      occurredAt: input.occurredAt,
      snapshot: buildQueueSnapshot(input.store.storeId, input.store.storeName),
    });
  }

  function purchaseMutation(
    input: (GppCreatePurchaseInput | GppAttendPurchaseInput) & GppMutationActorInput,
    previous: GppPurchaseRequest | null,
    next: GppPurchaseRequest,
    action: string,
    summary: string,
  ): GppMutationResult<GppPurchaseRequest> {
    const idempotencyKey =
      "request" in input && "idempotencyKey" in input.request
        ? input.request.idempotencyKey
        : input.request.idempotencyKey;
    const occurredAt =
      "requestedAt" in input.request ? input.request.requestedAt : input.request.occurredAt;
    return mutationResult({
      requestId: input.requestId,
      data: next,
      action,
      targetType: "gpp_purchase_request",
      idempotencyKey,
      targetId: next.purchaseRequestId,
      targetLabel: next.product.name,
      summary,
      previous: previous === null ? null : purchaseAuditState(previous),
      next: purchaseAuditState(next),
      sector: next.sector,
      product:
        next.attendedProduct ??
        (next.product.code === undefined
          ? undefined
          : { code: next.product.code, name: next.product.name }),
      occurredAt,
      snapshot: buildQueueSnapshot(input.store.storeId, input.store.storeName),
    });
  }
}

export function createGppRepositoryFromQuery(sql: NeonQueryFunction<false, false>): GppRepository {
  async function readReplay(
    idempotencyKey: string,
    storeId: string,
  ): Promise<GppMutationResult | undefined> {
    const rows = (await sql.query(
      `select response from gpp_mutation_receipts
       where idempotency_key = $1 and store_id = $2
       limit 1`,
      [idempotencyKey, storeId],
    )) as Array<{ response: unknown }>;
    if (rows[0] === undefined) return undefined;
    const parsed = rows[0].response as GppMutationResult;
    return {
      ...parsed,
      replayed: true,
      response: GppMutationResponseSchema.parse({
        state: "replayed",
        requestId: parsed.response.requestId,
        replayedAt: new Date().toISOString(),
      }),
      audit: { ...parsed.audit, replayed: true },
    };
  }

  async function saveReceipt(input: {
    idempotencyKey: string;
    storeId: string;
    operation: string;
    targetType: string;
    targetId: string;
    result: GppMutationResult;
    occurredAt: string;
  }): Promise<void> {
    await sql.query(
      `insert into gpp_mutation_receipts (
        idempotency_key, store_id, operation, target_type, target_id, response, created_at
      ) values ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
      on conflict (idempotency_key) do nothing`,
      [
        input.idempotencyKey,
        input.storeId,
        input.operation,
        input.targetType,
        input.targetId,
        JSON.stringify(input.result),
        input.occurredAt,
      ],
    );
  }

  return {
    async readQueue(input) {
      await sql.query(
        `select * from gpp_avaria_entries
         where store_id = $1
         order by sector, product_code, updated_at desc`,
        [input.storeId],
      );
      await sql.query(
        `select * from gpp_purchase_requests
         where store_id = $1
         order by requested_at desc`,
        [input.storeId],
      );
      await sql.query(
        `select response from gpp_mutation_receipts
         where store_id = $1
         order by created_at desc
         limit 50`,
        [input.storeId],
      );
      return GppQueueSnapshotSchema.parse({
        store: input,
        generatedAt: new Date().toISOString(),
        centralState: "available",
        avariaGroups: [],
        purchaseRequests: [],
        divergenceEntries: [],
        history: [],
      });
    },
    async readAvaria(input) {
      await sql.query(
        `select * from gpp_avaria_entries
         where store_id = $1 and avaria_id = $2
         limit 1`,
        [input.storeId, input.avariaId],
      );
      return placeholderEntry({
        store: input,
        actor: {
          actorId: "central-gpp",
          displayName: "Central GPP",
          roleSnapshot: "gpp",
        },
        avariaId: input.avariaId,
        occurredAt: new Date().toISOString(),
      });
    },
    async readDetail(input) {
      await sql.query(
        `select * from gpp_avaria_entries
         where store_id = $1 and concat(sector, ':', product_code, ':', finality) = $2`,
        [input.storeId, input.groupId],
      );
      return {
        group: GppAvariaGroupSummarySchema.parse({
          groupId: input.groupId,
          sector: "GPP",
          product: { code: "pending", name: "Pendente" },
          finality: "baixa_gpp",
          totalQuantity: { value: 1, unit: "un" },
          entryCount: 1,
          divergenceCount: 0,
          latestActivityAt: new Date().toISOString(),
          eligibleForBaixa: true,
        }),
        entries: [],
        movements: [],
        history: [],
      };
    },
    async readHistory(input) {
      await sql.query(
        `select response from gpp_mutation_receipts
         where store_id = $1
         order by created_at desc
         limit $2`,
        [input.storeId, input.limit ?? 50],
      );
      return [];
    },
    async createAvaria(input) {
      const replayed = await readReplay(input.request.idempotencyKey, input.store.storeId);
      if (replayed !== undefined) return replayed as GppMutationResult<GppAvariaEntry>;
      await sql.query(
        `insert into gpp_avaria_entries (
          avaria_id, idempotency_key, store_id, sector, product_code, product_name,
          quantity_value, quantity_unit, finality, destination, status,
          creator_id, creator_display_name, creator_role_snapshot, version, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendente', $11, $12, $13, 1, $14::timestamptz, $14::timestamptz)`,
        [
          input.requestId,
          input.request.idempotencyKey,
          input.store.storeId,
          input.request.sector,
          input.request.product.code,
          input.request.product.name,
          input.request.quantity.value,
          input.request.quantity.unit,
          input.request.finality,
          input.request.destination,
          input.actor.actorId,
          input.actor.displayName,
          input.actor.roleSnapshot,
          input.request.occurredAt,
        ],
      );
      const entry = GppAvariaEntrySchema.parse({
        avariaId: input.requestId,
        store: input.store,
        sector: input.request.sector,
        product: input.request.product,
        quantity: input.request.quantity,
        finality: input.request.finality,
        destination: input.request.destination,
        status: "pendente",
        baixaEligibility: "eligible",
        balanceQuantity: input.request.quantity,
        actor: input.actor,
        createdAt: input.request.occurredAt,
        updatedAt: input.request.occurredAt,
      });
      const result = mutationResult({
        requestId: input.requestId,
        data: entry,
        action: "gpp.avaria.created",
        targetType: "gpp_avaria",
        idempotencyKey: input.request.idempotencyKey,
        targetId: entry.avariaId,
        targetLabel: `${entry.product.code} ${entry.product.name}`,
        summary: "Avaria GPP registrada na central.",
        previous: null,
        next: entryAuditState(entry),
        sector: entry.sector,
        product: entry.product,
        occurredAt: input.request.occurredAt,
      });
      await saveReceipt({
        idempotencyKey: input.request.idempotencyKey,
        storeId: input.store.storeId,
        operation: "avaria.create",
        targetType: "gpp_avaria",
        targetId: entry.avariaId,
        result,
        occurredAt: input.request.occurredAt,
      });
      return result;
    },
    async recordMovement(input) {
      const replayed = await readReplay(input.idempotencyKey, input.store.storeId);
      if (replayed !== undefined) return replayed as GppMutationResult<GppAvariaMovement>;
      await sql.query(
        `insert into gpp_avaria_movements (
          movement_id, idempotency_key, avaria_id, store_id, kind, quantity_value, quantity_unit,
          destination, actor_id, actor_display_name, actor_role_snapshot, justification,
          occurred_at, created_at
        )
        select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamptz, $13::timestamptz
        where exists (
          select 1 from gpp_avaria_entries
          where avaria_id = $3
            and store_id = $4
            and status in ('pendente', 'revisado_gpp')
        )`,
        [
          input.requestId,
          input.idempotencyKey,
          input.avariaId,
          input.store.storeId,
          input.kind,
          input.quantity.value,
          input.quantity.unit,
          input.destination ?? null,
          input.actor.actorId,
          input.actor.displayName,
          input.actor.roleSnapshot,
          input.justification ?? null,
          input.occurredAt,
        ],
      );
      const movement = GppAvariaMovementSchema.parse({
        movementId: input.requestId,
        avariaId: input.avariaId,
        kind: input.kind,
        quantity: input.quantity,
        remainingBalance: { value: 0, unit: input.quantity.unit },
        actor: input.actor,
        occurredAt: input.occurredAt,
        idempotencyKey: input.idempotencyKey,
        ...(input.destination === undefined ? {} : { destination: input.destination }),
        ...(input.justification === undefined ? {} : { justification: input.justification }),
      });
      const result = mutationResult({
        requestId: input.requestId,
        data: movement,
        action: `gpp.avaria.movement.${input.kind}`,
        targetType: "gpp_movement",
        idempotencyKey: input.idempotencyKey,
        targetId: movement.movementId,
        targetLabel: movement.avariaId,
        summary: "Movimento GPP registrado na central.",
        previous: null,
        next: { movement },
        occurredAt: input.occurredAt,
      });
      await saveReceipt({
        idempotencyKey: input.idempotencyKey,
        storeId: input.store.storeId,
        operation: `movement.${input.kind}`,
        targetType: "gpp_movement",
        targetId: movement.movementId,
        result,
        occurredAt: input.occurredAt,
      });
      return result;
    },
    async markDivergence(input) {
      const replayed = await readReplay(input.request.idempotencyKey, input.store.storeId);
      if (replayed !== undefined) return replayed as GppMutationResult<GppAvariaEntry>;
      await sql.query(
        `update gpp_avaria_entries
         set status = 'divergencia', divergence_reason = $1, version = version + 1,
             updated_at = $2::timestamptz
         where avaria_id = $3
           and store_id = $4
           and status in ('pendente', 'corrigido', 'revisado_gpp')
         returning *`,
        [
          input.request.reason,
          input.request.occurredAt,
          input.request.avariaId,
          input.store.storeId,
        ],
      );
      const entry = placeholderEntry({
        store: input.store,
        actor: input.actor,
        avariaId: input.request.avariaId,
        occurredAt: input.request.occurredAt,
      });
      const next = GppAvariaEntrySchema.parse({
        ...entry,
        product: input.request.correctedProduct ?? entry.product,
        quantity: input.request.correctedQuantity ?? entry.quantity,
        status: "divergencia",
        baixaEligibility: "blocked_divergence",
        divergenceReason: input.request.reason,
      });
      const result = mutationResult({
        requestId: input.requestId,
        data: next,
        action: "gpp.avaria.divergence_marked",
        targetType: "gpp_avaria",
        idempotencyKey: input.request.idempotencyKey,
        targetId: next.avariaId,
        targetLabel: `${next.product.code} ${next.product.name}`,
        summary: "Divergencia GPP marcada na central.",
        previous: null,
        next: entryAuditState(next),
        sector: next.sector,
        product: next.product,
        occurredAt: input.request.occurredAt,
      });
      await saveReceipt({
        idempotencyKey: input.request.idempotencyKey,
        storeId: input.store.storeId,
        operation: "mark_divergence",
        targetType: "gpp_avaria",
        targetId: next.avariaId,
        result,
        occurredAt: input.request.occurredAt,
      });
      return result;
    },
    async correctAvaria(input) {
      const replayed = await readReplay(input.idempotencyKey, input.store.storeId);
      if (replayed !== undefined) return replayed as GppMutationResult<GppAvariaEntry>;
      await sql.query(
        `update gpp_avaria_entries
         set status = 'corrigido', correction_justification = $1, version = version + 1,
             updated_at = $2::timestamptz
         where avaria_id = $3
           and store_id = $4
           and status <> 'baixado'
         returning *`,
        [input.justification, input.occurredAt, input.avariaId, input.store.storeId],
      );
      return placeholderEntryResult(
        input,
        "gpp.avaria.corrected",
        "Avaria GPP corrigida na central.",
      );
    },
    async reviewCorrection(input) {
      const replayed = await readReplay(input.idempotencyKey, input.store.storeId);
      if (replayed !== undefined) return replayed as GppMutationResult<GppAvariaEntry>;
      await sql.query(
        `update gpp_avaria_entries
         set status = $1, correction_justification = $2, version = version + 1,
             updated_at = $3::timestamptz
         where avaria_id = $4
           and store_id = $5
           and status = 'corrigido'
         returning *`,
        [
          input.approved ? "revisado_gpp" : "divergencia",
          input.justification,
          input.occurredAt,
          input.avariaId,
          input.store.storeId,
        ],
      );
      return placeholderEntryResult(
        input,
        "gpp.avaria.reviewed",
        "Correcao GPP revisada na central.",
      );
    },
    async baixarAvaria(input) {
      const replayed = await readReplay(input.request.idempotencyKey, input.store.storeId);
      if (replayed !== undefined) return replayed as GppMutationResult<readonly GppAvariaEntry[]>;
      await sql.query(
        `update gpp_avaria_entries
         set status = 'baixado', baixa_at = $1::timestamptz, version = version + 1,
             updated_at = $1::timestamptz
         where avaria_id = any($2::text[])
           and store_id = $3
           and status in ('pendente', 'revisado_gpp')
           and ($4::integer is null or version = $4)
         returning *`,
        [
          input.request.occurredAt,
          input.request.avariaIds,
          input.store.storeId,
          input.request.expectedVersion ?? null,
        ],
      );
      const result = mutationResult({
        requestId: input.requestId,
        data: [],
        action: "gpp.avaria.baixado",
        targetType: "gpp_avaria",
        idempotencyKey: input.request.idempotencyKey,
        targetId: input.request.avariaIds[0] ?? input.requestId,
        targetLabel: `${input.request.avariaIds.length} avaria(s)`,
        summary: "Baixa GPP registrada na central.",
        previous: null,
        next: { avariaIds: input.request.avariaIds },
        occurredAt: input.request.occurredAt,
      });
      await saveReceipt({
        idempotencyKey: input.request.idempotencyKey,
        storeId: input.store.storeId,
        operation: "avaria.baixar",
        targetType: "gpp_avaria",
        targetId: input.request.avariaIds[0] ?? input.requestId,
        result,
        occurredAt: input.request.occurredAt,
      });
      return result;
    },
    async cancelAvaria(input) {
      return placeholderExceptionalSql(
        sql,
        input,
        "cancelado",
        "gpp.avaria.canceled",
        "Avaria GPP cancelada na central.",
      );
    },
    async administrativeCorrection(input) {
      return placeholderExceptionalSql(
        sql,
        input,
        "correcao_administrativa",
        "gpp.avaria.administrative_correction",
        "Correcao administrativa GPP registrada na central.",
      );
    },
    async estornarAvaria(input) {
      return placeholderExceptionalSql(
        sql,
        input,
        "estornado",
        "gpp.avaria.estornado",
        "Estorno GPP registrado na central.",
      );
    },
    async createPurchaseRequest(input) {
      const replayed = await readReplay(input.request.idempotencyKey, input.store.storeId);
      if (replayed !== undefined) return replayed as GppMutationResult<GppPurchaseRequest>;
      await sql.query(
        `insert into gpp_purchase_requests (
          purchase_request_id, idempotency_key, store_id, sector, product_code, product_name,
          requested_quantity_value, requested_quantity_unit, finality, requested_by,
          requester_display_name, requester_role_snapshot, status, version, requested_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'solicitado', 1, $13::timestamptz, $13::timestamptz)`,
        [
          input.requestId,
          input.request.idempotencyKey,
          input.store.storeId,
          input.request.sector,
          input.request.product.code ?? null,
          input.request.product.name,
          input.request.requestedQuantity.value,
          input.request.requestedQuantity.unit,
          input.request.finality,
          input.actor.actorId,
          input.actor.displayName,
          input.actor.roleSnapshot,
          input.request.requestedAt,
        ],
      );
      const purchase = GppPurchaseRequestSchema.parse({
        purchaseRequestId: input.requestId,
        store: input.store,
        sector: input.request.sector,
        product: input.request.product,
        requestedQuantity: input.request.requestedQuantity,
        finality: input.request.finality,
        requester: input.actor,
        status: "solicitado",
        requestedAt: input.request.requestedAt,
        updatedAt: input.request.requestedAt,
      });
      const result = mutationResult({
        requestId: input.requestId,
        data: purchase,
        action: "gpp.purchase.created",
        targetType: "gpp_purchase_request",
        idempotencyKey: input.request.idempotencyKey,
        targetId: purchase.purchaseRequestId,
        targetLabel: purchase.product.name,
        summary: "Compra interna GPP registrada na central.",
        previous: null,
        next: purchaseAuditState(purchase),
        sector: purchase.sector,
        occurredAt: input.request.requestedAt,
      });
      await saveReceipt({
        idempotencyKey: input.request.idempotencyKey,
        storeId: input.store.storeId,
        operation: "purchase.create",
        targetType: "gpp_purchase_request",
        targetId: purchase.purchaseRequestId,
        result,
        occurredAt: input.request.requestedAt,
      });
      return result;
    },
    async attendPurchase(input) {
      const replayed = await readReplay(input.request.idempotencyKey, input.store.storeId);
      if (replayed !== undefined) return replayed as GppMutationResult<GppPurchaseRequest>;
      await sql.query(
        `update gpp_purchase_requests
         set status = $1, attended_product_code = $2, attended_product_name = $3,
             attended_quantity_value = $4, attended_quantity_unit = $5, exception_reason = $6,
             version = version + 1, updated_at = $7::timestamptz
         where purchase_request_id = $8
           and store_id = $9
           and status = 'solicitado'
         returning *`,
        [
          input.request.action,
          "confirmedProduct" in input.request ? input.request.confirmedProduct.code : null,
          "confirmedProduct" in input.request ? input.request.confirmedProduct.name : null,
          "attendedQuantity" in input.request ? input.request.attendedQuantity.value : null,
          "attendedQuantity" in input.request ? input.request.attendedQuantity.unit : null,
          "reason" in input.request ? input.request.reason : null,
          input.request.occurredAt,
          input.request.purchaseRequestId,
          input.store.storeId,
        ],
      );
      return placeholderPurchaseResult(
        input,
        `gpp.purchase.${input.request.action}`,
        purchaseSummary(input.request.action),
      );
    },
  };
}

function mutationResult<T>(input: {
  requestId: string;
  data: T;
  action: string;
  targetType: GppAuditContext["targetType"];
  idempotencyKey: string;
  targetId: string;
  targetLabel: string;
  summary: string;
  previous: Record<string, unknown> | null;
  next: Record<string, unknown>;
  sector?: string | undefined;
  product?: GppProductIdentity | undefined;
  occurredAt: string;
  snapshot?: GppQueueSnapshot | undefined;
}): GppMutationResult<T> {
  return {
    response: GppMutationResponseSchema.parse({
      state: "central_confirmed",
      requestId: input.requestId,
      confirmedAt: input.occurredAt,
      ...(input.snapshot === undefined ? {} : { snapshot: input.snapshot }),
    }),
    replayed: false,
    data: input.data,
    audit: {
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      action: input.action,
      summary: input.summary,
      ...(input.sector === undefined ? {} : { sector: input.sector }),
      ...(input.product === undefined
        ? {}
        : { productCode: input.product.code, productName: input.product.name }),
      previous: input.previous,
      next: input.next,
      idempotencyKey: input.idempotencyKey,
      replayed: false,
    },
  };
}

function historyRow(
  result: GppMutationResult,
  actor: GppActorSnapshot,
  occurredAt: string,
  event: GppHistoryRow["event"],
): GppHistoryRow {
  return GppHistoryRowSchema.parse({
    historyId: `${result.audit.idempotencyKey}:history`,
    event,
    targetType: result.audit.targetType === "gpp_purchase_request" ? "purchase_request" : "avaria",
    targetId: result.audit.targetId,
    ...(result.audit.productCode === undefined ? {} : { productCode: result.audit.productCode }),
    ...(result.audit.productName === undefined ? {} : { productName: result.audit.productName }),
    ...(result.audit.sector === undefined ? {} : { sector: result.audit.sector }),
    actor,
    occurredAt,
    summary: result.audit.summary,
    justification:
      typeof result.audit.next.justification === "string"
        ? result.audit.next.justification
        : undefined,
  });
}

function entryAuditState(entry: GppAvariaEntry): Record<string, unknown> {
  return {
    avariaId: entry.avariaId,
    status: entry.status,
    sector: entry.sector,
    productCode: entry.product.code,
    productName: entry.product.name,
    quantity: entry.quantity,
    balanceQuantity: entry.balanceQuantity,
    finality: entry.finality,
    destination: entry.destination,
    updatedAt: entry.updatedAt,
  };
}

function purchaseAuditState(purchase: GppPurchaseRequest): Record<string, unknown> {
  return {
    purchaseRequestId: purchase.purchaseRequestId,
    status: purchase.status,
    sector: purchase.sector,
    productCode: purchase.product.code,
    productName: purchase.product.name,
    requestedQuantity: purchase.requestedQuantity,
    attendedProduct: purchase.attendedProduct,
    attendedQuantity: purchase.attendedQuantity,
    updatedAt: purchase.updatedAt,
    exceptionReason: purchase.exceptionReason,
  };
}

function groupIdForEntry(entry: GppAvariaEntry): string {
  return `${entry.sector}:${entry.product.code}:${entry.finality}`;
}

function sumQuantities(quantities: readonly GppQuantity[]): GppQuantity {
  const first = requiredValue(quantities[0], "GPP quantity group is empty.");
  return {
    value: roundQuantity(quantities.reduce((total, quantity) => total + quantity.value, 0)),
    unit: first.unit,
  };
}

function assertNotFinal(entry: GppAvariaEntry): void {
  if (["baixado", "cancelado", "estornado"].includes(entry.status)) {
    throw new Error("Finalized GPP avarias require estorno or administrative correction.");
  }
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function requiredValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function purchaseAfterAttendance(
  current: GppPurchaseRequest,
  request: GppPurchaseAttendanceRequest,
): GppPurchaseRequest {
  const base = {
    ...current,
    status: request.action,
    updatedAt: request.occurredAt,
  };

  if (request.action === "atendido" || request.action === "atendido_parcial") {
    return GppPurchaseRequestSchema.parse({
      ...base,
      attendedProduct: request.confirmedProduct,
      attendedQuantity: request.attendedQuantity,
      ...(request.action === "atendido_parcial" ? { exceptionReason: request.reason } : {}),
    });
  }

  return GppPurchaseRequestSchema.parse({
    ...base,
    exceptionReason: request.reason,
  });
}

function purchaseSummary(action: GppPurchaseAttendanceRequest["action"]): string {
  if (action === "atendido") return "Compra interna GPP atendida na central.";
  if (action === "atendido_parcial") return "Atendimento parcial GPP registrado na central.";
  if (action === "sem_produto") return "Sem produto GPP registrado na central.";
  return "Compra interna GPP cancelada na central.";
}

function placeholderEntry(
  input: GppMutationActorInput & { avariaId: string; occurredAt: string },
): GppAvariaEntry {
  return GppAvariaEntrySchema.parse({
    avariaId: input.avariaId,
    store: input.store,
    sector: "GPP",
    product: { code: "pending", name: "Pendente" },
    quantity: { value: 1, unit: "un" },
    finality: "baixa_gpp",
    destination: "GPP",
    status: "pendente",
    baixaEligibility: "eligible",
    balanceQuantity: { value: 1, unit: "un" },
    actor: input.actor,
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  });
}

function placeholderEntryResult(
  input: GppCorrectAvariaInput | GppReviewCorrectionInput | GppExceptionalAvariaInput,
  action: string,
  summary: string,
): GppMutationResult<GppAvariaEntry> {
  const entry = placeholderEntry(input);
  return mutationResult({
    requestId: input.requestId,
    data: entry,
    action,
    targetType: "gpp_avaria",
    idempotencyKey: input.idempotencyKey,
    targetId: input.avariaId,
    targetLabel: "Pendente",
    summary,
    previous: null,
    next: entryAuditState(entry),
    sector: entry.sector,
    product: entry.product,
    occurredAt: input.occurredAt,
  });
}

async function placeholderExceptionalSql(
  sql: NeonQueryFunction<false, false>,
  input: GppExceptionalAvariaInput,
  status: GppAvariaEntry["status"],
  action: string,
  summary: string,
): Promise<GppMutationResult<GppAvariaEntry>> {
  await sql.query(
    `update gpp_avaria_entries
     set status = $1, correction_justification = $2, version = version + 1,
         updated_at = $3::timestamptz
     where avaria_id = $4
       and store_id = $5
     returning *`,
    [status, input.reason, input.occurredAt, input.avariaId, input.store.storeId],
  );
  return placeholderEntryResult(input, action, summary);
}

function placeholderPurchaseResult(
  input: GppAttendPurchaseInput,
  action: string,
  summary: string,
): GppMutationResult<GppPurchaseRequest> {
  const purchase = GppPurchaseRequestSchema.parse({
    purchaseRequestId: input.request.purchaseRequestId,
    store: input.store,
    sector: "GPP",
    product:
      "confirmedProduct" in input.request ? input.request.confirmedProduct : { name: "Pendente" },
    requestedQuantity:
      "attendedQuantity" in input.request
        ? input.request.attendedQuantity
        : { value: 1, unit: "un" },
    finality: "Compra interna",
    requester: input.actor,
    status: input.request.action,
    requestedAt: input.request.occurredAt,
    updatedAt: input.request.occurredAt,
    ...("confirmedProduct" in input.request
      ? { attendedProduct: input.request.confirmedProduct }
      : {}),
    ...("attendedQuantity" in input.request
      ? { attendedQuantity: input.request.attendedQuantity }
      : {}),
    ...("reason" in input.request ? { exceptionReason: input.request.reason } : {}),
  });
  return mutationResult({
    requestId: input.requestId,
    data: purchase,
    action,
    targetType: "gpp_purchase_request",
    idempotencyKey: input.request.idempotencyKey,
    targetId: purchase.purchaseRequestId,
    targetLabel: purchase.product.name,
    summary,
    previous: null,
    next: purchaseAuditState(purchase),
    sector: purchase.sector,
    product: purchase.attendedProduct,
    occurredAt: input.request.occurredAt,
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
