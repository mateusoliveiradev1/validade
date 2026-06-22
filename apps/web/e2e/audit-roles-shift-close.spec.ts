import { expect, test } from "@playwright/test";

const adminContext = {
  actor: { subjectId: "admin-e2e-ficticio", displayName: "Administracao E2E Ficticia" },
  store: { storeId: "loja-e2e-ficticia", storeName: "Loja E2E Ficticia" },
  activeRole: "admin",
  capabilities: ["user.manage"],
  actions: {
    canActOnTask: false,
    canCloseShift: false,
    canReadStoreAudit: false,
    canManageUsers: true,
  },
};

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
  await page.route("**/session/context?*", (route) => route.fulfill({ json: adminContext }));
  await page.route("**/audit/events?*", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/memberships?*", (route) => route.fulfill({ json: { items: [membership] } }));

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Novo vinculo operacional" })).toBeVisible();
  await expect(page.getByText("Vinculos por loja")).toBeVisible();
  await expect(page.getByText("Lideranca E2E Ficticia")).toBeVisible();
  await page.locator("select").first().selectOption("admin");
  await expect(page.getByText(/Administracao governa vinculos/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Fechar turno" })).toHaveCount(0);
});

test("membership revoke requires an explicit continuity-neutral confirmation", async ({ page }) => {
  await page.route("**/session/context?*", (route) => route.fulfill({ json: adminContext }));
  await page.route("**/audit/events?*", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/memberships?*", (route) => route.fulfill({ json: { items: [membership] } }));
  await page.route(`**/memberships/${membership.membershipId}/revoke`, (route) =>
    route.fulfill({
      json: { membership: { ...membership, status: "inactive", version: 2 }, replayed: false },
    }),
  );

  await page.goto("/");
  await page.locator("summary", { hasText: "Acoes" }).click();
  await page.getByRole("button", { name: "Revogar vinculo" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "nao encerra nem resolve tarefas abertas",
  );
  await page.getByRole("button", { name: "Confirmar revogacao" }).click();
  await expect(page.getByText("Revogado")).toBeVisible();
});
