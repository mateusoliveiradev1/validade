import type { Page } from "@playwright/test";

export const activeSession = {
  status: "refreshed",
  sessionToken: "a".repeat(32),
  session: {
    actor: { subjectId: "lead-ficticio", displayName: "Lideranca FICTICIA" },
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    activeRole: "lead",
    capabilities: [
      "task.act",
      "command_center.read_store",
      "catalog.review",
      "shift.close",
      "audit.read_store",
    ],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    actions: {
      canReadCommandCenter: true,
      canActOnTask: true,
      canReviewProductDrafts: true,
      canCloseShift: true,
      canReadStoreAudit: true,
      canManageUsers: false,
    },
  },
} as const;

export const adminSession = {
  status: "refreshed",
  sessionToken: "b".repeat(32),
  session: {
    actor: { subjectId: "admin-ficticio", displayName: "Administracao FICTICIA" },
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    activeRole: "admin",
    capabilities: ["catalog.review", "user.manage"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    actions: {
      canReadCommandCenter: false,
      canActOnTask: false,
      canReviewProductDrafts: true,
      canCloseShift: false,
      canReadStoreAudit: false,
      canManageUsers: true,
    },
  },
} as const;

export const membership = {
  membershipId: "membership-v1-ficticia",
  subjectId: "lead-v1-ficticia",
  displayName: "Lideranca V1 FICTICIA",
  role: "lead",
  storeId: "loja-ficticia",
  storeName: "Loja Ficticia Piloto",
  status: "active",
  version: 1,
  createdAt: "2030-01-10T12:00:00.000Z",
  updatedAt: "2030-01-10T12:00:00.000Z",
} as const;

export const commandCenterProjection = {
  storeId: "loja-ficticia",
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
    blockers: ["Ha risco vencido ainda sem confirmacao fisica."],
  },
  criticalLots: [
    {
      lotId: "lot-ficticio-001",
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
      taskId: "task-ficticia-001",
      label: "Retirar FOL-001",
      ownerLabel: "Colaborador FICTICIO",
      dueLabel: "Atrasada",
    },
  ],
  pendingMarkdowns: [],
  pendingProductDrafts: [],
  pendingEvidence: [],
  syncConflicts: [],
  discardedActions: [],
  resolvedHistory: [
    {
      taskId: "task-resolvida-ficticia-001",
      label: "Manga FICTICIA - lote MAN-001",
      actionLabel: "Retirada confirmada",
      actorLabel: "Lideranca FICTICIA",
      resolvedAt: "2030-01-10T11:35:00.000Z",
      detail: "Retirada conferida na area de venda.",
    },
  ],
  pendingShiftCloses: [],
  shiftHistory: [],
  devices: [
    {
      deviceIdMasked: "moto...018",
      deviceLabel: "Moto G Lideranca Loja 18",
      activeUserLabel: "Lideranca FICTICIA",
      storeId: "loja-ficticia",
      storeName: "Loja Ficticia Piloto",
      appVersion: "0.12.0",
      appBuild: "133",
      environment: "staging",
      apiTarget: "https://api.ficticia.invalid",
      buildCompatibility: "atual",
      approvedArtifactLabel: "uat15-syncfix-apk-133",
      approvedAppVersion: "0.12.0",
      approvedBuild: "133",
      lastForegroundAt: "2030-01-10T11:58:00.000Z",
      lastSyncAt: "2030-01-10T11:57:00.000Z",
      lastCentralReadAt: "2030-01-10T11:56:00.000Z",
      pushPermission: "granted",
      pushProviderState: "remote_ready",
      cameraPermission: "granted",
      verdict: "apto",
      blockers: [],
      nextAction: "Aparelho apto para iniciar UAT guiado.",
      updatedAt: "2030-01-10T12:00:00.000Z",
    },
  ],
  pilotUat: pilotUatChecklist("loja-ficticia", "Loja Ficticia Piloto"),
  pilotBlockers: pilotBlockers(),
} as const;

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
      blockerId: "shift-close-blocked",
      category: "shift_close",
      severity: "critical",
      ownership: "operator",
      label: "Fechamento inseguro pendente",
      cause: "Ha etapas UAT pendentes.",
      nextAction: "Concluir etapas pendentes antes do fechamento seguro.",
      affectedLabel: "Fechamento de turno",
      evidenceReferenceLabel: "Fechamento bloqueado",
      updatedAt,
    },
  ];
}

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

export async function installWebFixture(
  page: Page,
  input?: { commandCenterStatus?: number; session?: typeof activeSession | typeof adminSession },
) {
  await page.route("**/auth/session", async (route) => {
    await route.fulfill({ json: input?.session ?? activeSession });
  });
  await page.route("**/command-center?*", async (route) => {
    if (input?.commandCenterStatus !== undefined) {
      await route.fulfill({
        status: input.commandCenterStatus,
        json: { error: "fixture_failure" },
      });
      return;
    }
    await route.fulfill({ json: commandCenterProjection });
  });
  await page.route("**/audit/events?*", async (route) => {
    await route.fulfill({ json: { items: [] } });
  });
  await page.route("**/memberships?*", async (route) => {
    await route.fulfill({ json: { items: [membership] } });
  });
}
