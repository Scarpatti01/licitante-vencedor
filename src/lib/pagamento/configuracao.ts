/**
 * Se dá para cobrar, e com que credencial.
 *
 * ## O padrão é DESLIGADO, e isso é a decisão inteira
 *
 * Escrito em 25/08 com a conta da Stripe ainda não resolvida. Todo o resto do
 * checkout existe e é testado; o que falta é uma variável de ambiente.
 *
 * Deixar desligado por padrão não é cautela genérica. É que a alternativa
 * — código de cobrança que "funciona" com credencial ausente e falha só na hora
 * do clique — produziria a pior tela do produto: o cliente decide pagar, clica,
 * e leva um erro. Quem chega ao botão já decidiu; perder ali é perder depois de
 * ter ganhado.
 *
 * Então a página de preços pergunta a este módulo se pode mostrar o botão. Sem
 * chave, ela continua dizendo "ainda não dá para assinar", que é verdade, e
 * pede o e-mail de quem quer ser avisado.
 *
 * ## O que NUNCA aparece aqui
 *
 * A chave secreta não mora no repositório, não passa por conversa e não entra
 * em log. Ela é criada pelo dono no painel da Vercel, como variável de
 * ambiente, e este arquivo só sabe se ela existe.
 */

/** A chave secreta da Stripe. `sk_live_…` em produção, `sk_test_…` no teste. */
const CHAVE = "STRIPE_SECRET_KEY";

/**
 * O segredo que assina os webhooks (`whsec_…`).
 *
 * Sem ele o webhook fica desligado também, e isso é obrigatório: um webhook que
 * aceita qualquer POST é um endpoint que qualquer pessoa usa para dizer "esta
 * empresa pagou". Ver `webhook.ts`.
 */
const SEGREDO_DO_WEBHOOK = "STRIPE_WEBHOOK_SECRET";

export type ConfiguracaoDePagamento = {
  chaveSecreta: string;
  segredoDoWebhook: string | null;
};

function env(nome: string): string | null {
  const valor = process.env[nome];
  return valor && valor.trim() ? valor.trim() : null;
}

/**
 * A configuração, ou `null` quando não dá para cobrar.
 *
 * `null` e não exceção: "ainda não configurado" é um estado legítimo do produto
 * hoje, não um defeito. Quem precisa cobrar trata o `null`; quem só quer saber
 * se mostra o botão chama `pagamentoLigado()`.
 */
export function configuracaoDePagamento(): ConfiguracaoDePagamento | null {
  const chaveSecreta = env(CHAVE);
  if (!chaveSecreta) return null;

  return { chaveSecreta, segredoDoWebhook: env(SEGREDO_DO_WEBHOOK) };
}

/** Dá para mostrar o botão de assinar? */
export function pagamentoLigado(): boolean {
  return configuracaoDePagamento() !== null;
}

/**
 * O webhook pode ser atendido?
 *
 * Separado de `pagamentoLigado` de propósito: dá para ter chave secreta sem ter
 * o segredo do webhook, e nesse estado o checkout abre mas a assinatura nunca é
 * registrada — o cliente paga e não recebe. Quem liga a cobrança precisa saber
 * que são DUAS variáveis, e `avisoDeConfiguracao` diz isso em voz alta.
 */
export function webhookLigado(): boolean {
  return configuracaoDePagamento()?.segredoDoWebhook !== null;
}

/**
 * O que falta para a cobrança funcionar, em uma frase, ou `null` se está tudo
 * pronto.
 *
 * Existe para o estado meio-configurado não passar despercebido. Ele é o pior
 * dos três: parece ligado, aceita pagamento, e não vira assinatura.
 */
export function avisoDeConfiguracao(): string | null {
  const config = configuracaoDePagamento();
  if (!config) return `${CHAVE} não está definida: a cobrança está desligada.`;
  if (!config.segredoDoWebhook) {
    return (
      `${CHAVE} está definida mas ${SEGREDO_DO_WEBHOOK} não. ` +
      "Neste estado o cliente consegue pagar e a assinatura NÃO é registrada. " +
      "Defina as duas, ou nenhuma."
    );
  }
  return null;
}
