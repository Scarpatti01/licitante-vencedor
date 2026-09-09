import "server-only";

import { convidarParaCriarConta } from "./convite.ts";

/**
 * Reenvia o convite de criação de conta a quem comprou.
 *
 * ## POR QUE ISSO PRECISA EXISTIR
 *
 * O convite sai uma vez, na gravação da compra. E-mail cai em spam, some numa
 * caixa cheia, ou chega num endereço que a pessoa não abre. Sem reenvio, a
 * primeira falha vira suporte manual, e quem comprou fica sem o que pagou até
 * pensar em escrever para alguém. Muita gente não escreve: desiste.
 *
 * ## A RESPOSTA É SEMPRE A MESMA, E ISSO É DELIBERADO
 *
 * Esta função devolve `void`, e a rota responde igual em todos os casos. Contar
 * ao chamador se aquele e-mail comprou transformaria o formulário num
 * verificador de clientes: qualquer pessoa digitaria endereços e descobriria
 * quem é cliente do produto. É dado de terceiro, e não é nosso para revelar.
 *
 * O preço é que quem digitar o endereço errado vê "enviamos" e não recebe nada.
 * É um preço menor: a tela diz para conferir o endereço da compra, e o caminho
 * do suporte continua aberto.
 *
 * ## COMPRA REVOGADA NÃO RECEBE CONVITE
 *
 * A consulta filtra `revogado_em is null`. Quem foi reembolsado não tem acesso
 * a receber, e mandar o convite mesmo assim prometeria uma porta que a Jornada
 * fecha na cara da pessoa. Silêncio aqui é mais honesto que um convite morto.
 */
function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

export async function reenviarConvite(email: string): Promise<void> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const chave = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) {
    console.warn("Jornada: reenvio pedido sem credencial do banco.");
    return;
  }

  try {
    const alvo =
      `${url}/rest/v1/compras_da_jornada` +
      `?email=eq.${encodeURIComponent(email)}&revogado_em=is.null&select=email&limit=1`;

    const resposta = await fetch(alvo, {
      headers: { apikey: chave, authorization: `Bearer ${chave}` },
      cache: "no-store",
    });
    if (!resposta.ok) {
      console.error("Jornada: reenvio não consultou a compra", resposta.status);
      return;
    }

    const linhas = (await resposta.json().catch(() => [])) as unknown[];
    // Sem compra ativa não há o que reenviar, e o chamador não fica sabendo.
    if (!Array.isArray(linhas) || linhas.length === 0) return;

    await convidarParaCriarConta(email);
  } catch (erro) {
    console.error("Jornada: reenvio falhou.", erro instanceof Error ? erro.message : erro);
  }
}
