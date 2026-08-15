import { describe, expect, it } from "vitest";
import { prioridadeDoTitulo, textoParaAnalise } from "./texto";
import type { DocumentoProcessado } from "./processar";

function doc(titulo: string, texto: string | null = "conteúdo"): DocumentoProcessado {
  return {
    sequencial: 1,
    titulo,
    extracao:
      texto === null
        ? { ok: false, motivo: "precisa-de-ocr", origem: titulo }
        : { ok: true, texto, paginas: 1, origem: titulo },
  };
}

describe("prioridadeDoTitulo", () => {
  it("põe o edital na frente de tudo", () => {
    expect(prioridadeDoTitulo("EDITAL_PREGAO_001.pdf")).toBeLessThan(
      prioridadeDoTitulo("Minuta de Contrato"),
    );
  });

  /*
   * Títulos reais do PNCP usam underscore, e `_` conta como caractere de
   * palavra — `\bedital\b` NÃO casa em `EDITAL_CONCORRENCIA`. Estes títulos
   * saíram da amostra medida, não da imaginação.
   */
  it.each([
    "4__EDITAL_CONCORRNCIA_COM_INVERSO_DE_FASES",
    "EDITAL_Concorrncia__PAVIMENTAO",
    "EDITAL COMPLETO ASSINADO.pdf",
    "00 - Edital PEL 90012.2026",
  ])("reconhece o edital em %s", (titulo) => {
    expect(prioridadeDoTitulo(titulo)).toBe(0);
  });

  /*
   * `ANEXO I do Edital - TR` contém as duas palavras e É o termo de referência.
   * Se "edital" fosse testado primeiro, todo anexo que cita o edital no nome
   * roubaria a primeira posição — justamente a que o orçamento garante.
   */
  it("anexo que cita o edital no nome não rouba a primeira posição", () => {
    expect(prioridadeDoTitulo("01 ANEXO I do Edital - TR - PEL 90012")).toBe(1);
    expect(prioridadeDoTitulo("EDITAL COMPLETO")).toBe(0);
  });

  it("reconhece termo de referência nas formas que o PNCP publica", () => {
    for (const t of ["TERMO_DE_REFERENCIA.pdf", "Termo de Referência", "Projeto Basico"]) {
      expect(prioridadeDoTitulo(t)).toBe(1);
    }
  });

  /*
   * Planilha de orçamento raramente muda a decisão de participar e ocupa muito
   * do orçamento de caracteres com número solto. Fica atrás inclusive do que
   * não foi reconhecido — perder um anexo desconhecido custa mais que perder
   * uma planilha.
   */
  it("deixa planilha por último, atrás até do desconhecido", () => {
    expect(prioridadeDoTitulo("ORCAMENTO_SEM_DESONERACAO.xls")).toBeGreaterThan(
      prioridadeDoTitulo("documento-3"),
    );
  });

  it("título desconhecido vai para o fim, nunca para a frente", () => {
    // Erra para o lado seguro: na dúvida, não desloca o edital.
    expect(prioridadeDoTitulo("SEI91017311")).toBeGreaterThan(prioridadeDoTitulo("EDITAL"));
  });
});

describe("textoParaAnalise", () => {
  /**
   * O teste que carrega a decisão do arquivo.
   *
   * A segmentação corta num orçamento de caracteres, então o que vem primeiro é
   * o que sobrevive. Com a ordem que o PNCP devolveu — arbitrária — o orçamento
   * poderia ser gasto numa minuta enquanto o edital fica de fora, e a análise
   * responderia sobre o documento errado com aparência de certeza.
   */
  it("põe o edital antes dos anexos, mesmo vindo por último da fonte", () => {
    const texto = textoParaAnalise([
      doc("Planilha de Orçamento", "PLANILHA"),
      doc("Minuta de Contrato", "MINUTA"),
      doc("EDITAL PREGÃO 001", "EDITAL"),
    ]);

    expect(texto).not.toBeNull();
    const posicoes = ["EDITAL", "MINUTA", "PLANILHA"].map((t) => texto!.indexOf(t));
    expect(posicoes[0]).toBeLessThan(posicoes[1]);
    expect(posicoes[1]).toBeLessThan(posicoes[2]);
  });

  it("mantém a ordem da fonte no empate", () => {
    // Dois anexos de mesmo peso saem na ordem em que o órgão publicou, que
    // costuma ser a ordem de leitura pretendida.
    const texto = textoParaAnalise([doc("Anexo II", "SEGUNDO"), doc("Anexo I", "PRIMEIRO")]);
    expect(texto!.indexOf("SEGUNDO")).toBeLessThan(texto!.indexOf("PRIMEIRO"));
  });

  /*
   * O cabeçalho não é enfeite: quando `evidencia.ts` confirma um trecho, quem
   * lê precisa saber se ele veio do edital ou de um anexo. "O edital exige X" e
   * "a minuta menciona X" não são a mesma afirmação.
   */
  it("marca de qual documento cada trecho veio", () => {
    const texto = textoParaAnalise([doc("EDITAL 001", "conteúdo do edital")]);
    expect(texto).toContain("=== EDITAL 001 ===");
  });

  it("ignora documento que não rendeu texto", () => {
    const texto = textoParaAnalise([doc("EDITAL", "legível"), doc("ANEXO digitalizado", null)]);

    expect(texto).toContain("legível");
    expect(texto).not.toContain("ANEXO digitalizado");
  });

  /*
   * `null` e string vazia são coisas diferentes. Vazio faria a análise rodar
   * sobre nada e responder "não encontrei" para tudo — gastando uma chamada de
   * modelo para produzir uma resposta que já se sabia.
   */
  it("devolve null quando nada foi extraído", () => {
    expect(textoParaAnalise([])).toBeNull();
    expect(textoParaAnalise([doc("A", null), doc("B", null)])).toBeNull();
  });
});
