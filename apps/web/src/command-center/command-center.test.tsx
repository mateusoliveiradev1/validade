import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { CommandCenterProjection } from "@validade-zero/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandCenterClient } from "./command-center-client";
import { CommandCenter } from "./CommandCenter";
import {
  countDeviceReadiness,
  deriveValidationVerdict,
  getDailyOperationDeviceBlockers,
  getSafePushTestDisabledReason,
  resolveUpdatePathState,
  routeLabel,
  validationReferenceForBlocker,
} from "./command-center-view-model";

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
      lotId: "lot-001",
      label: "Folhas FICTICIAS - lote FOL-001",
      locationLabel: "Area de venda",
      reason: "Validade vencida exige retirada.",
      cause: {
        code: "formal_expiry_passed",
        label: "Prazo formal ja passou",
        detail: "Lote vencido ainda nao tem confirmacao central de retirada.",
        actionLabel: "Retirar, registrar destino e reconferir a gondola",
        riskState: "expired",
        requiredResolution: "withdraw_or_loss",
        responsibleLabel: "Colaborador FICTICIO",
        sourceEventId: "audit-sync-ficticio-001",
        sourceEventSummary: "Sync da retirada ainda nao foi confirmado.",
        firstDetectedAt: "2030-01-10T10:00:00.000Z",
        lastObservedAt: "2030-01-10T10:05:00.000Z",
        lastAttemptedAt: "2030-01-10T10:10:00.000Z",
      },
    },
  ],
  overdueTasks: [
    {
      taskId: "task-001",
      label: "Retirar FOL-001",
      ownerLabel: "Colaborador FICTICIO",
      dueLabel: "Atrasada",
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
      label: "Retirada FOL-001",
      state: "failed",
      detail: "Evidencia aguardando novo envio.",
    },
  ],
  syncConflicts: [
    {
      conflictId: "conflict-001",
      label: "Acao offline FOL-001",
      detail: "Revise antes de reenviar.",
    },
  ],
  discardedActions: [
    {
      commandId: "command-discarded-001",
      label: "Folhas FICTICIAS - lote FOL-002",
      reason: "Acao local descartada pela central.",
      discardedAt: "2030-01-10T11:40:00.000Z",
    },
  ],
  resolvedHistory: [
    {
      taskId: "task-resolved-001",
      label: "Manga FICTICIA - lote MAN-001",
      actionLabel: "Retirada confirmada",
      actorLabel: "Lider FICTICIO",
      resolvedAt: "2030-01-10T11:35:00.000Z",
      detail: "Retirada conferida na area de venda.",
    },
  ],
  pendingShiftCloses: [{ closureId: "shift-001", label: "Fechamento atual", blockerCount: 2 }],
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
      appBuild: "150",
      environment: "staging",
      apiTarget: "https://api.ficticia.invalid",
      buildCompatibility: "atual",
      approvedArtifactLabel: "uat20-onboarding-shift-e2e-apk-150",
      approvedAppVersion: "0.12.0",
      approvedBuild: "150",
      lastForegroundAt: "2030-01-10T11:58:00.000Z",
      lastSyncAt: "2030-01-10T11:57:00.000Z",
      lastCentralReadAt: "2030-01-10T11:56:00.000Z",
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
      pushTests: [
        {
          eventId: "push-test-provider-accepted",
          deviceIdMasked: "moto...001",
          deviceLabel: "Moto G Lideranca",
          requesterLabel: "Lider FICTICIO",
          occurredAt: "2030-01-10T11:59:00.000Z",
          state: "provider_accepted",
          permissionOutcome: "granted",
          providerOutcome: "accepted",
          deliveryAttemptState: "sent",
          appSignal: "unknown",
          detail: "Provider aceitou o lembrete de teste.",
          nextAction: "Pedir abertura do lembrete e conferir sinal no app.",
        },
        {
          eventId: "push-test-provider-failed",
          deviceIdMasked: "moto...001",
          deviceLabel: "Moto G Lideranca",
          requesterLabel: "Lider FICTICIO",
          occurredAt: "2030-01-10T11:58:00.000Z",
          state: "provider_failed",
          permissionOutcome: "granted",
          providerOutcome: "failed",
          deliveryAttemptState: "failed",
          appSignal: "unknown",
          detail: "Provider recusou o lembrete de teste.",
          nextAction: "Verificar Expo/provider e tentar novamente.",
          failureReason: "provider_failed",
        },
        {
          eventId: "push-test-token-invalid",
          deviceIdMasked: "moto...001",
          deviceLabel: "Moto G Lideranca",
          requesterLabel: "Lider FICTICIO",
          occurredAt: "2030-01-10T11:57:00.000Z",
          state: "token_invalid",
          permissionOutcome: "granted",
          providerOutcome: "token_invalid",
          deliveryAttemptState: "failed",
          appSignal: "unknown",
          detail: "Token do aparelho ficou invalido.",
          nextAction: "Reabrir o app para renovar token e repetir o teste.",
          failureReason: "token_invalid",
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
        actionLabel: "Abrir Preparar turno no app aprovado.",
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

describe("CommandCenter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Operacao daily safety without rollout diagnostics", async () => {
    const client: CommandCenterClient = {
      read: vi.fn().mockResolvedValue(projection),
      sendSafePushTest: vi.fn(),
    };
    render(<CommandCenter client={client} storeId="loja-piloto" />);

    expect(await screen.findByText("Area de venda com bloqueios")).toBeTruthy();
    expect(screen.getByText("Leitura central")).toBeTruthy();
    expect(
      screen.getByText("Aparelhos do turno: 0 aptos, 1 em atencao, 0 bloqueados"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir Aparelhos" })).toBeTruthy();
    expect(
      screen.getByText("Nenhum bloqueio de aparelho afeta a operacao diaria agora."),
    ).toBeTruthy();
    expect(screen.getByText("1 lote central")).toBeTruthy();
    expect(screen.getByText("1 cadastro em revisao")).toBeTruthy();
    expect(screen.getByText("Por que venceu")).toBeTruthy();
    expect(screen.getAllByText("Prazo formal ja passou").length).toBeGreaterThan(0);
    expect(screen.getByText("Sync da retirada ainda nao foi confirmado.")).toBeTruthy();
    expect(screen.getByText("Retirar, registrar destino e reconferir a gondola")).toBeTruthy();
    expect(screen.getByText("Cadastros de produto em revisao")).toBeTruthy();
    expect(screen.getByText("Banana Nanica FICTICIA")).toBeTruthy();
    expect(screen.getByText("1 produto(s) parecido(s) revisado(s)")).toBeTruthy();
    expect(screen.getByText("1 lote sincronizado")).toBeTruthy();
    expect(
      screen.getByText(
        "Impacto: lote ja aparece na operacao; falta validar o cadastro do produto.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Acoes descartadas pela central")).toBeTruthy();
    expect(screen.getByText("Historico resolvido")).toBeTruthy();
    expect(screen.getByText(/Retirada confirmada por Lider FICTICIO/)).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text.indexOf("Por que venceu")).toBeLessThan(
      text.indexOf("Cadastros de produto em revisao"),
    );
    expect(text).not.toContain("UAT Loja 18");
    expect(text).not.toContain("Aparelhos do piloto");
    expect(text).not.toContain("Bloqueios do piloto");
    expect(text).not.toContain("uat15-sync-debug-apk-138");
    expect(text).not.toContain("Enviar teste seguro");
    expect(text).not.toContain("Lembrete aceito pelo provider");
    expect(text).not.toContain("Provider push sem prova atual");
    expect(text).not.toMatch(/pushToken|expoPushToken|rawDeviceId|buildUrl/i);
    expect(text.indexOf("Cadastros de produto em revisao")).toBeLessThan(
      text.indexOf("Lotes criticos"),
    );
    expect(text.indexOf("Lotes criticos")).toBeLessThan(text.indexOf("Tarefas atrasadas"));
    expect(text.indexOf("Tarefas atrasadas")).toBeLessThan(text.indexOf("Rebaixas pendentes"));
    expect(text.indexOf("Rebaixas pendentes")).toBeLessThan(
      text.indexOf("Evidencias pendentes ou com falha"),
    );
    expect(text.indexOf("Evidencias pendentes ou com falha")).toBeLessThan(
      text.indexOf("Conflitos da fila de sincronizacao"),
    );
    expect(text.indexOf("Conflitos da fila de sincronizacao")).toBeLessThan(
      text.indexOf("Acoes descartadas pela central"),
    );
    expect(text.indexOf("Acoes descartadas pela central")).toBeLessThan(
      text.indexOf("Fechamentos com pendencias"),
    );
    expect(text.indexOf("Fechamentos com pendencias")).toBeLessThan(
      text.indexOf("Historico resolvido"),
    );
    expect(text).not.toMatch(/sales|revenue|forecast|supplier/i);
  });

  it("approves pending product drafts from Operacao when catalog review is allowed", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(projection)
      .mockResolvedValueOnce({
        ...projection,
        centralSnapshot: { ...projection.centralSnapshot, draftProductCount: 0 },
        pendingProductDrafts: [],
      });
    const reviewProductDraft = vi.fn().mockResolvedValue({
      draft: {
        draftId: "product-draft-001",
        centralProductId: "product-draft-001",
        displayName: "Banana Nanica FICTICIA",
        normalizedKey: "banana nanica ficticia",
        categoryId: "categoria-ficticia-frutas",
        categoryName: "Frutas",
        categoryRuleProfile: {
          categoryId: "categoria-ficticia-frutas",
          mode: "formal_validity",
          windows: { radarDays: 60, markdownDays: 15, criticalDays: 3, expiredDays: 0 },
        },
        source: "draft_pending_review",
        reviewStatus: "validated",
        syncState: "synchronized",
        requestedAt: "2030-01-10T11:00:00.000Z",
        requestedByLabel: "Colaborador FICTICIO",
        similarCandidates: [],
        acknowledgementMessage: "Produto validado na central.",
        reviewReason: "Aprovado pela central.",
        reviewedAt: "2030-01-10T12:05:00.000Z",
      },
      acknowledgement: {
        state: "validated",
        message: "Produto validado na central.",
      },
    });
    const client: CommandCenterClient = {
      read,
      reviewProductDraft,
      sendSafePushTest: vi.fn(),
    };
    render(<CommandCenter canReviewProductDrafts client={client} storeId="loja-piloto" />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Aprovar produto Banana Nanica FICTICIA",
      }),
    );

    await waitFor(() =>
      expect(reviewProductDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: "loja-piloto",
          draftId: "product-draft-001",
          reviewedAt: expect.any(String),
        }),
      ),
    );
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Banana Nanica FICTICIA validado na central/)).toBeTruthy();
  });

  it("promotes daily device blockers in Operacao without promoting push-only blockers", async () => {
    const client: CommandCenterClient = {
      read: vi.fn().mockResolvedValue({
        ...projection,
        devices: [
          {
            ...projection.devices[0],
            verdict: "bloqueado",
            blockers: [
              {
                code: "missing_first_central_read",
                label: "Leitura central ausente",
                detail: "Aparelho ainda nao abriu Preparar turno contra a central.",
                nextAction: "Abrir Preparar turno e repetir a leitura central.",
                severity: "blocking",
              },
            ],
            nextAction: "Abrir Preparar turno e repetir a leitura central.",
          },
        ],
      }),
      sendSafePushTest: vi.fn(),
    };
    render(<CommandCenter client={client} storeId="loja-piloto" />);

    const deviceStrip = await screen.findByRole("region", { name: "Resumo de aparelhos" });
    expect(within(deviceStrip).getByText("Leitura central ausente")).toBeTruthy();
    expect(within(deviceStrip).getByText("Causa:")).toBeTruthy();
    expect(within(deviceStrip).getByText("Agora:")).toBeTruthy();
    expect(
      within(deviceStrip).getByText("Abrir Preparar turno e repetir a leitura central."),
    ).toBeTruthy();
    expect(within(deviceStrip).queryByText("Push remoto ainda nao provado")).toBeNull();
  });

  it("keeps the recovery action visible when refresh fails", async () => {
    const read = vi.fn().mockRejectedValue(new Error("falha ficticia"));
    const client: CommandCenterClient = { read, sendSafePushTest: vi.fn() };
    render(<CommandCenter client={client} storeId="loja-piloto" />);

    expect((await screen.findByRole("alert")).textContent).toContain("Nao foi possivel atualizar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar atualizar agora" }));
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("keeps audit actions disabled without store audit capability", async () => {
    const onOpenAudit = vi.fn();
    const client: CommandCenterClient = {
      read: vi.fn().mockResolvedValue(projection),
      sendSafePushTest: vi.fn(),
    };
    render(
      <CommandCenter
        canOpenAudit={false}
        client={client}
        onOpenAudit={onOpenAudit}
        storeId="loja-piloto"
      />,
    );

    const buttons = await screen.findAllByRole("button", {
      name: "Auditoria bloqueada para este papel",
    });
    const firstButton = buttons[0];

    expect(firstButton).toBeDefined();
    if (firstButton === undefined) throw new Error("Blocked audit button not rendered.");
    expect(firstButton).toHaveProperty("disabled", true);
    fireEvent.click(firstButton);
    expect(onOpenAudit).not.toHaveBeenCalled();
  });

  it("renders Aparelhos readiness order and device facts without update or UAT instructions", async () => {
    const client: CommandCenterClient = {
      read: vi.fn().mockResolvedValue({
        ...projection,
        devices: [
          {
            ...projection.devices[0],
            deviceIdMasked: "moto...apto",
            deviceLabel: "Aparelho Apto",
            verdict: "apto",
            blockers: [],
            pushPermission: "granted",
            pushProviderState: "remote_ready",
            buildCompatibility: "atual",
            nextAction: "Aparelho apto para rotina da loja.",
            updatedAt: "2030-01-10T12:03:00.000Z",
          },
          {
            ...projection.devices[0],
            deviceIdMasked: "moto...atencao",
            deviceLabel: "Aparelho Atencao",
            verdict: "atencao",
            blockers: [
              {
                code: "old_build_attention",
                label: "Build antigo em atencao",
                detail: "Pode operar, mas precisa atualizar antes do rollout.",
                nextAction: "Abrir Atualizacoes para orientar troca de build.",
                severity: "warning",
              },
            ],
            buildCompatibility: "desatualizado",
            nextAction: "Abrir Atualizacoes para orientar troca de build.",
            updatedAt: "2030-01-10T12:04:00.000Z",
          },
          {
            ...projection.devices[0],
            deviceIdMasked: "moto...bloq",
            deviceLabel: "Aparelho Bloqueado",
            verdict: "bloqueado",
            blockers: [
              {
                code: "missing_first_central_read",
                label: "Leitura central ausente",
                detail: "Aparelho ainda nao abriu Preparar turno contra a central.",
                nextAction: "Abrir Preparar turno e repetir leitura central.",
                severity: "blocking",
              },
            ],
            buildCompatibility: "incompativel",
            nextAction: "Abrir Preparar turno e repetir leitura central.",
            updatedAt: "2030-01-10T12:02:00.000Z",
          },
        ],
      }),
      sendSafePushTest: vi.fn(),
    };
    render(<CommandCenter activeRoute="aparelhos" client={client} storeId="loja-piloto" />);

    expect(await screen.findByRole("heading", { name: "Aparelhos" })).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text.indexOf("Aparelho Bloqueado")).toBeLessThan(text.indexOf("Aparelho Atencao"));
    expect(text.indexOf("Aparelho Atencao")).toBeLessThan(text.indexOf("Aparelho Apto"));
    expect(screen.getByText("Operador: Lider FICTICIO. ID seguro: moto...bloq")).toBeTruthy();
    expect(screen.getAllByText("Estado:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agora:").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Leitura central ausente: Aparelho ainda nao abriu Preparar turno contra a central.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("permitida, remoto pronto")).toBeTruthy();
    expect(screen.getAllByText("permitida").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Build aprovado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Autorizacao do aparelho:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("autorizacao confirmada").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Teste seguro exige autorizacao do aparelho, loja confirmada e leitura central recente.",
      ).length,
    ).toBeGreaterThan(0);
    expect(text).not.toContain("Ver instrucoes manuais");
    expect(text).not.toContain("Abrir atualizacao segura");
    expect(text).not.toContain("Registrar status da validacao");
    expect(text).not.toContain("QR");
    expect(text).not.toContain("UAT Loja 18");
  });

  it("renders Atualizacoes build truth with manual safe-update fallback", async () => {
    const client: CommandCenterClient = {
      read: vi.fn().mockResolvedValue({
        ...projection,
        devices: [
          {
            ...projection.devices[0],
            deviceIdMasked: "moto...atual",
            deviceLabel: "Aparelho Atual",
            buildCompatibility: "atual",
            appVersion: "0.12.0",
            appBuild: "150",
            nextAction: "Aparelho ja esta na build aprovada.",
            updatedAt: "2030-01-10T12:04:00.000Z",
          },
          {
            ...projection.devices[0],
            deviceIdMasked: "moto...desat",
            deviceLabel: "Aparelho Desatualizado",
            buildCompatibility: "desatualizado",
            appVersion: "0.11.0",
            appBuild: "110",
            nextAction: "Atualizar pelo caminho manual aprovado.",
            updatedAt: "2030-01-10T12:03:00.000Z",
          },
          {
            ...projection.devices[0],
            deviceIdMasked: "moto...desc",
            deviceLabel: "Aparelho Desconhecido",
            buildCompatibility: "desconhecido",
            appVersion: "nao informado",
            appBuild: "nao informado",
            nextAction: "Abrir o app aprovado para registrar versao instalada.",
            updatedAt: "2030-01-10T12:02:00.000Z",
          },
          {
            ...projection.devices[0],
            deviceIdMasked: "moto...incomp",
            deviceLabel: "Aparelho Incompativel",
            buildCompatibility: "incompativel",
            appVersion: "0.13.0",
            appBuild: "138",
            nextAction: "Remover build incompativel e reinstalar a aprovada.",
            updatedAt: "2030-01-10T12:01:00.000Z",
          },
        ],
      }),
      sendSafePushTest: vi.fn(),
    };
    render(<CommandCenter activeRoute="atualizacoes" client={client} storeId="loja-piloto" />);

    expect(await screen.findByRole("heading", { name: "Atualizacoes" })).toBeTruthy();
    expect(screen.getByText("uat20-onboarding-shift-e2e-apk-150")).toBeTruthy();
    expect(screen.getAllByText("0.12.0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("150").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Ver instrucoes manuais" })).toBeTruthy();

    const text = document.body.textContent ?? "";
    expect(text.indexOf("Aparelho Incompativel")).toBeLessThan(
      text.indexOf("Aparelho Desatualizado"),
    );
    expect(text.indexOf("Aparelho Desatualizado")).toBeLessThan(
      text.indexOf("Aparelho Desconhecido"),
    );
    expect(text.indexOf("Aparelho Desconhecido")).toBeLessThan(text.indexOf("Aparelho Atual"));
    expect(text).toContain("Build incompativel");
    expect(text).toContain("Build antigo");
    expect(text).toContain("Build desconhecido");
    expect(text).toContain("Build aprovado");
    expect(text).not.toContain("Enviar teste seguro");
    expect(text).not.toContain("Provider aceitou");
    expect(text).not.toContain("UAT Loja 18");
    expect(text).not.toMatch(/token|secret|password|ExpoPushToken|buildUrl|eas:\/\//i);
  });

  it("renders Validacao as public-safe Go No-Go proof without duplicated actions", async () => {
    const onOpenAparelhos = vi.fn();
    const onOpenAtualizacoes = vi.fn();
    const onOpenOperacao = vi.fn();
    const client: CommandCenterClient = {
      read: vi.fn().mockResolvedValue(projection),
      sendSafePushTest: vi.fn(),
    };
    render(
      <CommandCenter
        activeRoute="validacao"
        client={client}
        onOpenAparelhos={onOpenAparelhos}
        onOpenAtualizacoes={onOpenAtualizacoes}
        onOpenOperacao={onOpenOperacao}
        storeId="loja-piloto"
      />,
    );

    expect(await screen.findByRole("heading", { name: "Validacao" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Atualizar prova da validacao" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "No-Go" })).toBeTruthy();
    expect(
      screen.getByText(
        /No-Go: Resolucao terminal registrada impede a validacao. Corrija em Operacao/,
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByText("Executar resolucao real e aguardar central.").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("UAT Loja 18").length).toBeGreaterThan(0);
    expect(screen.getByText("Produto real usado no teste")).toBeTruthy();
    expect(screen.getAllByText(/Provider bloqueado externamente/).length).toBeGreaterThan(0);
    expect(screen.getByText("Provider push sem prova atual")).toBeTruthy();
    expect(screen.getByText("Produto ficticio ou seed nao passa esta etapa.")).toBeTruthy();
    expect(screen.getByText("Aparelho Loja 18 #1")).toBeTruthy();
    expect(screen.getByText("moto...001 - Lideranca Loja 18")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir Aparelhos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir Atualizacoes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir Operacao" })).toBeTruthy();
    expect(
      screen.getByText(/O status de validacao e calculado pela leitura central atual/),
    ).toBeTruthy();

    const sequenceText =
      screen.getByRole("region", { name: "Sequencia obrigatoria da UAT Loja 18" }).textContent ??
      "";
    expect(sequenceText.indexOf("Turno preparado")).toBeLessThan(
      sequenceText.indexOf("Produto real usado no teste"),
    );
    expect(sequenceText.indexOf("Produto real usado no teste")).toBeLessThan(
      sequenceText.indexOf("Lote real registrado"),
    );
    expect(sequenceText.indexOf("Lote real registrado")).toBeLessThan(
      sequenceText.indexOf("Resolucao terminal registrada"),
    );
    expect(sequenceText.indexOf("Resolucao terminal registrada")).toBeLessThan(
      sequenceText.indexOf("Segundo aparelho conferiu os mesmos fatos"),
    );
    expect(sequenceText.indexOf("Segundo aparelho conferiu os mesmos fatos")).toBeLessThan(
      sequenceText.indexOf("Command Center consistente"),
    );
    expect(sequenceText.indexOf("Command Center consistente")).toBeLessThan(
      sequenceText.indexOf("Push seguro recebido no aparelho aprovado"),
    );
    expect(sequenceText.indexOf("Push seguro recebido no aparelho aprovado")).toBeLessThan(
      sequenceText.indexOf("Camera ou fallback operacional comprovado"),
    );
    expect(sequenceText.indexOf("Camera ou fallback operacional comprovado")).toBeLessThan(
      sequenceText.indexOf("Fechamento seguro do turno"),
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("Causa:");
    expect(text).toContain("Agora:");
    expect(text).not.toContain("Enviar teste seguro");
    expect(text).not.toContain("Ver instrucoes manuais");
    expect(text).not.toContain("uat20-onboarding-shift-e2e-apk-150");
    expect(text).not.toMatch(
      /token|secret|password|ExpoPushToken|buildUrl|rawDeviceId|providerTicket|providerReceipt|objectKey|photoUri|base64/i,
    );
    expect(text).not.toMatch(
      /Marcar passou|Aprovar etapa|Registrar status da validacao|Passou manualmente/i,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir Aparelhos" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir Atualizacoes" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir Operacao" }));
    expect(onOpenAparelhos).toHaveBeenCalledTimes(1);
    expect(onOpenAtualizacoes).toHaveBeenCalledTimes(1);
    expect(onOpenOperacao).toHaveBeenCalledTimes(1);
  });

  it("derives Go, No-Go, and external proof verdicts from projection facts", () => {
    const noGoVerdict = deriveValidationVerdict(projection);
    expect(noGoVerdict.label).toBe("No-Go");
    expect(noGoVerdict.detail).toContain("No-Go: Resolucao terminal registrada impede a validacao");
    expect(noGoVerdict.detail).toContain("Corrija em Operacao antes de continuar");
    expect(noGoVerdict.nextAction).toBe("Executar resolucao real e aguardar central.");

    const externalVerdict = deriveValidationVerdict(
      projectionForVerdict({
        blockers: [pilotBlockers()[0]],
        devices: [approvedDevice()],
        steps: allRunbookStepsPassed().map((step) =>
          step.stepId === "safe_push_test"
            ? {
                ...step,
                state: "external_blocked" as const,
                cause: "Provider Android real nao foi provado nesta execucao.",
                nextAction: "Conectar aparelho aprovado e repetir teste seguro.",
                evidenceReferenceLabel: "Provider bloqueado externamente",
              }
            : step,
        ),
      }),
    );
    expect(externalVerdict.label).toBe("Aguardando prova externa");
    expect(externalVerdict.detail).toContain(
      "Ainda nao e Go porque falta prova Teste seguro de push",
    );
    expect(externalVerdict.detail).toContain("em Aparelhos");
    expect(externalVerdict.nextAction).toBe("Conectar aparelho aprovado e repetir teste seguro.");

    const goVerdict = deriveValidationVerdict(
      projectionForVerdict({
        blockers: [],
        devices: [approvedDevice()],
        steps: allRunbookStepsPassed(),
      }),
    );
    expect(goVerdict.label).toBe("Go");
    expect(goVerdict.detail).toBe(
      "Go confirmado para Loja 18 com prova central completa e fechamento seguro.",
    );
    expect(goVerdict.nextAction).toBe(
      "Mantenha a leitura central atualizada ate a decisao final da lideranca.",
    );
  });

  it("sends a safe push test and appends the returned timeline", async () => {
    const sendSafePushTest = vi.fn().mockResolvedValue({
      command: {
        commandId: "pilot-push-test-001",
        storeId: "loja-piloto",
        storeName: "Loja Ficticia Piloto",
        deviceId: "moto...001",
        deviceLabel: "Moto G Lideranca",
        requesterSubjectId: "lead-local",
        requesterLabel: "Lider FICTICIO",
        requestedAt: "2030-01-10T12:01:00.000Z",
        message: {
          title: "Teste Validade Zero",
          body: "Toque para confirmar canal de lembrete.",
        },
      },
      timeline: [
        {
          eventId: "push-test-local-only",
          deviceIdMasked: "moto...001",
          deviceLabel: "Moto G Lideranca",
          requesterLabel: "Lider FICTICIO",
          occurredAt: "2030-01-10T12:01:00.000Z",
          state: "local_only",
          permissionOutcome: "denied",
          providerOutcome: "not_configured",
          deliveryAttemptState: "not_attempted",
          appSignal: "unknown",
          detail: "Canal local identificado; teste remoto nao foi disparado.",
          nextAction: "Configurar push remoto e repetir o teste seguro.",
        },
      ],
    });
    const client: CommandCenterClient = {
      read: vi.fn().mockResolvedValue({
        ...projection,
        devices: projection.devices.map((device) => ({ ...device, pushTests: [] })),
      }),
      sendSafePushTest,
    };
    render(
      <CommandCenter
        activeRoute="aparelhos"
        canSendPilotPushTest
        client={client}
        storeId="loja-piloto"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Enviar teste seguro" }));

    expect(sendSafePushTest).toHaveBeenCalledWith({
      storeId: "loja-piloto",
      deviceIdMasked: "moto...001",
      deviceLabel: "Moto G Lideranca",
    });
    expect(await screen.findByText("Aparelho operando apenas com lembrete local")).toBeTruthy();
    expect(screen.getByText("Configurar push remoto e repetir o teste seguro.")).toBeTruthy();
    expect(screen.getByText(/prova apenas o canal de push/i)).toBeTruthy();
  });

  it("keeps shared route selectors public-safe and projection-derived", () => {
    const disabledCopy =
      "Teste seguro exige autorizacao do aparelho, loja confirmada e leitura central recente.";
    expect(routeLabel("operacao")).toBe("Operacao");
    expect(routeLabel("validacao")).toBe("Validacao");
    expect(deriveValidationVerdict(projection).label).toBe("No-Go");
    expect(validationReferenceForBlocker("push")).toBe(
      "Resolver push, camera ou autorizacao do aparelho em Aparelhos",
    );
    expect(validationReferenceForBlocker("camera")).toBe(
      "Resolver push, camera ou autorizacao do aparelho em Aparelhos",
    );
    expect(validationReferenceForBlocker("device")).toBe(
      "Resolver push, camera ou autorizacao do aparelho em Aparelhos",
    );
    expect(validationReferenceForBlocker("build")).toBe("Resolver build em Atualizacoes");
    expect(validationReferenceForBlocker("product_review")).toBe(
      "Revisar fila local, revisao de produto ou fechamento em Operacao",
    );
    expect(validationReferenceForBlocker("sync")).toBe(
      "Revisar fila local, revisao de produto ou fechamento em Operacao",
    );
    expect(validationReferenceForBlocker("shift_close")).toBe(
      "Revisar fila local, revisao de produto ou fechamento em Operacao",
    );
    expect(countDeviceReadiness(projection.devices)).toEqual({
      apto: 0,
      atencao: 1,
      bloqueado: 0,
    });
    const device = projection.devices[0] ?? neverDevice();
    expect(getDailyOperationDeviceBlockers(device).length).toBe(0);
    expect(getSafePushTestDisabledReason({ canSendPilotPushTest: false, device })).toBe(
      disabledCopy,
    );
    expect(getSafePushTestDisabledReason({ canSendPilotPushTest: true, device })).toBeUndefined();
    expect(
      getSafePushTestDisabledReason({
        canSendPilotPushTest: true,
        device: {
          ...device,
          blockers: [
            {
              code: "missing_first_central_read",
              label: "Leitura central ausente",
              detail: "Sem primeira leitura central.",
              nextAction: "Abrir Preparar turno.",
              severity: "blocking",
            },
          ],
        },
      }),
    ).toBe(disabledCopy);
    expect(resolveUpdatePathState().state).toBe("manual_pending");
    expect(resolveUpdatePathState().ctaLabel).toBe("Ver instrucoes manuais");
    expect(resolveUpdatePathState("https://updates.ficticia.invalid/apk").state).toBe(
      "public_safe",
    );
    expect(resolveUpdatePathState("token-buildUrl-secret").state).toBe("blocked");
    expect(resolveUpdatePathState("token-buildUrl-secret").href).toBeUndefined();
  });
});

function neverDevice(): (typeof projection.devices)[number] {
  throw new Error("Expected a fixture device.");
}

function projectionForVerdict(input: {
  blockers?: CommandCenterProjection["pilotBlockers"];
  devices?: CommandCenterProjection["devices"];
  steps?: CommandCenterProjection["pilotUat"]["steps"];
}): CommandCenterProjection {
  return {
    ...projection,
    ...(input.devices === undefined ? {} : { devices: input.devices }),
    ...(input.blockers === undefined ? {} : { pilotBlockers: input.blockers }),
    pilotUat: {
      ...projection.pilotUat,
      ...(input.steps === undefined ? {} : { steps: input.steps }),
    },
  } as unknown as CommandCenterProjection;
}

function allRunbookStepsPassed(): CommandCenterProjection["pilotUat"]["steps"] {
  return projection.pilotUat.steps.map((step) => ({
    ...step,
    state: "passed" as const,
    nextAction: "Prova concluida.",
    evidenceReferenceLabel: step.evidenceReferenceLabel ?? "Prova sanitizada",
    occurredAt: step.occurredAt ?? step.updatedAt,
  })) as CommandCenterProjection["pilotUat"]["steps"];
}

function approvedDevice(): CommandCenterProjection["devices"][number] {
  const device = projection.devices[0] ?? neverDevice();

  return {
    ...device,
    verdict: "apto",
    buildCompatibility: "atual",
    pushPermission: "granted",
    pushProviderState: "remote_ready",
    cameraPermission: "granted",
    blockers: [],
    nextAction: "Aparelho apto para validacao.",
  } as CommandCenterProjection["devices"][number];
}
