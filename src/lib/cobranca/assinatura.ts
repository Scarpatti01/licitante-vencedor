import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * O que a processadora manda, e o que a gente aceita acreditar.
 *
 * ## Por que sem SDK
 *
 * A verificação de assinatura da Stripe é HMAC-SHA256 sobre `${t}.${corpo}` e
 * cabe em vinte linhas. Trazer o SDK — e a árvore de dependências dele — para
 * dentro do caminho que decide quem tem acesso pago seria mais superfície do que
 * benefício. Mesma escolha de `auth/senha-vazada.ts`.
 *
 * ## A regra que atravessa o arquivo
 *
 * Evento não é fonte de verdade; o ESTADO da assinatura é. Webhook chega
 * duplicado, chega fora de ordem, e chega atrasado — os três estão documentados
 * pela própria Stripe. Então nada aqui pergunta "o que aconteceu?"; tudo
 * pergunta "em que estado a assinatura está agora?". Isso torna reentrega
 * inofensiva sem precisar de esperteza.
 */

/** Cinco minutos, que é a tolerância recomendada pela Stripe. */
export const TOLERANCIA_EM_SEGUNDOS = 300;

export type Veredito = { valida: true } | { valida: false; motivo: string };

/**
 * Lê o cabeçalho `Stripe-Signature`, que vem como `t=...,v1=...,v1=...`.
 *
 * Devolve TODAS as assinaturas `v1`, e não só a primeira: durante rodízio de
 * segredo a Stripe manda mais de uma, e ficar com a primeira faria a troca de
 * segredo derrubar a cobrança num dia qualquer, sem ninguém ligar uma coisa à
 * outra.
 */
export function partirOCabecalho(cabecalho: string): { t: string | null; v1: string[] } {
  let t: string | null = null;
  const v1: string[] = [];
  for (const parte of cabecalho.split(",")) {
    const [chave, valor] = parte.trim().split("=", 2);
    if (!valor) continue;
    if (chave === "t") t = valor;
    else if (chave === "v1") v1.push(valor);
  }
  return { t, v1 };
}

/** Comparação em tempo constante, tolerante a tamanhos diferentes. */
function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  // `timingSafeEqual` LANÇA quando os tamanhos diferem, e o próprio lançamento
  // já vaza o tamanho. Comparar o tamanho antes é o mesmo vazamento, mas sem a
  // exceção — e o tamanho de um hexadecimal de HMAC é público de qualquer forma.
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * A requisição veio mesmo da processadora?
 *
 * `corpo` precisa ser o texto BRUTO. Reserializar o JSON muda espaços e ordem
 * de chaves, e a assinatura passa a não bater por um motivo que não aparece em
 * lugar nenhum do log.
 */
export function conferirAssinatura(entrada: {
  corpo: string;
  cabecalho: string | null;
  segredo: string;
  agora?: Date;
  toleranciaEmSegundos?: number;
}): Veredito {
  const { corpo, cabecalho, segredo } = entrada;
  const agora = entrada.agora ?? new Date();
  const tolerancia = entrada.toleranciaEmSegundos ?? TOLERANCIA_EM_SEGUNDOS;

  if (!cabecalho) return { valida: false, motivo: "sem cabeçalho de assinatura" };
  if (!segredo) return { valida: false, motivo: "sem segredo configurado" };

  const { t, v1 } = partirOCabecalho(cabecalho);
  if (!t || v1.length === 0) return { valida: false, motivo: "cabeçalho malformado" };

  const emSegundos = Number(t);
  if (!Number.isFinite(emSegundos)) return { valida: false, motivo: "carimbo de tempo inválido" };

  // Sem esta janela, uma requisição legítima capturada uma vez pode ser
  // reenviada para sempre — a assinatura continua válida, porque ela não expira
  // sozinha. É o que separa "veio da Stripe" de "veio da Stripe AGORA".
  const distancia = Math.abs(agora.getTime() / 1000 - emSegundos);
  if (distancia > tolerancia) {
    return { valida: false, motivo: `carimbo de tempo fora da janela (${Math.round(distancia)}s)` };
  }

  const esperada = createHmac("sha256", segredo).update(`${t}.${corpo}`, "utf8").digest("hex");
  if (!v1.some((assinatura) => iguais(assinatura, esperada))) {
    return { valida: false, motivo: "assinatura não confere" };
  }

  return { valida: true };
}

/** Os status que a Stripe dá a uma assinatura. */
export type StatusNaStripe =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

/** Os status que o nosso banco guarda (enum `status_da_assinatura`). */
export type StatusNoBanco = "teste" | "ativa" | "inadimplente" | "cancelada" | "encerrada";

export type Decisao =
  /**
   * Não gravar linha nenhuma. Reservado ao estado em que o primeiro pagamento
   * ainda não entrou — ver o comentário de `decidirPeloStatus`.
   */
  | { registrar: false; motivo: string }
  | { registrar: true; status: StatusNoBanco; encerrar: boolean };

/**
 * O que fazer com a nossa tabela, dado o estado na Stripe.
 *
 * ## A armadilha do boleto, e por que ela mora AQUI
 *
 * Boleto é assíncrono: a assinatura nasce `incomplete` no instante em que o
 * cliente gera o documento, e só vira `active` quando o pagamento compensa, um
 * dia útil depois. Se ele nunca pagar, ela morre `incomplete_expired`.
 *
 * O erro clássico é tratar "assinatura criada" como "assinatura paga". No nosso
 * esquema ele seria pior do que o normal, porque `cobertura_da_empresa` conta
 * como coberta QUALQUER assinatura sem `encerrada_em`, e
 * `limite_de_empresas_do_usuario` aceita `inadimplente`. Ou seja: gravar
 * `incomplete` como `inadimplente` daria acesso completo a quem só imprimiu um
 * boleto — três dias de produto grátis por tentativa, e tentativas ilimitadas.
 *
 * Por isso `incomplete` não grava NADA. Não é conservadorismo: é o único estado
 * em que dinheiro nenhum entrou ainda.
 *
 * ## Onde ficamos generosos, de propósito
 *
 * `past_due` MANTÉM o acesso. É o cliente que já pagou antes e cujo boleto do
 * mês venceu — cortar o acesso de quem tem edital com prazo correndo, por causa
 * de um boleto que talvez esteja compensando agora, custa mais em relação do
 * que economiza em produto. `unpaid` é o fim dessa linha: a Stripe já esgotou
 * as tentativas, e aí encerra.
 */
export function decidirPeloStatus(status: StatusNaStripe): Decisao {
  switch (status) {
    case "incomplete":
      return { registrar: false, motivo: "primeiro pagamento ainda não entrou" };

    case "trialing":
      return { registrar: true, status: "teste", encerrar: false };

    case "active":
      return { registrar: true, status: "ativa", encerrar: false };

    case "past_due":
      return { registrar: true, status: "inadimplente", encerrar: false };

    case "canceled":
      return { registrar: true, status: "cancelada", encerrar: true };

    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return { registrar: true, status: "encerrada", encerrar: true };
  }
}

/**
 * Os eventos que nos interessam.
 *
 * A lista é curta porque a decisão vem do ESTADO, não do evento: qualquer um
 * destes carrega a assinatura, e a partir dela `decidirPeloStatus` resolve. Os
 * três eventos de `checkout.session` NÃO entram: o de `completed` é justamente
 * o que dispara cedo demais no boleto, e os dois assíncronos são redundantes
 * com `customer.subscription.updated`, que chega de qualquer forma.
 */
export const EVENTOS_QUE_IMPORTAM = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export function eventoImporta(tipo: string): boolean {
  return (EVENTOS_QUE_IMPORTAM as readonly string[]).includes(tipo);
}
