import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import * as conviteDoModulo from "@/lib/hotmart/convite";

/**
 * O CÓDIGO DE RESPOSTA É O PRODUTO DESTA ROTA.
 *
 * A Hotmart reentrega o que não recebeu 2xx e desiste do que recebeu. Isso faz
 * de cada `status` aqui uma decisão sobre dinheiro já recebido, e não uma
 * formalidade de HTTP:
 *
 *   200 num aviso não processado  → ela para de reentregar, a compra some
 *   400 num aviso legítimo        → ela reentrega para sempre, sem sucesso
 *   200 num erro de banco         → indisponibilidade vira compra perdida
 *
 * Cada teste abaixo trava um desses. Nenhum deles é sobre parsing, que já tem
 * testes próprios em `lib/hotmart/webhook.test.ts`.
 */

const TOKEN = "token-de-teste-32-caracteres-aqui";

const ambienteOriginal = { ...process.env };

function aviso(corpo: unknown, token: string | null = TOKEN) {
  return new Request("https://licitantevencedor.com.br/api/hotmart/webhook/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-hotmart-hottok": token } : {}),
    },
    body: JSON.stringify(corpo),
  });
}

const COMPRA = {
  event: "PURCHASE_APPROVED",
  data: {
    buyer: { email: "comprador@exemplo.com" },
    purchase: { transaction: "HP-1" },
  },
};

beforeEach(() => {
  process.env.HOTMART_HOTTOK = TOKEN;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://banco.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-de-servico";
  // O caminho real, com o único ponto externo trocado.
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ id: "1" }]))));
});

afterEach(() => {
  process.env = { ...ambienteOriginal };
  vi.restoreAllMocks();
});

describe("o aviso da Hotmart", () => {
  it("grava a compra e responde 200", async () => {
    const r = await POST(aviso(COMPRA));
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({ ok: true, efeito: "gravada" });
  });

  it("recusa com 401 quando o hottok não confere", async () => {
    const r = await POST(aviso(COMPRA, "token-errado"));
    expect(r.status).toBe(401);
    // E nada foi gravado.
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("recusa com 401 quando não vem hottok nenhum", async () => {
    const r = await POST(aviso(COMPRA, null));
    expect(r.status).toBe(401);
  });

  it("responde 503, e não 401, quando o segredo não está configurado", async () => {
    /*
     * A distinção que evita um dia inteiro de vendas perdidas em silêncio: sem
     * `HOTMART_HOTTOK` o problema é nosso, não de quem chamou. 503 faz a
     * Hotmart reentregar quando a variável for posta; 401 a faria desistir.
     */
    delete process.env.HOTMART_HOTTOK;
    const r = await POST(aviso(COMPRA));
    expect(r.status).toBe(503);
  });

  it("formato desconhecido responde 400 para a Hotmart reentregar", async () => {
    // Compra sem e-mail. Se isto respondesse 200, a compra sumiria com o
    // dinheiro já recebido e sem log do lado dela.
    const r = await POST(aviso({ event: "PURCHASE_APPROVED", data: { purchase: { transaction: "X" } } }));
    expect(r.status).toBe(400);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("evento que não interessa responde 200 sem tocar no banco", async () => {
    const r = await POST(aviso({ event: "CLUB_FIRST_ACCESS", data: {} }));
    expect(r.status).toBe(200);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("erro do banco responde 503, e nunca 200", async () => {
    // Indisponibilidade do Supabase com 200 vira compra perdida em definitivo.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("indisponivel", { status: 500 })));
    const r = await POST(aviso(COMPRA));
    expect(r.status).toBe(503);
  });

  it("reentrega da mesma transação responde 200 sem duplicar", async () => {
    /*
     * 409, e não lista vazia. Este mock já disse `new Response("[]")`, que era
     * o que eu SUPUNHA que o PostgREST fazia; ele devolve 409, observado no log
     * dele em 08/09 às 21:53. Ver `src/lib/hotmart/repositorio.test.ts`.
     */
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 409 })));
    const r = await POST(aviso(COMPRA));
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({ efeito: "repetida" });
  });

  it("reembolso revoga pela transação", async () => {
    const chamadas: Array<{ url: string; metodo: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        chamadas.push({ url: String(url), metodo: String(init.method) });
        return new Response(JSON.stringify([{ id: "1" }]));
      }),
    );

    const r = await POST(aviso({ ...COMPRA, event: "PURCHASE_REFUNDED" }));
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({ efeito: "revogada" });
    expect(chamadas[0].metodo).toBe("PATCH");
    expect(chamadas[0].url).toContain("referencia_externa=eq.HP-1");
    // Só revoga o que ainda está vivo: a segunda entrega do mesmo reembolso não
    // pode sobrescrever a data em que o dinheiro realmente voltou.
    expect(chamadas[0].url).toContain("revogado_em=is.null");
  });

  it("corpo que não é JSON responde 400", async () => {
    const cru = new Request("https://licitantevencedor.com.br/api/hotmart/webhook/", {
      method: "POST",
      headers: { "x-hotmart-hottok": TOKEN },
      body: "isto não é json",
    });
    expect((await POST(cru)).status).toBe(400);
  });
});

describe("o convite para criar conta", () => {
  /*
   * Ele existe porque a Hotmart entrega o livro, e não a Jornada: quem compra
   * recebe PDF e ePub por lá, e o acesso ao site só aparece quando a pessoa
   * cria conta COM O MESMO E-MAIL. Sem este e-mail, o comprador não é avisado
   * disso por ninguém.
   *
   * Estes testes travam as duas coisas que podem sair caro: mandar demais, e
   * deixar o envio derrubar a compra.
   */
  function bancoQue(status: number) {
    return vi.fn(async (url: string, init: RequestInit) => {
      const metodo = String(init?.method ?? "GET");
      if (metodo === "GET") return new Response("[]");
      if (metodo === "POST") {
        return status === 201
          ? new Response(JSON.stringify([{ id: "1" }]), { status: 201 })
          : new Response("", { status });
      }
      return new Response("[]");
    });
  }

  it("sai na primeira gravação", async () => {
    vi.stubGlobal("fetch", bancoQue(201));
    const convite = vi.spyOn(conviteDoModulo, "convidarParaCriarConta").mockResolvedValue();

    const r = await POST(aviso(COMPRA));

    expect(r.status).toBe(200);
    expect(convite).toHaveBeenCalledWith("comprador@exemplo.com");
    convite.mockRestore();
  });

  it("NÃO sai na reentrega, senão vira uma enxurrada", async () => {
    /*
     * Em 08/09 a Hotmart reentregou o mesmo evento 165 vezes, e o índice único
     * transformou cada uma em `repetida`. Se o convite saísse aqui, teriam sido
     * 165 e-mails para a mesma pessoa, sobre uma compra só.
     */
    vi.stubGlobal("fetch", bancoQue(409));
    const convite = vi.spyOn(conviteDoModulo, "convidarParaCriarConta").mockResolvedValue();

    const r = await POST(aviso(COMPRA));

    expect(r.status).toBe(200);
    expect(
      convite,
      "reentrega não é compra nova. Só a INSERÇÃO de fato pode disparar convite.",
    ).not.toHaveBeenCalled();
    convite.mockRestore();
  });

  it("falha no envio não derruba a compra", async () => {
    /*
     * Propagar o erro daria o pior dos mundos: a Hotmart receberia não-2xx e
     * reentregaria, a reentrega devolveria `repetida`, e `repetida` NÃO dispara
     * convite. Ou seja, a compra ficaria em retentativa eterna no painel dela
     * sem nunca reenviar o e-mail que falhou.
     */
    vi.stubGlobal("fetch", bancoQue(201));
    const convite = vi
      .spyOn(conviteDoModulo, "convidarParaCriarConta")
      .mockRejectedValue(new Error("resend fora do ar"));

    await expect(POST(aviso(COMPRA))).resolves.toMatchObject({ status: 200 });
    convite.mockRestore();
  });

  it("não sai numa revogação", async () => {
    vi.stubGlobal("fetch", bancoQue(201));
    const convite = vi.spyOn(conviteDoModulo, "convidarParaCriarConta").mockResolvedValue();

    await POST(aviso({ ...COMPRA, event: "PURCHASE_REFUNDED" }));

    expect(convite).not.toHaveBeenCalled();
    convite.mockRestore();
  });
});
