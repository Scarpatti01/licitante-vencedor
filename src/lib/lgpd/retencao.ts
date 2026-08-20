/**
 * Por quanto tempo um documento de habilitação sobrevive depois que a
 * assinatura da empresa encerra.
 *
 * O prazo existe para o cliente que cancela e reconsidera dentro do mês não
 * precisar reenviar oito documentos — não para guardar dado que não serve
 * mais a ninguém. Passado o prazo, o documento não tem mais função: a
 * empresa não está mais em produto, e o arquivo (que pode conter dado
 * pessoal de sócio ou responsável técnico) vira só risco, sem contrapartida.
 *
 * `decisoes_de_triagem` e o histórico de ações NÃO seguem este prazo — eles
 * saem só sob pedido explícito de exclusão (ver `exclusao.ts`), porque
 * servem a uma pergunta que sobrevive ao cancelamento: "por que o produto
 * recomendou ou não recomendou X à empresa". Documento de habilitação não
 * responde pergunta nenhuma depois que a assinatura acabou.
 */
export const DIAS_DE_GRACA_APOS_CANCELAMENTO = 30;

/**
 * O prazo de carência já venceu?
 *
 * Função pura e só isso: decidir QUEM está no prazo é responsabilidade de
 * `exclusao.ts`, que lê `assinaturas` no banco. Separar os dois é o que
 * permite testar a regra do prazo sem simular Postgres.
 */
export function prazoDeGracaVencido(
  encerradaEm: Date,
  agora: Date,
  diasDeGraca: number = DIAS_DE_GRACA_APOS_CANCELAMENTO,
): boolean {
  const limite = new Date(encerradaEm.getTime() + diasDeGraca * 24 * 60 * 60 * 1000);
  return agora.getTime() >= limite.getTime();
}
