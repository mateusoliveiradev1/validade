import type { Page } from "@playwright/test";

export const activeSession = {
  status: "refreshed",
  sessionToken: "a".repeat(32),
  session: {
    actor: { subjectId: "lead-ficticio", displayName: "Lideranca FICTICIA" },
    store: { storeId: "loja-ficticia", storeName: "Loja Ficticia Piloto" },
    activeRole: "lead",
    capabilities: ["task.act", "shift.close", "audit.read_store"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    actions: {
      canActOnTask: true,
      canCloseShift: true,
      canReadStoreAudit: true,
      canManageUsers: false,
    },
  },
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
  pendingEvidence: [],
  syncConflicts: [],
  pendingShiftCloses: [],
  shiftHistory: [],
} as const;

export async function installWebFixture(page: Page, input?: { commandCenterStatus?: number }) {
  await page.route("**/auth/session", async (route) => {
    await route.fulfill({ json: activeSession });
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
}
