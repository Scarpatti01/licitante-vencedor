import "server-only";

import {
  criarProvedorResend,
  mensagemDeBoasVindas,
  mensagemDeConfirmacao,
  type ResultadoDeEnvio,
} from "@/lib/email";
import { SITE } from "./site";

/**
 * As duas mensagens que o double opt-in dispara, já ligadas ao provedor.
 *
 * A camada de e-mail (`@/lib/email`) entrega mensagem pronta de um lado e
 * provedor do outro, de propósito: ela não sabe o que é um lead nem de onde vem
 * um token. Este arquivo é a costura — o único lugar do projeto que junta as
 * duas metades para o caso do cadastro no alerta. Ele mora aqui, e não lá,
 * porque o token é assunto de `leads.ts`; empurrá-lo para dentro da camada de
 * e-mail faria o módulo de envio ter opinião sobre a lista de captação.
 *
 * **Um token só para as duas ações.** O mesmo valor confirma e descadastra. A
 * alternativa — dois tokens por lead — pareceria mais segura e não seria: os
 * dois viajariam no mesmo e-mail, para o mesmo destinatário, e quem tivesse um
 * teria o outro. O que ela traria de verdade é uma coluna a mais e a chance de
 * o rodapé sair com o token errado. O que protege o descadastro não é o token
 * ser diferente, é ele ser inadivinhável.
 *
 * **Falha de envio não é exceção.** Todo retorno é `ResultadoDeEnvio`, como o
 * provedor devolve. Quem chama já gravou o lead, e um e-mail que não saiu não
 * pode desfazer o que está no banco — só mudar o que a tela diz.
 */

export type DestinatarioDoLead = {
  email: string;
  cidade: string | null;
  /** O token que identifica o lead no destino — o de `ResultadoCaptura`, não o gerado. */
  token: string;
};

/**
 * O link que confirma o cadastro.
 *
 * Espelha `urlDeDescadastro` da camada de e-mail, inclusive na barra antes da
 * query: o site roda com `trailingSlash: true`, e `/confirmar?t=…` pagaria um
 * 308 de normalização antes de chegar à página. Redirecionamento em link de
 * e-mail é onde token some — parte dos clientes reescreve a URL e não repassa a
 * query no salto.
 *
 * `encodeURIComponent` mesmo com alfabeto base64url, que não tem caractere
 * reservado: o token pode vir de outra origem (os leads antigos da planilha
 * recebem UUID na migração), e a garantia vale mais que os microssegundos.
 */
export function urlDeConfirmacao(token: string, urlBase: string = SITE.url): string {
  return `${urlBase}/confirmar/?t=${encodeURIComponent(token)}`;
}

/** Pede a confirmação do endereço. Sem este clique, o lead não recebe mais nada. */
export async function enviarConfirmacao(destinatario: DestinatarioDoLead): Promise<ResultadoDeEnvio> {
  return criarProvedorResend().enviar(
    mensagemDeConfirmacao({
      email: destinatario.email,
      cidade: destinatario.cidade,
      linkDeConfirmacao: urlDeConfirmacao(destinatario.token),
      tokenDeDescadastro: destinatario.token,
    }),
  );
}

/** Confirmação recebida: diz o que o alerta entrega e, principalmente, o que ainda não entrega. */
export async function enviarBoasVindas(destinatario: DestinatarioDoLead): Promise<ResultadoDeEnvio> {
  return criarProvedorResend().enviar(
    mensagemDeBoasVindas({
      email: destinatario.email,
      cidade: destinatario.cidade,
      tokenDeDescadastro: destinatario.token,
    }),
  );
}
