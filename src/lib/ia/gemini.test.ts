import { describe, expect, it, vi } from "vitest";
import { ApiError, FinishReason, GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import {
  chaveDoGemini,
  classificarErro,
  criarProvedorGemini,
  desembrulharJson,
  modelosGemini,
  noDialetoDoGemini,
  type ChamadaDeGeracao,
} from "./gemini";
import { jsonSchemaParaModelo, respostaDeAnaliseDeEdital } from "./schemas";

/**
 * O adaptador é testado sem tocar a rede: a chamada ao SDK é injetada.
 *
 * O que importa aqui não é o SDK funcionar — isso é problema do Google. É a
 * TRADUÇÃO: erro do fornecedor virando a categoria que decide se vale retentar,
 * e resposta do fornecedor virando dado validado ou falha declarada. É nessa
 * tradução que um 429 vira "análise indisponível" por engano.
 */

const schema = z.object({ valor: z.string() });

function respostaDoModelo(
  texto: string,
  over: Partial<GenerateContentResponse> = {},
): GenerateContentResponse {
  const r = new GenerateContentResponse();
  r.candidates = [
    {
      content: { role: "model", parts: [{ text: texto }] },
      finishReason: FinishReason.STOP,
    },
  ];
  r.usageMetadata = { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 };
  return Object.assign(r, over);
}

function provedorCom(chamada: ChamadaDeGeracao) {
  return criarProvedorGemini({ apiKey: "chave-de-teste", chamada });
}

const pedido = { prompt: "extraia", schema, modelo: "modelo-x" };

describe("configuração", () => {
  it("sem GEMINI_API_KEY o provedor se declara indisponível", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(chaveDoGemini()).toBeNull();
    expect(criarProvedorGemini().configurado()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("o modelo é sobrescrevível por ambiente, para migrar sem publicar código", () => {
    vi.stubEnv("GEMINI_MODELO_ECONOMICO", "modelo-novo");
    expect(modelosGemini().economico).toBe("modelo-novo");
    vi.unstubAllEnvs();
    expect(modelosGemini().economico).not.toBe("modelo-novo");
  });
});

describe("classificarErro", () => {
  it("401 e 403 são credencial, e não adianta insistir", () => {
    expect(classificarErro(new ApiError({ message: "no", status: 401 })).falha).toBe(
      "sem_credencial",
    );
    expect(classificarErro(new ApiError({ message: "no", status: 403 })).falha).toBe(
      "sem_credencial",
    );
  });

  it("429 é limite e 5xx é rede: os dois passam sozinhos", () => {
    expect(classificarErro(new ApiError({ message: "no", status: 429 })).falha).toBe("limite");
    expect(classificarErro(new ApiError({ message: "no", status: 503 })).falha).toBe("rede");
  });

  it("400 não é transitório: insistir esconderia um bug nosso", () => {
    expect(classificarErro(new ApiError({ message: "campo x", status: 400 })).falha).toBe(
      "desconhecida",
    );
  });

  it("cancelamento não é falha do fornecedor", () => {
    const abortado = new Error("abortado");
    abortado.name = "AbortError";
    expect(classificarErro(abortado).falha).toBe("cancelado");
  });
});

describe("desembrulharJson", () => {
  it("tira a cerca de markdown que o modelo às vezes acrescenta", () => {
    expect(desembrulharJson('```json\n{"valor":"a"}\n```')).toBe('{"valor":"a"}');
    expect(desembrulharJson('{"valor":"a"}')).toBe('{"valor":"a"}');
  });
});

describe("gerarEstruturado", () => {
  it("valida a resposta e devolve o objeto tipado", async () => {
    const provedor = provedorCom(async () => respostaDoModelo('{"valor":"ok"}'));
    const r = await provedor.gerarEstruturado(pedido);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor).toEqual({ valor: "ok" });
  });

  it("manda o schema e temperatura zero — extração não é tarefa criativa", async () => {
    let config: Record<string, unknown> = {};
    const provedor = provedorCom(async (p) => {
      config = p.config;
      return respostaDoModelo('{"valor":"ok"}');
    });
    await provedor.gerarEstruturado(pedido);

    expect(config.temperature).toBe(0);
    expect(config.responseMimeType).toBe("application/json");
    expect(config.responseJsonSchema).toBeTruthy();
  });

  it("conta os tokens de raciocínio como saída — a fatura conta", async () => {
    const provedor = provedorCom(async () =>
      respostaDoModelo('{"valor":"ok"}', {
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 20,
          thoughtsTokenCount: 300,
          totalTokenCount: 420,
        },
      }),
    );
    const r = await provedor.gerarEstruturado(pedido);

    expect(r.uso).toEqual({ entrada: 100, saida: 320, total: 420 });
  });

  it("resposta que não é JSON vira falha, não conserto criativo", async () => {
    const provedor = provedorCom(async () => respostaDoModelo("claro! aqui está:"));
    const r = await provedor.gerarEstruturado(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.falha).toBe("resposta_invalida");
  });

  it("JSON válido fora do schema também é falha", async () => {
    const provedor = provedorCom(async () => respostaDoModelo('{"valor":7}'));
    const r = await provedor.gerarEstruturado(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("valor");
  });

  it("recusa do modelo é declarada como recusa, e não como erro de formato", async () => {
    const provedor = provedorCom(async () =>
      respostaDoModelo("", {
        candidates: [{ content: { role: "model", parts: [] }, finishReason: FinishReason.SAFETY }],
      }),
    );
    const r = await provedor.gerarEstruturado(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.falha).toBe("recusa");
  });

  it("resposta cortada por limite de tokens diz que foi tamanho, não formato", async () => {
    const provedor = provedorCom(async () =>
      respostaDoModelo('{"valor":"me', {
        candidates: [
          {
            content: { role: "model", parts: [{ text: '{"valor":"me' }] },
            finishReason: FinishReason.MAX_TOKENS,
          },
        ],
      }),
    );
    const r = await provedor.gerarEstruturado(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("limite de tokens");
  });

  it("erro do SDK vira resultado, nunca exceção subindo para a página", async () => {
    const provedor = provedorCom(async () => {
      throw new ApiError({ message: "quota", status: 429 });
    });
    const r = await provedor.gerarEstruturado(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.falha).toBe("limite");
  });

  it("cobra o token gasto mesmo quando a resposta é rejeitada", async () => {
    const provedor = provedorCom(async () => respostaDoModelo("não é json"));
    const r = await provedor.gerarEstruturado(pedido);

    expect(r.uso.total).toBe(120);
  });
});

describe("noDialetoDoGemini", () => {
  /*
   * A tradução que fez a leitura funcionar, em 21/08.
   *
   * O diagnóstico (`scripts/diagnosticar-requisicao-de-ia.ts`) provou o que
   * nenhuma leitura de documentação teria dado: as chaves são inofensivas
   * ISOLADAS e fatais no schema inteiro. Estes testes guardam a remoção — sem
   * eles, alguém "limpando" a função devolveria o INVALID_ARGUMENT que custou
   * seis rodadas para localizar.
   */
  it("remove as quatro chaves que o Gemini recusa, em qualquer profundidade", () => {
    const traduzido = noDialetoDoGemini({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      properties: {
        itens: {
          type: "array",
          maxItems: 60,
          minItems: 1,
          items: { type: "object", additionalProperties: false, properties: { a: { type: "string" } } },
        },
      },
    });

    const texto = JSON.stringify(traduzido);
    for (const proibida of ["$schema", "additionalProperties", "maxItems", "minItems"]) {
      expect(texto, `${proibida} sobreviveu à tradução`).not.toContain(proibida);
    }
  });

  it("preserva tudo o que o modelo precisa para responder certo", () => {
    // Remover demais é o outro jeito de quebrar: sem `enum` o modelo inventa
    // categoria de documento, sem `required` ele omite campo.
    const traduzido = noDialetoDoGemini(jsonSchemaParaModelo(respostaDeAnaliseDeEdital)) as Record<
      string,
      unknown
    >;
    const texto = JSON.stringify(traduzido);

    expect(traduzido.type).toBe("object");
    expect(traduzido.required).toBeDefined();
    expect(traduzido.properties).toBeDefined();
    expect(texto).toContain("enum");
    expect(texto).toContain("anyOf");
    // As sete chaves da resposta continuam de pé.
    expect(Object.keys(traduzido.properties as object)).toHaveLength(7);
  });

  it("não altera o schema original — a validação local continua estrita", () => {
    /*
     * A separação que torna a remoção segura: o schema enviado é uma INSTRUÇÃO
     * ao modelo; quem decide o que vira dado é o `zod`, e ele continua com
     * `.max(LIMITE_DE_EXIGENCIAS)` e com o `z.object` que descarta campo extra.
     */
    const original = jsonSchemaParaModelo(respostaDeAnaliseDeEdital);
    const antes = JSON.stringify(original);
    noDialetoDoGemini(original);

    expect(JSON.stringify(original)).toBe(antes);
    expect(antes).toContain("maxItems");
  });

  it("atravessa array sem transformá-lo em objeto", () => {
    // `anyOf` é uma LISTA de schemas. Uma travessia que só entendesse objeto a
    // devolveria como `{0: ..., 1: ...}` — schema silenciosamente inválido.
    const traduzido = noDialetoDoGemini({
      anyOf: [{ type: "string", maxItems: 3 }, { type: "null" }],
    }) as { anyOf: unknown[] };

    expect(Array.isArray(traduzido.anyOf)).toBe(true);
    expect(traduzido.anyOf).toHaveLength(2);
    expect(traduzido.anyOf[0]).toEqual({ type: "string" });
  });
});
