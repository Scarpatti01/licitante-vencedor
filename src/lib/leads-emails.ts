import "server-only";

import {
  criarProvedorResend,
  mensagemDeBoasVindas,
  mensagemDeConfirmacao,
  type ResultadoDeEnvio,
} from "@/lib/email";
import { SITE } from "./site";
import type { Material } from "./materiais";

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
  /** O material gratuito pedido, quando o cadastro foi por um. */
  material?: Material | null;
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
export function urlDeConfirmacao(
  token: string,
  urlBase: string = SITE.url,
  material?: Pick<Material, "slug"> | null,
): string {
  const base = `${urlBase}/confirmar/?t=${encodeURIComponent(token)}`;
  // O material viaja no link, e não só na origem gravada: ver `materiais.ts`.
  return material ? `${base}&m=${encodeURIComponent(material.slug)}` : base;
}

/** O que a camada de e-mail precisa saber do material, sem conhecer `materiais.ts`. */
function materialParaOEmail(material: Material | null | undefined, urlBase: string = SITE.url) {
  if (!material) return null;
  return {
    nome: material.nome,
    nomeCurto: material.nomeCurto,
    descricao: material.descricao,
    url: `${urlBase}${material.arquivo}`,
  };
}

/** Pede a confirmação do endereço. Sem este clique, o lead não recebe mais nada. */
export async function enviarConfirmacao(destinatario: DestinatarioDoLead): Promise<ResultadoDeEnvio> {
  return criarProvedorResend().enviar(
    mensagemDeConfirmacao({
      email: destinatario.email,
      cidade: destinatario.cidade,
      linkDeConfirmacao: urlDeConfirmacao(destinatario.token, SITE.url, destinatario.material),
      tokenDeDescadastro: destinatario.token,
      material: materialParaOEmail(destinatario.material),
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
      material: materialParaOEmail(destinatario.material),
    }),
  );
}
