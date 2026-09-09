import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { esquecerTudo } from "@/lib/limite-de-taxa";
import * as conviteDoModulo from "@/lib/hotmart/convite";

/**
 * O que esta rota NÃO pode contar.
 *
 * Ela existe porque e-mail se perde: o convite sai uma vez, na gravação da
 * compra, e se cair no spam a pessoa fica sem o que pagou até pensar em
 * escrever para o suporte. Muita gente não escreve.
 *
 * O risco que ela cria é outro: um formulário aberto que responde
 * "encontrei" ou "não encontrei" é um VERIFICADOR DE CLIENTES. Qualquer pessoa
 * digitaria endereços e descobriria quem comprou o produto, que é dado de
 * terceiro e não é nosso para revelar.
 *
 * Por isso a resposta é idêntica nos dois casos, e é isso que estes testes
 * travam. A tentação de "melhorar a mensagem de erro" vai voltar, e a mensagem
 * gentil é exatamente o vazamento.
 */

const ambienteOriginal = { ...process.env };

function pedido(email: unknown, ip = "1.2.3.4") {
  return new Request("https://licitantevencedor.com.br/api/jornada/reenviar/", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  esquecerTudo();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-de-servico";
});

afterEach(() => {
  process.env = { ...ambienteOriginal };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** O banco responde com ou sem compra ativa para aquele e-mail. */
function bancoCom(compras: unknown[]) {
  return vi.fn(async () => new Response(JSON.stringify(compras)));
}

describe("a resposta não conta se o e-mail comprou", () => {
  it("com compra e sem compra respondem exatamente igual", async () => {
    vi.spyOn(conviteDoModulo, "convidarParaCriarConta").mockResolvedValue();

    vi.stubGlobal("fetch", bancoCom([{ email: "comprou@exemplo.com" }]));
    const comCompra = await POST(pedido("comprou@exemplo.com", "1.1.1.1"));
    const corpoComCompra = await comCompra.json();

    vi.stubGlobal("fetch", bancoCom([]));
    const semCompra = await POST(pedido("nunca@exemplo.com", "2.2.2.2"));
    const corpoSemCompra = await semCompra.json();

    expect(
      { status: semCompra.status, corpo: corpoSemCompra },
      "qualquer diferença aqui transforma o formulário num verificador de " +
        "clientes: dá para digitar endereços e descobrir quem comprou.",
    ).toEqual({ status: comCompra.status, corpo: corpoComCompra });
  });

  it("manda o convite quando a compra existe", async () => {
    const convite = vi.spyOn(conviteDoModulo, "convidarParaCriarConta").mockResolvedValue();
    vi.stubGlobal("fetch", bancoCom([{ email: "comprou@exemplo.com" }]));

    await POST(pedido("comprou@exemplo.com"));

    expect(convite).toHaveBeenCalledWith("comprou@exemplo.com");
  });

  it("não manda nada quando não existe compra ativa", async () => {
    const convite = vi.spyOn(conviteDoModulo, "convidarParaCriarConta").mockResolvedValue();
    vi.stubGlobal("fetch", bancoCom([]));

    await POST(pedido("nunca@exemplo.com"));

    expect(convite).not.toHaveBeenCalled();
  });

  it("compra revogada não recebe convite", async () => {
    /*
     * O filtro `revogado_em=is.null` vai na CONSULTA, e é o que separa quem tem
     * acesso de quem foi reembolsado. Mandar o convite para quem foi revogado
     * prometeria uma porta que a Jornada fecha na cara da pessoa.
     */
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(String(url));
        return new Response("[]");
      }),
    );

    await POST(pedido("reembolsado@exemplo.com"));

    expect(urls[0]).toContain("revogado_em=is.null");
  });
});

describe("o limite de taxa", () => {
  it("corta a partir da quarta tentativa do mesmo chamador", async () => {
    /*
     * Sem limite, esta rota manda e-mail para qualquer endereço que alguém
     * digitar, quantas vezes quiser: vira ferramenta de incômodo contra
     * terceiros, e queima a reputação do domínio, o que derruba a entrega dos
     * alertas de todo mundo.
     */
    vi.spyOn(conviteDoModulo, "convidarParaCriarConta").mockResolvedValue();
    vi.stubGlobal("fetch", bancoCom([{ email: "a@exemplo.com" }]));

    const status: number[] = [];
    for (let i = 0; i < 4; i++) {
      status.push((await POST(pedido("a@exemplo.com", "9.9.9.9"))).status);
    }

    expect(status).toEqual([200, 200, 200, 429]);
  });
});

describe("o formato do e-mail", () => {
  it("recusa o que não é e-mail, e isso não revela nada", async () => {
    // Qualquer um sabe que "abc" não é e-mail: recusar aqui não conta se
    // alguém comprou.
    const r = await POST(pedido("abc"));
    expect(r.status).toBe(400);
  });

  it("normaliza antes de consultar, senão maiúscula vira `não comprou`", async () => {
    const convite = vi.spyOn(conviteDoModulo, "convidarParaCriarConta").mockResolvedValue();
    vi.stubGlobal("fetch", bancoCom([{ email: "comprou@exemplo.com" }]));

    await POST(pedido("  Comprou@Exemplo.com  "));

    expect(convite).toHaveBeenCalledWith("comprou@exemplo.com");
  });
});
