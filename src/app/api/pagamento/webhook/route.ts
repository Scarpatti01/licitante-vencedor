import { NextResponse } from "next/server";

import { configuracaoDePagamento } from "@/lib/pagamento/configuracao";
import { conferirAssinatura, decidirPeloStatus, eventoImporta } from "@/lib/cobranca/assinatura";
import type { StatusNaStripe } from "@/lib/cobranca/assinatura";

/**
 * O que a processadora conta depois que o cliente paga.
 *
 * ## A regra que este arquivo herda de `cobranca/assinatura.ts`
 *
 * Evento não é fonte de verdade; o ESTADO da assinatura é. Webhook chega
 * duplicado, fora de ordem e atrasado — os três documentados pela própria
 * Stripe. Nada aqui pergunta "o que aconteceu?"; tudo pergunta "em que estado a
 * assinatura está agora?". Reentrega fica inofensiva sem precisar de esperteza.
 *
 * ## Por que `checkout.session.completed` NÃO está na lista
 *
 * Porque no boleto ele dispara cedo demais: a sessão conclui quando o cliente
 * gera o documento, e o dinheiro entra um dia útil depois — ou nunca. Tratar
 * esse evento como "pagou" daria três dias de produto por boleto impresso, com
 * tentativas ilimitadas. `customer.subscription.updated` chega de qualquer
 * forma, e chega com o estado certo.
 *
 * ## O corpo cru é lido na primeira linha
 *
 * O erro clássico deste código é fazer `.json()` e reserializar antes de
 * conferir a assinatura: `JSON.parse` seguido de `stringify` muda espaçamento e
 * ordem de chave, e a assinatura deixa de bater até no que é legítimo.
 */

export async function POST(requisicao: Request) {
  const corpo = await requisicao.text();

  const config = configuracaoDePagamento();
  if (!config?.segredoDoWebhook) {
    return NextResponse.json({ erro: "webhook-desligado" }, { status: 503 });
  }

  const veredito = conferirAssinatura({
    corpo,
    cabecalho: requisicao.headers.get("stripe-signature"),
    segredo: config.segredoDoWebhook,
  });

  if (!veredito.valida) {
    // O motivo vai para o log, não para a resposta: dizer a quem tentou qual
    // conferência falhou é ensiná-lo a passar na próxima.
    console.warn("Webhook recusado:", veredito.motivo);
    return NextResponse.json({ erro: "assinatura-invalida" }, { status: 400 });
  }

  let evento: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    evento = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "corpo-invalido" }, { status: 400 });
  }

  const tipo = evento.type ?? "";
  // 200 para o que não interessa: a Stripe reenvia o que não recebe 200, e
  // responder erro a evento alheio cria uma fila de reentrega que não esvazia.
  if (!eventoImporta(tipo)) return NextResponse.json({ ignorado: tipo });

  const objeto = evento.data?.object ?? {};
  const metadata = (objeto.metadata ?? {}) as Record<string, unknown>;
  const empresaId = typeof metadata.empresa_id === "string" ? metadata.empresa_id : null;

  const decisao =
    typeof objeto.status === "string"
      ? decidirPeloStatus(objeto.status as StatusNaStripe)
      : { registrar: false as const, motivo: "assinatura sem status" };

  /*
   * Ainda NÃO grava no banco, e isso está declarado.
   *
   * A conta da Stripe não existe, então o formato exato do que ela manda não
   * foi visto uma única vez. Escrever o mapeamento de campos para colunas agora
   * seria escrever contra a documentação, e este projeto já pagou por isso: o
   * lote de IA consultou 176 vezes um estado que não existia, porque eu tinha
   * codificado `JOB_STATE_*` lendo a documentação errada.
   *
   * Com a conta criada, disparar um evento de teste, LER o que chegou, e só
   * então gravar. Até lá o log abaixo é o que torna esse primeiro evento
   * legível.
   */
  console.info("Webhook aceito (ainda sem gravação):", {
    tipo,
    empresaId,
    statusNaStripe: objeto.status,
    decisao,
    assinaturaNaStripe: typeof objeto.id === "string" ? objeto.id : null,
  });

  return NextResponse.json({ recebido: tipo, empresaId, decisao });
}
