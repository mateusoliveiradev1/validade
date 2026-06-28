import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandCenterClient } from "./command-center-client";
import { CommandCenter } from "./CommandCenter";

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
      detail: "Rascunho criado no mobile e aguardando validacao central.",
      similarCount: 1,
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
  devices: [
    {
      deviceIdMasked: "moto...001",
      deviceLabel: "Moto G Lideranca",
      activeUserLabel: "Lider FICTICIO",
      storeId: "loja-piloto",
      storeName: "Loja Ficticia Piloto",
      appVersion: "0.12.0",
      appBuild: "120",
      environment: "staging",
      apiTarget: "https://api.ficticia.invalid",
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

describe("CommandCenter", () => {
  afterEach(() => {
    cleanup();
  });

  it("answers the safety question before rendering the ordered operational funnel", async () => {
    const client: CommandCenterClient = {
      read: vi.fn().mockResolvedValue(projection),
      sendSafePushTest: vi.fn(),
    };
    render(<CommandCenter client={client} storeId="loja-piloto" />);

    expect(await screen.findByText("Area de venda com bloqueios")).toBeTruthy();
    expect(screen.getByText("Foto da central")).toBeTruthy();
    expect(screen.getByText("Aparelhos do piloto")).toBeTruthy();
    expect(screen.getByText("Moto G Lideranca")).toBeTruthy();
    expect(screen.getByText("Push remoto ainda nao provado")).toBeTruthy();
    expect(screen.getByText("Executar teste seguro de push antes do rollout.")).toBeTruthy();
    expect(screen.getByText("Canal de lembrete, nao execucao fisica.")).toBeTruthy();
    expect(
      screen.getAllByText(/nao resolve tarefa, nao prova area segura/i).length,
    ).toBeGreaterThan(1);
    expect(screen.getByText("Lembrete aceito pelo provider")).toBeTruthy();
    expect(screen.getByText("Verificar Expo/provider e tentar novamente.")).toBeTruthy();
    expect(screen.getByText("Reabrir o app para renovar token e repetir o teste.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enviar teste seguro" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByText("1 lote central")).toBeTruthy();
    expect(screen.getByText("1 produto em rascunho")).toBeTruthy();
    expect(screen.getByText("Por que venceu")).toBeTruthy();
    expect(screen.getByText("Grafico de gargalos")).toBeTruthy();
    expect(screen.getByText("Prazo formal ja passou")).toBeTruthy();
    expect(screen.getByText("Colaborador FICTICIO")).toBeTruthy();
    expect(screen.getByText("Sync da retirada ainda nao foi confirmado.")).toBeTruthy();
    expect(screen.getByText("Retirar, registrar destino e reconferir a gondola")).toBeTruthy();
    expect(screen.getByText("Produtos em revisao")).toBeTruthy();
    expect(screen.getByText("Banana Nanica FICTICIA")).toBeTruthy();
    expect(screen.getByText("Acoes descartadas pela central")).toBeTruthy();
    expect(screen.getByText("Historico resolvido")).toBeTruthy();
    expect(screen.getByText(/Retirada confirmada por Lider FICTICIO/)).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text.indexOf("Por que venceu")).toBeLessThan(text.indexOf("Produtos em revisao"));
    expect(text).not.toMatch(/pushToken|expoPushToken|rawDeviceId/i);
    expect(text.indexOf("Produtos em revisao")).toBeLessThan(text.indexOf("Lotes criticos"));
    expect(text.indexOf("Lotes criticos")).toBeLessThan(text.indexOf("Tarefas atrasadas"));
    expect(text.indexOf("Tarefas atrasadas")).toBeLessThan(text.indexOf("Rebaixas pendentes"));
    expect(text.indexOf("Rebaixas pendentes")).toBeLessThan(
      text.indexOf("Evidencias pendentes ou com falha"),
    );
    expect(text.indexOf("Evidencias pendentes ou com falha")).toBeLessThan(
      text.indexOf("Conflitos de sincronizacao"),
    );
    expect(text.indexOf("Conflitos de sincronizacao")).toBeLessThan(
      text.indexOf("Acoes descartadas pela central"),
    );
    expect(text.indexOf("Acoes descartadas pela central")).toBeLessThan(
      text.indexOf("Fechamentos com pendencias"),
    );
    expect(text.indexOf("Fechamentos com pendencias")).toBeLessThan(
      text.indexOf("Historico resolvido"),
    );
    expect(text.indexOf("Historico resolvido")).toBeLessThan(
      text.indexOf("Historico de fechamentos"),
    );
    expect(text).not.toMatch(/sales|revenue|forecast|supplier/i);
  });

  it("keeps the recovery action visible when refresh fails", async () => {
    const read = vi.fn().mockRejectedValue(new Error("falha ficticia"));
    const client: CommandCenterClient = { read, sendSafePushTest: vi.fn() };
    render(<CommandCenter client={client} storeId="loja-piloto" />);

    expect((await screen.findByRole("alert")).textContent).toContain("Nao foi possivel atualizar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar atualizar o Command Center" }));
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
    render(<CommandCenter canSendPilotPushTest client={client} storeId="loja-piloto" />);

    fireEvent.click(await screen.findByRole("button", { name: "Enviar teste seguro" }));

    expect(sendSafePushTest).toHaveBeenCalledWith({
      storeId: "loja-piloto",
      deviceIdMasked: "moto...001",
      deviceLabel: "Moto G Lideranca",
    });
    expect(await screen.findByText("Aparelho operando apenas com lembrete local")).toBeTruthy();
    expect(screen.getByText("Configurar push remoto e repetir o teste seguro.")).toBeTruthy();
  });
});
