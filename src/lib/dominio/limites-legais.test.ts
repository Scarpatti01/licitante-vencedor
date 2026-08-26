import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DISPENSA_POR_VALOR,
  DOBRAM_O_LIMITE,
  REAJUSTE_VIGENTE,
  emReais,
  vigenciaPorExtenso,
} from "./limites-legais.ts";

describe("os valores carregam a própria procedência", () => {
  /*
   * A regra que este arquivo inteiro serve: número legal sem decreto e sem data
   * é número que envelhece em silêncio. O guia dizia "R$ 100 mil / R$ 50 mil"
   * — os valores de 2021 — e mandava o leitor conferir o decreto vigente em
   * outro lugar. Quem confiasse usaria R$ 50 mil onde o limite real é
   * R$ 65.492,11, e concluiria que uma contratação cabia em dispensa quando não
   * cabia. Em guia de licitação, isso não é erro editorial: é conselho errado.
   */
  it("decreto, data e percentual existem juntos", () => {
    expect(REAJUSTE_VIGENTE.decreto).toMatch(/Decreto nº \d+\.\d+\/\d{4}/);
    expect(REAJUSTE_VIGENTE.vigenteDesde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(REAJUSTE_VIGENTE.percentual).toBeGreaterThan(0);
  });

  it("o ano declarado é o ano em que o reajuste passou a valer", () => {
    // Decreto novo com ano velho é o erro que passa despercebido na virada de
    // janeiro, quando só metade dos campos é trocada.
    expect(REAJUSTE_VIGENTE.ano).toBe(Number(REAJUSTE_VIGENTE.vigenteDesde.slice(0, 4)));
  });

  it("a vigência por extenso usa o ordinal só no dia 1º", () => {
    // Em português, "1º de janeiro" mas "15 de janeiro". A primeira versão da
    // função escrevia "15º".
    expect(vigenciaPorExtenso()).toBe("1º de janeiro de 2026");
  });
});

describe("os limites do art. 75", () => {
  it("obras custa mais que compras, e os dois têm centavos", () => {
    /*
     * Centavos, e não arredondado: o decreto publica com centavos, e arredondar
     * criaria diferença entre o que o site diz e o que o órgão aplica bem no
     * ponto em que a contratação cabe ou não cabe na dispensa.
     */
    expect(DISPENSA_POR_VALOR.obrasEEngenharia).toBeGreaterThan(
      DISPENSA_POR_VALOR.comprasEServicos,
    );
    for (const valor of Object.values(DISPENSA_POR_VALOR)) {
      expect(Math.round(valor) === valor).toBe(false);
    }
  });

  it("obras NÃO é exatamente o dobro de compras", () => {
    /*
     * Parece que deveria ser, e não é: dobrar 65.492,11 dá 130.984,22, e o
     * decreto fixou 130.984,20. Dois centavos de diferença, por arredondamento
     * na fonte.
     *
     * A guarda existe para ninguém "consertar" isso derivando um valor do outro.
     * Os dois vêm do decreto, cada um por si, e é assim que continuam vindo.
     */
    expect(DISPENSA_POR_VALOR.obrasEEngenharia).not.toBe(
      DISPENSA_POR_VALOR.comprasEServicos * 2,
    );
  });

  it("a exceção do dobro está escrita, porque é a que mais confunde", () => {
    // Fornecedor que atende consórcio intermunicipal — comum em saúde e em
    // resíduos — trabalha com o dobro sem saber.
    expect(DOBRAM_O_LIMITE).toMatch(/consórcio público/);
    expect(DOBRAM_O_LIMITE).toMatch(/agência executiva/);
  });

  it("formata em real brasileiro", () => {
    expect(emReais(65_492.11)).toContain("65.492,11");
    expect(emReais(65_492.11)).toContain("R$");
  });
});

describe("nenhuma página escreve estes valores à mão", () => {
  /*
   * A mesma lição de `precos.ts` e de `cobertura.ts`, agora para número de lei.
   *
   * Fixado em prosa, o valor não envelhece com barulho: envelhece em silêncio.
   * O guia da Lei 14.133 carregou os valores de 2021 por cinco anos sem que
   * nenhum teste reclamasse, porque "R$ 100 mil" é uma string perfeitamente
   * válida.
   */
  function paginas(raiz: string): string[] {
    const achados: string[] = [];
    for (const nome of readdirSync(raiz)) {
      const caminho = join(raiz, nome);
      if (statSync(caminho).isDirectory()) achados.push(...paginas(caminho));
      else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) achados.push(caminho);
    }
    return achados;
  }

  const ARQUIVOS = [...paginas("src/app"), ...paginas("src/lib/blog/artigos")];

  it("olha um conjunto de arquivos que não é vazio", () => {
    expect(ARQUIVOS.length).toBeGreaterThan(20);
  });

  it("nenhuma cifra escrita à mão perto de uma citação do art. 75", () => {
    /*
     * Por JANELA DE LINHAS, e não por frase.
     *
     * A primeira versão desta guarda conferia frase a frase e NÃO mordeu quando
     * injetei o defeito: numa tabela JSX, o valor e o `"Art. 75, II"` moram em
     * linhas diferentes do mesmo array, então nenhuma "frase" continha os dois.
     * A guarda passou verde sobre exatamente o que existia para pegar.
     *
     * A janela também não pode ser o arquivo inteiro: o artigo 75 é citado em
     * páginas que falam de dinheiro por outros motivos legítimos — a tabela de
     * faixas de valor dos editais coletados, que é medição nossa e não limite
     * legal.
     */
    const JANELA = 6;
    const culpados: string[] = [];

    for (const caminho of ARQUIVOS) {
      const linhas = readFileSync(caminho, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ")
        .split("\n");

      linhas.forEach((linha, i) => {
        if (!/art(igo)?\.?\s*75/i.test(linha)) return;
        const inicio = Math.max(0, i - JANELA);
        const vizinhanca = linhas.slice(inicio, i + JANELA + 1);
        // `emReais(...)` é chamada, não literal — é o que se quer ver.
        const cifra = vizinhanca.find((l) => /R\$\s*\d/.test(l));
        if (cifra) culpados.push(`${caminho}:${i + 1} — ${cifra.trim().slice(0, 80)}`);
      });
    }

    expect(
      culpados,
      "O limite do art. 75 mora em `dominio/limites-legais.ts`, com o decreto e a " +
        "data. Escrito em prosa, ele envelhece em silêncio:\n\n" +
        culpados.join("\n"),
    ).toEqual([]);
  });
});
