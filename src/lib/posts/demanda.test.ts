import { describe, expect, it } from "vitest";

import {
  CATEGORIAS,
  PESO_SEM_CATEGORIA,
  categoriaDoObjeto,
  normalizar,
  pesoDaDemanda,
} from "./demanda.ts";

describe("o objeto do PNCP chega de qualquer jeito", () => {
  /*
   * Não é hipótese: o mesmo edital de merenda aparece como "AQUISIÇÃO DE
   * GÊNEROS ALIMENTÍCIOS", "Aquisicao de generos alimenticios" e "aquisição de
   * gêneros" conforme quem digitou. Sem normalizar, a tabela pegaria uma
   * prefeitura e perderia as outras duas.
   */
  it("acento e caixa não decidem a categoria", () => {
    const variacoes = [
      "AQUISIÇÃO DE GÊNEROS ALIMENTÍCIOS PARA A MERENDA ESCOLAR",
      "Aquisicao de generos alimenticios para a merenda escolar",
      "aquisição de gêneros alimentícios para a merenda escolar",
    ];
    const nomes = variacoes.map((o) => categoriaDoObjeto(o)?.nome);
    expect(new Set(nomes).size).toBe(1);
    expect(nomes[0]).toBe("Alimentação escolar");
  });

  it("normalizar tira o acento e baixa a caixa", () => {
    expect(normalizar("MANUTENÇÃO PREDIAL")).toBe("manutencao predial");
  });
});

describe("a ordem da tabela é a regra de desempate", () => {
  it("a primeira que casa ganha, e a tabela está em ordem de peso", () => {
    const pesos = CATEGORIAS.map((c) => c.peso);
    expect(pesos).toEqual([...pesos].sort((a, b) => b - a));
  });

  it("um objeto que casa com duas fica com a de maior peso", () => {
    // Gêneros alimentícios (10) e material de limpeza (8) na mesma compra: quem
    // procura é o distribuidor de alimentos, que é o de maior demanda.
    const c = categoriaDoObjeto(
      "Registro de preços para aquisição de gêneros alimentícios e material de limpeza",
    );
    expect(c?.nome).toBe("Alimentação escolar");
  });

  it("reforma de cozinha é reforma, e não alimentação", () => {
    /*
     * Este caso já esteve do outro lado, e a troca foi um conserto.
     *
     * Com o termo `"alimenta"` solto, "reforma da cozinha e área de alimentação"
     * caía em Alimentação escolar, e eu tinha escrito um teste afirmando que
     * isso estava certo — "quem procura é o fornecedor de cozinha industrial".
     * Estava errado: quem disputa uma REFORMA é quem faz obra. O termo largo
     * também fazia um credenciamento de hotel virar merenda escolar, e foi esse
     * caso, achado na amostra real de 26/08, que expôs os dois.
     */
    const c = categoriaDoObjeto("Reforma da cozinha e área de alimentação da escola municipal");
    expect(c?.nome).toBe("Manutenção predial e reforma");
  });
});

describe("obra é o que mais se busca, e é o último de propósito", () => {
  /*
   * A decisão que mais parece errada nesta tabela, e por isso está guardada.
   *
   * "Licitação de obras" é a consulta de maior volume do mercado. Pavimentação
   * de R$ 12 milhões tem meia dúzia de concorrentes possíveis na região, todos
   * já sabem do edital antes de ele sair, e nenhum deles é o cliente de R$ 59.
   * Ordenar por volume de busca encheria a leva de páginas que atraem leitor
   * que não vira assinante.
   */
  it("obra pesa menos que merenda", () => {
    const obra = pesoDaDemanda({
      objeto: "Contratação de empresa de engenharia para pavimentação asfáltica",
    });
    const merenda = pesoDaDemanda({ objeto: "Aquisição de gêneros alimentícios para a merenda" });
    expect(obra).toBeLessThan(merenda);
  });

  it("obra é a última da tabela", () => {
    expect(CATEGORIAS[CATEGORIAS.length - 1].nome).toBe("Obras e engenharia");
  });
});

describe("quem não tem categoria não é lixo", () => {
  /*
   * Zerar o peso faria a tabela virar lista de permissão — e uma lista de
   * permissão escrita à mão, sem dado de busca, decidiria que categoria nenhuma
   * que eu não pensei merece existir. O objeto que ninguém classificou pode ser
   * exatamente o nicho que o concorrente não cobre. Foram 36% da amostra real
   * de 26/08.
   */
  it("fica no meio da tabela, não no fim", () => {
    const semCategoria = pesoDaDemanda({ objeto: "Serviço de tradução simultânea para sessões" });
    expect(semCategoria).toBe(PESO_SEM_CATEGORIA);
    expect(semCategoria).toBeGreaterThan(0);

    const pesos = CATEGORIAS.map((c) => c.peso);
    expect(semCategoria).toBeGreaterThan(Math.min(...pesos));
    expect(semCategoria).toBeLessThan(Math.max(...pesos));
  });
});

describe("a tabela é coerente consigo mesma", () => {
  it("todo termo já está normalizado", () => {
    // Termo com acento nunca casaria, porque a comparação é contra o objeto JÁ
    // sem acento. Falharia em silêncio: a categoria simplesmente nunca pegaria.
    for (const categoria of CATEGORIAS) {
      for (const termo of categoria.termos) {
        expect(normalizar(termo)).toBe(termo);
      }
    }
  });

  it("nenhuma categoria está vazia e todo peso está na faixa", () => {
    for (const categoria of CATEGORIAS) {
      expect(categoria.termos.length).toBeGreaterThan(0);
      expect(categoria.peso).toBeGreaterThanOrEqual(1);
      expect(categoria.peso).toBeLessThanOrEqual(10);
    }
  });

  it("nenhum nome se repete", () => {
    const nomes = CATEGORIAS.map((c) => c.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});
