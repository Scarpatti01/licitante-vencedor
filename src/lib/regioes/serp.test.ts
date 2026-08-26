import { describe, expect, it } from "vitest";
import { descricaoDoMunicipio, tituloDoMunicipio, valorResumido } from "./serp";
import { TETO_DO_TITULO, tituloRenderizado } from "../seo/resultado-de-busca";
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
  /*
   * ## O título encolheu em 26/08, e os três testes abaixo mudaram de assunto
   *
   * Eles afirmavam o formato antigo, `Licitações em Iguatu (CE): 21
   * contratações, R$ 18,1 mi`, e a lição era "o número antes de qualquer coisa
   * vaga". A lição continua de pé; o que caiu foi a conta.
   *
   * A régua media o título CRU e o layout acrescenta ` | Licitante Vencedor`
   * depois. Aqueles 54 caracteres chegavam ao Google com 75, e o valor era
   * cortado exatamente como o comentário antigo temia. O Ahrefs contou 912
   * páginas de município assim, em 26/08.
   *
   * Os números não foram apagados: foram para a DESCRIÇÃO, e é lá que estes
   * testes passaram a cobrá-los. O título ficou com o que não pode faltar.
   */
  it("é só o lugar, e cabe com a marca que o layout acrescenta", () => {
    for (const nome of ["Iguatu", "Sobral", "Recife", "Mossoró"]) {
      const t = tituloDoMunicipio(municipio({ municipio: nome }));
      expect(t).toBe(`Licitações em ${nome} (CE)`);
      expect(
        tituloRenderizado(t).length,
        `"${tituloRenderizado(t)}" tem ${tituloRenderizado(t).length} caracteres`,
      ).toBeLessThanOrEqual(TETO_DO_TITULO);
    }
  });

  it("nome comprido não é cortado: a cidade vem para a frente", () => {
    /*
     * Dois municípios em 3.805 estouram o orçamento, e por um ou dois
     * caracteres. Cortar o nome seria pior de longe: ele é o token mais
     * distintivo da página e é exatamente o que a pessoa digitou.
     */
    const t = tituloDoMunicipio(
      municipio({ municipio: "Vila Bela da Santíssima Trindade", uf: "MT" }),
    );
    expect(t).toBe("Vila Bela da Santíssima Trindade (MT): licitações");
    expect(t).toContain("Vila Bela da Santíssima Trindade");
    expect(tituloRenderizado(t).length).toBeLessThanOrEqual(TETO_DO_TITULO);
  });

  it("o título não carrega número nenhum: eles são da descrição", () => {
    // A guarda que impede o número de voltar por conveniência. Ele volta e o
    // título estoura de novo, sem nada reclamar.
    const t = tituloDoMunicipio(municipio());
    expect(t).not.toMatch(/\d/);
    expect(t).not.toContain("R$");
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

  it("sem valor somado, não inventa e usa o que tem", () => {
    /*
     * 185 dos 3.895 municípios do agregado não têm valor. "R$ 0 em compras"
     * afirmaria que o município não compra, que é outra coisa.
     *
     * A lição era do título até 26/08, quando os números passaram para cá.
     */
    const d = descricaoDoMunicipio(municipio({ valor: 0 }), MEDIDO);
    expect(d).toContain("21 contratações de 5 órgãos");
    expect(d).not.toContain("R$");
  });

  it("concorda em número com o que está contando", () => {
    const d = descricaoDoMunicipio(municipio({ editais: 1, valor: 0, orgaos: 1 }), MEDIDO);
    expect(d).toContain("1 contratação de 1 órgão");
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
