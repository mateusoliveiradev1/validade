import { describe, expect, it } from "vitest";
import type { SafePushTestTimelineItem } from "@validade-zero/contracts";
import { createInMemoryCaptureRepository } from "@validade-zero/database/capture-repository";
import { FakeAuthProvider, createInMemoryMembershipRepository } from "./auth";
import {
  createAuditBackedCommandCenterService,
  createCaptureBackedCommandCenterService,
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
      detail: "Cadastro criado no mobile e aguardando validacao central.",
      similarCount: 1,
      syncedLotCount: 1,
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
  pilotUat: pilotUatChecklist("loja-piloto", "Loja Ficticia Piloto"),
  pilotBlockers: pilotBlockers(),
  devices: [
    {
      deviceIdMasked: "moto...001",
      deviceLabel: "Moto G Lideranca",
      activeUserLabel: "Lider FICTICIO",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      appVersion: "0.12.0",
      appBuild: "164",
      environment: "staging",
      apiTarget: "https://api.ficticia.invalid",
      buildCompatibility: "atual",
      approvedArtifactLabel: "uat15-sync-debug-apk-138",
      approvedAppVersion: "0.12.0",
      approvedBuild: "138",
      lastForegroundAt: "2030-01-10T11:58:00.000Z",
      lastSyncAt: "2030-01-10T11:57:00.000Z",
      pushPermission: "denied",
      pushProviderState: "local_only",
      cameraPermission: "granted",
      verdict: "atencao",
      blockers: [
        {
          code: "push_required_without_push",
          label: "Push remoto ainda nao provado",
          detail: "O aparelho pode seguir em etapas sem push remoto.",
          nextAction: "Executar teste seguro de push antes do rollout.",
          severity: "warning",
        },
      ],
      nextAction: "Executar teste seguro de push antes do rollout.",
      updatedAt: "2030-01-10T12:00:00.000Z",
    },
  ],
} as const;

function pilotUatChecklist(storeId: string, storeName: string) {
  const updatedAt = "2030-01-10T12:00:00.000Z";

  return {
    title: "UAT Loja 18",
    storeId,
    storeName,
    summary:
      "Checklist guia o UAT real; produto e lote ficticios nao contam como prova da Loja 18.",
    updatedAt,
    steps: [
      {
        stepId: "prepare_turn",
        label: "Preparar turno",
        state: "passed",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Abrir Preparar turno no APK aprovado.",
        evidenceReferenceLabel: "Leitura central preparada",
        occurredAt: updatedAt,
        updatedAt,
      },
      {
        stepId: "product_real_input",
        label: "Produto real da Loja 18",
        state: "pending",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Cadastrar ou reutilizar produto real informado pelo usuario.",
        operatorNote: "Produto ficticio ou seed nao passa esta etapa.",
        nextAction: "Usar produto real da Loja 18.",
        updatedAt,
      },
      {
        stepId: "lot_registration",
        label: "Lote real registrado",
        state: "pending",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Registrar lote real do produto escolhido.",
        operatorNote: "Lote ficticio ou seed nao passa esta etapa.",
        nextAction: "Registrar lote real e conferir central.",
        updatedAt,
      },
      {
        stepId: "terminal_resolution",
        label: "Resolucao terminal",
        state: "blocked",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Executar acao fisica compativel no mobile.",
        cause: "Tarefa critica ficticia segue ativa.",
        nextAction: "Executar resolucao real e aguardar central.",
        evidenceReferenceLabel: "Resolucao pendente",
        updatedAt,
      },
      {
        stepId: "second_device_convergence",
        label: "Segundo aparelho",
        state: "pending",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Preparar turno em outro aparelho ou conta da mesma loja.",
        nextAction: "Confirmar convergencia em aparelho aprovado.",
        updatedAt,
      },
      {
        stepId: "command_center_consistency",
        label: "Command Center consistente",
        state: "passed",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Comparar Hoje, historico e Command Center depois do sync.",
        evidenceReferenceLabel: "Painel atualizado com leitura central",
        occurredAt: updatedAt,
        updatedAt,
      },
      {
        stepId: "safe_push_test",
        label: "Teste seguro de push",
        state: "external_blocked",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Enviar teste seguro para aparelho aprovado.",
        cause: "Provider Android real nao foi provado nesta execucao.",
        nextAction: "Conectar aparelho aprovado e repetir teste seguro.",
        evidenceReferenceLabel: "Provider bloqueado externamente",
        updatedAt,
      },
      {
        stepId: "camera_evidence_or_fallback",
        label: "Camera ou fallback",
        state: "external_blocked",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Validar camera ou motivo sem foto no aparelho aprovado.",
        cause: "Sem hardware Android aprovado nesta execucao.",
        nextAction: "Executar no aparelho aprovado e registrar status sanitizado.",
        evidenceReferenceLabel: "Camera bloqueada externamente",
        updatedAt,
      },
      {
        stepId: "shift_close",
        label: "Fechamento de turno",
        state: "blocked",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Fechar turno somente apos revalidacao central.",
        cause: "Ha etapas UAT pendentes.",
        nextAction: "Concluir etapas pendentes antes do fechamento seguro.",
        evidenceReferenceLabel: "Fechamento bloqueado",
        updatedAt,
      },
    ],
  };
}

function pilotBlockers() {
  const updatedAt = "2030-01-10T12:00:00.000Z";

  return [
    {
      blockerId: "push-provider-external",
      category: "push",
      severity: "external",
      ownership: "external",
      label: "Provider push sem prova atual",
      cause: "Provider Android real nao foi provado nesta execucao.",
      nextAction: "Conectar aparelho aprovado e repetir teste seguro.",
      affectedLabel: "Teste seguro de push",
      evidenceReferenceLabel: "Provider bloqueado externamente",
      updatedAt,
    },
    {
      blockerId: "product-review-pending",
      category: "product_review",
      severity: "warning",
      ownership: "operator",
      label: "Cadastro de produto em revisao",
      cause: "Cadastro criado no mobile e aguardando validacao central.",
      nextAction: "Validar o cadastro do produto antes de declarar catalogo pronto.",
      affectedLabel: "Banana Nanica FICTICIA",
      updatedAt,
    },
  ];
}

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
      devices: [{ deviceLabel: "Moto G Lideranca", verdict: "atencao" }],
    });
    expect(JSON.stringify(body)).not.toMatch(
      /sales|revenue|forecast|supplier|objectKey|signedUrl|base64|pushToken|expoPushToken/i,
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
        detail: "2 produto(s) parecido(s) revisados antes do cadastro novo.",
        similarCount: 2,
        syncedLotCount: 0,
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
        { draftId: "product-draft-central-001", reviewStatus: "pending_review", syncedLotCount: 1 },
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
    expect(uatStep(body, "product_real_input")).toMatchObject({
      state: "passed",
      evidenceReferenceLabel: "Produto real confirmado",
    });
    expect(uatStep(body, "lot_registration")).toMatchObject({
      state: "passed",
      evidenceReferenceLabel: "Lote real confirmado",
    });
    expect(uatStep(body, "terminal_resolution")).toMatchObject({
      state: "passed",
      evidenceReferenceLabel: "Resolucao terminal confirmada",
    });
    expect(uatStep(body, "command_center_consistency")).toMatchObject({
      state: "blocked",
      evidenceReferenceLabel: "Consistencia central pendente",
    });
    expect(uatStep(body, "shift_close")).toMatchObject({
      state: "blocked",
      evidenceReferenceLabel: "Fechamento bloqueado",
    });
    expect(projectedPilotBlockers(body)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "sync",
          label: "Conflito de sincronizacao",
        }),
      ]),
    );
    expect(JSON.stringify(body)).not.toMatch(/objectKey|signedUrl|base64|photoUri|imageBytes/i);
  });

  it("includes store-scoped device readiness in central capture projection", async () => {
    const captureRepository = createCentralCaptureRepository();
    await captureRepository.upsertDeviceSnapshot({
      deviceId: "android-loja-piloto-001",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      deviceLabel: "Moto G Lideranca",
      activeUserLabel: "Lider FICTICIO",
      appVersion: "0.12.0",
      appBuild: "164",
      environment: "staging",
      apiTarget: "https://api.ficticia.invalid",
      preparedAt: new Date("2030-01-10T11:40:00.000Z"),
      lastForegroundAt: new Date("2030-01-10T11:42:00.000Z"),
      lastSyncAt: new Date("2030-01-10T11:43:00.000Z"),
      lastCentralReadAt: new Date("2030-01-10T11:44:00.000Z"),
      lastHydratedAt: new Date("2030-01-10T11:44:00.000Z"),
      pendingCommandCount: 0,
      conflictCount: 0,
      source: "central",
      pushPermission: "granted",
      pushProviderState: "remote_ready",
      cameraPermission: "granted",
      updatedAt: new Date("2030-01-10T11:45:00.000Z"),
    });
    await captureRepository.upsertDeviceSnapshot({
      deviceId: "android-outra-loja-001",
      storeId: "outra-loja",
      storeName: "Outra Loja Ficticia",
      pendingCommandCount: 0,
      conflictCount: 0,
      source: "central",
      updatedAt: new Date("2030-01-10T11:45:00.000Z"),
    });

    const app = createCentralCaptureApp({ captureRepository });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      devices: [
        {
          deviceLabel: "Moto G Lideranca",
          activeUserLabel: "Lider FICTICIO",
          verdict: "apto",
          buildCompatibility: "atual",
          approvedArtifactLabel: "uat34-init-central-refresh-apk-164",
          lastCentralReadAt: "2030-01-10T11:44:00.000Z",
        },
      ],
    });
    expect(JSON.stringify(body)).not.toMatch(
      /android-loja-piloto-001|android-outra-loja-001|buildUrl/i,
    );
  });

  it("projects safe push-test timeline without exposing raw provider or device details", async () => {
    const captureRepository = createCentralCaptureRepository();
    await captureRepository.upsertDeviceSnapshot({
      deviceId: "android-loja-piloto-001",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      deviceLabel: "Moto G Lideranca",
      activeUserLabel: "Lider FICTICIO",
      appVersion: "0.12.0",
      appBuild: "164",
      environment: "staging",
      apiTarget: "https://api.ficticia.invalid",
      preparedAt: new Date("2030-01-10T11:40:00.000Z"),
      lastForegroundAt: new Date("2030-01-10T11:42:00.000Z"),
      lastSyncAt: new Date("2030-01-10T11:43:00.000Z"),
      lastCentralReadAt: new Date("2030-01-10T11:44:00.000Z"),
      lastHydratedAt: new Date("2030-01-10T11:44:00.000Z"),
      pendingCommandCount: 0,
      conflictCount: 0,
      source: "central",
      pushPermission: "granted",
      pushProviderState: "remote_ready",
      cameraPermission: "granted",
      updatedAt: new Date("2030-01-10T11:45:00.000Z"),
    });
    await captureRepository.registerDevicePushChannel({
      deviceId: "android-loja-piloto-001",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      deviceLabel: "Moto G Lideranca",
      activeUserLabel: "Lider FICTICIO",
      pushPermission: "granted",
      pushProviderState: "token_registered",
      expoPushToken: "ExponentPushToken[fake-command-center-token]",
      registeredAt: new Date("2030-01-10T11:46:00.000Z"),
    });
    const app = createCentralCaptureApp({ captureRepository });

    const pushResponse = await app.request("/pilot/push-tests", {
      method: "POST",
      headers: {
        authorization: "Bearer fake:lead-local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storeId: "loja-piloto",
        deviceIdMasked: "andr...001",
      }),
    });
    const commandCenterResponse = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await commandCenterResponse.json()) as unknown;

    expect(pushResponse.status).toBe(200);
    expect(commandCenterResponse.status).toBe(200);
    expect(body).toMatchObject({
      devices: [
        {
          deviceLabel: "Moto G Lideranca",
          pushTests: [
            {
              state: "provider_accepted",
              providerOutcome: "accepted",
              deliveryAttemptState: "sent",
            },
          ],
        },
      ],
    });
    expect(uatStep(body, "safe_push_test")).toMatchObject({
      state: "passed",
      evidenceReferenceLabel: "Timeline de teste seguro",
    });
    expect(uatStep(body, "camera_evidence_or_fallback")).toMatchObject({
      state: "external_blocked",
      evidenceReferenceLabel: "Camera ou fallback pendente",
    });
    expect(uatStep(body, "shift_close")).not.toMatchObject({ state: "passed" });
    expect(JSON.stringify(body)).not.toMatch(
      /android-loja-piloto-001|ExponentPushToken|providerTicket|rawProvider/i,
    );
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
      pilotBlockers?: Array<{ category?: string; label?: string; nextAction?: string }>;
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
    expect(body.pilotBlockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "device", label: "Nenhum aparelho aprovado" }),
        expect.objectContaining({ category: "sync", label: "Leitura central bloqueada" }),
      ]),
    );
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

  it("keeps missing product and lot proof pending when no actionable central blocker exists", async () => {
    const app = createCentralCaptureApp({
      captureRepository: createInMemoryCaptureRepository({
        resolvedHistory: [centralResolvedHistory()],
      }),
    });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(uatStep(body, "product_real_input")).toMatchObject({
      state: "pending",
      nextAction: "Usar produto real da Loja 18 e registrar status sanitizado.",
    });
    expect(uatStep(body, "lot_registration")).toMatchObject({
      state: "pending",
      nextAction: "Registrar lote real e confirmar que apareceu pela central.",
    });
    expect(uatStep(body, "terminal_resolution")).toMatchObject({
      state: "passed",
      evidenceReferenceLabel: "Resolucao terminal confirmada",
    });
    expect(JSON.stringify(body)).not.toMatch(/produto real secreto|lot-privado|rawDeviceId/i);
  });

  it("blocks terminal resolution when a critical central task is still active", async () => {
    const app = createCentralCaptureApp({
      captureRepository: createInMemoryCaptureRepository({
        products: [centralProduct()],
        lots: [centralLot()],
        tasks: [centralTask()],
      }),
    });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(uatStep(body, "product_real_input")).toMatchObject({ state: "passed" });
    expect(uatStep(body, "lot_registration")).toMatchObject({ state: "passed" });
    expect(uatStep(body, "terminal_resolution")).toMatchObject({
      state: "blocked",
      cause: "Ha tarefa critica ativa sem resolucao terminal central.",
      nextAction: "Abrir Operacao e resolver a pendencia fisica antes do Go.",
    });
    expect(JSON.stringify(body)).not.toMatch(/objectKey|photoUri|base64|token/i);
  });

  it("does not pass shift close from no active tasks alone", async () => {
    const app = createCentralCaptureApp({
      captureRepository: createInMemoryCaptureRepository({
        products: [centralProduct()],
        lots: [centralLot()],
        resolvedHistory: [centralResolvedHistory()],
      }),
    });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(uatStep(body, "terminal_resolution")).toMatchObject({ state: "passed" });
    expect(uatStep(body, "shift_close")).not.toMatchObject({ state: "passed" });
    expect(uatStep(body, "shift_close")).toMatchObject({
      cause: "Ainda ha etapas UAT ou bloqueios operacionais pendentes.",
      nextAction:
        "Concluir produto, lote, resolucao, convergencia e bloqueios antes do fechamento.",
    });
  });

  it("keeps second-device convergence external with only one approved mobile device", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct()],
      lots: [centralLot()],
      resolvedHistory: [centralResolvedHistory()],
    });
    await seedApprovedDevice(captureRepository, {
      deviceId: "android-loja-piloto-001",
      deviceLabel: "Aparelho Loja 18 #1",
    });
    const app = createCentralCaptureApp({ captureRepository });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(uatStep(body, "second_device_convergence")).toMatchObject({
      state: "external_blocked",
      evidenceReferenceLabel: "Aparelho Loja 18 #2 pendente",
    });
  });

  it("passes second-device convergence only with two approved devices and central facts", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct()],
      lots: [centralLot()],
      resolvedHistory: [centralResolvedHistory()],
    });
    await seedApprovedDevice(captureRepository, {
      deviceId: "android-loja-piloto-001",
      deviceLabel: "Aparelho Loja 18 #1",
    });
    await seedApprovedDevice(captureRepository, {
      deviceId: "android-loja-piloto-002",
      deviceLabel: "Aparelho Loja 18 #2",
    });
    const app = createCentralCaptureApp({ captureRepository });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(uatStep(body, "product_real_input")).toMatchObject({ state: "passed" });
    expect(uatStep(body, "lot_registration")).toMatchObject({ state: "passed" });
    expect(uatStep(body, "terminal_resolution")).toMatchObject({ state: "passed" });
    expect(uatStep(body, "second_device_convergence")).toMatchObject({
      state: "passed",
      evidenceReferenceLabel: "Aparelho Loja 18 #2",
    });
  });

  it("emits build blockers from installed-vs-approved compatibility", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct()],
      lots: [centralLot()],
      resolvedHistory: [centralResolvedHistory()],
    });
    await seedApprovedDevice(captureRepository, {
      appBuild: "146",
      deviceId: "android-loja-piloto-001",
      deviceLabel: "Aparelho Loja 18 #1",
    });
    const app = createCentralCaptureApp({ captureRepository });
    const response = await app.request("/command-center?storeId=loja-piloto", {
      headers: { authorization: "Bearer fake:lead-local" },
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(200);
    expect(projectedPilotBlockers(body)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "build",
          label: "APK aprovado ainda nao instalado",
        }),
      ]),
    );
    expect(JSON.stringify(body)).not.toMatch(/buildUrl|eas:\/\/|token|secret/i);
  });

  it("keeps local-only push external and provider failures actionable", async () => {
    const captureRepository = createInMemoryCaptureRepository({
      products: [centralProduct()],
      lots: [centralLot()],
      resolvedHistory: [centralResolvedHistory()],
    });
    await seedApprovedDevice(captureRepository, {
      deviceId: "android-loja-piloto-001",
      deviceLabel: "Aparelho Loja 18 #1",
    });
    const localOnlyService = createCaptureBackedCommandCenterService({
      captureRepository,
      now: () => new Date("2030-01-10T12:00:00.000Z"),
      readPushTests: () => [safePushTimeline("local_only")],
    });
    const providerFailedService = createCaptureBackedCommandCenterService({
      captureRepository,
      now: () => new Date("2030-01-10T12:00:00.000Z"),
      readPushTests: () => [safePushTimeline("provider_failed")],
    });

    const localOnly = await localOnlyService.read({
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
    });
    const providerFailed = await providerFailedService.read({
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
    });

    expect(uatStep(localOnly, "safe_push_test")).toMatchObject({
      state: "external_blocked",
      evidenceReferenceLabel: "Timeline de teste seguro",
    });
    expect(projectedPilotBlockers(localOnly)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "push", label: "Push remoto ainda nao provado" }),
      ]),
    );
    expect(uatStep(providerFailed, "safe_push_test")).toMatchObject({
      state: "blocked",
      evidenceReferenceLabel: "Timeline de teste seguro",
    });
    expect(projectedPilotBlockers(providerFailed)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "push", label: "Provider recusou teste seguro" }),
      ]),
    );
    expect(JSON.stringify({ localOnly, providerFailed })).not.toMatch(
      /providerTicket|providerReceipt|ExpoPushToken|objectKey|photoUri|base64/i,
    );
  });
});

interface UatStepProjection {
  stepId?: string;
  state?: string;
  cause?: string;
  nextAction?: string;
  evidenceReferenceLabel?: string;
}

interface PilotBlockerProjection {
  category?: string;
  label?: string;
}

function uatStep(body: unknown, stepId: string): UatStepProjection {
  const steps =
    (body as { pilotUat?: { steps?: readonly UatStepProjection[] } }).pilotUat?.steps ?? [];
  const step = steps.find((item) => item.stepId === stepId);
  if (step === undefined) throw new Error(`Missing UAT step ${stepId}`);
  return step;
}

function projectedPilotBlockers(body: unknown): readonly PilotBlockerProjection[] {
  return (body as { pilotBlockers?: readonly PilotBlockerProjection[] }).pilotBlockers ?? [];
}

async function seedApprovedDevice(
  captureRepository: ReturnType<typeof createInMemoryCaptureRepository>,
  overrides: {
    appBuild?: string;
    deviceId: string;
    deviceLabel: string;
  },
): Promise<void> {
  await captureRepository.upsertDeviceSnapshot({
    deviceId: overrides.deviceId,
    storeId: "loja-piloto",
    storeName: "Loja Ficticia Piloto",
    deviceLabel: overrides.deviceLabel,
    activeUserLabel: "Lider FICTICIO",
    appVersion: "0.12.0",
    appBuild: overrides.appBuild ?? "164",
    environment: "staging",
    apiTarget: "https://api.ficticia.invalid",
    preparedAt: new Date("2030-01-10T11:40:00.000Z"),
    lastForegroundAt: new Date("2030-01-10T11:42:00.000Z"),
    lastSyncAt: new Date("2030-01-10T11:43:00.000Z"),
    lastCentralReadAt: new Date("2030-01-10T11:44:00.000Z"),
    lastHydratedAt: new Date("2030-01-10T11:44:00.000Z"),
    pendingCommandCount: 0,
    conflictCount: 0,
    source: "central",
    pushPermission: "granted",
    pushProviderState: "remote_ready",
    cameraPermission: "granted",
    updatedAt: new Date("2030-01-10T11:45:00.000Z"),
  });
}

function safePushTimeline(state: "local_only" | "provider_failed"): SafePushTestTimelineItem {
  return {
    eventId: `push-${state}`,
    deviceIdMasked: "andr...001",
    deviceLabel: "Aparelho Loja 18 #1",
    requesterLabel: "Lideranca Loja 18",
    occurredAt: "2030-01-10T11:50:00.000Z",
    state,
    permissionOutcome: state === "local_only" ? "unknown" : "granted",
    providerOutcome: state === "provider_failed" ? "failed" : "not_attempted",
    deliveryAttemptState: state === "provider_failed" ? "failed" : "not_attempted",
    detail:
      state === "provider_failed"
        ? "Provider recusou teste seguro em aparelho aprovado."
        : "Teste ficou local e nao prova recebimento remoto.",
    nextAction:
      state === "provider_failed"
        ? "Resolver provider em Aparelhos antes do Go."
        : "Repetir teste com provider remoto habilitado.",
  };
}

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
    products: [centralProduct()],
    lots: [centralLot()],
    tasks: [centralTask()],
    resolvedHistory: [centralResolvedHistory()],
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

function centralProduct() {
  return {
    storeId: "loja-piloto",
    centralProductId: "product-draft-central-001",
    displayName: "Banana Nanica FICTICIA",
    categoryId: "cat-flv",
    categoryName: "FLV",
    status: "draft" as const,
    state: "pending_central" as const,
    source: "pending_central" as const,
    updatedAt: "2030-01-10T11:00:00.000Z",
    categoryRuleProfile: { categoryId: "cat-flv", mode: "formal_validity" as const },
  };
}

function centralLot() {
  return {
    storeId: "loja-piloto",
    centralLotId: "lot-central-001",
    centralProductId: "product-draft-central-001",
    productDisplayName: "Folhas FICTICIAS",
    lotIdentity: { identitySource: "printed" as const, value: "FOL-CENTRAL-001" },
    mode: "formal_validity" as const,
    currentLocation: { kind: "area_de_venda" as const },
    state: "synchronized" as const,
    source: "central" as const,
    riskState: "expired" as const,
    expiresAt: "2030-01-09",
    approximateQuantity: 7,
    updatedAt: "2030-01-10T10:00:00.000Z",
  };
}

function centralTask() {
  return {
    storeId: "loja-piloto",
    centralTaskId: "task-central-001",
    activeKey: "active-central-001",
    centralLotId: "lot-central-001",
    productDisplayName: "Folhas FICTICIAS",
    currentLocation: { kind: "area_de_venda" as const },
    riskState: "expired" as const,
    severity: "critical" as const,
    requiredResolution: "withdraw_or_loss" as const,
    state: "synchronized" as const,
    source: "central" as const,
    ownerLabel: "Equipe do turno",
    dueAt: "2030-01-10T10:30:00.000Z",
    updatedAt: "2030-01-10T10:00:00.000Z",
  };
}

function centralResolvedHistory() {
  return {
    storeId: "loja-piloto",
    centralTaskId: "task-resolved-central-001",
    centralLotId: "lot-resolved-central-001",
    productDisplayName: "Manga FICTICIA",
    lotIdentity: { identitySource: "printed" as const, value: "MAN-CENTRAL-001" },
    currentLocation: { kind: "retirada_perda" as const },
    action: "withdraw" as const,
    actorLabel: "Lider FICTICIO",
    reason: "Retirada conferida na area de venda.",
    resolvedAt: "2030-01-10T11:35:00.000Z",
    state: "resolved" as const,
    source: "central" as const,
  };
}
