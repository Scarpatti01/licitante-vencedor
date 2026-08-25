import { NextResponse } from "next/server";

import { configuracaoDePagamento } from "@/lib/pagamento/configuracao";
import { conferirAssinatura, eventoInteressa, statusDaAssinatura } from "@/lib/pagamento/webhook";

/**
 * O que a Stripe conta depois que o cliente paga.
 *
 * ## A primeira linha do corpo é uma decisão, não um detalhe
 *
 * `await requisicao.text()` vem ANTES de qualquer outra coisa, e o corpo cru é
 * o que se confere. O erro clássico deste arquivo é fazer `.json()` primeiro e
 * depois reserializar para conferir a assinatura: `JSON.parse` seguido de
 * `stringify` muda espaçamento e ordem de chave, a assinatura deixa de bater, e
 * o webhook recusa tudo — inclusive o que é legítimo. Tem teste sobre isso em
 * `webhook.test.ts`.
 *
 * ## Sem segredo, o endpoint recusa
 *
 * Um webhook que aceita qualquer POST é um formulário público onde qualquer
 * pessoa escreve "a empresa X pagou". A URL fica no painel da Stripe e
 * endpoints de webhook são varridos por robô, então isto não é hipótese
 * distante.
 *
 * ## O que ele responde, e por quê
 *
 *   200 → tratado, ou ignorado de propósito. A Stripe reenvia o que não recebe
 *         200, e responder erro a um evento que não nos diz respeito criaria
 *         uma fila de reentrega que nunca esvazia.
 *   400 → assinatura não confere. Não reenviar é o certo: reenviar o mesmo
 *         corpo daria o mesmo resultado.
 *   503 → não configurado.
 */

export async function POST(requisicao: Request) {
  // PRIMEIRA coisa. Ver o cabeçalho deste arquivo.
  const corpoCru = await requisicao.text();

  const config = configuracaoDePagamento();
  if (!config?.segredoDoWebhook) {
    return NextResponse.json({ erro: "webhook-desligado" }, { status: 503 });
  }

  const conferencia = conferirAssinatura(
    corpoCru,
    requisicao.headers.get("stripe-signature"),
    config.segredoDoWebhook,
  );

  if (!conferencia.ok) {
    // O motivo vai para o log, não para a resposta: dizer a quem tentou
    // exatamente qual conferência falhou é ensiná-lo a passar na próxima.
    console.warn("Webhook da Stripe recusado:", conferencia.motivo);
    return NextResponse.json({ erro: "assinatura-invalida" }, { status: 400 });
  }

  let evento: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    evento = JSON.parse(corpoCru);
  } catch {
    return NextResponse.json({ erro: "corpo-invalido" }, { status: 400 });
  }

  const tipo = evento.type ?? "";
  if (!eventoInteressa(tipo)) {
    return NextResponse.json({ ignorado: tipo });
  }

  const objeto = evento.data?.object ?? {};
  const metadata = (objeto.metadata ?? {}) as Record<string, unknown>;
  const empresaId =
    typeof metadata.empresa_id === "string"
      ? metadata.empresa_id
      : typeof objeto.client_reference_id === "string"
        ? objeto.client_reference_id
        : null;

  const status =
    typeof objeto.status === "string" ? statusDaAssinatura(objeto.status) : null;

  /*
   * Ainda NÃO grava a assinatura no banco.
   *
   * Isto é deliberado e está declarado: a conta da Stripe ainda não existe,
   * então o formato exato do que ela manda não foi visto uma única vez. Escrever
   * agora o mapeamento de campos para colunas seria escrever contra a
   * documentação, e este projeto já pagou por isso — foi assim que o lote de IA
   * consultou 176 vezes um estado que não existia, porque eu tinha codificado
   * `JOB_STATE_*` lendo a documentação errada.
   *
   * O caminho honesto é: com a conta criada, disparar um evento de teste, LER o
   * que chegou, e só então gravar. Até lá, o webhook confere a assinatura,
   * reconhece o evento e registra no log o que faria — que é exatamente o que
   * torna esse primeiro evento de teste legível.
   */
  console.info("Webhook da Stripe aceito (ainda sem gravação):", {
    tipo,
    empresaId,
    statusNaStripe: objeto.status,
    statusNoProduto: status,
    assinaturaNaStripe: typeof objeto.id === "string" ? objeto.id : null,
  });

  return NextResponse.json({ recebido: tipo, empresaId, status });
}
