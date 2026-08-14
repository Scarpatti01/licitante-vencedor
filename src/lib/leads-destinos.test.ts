import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { destinoAtual } from "./leads-destinos";

/**
 * O contrato do destino de webhook.
 *
 * O caso que dá nome a este arquivo é o do 200 que recusa: app da web do Apps
 * Script responde 200 para tudo, inclusive quando rejeita. Sem esta checagem o
 * site diria "cadastrado" ao visitante sobre um lead que ninguém guardou.
 */

const TOKEN = "AhZ8k2Qm5vLpXr7TyNc0bWdEfGhIjKlMnOpQrStUvWx";

const LEAD = {
  email: "alguem@exemplo.com.br",
  cidade: "Recife",
  origem: "blog/teste#captura-1",
  recebidoEm: "2026-08-14T12:00:00.000Z",
  token: TOKEN,
};

const ambienteOriginal = { ...process.env };

beforeEach(() => {
  process.env.LEADS_DESTINO = "webhook";
  process.env.LEADS_WEBHOOK_URL = "https://exemplo.test/exec?token=segredo";
});

afterEach(() => {
  process.env = { ...ambienteOriginal };
  vi.restoreAllMocks();
});

function responder(status: number, corpo: string | null) {
  // `Response` recusa corpo em 204 — daí o `null` explícito no caso sem conteúdo.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(corpo, { status })),
  );
}

describe("destino webhook", () => {
  it("grava quando o webhook confirma", async () => {
    responder(200, "ok");
    expect(await destinoAtual()!.gravar(LEAD)).toEqual({ ok: true, token: TOKEN });
  });

  it("aceita webhook genérico que responde JSON de sucesso", async () => {
    // Zapier, Make e n8n respondem 200 com corpo próprio. Reprová-los seria
    // trocar um defeito por outro.
    responder(200, '{"status":"success","id":123}');
    expect(await destinoAtual()!.gravar(LEAD)).toEqual({ ok: true, token: TOKEN });
  });

  it("aceita webhook que responde 200 sem corpo", async () => {
    responder(204, null);
    expect(await destinoAtual()!.gravar(LEAD)).toEqual({ ok: true, token: TOKEN });
  });

  it.each(["nao autorizado", "sem email", "corpo invalido", "NAO AUTORIZADO"])(
    'NÃO confirma quando o corpo é "%s", mesmo com status 200',
    async (corpo) => {
      responder(200, corpo);
      expect(await destinoAtual()!.gravar(LEAD)).toMatchObject({ ok: false, motivo: "falha" });
    },
  );

  it("não confirma quando o status não é 2xx", async () => {
    responder(401, "<html>login</html>");
    expect(await destinoAtual()!.gravar(LEAD)).toMatchObject({ ok: false, motivo: "falha" });
  });

  it("não confirma quando a rede falha", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timeout"); }));
    expect(await destinoAtual()!.gravar(LEAD)).toMatchObject({ ok: false, motivo: "falha" });
  });

  it("o diagnóstico descreve a forma do problema sem vazar o segredo", async () => {
    // É o único ponto do sistema em que informação de configuração sai para
    // fora do servidor. A URL inteira é segredo — o que pode sair é o formato.
    responder(404, "Not Found");
    const r = await destinoAtual()!.gravar(LEAD);
    const detalhe = (r as { detalhe?: string }).detalhe ?? "";

    expect(detalhe).toContain("404");
    expect(detalhe).toContain("exemplo.test");
    expect(detalhe).toContain("com token");
    expect(detalhe).not.toContain("segredo");
  });

  it("acusa quando a URL configurada nem é uma URL", async () => {
    process.env.LEADS_WEBHOOK_URL = "cole-aqui-a-url";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to parse URL"); }));
    const r = await destinoAtual()!.gravar(LEAD);
    expect((r as { detalhe?: string }).detalhe).toContain("não é uma URL válida");
  });

  it("sem URL configurada não há destino", () => {
    delete process.env.LEADS_WEBHOOK_URL;
    expect(destinoAtual()).toBeNull();
  });

  it("valor desconhecido em LEADS_DESTINO não vira destino silencioso", () => {
    process.env.LEADS_DESTINO = "planilha";
    expect(destinoAtual()).toBeNull();
  });
});

/**
 * Confirmar e descadastrar pela planilha.
 *
 * O caso mais perigoso do bloco é o do **script antigo**: a implantação que está
 * no ar hoje não conhece `acao`, trata a chamada como cadastro e responde `ok`.
 * Aceitar esse `ok` faria a tela dizer "confirmado" enquanto a planilha ganhava
 * uma linha de lixo — e ninguém descobriria até alguém reclamar que não recebe.
 */
describe("destino webhook — ações sobre o lead", () => {
  it("confirma quando o script diz que carimbou agora", async () => {
    responder(200, JSON.stringify({ situacao: "feito-agora", email: LEAD.email, cidade: "Recife" }));
    expect(await destinoAtual()!.confirmar(TOKEN)).toEqual({
      situacao: "feito-agora",
      lead: { email: LEAD.email, cidade: "Recife" },
    });
  });

  it("confirmar duas vezes não vira erro: a segunda diz que já estava", async () => {
    responder(200, JSON.stringify({ situacao: "ja-estava", email: LEAD.email, cidade: "" }));
    expect(await destinoAtual()!.confirmar(TOKEN)).toEqual({
      situacao: "ja-estava",
      lead: { email: LEAD.email, cidade: null },
    });
  });

  it("token inexistente é `token-desconhecido`, não falha", async () => {
    responder(200, JSON.stringify({ situacao: "token-desconhecido" }));
    expect(await destinoAtual()!.confirmar(TOKEN)).toEqual({ situacao: "token-desconhecido" });
  });

  /** Substitui o `fetch` e guarda o corpo enviado, que é o que estes casos provam. */
  function espiarCorpos(corpoDaResposta: string): Record<string, unknown>[] {
    const enviados: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { body?: unknown }) => {
        enviados.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(corpoDaResposta);
      }),
    );
    return enviados;
  }

  it("descadastra pelo mesmo token que confirma", async () => {
    const enviados = espiarCorpos(JSON.stringify({ situacao: "feito-agora", email: LEAD.email }));

    expect(await destinoAtual()!.descadastrar(TOKEN)).toMatchObject({ situacao: "feito-agora" });
    expect(enviados[0]).toEqual({ acao: "descadastrar", token: TOKEN });
  });

  it("o cadastro anuncia a ação, para o script novo despachar sem adivinhar", async () => {
    const enviados = espiarCorpos("ok");

    await destinoAtual()!.gravar(LEAD);

    expect(enviados[0].acao).toBe("cadastrar");
    expect(enviados[0].token).toBe(TOKEN);
  });

  it('script ANTIGO respondendo "ok" a uma confirmação é falha, nunca sucesso', async () => {
    responder(200, "ok");
    const r = await destinoAtual()!.confirmar(TOKEN);
    expect(r.situacao).toBe("falha");
    expect((r as { detalhe?: string }).detalhe).toContain("ok");
  });

  it("erro de rede não vira token desconhecido", async () => {
    // A distinção importa na tela: "link inválido" manda a pessoa se cadastrar
    // de novo; "falhou" manda tentar de novo com o MESMO link, que continua bom.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timeout"); }));
    expect((await destinoAtual()!.confirmar(TOKEN)).situacao).toBe("falha");
  });
});

/**
 * Confirmar e descadastrar no Postgres.
 *
 * O `fetch` é substituído por um roteador que responde conforme o método e a
 * query — é o mínimo para provar as duas propriedades que importam: o UPDATE
 * filtra por `is.null` (idempotência sem leitura antes) e zero linhas afetadas
 * ainda exige a segunda consulta para separar "já estava" de "não existe".
 */
describe("destino supabase — ações sobre o lead", () => {
  beforeEach(() => {
    process.env.LEADS_DESTINO = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-de-servico";
  });

  type Chamada = { url: string; metodo: string };

  function roteador(responder: (c: Chamada) => Response) {
    const registro: Chamada[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { method?: string }) => {
        const chamada = { url: String(url), metodo: init?.method ?? "GET" };
        registro.push(chamada);
        return responder(chamada);
      }),
    );
    return registro;
  }

  const linha = (extra: Record<string, unknown> = {}) =>
    JSON.stringify([{ email: LEAD.email, cidade: "Recife", token: TOKEN, ...extra }]);

  it("confirma e devolve o lead, filtrando por confirmado_em nulo", async () => {
    const chamadas = roteador(() => new Response(linha()));

    expect(await destinoAtual()!.confirmar(TOKEN)).toEqual({
      situacao: "feito-agora",
      lead: { email: LEAD.email, cidade: "Recife" },
    });

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].metodo).toBe("PATCH");
    expect(chamadas[0].url).toContain("confirmado_em=is.null");
    expect(chamadas[0].url).toContain(`token=eq.${TOKEN}`);
  });

  it("nenhuma linha alterada mas o token existe: já estava confirmado", async () => {
    const chamadas = roteador((c) => new Response(c.metodo === "PATCH" ? "[]" : linha()));

    expect(await destinoAtual()!.confirmar(TOKEN)).toMatchObject({ situacao: "ja-estava" });
    expect(chamadas.map((c) => c.metodo)).toEqual(["PATCH", "GET"]);
  });

  it("nenhuma linha alterada e token inexistente: link inválido", async () => {
    roteador(() => new Response("[]"));
    expect(await destinoAtual()!.confirmar(TOKEN)).toEqual({ situacao: "token-desconhecido" });
  });

  it("descadastro carimba a coluna própria e não toca em confirmado_em", async () => {
    const chamadas = roteador(() => new Response(linha()));

    expect(await destinoAtual()!.descadastrar(TOKEN)).toMatchObject({ situacao: "feito-agora" });
    expect(chamadas[0].url).toContain("descadastrado_em=is.null");
    expect(chamadas[0].url).not.toContain("confirmado_em");
  });

  it("banco fora do ar é falha, e não link inválido", async () => {
    roteador(() => new Response("indisponível", { status: 503 }));
    expect((await destinoAtual()!.confirmar(TOKEN)).situacao).toBe("falha");
  });

  it("e-mail já cadastrado: o link leva o token que EXISTE, não o recém-gerado", async () => {
    // Sem isto, quem se cadastra duas vezes recebe um link de confirmação morto
    // — e quem se cadastra duas vezes é justamente quem está mais interessado.
    const jaGravado = "TokenQueJaEstavaNaLinhaDoBanco1234567890";
    roteador((c) =>
      c.metodo === "POST"
        ? new Response("[]") // ignore-duplicates: nada inserido
        : new Response(JSON.stringify([{ token: jaGravado, descadastrado_em: null }])),
    );

    expect(await destinoAtual()!.gravar(LEAD)).toEqual({ ok: true, token: jaGravado });
  });

  it("quem saiu e voltou é reaberto com token novo, em vez de ficar fora em silêncio", async () => {
    const chamadas = roteador((c) =>
      c.metodo === "POST"
        ? new Response("[]")
        : c.metodo === "GET"
          ? new Response(JSON.stringify([{ token: "antigo-de-quem-saiu-000000", descadastrado_em: "2026-01-01T00:00:00Z" }]))
          : new Response(null, { status: 204 }),
    );

    expect(await destinoAtual()!.gravar(LEAD)).toEqual({ ok: true, token: TOKEN });

    const reabertura = chamadas.find((c) => c.metodo === "PATCH");
    expect(reabertura).toBeDefined();
  });
});
