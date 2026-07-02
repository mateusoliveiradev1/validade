import { describe, expect, it } from "vitest";
import {
  GppAvariaEntrySchema,
  GppAvariaGroupSummarySchema,
  GppAvariaMovementSchema,
  GppMutationResponseSchema,
  GppPurchaseAttendanceRequestSchema,
  GppPurchaseRequestSchema,
  GppQueueSnapshotSchema,
  GppRealtimeEnvelopeSchema,
} from "./gpp";

const now = "2030-01-10T12:00:00.000Z";

const store = {
  storeId: "loja-piloto",
  storeName: "Loja Ficticia Piloto",
};

const actor = {
  actorId: "gpp-local",
  displayName: "Operador GPP",
  roleSnapshot: "gpp" as const,
};

const product = {
  code: "162",
  name: "Banana prata",
};

const quantity = {
  value: 3.25,
  unit: "kg" as const,
};

const avariaEntry = {
  avariaId: "avaria-1",
  store,
  sector: "FLV",
  product,
  quantity,
  finality: "baixa_gpp" as const,
  destination: "Caixa GPP",
  status: "pendente" as const,
  baixaEligibility: "eligible" as const,
  balanceQuantity: quantity,
  actor,
  createdAt: now,
  updatedAt: now,
};

const group = {
  groupId: "group-162",
  sector: "FLV",
  product,
  finality: "baixa_gpp" as const,
  totalQuantity: quantity,
  entryCount: 1,
  divergenceCount: 0,
  latestActivityAt: now,
  eligibleForBaixa: true,
};

describe("GPP contracts", () => {
  it("accepts a strict avaria entry with required product code and central fields", () => {
    const parsed = GppAvariaEntrySchema.parse(avariaEntry);

    expect(parsed.product.code).toBe("162");
    expect(parsed.centralState).toBe("central_confirmed");
  });

  it("rejects unknown fields and avarias without product code", () => {
    expect(
      GppAvariaEntrySchema.safeParse({
        ...avariaEntry,
        localOnly: true,
      }).success,
    ).toBe(false);
    expect(
      GppAvariaEntrySchema.safeParse({
        ...avariaEntry,
        product: { name: "Banana prata" },
      }).success,
    ).toBe(false);
  });

  it("does not allow divergent avarias or groups to look eligible for baixa", () => {
    expect(
      GppAvariaEntrySchema.safeParse({
        ...avariaEntry,
        status: "divergencia",
        divergenceReason: "quantidade_diferente",
        baixaEligibility: "eligible",
      }).success,
    ).toBe(false);
    expect(
      GppAvariaGroupSummarySchema.safeParse({
        ...group,
        divergenceCount: 1,
        eligibleForBaixa: true,
      }).success,
    ).toBe(false);
  });

  it("requires correction, baixa, and transfer justifications where the workflow needs them", () => {
    expect(
      GppAvariaEntrySchema.safeParse({
        ...avariaEntry,
        status: "corrigido",
      }).success,
    ).toBe(false);
    expect(
      GppAvariaMovementSchema.safeParse({
        movementId: "movement-1",
        avariaId: "avaria-1",
        kind: "baixa_gpp",
        quantity,
        remainingBalance: { value: 1, unit: "kg" },
        actor,
        occurredAt: now,
        idempotencyKey: "movement-1",
      }).success,
    ).toBe(false);
    expect(
      GppAvariaMovementSchema.safeParse({
        movementId: "movement-2",
        avariaId: "avaria-1",
        kind: "transferencia",
        quantity,
        remainingBalance: { value: 1, unit: "kg" },
        actor,
        occurredAt: now,
        idempotencyKey: "movement-2",
        justification: "Transferencia conferida pelo GPP.",
      }).success,
    ).toBe(false);
  });

  it("models purchase requests separately and blocks attendance without confirmed code and quantity", () => {
    const request = GppPurchaseRequestSchema.parse({
      purchaseRequestId: "purchase-1",
      store,
      sector: "Pizza",
      product: { name: "Tomate selecionado" },
      requestedQuantity: { value: 2, unit: "kg" },
      finality: "preparo de pizza",
      requester: { ...actor, roleSnapshot: "lead" as const },
      status: "solicitado",
      requestedAt: now,
      updatedAt: now,
    });

    expect(request.product.code).toBeUndefined();
    expect(
      GppPurchaseAttendanceRequestSchema.safeParse({
        action: "atendido",
        purchaseRequestId: "purchase-1",
        attendedQuantity: { value: 2, unit: "kg" },
        occurredAt: now,
        idempotencyKey: "attend-1",
      }).success,
    ).toBe(false);
    expect(
      GppPurchaseAttendanceRequestSchema.safeParse({
        action: "atendido",
        purchaseRequestId: "purchase-1",
        confirmedProduct: product,
        attendedQuantity: { value: 2, unit: "kg" },
        occurredAt: now,
        idempotencyKey: "attend-1",
      }).success,
    ).toBe(true);
  });

  it("distinguishes central mutation outcomes without optimistic success", () => {
    expect(
      GppMutationResponseSchema.parse({
        state: "central_confirmed",
        requestId: "request-1",
        confirmedAt: now,
      }).state,
    ).toBe("central_confirmed");
    expect(
      GppMutationResponseSchema.parse({
        state: "central_failed",
        requestId: "request-2",
        failedAt: now,
        retryable: true,
        message: "Falha na central. Tente novamente.",
      }).state,
    ).toBe("central_failed");
    expect(
      GppMutationResponseSchema.parse({
        state: "replayed",
        requestId: "request-1",
        replayedAt: now,
      }).state,
    ).toBe("replayed");
  });

  it("keeps realtime envelopes as refresh hints instead of row truth", () => {
    expect(
      GppRealtimeEnvelopeSchema.parse({
        storeId: "loja-piloto",
        kind: "gpp_entries_changed",
        occurredAt: now,
        refresh: {
          reason: "central_commit",
          scope: "queue",
        },
      }).kind,
    ).toBe("gpp_entries_changed");
    expect(
      GppRealtimeEnvelopeSchema.safeParse({
        storeId: "loja-piloto",
        kind: "gpp_entries_changed",
        occurredAt: now,
        refresh: {
          reason: "central_commit",
          scope: "queue",
        },
        entries: [avariaEntry],
      }).success,
    ).toBe(false);
  });

  it("represents a queue snapshot with avarias, purchases, divergences, and history", () => {
    expect(
      GppQueueSnapshotSchema.safeParse({
        store,
        generatedAt: now,
        centralState: "available",
        avariaGroups: [group],
        purchaseRequests: [],
        divergenceEntries: [],
        history: [],
      }).success,
    ).toBe(true);
  });
});
