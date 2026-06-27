import { expect, test } from "@playwright/test";
import { adminSession, installWebFixture } from "./fixtures/v1-readiness";

test("Command Center answers safety first and keeps the operational funnel in order", async ({
  page,
}) => {
  await installWebFixture(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Area de venda segura agora?" })).toBeVisible();
  await expect(page.getByText("Area de venda com bloqueios")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Folhas FICTICIAS - lote FOL-001" }),
  ).toBeVisible();
  await expect(page.getByText("Manga FICTICIA - lote MAN-001")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegacao principal" })).toBeVisible();
  await expect(page.getByText("Ambiente seguro para desenvolvimento")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Command Center" })).toBeFocused();

  const pageText = await page.locator("body").innerText();
  expect(pageText.indexOf("Lotes criticos")).toBeLessThan(pageText.indexOf("Tarefas atrasadas"));
  expect(pageText.indexOf("Tarefas atrasadas")).toBeLessThan(
    pageText.indexOf("Rebaixas pendentes"),
  );
  expect(pageText.indexOf("Folhas FICTICIAS - lote FOL-001")).toBeLessThan(
    pageText.indexOf("Historico resolvido"),
  );
  expect(pageText.indexOf("Historico resolvido")).toBeLessThan(
    pageText.indexOf("Manga FICTICIA - lote MAN-001"),
  );
});

test("role and store scope keep Command Center denied for admin-only access", async ({ page }) => {
  await installWebFixture(page, { session: adminSession });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Convites e vinculos da loja" })).toBeVisible();
  await expect(page.getByText("Lideranca V1 FICTICIA")).toBeVisible();
  await expect(page.getByRole("button", { name: "Command Center" })).toBeDisabled();
  await expect(page.getByText("Escopo operacional indisponivel")).toBeVisible();
});

test("privacy content, audit fallback, and narrow navigation remain reachable", async ({
  page,
}) => {
  await installWebFixture(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Privacidade" }).click();
  await expect(page.getByRole("heading", { name: "Centro de Privacidade" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Solicitacao de direitos LGPD" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar ao produto" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir navegacao" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Auditoria" }).click();
  await expect(page.getByRole("heading", { name: "Auditoria operacional" })).toBeVisible();
});

test("Command Center communicates a recoverable refresh failure", async ({ page }) => {
  await installWebFixture(page, { commandCenterStatus: 503 });
  await page.goto("/");

  await expect(page.getByRole("alert")).toContainText(
    "Nao foi possivel atualizar o Command Center.",
  );
  await expect(
    page.getByRole("button", { name: "Tentar atualizar o Command Center" }),
  ).toBeVisible();
});
