import { afterEach, describe, expect, it, vi } from "vitest";
import type { CreateEmailResponse } from "resend";
import { chaveDoResend, criarProvedorResend, type EnvioDeEmail } from "./resend";
import { REMETENTE_PADRAO } from "./tipos";
import type { Mensagem } from "./tipos";

/*
 * Nenhum teste deste arquivo toca a API do Resend. O envio é injetado por
 * `opcoes.envio` — a mesma costura que `ia/gemini.test.ts` usa para o SDK do
 * Gemini. Um teste que chamasse o fornecedor de verdade gastaria cota, exigiria
 * segredo no CI e ainda mandaria e-mail para alguém.
 */

const MENSAGEM: Mensagem = {
  para: "compras@fornecedora.com.br",
  assunto: "Confirme seu e-mail",
  html: "<p>oi</p>",
  texto: "oi",
};

/** Um envio falso que grava o que recebeu e devolve o que foi programado. */
function envioFalso(resposta: CreateEmailResponse | (() => Promise<never>)) {
  const chamadas: Parameters<EnvioDeEmail>[0][] = [];
  const envio: EnvioDeEmail = async (payload) => {
    chamadas.push(payload);
    if (typeof resposta === "function") return resposta();
    return resposta;
  };
  return { envio, chamadas };
}

const OK: CreateEmailResponse = { data: { id: "email_123" }, error: null, headers: null };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("credencial", () => {
  it("sem RESEND_API_KEY devolve sem-credencial e NÃO lança", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const provedor = criarProvedorResend();
    await expect(provedor.enviar(MENSAGEM)).resolves.toEqual({
      ok: false,
      motivo: "sem-credencial",
    });
  });

  it("chave só de espaços não conta como configurada", async () => {
    vi.stubEnv("RESEND_API_KEY", "   ");
    expect(chaveDoResend()).toBeNull();
    const r = await criarProvedorResend().enviar(MENSAGEM);
    expect(r).toEqual({ ok: false, motivo: "sem-credencial" });
  });

  it("a chave é lida no uso, não na importação do módulo", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { envio, chamadas } = envioFalso(OK);
    // Provedor criado SEM chave; a chave aparece no ambiente só depois.
    const provedor = criarProvedorResend({ envio });
    vi.stubEnv("RESEND_API_KEY", "re_depois");
    await provedor.enviar(MENSAGEM);
    expect(chamadas).toHaveLength(1);
  });
});

describe("envio", () => {
  it("sucesso devolve o id do fornecedor", async () => {
    const { envio } = envioFalso(OK);
    const r = await criarProvedorResend({ apiKey: "re_teste", envio }).enviar(MENSAGEM);
    expect(r).toEqual({ ok: true, id: "email_123" });
  });

  it("manda HTML e texto puro, do remetente configurado", async () => {
    vi.stubEnv("EMAIL_REMETENTE", "");
    const { envio, chamadas } = envioFalso(OK);
    await criarProvedorResend({ apiKey: "re_teste", envio }).enviar(MENSAGEM);
    expect(chamadas[0]).toEqual({
      from: REMETENTE_PADRAO,
      to: MENSAGEM.para,
      subject: MENSAGEM.assunto,
      html: MENSAGEM.html,
      text: MENSAGEM.texto,
    });
  });

  it("respeita EMAIL_REMETENTE", async () => {
    vi.stubEnv("EMAIL_REMETENTE", "Testes <teste@exemplo.com.br>");
    const { envio, chamadas } = envioFalso(OK);
    await criarProvedorResend({ apiKey: "re_teste", envio }).enviar(MENSAGEM);
    expect(chamadas[0].from).toBe("Testes <teste@exemplo.com.br>");
  });
});

describe("falha", () => {
  it("erro do fornecedor vira recusado, com detalhe para quem opera", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { envio } = envioFalso({
      data: null,
      error: { name: "validation_error", message: "domínio não verificado", statusCode: 403 },
      headers: null,
    });
    const r = await criarProvedorResend({ apiKey: "re_teste", envio }).enviar(MENSAGEM);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe("recusado");
    expect(r.detalhe).toContain("validation_error");
    expect(r.detalhe).toContain("HTTP 403");
    expect(r.detalhe).toContain("domínio não verificado");
  });

  it("exceção do SDK também vira valor de retorno, nunca sobe", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { envio } = envioFalso(() => Promise.reject(new TypeError("fetch failed")));
    const r = await criarProvedorResend({ apiKey: "re_teste", envio }).enviar(MENSAGEM);
    expect(r).toEqual({
      ok: false,
      motivo: "recusado",
      detalhe: "TypeError ao chamar o fornecedor: fetch failed",
    });
  });

  it("resposta sem erro e sem id não é sucesso", async () => {
    const { envio } = envioFalso({ data: { id: "" }, error: null, headers: null });
    const r = await criarProvedorResend({ apiKey: "re_teste", envio }).enviar(MENSAGEM);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe("recusado");
    expect(r.detalhe).toMatch(/não devolveu id/);
  });

  /*
   * O tipo do SDK jura que `error: null` implica `data` preenchido. O cast
   * existe para exercitar a hipótese de esse contrato mudar — é justamente o
   * caso em que tratar como enviado esconderia a quebra até alguém reclamar de
   * não ter recebido.
   */
  it("resposta sem erro e sem data também não é sucesso", async () => {
    const { envio } = envioFalso({ data: null, error: null, headers: null } as unknown as CreateEmailResponse);
    const r = await criarProvedorResend({ apiKey: "re_teste", envio }).enviar(MENSAGEM);
    expect(r.ok).toBe(false);
  });

  it("o detalhe nunca carrega a chave", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const chave = "re_segredo_que_nao_pode_vazar";
    const { envio } = envioFalso(() => Promise.reject(new Error("falhou")));
    const r = await criarProvedorResend({ apiKey: chave, envio }).enviar(MENSAGEM);
    expect(JSON.stringify(r)).not.toContain(chave);
  });
});
