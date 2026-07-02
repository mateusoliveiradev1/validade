import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { SessionContextResponse } from "@validade-zero/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { AppShell } from "./shell/AppShell";

const activeSession = {
  status: "refreshed",
  sessionToken: "a".repeat(32),
  session: {
    actor: { subjectId: "collaborator-ficticio", displayName: "Colaborador FICTICIO" },
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    activeRole: "collaborator",
    capabilities: ["task.act", "command_center.read_store"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    featureFlags: {
      controle_gpp_enabled: false,
    },
    actions: {
      canReadCommandCenter: true,
      canActOnTask: true,
      canReviewProductDrafts: false,
      canCloseShift: false,
      canReadStoreAudit: false,
      canManageUsers: false,
      canSendPilotPushTest: false,
      canReadGppQueue: false,
      canCreateGppEntry: false,
      canCorrectOwnPendingGppEntry: false,
      canMarkGppDivergence: false,
      canReviewGppCorrection: false,
      canBaixarGppAvaria: false,
      canAttendGppPurchase: false,
      canReadGppHistory: false,
    },
  },
};

describe("authenticated web shell", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("opens first access directly from an invitation URL", () => {
    const token = "invite-token-with-at-least-thirty-two-characters";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    window.history.pushState({}, "", `/?invite=${token}`);

    render(<App />);

    expect(screen.getByRole("heading", { name: "Ativar conta da loja piloto" })).toBeTruthy();
    const tokenInput = screen.getByRole("textbox", {
      name: "Codigo do convite",
    });
    expect(tokenInput).toHaveProperty("value", token);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the operational shell for an active session", async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);

      if (url.includes("/command-center")) {
        return Promise.resolve(
          Response.json({
            storeId: "loja-ficticia",
            storeName: "Loja Ficticia Piloto",
            refreshedAt: "2030-01-11T11:00:00.000Z",
            freshness: "current",
            verdict: {
              state: "safe",
              title: "Area de venda segura agora",
              detail: "Nenhum bloqueio central exige acao neste momento.",
            },
            centralSnapshot: {
              source: "central",
              readiness: "prepared",
              cacheState: "ready",
              productCount: 1,
              draftProductCount: 0,
              lotCount: 1,
              activeTaskCount: 0,
              conflictCount: 0,
              discardedActionCount: 0,
              resolvedHistoryCount: 1,
              pendingCommandCount: 0,
              lastCentralReadAt: "2030-01-11T11:00:00.000Z",
              lastHydratedAt: "2030-01-11T11:00:00.000Z",
              blockers: [],
            },
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
            pilotUat: pilotUatChecklist("loja-ficticia", "Loja Ficticia Piloto"),
            pilotBlockers: [],
          }),
        );
      }

      return Promise.resolve(Response.json(activeSession));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Area de venda segura agora?" })).toBeTruthy();
    });
    expect(screen.getByText("Loja Ficticia Piloto")).toBeTruthy();
    const commandCenterCall = fetchMock.mock.calls.find(([input]) =>
      (input instanceof Request ? input.url : String(input)).includes("/command-center"),
    );
    const commandCenterHeaders = headersFromFetchCall(commandCenterCall);
    expect(commandCenterHeaders.get("authorization")).toBe(`Bearer ${activeSession.sessionToken}`);
    expect(screen.queryByText("Ambiente seguro para desenvolvimento")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir navegacao" }));
    const navigationDialog = screen.getByRole("dialog");
    expect(navigationDialog).toBeTruthy();
    expect(within(navigationDialog).getByRole("button", { name: "Operacao" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(within(navigationDialog).getByRole("button", { name: "Aparelhos" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(within(navigationDialog).getByRole("button", { name: "Atualizacoes" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(within(navigationDialog).getByRole("button", { name: "Validacao" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(within(navigationDialog).queryByRole("button", { name: "Controle GPP" })).toBeNull();
    expect(
      within(navigationDialog).getByRole("button", { name: "Acessos da loja" }),
    ).toHaveProperty("disabled", true);
    expect(within(navigationDialog).getByText("Administracao apenas")).toBeTruthy();
    expect(within(navigationDialog).getByRole("button", { name: "Auditoria" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(within(navigationDialog).getByText("Lideranca apenas")).toBeTruthy();
  });

  it("lands GPP users on the feature-flagged Controle GPP route", async () => {
    const gppSession = {
      ...activeSession,
      session: {
        ...activeSession.session,
        activeRole: "gpp",
        capabilities: [
          "gpp.queue.read",
          "gpp.divergence.mark",
          "gpp.correction.review",
          "gpp.avaria.baixar",
          "gpp.purchase.attend",
          "gpp.history.read",
        ],
        featureFlags: {
          controle_gpp_enabled: true,
        },
        actions: {
          ...activeSession.session.actions,
          canReadCommandCenter: false,
          canReadGppQueue: true,
          canCreateGppEntry: false,
          canCorrectOwnPendingGppEntry: false,
          canMarkGppDivergence: true,
          canReviewGppCorrection: true,
          canBaixarGppAvaria: true,
          canAttendGppPurchase: true,
          canReadGppHistory: true,
        },
      },
    };
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);

      if (url.includes("/gpp/queue")) {
        return Promise.resolve(Response.json(gppQueueSnapshot()));
      }

      if (url.includes("/gpp/history")) {
        return Promise.resolve(Response.json({ history: gppQueueSnapshot().history }));
      }

      return Promise.resolve(Response.json(gppSession));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Controle GPP - Loja Ficticia Piloto" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Controle GPP" })).toHaveProperty("disabled", false);
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/command-center"))).toBe(
      false,
    );
  });

  it("keeps operational routes disabled for an admin-only session", () => {
    const session: SessionContextResponse = {
      ...(activeSession.session as unknown as SessionContextResponse),
      activeRole: "admin",
      actions: {
        ...activeSession.session.actions,
        canReadCommandCenter: false,
        canManageUsers: true,
        canReadStoreAudit: false,
        canSendPilotPushTest: false,
      },
    };

    render(
      <AppShell
        route="access"
        session={session}
        onLogout={() => undefined}
        onOpenPrivacy={() => undefined}
        onRouteChange={() => undefined}
      >
        <div>Acessos disponiveis</div>
      </AppShell>,
    );

    for (const routeLabel of ["Operacao", "Aparelhos", "Atualizacoes", "Validacao"]) {
      expect(screen.getByRole("button", { name: routeLabel })).toHaveProperty("disabled", true);
    }
    expect(screen.getAllByText("Escopo operacional indisponivel")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Acessos da loja" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.queryByRole("button", { name: "Controle GPP" })).toBeNull();
  });
});

function gppQueueSnapshot() {
  return {
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    generatedAt: "2030-01-11T11:00:00.000Z",
    centralState: "available",
    avariaGroups: [
      {
        groupId: "FLV:162:baixa_gpp",
        sector: "FLV",
        product: { code: "162", name: "Banana prata" },
        finality: "baixa_gpp",
        totalQuantity: { value: 2, unit: "kg" },
        entryCount: 1,
        divergenceCount: 0,
        latestActivityAt: "2030-01-11T10:00:00.000Z",
        eligibleForBaixa: true,
      },
    ],
    purchaseRequests: [],
    divergenceEntries: [],
    history: [],
  };
}

function headersFromFetchCall(call: Parameters<typeof fetch> | undefined): Headers {
  if (call === undefined) return new Headers();
  const initHeaders = call[1]?.headers;
  if (initHeaders !== undefined) return new Headers(initHeaders);
  const requestLike = call[0] as { headers?: HeadersInit };
  return new Headers(requestLike.headers);
}

function pilotUatChecklist(storeId: string, storeName: string) {
  const updatedAt = "2030-01-11T11:00:00.000Z";

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
        state: "pending",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Executar acao fisica compativel no mobile.",
        nextAction: "Resolver risco real e aguardar central.",
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
        state: "pending",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Fechar turno somente apos revalidacao central.",
        nextAction: "Concluir etapas pendentes antes do fechamento seguro.",
        updatedAt,
      },
    ],
  };
}
