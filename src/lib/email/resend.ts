import "server-only";

import { Resend, type CreateEmailResponse } from "resend";
import { remetente, type Mensagem, type ProvedorDeEmail, type ResultadoDeEnvio } from "./tipos";

/**
 * O único arquivo do projeto que fala Resend.
 *
 * Mesma fronteira de `ia/gemini.ts`: nome do pacote, formato da chamada e
 * formato do erro moram aqui, e o resto do sistema conversa por
 * `ProvedorDeEmail`. Trocar Resend por SES quando o volume justificar deve ser
 * escrever um irmão deste arquivo — se for preciso mexer em quem envia, a
 * fronteira vazou.
 *
 * `import "server-only"` no topo porque `RESEND_API_KEY` é segredo de servidor.
 * A barreira é do bundler, não da disciplina: um import distraído a partir de um
 * componente de cliente vira erro de build em vez de chave publicada no HTML.
 *
 * E a regra da casa vale aqui como em `leads.ts`: **falha é valor de retorno,
 * nunca exceção**. Sem credencial esta camada é inerte e devolve
 * `sem-credencial` — não simula envio, não finge que saiu, e não derruba a rota
 * que a chamou.
 */

/** A chave, lida no uso e não em constante de módulo — configurar não deve exigir build. */
export function chaveDoResend(): string | null {
  const chave = process.env.RESEND_API_KEY?.trim();
  return chave && chave.length > 0 ? chave : null;
}

/**
 * A parte do SDK de que dependemos, reduzida ao mínimo.
 *
 * Existe para o teste substituir a chamada sem tocar em rede e sem simular a
 * classe inteira do fornecedor — e para deixar à vista o quanto deste SDK este
 * projeto realmente usa: um método.
 */
export type EnvioDeEmail = (payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) => Promise<CreateEmailResponse>;

export type OpcoesDoProvedorResend = {
  /** Substitui a leitura de `RESEND_API_KEY`. Use em script, não em rota. */
  apiKey?: string;
  /** Substitui a chamada ao SDK. Existe para teste. */
  envio?: EnvioDeEmail;
};

/**
 * Descreve o erro do fornecedor sem vazar segredo.
 *
 * Mesma regra do `detalhe` de `leads.ts`: descreve a FORMA do problema, para
 * quem opera conseguir consertar sem tentativa e erro contra a configuração. O
 * texto vai para log e para diagnóstico — nunca para o assinante.
 */
function descreverErro(erro: unknown): string {
  if (erro instanceof Error) return `${erro.name} ao chamar o fornecedor: ${erro.message}`;
  return "falha não identificada ao chamar o fornecedor";
}

export function criarProvedorResend(opcoes: OpcoesDoProvedorResend = {}): ProvedorDeEmail {
  const envioInjetado = opcoes.envio;

  function envio(): EnvioDeEmail {
    if (envioInjetado) return envioInjetado;
    // Cliente construído por chamada, e não no módulo: `new Resend()` sem chave
    // lança, e no módulo isso quebraria o build de qualquer página que apenas
    // importasse esta camada. A checagem de credencial acontece antes, em
    // `enviar` — aqui a chave já é garantidamente uma string.
    const cliente = new Resend(opcoes.apiKey ?? chaveDoResend() ?? undefined);
    return (payload) => cliente.emails.send(payload);
  }

  return {
    nome: "resend",

    async enviar(mensagem: Mensagem): Promise<ResultadoDeEnvio> {
      if (!(envioInjetado ?? opcoes.apiKey ?? chaveDoResend())) {
        return { ok: false, motivo: "sem-credencial" };
      }

      let resposta: CreateEmailResponse;
      try {
        resposta = await envio()({
          from: remetente(),
          to: mensagem.para,
          subject: mensagem.assunto,
          html: mensagem.html,
          // Texto puro junto do HTML sempre: é o que o filtro de spam pontua e o
          // que sobra em cliente que não renderiza HTML. Enviar só HTML piora a
          // entrega da lista inteira, não só desta mensagem.
          text: mensagem.texto,
        });
      } catch (erro) {
        // Rede caída, DNS, timeout do SDK. Quem chamou não pode explodir por
        // isso: um e-mail de boas-vindas que não saiu não invalida o cadastro
        // que já foi gravado.
        console.error("[email] falha ao chamar o Resend", erro);
        return { ok: false, motivo: "recusado", detalhe: descreverErro(erro) };
      }

      if (resposta.error) {
        console.error("[email] Resend recusou", resposta.error);
        const { name, message, statusCode } = resposta.error;
        const status = statusCode === null ? "sem status" : `HTTP ${statusCode}`;
        return { ok: false, motivo: "recusado", detalhe: `${name} (${status}): ${message}` };
      }

      if (!resposta.data?.id) {
        // 200 sem id não é sucesso: sem identificador não há como rastrear a
        // entrega depois, e tratar isso como enviado esconderia uma mudança de
        // contrato do fornecedor até alguém reclamar que não recebeu.
        return {
          ok: false,
          motivo: "recusado",
          detalhe: "o fornecedor aceitou a chamada mas não devolveu id da mensagem",
        };
      }

      return { ok: true, id: resposta.data.id };
    },
  };
}
