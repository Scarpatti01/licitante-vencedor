/**
 * O que a Hotmart conta quando alguém compra, e o que fazemos com isso.
 *
 * ## Por que este arquivo não é o webhook da Stripe
 *
 * `api/pagamento/webhook` trata ASSINATURA, e o princípio dele é "o evento não
 * é fonte de verdade, o estado da assinatura é". Aqui é outra coisa: compra
 * avulsa, pagamento único, e a Hotmart não expõe um estado consultável de
 * "esta compra está viva". O que ela manda é o evento, e é com ele que se
 * trabalha.
 *
 * O que salva isso de ser frágil é o banco, não este código. `compras_da_jornada`
 * tem índice único em `referencia_externa`, então a mesma transação nunca vira
 * duas compras por mais vezes que a Hotmart reentregue o aviso. A idempotência
 * mora lá, onde não depende de ninguém lembrar.
 *
 * ## A compra é do E-MAIL, e isso já estava resolvido
 *
 * A migração de 27/08 documenta a razão: a pessoa paga na Hotmart com um
 * e-mail, nunca criou conta aqui, e o aviso chega antes de o usuário existir.
 * Registrar por e-mail faz o acesso esperar por ela. Este módulo não precisa
 * procurar conta nenhuma, e é por isso que ele não perde compra.
 *
 * ## O FORMATO DO AVISO, E O QUE EU NÃO SEI
 *
 * A Hotmart mudou o formato do postback entre versões, e o que está aqui cobre
 * as duas formas que ela documenta: a aninhada (`data.buyer.email`) e a antiga
 * e achatada (`email`). Se chegar uma terceira, `lerAviso` devolve o motivo em
 * vez de adivinhar, e a rota responde 400 com as chaves recebidas no log.
 *
 * Isso é deliberado e é a decisão mais importante do arquivo: um webhook de
 * pagamento que responde 200 para o que não entendeu faz a Hotmart parar de
 * reentregar, e a compra some sem deixar rastro. Falhar alto devolve o aviso
 * para a fila dela, e o dinheiro já entrou de qualquer forma.
 */

/** O que o aviso pede que se faça. */
export type Decisao =
  | { fazer: "liberar"; email: string; referencia: string }
  | { fazer: "revogar"; email: string; referencia: string; motivo: string }
  | { fazer: "ignorar"; porque: string };

/**
 * Os eventos que liberam acesso.
 *
 * `PURCHASE_COMPLETE` entra junto com `PURCHASE_APPROVED` porque a Hotmart
 * manda um ou outro conforme a forma de pagamento, e receber os dois é
 * inofensivo: o índice único da tabela transforma o segundo em nada.
 */
const LIBERAM = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);

/**
 * Os eventos que tiram o acesso, com o motivo que vai para a coluna.
 *
 * `PURCHASE_PROTEST` é contestação de cartão: o dinheiro sai da conta do dono
 * mesmo que a compra pareça boa na tela da Hotmart.
 */
const REVOGAM: Record<string, string> = {
  PURCHASE_REFUNDED: "reembolso na Hotmart",
  PURCHASE_CHARGEBACK: "chargeback na Hotmart",
  PURCHASE_PROTEST: "contestação na Hotmart",
  PURCHASE_CANCELED: "compra cancelada na Hotmart",
  PURCHASE_EXPIRED: "pagamento expirado na Hotmart",
};

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

/**
 * O e-mail do comprador, normalizado como a tabela exige.
 *
 * A coluna tem `check (email = lower(btrim(email)))`, e a normalização acontece
 * aqui em vez de lá porque a plataforma devolve o e-mail como a pessoa digitou:
 * com maiúscula e espaço. Sem isto, "Joao@Empresa.com.br " seria recusado pela
 * restrição e a compra se perderia por causa de um shift.
 */
function emailDo(corpo: Record<string, unknown>): string | null {
  const dados = objeto(corpo.data) ?? corpo;
  const comprador = objeto(dados.buyer) ?? objeto(dados.buyerEmail) ?? null;

  const bruto =
    texto(comprador?.email) ??
    texto(dados.buyer_email) ??
    texto(dados.buyerEmail) ??
    texto(dados.email) ??
    texto(corpo.email);

  if (!bruto) return null;
  const limpo = bruto.toLowerCase().trim();
  // O mesmo formato que a coluna cobra. Recusar aqui é melhor que deixar o
  // banco recusar: aqui o motivo vira log legível.
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(limpo) ? limpo : null;
}

/** O identificador da transação, que é o que torna o aviso idempotente. */
function referenciaDe(corpo: Record<string, unknown>): string | null {
  const dados = objeto(corpo.data) ?? corpo;
  const compra = objeto(dados.purchase);

  return (
    texto(compra?.transaction) ??
    texto(dados.transaction) ??
    texto(corpo.transaction) ??
    null
  );
}

export function nomeDoEvento(corpo: Record<string, unknown>): string {
  return texto(corpo.event) ?? texto(corpo.status) ?? "";
}

/**
 * Lê o aviso e diz o que fazer, ou por que não deu.
 *
 * Devolve `ignorar` para evento que não interessa — a Hotmart manda dezenas de
 * tipos, de carrinho abandonado a aula assistida — e isso responde 200, porque
 * não há nada errado com eles. `null` é reservado para o que deveria ter sido
 * entendido e não foi, e é isso que a rota transforma em 400.
 */
export function lerAviso(corpo: Record<string, unknown>): Decisao | null {
  const evento = nomeDoEvento(corpo).toUpperCase();

  if (!LIBERAM.has(evento) && !(evento in REVOGAM)) {
    return { fazer: "ignorar", porque: `evento ${evento || "sem nome"}` };
  }

  const email = emailDo(corpo);
  const referencia = referenciaDe(corpo);
  if (!email || !referencia) return null;

  if (LIBERAM.has(evento)) {
    return { fazer: "liberar", email, referencia };
  }
  return { fazer: "revogar", email, referencia, motivo: REVOGAM[evento] };
}
