import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { enviarConfirmacao } from "@/lib/leads-emails";

/**
 * O caso que este arquivo existe para travar: **gravou e não enviou**.
 *
 * É o desencontro mais provável do double opt-in, porque são dois sistemas
 * diferentes (o destino do lead e o provedor de e-mail) e qualquer um dos dois
 * pode falhar sozinho. E é o mais fácil de errar: a rota já tem um `ok: true` na
 * mão quando o envio falha, e devolver só isso faria a tela mandar o visitante
 * esperar um e-mail que não saiu. Ele espera, nada chega, e conclui que o site
 * é quebrado — o que é pior do que ter dito a verdade na hora.
 *
 * O envio é substituído porque quem o implementa é a camada de e-mail, com
 * testes próprios; aqui interessa só o que a rota faz com cada resposta dela.
 */

vi.mock("@/lib/leads-emails", () => ({
  enviarConfirmacao: vi.fn(),
  enviarBoasVindas: vi.fn(),
}));

const enviarFalso = vi.mocked(enviarConfirmacao);

const ambienteOriginal = { ...process.env };

beforeEach(() => {
  // `restoreAllMocks` devolve os espiões ao original, mas não zera o histórico
  // de um módulo trocado por `vi.mock` — sem isto, "não foi chamado" enxerga as
  // chamadas dos testes anteriores.
  vi.clearAllMocks();
  process.env.LEADS_DESTINO = "webhook";
  process.env.LEADS_WEBHOOK_URL = "https://exemplo.test/exec?token=segredo";
  // A rota grava de verdade contra este destino de mentira: é o caminho real,
  // com o único ponto de contato externo trocado.
  vi.stubGlobal("fetch", vi.fn(async () => new Response("ok")));
  enviarFalso.mockResolvedValue({ ok: true, id: "msg_1" });
});

afterEach(() => {
  process.env = { ...ambienteOriginal };
  vi.restoreAllMocks();
});

function cadastrar(corpo: Record<string, unknown>) {
  return POST(
    new Request("https://licitantevencedor.com.br/api/alerta/", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": aleatorio() },
      body: JSON.stringify(corpo),
    }),
  );
}

/**
 * IP diferente a cada chamada.
 *
 * O limitador de taxa é por origem e guarda estado no processo — sem isto, o
 * sexto teste do arquivo receberia 429 e o motivo levaria meia hora para
 * aparecer.
 */
let contador = 0;
const aleatorio = () => `203.0.113.${++contador % 250}`;

const LEAD = { email: "alguem@exemplo.com.br", cidade: "Recife", origem: "blog/teste#captura-1" };

describe("POST /api/alerta/", () => {
  it("grava e manda o visitante procurar o e-mail de confirmação", async () => {
    const resposta = await cadastrar(LEAD);

    expect(resposta.status).toBe(201);
    expect(await resposta.json()).toEqual({ ok: true, confirmacaoEnviada: true });
  });

  it("manda o token no e-mail de confirmação, e é o token que foi gravado", async () => {
    await cadastrar(LEAD);

    const [destinatario] = enviarFalso.mock.calls[0];
    expect(destinatario.email).toBe(LEAD.email);
    expect(destinatario.token).toMatch(/^[A-Za-z0-9_-]{22,64}$/);

    const gravado = JSON.parse(
      String((vi.mocked(fetch).mock.calls[0][1] as { body?: unknown }).body),
    );
    expect(gravado.token).toBe(destinatario.token);
  });

  it("gravou mas NÃO enviou: continua 201, e diz que a confirmação não saiu", async () => {
    enviarFalso.mockResolvedValue({ ok: false, motivo: "sem-credencial" });

    const resposta = await cadastrar(LEAD);
    const corpo = await resposta.json();

    // 201 porque o lead existe: devolver erro faria o visitante tentar de novo
    // contra um cadastro que já está gravado.
    expect(resposta.status).toBe(201);
    expect(corpo.ok).toBe(true);
    // E este é o campo que impede a tela de prometer um e-mail que não saiu.
    expect(corpo.confirmacaoEnviada).toBe(false);
    expect(corpo.motivo).toBe("sem-credencial");
  });

  it("provedor recusando também não vira promessa de e-mail", async () => {
    enviarFalso.mockResolvedValue({ ok: false, motivo: "recusado", detalhe: "HTTP 422" });

    const corpo = await (await cadastrar(LEAD)).json();

    expect(corpo.confirmacaoEnviada).toBe(false);
    // `diagnostico` descreve a forma do problema para quem opera — nunca segredo.
    expect(corpo.diagnostico).toBe("HTTP 422");
  });

  it("se a gravação falha, nenhum e-mail é enviado", async () => {
    // A ordem importa: confirmação de um lead que não existe cria um link morto
    // e ainda queima reputação de envio.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nao autorizado")));

    const resposta = await cadastrar(LEAD);

    expect(resposta.status).toBe(500);
    expect(enviarFalso).not.toHaveBeenCalled();
  });

  it("e-mail implausível não chega a gravar nem a enviar", async () => {
    const resposta = await cadastrar({ ...LEAD, email: "sem-arroba" });

    expect(resposta.status).toBe(400);
    expect(enviarFalso).not.toHaveBeenCalled();
  });

  it("robô que preenche a armadilha não gera lead nem e-mail", async () => {
    const resposta = await cadastrar({ ...LEAD, site: "http://spam.example" });

    expect(resposta.status).toBe(200);
    expect(enviarFalso).not.toHaveBeenCalled();
  });
});
