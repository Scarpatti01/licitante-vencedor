import { describe, expect, it } from "vitest";
import { edital } from "../fontes/fixtures";
import { criarProvedorFalso } from "../ia/provedor-falso";
import { analisarEdital } from "../ia/analisar-edital";
import { textoParaAnalise } from "./texto";
import type { DocumentoProcessado } from "./processar";

/**
 * A ligação inteira, exercitada de ponta a ponta sem rede e sem chave.
 *
 * Os testes vizinhos cobrem cada peça — extrair, decidir, ordenar. Este cobre a
 * costura, que é onde as peças certas costumam produzir um todo errado: o texto
 * dos documentos precisa chegar ao modelo E ser o mesmo texto contra o qual
 * `evidencia.ts` confere as citações. Se os dois divergirem, a trava
 * anti-invenção do produto passa a conferir contra a coisa errada e aprova o
 * que deveria recusar.
 *
 * O provedor falso é o que permite provar isso sem `GEMINI_API_KEY` — sem ele,
 * o caminho da análise só seria exercitado em produção.
 */

function doc(titulo: string, texto: string): DocumentoProcessado {
  return {
    sequencial: 1,
    titulo,
    extracao: { ok: true, texto, paginas: 1, origem: titulo },
  };
}

const TRECHO = "A visita técnica é facultativa e deverá ser agendada em até 2 dias úteis";

const campo = <T,>(motivo = "não consta") => ({
  encontrado: false, valor: null as T | null, evidencia: null, confianca: null, motivo,
});
const achou = <T,>(valor: T, evidencia: string) => ({
  encontrado: true, valor, evidencia, confianca: "alta" as const, motivo: null,
});

/**
 * Resposta COMPLETA do modelo.
 *
 * O schema valida o objeto inteiro: uma resposta parcial é rejeitada de uma vez
 * e todos os campos voltam nulos. Isso já custou uma investigação aqui — o
 * teste falhava parecendo defeito da evidência quando era resposta incompleta.
 */
function resposta(over: Record<string, unknown> = {}) {
  return {
    resumoExecutivo: campo<string>(),
    criterioDeJulgamento: campo<string>(),
    garantiaExigida: campo<boolean>(),
    visitaTecnicaExigida: campo<boolean>(),
    amostraExigida: campo<boolean>(),
    exigencias: [],
    riscos: [],
    ...over,
  };
}

describe("do documento extraído até a análise", () => {
  it("o texto dos documentos chega ao prompt do modelo", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: resposta() });

    const texto = textoParaAnalise([
      doc("EDITAL PREGÃO 001", `Objeto: aquisição de material. ${TRECHO}.`),
    ]);

    await analisarEdital(edital(), { provedor, textoDoDocumento: texto });

    expect(provedor.chamadas).toBe(1);
    // O que foi extraído tem de estar no que o modelo leu; sem isto, a análise
    // seguiria opinando só sobre os metadados da publicação.
    expect(provedor.pedidos[0].prompt).toContain(TRECHO);
  });

  it("o cabeçalho de origem viaja junto, para a evidência ser rastreável", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: resposta() });

    const texto = textoParaAnalise([doc("ANEXO I - TR", "especificações técnicas do objeto")]);
    await analisarEdital(edital(), { provedor, textoDoDocumento: texto });

    expect(provedor.pedidos[0].prompt).toContain("ANEXO I - TR");
  });

  /**
   * A trava anti-invenção, na costura.
   *
   * `evidencia.ts` confere se o trecho citado existe no texto REALMENTE enviado.
   * Este teste faz o modelo citar algo que está no documento extraído e exige
   * que sobreviva — provando que o texto conferido é o mesmo que foi enviado, e
   * não uma versão paralela.
   */
  it("evidência que existe no documento extraído sobrevive à conferência", async () => {
    const provedor = criarProvedorFalso({
      tipo: "resposta",
      dados: resposta({
        resumoExecutivo: achou("Aquisição de material de expediente.", TRECHO),
      }),
    });

    const texto = textoParaAnalise([doc("EDITAL", `Objeto: material. ${TRECHO}.`)]);
    const analise = await analisarEdital(edital(), { provedor, textoDoDocumento: texto });

    expect(analise.resumoExecutivo?.valor).toBe("Aquisição de material de expediente.");
  });

  /*
   * O outro lado da mesma trava: citação que o modelo inventou não pode passar
   * só porque veio com aparência de citação. Sem o texto extraído chegando
   * corretamente, ESTE teste passaria por acidente — o campo cairia por falta
   * de fonte, não por conferência.
   */
  it("evidência ausente do documento é recusada", async () => {
    const provedor = criarProvedorFalso({
      tipo: "resposta",
      dados: resposta({
        resumoExecutivo: achou(
          "Contratação de obra de pavimentação.",
          "cláusula que nunca foi escrita em documento nenhum",
        ),
      }),
    });

    const texto = textoParaAnalise([doc("EDITAL", `Objeto: material. ${TRECHO}.`)]);
    const analise = await analisarEdital(edital(), { provedor, textoDoDocumento: texto });

    expect(analise.resumoExecutivo?.valor).not.toBe("Contratação de obra de pavimentação.");
  });

  it("sem documento legível, a análise não é chamada às cegas", async () => {
    // `textoParaAnalise` devolve `null`, e o chamador decide. Rodar sobre nada
    // gastaria uma chamada de modelo para produzir "não encontrei" em tudo.
    const semTexto = textoParaAnalise([
      { sequencial: 1, titulo: "x", extracao: { ok: false, motivo: "precisa-de-ocr", origem: "x" } },
    ]);

    expect(semTexto).toBeNull();
  });
});
