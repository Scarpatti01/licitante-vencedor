import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { resumirCobertura } from "./fontes/cobertura.ts";

/**
 * A junção confere o que foi PEDIDO, e não só o que chegou.
 *
 * ## A falha que não tinha como dar errado
 *
 * A coleta de 26/08 gravou `dados/agregados.json` com 25 UFs, `completa: true` e
 * `ufsComFalha: []`. Faltavam Maranhão e Pernambuco. O workflow pediu as 27; o
 * relatório anunciou "25 de 25 completas".
 *
 * `resumirCobertura(ufsSolicitadas, resultados)` sempre soube marcar como
 * `falha`, com o motivo "não coletada nesta rodada", toda UF pedida que não
 * voltou. A mecânica estava pronta. O defeito era o ARGUMENTO: `juntar-coleta`
 * montava `ufsSolicitadas` percorrendo os shards que achava na pasta.
 *
 * Shard que morre não deixa arquivo. Sem arquivo, a UF não é citada; não sendo
 * citada, não consta como pedida; não constando como pedida, não pode faltar. O
 * pedido era derivado da entrega, e comparar uma lista com ela mesma é sempre
 * verdadeiro — por isso a falha era silenciosa. Não havia nada para dar errado.
 *
 * ## Por que a guarda mora aqui, e não só no teste da cobertura
 *
 * `cobertura.test.ts` prova que a FUNÇÃO acerta, e ela sempre acertou. O que
 * precisava de guarda é o CAMINHO: que a lista chegue de quem pediu. Isso só se
 * vê lendo o YAML, do mesmo jeito que `coleta-versiona-o-que-coletou.test.ts` lê
 * o dele.
 */

const WORKFLOW = ".github/workflows/coletar-pncp-paralelo.yml";
const SCRIPT = "scripts/juntar-coleta.ts";

const yaml = () => readFileSync(WORKFLOW, "utf8");

describe("o workflow diz à junção o que pediu", () => {
  it("o passo da junção passa `--ufs`", () => {
    expect(
      yaml(),
      "Sem `--ufs`, a junção deriva as UFs solicitadas dos shards que encontrou. " +
        "Shard morto não deixa arquivo, a UF nunca é citada, e a rodada se " +
        "declara completa faltando estados — como em 26/08, com MA e PE.",
    ).toMatch(/juntar-coleta\.ts[\s\S]{0,120}--ufs/u);
  });

  it("a lista vem do `planejar`, que é quem pediu", () => {
    /*
     * A fonte importa mais que a presença do parâmetro. Uma segunda lista das
     * 27 escrita à mão no passo da junção passaria no teste acima e voltaria a
     * mentir no dia em que alguém rodasse com `inputs.ufs` reduzido: a matriz
     * coletaria 3 e a conferência cobraria 27.
     *
     * `planejar` existe exatamente para "a matriz e o resumo concordarem",
     * segundo o comentário dele. Esta é a terceira boca a beber da mesma fonte.
     */
    expect(yaml()).toMatch(/needs\.planejar\.outputs\.ufs/u);

    const passo = yaml().slice(yaml().indexOf("Juntar num agregado só"));
    const ateOFim = passo.slice(0, passo.indexOf("\n      - "));
    expect(
      ateOFim,
      "O passo da junção precisa receber a lista do `planejar`, e não uma cópia " +
        "escrita à mão: com `inputs.ufs` reduzido, a cópia cobraria 27 UFs de " +
        "uma rodada que pediu 3.",
    ).toMatch(/needs\.planejar\.outputs\.ufs/u);
  });

  it("o `juntar` depende do `planejar`, senão a saída não existe", () => {
    // `needs` não é só ordem: é o que dá acesso a `outputs`. Sem ele a
    // interpolação vira string vazia, e a junção cai no fallback sem avisar
    // ninguém além do log.
    const job = yaml().slice(yaml().indexOf("\n  juntar:"));
    expect(job.slice(0, job.indexOf("steps:"))).toMatch(/needs:\s*\[[^\]]*planejar/u);
  });
});

describe("a junção sabe ler a lista nos dois formatos", () => {
  /*
   * O `planejar` produz JSON, porque é o que a matriz do Actions consome. Quem
   * roda à mão escreve `AC,AL`. O script aceita os dois para o YAML poder
   * repassar a saída sem traduzir no meio — e é no meio que as duas listas
   * voltariam a divergir.
   */
  const script = () => readFileSync(SCRIPT, "utf8");

  it("aceita JSON e lista separada por vírgula", () => {
    const fonte = script();
    expect(fonte).toMatch(/startsWith\("\["\)/u);
    expect(fonte).toMatch(/split\(","\)/u);
  });

  it("avisa em voz alta quando ninguém disse o que foi pedido", () => {
    // O fallback continua existindo para a execução manual sobre um punhado de
    // shards. O que não pode é ele ser silencioso, que era o estado anterior.
    expect(script()).toMatch(/AVISO: --ufs não foi informado/u);
  });

  it("as UFs que faltaram aparecem no log, e não só no JSON", () => {
    // Ninguém abre um agregado de 30 MB para conferir cobertura. O resumo da
    // execução é onde alguém olha.
    expect(script()).toMatch(/UF\(s\) pedidas e não coletadas/u);
  });
});

describe("a conferência em si, sobre a função", () => {
  it("UF pedida que não voltou é falha, com motivo", () => {
    /*
     * O comportamento que o caminho quebrado escondia. Reproduz 26/08: pediram
     * cinco, três responderam.
     */
    const cobertura = resumirCobertura(
      ["SP", "RJ", "BA", "MA", "PE"],
      [
        { uf: "SP", estado: "completa", editais: 3, motivo: null },
        { uf: "RJ", estado: "completa", editais: 2, motivo: null },
        { uf: "BA", estado: "completa", editais: 1, motivo: null },
      ],
    );

    expect(cobertura.completa).toBe(false);
    expect(cobertura.ufsComFalha.map((c) => c.uf)).toEqual(["MA", "PE"]);
    for (const falha of cobertura.ufsComFalha) {
      expect(falha.motivo).toBe("não coletada nesta rodada");
    }
  });

  it("e a lista derivada de si mesma nunca acusa nada, que era o defeito", () => {
    /*
     * O teste que explica por que o conserto não estava na função. Passando as
     * mesmas três como "solicitadas", ela responde `completa: true` — e está
     * certa: ninguém pediu MA nem PE. A mentira nascia antes, em quem montava
     * o pedido a partir da entrega.
     */
    const entregues = [
      { uf: "SP", estado: "completa" as const, editais: 3, motivo: null },
      { uf: "RJ", estado: "completa" as const, editais: 2, motivo: null },
      { uf: "BA", estado: "completa" as const, editais: 1, motivo: null },
    ];
    const derivada = resumirCobertura(entregues.map((e) => e.uf), entregues);

    expect(derivada.completa).toBe(true);
    expect(derivada.ufsComFalha).toEqual([]);
  });
});
