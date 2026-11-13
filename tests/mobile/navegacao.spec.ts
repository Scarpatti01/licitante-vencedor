import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Os cenários não enviam dados a serviços externos nem criam cadastros reais.
  await page.route(/^https:\/\//, (route) => route.abort());
});

async function semRolagemDaPagina(page: import("@playwright/test").Page) {
  const medidas = await page.evaluate(() => ({ tela: innerWidth, conteudo: document.documentElement.scrollWidth }));
  expect(medidas.conteudo).toBeLessThanOrEqual(medidas.tela + 1);
}

test("home, busca e demonstração cabem na tela", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await semRolagemDaPagina(page);
  const busca = page.getByRole("combobox");
  await busca.fill("Recife");
  await expect(page.getByRole("listbox")).toBeVisible();
  const caixa = await page.getByRole("listbox").boundingBox();
  expect(caixa).not.toBeNull();
  expect(caixa!.x).toBeGreaterThanOrEqual(0);
  expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await busca.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  const demonstracao = page.locator("#demonstracao details");
  await demonstracao.locator("summary").click();
  await expect(demonstracao).toHaveAttribute("open", "");
  await expect(demonstracao).not.toContainText("Não foi possível determinar com segurança");
  await expect(page.locator("#demonstracao")).toContainText("1% na proposta e 5% no contrato");
  await expect(page.locator("#demonstracao")).toContainText("Facultativa");
  await semRolagemDaPagina(page);
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
});

test("comparação de planos rola dentro da tabela", async ({ page }, info) => {
  await page.goto("/precos/");
  const tabela = page.getByRole("region", { name: "Comparação dos planos, com rolagem horizontal" });
  await tabela.scrollIntoViewIfNeeded();
  await semRolagemDaPagina(page);
  await tabela.evaluate((e) => { e.scrollLeft = e.scrollWidth; });
  expect(await tabela.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  await expect(tabela.getByRole("columnheader", { name: "Consultoria", exact: true })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("planos.png"), fullPage: true });
});

test("captura valida e-mail e explica a indisponibilidade", async ({ page }, info) => {
  let pedidos = 0;
  await page.route("**/api/alerta/", async (route) => {
    pedidos++;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ mensagem: "Envio indisponível no cenário de teste." }) });
  });
  await page.goto("/alerta-de-licitacao/");
  const email = page.locator('input[name="email"]').first();
  await email.fill("endereco-invalido");
  const botao = page.getByRole("button", { name: "Receber o convite do teste" }).first();
  await botao.click();
  expect(pedidos).toBe(0);
  await email.fill("mobile-qa@example.com");
  expect(await email.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
  await botao.click();
  await expect(page.getByRole("alert").first()).toContainText("O cadastro ainda não está aberto");
  expect(pedidos).toBe(1);
  await semRolagemDaPagina(page);
  await page.screenshot({ path: info.outputPath("cadastro.png"), fullPage: true });
});
