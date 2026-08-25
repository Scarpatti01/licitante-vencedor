import { describe, expect, it } from "vitest";
import { edital as editalFixture } from "../fontes/fixtures.ts";
import { PERFIL_COMPLETO } from "../dominio/exemplos.ts";
import type { PerfilDaEmpresa } from "../dominio/tipos.ts";
import type { EditalAbertoParaLeitura } from "./candidatosParaLeitura.ts";
import {
  candidatosParaLeitura,
  CORTE_DE_LEITURA,
  LEITURAS_POR_EMPRESA_POR_DIA,
  LEITURAS_SEM_ASSINANTE,
  tetoDeLeitura,
} from "./candidatosParaLeitura.ts";

const AGORA = new Date("2026-08-21T09:00:00-03:00");

// PERFIL_COMPLETO casa bem com "limpeza predial e conservação" (palavrasChave),
// atende PE/AL/PB e tem ticket 50k–2M — o mesmo objeto usado nos fixtures de
// score.ts e supabase-oportunidades.test.ts.
function editalCompativel(id: string, over: Partial<Parameters<typeof editalFixture>[0]> = {}): EditalAbertoParaLeitura {
  return {
    uuid: `uuid-${id}`,
    edital: editalFixture({
      id,
      objeto: "Contratação de empresa para limpeza predial e conservação",
      local: { uf: "PE", municipio: "Recife", municipioSlug: "recife", codigoIbge: "2611606" },
      valorEstimado: 400_000,
      encerramentoProposta: "2026-09-20T14:00:00-03:00",
      ...over,
    }),
  };
}

function editalIncompativel(id: string): EditalAbertoParaLeitura {
  return {
    uuid: `uuid-${id}`,
    edital: editalFixture({
      id,
      objeto: "Aquisição de equipamentos de informática",
      local: { uf: "SP", municipio: "São Paulo", municipioSlug: "sao-paulo", codigoIbge: "3550308" },
      encerramentoProposta: "2026-09-20T14:00:00-03:00",
    }),
  };
}

function perfil(empresaId: string, over: Partial<PerfilDaEmpresa> = {}): PerfilDaEmpresa {
  return { ...PERFIL_COMPLETO, empresaId, ...over };
}

describe("candidatosParaLeitura", () => {
  it("só entra quem tem score ≥ 70 sem leitura", () => {
    const editais = [editalCompativel("bom"), editalIncompativel("ruim")];
    const candidatos = candidatosParaLeitura(editais, [perfil("e1")], AGORA);

    expect(candidatos.has("uuid-bom")).toBe(true);
    expect(candidatos.has("uuid-ruim")).toBe(false);
  });

  it("duas empresas com o mesmo edital no topo compartilham a mesma leitura", () => {
    const editais = [editalCompativel("compartilhado")];
    const candidatos = candidatosParaLeitura(editais, [perfil("e1"), perfil("e2")], AGORA);

    expect(candidatos.size).toBe(1);
    const candidato = candidatos.get("uuid-compartilhado")!;
    expect(candidato.empresas.map((p) => p.empresaId).sort()).toEqual(["e1", "e2"]);
  });

  it("edital fora do perfil de uma empresa não entra por causa dela", () => {
    // Fora da região de "e2": UF diferente das que a empresa atende.
    const foraDaRegiao = editalCompativel("regional", {
      local: { uf: "RJ", municipio: "Rio de Janeiro", municipioSlug: "rio-de-janeiro", codigoIbge: "3304557" },
    });
    const candidatos = candidatosParaLeitura(
      [foraDaRegiao],
      [perfil("pe", { ufsAtendidas: ["RJ"] }), perfil("outra", { ufsAtendidas: ["PE"] })],
      AGORA,
    );

    const candidato = candidatos.get("uuid-regional")!;
    expect(candidato.empresas.map((p) => p.empresaId)).toEqual(["pe"]);
  });

  it(`corta em ${LEITURAS_POR_EMPRESA_POR_DIA} por empresa, priorizando o maior score`, () => {
    // Dois grupos com scores diferentes: o objeto que casa com as 3
    // palavras-chave pontua mais que o que casa só com 1 (`score.ts:146`,
    // retorno decrescente). Com LEITURAS_POR_EMPRESA_POR_DIA=25, os 3 editais
    // de score mais baixo devem ficar de fora.
    const altoScore = Array.from({ length: LEITURAS_POR_EMPRESA_POR_DIA }, (_, i) =>
      editalCompativel(`alto-${i}`, { objeto: "limpeza predial conservação material de limpeza" }),
    );
    const baixoScore = Array.from({ length: 3 }, (_, i) => editalCompativel(`baixo-${i}`, { objeto: "limpeza" }));

    const candidatos = candidatosParaLeitura([...altoScore, ...baixoScore], [perfil("e1")], AGORA);

    expect(candidatos.size).toBe(LEITURAS_POR_EMPRESA_POR_DIA);
    for (const e of altoScore) expect(candidatos.has(`uuid-${e.edital.id}`)).toBe(true);
    for (const e of baixoScore) expect(candidatos.has(`uuid-${e.edital.id}`)).toBe(false);
  });

  it("edital sem base para pontuar não entra (score nulo não é ≥ corte)", () => {
    // Perfil sem palavras-chave: `criterioObjeto` fica indeterminado, e outros
    // critérios também — cobertura pode cair abaixo do mínimo e o score sai
    // `null`. `(d.score ?? 0) >= CORTE_DE_LEITURA` nunca deveria admitir isso.
    const semPerfil = perfil("vazio", { palavrasChave: [], ufsAtendidas: [], ticketMinimo: null, ticketMaximo: null });
    const candidatos = candidatosParaLeitura([editalCompativel("x")], [semPerfil], AGORA);

    expect(candidatos.size).toBe(0);
  });

  it("o corte é exatamente o piso da faixa boa, não um número solto", () => {
    expect(CORTE_DE_LEITURA).toBe(70);
  });
});

describe("o teto de leitura acompanha quem paga", () => {
  /**
   * Medido em 25/08, e é o motivo desta regra existir.
   *
   *   empresas: 1 · assinaturas: 0
   *   25/08: 22 leituras, US$ 2,96   23/08: 44 leituras, US$ 5,73
   *
   * Entre R$ 500 e R$ 700 por mês lendo editais para ninguém. Zerar seria pior
   * que caro — a leitura diária é o que pegou a queda do `pdfjs` em 16/08 e a
   * cota estourada em 24/08, e sistema exercitado só quando chega o primeiro
   * cliente quebra na frente dele. Cinco por dia mantém o pipeline vivo por uns
   * R$ 50 por mês.
   */
  it("sem assinante vivo, o teto é o pequeno", () => {
    expect(tetoDeLeitura(0)).toBe(LEITURAS_SEM_ASSINANTE);
    expect(LEITURAS_SEM_ASSINANTE).toBeLessThan(LEITURAS_POR_EMPRESA_POR_DIA);
  });

  /**
   * A parte que importa mais que a economia.
   *
   * O teto volta ao normal SOZINHO na primeira assinatura. Se dependesse de
   * alguém lembrar de trocar uma constante, o primeiro cliente pagante ia
   * receber cinco editais por dia — e a economia teria custado exatamente a
   * coisa que ela existia para financiar.
   */
  it("com um assinante que seja, o teto volta ao normal sozinho", () => {
    expect(tetoDeLeitura(1)).toBe(LEITURAS_POR_EMPRESA_POR_DIA);
    expect(tetoDeLeitura(40)).toBe(LEITURAS_POR_EMPRESA_POR_DIA);
  });

  it("o teto é de verdade: entra na seleção, não só no log", () => {
    // Um teto que não corta a lista é um número bonito num console.log.
    const editais = Array.from({ length: 30 }, (_, i) => editalCompativel(`e${i}`));
    const comTetoPequeno = candidatosParaLeitura(editais, [perfil("a")], AGORA, LEITURAS_SEM_ASSINANTE);
    const comTetoNormal = candidatosParaLeitura(editais, [perfil("a")], AGORA, LEITURAS_POR_EMPRESA_POR_DIA);

    expect(comTetoPequeno.size).toBeLessThanOrEqual(LEITURAS_SEM_ASSINANTE);
    expect(comTetoNormal.size).toBeGreaterThan(comTetoPequeno.size);
  });
});

describe("o edital já lido não ocupa a vaga do edital novo", () => {
  /**
   * O defeito que quase parou a leitura, medido em 25/08.
   *
   * Entre os cinco editais abertos de maior score, QUATRO já estavam lidos — e
   * encerram só em setembro, então ficariam no topo por semanas. Com o teto em
   * 5, a leitura teria parado sozinha em um ou dois dias: todo dia gastaria as
   * cinco vagas com editais que não precisavam de nada e nunca chegaria ao
   * primeiro edital novo.
   *
   * E pararia em SILÊNCIO. Nenhum erro, nenhuma linha vermelha: o log diria
   * "5 candidatos, 5 já em cache" e o job terminaria verde todo dia.
   *
   * O cache já impedia de pagar duas vezes pelo mesmo edital. O que faltava era
   * isto: não deixar o já lido consumir o orçamento do dia.
   */
  const AMANHA = new Date("2026-08-21T09:00:00-03:00");

  it("com o topo inteiro já lido, o dia ainda lê editais novos", () => {
    const editais = Array.from({ length: 10 }, (_, i) => editalCompativel(`e${i}`));
    const topoJaLido = new Set(editais.slice(0, 4).map((e) => e.uuid));

    const candidatos = candidatosParaLeitura(editais, [perfil("a")], AMANHA, 2, topoJaLido);
    const novos = [...candidatos.keys()].filter((uuid) => !topoJaLido.has(uuid));

    expect(
      novos.length,
      "o teto voltou a ser gasto com editais já lidos. A leitura para sozinha em " +
        "poucos dias, com o job verde e o log dizendo 'já em cache' — que foi " +
        "exatamente o que quase aconteceu em 25/08.",
    ).toBe(2);
  });

  /**
   * Os já lidos continuam entrando — de graça.
   *
   * Eles não gastam IA nenhuma, e continuar passando por eles mantém a
   * oportunidade fresca conforme o prazo se aproxima: a triagem depende de
   * `agora`, então a decisão de ontem pode não ser a de hoje.
   */
  it("os já lidos continuam na lista, sem consumir vaga", () => {
    const editais = Array.from({ length: 10 }, (_, i) => editalCompativel(`e${i}`));
    const jaLidos = new Set(editais.slice(0, 4).map((e) => e.uuid));

    const candidatos = candidatosParaLeitura(editais, [perfil("a")], AMANHA, 2, jaLidos);

    for (const uuid of jaLidos) {
      expect(candidatos.has(uuid), `o edital já lido ${uuid} sumiu da regravação`).toBe(true);
    }
    expect(candidatos.size).toBe(jaLidos.size + 2);
  });

  it("sem nada lido ainda, o teto vale como sempre valeu", () => {
    const editais = Array.from({ length: 10 }, (_, i) => editalCompativel(`e${i}`));
    expect(candidatosParaLeitura(editais, [perfil("a")], AMANHA, 3, new Set()).size).toBe(3);
  });
});
