import { describe, expect, it } from "vitest";
import {
  DIAS_MINIMOS_DE_PRAZO,
  MAXIMO_POR_CATEGORIA,
  MAXIMO_POR_MUNICIPIO,
  MAXIMO_POR_ORGAO,
  MINIMO_DO_OBJETO,
  POSTS_POR_DIA,
  motivoDaRecusa,
  selecionarDoDia,
} from "./selecao";
import type { Edital } from "../fontes/tipos";

const AGORA = new Date("2026-08-15T12:00:00Z");
const DIA = 86_400_000;

/** Objeto realista e comprido o bastante para passar no piso. */
const OBJETO =
  "Registro de preços para aquisição de gêneros alimentícios destinados à merenda escolar da rede municipal de ensino";

/**
 * Um objeto que NÃO casa com nenhuma categoria de `demanda.ts`.
 *
 * Existe desde 26/08, quando a cota por categoria passou a valer. Os testes que
 * medem a cota de MUNICÍPIO ou de ÓRGÃO precisam de editais que não disputem
 * também uma vaga de categoria — senão eles param de medir o que dizem medir e
 * passam a medir a cota nova, que é o que aconteceu com dois deles.
 *
 * Repare que o `OBJETO` padrão é de merenda escolar: sem esta constante, toda
 * lista construída pela fábrica é da MESMA categoria, e a uniformidade da
 * fábrica escondia exatamente a monotonia que a cota nova existe para evitar.
 */
const OBJETO_SEM_CATEGORIA =
  "Contratação de serviço especializado de tradução simultânea para as sessões públicas do órgão";

let sequencia = 0;

function edital(over: Partial<Edital> & { dias?: number } = {}): Edital {
  const { dias = 10, ...resto } = over;
  sequencia += 1;

  return {
    id: `id-${sequencia}`,
    fonte: "pncp",
    idNaFonte: `fonte-${sequencia}`,
    objeto: OBJETO,
    orgao: { cnpj: `${sequencia}`.padStart(14, "0"), nome: `Órgão ${sequencia}`, esfera: "municipal" },
    local: {
      uf: "PE",
      municipio: `Cidade ${sequencia}`,
      municipioSlug: `cidade-${sequencia}`,
      codigoIbge: `26${String(sequencia).padStart(5, "0")}`,
    },
    modalidade: "Pregão - Eletrônico",
    modoDisputa: null,
    instrumento: null,
    amparoLegal: null,
    registroDePrecos: false,
    valorEstimado: 250_000,
    valorEstimadoBruto: 250_000,
    valorSuspeito: false,
    aberturaProposta: null,
    encerramentoProposta: new Date(AGORA.getTime() + dias * DIA).toISOString(),
    publicadoEm: "2026-08-10T00:00:00.000Z",
    situacao: null,
    link: "https://pncp.gov.br/app/editais/x",
    coletadoEm: AGORA.toISOString(),
    ...resto,
  } as Edital;
}

describe("motivoDaRecusa", () => {
  it("aceita um edital completo e com prazo", () => {
    expect(motivoDaRecusa(edital(), AGORA)).toBeNull();
  });

  /**
   * Objetos reais da coleta, não inventados.
   *
   * O revisor da coleta de hoje marcou estes dois como curtos demais para dizer
   * o que está sendo comprado. Um post sobre eles não teria o que analisar.
   */
  it.each(["COPA E COZINHA", "dfd 160 2026"])("recusa o objeto %s", (objeto) => {
    expect(motivoDaRecusa(edital({ objeto }), AGORA)).toBe("objeto-curto-demais");
  });

  it("recusa quem não tem prazo", () => {
    expect(motivoDaRecusa(edital({ encerramentoProposta: null }), AGORA)).toBe("sem-prazo");
  });

  /**
   * A regra que evita o post nascer inútil.
   *
   * Publicar um edital que encerra amanhã entrega ao leitor algo em que ele já
   * não consegue agir: não dá para reunir documentação nem impugnar (art. 164
   * da Lei 14.133 dá até 3 dias úteis antes da abertura).
   */
  it("recusa prazo curto demais para agir", () => {
    expect(motivoDaRecusa(edital({ dias: 1 }), AGORA)).toBe("prazo-curto-demais");
    expect(motivoDaRecusa(edital({ dias: DIAS_MINIMOS_DE_PRAZO + 0.5 }), AGORA)).toBeNull();
  });

  it("recusa edital já encerrado", () => {
    expect(motivoDaRecusa(edital({ dias: -2 }), AGORA)).toBe("prazo-curto-demais");
  });

  /*
   * "Cabe no meu porte?" é a primeira pergunta de quem decide participar. Sem
   * valor, o post responde metade. 86% dos editais trazem o campo, então exigir
   * custa pouca cobertura.
   */
  it.each([null, 0])("recusa valor %s", (valorEstimado) => {
    expect(motivoDaRecusa(edital({ valorEstimado }), AGORA)).toBe("sem-valor-informado");
  });

  it("o piso do objeto é o declarado, não um número solto no teste", () => {
    const curto = "x".repeat(MINIMO_DO_OBJETO - 1);
    const certo = "x".repeat(MINIMO_DO_OBJETO);
    expect(motivoDaRecusa(edital({ objeto: curto }), AGORA)).toBe("objeto-curto-demais");
    expect(motivoDaRecusa(edital({ objeto: certo }), AGORA)).toBeNull();
  });
});

describe("selecionarDoDia", () => {
  it("respeita o limite pedido", () => {
    // Objeto sem categoria: a cota de categoria não vale para quem não tem uma,
    // e é isso que deixa este teste medir o LIMITE em vez da cota.
    const lista = Array.from({ length: 60 }, () => edital({ objeto: OBJETO_SEM_CATEGORIA }));
    const { escolhidos } = selecionarDoDia(lista, { limite: 25, agora: AGORA });
    expect(escolhidos).toHaveLength(25);
  });

  /**
   * Entre iguais em demanda, o prazo decide. E o valor nunca decide.
   *
   * O título deste teste dizia "prazo primeiro" e era a regra inteira até
   * 26/08. Hoje o prazo é o SEGUNDO critério: `demanda.ts` ordena antes. Os dois
   * editais abaixo são da mesma categoria de propósito, e é isso que mantém o
   * teste medindo o desempate por prazo em vez de medir a demanda por acidente.
   *
   * O que não mudou: um edital bilionário de obra interessa a pouquíssimas
   * empresas; o de R$ 80 mil de material escolar interessa a muitas, e o site
   * existe para PMEs.
   */
  it("entre a mesma categoria, põe o prazo mais próximo na frente, ignorando o valor", () => {
    const caro = edital({ dias: 30, valorEstimado: 90_000_000 });
    const urgente = edital({ dias: 4, valorEstimado: 80_000 });

    const { escolhidos } = selecionarDoDia([caro, urgente], { agora: AGORA });
    expect(escolhidos[0].id).toBe(urgente.id);
  });

  /**
   * A cota que faz as praças menores existirem.
   *
   * Num dia em que Fortaleza publica 40 editais, sem cota os 25 posts seriam
   * todos de Fortaleza — e quem abre o site em Sergipe não acha nada dele.
   */
  it("não deixa um município tomar a leva inteira", () => {
    const muitos = Array.from({ length: 10 }, (_, i) =>
      edital({
        objeto: OBJETO_SEM_CATEGORIA,
        local: { uf: "CE", municipio: "Fortaleza", municipioSlug: "fortaleza", codigoIbge: "2304400" },
        dias: 4 + i,
      }),
    );

    const { escolhidos, recusas } = selecionarDoDia(muitos, { agora: AGORA });
    expect(escolhidos).toHaveLength(MAXIMO_POR_MUNICIPIO);
    expect(recusas["cota-do-municipio"]).toBe(10 - MAXIMO_POR_MUNICIPIO);
  });

  it("não deixa um órgão pautar o dia", () => {
    const mesmoOrgao = { cnpj: "11111111111111", nome: "Prefeitura X", esfera: "municipal" as const };
    const lista = Array.from({ length: 6 }, (_, i) =>
      edital({
        objeto: OBJETO_SEM_CATEGORIA,
        orgao: mesmoOrgao,
        // Municípios diferentes, para isolar a cota de órgão da de município.
        local: { uf: "PE", municipio: `M${i}`, municipioSlug: `m-${i}`, codigoIbge: `26000${i}0` },
        dias: 4 + i,
      }),
    );

    const { escolhidos } = selecionarDoDia(lista, { agora: AGORA });
    expect(escolhidos).toHaveLength(MAXIMO_POR_ORGAO);
  });

  it("conta as recusas por motivo, para a decisão ser auditável", () => {
    const { escolhidos, recusas } = selecionarDoDia(
      [edital(), edital({ objeto: "curto" }), edital({ dias: 1 }), edital({ valorEstimado: null })],
      { agora: AGORA },
    );

    expect(escolhidos).toHaveLength(1);
    expect(recusas).toEqual({
      "objeto-curto-demais": 1,
      "prazo-curto-demais": 1,
      "sem-valor-informado": 1,
    });
  });

  /*
   * Mesma entrada, mesma saída. Sem isso, duas execuções do mesmo dia
   * publicariam conjuntos diferentes, e o post de ontem sumiria do índice de
   * hoje sem motivo.
   */
  it("é determinística", () => {
    const lista = Array.from({ length: 40 }, () => edital());
    const a = selecionarDoDia(lista, { agora: AGORA }).escolhidos.map((e) => e.id);
    const b = selecionarDoDia(lista, { agora: AGORA }).escolhidos.map((e) => e.id);
    expect(a).toEqual(b);
  });

  it("lista vazia não quebra", () => {
    expect(selecionarDoDia([], { agora: AGORA })).toEqual({ escolhidos: [], recusas: {} });
  });
});

describe("a demanda manda na ordem, desde 26/08", () => {
  /*
   * A mudança que estes testes guardam.
   *
   * A leva era escolhida por prazo, o que publica sem nunca perguntar quem
   * viria. Com a torneira em cinco por dia — e não mais 25 — escolher virou
   * decisão editorial de verdade: "os cinco que fecham antes" não é uma.
   */
  it("um edital muito procurado passa na frente de um que fecha antes", () => {
    const obraUrgente = edital({
      objeto:
        "Contratação de empresa de engenharia para pavimentação asfáltica de vias urbanas do município",
      dias: 4,
    });
    const merendaFolgada = edital({
      objeto:
        "Registro de preços para aquisição de gêneros alimentícios destinados à merenda escolar da rede municipal",
      dias: 20,
    });

    const { escolhidos } = selecionarDoDia([obraUrgente, merendaFolgada], { agora: AGORA });
    expect(escolhidos[0].id).toBe(merendaFolgada.id);
  });

  it("mas nada entra sem ser acionável, por mais procurado que seja", () => {
    /*
     * O limite da regra nova, e ele é inegociável: post que nasce vencido não
     * serve a leitor nenhum, procurado ou não. Sem esta guarda, a ordenação por
     * demanda convidaria alguém a "só relaxar o prazo para os de peso 10".
     */
    const merendaVencendo = edital({
      objeto: "Aquisição de gêneros alimentícios para a merenda escolar do município",
      dias: DIAS_MINIMOS_DE_PRAZO - 1,
    });

    const { escolhidos, recusas } = selecionarDoDia([merendaVencendo], { agora: AGORA });
    expect(escolhidos).toHaveLength(0);
    expect(recusas["prazo-curto-demais"]).toBe(1);
  });

  it("uma categoria não leva a leva inteira", () => {
    /*
     * Com 25 por dia o problema não existia, porque havia espaço para todos.
     * Fechar para cinco é o que o criou: "Alimentação escolar" tem o maior peso
     * da tabela e toda prefeitura do país compra merenda toda semana.
     */
    const soMerenda = Array.from({ length: 8 }, (_, i) =>
      edital({
        objeto: `Aquisição de gêneros alimentícios para a merenda escolar, lote ${i}`,
        dias: 5 + i,
      }),
    );

    const { escolhidos, recusas } = selecionarDoDia(soMerenda, { agora: AGORA });
    expect(escolhidos).toHaveLength(MAXIMO_POR_CATEGORIA);
    expect(recusas["cota-da-categoria"]).toBe(8 - MAXIMO_POR_CATEGORIA);
  });

  it("quem não tem categoria NÃO disputa cota entre si", () => {
    /*
     * Os sem classificação foram 36% da amostra de 26/08, e eles não são um
     * assunto: são a ausência de um. Contá-los juntos limitaria a dois por dia
     * uma dúzia de nichos diferentes, e justamente os que o concorrente não
     * cobre.
     */
    const variados = Array.from({ length: 5 }, (_, i) =>
      edital({ objeto: `${OBJETO_SEM_CATEGORIA} — lote ${i}`, dias: 5 + i }),
    );

    const { escolhidos, recusas } = selecionarDoDia(variados, { agora: AGORA });
    expect(escolhidos).toHaveLength(5);
    expect(recusas["cota-da-categoria"]).toBeUndefined();
  });

  it("a mesma entrada dá sempre a mesma leva", () => {
    // Sem o `id` desempatando o desempate, dois editais de mesmo peso e mesmo
    // prazo trocariam de lugar conforme a ordem que a coleta devolveu.
    const lista = [
      edital({ objeto: "Aquisição de medicamentos para a farmácia básica", dias: 7 }),
      edital({ objeto: "Aquisição de gêneros alimentícios para a merenda", dias: 7 }),
      edital({ objeto: "Serviço de limpeza e conservação predial continuada", dias: 7 }),
      edital({ objeto: OBJETO_SEM_CATEGORIA, dias: 7 }),
    ];

    const uma = selecionarDoDia(lista, { agora: AGORA }).escolhidos.map((e) => e.id);
    const outra = selecionarDoDia([...lista].reverse(), { agora: AGORA }).escolhidos.map((e) => e.id);
    expect(uma).toEqual(outra);
  });
});

describe("o número de posts por dia", () => {
  it("é cinco, e não vinte e cinco", () => {
    /*
     * Guarda de constante, e ela vale porque este número é dinheiro: 25 por dia
     * custavam entre US$ 2,96 e US$ 5,73 por dia de leitura de IA, sem evidência
     * de retorno — nenhuma página de UM edital, de agregador nenhum, aparece nas
     * buscas deste mercado. Ver `demanda.ts`.
     *
     * Se alguém devolver o número para 25, que seja de propósito.
     */
    expect(POSTS_POR_DIA).toBe(5);
  });

  it("o padrão da função é o mesmo da constante", () => {
    // A constante existir e a função ignorá-la é o jeito silencioso de a
    // decisão não valer.
    const lista = Array.from({ length: 20 }, (_, i) =>
      edital({ objeto: `${OBJETO_SEM_CATEGORIA} — ${i}`, dias: 5 + i }),
    );
    expect(selecionarDoDia(lista, { agora: AGORA }).escolhidos).toHaveLength(POSTS_POR_DIA);
  });
});
