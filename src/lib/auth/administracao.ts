import "server-only";

import { notFound } from "next/navigation";
import { ehAdministradorDaPlataforma } from "./plataforma";
import { usuarioAtual, type UsuarioAutenticado } from "./sessao";

/**
 * A porta da área de operação, num lugar só.
 *
 * Existe pelo mesmo motivo que `sessao.ts` concentra a decisão de tenant: quanto
 * mais telas de administração existirem, mais fácil fica alguém criar a próxima
 * e esquecer a checagem. Uma linha no topo da página é difícil de esquecer, e
 * quando esquecerem há um arquivo só para auditar — este.
 *
 * ## A checagem mora na tela, não no proxy
 *
 * O proxy já barra quem não tem sessão, mas ele decide otimista, sem consultar
 * nada, porque roda em toda navegação (inclusive nas pré-carregadas). Autorizar
 * ali seria autorizar pelo cookie, que é o que o cliente manda. É o guia de
 * autenticação do Next que recomenda esta separação, e a diferença aparece
 * exatamente no caso que importa: um cliente logado do produto passa pelo proxy
 * sem nenhum problema e precisa ser barrado aqui.
 */

/**
 * Devolve o administrador da requisição, ou responde 404.
 *
 * ## Por que 404, e não 403
 *
 * 403 confirma que o endereço existe. Para uma área cuja proteção é uma lista de
 * e-mails, essa confirmação é o começo do trabalho de quem procura o que atacar:
 * ela transforma "adivinhar a URL" em "descobri a URL, agora falta a conta".
 * 404 não nega nem confirma nada, e o custo é zero — quem é administrador nunca
 * vê esta resposta, e quem não é não tinha o que fazer aqui.
 *
 * Vale para os dois motivos de recusa, de propósito: não ser administrador e
 * não haver administrador nenhum configurado levam à mesma tela. O segundo caso
 * é erro de configuração, e quem opera descobre pelo log do deploy — não por uma
 * mensagem na tela pública, que diria a um estranho que existe uma variável de
 * ambiente ali esperando ser preenchida.
 */
export async function exigirAdministrador(): Promise<UsuarioAutenticado> {
  const usuario = await usuarioAtual();

  if (!ehAdministradorDaPlataforma(usuario?.email, process.env.ADMINS_DA_PLATAFORMA)) {
    notFound();
  }

  // `usuarioAtual()` não pode ter devolvido `null` aqui: sem e-mail a checagem
  // acima já teria caído no 404. O `!` é a leitura correta e não uma aposta.
  return usuario!;
}
