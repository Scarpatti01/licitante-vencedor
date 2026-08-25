import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A assinatura do webhook da Stripe, conferida à mão.
 *
 * ## Por que isto não pode ser opcional
 *
 * O webhook é o endpoint que transforma um pagamento em assinatura ativa. Sem
 * conferir a assinatura criptográfica, ele é um formulário público onde
 * qualquer pessoa escreve "a empresa X pagou". Não é um risco teórico: a URL
 * fica no painel da Stripe, e endpoints de webhook são varridos por robô.
 *
 * ## Por que sem SDK
 *
 * O resto do projeto fala com PostgREST e com o Gemini por `fetch` puro. O que
 * o SDK da Stripe faria aqui é um HMAC-SHA256 e uma comparação em tempo
 * constante, que o `node:crypto` já entrega. Uma dependência a mais é uma
 * dependência a mais para manter atualizada num caminho que lida com dinheiro.
 *
 * ## O cabeçalho
 *
 *     Stripe-Signature: t=1614556800,v1=5257a869e7...,v1=outra
 *
 * O que se assina é `${t}.${corpo_cru}`. "Cru" é literal: o corpo precisa ser o
 * texto exato que chegou, byte a byte. `JSON.parse` seguido de
 * `JSON.stringify` muda espaçamento e ordem, e a assinatura deixa de bater —
 * é o erro clássico deste código, e é por isso que a rota lê `await req.text()`
 * antes de qualquer outra coisa.
 */

/** Quanto tempo de diferença entre o carimbo e agora ainda é aceitável. */
export const TOLERANCIA_EM_SEGUNDOS = 5 * 60;

export type FalhaDaAssinatura =
  | "sem-cabecalho"
  | "cabecalho-malformado"
  | "carimbo-fora-da-tolerancia"
  | "assinatura-nao-confere";

export type ConferenciaDoWebhook = { ok: true } | { ok: false; motivo: FalhaDaAssinatura };

type CabecalhoLido = { carimbo: number; assinaturas: string[] };

export function lerCabecalho(cabecalho: string): CabecalhoLido | null {
  let carimbo: number | null = null;
  const assinaturas: string[] = [];

  for (const parte of cabecalho.split(",")) {
    const [chave, valor] = parte.split("=", 2);
    if (!chave || !valor) continue;
    if (chave.trim() === "t") carimbo = Number(valor.trim());
    // `v1` pode aparecer mais de uma vez durante uma rotação de segredo, e as
    // duas são válidas. Ficar só com a primeira derrubaria o webhook no dia em
    // que o segredo fosse trocado.
    if (chave.trim() === "v1") assinaturas.push(valor.trim());
  }

  if (carimbo === null || !Number.isFinite(carimbo) || assinaturas.length === 0) return null;
  return { carimbo, assinaturas };
}

function iguaisEmTempoConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // `timingSafeEqual` exige o mesmo tamanho. Tamanhos diferentes já são
  // desiguais, e comparar o tamanho não vaza nada útil.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * O corpo veio mesmo da Stripe?
 *
 * `corpoCru` precisa ser o texto exato recebido. Ver o cabeçalho deste arquivo.
 */
export function conferirAssinatura(
  corpoCru: string,
  cabecalho: string | null,
  segredo: string,
  agora: Date = new Date(),
): ConferenciaDoWebhook {
  if (!cabecalho) return { ok: false, motivo: "sem-cabecalho" };

  const lido = lerCabecalho(cabecalho);
  if (!lido) return { ok: false, motivo: "cabecalho-malformado" };

  /*
   * A tolerância existe contra repetição: sem ela, quem capturasse um POST
   * legítimo poderia reenviá-lo para sempre, e cada reenvio seria aceito.
   * Vale para os dois lados — carimbo muito no futuro também é suspeito.
   */
  const agoraEmSegundos = Math.floor(agora.getTime() / 1000);
  if (Math.abs(agoraEmSegundos - lido.carimbo) > TOLERANCIA_EM_SEGUNDOS) {
    return { ok: false, motivo: "carimbo-fora-da-tolerancia" };
  }

  const esperada = createHmac("sha256", segredo)
    .update(`${lido.carimbo}.${corpoCru}`, "utf8")
    .digest("hex");

  const confere = lido.assinaturas.some((a) => iguaisEmTempoConstante(a, esperada));
  return confere ? { ok: true } : { ok: false, motivo: "assinatura-nao-confere" };
}

/**
 * O status da Stripe virando o `status_da_assinatura` do nosso banco.
 *
 * Os nomes não são iguais e a tradução é opinião, não mecânica:
 *
 *   `trialing`             → `teste`
 *   `active`               → `ativa`
 *   `past_due`, `unpaid`   → `inadimplente` (o cliente ainda espera serviço)
 *   `canceled`             → `cancelada`
 *   `incomplete_expired`   → `encerrada` (nunca chegou a valer)
 *
 * `incomplete` NÃO vira nada: é o pagamento que ainda está sendo processado, e
 * criar assinatura ali daria acesso a quem talvez não pague. `null` significa
 * "não mexa", e o webhook seguinte resolve.
 *
 * `paused` também devolve `null`, e por outro motivo: nós não usamos pausa, e
 * inventar um mapeamento para um estado que não existe no produto seria
 * escolher no escuro. Se um dia existir, é aqui que se decide.
 */
export function statusDaAssinatura(
  statusNaStripe: string,
): "teste" | "ativa" | "inadimplente" | "cancelada" | "encerrada" | null {
  switch (statusNaStripe) {
    case "trialing":
      return "teste";
    case "active":
      return "ativa";
    case "past_due":
    case "unpaid":
      return "inadimplente";
    case "canceled":
      return "cancelada";
    case "incomplete_expired":
      return "encerrada";
    default:
      return null;
  }
}

/**
 * Os eventos que este produto trata. O resto é ignorado com 200.
 *
 * Responder 200 ao que não interessa é o comportamento certo: a Stripe reenvia
 * o que não recebeu 200, e responder erro a um evento que simplesmente não nos
 * diz respeito criaria uma fila de reentrega que nunca esvazia.
 */
export const EVENTOS_TRATADOS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export function eventoInteressa(tipo: string): boolean {
  return (EVENTOS_TRATADOS as readonly string[]).includes(tipo);
}
