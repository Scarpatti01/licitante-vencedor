import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ehTerminal,
  estadoDoLote,
  esbocoDaEstrutura,
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

describe("os dois dialetos de estado do fornecedor", () => {
  /**
   * O erro que custou o primeiro ensaio real, em 24/08.
   *
   * O lote foi criado com sucesso e a espera consultou 176 vezes recebendo
   * `desconhecido`, até desistir por prazo. O lote quase certamente já tinha
   * terminado; nós é que não entendíamos a resposta.
   *
   * `JOB_STATE_*` é o dialeto da Vertex AI. A Batch API da Gemini Developer
   * API — a que usamos — responde `BATCH_STATE_*`. Dois produtos do mesmo
   * fornecedor, dois prefixos, e eu tinha programado o do produto errado.
   */
  it("entende o BATCH_STATE_ da Gemini Developer API", () => {
    expect(estadoDoLote("BATCH_STATE_SUCCEEDED")).toBe("concluido");
    expect(estadoDoLote("BATCH_STATE_PENDING")).toBe("pendente");
    expect(estadoDoLote("BATCH_STATE_RUNNING")).toBe("rodando");
    expect(estadoDoLote("BATCH_STATE_FAILED")).toBe("falhou");
    expect(estadoDoLote("BATCH_STATE_CANCELLED")).toBe("cancelado");
    expect(estadoDoLote("BATCH_STATE_EXPIRED")).toBe("expirado");
  });

  it("continua entendendo o JOB_STATE_ da Vertex AI", () => {
    // Não é excesso de zelo: se um dia a leitura mudar de produto, o vocabulário
    // antigo volta, e ninguém vai lembrar de reativá-lo.
    expect(estadoDoLote("JOB_STATE_SUCCEEDED")).toBe("concluido");
    expect(estadoDoLote("JOB_STATE_RUNNING")).toBe("rodando");
  });

  it("um sufixo concluído é terminal, venha do dialeto que vier", () => {
    expect(ehTerminal(estadoDoLote("BATCH_STATE_SUCCEEDED"))).toBe(true);
    expect(ehTerminal(estadoDoLote("JOB_STATE_SUCCEEDED"))).toBe(true);
  });

  it("um dialeto que ainda não existe continua sendo desconhecido, e não terminal", () => {
    // A decisão original segue de pé: estado novo não pode virar leitura
    // perdida. O que mudou é que agora `done` e o `bruto` no log impedem que
    // isso custe três horas de silêncio.
    expect(estadoDoLote("ESTADO_DE_2027")).toBe("desconhecido");
    expect(ehTerminal("desconhecido")).toBe(false);
  });
});

describe("achar as respostas onde quer que o fornecedor as ponha", () => {
  /**
   * O segundo ensaio real, em 25/08.
   *
   * O lote CONCLUIU, as respostas vieram, e nós as descartamos com
   * "resposta do lote sem `dest.inlinedResponses`" — porque procurávamos num
   * caminho literal e elas estavam em outro galho. Um caminho literal é uma
   * aposta na documentação estar completa, e cada aposta errada custa um lote.
   */
  const umItem = (texto: string) => ({
    response: {
      candidates: [{ content: { parts: [{ text: texto }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    },
  });

  const schema = z.object({ ok: z.boolean() });
  const CONTEUDO = JSON.stringify({ ok: true });

  it("acha em `dest.inlinedResponses`, a forma que já conhecíamos", () => {
    const leitura = lerRespostasDoLote({ dest: { inlinedResponses: [umItem(CONTEUDO)] } }, ["a"], schema);
    expect(leitura.ok).toBe(true);
  });

  it("acha em `response.inlinedResponses.inlinedResponses`, aninhado duas vezes", () => {
    const leitura = lerRespostasDoLote(
      { response: { inlinedResponses: { inlinedResponses: [umItem(CONTEUDO)] } } },
      ["a"],
      schema,
    );
    expect(leitura.ok).toBe(true);
  });

  it("acha em `output.inlinedResponses`, que ninguém prometeu mas pode vir", () => {
    const leitura = lerRespostasDoLote({ output: { inlinedResponses: [umItem(CONTEUDO)] } }, ["a"], schema);
    expect(leitura.ok).toBe(true);
  });

  /**
   * Achar o array NÃO afrouxa a guarda de posição. Ela é o que impede o edital
   * A de receber a análise do edital B, e continua valendo venha a resposta de
   * onde vier.
   */
  it("a guarda de contagem continua valendo em qualquer forma", () => {
    const leitura = lerRespostasDoLote(
      { response: { inlinedResponses: { inlinedResponses: [umItem(CONTEUDO)] } } },
      ["a", "b"],
      schema,
    );
    expect(leitura.ok).toBe(false);
    if (!leitura.ok) expect(leitura.motivo).toContain("POSIÇÃO");
  });

  it("quando não acha, o motivo mostra a forma que chegou", () => {
    // Sem isto, "não achei" manda procurar às cegas — e cada tentativa custa
    // um lote. É a mesma lição do estado em dialeto desconhecido.
    const leitura = lerRespostasDoLote({ metadata: { state: "X" }, done: true }, ["a"], schema);
    expect(leitura.ok).toBe(false);
    if (!leitura.ok) {
      expect(leitura.motivo).toContain("metadata");
      expect(leitura.motivo).toContain("done");
    }
  });

  it("o esboço mostra chaves, nunca valores", () => {
    // O corpo carrega a análise dos editais. Log não é lugar para despejar isso.
    const esboco = esbocoDaEstrutura({ segredo: "texto inteiro do edital", n: 42 });
    expect(esboco).toContain("segredo");
    expect(esboco).not.toContain("texto inteiro do edital");
  });
});
