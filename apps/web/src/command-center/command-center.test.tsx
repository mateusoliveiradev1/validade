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
  pendingShiftCloses: [{ closureId: "shift-001", label: "Fechamento atual", blockerCount: 2 }],
  shiftHistory: [
    {
      closureId: "shift-history-001",
      label: "Fechamento anterior",
      verdict: "unsafe",
      occurredAt: "2030-01-10T08:00:00.000Z",
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
    expect(screen.getByText("Por que venceu")).toBeTruthy();
    expect(screen.getByText("Grafico de gargalos")).toBeTruthy();
    expect(screen.getByText("Prazo formal ja passou")).toBeTruthy();
    expect(screen.getByText("Colaborador FICTICIO")).toBeTruthy();
    expect(screen.getByText("Sync da retirada ainda nao foi confirmado.")).toBeTruthy();
    expect(screen.getByText("Retirar, registrar destino e reconferir a gondola")).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text.indexOf("Por que venceu")).toBeLessThan(text.indexOf("Lotes criticos"));
    expect(text.indexOf("Lotes criticos")).toBeLessThan(text.indexOf("Tarefas atrasadas"));
    expect(text.indexOf("Tarefas atrasadas")).toBeLessThan(text.indexOf("Rebaixas pendentes"));
    expect(text.indexOf("Rebaixas pendentes")).toBeLessThan(
      text.indexOf("Evidencias pendentes ou com falha"),
    );
    expect(text.indexOf("Evidencias pendentes ou com falha")).toBeLessThan(
      text.indexOf("Conflitos de sincronizacao"),
    );
    expect(text.indexOf("Conflitos de sincronizacao")).toBeLessThan(
      text.indexOf("Fechamentos com pendencias"),
    );
    expect(text.indexOf("Fechamentos com pendencias")).toBeLessThan(
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
});
