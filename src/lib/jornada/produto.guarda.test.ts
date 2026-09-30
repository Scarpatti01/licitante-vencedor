import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE } from "@/lib/site";
import { FAQ } from "@/components/venda/copy-da-jornada";
import { OFERTA } from "./oferta";
import { IMAGEM_DO_PRODUTO, produtoEmDadosEstruturados } from "./produto";

/**
 * O `Product` de `/jornada/` continua elegível para o resultado de produto.
 *
 * Em 30/09/2026 o Search Console marcou a página com erro crítico: o campo
 * `image` não existia. Nada no site quebrava. Não reprova tsc, não reprova
 * lint, a página abre igual, e o único sintoma é a busca deixar de mostrar
 * preço e garantia. É o tipo de defeito que só aparece quando alguém abre o
 * Search Console, semanas depois.
 */

const PAGINA = readFileSync(join("src", "app", "jornada", "page.tsx"), "utf8");

/** O fonte sem comentários, para a guarda não achar o texto que a explica. */
const semComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const CODIGO = semComentarios(PAGINA);

const produto = produtoEmDadosEstruturados(true, "descrição");

describe("o produto de /jornada/ nos dados estruturados", () => {
  it("tem imagem, com endereço absoluto do próprio site", () => {
    expect(produto.image).toBe(`${SITE.url}${IMAGEM_DO_PRODUTO}`);
    expect(produto.image.startsWith("https://")).toBe(true);
  });

  it("a imagem existe de verdade", () => {
    // Um caminho que não existe é pior que nenhum: o Google baixa, recebe 404,
    // e o erro volta com outro nome.
    expect(existsSync(join("public", IMAGEM_DO_PRODUTO))).toBe(true);
  });

  it("é a mesma imagem que a página mostra", () => {
    // O Google exige que a imagem seja a do produto exibido. Com o caminho
    // repetido à mão, alguém troca a arte da página e esquece o JSON.
    expect(CODIGO).toContain("src={IMAGEM_DO_PRODUTO}");
    expect(CODIGO).not.toContain('"/workbook-do-licitante-produto.webp"');
  });

  it("a página usa este produto, e não um escrito à mão", () => {
    expect(CODIGO).toContain("produtoEmDadosEstruturados(");
    expect(CODIGO).not.toMatch(/"@type":\s*"Product"/);
  });

  it("a devolução é a garantia que a página promete", () => {
    const politica = produto.offers.hasMerchantReturnPolicy;
    expect(politica.merchantReturnDays).toBe(OFERTA.diasDeGarantia);
    expect(politica.applicableCountry).toBe("BR");

    const garantia = FAQ.find((f) => /garantia/i.test(f.resposta));
    expect(garantia, "o FAQ deixou de falar da garantia").toBeDefined();
    expect(garantia!.resposta).toContain(`${OFERTA.diasDeGarantia} dias`);
  });

  it("a entrega é digital: sem custo e na hora", () => {
    const envio = produto.offers.shippingDetails;
    expect(envio.shippingRate.value).toBe(0);
    expect(envio.deliveryTime.handlingTime.maxValue).toBe(0);
    expect(envio.deliveryTime.transitTime.maxValue).toBe(0);
  });

  it("preço e disponibilidade seguem a oferta", () => {
    expect(produto.offers.price).toBe(String(OFERTA.preco));
    expect(produtoEmDadosEstruturados(false, "").offers.availability).toBe("https://schema.org/PreOrder");
  });
});
