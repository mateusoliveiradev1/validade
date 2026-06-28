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
    const client: CommandCenterClient = { read: vi.fn().mockResolvedValue(projection) };
    render(<CommandCenter client={client} storeId="loja-piloto" />);

    expect(await screen.findByText("Area de venda com bloqueios")).toBeTruthy();
    expect(screen.getByText("Foto da central")).toBeTruthy();
    expect(screen.getByText("Aparelhos do piloto")).toBeTruthy();
    expect(screen.getByText("Moto G Lideranca")).toBeTruthy();
    expect(screen.getByText("Push remoto ainda nao provado")).toBeTruthy();
    expect(screen.getByText("Executar teste seguro de push antes do rollout.")).toBeTruthy();
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
    const client: CommandCenterClient = { read };
    render(<CommandCenter client={client} storeId="loja-piloto" />);

    expect((await screen.findByRole("alert")).textContent).toContain("Nao foi possivel atualizar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar atualizar o Command Center" }));
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("keeps audit actions disabled without store audit capability", async () => {
    const onOpenAudit = vi.fn();
    const client: CommandCenterClient = { read: vi.fn().mockResolvedValue(projection) };
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
});
