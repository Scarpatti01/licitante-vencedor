import { describe, expect, it } from "vitest";
import {
  estadoDaUf,
  ufFoiCompleta,
  caminhoDoMunicipio,
  MINIMO_DE_EDITAIS,
  MINIMO_DE_ORGAOS,
  modalidadesOrdenadas,
  pracasPorUf,
  pracasParaBusca,
  municipiosPublicaveis,
  temLastro,
  type MunicipioAgregado,
} from "./regioes";

function municipio(extra: Partial<MunicipioAgregado> = {}): MunicipioAgregado {
  return {
    uf: "PE",
    municipio: "Recife",
    slug: "recife",
    ibge: "2611606",
    editais: 34,
    valor: 235847326,
    orgaos: 12,
    modalidades: { "Pregão - Eletrônico": 11 },
    compradores: {},
    ...extra,
  };
}

describe("temLastro", () => {
  /*
   * O teste que carrega a decisão do arquivo.
   *
   * No agregado do dia em que isto foi escrito, 37 de 63 municípios tinham UM
   * edital. Sem este portão, seriam 37 páginas quase vazias e quase idênticas —
   * conteúdo raso não é neutro, ele dilui a autoridade dos guias que convertem.
   */
  it("recusa município de um edital só", () => {
    expect(temLastro({ editais: 1, orgaos: 1 })).toBe(false);
  });

  it("recusa volume alto concentrado num órgão só", () => {
    // Seis editais da mesma prefeitura descrevem aquela prefeitura, não o
    // município. A página prometeria um retrato de mercado que o dado não tem.
    expect(temLastro({ editais: 6, orgaos: 1 })).toBe(false);
  });

  it("recusa variedade de órgãos sem volume", () => {
    expect(temLastro({ editais: 2, orgaos: 2 })).toBe(false);
  });

  it("aceita quando os dois critérios passam", () => {
    expect(temLastro({ editais: MINIMO_DE_EDITAIS, orgaos: MINIMO_DE_ORGAOS })).toBe(true);
  });

  it("os limites são inclusivos — exatamente no mínimo, passa", () => {
    expect(temLastro({ editais: MINIMO_DE_EDITAIS - 1, orgaos: MINIMO_DE_ORGAOS })).toBe(false);
    expect(temLastro({ editais: MINIMO_DE_EDITAIS, orgaos: MINIMO_DE_ORGAOS - 1 })).toBe(false);
  });
});

describe("municipiosPublicaveis", () => {
  /*
   * Guarda contra o portão ser afrouxado sem querer. Se um dia alguém baixar os
   * mínimos ou remover o filtro, isto reprova antes de as páginas rasas irem ao
   * ar — que é o único momento em que a correção ainda é barata.
   */
  it("tudo que sai já passou pelo portão", () => {
    for (const m of municipiosPublicaveis()) {
      expect(temLastro(m), `${m.municipio}/${m.uf}`).toBe(true);
    }
  });

  it("vem ordenado por volume, de forma estável entre builds", () => {
    const publicados = municipiosPublicaveis();
    for (let i = 1; i < publicados.length; i++) {
      expect(publicados[i - 1].editais).toBeGreaterThanOrEqual(publicados[i].editais);
    }
  });

  it("não repete endereço", () => {
    const caminhos = municipiosPublicaveis().map(caminhoDoMunicipio);
    expect(new Set(caminhos).size).toBe(caminhos.length);
  });
});

describe("caminhoDoMunicipio", () => {
  it("usa UF em minúscula e termina com barra, como o resto do site", () => {
    expect(caminhoDoMunicipio({ uf: "PE", slug: "recife" })).toBe("/licitacoes/pe/recife/");
  });
});

describe("modalidadesOrdenadas", () => {
  it("ordena por volume e desempata pelo nome", () => {
    const m = municipio({
      modalidades: { Credenciamento: 3, "Pregão - Eletrônico": 11, Concorrência: 3 },
    });

    expect(modalidadesOrdenadas(m)).toEqual([
      { nome: "Pregão - Eletrônico", editais: 11 },
      { nome: "Concorrência", editais: 3 },
      { nome: "Credenciamento", editais: 3 },
    ]);
  });
});

describe("estadoDaUf", () => {
  /*
   * Guarda contra o defeito que o compilador pegou ao chegar a coleta de 15/08.
   *
   * `cobertura.ufsCompletas` é um array de STRINGS e `ufsParciais` é um array de
   * OBJETOS, no mesmo arquivo. A primeira versão de `ufFoiCompleta` assumia
   * objetos nos dois e teria respondido `false` para toda UF — fazendo cada
   * página declarar "esta UF não foi coletada por inteiro" mesmo quando foi.
   *
   * Passou despercebido enquanto o agregado anterior tinha a lista vazia, que é
   * o tipo de coisa que só aparece quando o dado muda.
   */
  it("reconhece UF completa a partir de porUf", () => {
    // Toda UF publicável vem de uma UF que a coleta classificou; nenhuma pode
    // sair como "desconhecida", que seria leitura falhando em silêncio.
    for (const m of municipiosPublicaveis()) {
      expect(estadoDaUf(m.uf), m.uf).not.toBe("desconhecida");
    }
  });

  it("aceita minúscula, como vem da URL", () => {
    const m = municipiosPublicaveis()[0];
    if (!m) return;
    expect(estadoDaUf(m.uf.toLowerCase())).toBe(estadoDaUf(m.uf));
  });

  it("UF fora da coleta é desconhecida, não completa", () => {
    // Nunca afirmar cobertura sobre o que não foi medido.
    expect(estadoDaUf("ZZ")).toBe("desconhecida");
    expect(ufFoiCompleta("ZZ")).toBe(false);
  });
});

describe("pracasPorUf", () => {
  const lista = [
    municipio({ uf: "CE", municipio: "Fortaleza", slug: "fortaleza", editais: 474, orgaos: 32 }),
    municipio({ uf: "PE", municipio: "Recife", slug: "recife", editais: 289, orgaos: 70 }),
    municipio({ uf: "CE", municipio: "Sobral", slug: "sobral", editais: 14, orgaos: 4 }),
    municipio({ uf: "SE", municipio: "Aracaju", slug: "aracaju", editais: 161, orgaos: 46 }),
  ];

  it("agrupa por UF e soma as contratações", () => {
    const grupos = pracasPorUf(lista);

    // CE soma 488 (474 + 14) e passa PE, que tem 289 num município só. É o
    // ponto do agrupamento: o estado é ordenado pelo total, não pela maior
    // cidade dele.
    expect(grupos.map((g) => g.uf)).toEqual(["CE", "PE", "SE"]);
    expect(grupos[0].editais).toBe(474 + 14);
    expect(grupos[0].municipios.map((m) => m.municipio)).toEqual(["Fortaleza", "Sobral"]);
  });

  it("rotula com o nome do estado por extenso", () => {
    expect(pracasPorUf(lista)[0].nome).toBe("Ceará");
  });

  /**
   * A soma que o acordeão NÃO faz.
   *
   * Somar `orgaos` entre municípios contaria duas vezes a secretaria estadual
   * que compra em duas cidades — e o resumo afirmaria um número de órgãos maior
   * que o real, sem ter como saber o quanto. O tipo do grupo não tem o campo
   * justamente para ninguém somar por engano depois.
   */
  it("não expõe soma de órgãos", () => {
    expect(pracasPorUf(lista)[0]).not.toHaveProperty("orgaos");
  });

  it("ordena os grupos por volume, e não alfabeticamente", () => {
    // Vale para o agregado real também: a ordem é sempre decrescente em
    // contratações, para a lista não embaralhar entre builds.
    const grupos = pracasPorUf(lista);
    for (let i = 1; i < grupos.length; i++) {
      expect(grupos[i - 1].editais).toBeGreaterThanOrEqual(grupos[i].editais);
    }
  });

  it("lista vazia devolve nenhum grupo", () => {
    expect(pracasPorUf([])).toEqual([]);
  });

  /*
   * O agregado real, e não só o sintético: se uma UF nova entrar na coleta sem
   * rótulo em NOME_DA_UF, o acordeão exibiria a sigla crua como título.
   */
  it("toda UF publicável tem nome por extenso", () => {
    for (const grupo of pracasPorUf()) {
      expect(grupo.nome, grupo.uf).not.toBe(grupo.uf);
    }
  });

  it("nenhuma praça se perde no agrupamento", () => {
    const total = pracasPorUf().reduce((n, g) => n + g.municipios.length, 0);
    expect(total).toBe(municipiosPublicaveis().length);
  });
});

describe("pracasParaBusca", () => {
  it("leva cidade, sigla e estado por extenso no texto de busca", () => {
    const recife = pracasParaBusca().find((p) => p.nome === "Recife");
    if (!recife) return;

    expect(recife.busca).toContain("recife");
    expect(recife.busca).toContain("pe");
    expect(recife.busca).toContain("pernambuco");
  });

  it("o href aponta para a página regional daquela praça", () => {
    for (const p of pracasParaBusca()) {
      expect(p.href).toBe(`/licitacoes/${p.uf.toLowerCase()}/${p.href.split("/")[3]}/`);
    }
  });

  /*
   * O texto de busca é normalizado no SERVIDOR. Se um acento escapar para cá, o
   * casador — que compara contra texto sem acento — nunca acharia aquela praça,
   * e a falha seria silenciosa: a cidade simplesmente não apareceria.
   */
  it("nenhum texto de busca carrega acento ou maiúscula", () => {
    for (const p of pracasParaBusca()) {
      expect(p.busca, p.nome).toBe(p.busca.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
    }
  });
});
