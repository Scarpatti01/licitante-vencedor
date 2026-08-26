/**
 * Quais assinaturas contam como vivas, e o que elas autorizam.
 *
 * ## Por que este módulo nasceu em 25/08
 *
 * Ao acabar com o alerta gratuito, fui conferir onde o produto exigia
 * assinatura para enviar o resumo diário. Não exigia em lugar nenhum:
 * `destinatarias()` devolvia toda empresa com perfil, e a assinatura só era
 * consultada para descobrir se o plano inclui a leitura do documento.
 *
 * Ou seja, o teste de catorze dias implantado sobre aquilo nunca cortaria nada.
 * `encerrar_testes_vencidos()` mudaria o status para `encerrada`, e o resumo
 * continuaria saindo — o alerta gratuito diário voltaria pela porta dos fundos,
 * com passos a mais e com o nome trocado.
 *
 * A doc de `assinatura/teste.ts` afirmava que a consulta do resumo usava o
 * mesmo filtro de `assinantesVivos()`. Era intenção minha, escrita como fato.
 * Está corrigida lá.
 *
 * ## Por que a decisão é uma função pura, e não um `if` no repositório
 *
 * Porque `resumo/repositorio.ts` importa `server-only` e fala com o PostgREST:
 * o `if` lá dentro não teria como ser testado sem subir banco. Aqui a regra é
 * dado de entrada e booleano de saída, e a guarda que a protege é de verdade —
 * ela roda a decisão, em vez de reconhecer o texto do fonte.
 */

/**
 * Os status que dão acesso ao produto.
 *
 * `inadimplente` está na lista de propósito: cartão recusado não é cancelamento,
 * e cortar o serviço no primeiro erro de cobrança é como se perde um cliente que
 * ia pagar na segunda tentativa. Quem sai da lista é quem cancelou (`cancelada`)
 * e quem teve o teste vencido (`encerrada`).
 */
export const STATUS_VIVOS = ["teste", "ativa", "inadimplente"] as const;

export type StatusVivo = (typeof STATUS_VIVOS)[number];

/**
 * Os status que representam DINHEIRO ENTRANDO.
 *
 * `teste` está viva e não está aqui, e a distinção custou uma quintuplicação de
 * custo para aparecer.
 *
 * Em 25/08 o teste de catorze dias passou a existir, e o primeiro deles foi
 * aberto para a conta do próprio dono. `tetoDeLeitura` decidia quantos editais
 * ler por dia olhando "há assinante vivo?" — e passou a ver um. O teto subiu
 * de 5 para 25 leituras por empresa por dia, de um dia para o outro, sem
 * ninguém ter pago nada. O comentário que justificava aquele teto falava em
 * "no dia em que a primeira assinatura viva aparecer", e a frase era do tempo
 * em que assinatura viva só nascia de um cartão.
 *
 * Teste não é receita. Quem decide o tamanho do gasto é quem paga.
 *
 * `inadimplente` fica: é cliente com cartão recusado, não cliente que sumiu, e
 * cortar o serviço dele na primeira falha de cobrança perde quem ia pagar na
 * segunda tentativa.
 */
export const STATUS_PAGANTES = ["ativa", "inadimplente"] as const;

/** O filtro do PostgREST para quem paga. Montado da lista, nunca digitado. */
export const FILTRO_POSTGREST_DE_PAGANTES = `in.(${STATUS_PAGANTES.join(",")})`;

export function assinaturaPaga(status: unknown): boolean {
  return typeof status === "string" && (STATUS_PAGANTES as readonly string[]).includes(status);
}

/** O filtro do PostgREST, montado a partir da lista — nunca digitado de novo. */
export const FILTRO_POSTGREST_DE_VIVAS = `in.(${STATUS_VIVOS.join(",")})`;

export function assinaturaEstaViva(status: unknown): boolean {
  return typeof status === "string" && (STATUS_VIVOS as readonly string[]).includes(status);
}

/**
 * A empresa recebe o resumo diário?
 *
 * Uma linha, e é o portão inteiro do produto pago. Sem assinatura viva do
 * titular, não sai e-mail: é isto que faz o fim do teste ser o fim do acesso.
 */
export function recebeOResumo(assinaturaDoTitular: { status?: unknown } | undefined | null): boolean {
  return assinaturaEstaViva(assinaturaDoTitular?.status);
}

/**
 * O plano desta assinatura inclui abrir o arquivo do edital?
 *
 * `null` em `limite_de_analises_profundas` é SEM LIMITE, que é o plano que lê.
 * `0` é o plano de lista — a cota não acabou, ela nunca existiu. Ausência de
 * plano legível cai para `false`, que erra para o lado de prometer menos.
 */
export function leituraInclusaNoPlano(limiteDeAnalisesProfundas: unknown, temPlano: boolean): boolean {
  if (!temPlano) return false;
  if (limiteDeAnalisesProfundas === null) return true;
  return typeof limiteDeAnalisesProfundas === "number" && limiteDeAnalisesProfundas > 0;
}
