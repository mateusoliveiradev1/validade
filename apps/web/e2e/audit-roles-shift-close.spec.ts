import { expect, test } from "@playwright/test";
import { commandCenterProjection } from "./fixtures/v1-readiness";

const adminSession = {
  status: "refreshed",
  sessionToken: "b".repeat(32),
  session: {
    actor: { subjectId: "admin-e2e-ficticio", displayName: "Administracao E2E Ficticia" },
    store: { storeId: "loja-e2e-ficticia", storeName: "Loja E2E Ficticia" },
    activeRole: "admin",
    capabilities: ["user.manage"],
    sessionExpiresAt: "2030-01-11T12:00:00.000Z",
    accountStatus: "active",
    canRequestRecovery: true,
    privacyCenterUrl: "/privacy",
    actions: {
      canActOnTask: false,
      canCloseShift: false,
      canReadStoreAudit: false,
      canManageUsers: true,
    },
  },
} as const;

const membership = {
  membershipId: "membership-e2e-ficticia",
  subjectId: "lead-e2e-ficticio",
  displayName: "Lideranca E2E Ficticia",
  role: "lead",
  storeId: "loja-e2e-ficticia",
  storeName: "Loja E2E Ficticia",
  status: "active",
  version: 1,
  createdAt: "2030-01-10T12:00:00.000Z",
  updatedAt: "2030-01-10T12:00:00.000Z",
};

test("admin sees explicit membership scope without implicit shift-close authority", async ({
  page,
}) => {
  await page.route("**/auth/session", (route) => route.fulfill({ json: adminSession }));
  await page.route("**/command-center?*", (route) =>
    route.fulfill({
      json: {
        ...commandCenterProjection,
        storeId: "loja-e2e-ficticia",
        storeName: "Loja E2E Ficticia",
      },
    }),
  );
  await page.route("**/audit/events?*", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/memberships?*", (route) => route.fulfill({ json: { items: [membership] } }));

  await page.goto("/");
  await page.getByRole("button", { name: "Acessos da loja" }).click();

  await expect(page.getByRole("heading", { name: "Convites de acesso fechado" })).toBeVisible();
  await expect(page.getByText("Vinculos por loja")).toBeVisible();
  await expect(page.getByText("Lideranca E2E Ficticia")).toBeVisible();
  await expect(page.getByText(/Nao existe cadastro publico/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Fechar turno" })).toHaveCount(0);
});

test("membership revoke requires an explicit continuity-neutral confirmation", async ({ page }) => {
  await page.route("**/auth/session", (route) => route.fulfill({ json: adminSession }));
  await page.route("**/command-center?*", (route) =>
    route.fulfill({
      json: {
        ...commandCenterProjection,
        storeId: "loja-e2e-ficticia",
        storeName: "Loja E2E Ficticia",
      },
    }),
  );
  await page.route("**/audit/events?*", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/memberships?*", (route) => route.fulfill({ json: { items: [membership] } }));
  await page.route(`**/memberships/${membership.membershipId}/revoke`, (route) =>
    route.fulfill({
      json: { membership: { ...membership, status: "inactive", version: 2 }, replayed: false },
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Acessos da loja" }).click();
  await page.locator("summary", { hasText: "Acoes" }).click();
  await page.getByRole("button", { name: "Revogar vinculo" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "nao encerra nem resolve tarefas abertas",
  );
  await page.getByLabel("Motivo da revogacao").fill("Mudanca de funcao no piloto ficticio.");
  await page.getByRole("button", { name: "Confirmar revogacao" }).click();
  await expect(page.getByText("Revogado")).toBeVisible();
});
