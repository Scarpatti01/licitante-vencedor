import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aplicar } from "./repositorio.ts";

/**
 * O contrato com o PostgREST, escrito a partir do que ele FAZ.
 *
 * ## O DEFEITO QUE MOTIVOU ESTE ARQUIVO
 *
 * O teste da reentrega no PR #140 simulava o banco assim:
 *
 *     vi.stubGlobal("fetch", vi.fn(async () => new Response("[]")));
 *
 * Lista vazia, porque eu tinha escrito no comentário do repositório que era
 * isso que o PostgREST devolvia. Ele não devolve. O mock era a minha CRENÇA
 * sobre o serviço, e um mock construído a partir da suposição só consegue
 * confirmar a suposição: o teste passou, e a produção reprovou.
 *
 * O log do PostgREST em 08/09, às 21:53, com a compra já gravada desde 21:45:
 *
 *     POST | 409 | .../rest/v1/compras_da_jornada     × 13
 *
 * Cada 409 virava 503 para a Hotmart, e a fila de retentativa dela não
 * terminaria nunca sobre uma compra que estava salva.
 *
 * ## A LIÇÃO QUE ESTE ARQUIVO GUARDA
 *
 * Mock de serviço externo é afirmação sobre o mundo. Estes aqui vêm de linha de
 * log observada, e os números estão escritos junto com a data em que foram
 * vistos, para a próxima pessoa poder desconfiar deles com data na mão.
 */

const CREDENCIAIS = {
  NEXT_PUBLIC_SUPABASE_URL: "https://exemplo.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "chave-de-servico",
};

let antigas: Record<string, string | undefined>;

beforeEach(() => {
  antigas = {};
  for (const [nome, valor] of Object.entries(CREDENCIAIS)) {
    antigas[nome] = process.env[nome];
    process.env[nome] = valor;
  }
});

afterEach(() => {
  for (const [nome, valor] of Object.entries(antigas)) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }
  vi.unstubAllGlobals();
});

const LIBERAR = { fazer: "liberar", email: "quem@exemplo.com", referencia: "HP1" } as const;

describe("gravar a compra", () => {
  it("409 é reentrega, e reentrega é sucesso", async () => {
    // Observado em produção em 08/09 21:53: o índice único parcial de
    // `referencia_externa` não é alvo de conflito, então a violação vira 409.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 409 })));

    const resultado = await aplicar(LIBERAR);

    expect(
      resultado,
      "409 é o banco dizendo que a transação já está registrada. Devolver erro " +
        "aqui faz a rota responder 503, e a Hotmart reentregar para sempre uma " +
        "compra que já foi gravada.",
    ).toEqual({ ok: true, efeito: "repetida" });
  });

  it("a inserção não manda nenhuma coluna de chave estrangeira", async () => {
    /*
     * Esta é a premissa que torna o 409 legível: o PostgREST responde 409 para
     * unicidade E para chave estrangeira. Esta tabela tem uma só, `usuario_id`,
     * e enquanto a inserção não mandar `usuario_id` o 409 só pode ser duplicata.
     *
     * Quem acrescentar uma coluna aqui reprova neste teste, e a mensagem
     * explica por que a decisão de tratar 409 como sucesso precisa ser revista
     * junto. Sem isto, o dia em que alguém mandar `usuario_id` transforma um
     * vínculo quebrado em "compra registrada com sucesso", em silêncio.
     */
    const corpos: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        corpos.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify([{ id: "1" }]), { status: 201 });
      }),
    );

    await aplicar(LIBERAR);

    expect(corpos).toHaveLength(1);
    expect(
      Object.keys((corpos[0] as Record<string, unknown>[])[0]).sort(),
      "a leitura de 409 como duplicata depende de a inserção não tocar em chave " +
        "estrangeira. Acrescentou coluna? Reveja o tratamento do 409 em " +
        "`gravarCompra` antes de mudar este teste.",
    ).toEqual(["email", "origem", "referencia_externa"]);
  });

  it("não pede `ignore-duplicates`, que aqui não protege nada", async () => {
    // Ele mira a chave primária, que é gerada e nunca conflita. Mantê-lo
    // sugeriria uma proteção que não existe, que foi como o defeito nasceu.
    const cabecalhos: Array<Record<string, string>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        cabecalhos.push(init.headers as Record<string, string>);
        return new Response(JSON.stringify([{ id: "1" }]), { status: 201 });
      }),
    );

    await aplicar(LIBERAR);

    expect(cabecalhos[0].prefer).not.toContain("ignore-duplicates");
  });

  it("erro de verdade continua erro", async () => {
    // 409 virar sucesso não pode arrastar o resto junto: indisponibilidade
    // respondida como sucesso é compra perdida em definitivo.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("caiu", { status: 500 })));

    await expect(aplicar(LIBERAR)).resolves.toEqual({ ok: false, motivo: "banco-500" });
  });
});
