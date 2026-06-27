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
} as const;

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
