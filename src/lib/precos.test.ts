import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLANOS, O_QUE_INCLUI, O_QUE_NAO_FAZ, emReais, porEmpresa } from "./precos";

const PAGINA = readFileSync(
  join(import.meta.dirname, "..", "app", "precos", "page.tsx"),
  "utf8",
);
const HOME = readFileSync(join(import.meta.dirname, "..", "app", "page.tsx"), "utf8");
const GUIAS = readFileSync(join(import.meta.dirname, "guias.ts"), "utf8");

/** Troca o espaço não separável do formatador por espaço comum. Ver abaixo. */
const semNbsp = (s: string) => s.replace(/\u00a0/g, " ");

describe("os planos", () => {
  it("cobram por número de empresas, e o maior sai mais barato por empresa", () => {
    // O argumento de venda do plano maior é este número. Se a conta inverter,
    // o plano "Consultoria" passa a punir quem traz cinco clientes.
    const [menor, maior] = PLANOS;

    expect(maior.empresas).toBeGreaterThan(menor.empresas);
    expect(maior.mensalidadeEmCentavos / maior.empresas).toBeLessThan(
      menor.mensalidadeEmCentavos / menor.empresas,
    );
  });

  it("formata em reais sem centavos", () => {
    /*
     * `semNbsp` não é preciosismo: `toLocaleString` com BRL separa o símbolo do
     * número com espaço NÃO SEPARÁVEL (U+00A0), e não com espaço comum.
     *
     * A primeira versão deste teste comparava com espaço comum e falhava
     * exibindo "expected 'R$ 800' to be 'R$ 800'" — duas strings idênticas na
     * tela e diferentes na memória. Pior: o teste de mais abaixo, que confere
     * se a página fixa preço na mão, PASSAVA pelo motivo errado, porque o
     * `replace` também usava espaço comum e nunca casava.
     */
    expect(semNbsp(emReais(80_000))).toBe("R$ 800");
    expect(semNbsp(emReais(150_000))).toBe("R$ 1.500");
    expect(semNbsp(porEmpresa(PLANOS[1]))).toBe("R$ 300 por empresa");
  });

  it("tem código estável, que o checkout vai referenciar", () => {
    for (const p of PLANOS) expect(p.codigo).toMatch(/^[a-z-]+$/);
    expect(new Set(PLANOS.map((p) => p.codigo)).size).toBe(PLANOS.length);
  });

  it("declara o que NÃO faz, e não só o que faz", () => {
    /*
     * Página de preço que só lista virtude obriga o leitor a descobrir os
     * limites depois de pagar — e é aí que nasce pedido de reembolso. Este
     * projeto declara limitação em toda superfície; a página que cobra dinheiro
     * não é a exceção.
     */
    expect(O_QUE_NAO_FAZ.length).toBeGreaterThan(0);
    expect(O_QUE_INCLUI.length).toBeGreaterThan(0);
  });
});

describe("a página de preços não promete o que não existe", () => {
  it("diz que ainda não dá para assinar", () => {
    // O dia em que a cobrança abrir, esta seção sai — e o teste cai, obrigando
    // quem ligou o checkout a conferir o resto do texto junto.
    expect(PAGINA).toMatch(/Ainda não dá para assinar/);
  });

  it("marca a oferta como PreOrder, e não InStock", () => {
    /*
     * `InStock` afirmaria ao buscador que dá para comprar agora. O visitante
     * chegaria pelo resultado da busca esperando checkout e encontraria uma
     * lista de espera — decepção que o dado estruturado causou, não a página.
     */
    expect(PAGINA).toMatch(/schema\.org\/PreOrder/);
    expect(PAGINA).not.toMatch(/schema\.org\/InStock/);
  });

  it("não fixa preço na mão: o texto e o `Offer` saem da mesma constante", () => {
    // Preço divergente entre a página e o dado estruturado faz o buscador
    // anunciar um número que a página não pratica.
    for (const p of PLANOS) {
      // Sem `semNbsp` este `replace` nunca casaria, `valor` continuaria com o
      // "R$" na frente, e o teste passaria sem conferir nada.
      const valor = semNbsp(emReais(p.mensalidadeEmCentavos)).replace("R$ ", "");
      expect(
        PAGINA.includes(valor),
        `"${valor}" aparece escrito na página. Use \`PLANOS\` — a página, o ` +
          "`schema.org/Offer` e o futuro checkout precisam ler do mesmo lugar.",
      ).toBe(false);
    }
  });
});

describe("o caminho até os preços existe", () => {
  it("o botão principal da home leva a preços", () => {
    /*
     * A incoerência que o dono apontou: o texto do hero vende a leitura diária
     * comparada ao perfil — o produto PAGO — e o botão entregava o alerta
     * gratuito por cidade, que não lê nada.
     */
    const hero = HOME.slice(HOME.indexOf("mt-10 flex flex-wrap"));
    const primeiroLink = hero.slice(hero.indexOf("href="), hero.indexOf("href=") + 40);

    expect(primeiroLink).toContain("/precos/");
  });

  it("preços está no sitemap", () => {
    // Página que recebe o CTA principal e não entra no sitemap é página que o
    // buscador não acha.
    expect(GUIAS).toMatch(/href: "\/precos\/"/);
  });
});
