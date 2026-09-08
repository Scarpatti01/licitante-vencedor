import { NextResponse } from "next/server";

import { segredoDaHotmart, tokenConfere } from "@/lib/hotmart/configuracao";
import { lerAviso, nomeDoEvento } from "@/lib/hotmart/webhook";
import { aplicar } from "@/lib/hotmart/repositorio";

/**
 * O aviso de venda da Hotmart.
 *
 * Endereço a cadastrar no painel dela, em Ferramentas → Webhook:
 *
 *     https://licitantevencedor.com.br/api/hotmart/webhook
 *
 * ## O CÓDIGO DE RESPOSTA É A PARTE QUE IMPORTA
 *
 * A Hotmart reentrega o que não recebeu 2xx, e desiste do que recebeu. Isso faz
 * do código de resposta a única rede que existe: responder 200 para um aviso
 * que não foi processado apaga a compra do mundo, sem log do lado dela e sem
 * linha do lado daqui. O dinheiro entrou e ninguém sabe de quem.
 *
 * Então a regra aqui é estrita:
 *
 *   200  a compra foi gravada, revogada, ou o evento não interessa mesmo
 *   400  o corpo veio num formato que eu não sei ler  → ela reentrega
 *   401  o `hottok` não confere                       → não é a Hotmart
 *   503  falta o segredo, ou o banco recusou          → ela reentrega
 *
 * O 503 no erro de banco é deliberado e é o oposto do instinto: dá vontade de
 * responder 200 para "não ficar devendo resposta". Mas uma indisponibilidade do
 * Supabase com 200 vira compra perdida em definitivo, e com 503 vira uma
 * reentrega que provavelmente dá certo.
 *
 * ## O que NÃO é conferido aqui
 *
 * Que o produto seja o Workbook. A conta tem um produto só, e filtrar por
 * identificador que eu não conferi no painel do dono criaria a chance de o
 * filtro estar errado e recusar TODA venda — que é bem pior que o risco de
 * aceitar a venda de um segundo produto que ainda não existe. Quando existir um
 * segundo, o filtro entra com o número conferido na mão.
 */

export const dynamic = "force-dynamic";

export async function POST(requisicao: Request) {
  const segredo = segredoDaHotmart();
  if (!segredo) {
    console.warn("Hotmart: aviso recebido com o webhook desligado (falta HOTMART_HOTTOK)");
    return NextResponse.json({ erro: "webhook-desligado" }, { status: 503 });
  }

  // A Hotmart manda o token neste cabeçalho. O nome varia em maiúsculas entre
  // as versões dela, e `headers.get` já é insensível a caixa.
  const recebido = requisicao.headers.get("x-hotmart-hottok");
  if (!tokenConfere(recebido, segredo)) {
    // Sem dizer o que falhou: contar a quem tentou se o token estava perto é
    // ensiná-lo a acertar na próxima.
    console.warn("Hotmart: aviso recusado, hottok não confere");
    return NextResponse.json({ erro: "nao-autorizado" }, { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = (await requisicao.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: "corpo-invalido" }, { status: 400 });
  }

  const decisao = lerAviso(corpo);
  if (!decisao) {
    /*
     * O formato mudou, ou veio um evento de compra sem e-mail ou sem
     * transação. As CHAVES vão para o log, e os valores não: o corpo carrega
     * dado pessoal do comprador, e log de produção não é lugar para isso.
     *
     * 400 e não 200 de propósito: assim a Hotmart reentrega, e o aviso fica na
     * fila dela enquanto o formato é corrigido aqui.
     */
    console.error(
      "Hotmart: não soube ler o aviso.",
      "evento:", nomeDoEvento(corpo) || "(sem nome)",
      "chaves do corpo:", Object.keys(corpo),
      "chaves de data:", Object.keys((corpo.data as Record<string, unknown>) ?? {}),
    );
    return NextResponse.json({ erro: "formato-desconhecido" }, { status: 400 });
  }

  if (decisao.fazer === "ignorar") {
    return NextResponse.json({ ok: true, efeito: "ignorado", porque: decisao.porque });
  }

  const resultado = await aplicar(decisao);
  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.motivo }, { status: 503 });
  }

  console.log("Hotmart:", decisao.fazer, resultado.efeito, decisao.referencia);
  return NextResponse.json({ ok: true, efeito: resultado.efeito });
}
