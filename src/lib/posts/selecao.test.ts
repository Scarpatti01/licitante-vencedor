import { describe, expect, it } from "vitest";
import {
  DIAS_MINIMOS_DE_PRAZO,
  MAXIMO_POR_MUNICIPIO,
  MAXIMO_POR_ORGAO,
  MINIMO_DO_OBJETO,
  motivoDaRecusa,
  selecionarDoDia,
} from "./selecao";
import type { Edital } from "../fontes/tipos";

const AGORA = new Date("2026-08-15T12:00:00Z");
const DIA = 86_400_000;

/** Objeto realista e comprido o bastante para passar no piso. */
const OBJETO =
  "Registro de preços para aquisição de gêneros alimentícios destinados à merenda escolar da rede municipal de ensino";

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
    const lista = Array.from({ length: 60 }, () => edital());
    const { escolhidos } = selecionarDoDia(lista, { limite: 25, agora: AGORA });
    expect(escolhidos).toHaveLength(25);
  });

  /**
   * Prazo primeiro, e não valor.
   *
   * Um edital bilionário de obra interessa a pouquíssimas empresas; o de R$ 80
   * mil de material escolar interessa a muitas — e o site existe para PMEs.
   * Prazo primeiro também é o que faz o post chegar enquanto ainda dá para
   * participar.
   */
  it("põe o prazo mais próximo na frente, ignorando o valor", () => {
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
