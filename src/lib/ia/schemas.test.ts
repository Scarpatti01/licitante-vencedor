import { describe, expect, it } from "vitest";
import { TIPOS_DE_DOCUMENTO } from "../dominio/tipos";
import {
  jsonSchemaParaModelo,
  LIMITE_DE_EXIGENCIAS,
  respostaDeAnaliseDeEdital,
} from "./schemas";

describe("respostaDeAnaliseDeEdital", () => {
  it("aceita 'não encontrei' como resposta bem formada", () => {
    const ausente = {
      encontrado: false,
      valor: null,
      evidencia: null,
      confianca: null,
      motivo: "O texto não trata do assunto.",
    };
    const r = respostaDeAnaliseDeEdital.safeParse({
      resumoExecutivo: ausente,
      criterioDeJulgamento: ausente,
      garantiaExigida: ausente,
      visitaTecnicaExigida: ausente,
      amostraExigida: ausente,
      exigencias: [],
      riscos: [],
    });

    // Se o schema recusasse isto, o caminho mais fácil para o modelo passaria a
    // ser inventar — que é exatamente o que o produto não pode ter.
    expect(r.success).toBe(true);
  });

  it("recusa tipo de documento fora da lista fechada do domínio", () => {
    const jsonSchema = JSON.stringify(jsonSchemaParaModelo(respostaDeAnaliseDeEdital));
    for (const tipo of TIPOS_DE_DOCUMENTO) expect(jsonSchema).toContain(`"${tipo}"`);
  });

  it("o limite de itens vai no schema, contra resposta em laço", () => {
    const jsonSchema = jsonSchemaParaModelo(respostaDeAnaliseDeEdital) as {
      properties: { exigencias: { maxItems?: number } };
    };
    expect(jsonSchema.properties.exigencias.maxItems).toBe(LIMITE_DE_EXIGENCIAS);
  });

  it("o JSON Schema sai sem $ref — suporte a referência varia por fornecedor", () => {
    expect(JSON.stringify(jsonSchemaParaModelo(respostaDeAnaliseDeEdital))).not.toContain("$ref");
  });
});
