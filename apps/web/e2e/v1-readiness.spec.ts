import { expect, test } from "@playwright/test";
import { adminSession, installWebFixture } from "./fixtures/v1-readiness";

test("operational readiness routes keep each truth in its own room", async ({ page }) => {
  await installWebFixture(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Area de venda segura agora?" })).toBeVisible();
  await expect(page.getByText("Area de venda com bloqueios")).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Navegacao principal" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Operacao", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Aparelhos", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Atualizacoes", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Validacao", exact: true })).toBeVisible();
  await expect(
    page.getByText("Folhas FICTICIAS - lote FOL-001", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Manga FICTICIA - lote MAN-001")).toBeVisible();
  await expect(page.getByText("Ambiente seguro para desenvolvimento")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("button", { name: "Operacao", exact: true })).toBeFocused();

  const pageText = await page.locator("body").innerText();
  expect(pageText).not.toContain("UAT Loja 18");
  expect(pageText).not.toContain("uat22-cloud-first-sync-apk-152");
  expect(pageText).not.toContain("Provider push sem prova atual");
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

  await navigation.getByRole("button", { name: "Aparelhos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Aparelhos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aparelhos em uso no turno" })).toBeVisible();
  await expect(page.getByText("Moto G Lideranca Loja 18")).toBeVisible();
  await expect(page.getByText("Operador: Lideranca FICTICIA. ID seguro: moto...018")).toBeVisible();
  await expect(page.getByText("Build aprovado").first()).toBeVisible();
  await expect(page.getByText("UAT Loja 18")).toHaveCount(0);
  await expect(page.getByText("Ver instrucoes manuais")).toHaveCount(0);

  await navigation.getByRole("button", { name: "Atualizacoes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Atualizacoes" })).toBeVisible();
  await expect(page.getByText("uat22-cloud-first-sync-apk-152")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver instrucoes manuais" })).toBeVisible();
  await expect(page.getByText("UAT Loja 18")).toHaveCount(0);
  await expect(page.getByText("Enviar teste seguro")).toHaveCount(0);

  await navigation.getByRole("button", { name: "Validacao", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Validacao", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Atualizar prova da validacao" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No-Go" })).toBeVisible();
  await expect(page.getByText(/No-Go: Fechamento inseguro pendente/)).toBeVisible();
  await expect(
    page.getByText("Concluir etapas pendentes antes do fechamento seguro.").first(),
  ).toBeVisible();
  await expect(page.getByText("UAT Loja 18")).toHaveCount(2);
  await expect(page.getByText("Provider push sem prova atual")).toBeVisible();
  await expect(page.getByText("Provider bloqueado externamente")).toHaveCount(2);
  await expect(page.getByText("Produto real usado no teste", { exact: true })).toBeVisible();
  await expect(page.getByText("Produto ficticio ou seed nao passa esta etapa.")).toBeVisible();
  await expect(page.getByText("Aparelho Loja 18 #1")).toBeVisible();
  await expect(page.getByText("moto...018 - Lideranca Loja 18")).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir Aparelhos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir Atualizacoes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir Operacao" })).toBeVisible();
  await expect(page.getByText("uat22-cloud-first-sync-apk-152")).toHaveCount(0);
  await expect(page.getByText("Enviar teste seguro")).toHaveCount(0);
  await expect(page.getByText("Ver instrucoes manuais")).toHaveCount(0);

  const sequenceText = await page
    .getByRole("region", { name: "Sequencia obrigatoria da UAT Loja 18" })
    .innerText();
  expect(sequenceText.indexOf("Turno preparado")).toBeLessThan(
    sequenceText.indexOf("Produto real usado no teste"),
  );
  expect(sequenceText.indexOf("Produto real usado no teste")).toBeLessThan(
    sequenceText.indexOf("Lote real registrado"),
  );
  expect(sequenceText.indexOf("Lote real registrado")).toBeLessThan(
    sequenceText.indexOf("Resolucao terminal registrada"),
  );
  expect(sequenceText.indexOf("Resolucao terminal registrada")).toBeLessThan(
    sequenceText.indexOf("Segundo aparelho conferiu os mesmos fatos"),
  );
  expect(sequenceText.indexOf("Segundo aparelho conferiu os mesmos fatos")).toBeLessThan(
    sequenceText.indexOf("Command Center consistente"),
  );
  expect(sequenceText.indexOf("Command Center consistente")).toBeLessThan(
    sequenceText.indexOf("Push seguro recebido no aparelho aprovado"),
  );
  expect(sequenceText.indexOf("Push seguro recebido no aparelho aprovado")).toBeLessThan(
    sequenceText.indexOf("Camera ou fallback operacional comprovado"),
  );
  expect(sequenceText.indexOf("Camera ou fallback operacional comprovado")).toBeLessThan(
    sequenceText.indexOf("Fechamento seguro do turno"),
  );
  const validationText = await page.locator("body").innerText();
  expect(validationText).not.toMatch(
    /token|secret|password|ExpoPushToken|buildUrl|rawDeviceId|providerTicket|providerReceipt|objectKey|photoUri|base64/i,
  );
});

test("role and store scope keep operational routes denied for admin-only access", async ({
  page,
}) => {
  await installWebFixture(page, { session: adminSession });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Convites, papeis e pessoas autorizadas" }),
  ).toBeVisible();
  await expect(page.getByText("Lideranca V1 FICTICIA")).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Navegacao principal" });
  await expect(navigation.getByRole("button", { name: "Operacao", exact: true })).toBeDisabled();
  await expect(navigation.getByRole("button", { name: "Aparelhos", exact: true })).toBeDisabled();
  await expect(
    navigation.getByRole("button", { name: "Atualizacoes", exact: true }),
  ).toBeDisabled();
  await expect(navigation.getByRole("button", { name: "Validacao", exact: true })).toBeDisabled();
  await expect(navigation.getByText("Escopo operacional indisponivel")).toHaveCount(4);
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

test("Operacao communicates a recoverable refresh failure", async ({ page }) => {
  await installWebFixture(page, { commandCenterStatus: 503 });
  await page.goto("/");

  await expect(page.getByRole("alert")).toContainText(
    "Nao foi possivel atualizar a leitura da loja.",
  );
  await expect(page.getByRole("button", { name: "Tentar atualizar agora" })).toBeVisible();
});
