import { afterEach, describe, expect, it, vi } from "vitest";
import { coletarEditaisAbertos, ErroDeOrcamento } from "./cliente";

/**
 * O orçamento de tempo, exercitado contra um PNCP que não colabora.
 *
 * Estes testes existem por causa da coleta de 2026-08-13, em que 4 das 6 UFs
 * ficaram sem nenhum edital. O orçamento existia no script, mas era conferido
 * entre editais PRODUZIDOS — e uma UF que não consegue a primeira página não
 * produz nenhum, então ficava presa na retentativa (6 tentativas × 60s de
 * timeout) devorando o tempo das UFs seguintes.
 *
 * O que se mede aqui não é "o erro certo apareceu", é **quanto tempo passou**.
 * Um teste que só conferisse a mensagem passaria com o código antigo.
 */

const PAGINA_VAZIA = JSON.stringify({ data: [], totalPaginas: 0 });

async function consumir(gerador: AsyncGenerator<unknown>): Promise<unknown[]> {
  const itens: unknown[] = [];
  for await (const item of gerador) itens.push(item);
  return itens;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("orçamento de tempo da coleta", () => {
  it("com o prazo já vencido, avisa e não consulta o PNCP", async () => {
    const buscar = vi.fn(async () => new Response(PAGINA_VAZIA));
    vi.stubGlobal("fetch", buscar);

    await expect(
      consumir(coletarEditaisAbertos({ uf: "PE", dataFinal: "20260901", prazo: Date.now() - 1 })),
    ).rejects.toBeInstanceOf(ErroDeOrcamento);

    // Gastar uma requisição cujo resultado já não caberia no orçamento é
    // exatamente o desperdício que tira tempo das UFs seguintes.
    expect(buscar).not.toHaveBeenCalled();
  });

  /**
   * O teste que reprova o código antigo.
   *
   * Com o PNCP devolvendo 500 sem parar, a versão anterior gastava 6 tentativas
   * com espera exponencial antes de desistir — minutos, para uma única página.
   * Com o prazo na camada HTTP, a desistência acontece dentro do orçamento.
   */
  it("um PNCP fora do ar não consome mais que o orçamento", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("fora do ar", { status: 500 })),
    );

    const comecou = Date.now();
    const orcamentoMs = 300;

    await expect(
      consumir(
        coletarEditaisAbertos({
          uf: "PE",
          dataFinal: "20260901",
          prazo: Date.now() + orcamentoMs,
        }),
      ),
    ).rejects.toBeInstanceOf(ErroDeOrcamento);

    const gasto = Date.now() - comecou;
    // Folga generosa para máquina lenta de CI, e ainda assim uma ordem de
    // grandeza abaixo dos minutos que o código anterior levava.
    expect(gasto).toBeLessThan(orcamentoMs + 2_000);
  });

  it("o erro de orçamento se distingue de falha do portal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("fora do ar", { status: 500 })),
    );

    const erro = await consumir(
      coletarEditaisAbertos({ uf: "PE", dataFinal: "20260901", prazo: Date.now() + 200 }),
    ).catch((e) => e);

    // O relatório de cobertura mostra este texto, e "sem tempo" e "portal fora
    // do ar" levam a decisões opostas: a primeira pede mais orçamento ou menos
    // UFs por rodada; a segunda, esperar o PNCP voltar.
    expect(erro).toBeInstanceOf(ErroDeOrcamento);
    expect((erro as Error).message).toMatch(/orçamento de tempo esgotado/);
    // Sem perder o que de fato aconteceu por baixo.
    expect((erro as Error).message).toMatch(/500/);
  });

  it("a espera do 429 não dorme além do prazo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("devagar", { status: 429 })),
    );

    const esperas: number[] = [];
    const orcamentoMs = 250;
    const comecou = Date.now();

    await consumir(
      coletarEditaisAbertos({
        uf: "PE",
        dataFinal: "20260901",
        prazo: Date.now() + orcamentoMs,
        aoEsperar: (_motivo, ms) => esperas.push(ms),
      }),
    ).catch(() => undefined);

    // A espera cega do 429 começa em 15s. Dormir isso com 250ms de orçamento
    // gastaria tempo que pertence às UFs seguintes — e ainda acordaria para
    // descobrir que não há mais tempo.
    for (const espera of esperas) expect(espera).toBeLessThanOrEqual(orcamentoMs);
    expect(Date.now() - comecou).toBeLessThan(orcamentoMs + 2_000);
  });

  /**
   * Prazo fracionário — o defeito que só apareceu rodando contra o PNCP real.
   *
   * O script reparte o tempo entre as UFs restantes (`restante / (total - i)`),
   * o que dá milissegundo fracionário para toda UF menos a última. Esse valor
   * chegava a `AbortSignal.timeout()` e a `setTimeout()`, que exigem inteiro, e
   * a exceção voltava classificada como erro de rede — cinco UFs "falhando" sem
   * que a mensagem apontasse para a causa.
   *
   * O teste passa um prazo deliberadamente fracionário e exige coleta normal.
   */
  it("aceita prazo fracionário sem quebrar", async () => {
    const pagina = JSON.stringify({
      data: [{ numeroControlePNCP: "x" }],
      totalPaginas: 1,
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(pagina)));

    const itens = await consumir(
      coletarEditaisAbertos({
        uf: "PE",
        dataFinal: "20260901",
        prazo: Date.now() + 30_000.6667,
      }),
    );

    expect(itens).toHaveLength(1);
  });

  it("sem prazo, nada corta — o comportamento antigo é preservado", async () => {
    const pagina = JSON.stringify({
      data: [{ numeroControlePNCP: "x" }],
      totalPaginas: 1,
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(pagina)));

    const itens = await consumir(
      coletarEditaisAbertos({ uf: "PE", dataFinal: "20260901" }),
    );

    expect(itens).toHaveLength(1);
  });

  /**
   * Parar entre páginas não pode ser silencioso.
   *
   * `classificarUf` trata motivo nulo como UF COMPLETA. Uma parada muda no meio
   * da paginação declararia "coletei tudo" para uma UF interrompida — que é
   * exatamente a mentira sobre cobertura que a guarda de degradação existe para
   * impedir, reintroduzida por baixo dela.
   *
   * A janela é a pausa de cortesia entre páginas, de até 800ms: é onde o
   * orçamento costuma acabar, não uma borda rara.
   */
  it("interrompido entre páginas, avisa em vez de parecer completo", async () => {
    const pagina = JSON.stringify({
      data: [{ numeroControlePNCP: "a" }],
      totalPaginas: 5,
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(pagina)));

    const entregues: unknown[] = [];
    let capturado: unknown;

    try {
      for await (const item of coletarEditaisAbertos({
        uf: "PE",
        dataFinal: "20260901",
        prazo: Date.now() + 120,
        pausaMs: 800,
      })) {
        entregues.push(item);
      }
    } catch (e) {
      capturado = e;
    }

    // Avisou: o script transforma isto em `motivo`, e motivo é o que separa
    // "parcial" de "completa".
    expect(capturado).toBeInstanceOf(ErroDeOrcamento);
    // E não engoliu o que já tinha vindo: a coleta é parcial, não perdida.
    expect(entregues.length).toBeGreaterThanOrEqual(1);
    expect(entregues.length).toBeLessThan(5);
  });
});
