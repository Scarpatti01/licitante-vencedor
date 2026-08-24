import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ehTerminal,
  estadoDoLote,
  lerRespostasDoLote,
  montarCorpoDoLote,
  type ItemDoLote,
} from "./lote";

const SCHEMA = z.object({ objeto: z.string(), garantia: z.boolean() });
type Analise = z.infer<typeof SCHEMA>;

const item = (chave: string): ItemDoLote<Analise> => ({
  chave,
  prompt: `leia o edital ${chave}`,
  schema: SCHEMA,
});

/** Uma resposta bem formada, como a API devolve. */
const respostaOk = (valor: Analise) => ({
  response: {
    candidates: [{ content: { parts: [{ text: JSON.stringify(valor) }] } }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
  },
});

const A: Analise = { objeto: "merenda escolar", garantia: false };
const B: Analise = { objeto: "obra de drenagem", garantia: true };

describe("o corpo do pedido de lote", () => {
  it("manda um pedido por item, com a chave no metadata", () => {
    const corpo = montarCorpoDoLote([item("edital-1"), item("edital-2")], "leitura-noturna");
    const lote = corpo.batch as Record<string, unknown>;
    const pedidos = (
      (lote.input_config as Record<string, Record<string, unknown>>).requests.requests
    ) as Record<string, unknown>[];

    expect(lote.display_name).toBe("leitura-noturna");
    expect(pedidos).toHaveLength(2);
    expect((pedidos[0].metadata as Record<string, string>).key).toBe("edital-1");
    expect((pedidos[1].metadata as Record<string, string>).key).toBe("edital-2");
  });

  it("mantém temperatura zero, como a chamada avulsa", () => {
    // Lote e chamada avulsa precisam produzir a MESMA análise para o mesmo
    // edital. Se divergirem, a leitura passa a depender do caminho que ela
    // tomou, e o produto deixa de ser auditável.
    const corpo = montarCorpoDoLote([item("e1")], "x");
    const pedido = (
      ((corpo.batch as Record<string, Record<string, Record<string, unknown>>>)
        .input_config.requests.requests) as Record<string, unknown>[]
    )[0];
    const config = (pedido.request as Record<string, Record<string, unknown>>).generation_config;
    expect(config.temperature).toBe(0);
    expect(config.response_mime_type).toBe("application/json");
  });

  it("pede 16k de saída, e não os 8k que já cortaram nove leituras", () => {
    const corpo = montarCorpoDoLote([item("e1")], "x");
    const pedido = (
      ((corpo.batch as Record<string, Record<string, Record<string, unknown>>>)
        .input_config.requests.requests) as Record<string, unknown>[]
    )[0];
    const config = (pedido.request as Record<string, Record<string, unknown>>).generation_config;
    // A saída média medida é de 10.975 tokens. Com teto de 8.192, nove leituras
    // foram geradas, cobradas e descartadas por corte.
    expect(config.max_output_tokens).toBeGreaterThan(10_975);
  });
});

describe("o estado do lote", () => {
  it("traduz os estados da API", () => {
    expect(estadoDoLote("JOB_STATE_PENDING")).toBe("pendente");
    expect(estadoDoLote("JOB_STATE_RUNNING")).toBe("rodando");
    expect(estadoDoLote("JOB_STATE_SUCCEEDED")).toBe("concluido");
    expect(estadoDoLote("JOB_STATE_FAILED")).toBe("falhou");
    expect(estadoDoLote("JOB_STATE_EXPIRED")).toBe("expirado");
  });

  it("não desiste de um estado que não reconhece", () => {
    // Estado novo da API viraria leitura perdida se `desconhecido` fosse
    // terminal. Continuar consultando é seguro: quem chama tem o próprio
    // limite de tempo.
    expect(estadoDoLote("JOB_STATE_ALGO_NOVO")).toBe("desconhecido");
    expect(ehTerminal("desconhecido")).toBe(false);
    expect(ehTerminal("pendente")).toBe(false);
    expect(ehTerminal("concluido")).toBe(true);
    expect(ehTerminal("expirado")).toBe(true);
  });
});

describe("a leitura das respostas", () => {
  it("devolve cada análise na chave certa", () => {
    const leitura = lerRespostasDoLote(
      { dest: { inlinedResponses: [respostaOk(A), respostaOk(B)] } },
      ["edital-1", "edital-2"],
      SCHEMA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.itens[0]).toMatchObject({ ok: true, chave: "edital-1", valor: A });
    expect(leitura.itens[1]).toMatchObject({ ok: true, chave: "edital-2", valor: B });
    expect(leitura.itens[0].uso).toEqual({ entrada: 100, saida: 50, total: 150 });
  });

  it("DESCARTA O LOTE INTEIRO quando a contagem não bate", () => {
    // A guarda mais importante deste arquivo. A API liga resposta a pedido pela
    // POSIÇÃO no array. Com contagem diferente, nenhum par é confiável — e o
    // sintoma seria o edital A exibindo as exigências do edital B, com a tela
    // toda normal e nenhum erro em log.
    const leitura = lerRespostasDoLote(
      { dest: { inlinedResponses: [respostaOk(A)] } },
      ["edital-1", "edital-2", "edital-3"],
      SCHEMA,
    );
    expect(leitura.ok).toBe(false);
    if (leitura.ok) return;
    expect(leitura.motivo).toMatch(/1 respostas para 3 pedidos/);
    expect(leitura.motivo).toMatch(/POSIÇÃO/);
  });

  it("recusa o item quando a API devolve chave diferente da enviada", () => {
    const leitura = lerRespostasDoLote(
      { dest: { inlinedResponses: [{ ...respostaOk(A), metadata: { key: "outro-edital" } }] } },
      ["edital-1"],
      SCHEMA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.itens[0].ok).toBe(false);
    expect(leitura.itens[0]).toMatchObject({ motivo: expect.stringContaining("outro-edital") });
  });

  it("isola o erro de um item sem derrubar os vizinhos", () => {
    const leitura = lerRespostasDoLote(
      {
        dest: {
          inlinedResponses: [
            respostaOk(A),
            { error: { code: 429, message: "quota" } },
            respostaOk(B),
          ],
        },
      },
      ["e1", "e2", "e3"],
      SCHEMA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.itens.map((i) => i.ok)).toEqual([true, false, true]);
    expect(leitura.itens[1]).toMatchObject({ falha: "limite", chave: "e2" });
    // O vizinho continua na chave dele, e não escorrega uma posição.
    expect(leitura.itens[2]).toMatchObject({ chave: "e3", valor: B });
  });

  it("recusa resposta fora do schema, sem inventar valor", () => {
    const foraDoSchema = {
      response: {
        candidates: [{ content: { parts: [{ text: '{"objeto":"x"}' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      },
    };
    const leitura = lerRespostasDoLote(
      { dest: { inlinedResponses: [foraDoSchema] } }, ["e1"], SCHEMA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.itens[0]).toMatchObject({ ok: false, falha: "resposta_invalida" });
    // Cobra mesmo falhando, e o custo precisa aparecer.
    expect(leitura.itens[0].uso.total).toBe(15);
  });

  it("recusa JSON quebrado e resposta sem texto", () => {
    const quebrado = {
      response: { candidates: [{ content: { parts: [{ text: "{isso não é json" }] } }] },
    };
    const vazio = { response: { candidates: [] } };
    const leitura = lerRespostasDoLote(
      { dest: { inlinedResponses: [quebrado, vazio] } }, ["e1", "e2"], SCHEMA,
    );
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.itens.every((i) => !i.ok)).toBe(true);
  });

  it("reclama de resposta sem o envelope esperado, em vez de devolver vazio", () => {
    // Devolver lista vazia aqui seria "nenhum edital lido hoje", que é
    // indistinguível de um dia sem candidatos. Precisa gritar.
    expect(lerRespostasDoLote({}, ["e1"], SCHEMA)).toMatchObject({ ok: false });
    expect(lerRespostasDoLote({ dest: {} }, ["e1"], SCHEMA)).toMatchObject({ ok: false });
  });
});
