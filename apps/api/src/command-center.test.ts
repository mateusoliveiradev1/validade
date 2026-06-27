import { describe, expect, it } from "vitest";
import { createInMemoryCaptureRepository } from "@validade-zero/database/capture-repository";
import { FakeAuthProvider, createInMemoryMembershipRepository } from "./auth";
import {
  createAuditBackedCommandCenterService,
  createInMemoryCommandCenterService,
} from "./command-center";
import { createApiApp } from "./index";

const projection = {
  storeId: "loja-piloto",
  storeName: "Loja Ficticia Piloto",
  refreshedAt: "2030-01-10T12:00:00.000Z",
  freshness: "current",
  verdict: {
    state: "blocked",
    title: "Area de venda com bloqueios",
    detail: "Ha riscos que precisam de acao fisica antes de confirmar seguranca.",
  },
  centralSnapshot: {
    source: "central",
    readiness: "blocked",
    cacheState: "ready",
    productCount: 2,
    draftProductCount: 1,
    lotCount: 1,
    activeTaskCount: 1,
    conflictCount: 1,
    discardedActionCount: 1,
    resolvedHistoryCount: 1,
    pendingCommandCount: 0,
    lastCentralReadAt: "2030-01-10T12:00:00.000Z",
    lastHydratedAt: "2030-01-10T12:00:00.000Z",
    blockers: ["Conflito de sincronizacao exige revisao."],
  },
  criticalLots: [
    {
      lotId: "lot-critico-001",
      label: "Folhas FICTICIAS - lote FOL-001",
      locationLabel: "Area de venda",
      reason: "Validade vencida exige retirada.",
      cause: {
        code: "formal_expiry_passed",
        label: "Prazo formal ja passou",
        detail: "Validade vencida exige retirada.",
        actionLabel: "Retirar, registrar destino e reconferir a gondola",
        riskState: "expired",
        requiredResolution: "withdraw_or_loss",
        responsibleLabel: "Colaborador FICTICIO",
        sourceEventId: "audit-ficticio-001",
        sourceEventSummary: "Lote vencido detectado.",
        firstDetectedAt: "2030-01-10T10:00:00.000Z",
        lastObservedAt: "2030-01-10T10:05:00.000Z",
        lastAttemptedAt: "2030-01-10T10:10:00.000Z",
      },
    },
  ],
  overdueTasks: [
    {
      taskId: "task-atrasada-001",
      label: "Retirar lote FOL-001",
      ownerLabel: "Colaborador FICTICIO",
      dueLabel: "Atrasada desde 10:00",
    },
  ],
  pendingMarkdowns: [
    { markdownId: "markdown-001", label: "Preco de FOL-001", stage: "Aguardando aplicacao" },
  ],
  pendingProductDrafts: [
    {
      draftId: "product-draft-001",
      label: "Banana Nanica FICTICIA",
      reviewStatus: "pending_review",
      detail: "Rascunho criado no mobile e aguardando validacao central.",
      similarCount: 1,
      requestedByLabel: "Colaborador FICTICIO",
      createdAt: "2030-01-10T11:00:00.000Z",
    },
  ],
  pendingEvidence: [
    {
      assetId: "evidence-001",
      label: "Retirada do lote FOL-001",
      state: "failed",
      detail: "Evidencia aguardando novo envio.",
    },
  ],
  syncConflicts: [
    {
      conflictId: "conflict-001",
      label: "Acao offline para FOL-001",
      detail: "Revise a mudanca atual antes de reenviar.",
    },
  ],
  discardedActions: [
    {
      commandId: "command-descartado-001",
      label: "Folhas FICTICIAS - lote FOL-002",
      reason: "Acao local descartada por estado central mais recente.",
      discardedAt: "2030-01-10T11:40:00.000Z",
    },
  ],
  resolvedHistory: [
    {
      taskId: "task-resolvida-001",
      label: "Manga FICTICIA - lote MAN-001",
      actionLabel: "Retirada confirmada",
      actorLabel: "Lider FICTICIO",
      resolvedAt: "2030-01-10T11:35:00.000Z",
      detail: "Retirada conferida na area de venda.",
    },
  ],
  pendingShiftCloses: [
    { closureId: "shift-close-001", label: "Fechamento do turno atual", blockerCount: 2 },
  ],
  shiftHistory: [
    {
      closureId: "shift-history-001",
      label: "Fechamento anterior",
      verdict: "unsafe",
      occurredAt: "2030-01-10T08:00:00.000Z",
    },
  ],
} as const;

function createApp() {
  return createApiApp({
    authProvider: new FakeAuthProvider(),
    membershipRepository: createInMemoryMembershipRepository([
      {
        subjectId: "lead-local",
        role: "lead",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
      {
        subjectId: "collaborator-local",
        role: "collaborator",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
      {
        subjectId: "admin-local",
        role: "admin",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
    ]),
    commandCenterService: createInMemoryCommandCenterService({ projection }),
  });
}

describe("Command Center API", () => {
  it("returns the runtime-validated operational funnel only inside the authorized store", async () => {
    const response = await createApp().request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      verdict: { state: "blocked" },
      centralSnapshot: { lotCount: 1, draftProductCount: 1 },
      criticalLots: [{ lotId: "lot-critico-001", cause: { code: "formal_expiry_passed" } }],
      pendingProductDrafts: [{ draftId: "product-draft-001", reviewStatus: "pending_review" }],
      pendingEvidence: [{ state: "failed" }],
      syncConflicts: [{ conflictId: "conflict-001" }],
      discardedActions: [{ commandId: "command-descartado-001" }],
      resolvedHistory: [{ taskId: "task-resolvida-001" }],
    });
    expect(JSON.stringify(body)).not.toMatch(
      /sales|revenue|forecast|supplier|objectKey|signedUrl|base64/i,
    );
  });

  it("allows collaborator operational read without audit scope", async () => {
    const response = await createApp().request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:collaborator-local" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      storeId: "loja-piloto",
      verdict: { state: "blocked" },
    });
  });

  it("denies admin governance membership without operational Command Center scope", async () => {
    const response = await createApp().request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:admin-local" },
    });

    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).not.toContain("lot-critico-001");
  });

  it("projects pending product drafts from sanitized audit events", async () => {
    const service = createAuditBackedCommandCenterService({
      auditRepository: {
        queryStore: () =>
          Promise.resolve({
            items: [
              {
                eventId: "audit-product-draft-001",
                type: "sync.changed",
                store: {
                  storeId: "loja-piloto",
                  storeName: "Loja Ficticia Piloto",
                },
                actor: {
                  actorId: "collaborator-local",
                  displayName: "Colaborador FICTICIO",
                  roleSnapshot: "collaborator",
                },
                target: {
                  type: "product",
                  id: "central-product-001",
                  label: "Banana Nanica FICTICIA",
                },
                occurredAt: "2030-01-10T11:00:00.000Z",
                summary: "Rascunho operacional de produto criado para revisao central.",
                status: "received",
                metadata: {
                  action: "product.draft_created",
                  reviewStatus: "pending_review",
                  similarCandidateCount: 2,
                },
              },
            ],
          }),
      },
      now: () => new Date("2030-01-10T12:00:00.000Z"),
    });

    const result = await service.read({
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
    });

    expect(result.verdict.state).toBe("needs_review");
    expect(result.centralSnapshot).toMatchObject({
      productCount: 1,
      draftProductCount: 1,
      lotCount: 0,
    });
    expect(result.pendingProductDrafts).toEqual([
      {
        draftId: "central-product-001",
        label: "Banana Nanica FICTICIA",
        reviewStatus: "pending_review",
        detail: "2 produto(s) parecido(s) revisados antes do rascunho central.",
        similarCount: 2,
        requestedByLabel: "Colaborador FICTICIO",
        createdAt: "2030-01-10T11:00:00.000Z",
      },
    ]);
  });

  it("projects Command Center from central capture truth by default", async () => {
    const app = createCentralCaptureApp();
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      freshness: "current",
      verdict: { state: "blocked", title: "Conflito de sincronizacao bloqueia a seguranca" },
      centralSnapshot: {
        productCount: 1,
        draftProductCount: 1,
        lotCount: 1,
        activeTaskCount: 1,
        conflictCount: 1,
        discardedActionCount: 1,
      },
      criticalLots: [
        {
          lotId: "lot-central-001",
          label: "Folhas FICTICIAS - lote FOL-CENTRAL-001",
          cause: {
            code: "formal_expiry_passed",
            responsibleLabel: "Equipe do turno",
            sourceEventId: "task-central-001",
          },
        },
      ],
      overdueTasks: [{ taskId: "task-central-001", ownerLabel: "Equipe do turno" }],
      pendingProductDrafts: [
        { draftId: "product-draft-central-001", reviewStatus: "pending_review" },
      ],
      syncConflicts: [{ conflictId: "conflict-central-001" }],
      discardedActions: [{ commandId: "command-discarded-central-001" }],
      resolvedHistory: [
        {
          taskId: "task-resolved-central-001",
          actionLabel: "Retirada confirmada",
          actorLabel: "Lider FICTICIO",
        },
      ],
    });
    expect(JSON.stringify(body)).not.toMatch(/objectKey|signedUrl|base64|photoUri|imageBytes/i);
  });

  it("fails closed when central capture has no turn facts", async () => {
    const app = createCentralCaptureApp({
      captureRepository: createInMemoryCaptureRepository(),
    });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as {
      centralSnapshot?: { cacheState?: string; lotCount?: number };
      freshness?: string;
      verdict?: { state?: string; title?: string };
      criticalLots?: unknown[];
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      freshness: "stale",
      verdict: {
        state: "needs_review",
        title: "Area de venda precisa de conferencia",
      },
      centralSnapshot: {
        cacheState: "needs_first_central_read",
        lotCount: 0,
      },
      criticalLots: [],
    });
  });

  it("does not mark product catalog without central lots as safe", async () => {
    const app = createCentralCaptureApp({
      captureRepository: createInMemoryCaptureRepository({
        products: [
          {
            storeId: "loja-piloto",
            centralProductId: "product-validated-central-001",
            displayName: "Abacaxi FICTICIO",
            categoryId: "cat-flv",
            categoryName: "FLV",
            status: "validated",
            state: "synchronized",
            source: "central",
            updatedAt: "2030-01-10T11:00:00.000Z",
            categoryRuleProfile: { categoryId: "cat-flv", mode: "formal_validity" },
          },
        ],
      }),
    });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      verdict: {
        state: "needs_review",
        title: "Area de venda precisa de conferencia",
      },
      centralSnapshot: {
        productCount: 1,
        draftProductCount: 0,
        lotCount: 0,
      },
    });
  });
});

function createCentralCaptureApp(input?: {
  captureRepository?: ReturnType<typeof createInMemoryCaptureRepository>;
}) {
  return createApiApp({
    authProvider: new FakeAuthProvider(),
    membershipRepository: createInMemoryMembershipRepository([
      {
        subjectId: "lead-local",
        role: "lead",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        status: "active",
      },
    ]),
    captureRepository: input?.captureRepository ?? createCentralCaptureRepository(),
    now: () => new Date("2030-01-10T12:00:00.000Z"),
  });
}

function createCentralCaptureRepository() {
  return createInMemoryCaptureRepository({
    products: [
      {
        storeId: "loja-piloto",
        centralProductId: "product-draft-central-001",
        displayName: "Banana Nanica FICTICIA",
        categoryId: "cat-flv",
        categoryName: "FLV",
        status: "draft",
        state: "pending_central",
        source: "pending_central",
        updatedAt: "2030-01-10T11:00:00.000Z",
        categoryRuleProfile: { categoryId: "cat-flv", mode: "formal_validity" },
      },
    ],
    lots: [
      {
        storeId: "loja-piloto",
        centralLotId: "lot-central-001",
        centralProductId: "product-central-001",
        productDisplayName: "Folhas FICTICIAS",
        lotIdentity: { identitySource: "printed", value: "FOL-CENTRAL-001" },
        mode: "formal_validity",
        currentLocation: { kind: "area_de_venda" },
        state: "synchronized",
        source: "central",
        riskState: "expired",
        expiresAt: "2030-01-09",
        approximateQuantity: 7,
        updatedAt: "2030-01-10T10:00:00.000Z",
      },
    ],
    tasks: [
      {
        storeId: "loja-piloto",
        centralTaskId: "task-central-001",
        activeKey: "active-central-001",
        centralLotId: "lot-central-001",
        productDisplayName: "Folhas FICTICIAS",
        currentLocation: { kind: "area_de_venda" },
        riskState: "expired",
        severity: "critical",
        requiredResolution: "withdraw_or_loss",
        state: "synchronized",
        source: "central",
        ownerLabel: "Equipe do turno",
        dueAt: "2030-01-10T10:30:00.000Z",
        updatedAt: "2030-01-10T10:00:00.000Z",
      },
    ],
    resolvedHistory: [
      {
        storeId: "loja-piloto",
        centralTaskId: "task-resolved-central-001",
        centralLotId: "lot-resolved-central-001",
        productDisplayName: "Manga FICTICIA",
        lotIdentity: { identitySource: "printed", value: "MAN-CENTRAL-001" },
        currentLocation: { kind: "retirada_perda" },
        action: "withdraw",
        actorLabel: "Lider FICTICIO",
        reason: "Retirada conferida na area de venda.",
        resolvedAt: "2030-01-10T11:35:00.000Z",
        state: "resolved",
        source: "central",
      },
    ],
    conflicts: [
      {
        storeId: "loja-piloto",
        conflictId: "conflict-central-001",
        commandId: "command-conflict-central-001",
        productDisplayName: "Folhas FICTICIAS",
        lotIdentity: { identitySource: "printed", value: "FOL-CENTRAL-001" },
        currentLocation: { kind: "area_de_venda" },
        reason: "Acao offline diverge da leitura central mais recente.",
        createdAt: "2030-01-10T11:45:00.000Z",
        state: "conflict",
        source: "central",
      },
      {
        storeId: "loja-piloto",
        conflictId: "discarded-central-001",
        commandId: "command-discarded-central-001",
        productDisplayName: "Folhas FICTICIAS",
        lotIdentity: { identitySource: "printed", value: "FOL-CENTRAL-002" },
        currentLocation: { kind: "area_de_venda" },
        reason: "Acao local descartada porque a tarefa ja foi resolvida na central.",
        createdAt: "2030-01-10T11:50:00.000Z",
        state: "discarded",
        source: "central",
      },
    ],
  });
}
