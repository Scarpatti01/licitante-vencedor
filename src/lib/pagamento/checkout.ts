import type { Plano } from "../precos.ts";

/**
 * A sessão de checkout da Stripe, montada a partir do plano.
 *
 * ## Preço inline, e não `Price` cadastrado na Stripe
 *
 * A Stripe permite as duas coisas: referenciar um objeto `Price` criado lá, ou
 * mandar `price_data` na hora. Este produto manda inline, e a razão é a mesma
 * que fez `precos.ts` existir: o preço aparece na página, nos dados
 * estruturados que o Google lê e na cobrança, e um preço que mora em dois
 * lugares é um preço que diverge.
 *
 * Com `Price` cadastrado, mudar R$ 59 para R$ 69 exigiria mexer no código E no
 * painel da Stripe, e esquecer o segundo passo cobraria o valor antigo de quem
 * assinasse depois — sem erro em lugar nenhum. Com preço inline, `precos.ts` é
 * a única fonte, e `divergenciasDePreco` já confere que ela bate com a tabela
 * `planos`.
 *
 * O custo dessa escolha é real e vale dizer: relatórios da Stripe por produto
 * ficam menos organizados, porque cada sessão cria o seu próprio preço. Para
 * quatro planos e nenhum cliente, é troca boa. Se um dia o catálogo crescer, é
 * aqui que se muda de ideia.
 *
 * ## Corpo em `application/x-www-form-urlencoded`
 *
 * A API da Stripe não recebe JSON. Ela recebe formulário, com os aninhamentos
 * escritos em colchetes (`line_items[0][price_data][currency]`). Não é
 * excentricidade nossa: é o formato dela.
 */

export type DadosDoCheckout = {
  plano: Plano;
  /** A empresa que vai assinar. Volta no webhook como `client_reference_id`. */
  empresaId: string;
  /** Para a Stripe não pedir o e-mail de novo a quem já está logado. */
  email: string | null;
  urlDeSucesso: string;
  urlDeCancelamento: string;
};

/**
 * Os parâmetros da sessão, como pares chave/valor.
 *
 * Devolve o objeto e não a string codificada para o teste poder afirmar sobre
 * campos, e não sobre uma linha de 400 caracteres onde um erro se esconde.
 */
export function parametrosDoCheckout(dados: DadosDoCheckout): Record<string, string> {
  const { plano, empresaId, email, urlDeSucesso, urlDeCancelamento } = dados;

  const parametros: Record<string, string> = {
    mode: "subscription",
    success_url: urlDeSucesso,
    cancel_url: urlDeCancelamento,

    /*
     * A empresa viaja aqui e volta no webhook. É o único jeito de saber de quem
     * é o pagamento quando a Stripe avisa, e é por isso que ele NÃO pode vir do
     * navegador: quem monta esta sessão é o servidor, com a empresa que
     * `empresaAtual()` devolveu.
     */
    client_reference_id: empresaId,
    "metadata[empresa_id]": empresaId,
    "metadata[plano]": plano.codigo,

    // O mesmo par vai na assinatura, e não só na sessão: a sessão some do
    // painel depois de um tempo, a assinatura fica. Sem isto, um webhook de
    // renovação daqui a seis meses chegaria sem saber de quem é.
    "subscription_data[metadata][empresa_id]": empresaId,
    "subscription_data[metadata][plano]": plano.codigo,

    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "brl",
    "line_items[0][price_data][unit_amount]": String(plano.mensalidadeEmCentavos),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `Licitante Vencedor ${plano.nome}`,
    "line_items[0][price_data][product_data][description]": plano.paraQuem,

    // Nota fiscal e cadastro no Brasil pedem o documento; deixar para depois do
    // pagamento é criar um cliente pago que a contabilidade não consegue fechar.
    "tax_id_collection[enabled]": "true",
    "billing_address_collection": "required",
  };

  // Só quando existe: mandar `customer_email` vazio faz a Stripe recusar a
  // sessão inteira, e o cliente veria um erro em vez do checkout.
  if (email) parametros.customer_email = email;

  return parametros;
}

/** Os parâmetros no formato que a API da Stripe aceita. */
export function corpoDoCheckout(dados: DadosDoCheckout): string {
  return new URLSearchParams(parametrosDoCheckout(dados)).toString();
}

/**
 * Cria a sessão e devolve para onde mandar o cliente.
 *
 * `Idempotency-Key` para o duplo clique não virar duas sessões: a chave é a
 * empresa mais o plano mais o minuto, então um clique nervoso reaproveita a
 * sessão e um arrependimento de meia hora depois cria outra.
 */
export async function abrirCheckout(
  dados: DadosDoCheckout,
  chaveSecreta: string,
  agora: Date = new Date(),
): Promise<string> {
  const resposta = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${chaveSecreta}`,
      "content-type": "application/x-www-form-urlencoded",
      "Idempotency-Key": chaveDeIdempotencia(dados, agora),
    },
    body: corpoDoCheckout(dados),
  });

  if (!resposta.ok) {
    /*
     * O corpo do erro da Stripe pode conter dado da requisição. Ele vai para o
     * log do servidor, nunca para a tela: quem clicou precisa saber que não
     * deu, não precisa ler a mensagem de uma API.
     */
    throw new Error(`stripe recusou a sessão: ${resposta.status} ${await resposta.text()}`);
  }

  const sessao = (await resposta.json()) as { url?: string };
  if (!sessao.url) throw new Error("stripe devolveu sessão sem `url`");
  return sessao.url;
}

export function chaveDeIdempotencia(dados: DadosDoCheckout, agora: Date): string {
  const minuto = agora.toISOString().slice(0, 16);
  return `checkout:${dados.empresaId}:${dados.plano.codigo}:${minuto}`;
}
