import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE } from "@/lib/site";
import { PLANOS } from "@/lib/precos";
import {
  ALT_DA_ASSINATURA,
  IMAGEM_DA_ASSINATURA,
  assinaturaEmDadosEstruturados,
} from "./dados-estruturados";

/**
 * O `Product` de `/precos/` tem a imagem que o Google exige, e ela é a que a
 * página mostra.
 *
 * Irmã de `jornada/produto.guarda.test.ts`: o mesmo defeito, campo `image`
 * ausente, valia para as duas páginas, e nenhuma das duas quebrava nada que
 * tsc, lint ou o navegador mostrassem.
 */

const PAGINA = readFileSync(join("src", "app", "precos", "page.tsx"), "utf8");
const CODIGO = PAGINA.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const fechado = assinaturaEmDadosEstruturados("descrição", false);

describe("a assinatura nos dados estruturados", () => {
  it("tem imagem, com endereço absoluto do próprio site", () => {
    expect(fechado.image).toBe(`${SITE.url}${IMAGEM_DA_ASSINATURA}`);
  });

  it("a imagem existe de verdade", () => {
    expect(existsSync(join("public", IMAGEM_DA_ASSINATURA))).toBe(true);
  });

  it("é a mesma imagem que a página mostra, com o mesmo texto alternativo", () => {
    expect(CODIGO).toContain("src={IMAGEM_DA_ASSINATURA}");
    expect(CODIGO).toContain("alt={ALT_DA_ASSINATURA}");
    expect(ALT_DA_ASSINATURA.length).toBeGreaterThan(40);
  });

  it("a página usa esta montagem, e não um Product escrito à mão", () => {
    expect(CODIGO).toContain("assinaturaEmDadosEstruturados(");
    expect(CODIGO).not.toMatch(/"@type":\s*"Product"/);
  });

  it("um Offer por plano, com a mensalidade de PLANOS", () => {
    expect(fechado.offers).toHaveLength(PLANOS.length);
    for (const [i, plano] of PLANOS.entries()) {
      const oferta = fechado.offers[i];
      const preco = (plano.mensalidadeEmCentavos / 100).toFixed(2);
      expect(oferta.name).toBe(plano.nome);
      expect(oferta.price).toBe(preco);
      expect(oferta.priceSpecification.price).toBe(preco);
    }
  });

  it("o preço é por mês, e o buscador fica sabendo disso", () => {
    // Sem isto, "R$ 59" na busca pareceria pagamento único.
    for (const o of fechado.offers) {
      expect(o.priceSpecification.referenceQuantity).toEqual({
        "@type": "QuantitativeValue", value: 1, unitCode: "MON",
      });
    }
  });

  it("a disponibilidade segue o pagamento", () => {
    for (const o of fechado.offers) expect(o.availability).toBe("https://schema.org/PreOrder");
    for (const o of assinaturaEmDadosEstruturados("", true).offers) {
      expect(o.availability).toBe("https://schema.org/InStock");
    }
  });

  it("não declara política de devolução que a assinatura não tem", () => {
    // Calar o aviso opcional do Google inventando uma regra que o cliente não
    // encontra em lugar nenhum seria pior que o aviso.
    expect(JSON.stringify(fechado)).not.toContain("MerchantReturnPolicy");
  });
});
