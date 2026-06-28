import { describe, expect, it } from "vitest";
import {
  CommandCenterProjectionSchema,
  PilotUatChecklistSchema,
  PilotDeviceReadinessSchema,
  resolvePilotBuildCompatibility,
  type PilotUatChecklist,
} from "./command-center";

describe("Command Center contracts", () => {
  it("requires structured cause data for critical lots", () => {
    const parsed = CommandCenterProjectionSchema.parse({
      storeId: "loja-ficticia",
      storeName: "Loja Ficticia Piloto",
      refreshedAt: "2030-01-10T12:00:00.000Z",
      freshness: "current",
      verdict: {
        state: "blocked",
        title: "Area de venda com bloqueio",
        detail: "Ha risco vencido ainda sem confirmacao fisica.",
      },
      centralSnapshot: {
        source: "central",
        readiness: "blocked",
        cacheState: "ready",
        productCount: 1,
        draftProductCount: 0,
        lotCount: 1,
        activeTaskCount: 1,
        conflictCount: 0,
        discardedActionCount: 0,
        resolvedHistoryCount: 1,
        pendingCommandCount: 0,
        lastCentralReadAt: "2030-01-10T12:00:00.000Z",
        lastHydratedAt: "2030-01-10T12:00:00.000Z",
        blockers: [],
      },
      criticalLots: [
        {
          lotId: "lot-ficticio-001",
          label: "Folhas FICTICIAS - lote FOL-001",
          locationLabel: "Area de venda",
          reason: "Lote vencido precisa de retirada.",
          cause: {
            code: "formal_expiry_passed",
            label: "Prazo formal ja passou",
            detail: "Lote vencido ainda nao tem confirmacao central de retirada.",
            actionLabel: "Retirar, registrar destino e reconferir a gondola",
            riskState: "expired",
            requiredResolution: "withdraw_or_loss",
            responsibleLabel: "Colaborador FICTICIO",
            sourceEventId: "audit-sync-ficticio-001",
            sourceEventSummary: "Sync de tarefa vencida falhou.",
            firstDetectedAt: "2030-01-10T10:00:00.000Z",
            lastObservedAt: "2030-01-10T10:05:00.000Z",
            lastAttemptedAt: "2030-01-10T10:10:00.000Z",
          },
        },
      ],
      overdueTasks: [],
      pendingMarkdowns: [],
      pendingProductDrafts: [],
      pendingEvidence: [],
      syncConflicts: [],
      discardedActions: [],
      resolvedHistory: [
        {
          taskId: "task-resolvida-001",
          label: "Folhas FICTICIAS - lote FOL-001",
          actionLabel: "withdraw",
          actorLabel: "Colaborador FICTICIO",
          resolvedAt: "2030-01-10T11:00:00.000Z",
          detail: "Resolvido com confirmacao central.",
        },
      ],
      pendingShiftCloses: [],
      shiftHistory: [],
      devices: [],
      pilotUat: pilotUatChecklist(),
    });

    expect(parsed.criticalLots[0]?.cause).toMatchObject({
      code: "formal_expiry_passed",
      riskState: "expired",
      sourceEventId: "audit-sync-ficticio-001",
    });
    expect(parsed.resolvedHistory[0]?.taskId).toBe("task-resolvida-001");
  });

  it("accepts only the three operational pilot device verdicts", () => {
    for (const verdict of ["apto", "atencao", "bloqueado"] as const) {
      expect(
        PilotDeviceReadinessSchema.parse(
          deviceReadiness({
            verdict,
            blockers:
              verdict === "apto"
                ? []
                : [
                    {
                      code:
                        verdict === "bloqueado"
                          ? "missing_first_central_read"
                          : "old_build_attention",
                      label:
                        verdict === "bloqueado"
                          ? "Sem primeira leitura central"
                          : "Build antigo em observacao",
                      detail:
                        verdict === "bloqueado"
                          ? "O aparelho ainda nao recebeu fatos centrais desta loja."
                          : "O APK ainda sincroniza, mas nao e a versao aprovada do UAT.",
                      nextAction:
                        verdict === "bloqueado"
                          ? "Abrir Preparar turno no aparelho autorizado."
                          : "Atualizar antes de provar etapa critica do piloto.",
                      severity: verdict === "bloqueado" ? "blocking" : "warning",
                    },
                  ],
          }),
        ),
      ).toMatchObject({ verdict });
    }

    expect(() => PilotDeviceReadinessSchema.parse(deviceReadiness({ verdict: "ready" }))).toThrow();
  });

  it("keeps pilot device blockers causal and public-safe", () => {
    const parsed = PilotDeviceReadinessSchema.parse(
      deviceReadiness({
        lastCentralReadAt: undefined,
        pushPermission: "denied",
        pushProviderState: "token_invalid",
        cameraPermission: "denied",
        verdict: "bloqueado",
        blockers: [
          {
            code: "invalid_store_or_user",
            label: "Usuario ou loja invalida",
            detail: "A sessao nao confirma uma loja ativa para este aparelho.",
            nextAction: "Revalidar convite, loja e papel antes do UAT.",
            severity: "blocking",
          },
          {
            code: "missing_first_central_read",
            label: "Sem primeira leitura central",
            detail: "O aparelho ainda nao recebeu produtos, lotes ou tarefas da central.",
            nextAction: "Abrir Preparar turno com internet e sessao ativa.",
            severity: "blocking",
          },
          {
            code: "stale_critical_sync",
            label: "Sync critico desatualizado",
            detail: "Existe pendencia critica sem leitura recente suficiente.",
            nextAction: "Sincronizar e revisar conflito antes do piloto.",
            severity: "blocking",
          },
          {
            code: "push_required_without_push",
            label: "Push remoto indisponivel",
            detail: "A etapa atual precisa provar push remoto e o aparelho nao esta pronto.",
            nextAction: "Conceder permissao, reinstalar APK nativo ou revisar credencial.",
            severity: "blocking",
          },
          {
            code: "camera_required_without_camera",
            label: "Camera bloqueada",
            detail: "A etapa de evidencia exige camera e a permissao esta negada.",
            nextAction: "Conceder permissao de camera ou registrar bloqueio externo.",
            severity: "blocking",
          },
        ],
      }),
    );

    expect(parsed.blockers.map((blocker) => blocker.code)).toEqual([
      "invalid_store_or_user",
      "missing_first_central_read",
      "stale_critical_sync",
      "push_required_without_push",
      "camera_required_without_camera",
    ]);
    expect(JSON.stringify(parsed)).not.toMatch(/pushToken|expoPushToken|rawDeviceId|buildUrl/i);
    expect(() =>
      PilotDeviceReadinessSchema.parse({
        ...deviceReadiness(),
        pushToken: "ExpoPushToken[ficticio]",
      }),
    ).toThrow();
  });

  it("compares device build only against the approved staging artifact", () => {
    const approved = { approvedAppVersion: "0.12.0", approvedBuild: "120" };

    expect(
      resolvePilotBuildCompatibility({
        ...approved,
        appVersion: "0.12.0",
        appBuild: "120",
      }),
    ).toBe("atual");
    expect(
      resolvePilotBuildCompatibility({
        ...approved,
        appVersion: "0.11.0",
        appBuild: "110",
      }),
    ).toBe("desatualizado");
    expect(
      resolvePilotBuildCompatibility({
        ...approved,
        appVersion: "0.13.0",
        appBuild: "130",
      }),
    ).toBe("incompativel");
    expect(
      resolvePilotBuildCompatibility({
        ...approved,
        appVersion: "0.12.0",
      }),
    ).toBe("desconhecido");
  });

  it("requires the guided Loja 18 UAT checklist to cover every real pilot step once", () => {
    const parsed = PilotUatChecklistSchema.parse(pilotUatChecklist());
    const checklist = pilotUatChecklist();
    const firstStep = checklist.steps[0];

    if (firstStep === undefined) {
      throw new Error("Fixture should include a first UAT step.");
    }

    expect(parsed.steps.map((step) => step.stepId)).toEqual([
      "prepare_turn",
      "product_real_input",
      "lot_registration",
      "terminal_resolution",
      "second_device_convergence",
      "command_center_consistency",
      "safe_push_test",
      "camera_evidence_or_fallback",
      "shift_close",
    ]);
    expect(() =>
      PilotUatChecklistSchema.parse({
        ...checklist,
        steps: [...checklist.steps.slice(0, -1), firstStep],
      }),
    ).toThrow();
  });

  it("keeps UAT blockers causal and evidence references public-safe", () => {
    expect(() =>
      PilotUatChecklistSchema.parse({
        ...pilotUatChecklist(),
        steps: pilotUatChecklist().steps.map((step) =>
          step.stepId === "safe_push_test"
            ? {
                ...step,
                state: "external_blocked",
                cause: "Provider ainda sem aparelho Android aprovado.",
                evidenceReferenceLabel: "https://expo.dev/artifacts/secret-token",
              }
            : step,
        ),
      }),
    ).toThrow();

    expect(() =>
      PilotUatChecklistSchema.parse({
        ...pilotUatChecklist(),
        steps: pilotUatChecklist().steps.map((step) =>
          step.stepId === "shift_close"
            ? {
                ...step,
                state: "blocked",
                cause: undefined,
                nextAction: undefined,
              }
            : step,
        ),
      }),
    ).toThrow();
  });
});

function deviceReadiness(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...baseDeviceReadiness(),
    ...overrides,
  };
}

function baseDeviceReadiness() {
  return {
    deviceIdMasked: "apar...001",
    deviceLabel: "Moto G da Lideranca",
    activeUserLabel: "Lider FICTICIA",
    storeId: "loja-ficticia",
    storeName: "Loja Ficticia Piloto",
    appVersion: "0.12.0",
    appBuild: "120",
    environment: "staging",
    apiTarget: "https://api.ficticia.invalid",
    buildCompatibility: "atual" as const,
    approvedArtifactLabel: "phase-12-staging-apk-120",
    approvedAppVersion: "0.12.0",
    approvedBuild: "120",
    lastForegroundAt: "2030-01-10T11:59:00.000Z",
    lastSyncAt: "2030-01-10T11:58:00.000Z",
    lastCentralReadAt: "2030-01-10T11:57:00.000Z",
    pushPermission: "granted" as const,
    pushProviderState: "remote_ready" as const,
    cameraPermission: "granted" as const,
    verdict: "apto" as const,
    blockers: [],
    nextAction: "Aparelho apto para iniciar UAT guiado.",
    updatedAt: "2030-01-10T12:00:00.000Z",
  };
}

function pilotUatChecklist(overrides: Partial<PilotUatChecklist> = {}): PilotUatChecklist {
  const updatedAt = "2030-01-10T12:00:00.000Z";

  return PilotUatChecklistSchema.parse({
    title: "UAT Loja 18",
    storeId: "loja-18",
    storeName: "Loja 18 - Staging",
    summary: "Checklist publico seguro para executar UAT real da Loja 18.",
    updatedAt,
    steps: [
      {
        stepId: "prepare_turn",
        label: "Preparar turno",
        state: "passed",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Abrir Preparar turno no APK aprovado.",
        evidenceReferenceLabel: "Leitura central registrada",
        occurredAt: updatedAt,
        updatedAt,
      },
      {
        stepId: "product_real_input",
        label: "Produto real da Loja 18",
        state: "pending",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Cadastrar ou reutilizar produto real informado pelo usuario.",
        nextAction: "Usar produto real; produto ficticio nao passa UAT.",
        updatedAt,
      },
      {
        stepId: "lot_registration",
        label: "Lote real registrado",
        state: "pending",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Registrar lote real do produto escolhido.",
        nextAction: "Registrar lote real; lote ficticio nao passa UAT.",
        updatedAt,
      },
      {
        stepId: "terminal_resolution",
        label: "Resolucao terminal",
        state: "pending",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Executar acao fisica compativel.",
        updatedAt,
      },
      {
        stepId: "second_device_convergence",
        label: "Segundo aparelho",
        state: "pending",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Preparar turno em outro aparelho/conta.",
        updatedAt,
      },
      {
        stepId: "command_center_consistency",
        label: "Command Center consistente",
        state: "pending",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Comparar central, Hoje e historico resolvido.",
        updatedAt,
      },
      {
        stepId: "safe_push_test",
        label: "Teste seguro de push",
        state: "external_blocked",
        ownerLabel: "Lideranca Loja 18",
        actionLabel: "Enviar teste seguro para aparelho aprovado.",
        cause: "Sem prova de provider Android nesta execucao.",
        nextAction: "Conectar aparelho aprovado e repetir o teste seguro.",
        evidenceReferenceLabel: "Provider bloqueado externamente",
        updatedAt,
      },
      {
        stepId: "camera_evidence_or_fallback",
        label: "Camera ou fallback",
        state: "external_blocked",
        ownerLabel: "Operacao Loja 18",
        actionLabel: "Validar camera ou motivo sem foto.",
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
        cause: "Ainda ha etapas UAT pendentes.",
        nextAction: "Concluir produto, lote, resolucao e convergencia antes do fechamento seguro.",
        updatedAt,
      },
    ],
    ...overrides,
  });
}
