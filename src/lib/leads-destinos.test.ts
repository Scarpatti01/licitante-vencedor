import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { destinoAtual } from "./leads-destinos";

/**
 * O contrato do destino de webhook.
 *
 * O caso que dá nome a este arquivo é o do 200 que recusa: app da web do Apps
 * Script responde 200 para tudo, inclusive quando rejeita. Sem esta checagem o
 * site diria "cadastrado" ao visitante sobre um lead que ninguém guardou.
 */

const LEAD = {
  email: "alguem@exemplo.com.br",
  cidade: "Recife",
  origem: "blog/teste#captura-1",
  recebidoEm: "2026-08-14T12:00:00.000Z",
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
    expect(await destinoAtual()!.gravar(LEAD)).toEqual({ ok: true });
  });

  it("aceita webhook genérico que responde JSON de sucesso", async () => {
    // Zapier, Make e n8n respondem 200 com corpo próprio. Reprová-los seria
    // trocar um defeito por outro.
    responder(200, '{"status":"success","id":123}');
    expect(await destinoAtual()!.gravar(LEAD)).toEqual({ ok: true });
  });

  it("aceita webhook que responde 200 sem corpo", async () => {
    responder(204, null);
    expect(await destinoAtual()!.gravar(LEAD)).toEqual({ ok: true });
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
