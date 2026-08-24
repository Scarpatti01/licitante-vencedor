import { describe, expect, it, vi } from "vitest";

import { consultarLote, criarLote, esperarLote } from "./loteGemini";

const CHAVE = "chave-de-teste";

function respondendo(
  passos: { status?: number; corpo: unknown | string }[],
): { buscar: typeof fetch; pedidos: { url: string; init?: RequestInit }[] } {
  const pedidos: { url: string; init?: RequestInit }[] = [];
  let i = 0;

  const buscar = (async (url: string | URL | Request, init?: RequestInit) => {
    pedidos.push({ url: String(url), init });
    const passo = passos[Math.min(i, passos.length - 1)];
    i += 1;
    const texto = typeof passo.corpo === "string" ? passo.corpo : JSON.stringify(passo.corpo);
    return new Response(texto, { status: passo.status ?? 200 });
  }) as unknown as typeof fetch;

  return { buscar, pedidos };
}

describe("criarLote", () => {
  it("manda a chave no cabeçalho, nunca na URL", async () => {
    const { buscar, pedidos } = respondendo([{ corpo: { name: "batches/abc" } }]);
    await criarLote({ modelo: "gemini-x", corpo: { batch: {} }, chave: CHAVE, buscar });

    expect(
      pedidos[0].url,
      "a chave foi parar na URL. URL entra em log de proxy, em mensagem de erro " +
        "e no histórico do runner — cabeçalho, não.",
    ).not.toContain(CHAVE);
    expect((pedidos[0].init?.headers as Record<string, string>)["x-goog-api-key"]).toBe(CHAVE);
  });

  it("devolve o nome do lote, que é o que liga esta execução ao resultado", async () => {
    const { buscar } = respondendo([{ corpo: { name: "batches/abc" } }]);
    const criacao = await criarLote({ modelo: "gemini-x", corpo: {}, chave: CHAVE, buscar });
    expect(criacao).toEqual({ ok: true, nome: "batches/abc" });
  });

  it("recusa um lote criado sem `name`", async () => {
    // Sem o nome, o lote pode rodar, cobrar, e nós não termos como buscar a
    // resposta. Isso é erro, não aviso.
    const { buscar } = respondendo([{ corpo: { metadata: {} } }]);
    const criacao = await criarLote({ modelo: "gemini-x", corpo: {}, chave: CHAVE, buscar });
    expect(criacao.ok).toBe(false);
    if (!criacao.ok) expect(criacao.motivo).toContain("sem `name`");
  });

  it("relata o status e o corpo quando o fornecedor recusa", async () => {
    const { buscar } = respondendo([{ status: 400, corpo: { error: { message: "schema inválido" } } }]);
    const criacao = await criarLote({ modelo: "gemini-x", corpo: {}, chave: CHAVE, buscar });
    expect(criacao.ok).toBe(false);
    if (!criacao.ok) {
      expect(criacao.motivo).toContain("HTTP 400");
      expect(criacao.motivo).toContain("schema inválido");
    }
  });

  it("não deixa a exceção de rede subir", async () => {
    const buscar = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    const criacao = await criarLote({ modelo: "gemini-x", corpo: {}, chave: CHAVE, buscar });
    expect(criacao.ok).toBe(false);
    if (!criacao.ok) expect(criacao.motivo).toContain("ECONNRESET");
  });
});

describe("consultarLote", () => {
  it("traduz o estado do fornecedor para o vocabulário do projeto", async () => {
    const { buscar } = respondendo([{ corpo: { state: "JOB_STATE_SUCCEEDED" } }]);
    const consulta = await consultarLote({ nome: "batches/abc", chave: CHAVE, buscar });
    expect(consulta.ok && consulta.estado).toBe("concluido");
  });

  it("também lê o estado quando ele vem dentro de `metadata`", async () => {
    const { buscar } = respondendo([{ corpo: { metadata: { state: "JOB_STATE_RUNNING" } } }]);
    const consulta = await consultarLote({ nome: "batches/abc", chave: CHAVE, buscar });
    expect(consulta.ok && consulta.estado).toBe("rodando");
  });
});

describe("esperarLote", () => {
  const semEspera = { esperar: async () => {}, intervaloMs: 0 };

  it("volta assim que o estado é terminal", async () => {
    const { buscar } = respondendo([
      { corpo: { state: "JOB_STATE_PENDING" } },
      { corpo: { state: "JOB_STATE_RUNNING" } },
      { corpo: { state: "JOB_STATE_SUCCEEDED", dest: { inlinedResponses: [] } } },
    ]);

    const espera = await esperarLote({ nome: "batches/abc", chave: CHAVE, buscar, ...semEspera });
    expect(espera.ok && espera.estado).toBe("concluido");
    expect(espera.consultas).toBe(3);
  });

  it("uma falha de rede isolada não desiste do lote que já está rodando", async () => {
    /*
     * O lote já foi criado e já vai ser cobrado. Desistir por um timeout de rede
     * jogaria fora o que já foi pago.
     */
    let i = 0;
    const buscar = (async () => {
      i += 1;
      if (i === 1) throw new Error("timeout");
      return new Response(JSON.stringify({ state: "JOB_STATE_SUCCEEDED" }), { status: 200 });
    }) as unknown as typeof fetch;

    const espera = await esperarLote({ nome: "batches/abc", chave: CHAVE, buscar, ...semEspera });
    expect(espera.ok).toBe(true);
    expect(espera.consultas).toBe(2);
  });

  it("desiste quando o prazo acaba, e diz o último motivo conhecido", async () => {
    const { buscar } = respondendo([{ corpo: { state: "JOB_STATE_RUNNING" } }]);
    let relogio = 0;

    const espera = await esperarLote({
      nome: "batches/abc",
      chave: CHAVE,
      buscar,
      intervaloMs: 0,
      prazoMs: 100,
      esperar: async () => {
        relogio += 40;
      },
      agora: () => relogio,
    });

    expect(espera.ok).toBe(false);
    if (!espera.ok) expect(espera.motivo).toContain("não terminou dentro do prazo");
  });

  it("continua esperando num estado que não conhecemos", async () => {
    /*
     * Estado novo da API não pode virar leitura perdida. `desconhecido` não é
     * terminal de propósito — ver o comentário de `ehTerminal`.
     */
    const { buscar } = respondendo([{ corpo: { state: "JOB_STATE_INVENTADO_AMANHA" } }]);
    const aoConsultar = vi.fn();
    let relogio = 0;

    const espera = await esperarLote({
      nome: "batches/abc",
      chave: CHAVE,
      buscar,
      intervaloMs: 0,
      prazoMs: 100,
      esperar: async () => {
        relogio += 40;
      },
      agora: () => relogio,
      aoConsultar,
    });

    expect(espera.ok).toBe(false);
    expect(aoConsultar).toHaveBeenCalledWith("desconhecido", 1);
  });
});
