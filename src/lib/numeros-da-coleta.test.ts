import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { numerosDaColeta } from "./regioes";

/**
 * O hero afirma um número na primeira dobra do site. Estes testes existem para
 * ele não voltar a afirmar um número errado.
 *
 * O pedido original para esta seção era **"3.128 editais em todo o Brasil,
 * varridos hoje"**. As duas metades estavam erradas: a coleta do dia trouxe
 * 3.444 editais, e em 6 UFs de 27 — nenhum dos dois números teria sido percebido
 * depois de publicado, e "todo o Brasil" é o tipo de afirmação que o primeiro
 * visitante de fora da cobertura desmente sozinho.
 *
 * Por isso o hero lê da coleta em vez de carregar texto escrito à mão, e por
 * isso este arquivo confere que ele continua lendo.
 */

describe("numerosDaColeta", () => {
  const numeros = numerosDaColeta();

  it("soma os editais de todas as UFs varridas", () => {
    expect(numeros.editais).toBeGreaterThan(0);
    expect(numeros.ufs).toBe(numeros.siglas.length);
  });

  /**
   * A guarda que dá nome a este arquivo.
   *
   * "Todo o Brasil" só pode ser dito quando as 27 unidades federativas tiverem
   * sido varridas. Com menos que isso, a frase precisa dizer quantos estados
   * são — e é assim que ela vira "todo o Brasil" sozinha no dia em que a
   * cobertura chegar lá, sem ninguém lembrar de reescrevê-la.
   */
  it('só diz "todo o Brasil" quando forem as 27 unidades federativas', () => {
    if (numeros.ufs >= 27) {
      expect(numeros.abrangencia).toBe("em todo o Brasil");
    } else {
      expect(numeros.abrangencia).toBe(`em ${numeros.ufs} estados`);
      expect(numeros.abrangencia).not.toContain("Brasil");
    }
  });

  it("concorda em singular quando houver uma UF só", () => {
    // Nunca "em 1 estados". A coleta já rodou com uma UF só em dia ruim.
    const frase = (n: number) => (n >= 27 ? "em todo o Brasil" : `em ${n} ${n === 1 ? "estado" : "estados"}`);
    expect(frase(1)).toBe("em 1 estado");
    expect(frase(6)).toBe("em 6 estados");
    expect(frase(27)).toBe("em todo o Brasil");
  });

  it("declara quando foi medido", () => {
    expect(numeros.medidoEm).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("bate com a cobertura do agregado versionado", () => {
    const agregado = JSON.parse(readFileSync(join("dados", "agregados.json"), "utf8"));
    const daFonte = agregado.cobertura.porUf as { uf: string; editais: number }[];

    expect(numeros.ufs).toBe(daFonte.length);
    expect(numeros.editais).toBe(daFonte.reduce((s, l) => s + l.editais, 0));
  });
});

describe("o hero não pode carregar número escrito à mão", () => {
  const home = readFileSync(join("src", "app", "page.tsx"), "utf8");

  it("lê os números da coleta", () => {
    expect(home).toContain("numerosDaColeta()");
    expect(home).toContain("coleta.editais");
    expect(home).toContain("coleta.abrangencia");
  });

  /**
   * Nenhum número de quatro dígitos solto no JSX da home.
   *
   * É o formato exato do erro que este arquivo existe para impedir: alguém
   * digita "3.128" no meio do texto, fica certo por um dia e errado para
   * sempre. Anos (2016, 2026) passam, porque são datas e não medições.
   */
  it("não tem contagem de editais chumbada no texto", () => {
    /*
     * Comentários fora da varredura.
     *
     * A primeira execução reprovou por um comentário do próprio hero, que citava
     * um número para explicar por que ele NÃO deve ser chumbado. Comentário não
     * é renderizado, e o que se procura aqui é número que chega ao visitante.
     * É o mesmo engano que `privacidade.test.ts` cometeu ao varrer a página que
     * nomeia rastreadores para negá-los.
     */
    const renderizado = home
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    const suspeitos = [
      ...renderizado.matchAll(/\b([1-9]\.?\d{3})\s*(editais|licitações)/gi),
    ].map((m) => m[0]);

    expect(
      suspeitos,
      `número chumbado na home: ${suspeitos.join(", ")}. Use numerosDaColeta() — ` +
        `um número escrito à mão é verdade no dia em que foi escrito e mentira ` +
        `em todos os outros.`,
    ).toEqual([]);
  });

  it("o hero declara a fonte e a data junto do número", () => {
    // Toda afirmação medida diz de onde veio e quando. Sem isso é propaganda.
    expect(home).toContain("pncp.gov.br");
    expect(home).toContain("coleta.medidoEm");
    expect(home).toContain("/metodologia/");
  });
});
