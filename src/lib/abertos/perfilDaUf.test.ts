import { describe, expect, it } from "vitest";

import {
  CATEGORIAS_NA_TABELA,
  MODALIDADES_NA_TABELA,
  OUTROS,
  percentual,
  perfilDaUf,
} from "./perfilDaUf.ts";

function edital(objeto: string, modalidade = "Pregão - Eletrônico") {
  return { objeto, modalidade };
}

describe("a quebra por categoria", () => {
  it("ordena da maior para a menor", () => {
    const { porCategoria } = perfilDaUf([
      edital("Aquisição de medicamentos para a farmácia básica"),
      edital("Aquisição de gêneros alimentícios para a merenda escolar"),
      edital("Aquisição de gêneros alimentícios não perecíveis"),
      edital("Registro de preços de gêneros alimentícios da agricultura familiar"),
    ]);

    expect(porCategoria[0]).toEqual({ rotulo: "Alimentação escolar", quantidade: 3 });
    expect(porCategoria[1]).toEqual({ rotulo: "Medicamentos e insumos de saúde", quantidade: 1 });
  });

  it("empate é desfeito pelo rótulo, para o arquivo não mudar à toa", () => {
    /*
     * Sem isto, duas categorias com a mesma contagem trocam de lugar entre
     * coletas e o `git diff` do arquivo versionado fica cheio de mudança que não
     * é mudança. Quem revisa passa a ignorar o diff, que é como uma mudança de
     * verdade passa despercebida.
     */
    const entrada = [
      edital("Aquisição de medicamentos"),
      edital("Aquisição de gêneros alimentícios"),
    ];
    const uma = perfilDaUf(entrada).porCategoria.map((f) => f.rotulo);
    const outra = perfilDaUf([...entrada].reverse()).porCategoria.map((f) => f.rotulo);
    expect(uma).toEqual(outra);
  });

  it("a cauda vira `Outros`, e a linha NÃO some", () => {
    /*
     * Somer a cauda faria as porcentagens não fecharem, e o leitor conferiria a
     * conta antes de confiar no resto. Em 26/08 os sem categoria eram 36% da
     * amostra nacional: a maior fatia isolada. Esconder a maior fatia seria o
     * pior lugar para começar a arredondar a verdade.
     */
    const muitas = [
      ...Array.from({ length: 9 }, () => edital("Aquisição de gêneros alimentícios")),
      ...Array.from({ length: 8 }, () => edital("Aquisição de material de expediente")),
      ...Array.from({ length: 7 }, () => edital("Aquisição de medicamentos")),
      ...Array.from({ length: 6 }, () => edital("Serviço de limpeza e conservação")),
      ...Array.from({ length: 5 }, () => edital("Locação de veículos para transporte escolar")),
      ...Array.from({ length: 4 }, () => edital("Manutenção predial e reforma de prédio")),
      ...Array.from({ length: 3 }, () => edital("Aquisição de mobiliário e movéis")),
      ...Array.from({ length: 2 }, () => edital("Aquisição de uniformes e fardamento")),
      edital("Serviço de tradução simultânea"),
    ];

    const { porCategoria } = perfilDaUf(muitas);

    expect(porCategoria).toHaveLength(CATEGORIAS_NA_TABELA + 1);
    expect(porCategoria[porCategoria.length - 1].rotulo).toBe(OUTROS);

    // A soma da tabela é a soma da entrada: nada foi perdido no corte.
    const somaDaTabela = porCategoria.reduce((s, f) => s + f.quantidade, 0);
    expect(somaDaTabela).toBe(muitas.length);
  });

  it("quem não tem categoria entra em `Outros`, e não desaparece", () => {
    const { porCategoria } = perfilDaUf([
      edital("Serviço de tradução simultânea para as sessões"),
      edital("Aquisição de gêneros alimentícios"),
    ]);
    expect(porCategoria.find((f) => f.rotulo === OUTROS)?.quantidade).toBe(1);
  });
});

describe("a quebra por modalidade", () => {
  it("conta o que o órgão declarou", () => {
    const { porModalidade } = perfilDaUf([
      edital("Compra A", "Pregão - Eletrônico"),
      edital("Compra B", "Pregão - Eletrônico"),
      edital("Compra C", "Dispensa"),
    ]);
    expect(porModalidade[0]).toEqual({ rotulo: "Pregão - Eletrônico", quantidade: 2 });
    expect(porModalidade[1]).toEqual({ rotulo: "Dispensa", quantidade: 1 });
  });

  it("modalidade em branco vira `Outros`, e não uma fatia sem nome", () => {
    // Existe no PNCP, e uma linha sem rótulo na tabela é pior do que uma linha
    // chamada "Outros".
    const { porModalidade } = perfilDaUf([edital("Compra", "   ")]);
    expect(porModalidade).toEqual([{ rotulo: OUTROS, quantidade: 1 }]);
  });

  it("corta a cauda no teto de modalidades", () => {
    const sete = [
      "Pregão - Eletrônico",
      "Dispensa",
      "Concorrência - Eletrônica",
      "Credenciamento",
      "Concorrência - Presencial",
      "Pregão - Presencial",
      "Leilão - Eletrônico",
    ].map((m) => edital("Compra", m));

    const { porModalidade } = perfilDaUf(sete);
    expect(porModalidade).toHaveLength(MODALIDADES_NA_TABELA + 1);
    expect(porModalidade.reduce((s, f) => s + f.quantidade, 0)).toBe(7);
  });
});

describe("a porcentagem", () => {
  it("é calculada sobre o total do estado, não sobre a tabela", () => {
    /*
     * A distinção que evita enganar por arredondamento: somar as fatias daria o
     * total da TABELA, e as duas coisas divergem sempre que houve corte de
     * cauda. Um leitor que soma as porcentagens e acha 100% quando a página diz
     * 733 abertos está sendo enganado.
     */
    expect(percentual(50, 200)).toBe(25);
    expect(percentual(1, 3)).toBe(33);
  });

  it("total zero não vira divisão por zero", () => {
    expect(percentual(0, 0)).toBe(0);
  });
});
