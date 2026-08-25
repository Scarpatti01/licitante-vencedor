/**
 * Por quanto tempo uma decisão de triagem precisa continuar existindo.
 *
 * ## A pergunta que a tabela responde, e por quanto tempo ela é feita
 *
 * `decisoes_de_triagem` existe para responder "por que este edital NÃO
 * apareceu para mim?" — é o que `supabase.ts#explicarTriagem` lê, e é o que
 * separa a triagem de uma caixa-preta. `lgpd/retencao.ts` diz, com razão, que
 * essas linhas não seguem o prazo de exclusão do documento de habilitação,
 * porque servem a uma pergunta que sobrevive ao cancelamento.
 *
 * Só que "sobrevive ao cancelamento" não é o mesmo que "vive para sempre".
 * Ninguém pergunta por que não recebeu um edital que encerrou há três meses: a
 * proposta não pode mais ser entregue, e a resposta não muda decisão nenhuma. A
 * pergunta vive enquanto o edital vive.
 *
 * Por isso a régua aqui não é o calendário, é o ciclo de vida do edital. É a
 * mesma disciplina de `abertos/tipos.ts#sobreviveAoRetrato`: amarrar o tempo de
 * vida do dado ao tempo de vida da coisa que ele descreve, em vez de a um
 * número redondo que alguém escolheu numa reunião.
 *
 * ## O que isto resolve, em número
 *
 * Medido em 25/08: `decisoes_de_triagem` custa 623 bytes por linha contando
 * índice, e 26% dos editais no banco já estão encerrados. Sem esta regra, uma
 * empresa com recorte nacional acumula quase 1 milhão de linhas por ano, uns
 * 646 MB — para um cliente que paga R$ 59. Com ela, a tabela chega num platô em
 * vez de crescer para sempre.
 *
 * ## O que isto NÃO resolve, e é honesto dizer
 *
 * `DELETE` no Postgres não devolve espaço ao disco: ele marca a linha como
 * morta e o autovacuum libera aquele espaço para reuso DENTRO da tabela. O
 * efeito é que a tabela para de crescer, não que o medidor do Supabase desça.
 * Para o número cair de verdade seria preciso `VACUUM FULL`, que tranca a
 * tabela. Para o objetivo — nunca chegar no teto do plano — o platô basta, e
 * conferimos que o autovacuum está dando conta (zero linhas mortas acumuladas
 * em 25/08).
 */

/**
 * Quantos dias depois do encerramento do edital a decisão pode sair.
 *
 * Trinta e não zero porque a pergunta ainda é feita depois do fim: o cliente
 * abre o e-mail da semana passada, vê que perdeu um pregão, e quer saber por
 * que não foi avisado. Se a linha já tiver sumido, o suporte responde "não
 * sei", que é justamente o que este projeto decidiu não ser.
 *
 * Trinta e não noventa porque, passado um mês, o edital virou contrato de
 * outro. A pergunta deixa de ser operacional e vira curiosidade, e curiosidade
 * não justifica carregar 646 MB por cliente.
 */
export const DIAS_APOS_ENCERRAMENTO = 30;

/**
 * Uma decisão sobre um edital sem prazo publicado nunca expira por esta regra.
 *
 * Sem `encerramento_proposta` não dá para saber se o edital acabou, e apagar
 * "porque provavelmente já passou" seria destruir dado por suposição. O caso é
 * raro (a coleta separa os sem prazo) e o custo de mantê-los é pequeno; o custo
 * de apagar errado é uma pergunta do cliente sem resposta.
 */
export function decisaoExpirou(
  edital: { encerramentoProposta: string | null },
  agora: Date,
  dias: number = DIAS_APOS_ENCERRAMENTO,
): boolean {
  if (edital.encerramentoProposta === null) return false;

  const fim = new Date(edital.encerramentoProposta).getTime();
  if (!Number.isFinite(fim)) return false;

  return agora.getTime() >= fim + dias * 24 * 60 * 60 * 1000;
}

/**
 * A data-limite: decisões de editais que encerraram ANTES disto podem sair.
 *
 * Existe para o SQL poder fazer o corte no banco, com um `where`, em vez de
 * trazer um milhão de linhas para o Node decidir uma a uma. `decisaoExpirou`
 * continua sendo a régua; esta função é a mesma régua escrita de um jeito que o
 * Postgres entende. As duas são testadas juntas para não divergirem.
 */
export function limiteDeRetencao(
  agora: Date,
  dias: number = DIAS_APOS_ENCERRAMENTO,
): Date {
  return new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
}
