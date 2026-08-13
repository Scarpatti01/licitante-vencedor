import { describe, expect, it } from "vitest";
import {
  dividirEmBlocos,
  ehTitulo,
  MARCA_DE_OMISSAO,
  pontuarBloco,
  segmentarEdital,
} from "./segmentacao";

/**
 * O edital sintético abaixo imita o que a segmentação precisa acertar num
 * documento real: preâmbulo curto, algumas cláusulas que decidem participação
 * (habilitação, garantia, penalidade) e uma montanha de minuta de contrato que
 * não muda decisão nenhuma e responde por quase todo o tamanho.
 */
function editalSintetico({ enchimento = 40 } = {}): string {
  const boilerplate = Array.from(
    { length: enchimento },
    (_, i) =>
      `${20 + i}. DA MINUTA DO CONTRATO\nAs partes elegem o foro da comarca para dirimir dúvidas oriundas do presente instrumento, renunciando a qualquer outro por mais privilegiado que seja, e declaram cumprir as formalidades legais aplicáveis ao ajuste ora celebrado entre elas nesta data.`,
  ).join("\n");

  return [
    "PREGÃO ELETRÔNICO 15/2026",
    "1. DO OBJETO",
    "Aquisição de material de expediente para a Secretaria de Educação do Município, conforme especificações do termo de referência.",
    "",
    "7. DA HABILITAÇÃO",
    "Para fins de habilitação, a licitante deverá apresentar certidão negativa de débitos federais, certificado de regularidade do FGTS e certidão negativa de débitos trabalhistas (CNDT), além do contrato social em vigor.",
    "",
    "8. DA GARANTIA CONTRATUAL",
    "Será exigida garantia contratual no percentual de 5% (cinco por cento) do valor do contrato, na modalidade caução em dinheiro, seguro-garantia ou fiança bancária, a ser prestada no prazo de dez dias.",
    "",
    "9. DAS PENALIDADES",
    "O descumprimento das obrigações sujeitará a contratada às sanções de advertência, multa de 10% sobre o valor do contrato e impedimento de licitar pelo prazo de até três anos.",
    "",
    boilerplate,
  ].join("\n");
}

describe("ehTitulo", () => {
  it("reconhece as quebras que o próprio edital usa", () => {
    expect(ehTitulo("7.1.2. Da qualificação técnica")).toBe(true);
    expect(ehTitulo("CLÁUSULA SEGUNDA - DO PRAZO")).toBe(true);
    expect(ehTitulo("ANEXO I")).toBe(true);
    expect(ehTitulo("DA HABILITAÇÃO")).toBe(true);
  });

  it("não confunde texto corrido com título", () => {
    expect(ehTitulo("A licitante deverá apresentar certidão negativa de débitos.")).toBe(false);
    expect(ehTitulo("")).toBe(false);
  });
});

describe("pontuarBloco", () => {
  it("pontua o que decide participação e ignora o que não decide", () => {
    const habilitacao = pontuarBloco(
      "Para fins de habilitação será exigida certidão negativa e regularidade fiscal.",
    );
    const foro = pontuarBloco("As partes elegem o foro da comarca para dirimir dúvidas.");

    expect(habilitacao.pontos).toBeGreaterThan(0);
    expect(habilitacao.secoes).toContain("habilitacao");
    expect(foro.pontos).toBe(0);
  });

  it("o segundo termo da mesma seção confirma, mas não multiplica a relevância", () => {
    const um = pontuarBloco("Trata da garantia contratual exigida.");
    const quatro = pontuarBloco("Garantia contratual, seguro garantia, caução e fiança bancária.");

    expect(quatro.pontos).toBeGreaterThan(um.pontos);
    // Quatro acertos valem menos que quatro vezes um: sem isso, uma lista de
    // certidões repetidas venceria a cláusula de garantia, que aparece uma vez
    // e decide a participação.
    expect(quatro.pontos).toBeLessThan(um.pontos * 4);
  });

  it("sigla curta não casa dentro de outra palavra", () => {
    // "cau" (conselho de arquitetura) dentro de "caução" fazia a cláusula de
    // garantia pontuar como qualificação técnica.
    const garantia = pontuarBloco("Será exigida caução em dinheiro como garantia contratual.");
    expect(garantia.secoes).not.toContain("qualificacao_tecnica");

    const conselho = pontuarBloco("O responsável técnico deverá ter registro no CAU.");
    expect(conselho.secoes).toContain("qualificacao_tecnica");
  });

  it("aceita flexão em termo longo — 'penalidade' acha 'penalidades'", () => {
    expect(pontuarBloco("DAS PENALIDADES APLICÁVEIS").secoes).toContain("penalidades");
  });
});

describe("dividirEmBlocos", () => {
  it("corta nos títulos, não no meio de uma exigência", () => {
    const blocos = dividirEmBlocos(editalSintetico({ enchimento: 4 }));
    expect(blocos.length).toBeGreaterThan(1);
    // A cláusula de garantia tem de estar inteira em algum bloco: partida ao
    // meio, o percentual iria para um lado e a modalidade para o outro.
    const comGarantia = blocos.find((b) => b.includes("5% (cinco por cento)"));
    expect(comGarantia).toBeDefined();
    expect(comGarantia).toContain("fiança bancária");
  });
});

describe("segmentarEdital", () => {
  it("documento que cabe no orçamento vai inteiro, sem recorte", () => {
    const texto = editalSintetico({ enchimento: 2 });
    const seg = segmentarEdital(texto, { orcamento: 100_000 });

    expect(seg.texto).toBe(texto.trim());
    expect(seg.omitiu).toBe(false);
    expect(seg.descartouRelevante).toBe(false);
  });

  it("documento grande perde a minuta e mantém o que decide", () => {
    const seg = segmentarEdital(editalSintetico({ enchimento: 200 }), { orcamento: 4_000 });

    expect(seg.caracteresSelecionados).toBeLessThan(seg.caracteresOriginais);
    expect(seg.texto).toContain("HABILITAÇÃO");
    expect(seg.texto).toContain("GARANTIA");
    expect(seg.texto).toContain("PENALIDADES");
    expect(seg.omitiu).toBe(true);
  });

  it("mantém o preâmbulo sempre — sem objeto o modelo lê cláusula solta", () => {
    const seg = segmentarEdital(editalSintetico({ enchimento: 200 }), { orcamento: 3_000 });
    expect(seg.texto).toContain("PREGÃO ELETRÔNICO 15/2026");
  });

  it("marca o buraco no texto, para o modelo não costurar os dois lados", () => {
    const seg = segmentarEdital(editalSintetico({ enchimento: 200 }), { orcamento: 4_000 });
    expect(seg.texto).toContain(MARCA_DE_OMISSAO.trim());
  });

  it("remonta na ordem original do documento", () => {
    const seg = segmentarEdital(editalSintetico({ enchimento: 200 }), { orcamento: 4_000 });
    expect(seg.texto.indexOf("HABILITAÇÃO")).toBeLessThan(seg.texto.indexOf("GARANTIA"));
    expect(seg.texto.indexOf("GARANTIA")).toBeLessThan(seg.texto.indexOf("PENALIDADES"));
  });

  it("avisa quando teve de descartar trecho RELEVANTE — é o sinal de escalonamento", () => {
    const largo = segmentarEdital(editalSintetico({ enchimento: 200 }), { orcamento: 4_000 });
    const apertado = segmentarEdital(editalSintetico({ enchimento: 200 }), { orcamento: 700 });

    expect(largo.descartouRelevante).toBe(false);
    expect(apertado.descartouRelevante).toBe(true);
  });

  it("relata as seções encontradas, que alimentam a política de custo", () => {
    const seg = segmentarEdital(editalSintetico({ enchimento: 200 }), { orcamento: 4_000 });
    expect(seg.secoesEncontradas).toEqual(
      expect.arrayContaining(["habilitacao", "garantia", "penalidades"]),
    );
  });

  it("texto vazio não vira análise nem erro", () => {
    const seg = segmentarEdital("");
    expect(seg.texto).toBe("");
    expect(seg.blocosTotais).toBe(0);
    expect(seg.omitiu).toBe(false);
  });
});
