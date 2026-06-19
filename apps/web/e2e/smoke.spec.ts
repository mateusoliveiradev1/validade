import { expect, test } from "@playwright/test";

test("web smoke surface is visible and API check is interactive", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Validade Zero" })).toBeVisible();
  await expect(page.getByText("Ambiente seguro para desenvolvimento")).toBeVisible();

  await page.getByRole("button", { name: "Verificar API" }).click();

  await expect(page.getByTestId("api-status")).not.toHaveText("API ainda nao verificada");
});
