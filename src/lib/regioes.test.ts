import { describe, expect, it } from "vitest";
import {
  caminhoDoMunicipio,
  MINIMO_DE_EDITAIS,
  MINIMO_DE_ORGAOS,
  modalidadesOrdenadas,
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
