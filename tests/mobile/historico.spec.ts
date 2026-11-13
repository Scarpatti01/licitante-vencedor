import { test, expect } from "@playwright/test";

test("histórico liga todos os editais e não inventa uma página municipal", async ({ page, request }, info) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  const resposta = await request.get("/sitemap.xml");
  expect(resposta.ok()).toBe(true);
  const urls = [...(await resposta.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const caminhos = urls.map((u) => new URL(u).pathname);
  const posts = caminhos.filter((p) => /^\/licitacoes\/[^/]+\/[^/]+\/[^/]+\/$/.test(p));
  const semPraca = posts.find((p) => !caminhos.includes(p.split("/").slice(0, -2).join("/") + "/"));
  expect(semPraca).toBeDefined();

  await page.goto("/blog/");
  await page.locator('main a[href="/editais-publicados/"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Histórico de editais publicados");
  await expect(page.locator("main")).toContainText("Este é um acervo histórico");
  const lista = page.getByRole("list", { name: "Editais do mais recente ao mais antigo" });
  await expect(lista.getByRole("link")).toHaveCount(posts.length);
  expect(await lista.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))).toEqual(expect.arrayContaining(posts));
  const medidas = await page.evaluate(() => ({ tela: innerWidth, conteudo: document.documentElement.scrollWidth }));
  expect(medidas.conteudo).toBeLessThanOrEqual(medidas.tela + 1);
  await page.screenshot({ path: info.outputPath("historico.png") });

  await lista.locator(`a[href="${semPraca}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const esquemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const trilha = esquemas.flatMap((s) => JSON.parse(s)["@graph"] ?? [])
    .find((s: { "@type": string }) => s["@type"] === "BreadcrumbList");
  expect(trilha).toBeDefined();
  for (const item of trilha.itemListElement) expect(urls).toContain(item.item);
  await page.getByRole("link", { name: "Ver o histórico de editais publicados", exact: true }).click();
  await expect(page).toHaveURL(/\/editais-publicados\/$/);
});
