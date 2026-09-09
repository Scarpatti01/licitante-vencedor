import { CONTATO, SITE } from "../site.ts";

/**
 * O contrato de envio de e-mail.
 *
 * Fica separado do fornecedor pelo mesmo motivo de `ProvedorDeIA` e de
 * `FonteDeEditais`: trocar Resend por SES quando o volume justificar não pode
 * exigir reescrever quem envia. E, como todo o resto deste projeto, a camada é
 * inerte sem credencial — sem `RESEND_API_KEY` nada é simulado e nada finge ter
 * saído.
 *
 * Um cuidado que vale para todas as mensagens daqui: **todo e-mail carrega link
 * de descadastro**. Não é gentileza nem exigência de tela — é o que separa uma
 * lista de uma denúncia de spam, e denúncia de spam derruba a entrega dos
 * e-mails de todos os outros assinantes, inclusive os que querem receber.
 */

export type ResultadoDeEnvio =
  | { ok: true; id: string }
  | { ok: false; motivo: "sem-credencial" | "recusado"; detalhe?: string };

export type Mensagem = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
};

export interface ProvedorDeEmail {
  nome: string;
  enviar(mensagem: Mensagem): Promise<ResultadoDeEnvio>;
}

/**
 * De onde os e-mails saem.
 *
 * Lido do ambiente a cada chamada, com queda para o padrão abaixo. Nunca pode
 * ser um endereço `@gmail.com`: além de não autenticar por SPF/DKIM, o Gmail
 * rejeita quem se passa por ele, e o e-mail nem chega.
 *
 * ## POR QUE ELE É DERIVADO DE `CONTATO`, E NÃO ESCRITO AQUI
 *
 * Era `alertas@`, literal, e fazia sentido enquanto todo e-mail daqui era
 * alerta de licitação. Deixou de fazer em 09/09, quando a compra passou a
 * disparar um convite: "alertas@" num e-mail de compra confirmada soa como
 * disparo de lista, exatamente na mensagem em que a pessoa acabou de pagar.
 *
 * Trocar por outro literal resolveria hoje e criaria a divergência de amanhã: o
 * site publica `CONTATO.email` no rodapé, na privacidade e nos termos como o
 * canal para falar com a gente, e responder um e-mail nosso tem de cair ali. Um
 * segundo literal aqui é a chance de alguém mudar um e esquecer o outro.
 *
 * Então o remetente É o canal publicado. A caixa precisa ser real e monitorada
 * pelo motivo já escrito em `site.ts`, e agora por mais um: resposta de
 * comprador chega nela.
 */
export const REMETENTE_PADRAO = `${SITE.name} <${CONTATO.email}>`;

export function remetente(): string {
  const configurado = process.env.EMAIL_REMETENTE?.trim();
  return configurado || REMETENTE_PADRAO;
}
