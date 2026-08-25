import { describe, expect, it } from "vitest";
import { descricaoDoMunicipio, tituloDoMunicipio, valorResumido } from "./serp";
import type { MunicipioAgregado } from "../pncp/agregarPorMunicipio";

/**
 * O que o Google mostra da página de município.
 *
 * Medido em 25/08, primeiros 28 dias do site: 219 páginas de município, 847
 * impressões, posição média entre 7 e 8, CTR de 1,18%. É o dobro do site
 * inteiro e metade do que a posição comporta.
 *
 * Estes testes existem porque a caixa do resultado de busca é o único lugar do
 * produto onde a gente compete por atenção contra dez concorrentes ao mesmo
 * tempo, e onde uma palavra a mais no começo custa o clique inteiro.
 */

function municipio(over: Partial<MunicipioAgregado> = {}): MunicipioAgregado {
  return {
    uf: "CE",
    municipio: "Iguatu",
    slug: "iguatu",
    ibge: "2305506",
    editais: 21,
    valor: 18_089_584,
    orgaos: 5,
    modalidades: {},
    compradores: {},
    ...over,
  };
}

const MEDIDO = "24/08/2026";

describe("o título entra na faixa que o Google mostra", () => {
  /**
   * Perto de 60 caracteres é onde o corte acontece. Passar disso não é erro de
   * validação, é desperdício: o que vem depois some, e o que some costuma ser
   * exatamente o argumento que faria clicar.
   */
  it("cabe em 60 caracteres nos municípios de nome comum", () => {
    for (const nome of ["Iguatu", "Sobral", "Recife", "Mossoró"]) {
      const t = tituloDoMunicipio(municipio({ municipio: nome }));
      expect(t.length, `"${t}" tem ${t.length} caracteres`).toBeLessThanOrEqual(62);
    }
  });

  it("põe o número antes de qualquer outra coisa depois do nome", () => {
    const t = tituloDoMunicipio(municipio());
    // O título velho era "Licitações em Iguatu (CE): o que os órgãos compram" —
    // três palavras vagas antes de qualquer informação.
    expect(t).toBe("Licitações em Iguatu (CE): 21 contratações, R$ 18,1 mi");
  });

  it("sem valor somado, não inventa e usa o que tem", () => {
    // 185 dos 3.895 municípios do agregado não têm valor. "R$ 0 em compras"
    // afirmaria que o município não compra, que é outra coisa.
    const t = tituloDoMunicipio(municipio({ valor: 0 }));
    expect(t).toBe("Licitações em Iguatu (CE): 21 contratações de 5 órgãos");
    expect(t).not.toContain("R$");
  });

  it("concorda em número com o que está contando", () => {
    expect(tituloDoMunicipio(municipio({ editais: 1, valor: 0, orgaos: 1 }))).toContain(
      "1 contratação de 1 órgão",
    );
  });
});

describe("a descrição responde antes de explicar o método", () => {
  it("abre com o número, não com 'retrato do mercado a partir dos dados do'", () => {
    const d = descricaoDoMunicipio(municipio(), MEDIDO);
    expect(d.startsWith("21 contratações")).toBe(true);
  });

  /**
   * A data é a única coisa na caixa que responde "isso está velho?", que é a
   * primeira dúvida de quem procura licitação.
   */
  it("mostra QUANDO foi medido", () => {
    expect(descricaoDoMunicipio(municipio(), MEDIDO)).toContain(MEDIDO);
  });

  it("cabe nos 160 caracteres que o Google mostra", () => {
    const d = descricaoDoMunicipio(municipio({ municipio: "São Miguel do Tapuio" }), MEDIDO);
    expect(d.length, `"${d}" tem ${d.length}`).toBeLessThanOrEqual(160);
  });
});

describe("nada aqui promete edital aberto agora", () => {
  /**
   * A guarda que protege uma decisão anterior, documentada em
   * `[municipio]/page.tsx`: a página é um retrato datado, não uma listagem do
   * que está aberto. Prometer no título o que a página não entrega faz o
   * visitante clicar, não achar e concluir, com razão, que o site mente.
   *
   * É a tentação óbvia de quem quer subir CTR — e é a única mudança aqui que
   * seria irreversível, porque desconfiança não volta com um deploy.
   */
  const PROIBIDO = [
    /abert[oa]s? agora/i,
    /abert[oa]s? hoje/i,
    /editais abertos/i,
    /licitações abertas/i,
    /em andamento/i,
    /participe (hoje|agora)/i,
  ];

  it("o título não promete presente", () => {
    const t = tituloDoMunicipio(municipio());
    for (const proibido of PROIBIDO) {
      expect(proibido.test(t), `"${t}" casou com ${proibido}`).toBe(false);
    }
  });

  it("a descrição não promete presente", () => {
    const d = descricaoDoMunicipio(municipio(), MEDIDO);
    for (const proibido of PROIBIDO) {
      expect(proibido.test(d), `"${d}" casou com ${proibido}`).toBe(false);
    }
  });

  it("o verbo da medição está no passado", () => {
    expect(descricaoDoMunicipio(municipio(), MEDIDO)).toContain("Medido no PNCP em");
  });
});

describe("valorResumido", () => {
  it("uma casa até dez milhões, nenhuma acima", () => {
    expect(valorResumido(18_089_584)).toBe("R$ 18,1 mi");
    expect(valorResumido(118_400_000)).toBe("R$ 118 mi");
  });

  it("milhares abaixo de um milhão", () => {
    expect(valorResumido(430_000)).toBe("R$ 430 mil");
  });

  it("nada abaixo de mil, e nada para valor ausente", () => {
    expect(valorResumido(0)).toBeNull();
    expect(valorResumido(999)).toBeNull();
    expect(valorResumido(Number.NaN)).toBeNull();
  });
});
