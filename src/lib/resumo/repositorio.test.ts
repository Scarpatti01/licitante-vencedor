import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { abrirRepositorioDoResumo } from "./repositorio.ts";

/**
 * O que este arquivo guarda: a leitura da resposta do PostgREST.
 *
 * Em 26/08 o resumo diário foi vermelho com "Unexpected end of JSON input".
 * A causa não estava na consulta, nem no e-mail, nem no banco — estava em uma
 * linha que decidia quando havia corpo para ler, e decidia por uma lista de
 * códigos HTTP que estava incompleta.
 *
 * A gravidade não é a que o log sugere. Quando estourou, o e-mail já tinha
 * saído e a linha já estava no banco; o que se perdeu foi o resto do laço. Com
 * uma cliente cadastrada isso é um workflow vermelho. Com duas, a segunda passa
 * o dia sem resumo e nada no log diz que ela existia.
 */

const URL_FALSA = "https://exemplo.supabase.co";

function respostaVazia(status: number): Response {
  // `new Response(null, ...)` é exatamente o que o PostgREST devolve com
  // `return=minimal`: sem corpo, e sem `content-type` de JSON.
  return new Response(null, { status });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_FALSA;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-de-mentira";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gravar o envio não pode quebrar depois de gravar", () => {
  /*
   * O caso real, reproduzido: POST com `return=minimal`.
   *
   * O PostgREST responde **201 com corpo vazio**. 204 é o que ele usa em DELETE
   * e PATCH; a versão antiga conferia só o 204 e chamava `.json()` no 201.
   */
  it("aceita 201 sem corpo, que é o que `return=minimal` devolve", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respostaVazia(201)),
    );

    const repositorio = abrirRepositorioDoResumo();
    expect(repositorio).not.toBeNull();

    await expect(
      repositorio!.registrar("empresa-1", ["edital-a", "edital-b"], "id-do-provedor"),
    ).resolves.toBe(2);
  });

  it("aceita 204 sem corpo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respostaVazia(204)),
    );

    await expect(
      abrirRepositorioDoResumo()!.registrar("empresa-1", ["edital-a"], null),
    ).resolves.toBe(1);
  });

  it("não chama o banco quando não há edital para gravar", async () => {
    // Um POST com lista vazia faria o PostgREST recusar, e não há o que gravar.
    const chamadas = vi.fn(async () => respostaVazia(201));
    vi.stubGlobal("fetch", chamadas);

    await expect(abrirRepositorioDoResumo()!.registrar("empresa-1", [], null)).resolves.toBe(0);
    expect(chamadas).not.toHaveBeenCalled();
  });
});

describe("corpo com JSON continua sendo lido", () => {
  /*
   * O conserto não pode virar "engolir tudo": uma consulta que devolve lista
   * precisa continuar devolvendo lista, senão `destinatarias()` retorna vazio e
   * o resumo fica em silêncio — falha que ninguém vê, ao contrário da que este
   * arquivo nasceu para consertar.
   */
  it("uma consulta com resultado devolve as linhas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify([{ edital_id: "edital-a" }, { edital_id: "edital-b" }]), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const enviados = await abrirRepositorioDoResumo()!.jaEnviados("empresa-1");
    expect([...enviados].sort()).toEqual(["edital-a", "edital-b"]);
  });

  it("uma consulta sem resultado devolve conjunto vazio, e não estoura", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
      ),
    );

    expect((await abrirRepositorioDoResumo()!.jaEnviados("empresa-1")).size).toBe(0);
  });
});

describe("a recusa do banco continua sendo erro", () => {
  it("status de erro vira exceção com o corpo dentro", async () => {
    /*
     * A tentação, ao consertar "corpo vazio não é JSON", é tratar TODA resposta
     * estranha como ausência de dado. Isso transformaria um 401 por chave
     * trocada em "nenhum edital hoje" — o resumo pararia de sair e o workflow
     * ficaria verde.
     */
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("permission denied for table envios_do_resumo", { status: 401 })),
    );

    await expect(
      abrirRepositorioDoResumo()!.registrar("empresa-1", ["edital-a"], null),
    ).rejects.toThrow(/401/);
  });
});
