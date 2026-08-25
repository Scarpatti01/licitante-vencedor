import { NextResponse } from "next/server";

import { empresaAtual } from "@/lib/dados";
import { usuarioAtual } from "@/lib/auth/sessao";
import { PLANOS } from "@/lib/precos";
import { SITE } from "@/lib/site";
import { abrirCheckout } from "@/lib/pagamento/checkout";
import { avisoDeConfiguracao, configuracaoDePagamento } from "@/lib/pagamento/configuracao";

/**
 * Abre a sessão de pagamento e devolve para onde mandar o cliente.
 *
 * ## O que vem do navegador, e o que não vem
 *
 * Do navegador vem UMA coisa: o código do plano. E ele é conferido contra
 * `PLANOS` antes de virar preço — quem manda `{"plano":"leve"}` recebe R$ 59
 * porque é isso que `precos.ts` diz, não porque pediu.
 *
 * O que NUNCA vem do navegador é o valor e a empresa. Aceitar
 * `mensalidadeEmCentavos` do corpo seria deixar o cliente escolher quanto pagar;
 * aceitar `empresaId` seria deixá-lo assinar em nome de outra.
 *
 * ## Desligado responde 503, e com motivo
 *
 * Enquanto a conta da Stripe não estiver resolvida, esta rota recusa. A tela
 * nem mostra o botão (ver `/precos/`), então chegar aqui já significa que
 * alguém chamou a API direto — e merece saber por que não funcionou, em vez de
 * um 500 mudo.
 */

export async function POST(requisicao: Request) {
  const config = configuracaoDePagamento();
  if (!config) {
    return NextResponse.json(
      {
        erro: "cobranca-desligada",
        detalhe: avisoDeConfiguracao(),
      },
      { status: 503 },
    );
  }

  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "sem-sessao" }, { status: 401 });
  }

  let codigo: unknown;
  try {
    codigo = ((await requisicao.json()) as { plano?: unknown }).plano;
  } catch {
    return NextResponse.json({ erro: "corpo-invalido" }, { status: 400 });
  }

  const plano = PLANOS.find((p) => p.codigo === codigo);
  if (!plano) {
    return NextResponse.json({ erro: "plano-desconhecido" }, { status: 400 });
  }

  try {
    // A empresa vem do servidor, nunca do corpo.
    const empresaId = await empresaAtual();

    const url = await abrirCheckout(
      {
        plano,
        empresaId,
        email: usuario.email,
        urlDeSucesso: `${SITE.url}/painel/?assinatura=nova`,
        urlDeCancelamento: `${SITE.url}/precos/`,
      },
      config.chaveSecreta,
    );

    return NextResponse.json({ url });
  } catch (erro) {
    /*
     * O erro da Stripe pode conter dado da requisição, e vai só para o log do
     * servidor. Quem clicou precisa saber que não deu; não precisa ler a
     * mensagem de uma API de terceiro.
     */
    console.error("Falha ao abrir o checkout", erro);
    return NextResponse.json({ erro: "checkout-falhou" }, { status: 502 });
  }
}
