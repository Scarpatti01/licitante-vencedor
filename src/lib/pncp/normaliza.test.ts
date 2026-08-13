import { describe, expect, it } from "vitest";
import {
  comFusoDeBrasilia,
  diasAteEncerrar,
  marcarValoresSuspeitos,
  normalizarEdital,
  slugDeMunicipio,
  somaConfiavel,
} from "./normaliza";
import type { ContratacaoPncp } from "./tipos";
import { edital } from "../fontes/fixtures";

/**
 * O fuso é o teste mais importante deste arquivo.
 *
 * O PNCP devolve data sem fuso e em horário de Brasília. A Vercel roda em UTC:
 * sem a conversão explícita, todo prazo de edital atrasa três horas em
 * produção, e ninguém percebe até alguém perder um certame. Não há aviso, não
 * há erro no log — só a hora errada na página.
 */
describe("comFusoDeBrasilia", () => {
  it("anexa o offset de Brasília a uma data ingênua", () => {
    expect(comFusoDeBrasilia("2026-08-12T14:00:00")).toBe("2026-08-12T14:00:00-03:00");
  });

  it("14h em Brasília é 17h UTC — a conversão que a Vercel faria errado sozinha", () => {
    expect(new Date(comFusoDeBrasilia("2026-08-12T14:00:00")!).toISOString()).toBe(
      "2026-08-12T17:00:00.000Z",
    );
  });

  it("descarta os milissegundos que o PNCP às vezes manda, sem quebrar", () => {
    expect(comFusoDeBrasilia("2026-08-12T14:00:00.123")).toBe("2026-08-12T14:00:00-03:00");
  });

  it("espaço em volta não impede a conversão", () => {
    expect(comFusoDeBrasilia("  2026-08-12T14:00:00  ")).toBe("2026-08-12T14:00:00-03:00");
  });

  it("o que não é data vira null em vez de Invalid Date", () => {
    expect(comFusoDeBrasilia("não é data")).toBeNull();
    expect(comFusoDeBrasilia("2026-08-12")).toBeNull();
    expect(comFusoDeBrasilia("")).toBeNull();
    expect(comFusoDeBrasilia(null)).toBeNull();
  });

  it("NÃO reanexa offset em data que já tem um — evitaria '-03:00-03:00'", () => {
    // A regex casa o prefixo e o corte em 19 caracteres descarta o offset
    // antigo: o resultado continua sendo uma data válida com um único offset.
    expect(comFusoDeBrasilia("2026-08-12T14:00:00-03:00")).toBe("2026-08-12T14:00:00-03:00");
  });

  it("a virada do ano em Brasília não escorrega para o ano seguinte", () => {
    expect(new Date(comFusoDeBrasilia("2026-12-31T23:00:00")!).toISOString()).toBe(
      "2027-01-01T02:00:00.000Z",
    );
  });
});

describe("slugDeMunicipio", () => {
  it("tira acento, cedilha e espaço", () => {
    expect(slugDeMunicipio("São Paulo")).toBe("sao-paulo");
    expect(slugDeMunicipio("Açu")).toBe("acu");
    expect(slugDeMunicipio("Brejo da Madre de Deus")).toBe("brejo-da-madre-de-deus");
    expect(slugDeMunicipio("Olho d'Água do Casado")).toBe("olho-d-agua-do-casado");
  });
});

/**
 * O corte de valor suspeito é relativo ao próprio conjunto, e tem piso.
 *
 * Sem isso, o piloto de 2026-08-12 publicaria "R$ 81 bi licitados" por causa de
 * um único pregão de mobiliário digitado como R$ 77,84 bilhões — 88% do total
 * de seis estados vindo de um erro de digitação da fonte.
 */
describe("marcarValoresSuspeitos", () => {
  const conjunto = (n: number, valor: (i: number) => number) =>
    Array.from({ length: n }, (_, i) =>
      edital({ id: `e-${i}`, valorEstimado: valor(i), valorEstimadoBruto: valor(i) }),
    );

  it("lote pequeno não marca ninguém — com poucos editais o percentil é ruído", () => {
    const tres = conjunto(3, (i) => [1_000, 5_000, 900_000_000_000][i]);
    expect(marcarValoresSuspeitos(tres)).toEqual({ marcados: 0, corte: Infinity });
    expect(tres.every((e) => !e.valorSuspeito)).toBe(true);
  });

  it("a partir de 100 registros, isola o outlier grosseiro", () => {
    const lote = conjunto(120, (i) => 100_000 + i * 10_000);
    lote.push(edital({ id: "outlier", valorEstimado: 77_840_000_000, valorEstimadoBruto: 77_840_000_000 }));

    const { marcados, corte } = marcarValoresSuspeitos(lote);
    expect(marcados).toBe(1);
    expect(lote.find((e) => e.id === "outlier")!.valorSuspeito).toBe(true);
    expect(lote.filter((e) => e.id !== "outlier").every((e) => !e.valorSuspeito)).toBe(true);
    // O piso de R$ 1 bi domina em lote desta escala: sem ele, o maior valor
    // legítimo de um município pequeno viraria suspeito.
    expect(corte).toBe(1_000_000_000);
  });

  it("o piso protege lotes de valores altos porém legítimos", () => {
    // 120 editais entre R$ 500 mi e R$ 800 mi: nenhum passa do piso de R$ 1 bi.
    const lote = conjunto(120, (i) => 500_000_000 + i * 2_500_000);
    expect(marcarValoresSuspeitos(lote).marcados).toBe(0);
  });

  it("valores muito altos sobem o corte pelo percentil, não pelo piso", () => {
    const lote = conjunto(120, (i) => 1_000_000_000 + i * 1_000_000);
    const { corte } = marcarValoresSuspeitos(lote);
    expect(corte).toBeGreaterThan(1_000_000_000);
  });

  it("edital sem valor informado nunca é marcado", () => {
    const lote = conjunto(120, (i) => 100_000 + i * 10_000);
    const semValor = edital({ id: "sem-valor", valorEstimado: null, valorEstimadoBruto: 0 });
    lote.push(semValor, edital({ id: "outlier", valorEstimado: 9e12, valorEstimadoBruto: 9e12 }));
    marcarValoresSuspeitos(lote);
    expect(semValor.valorSuspeito).toBe(false);
  });

  it("o multiplicador é ajustável e o resultado do piloto não é sensível a ele", () => {
    // Medido em 2026-08-12: qualquer multiplicador entre 10 e 100 isolou
    // exatamente o mesmo registro. É isso que faz do corte uma regra, não chute.
    for (const multiplicador of [10, 20, 50, 100]) {
      const lote = conjunto(120, (i) => 100_000 + i * 10_000);
      lote.push(edital({ id: "outlier", valorEstimado: 77_840_000_000, valorEstimadoBruto: 77_840_000_000 }));
      expect(marcarValoresSuspeitos(lote, { multiplicador }).marcados).toBe(1);
    }
  });
});

describe("somaConfiavel", () => {
  it("soma o que é confiável", () => {
    expect(somaConfiavel([edital({ valorEstimado: 100 }), edital({ valorEstimado: 250 })])).toBe(350);
  });

  it("ignora o suspeito — é o ponto inteiro dela", () => {
    const lote = [
      edital({ id: "a", valorEstimado: 100 }),
      edital({ id: "b", valorEstimado: 77_840_000_000, valorSuspeito: true }),
    ];
    expect(somaConfiavel(lote)).toBe(100);
  });

  it("trata valor ausente como zero, não como NaN", () => {
    expect(somaConfiavel([edital({ valorEstimado: null }), edital({ valorEstimado: 100 })])).toBe(100);
  });

  it("lote vazio soma zero", () => {
    expect(somaConfiavel([])).toBe(0);
  });
});

describe("normalizarEdital", () => {
  const bruto = (over: Partial<ContratacaoPncp> = {}): ContratacaoPncp =>
    ({
      numeroControlePNCP: "11097292000149-1-000123/2026",
      objetoCompra: "  Aquisição de material de expediente  ",
      orgaoEntidade: { cnpj: "11097292000149", razaoSocial: "MUNICIPIO DE LIMOEIRO", poderId: "E", esferaId: "M" },
      unidadeOrgao: {
        ufNome: "Pernambuco", ufSigla: "PE", municipioNome: "Limoeiro",
        codigoIbge: "2608909", codigoUnidade: "1", nomeUnidade: "Secretaria",
      },
      amparoLegal: null,
      modalidadeId: 6, modalidadeNome: "Pregão - Eletrônico",
      modoDisputaId: 1, modoDisputaNome: "Aberto",
      situacaoCompraId: 1, situacaoCompraNome: "Divulgada no PNCP",
      tipoInstrumentoConvocatorioNome: "Edital",
      srp: false,
      valorTotalEstimado: 500_000, valorTotalHomologado: null,
      dataAberturaProposta: "2026-08-01T09:00:00",
      dataEncerramentoProposta: "2026-08-30T14:00:00",
      dataPublicacaoPncp: "2026-08-01T09:00:00",
      dataAtualizacaoGlobal: null,
      anoCompra: 2026, sequencialCompra: 123,
      numeroCompra: "123", processo: null, linkSistemaOrigem: null, informacaoComplementar: null,
      ...over,
    }) as ContratacaoPncp;

  it("declara a fonte e o id dentro dela, mantendo o id canônico", () => {
    const e = normalizarEdital(bruto(), "2026-08-13T07:00:00.000Z");
    expect(e.fonte).toBe("pncp");
    expect(e.idNaFonte).toBe("11097292000149-1-000123/2026");
    expect(e.id).toBe("11097292000149-1-000123/2026");
  });

  it("converte as datas para o fuso de Brasília", () => {
    const e = normalizarEdital(bruto(), "2026-08-13T07:00:00.000Z");
    expect(e.encerramentoProposta).toBe("2026-08-30T14:00:00-03:00");
  });

  it("valor 0 vira null, mas o bruto é preservado", () => {
    const e = normalizarEdital(bruto({ valorTotalEstimado: 0 }), "2026-08-13T07:00:00.000Z");
    expect(e.valorEstimado).toBeNull();
    expect(e.valorEstimadoBruto).toBe(0);
  });

  it("esfera desconhecida não vira palpite", () => {
    const e = normalizarEdital(
      bruto({ orgaoEntidade: { cnpj: "11097292000149", razaoSocial: "X", poderId: null, esferaId: "Z" } }),
      "2026-08-13T07:00:00.000Z",
    );
    expect(e.orgao.esfera).toBe("desconhecida");
  });
});

describe("diasAteEncerrar", () => {
  it("conta a partir do instante de referência", () => {
    expect(diasAteEncerrar(edital(), new Date("2026-08-20T17:00:00.000Z"))).toBe(10);
  });

  it("sem prazo, não inventa número", () => {
    expect(diasAteEncerrar(edital({ encerramentoProposta: null }), new Date())).toBeNull();
  });
});
