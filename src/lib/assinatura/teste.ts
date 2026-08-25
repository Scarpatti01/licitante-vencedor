/**
 * O período de teste: quanto dura, e quando acaba de verdade.
 *
 * ## O buraco que este módulo fecha
 *
 * A tabela `assinaturas` tem `teste_termina_em` e o status `teste` desde o
 * começo. Em 25/08 conferi quem lia essa coluna: **ninguém**. Zero linhas de
 * código em todo o repositório.
 *
 * Isso significa que um "teste de 14 dias" implantado sobre o que existia nunca
 * terminaria. Seria o plano grátis com passos a mais — exatamente o que a
 * decisão de acabar com o alerta gratuito queria eliminar. A coluna dava a
 * impressão de que o mecanismo existia; ela era só a intenção dele.
 *
 * ## Como o acesso é cortado
 *
 * `limite_de_empresas_do_usuario`, no banco, considera viva a assinatura com
 * status `teste`, `ativa` ou `inadimplente`. Mudar o status para `encerrada` é
 * o corte.
 *
 * **Correção escrita no mesmo dia.** Este parágrafo dizia que a consulta do
 * resumo diário usava o mesmo filtro, e que por isso não era preciso mexer em
 * mais nada. Não era verdade: `destinatarias()` devolvia toda empresa com
 * perfil, e só consultava a assinatura para descobrir a profundidade do plano.
 * Eu tinha escrito a minha intenção como se fosse fato, e o efeito seria o
 * teste nunca acabar — o alerta gratuito de volta com outro nome. O portão
 * passou a existir em `assinatura/vivas.ts`, com guarda que roda a decisão em
 * vez de reconhecer o texto do fonte.
 *
 * ## Onde o teste nasce
 *
 * Em `criar_empresa_com_dono`, no banco, na mesma transação da empresa. Uma vez
 * por PESSOA, e não por empresa: a condição olha se existe qualquer assinatura
 * do titular, sem filtrar status. Filtrar por status vivo — que é o que parece
 * natural — daria um teste novo a cada empresa cadastrada por quem já teve o seu
 * encerrado, e teste infinito é o plano grátis de volta.
 *
 * ## `encerrada`, e não `cancelada`
 *
 * `cancelada` é o cliente que decidiu sair. Teste que chegou ao fim não foi
 * cancelado por ninguém: ele acabou. A distinção parece detalhe e não é —
 * `cancelada` numa métrica de churn conta como cliente perdido, e teste que
 * expirou nunca foi cliente.
 */

/**
 * Quantos dias dura o teste.
 *
 * Catorze porque o produto é diário e o valor dele aparece na repetição: sete
 * dias mostram uma semana de editais, e num município pequeno uma semana pode
 * ter zero. Catorze atravessa duas semanas cheias e pega pelo menos um ciclo
 * de publicação em quase toda praça.
 *
 * Não é medição: é a escolha mais defensável sem cliente para medir, e o número
 * mora aqui justamente para ser fácil de mudar quando houver dado.
 */
export const DIAS_DE_TESTE = 14;

/**
 * O plano em que o teste roda.
 *
 * `leve`, e não o mais caro. Duas razões, e a segunda é a que decide.
 *
 * A primeira é custo: o plano que lê o documento gasta IA por edital aberto, e
 * catorze dias disso para qualquer pessoa que preencha um formulário é conta
 * aberta sem cliente do outro lado.
 *
 * A segunda é honestidade do que o teste demonstra. O teste substituiu o alerta
 * gratuito, que era lista sem leitura; abrir o teste no plano de leitura
 * mostraria por catorze dias um produto que, ao virar assinatura de R$ 59, some.
 * Quem experimenta o Leve e assina o Leve recebe exatamente o que viu.
 *
 * O nome do plano está ESCRITO na migração `20260825190000`, e a guarda de
 * `teste.test.ts` confere que os dois lados dizem a mesma coisa — a lição do
 * `leve-escritorio` que o Postgres recusou porque só o TypeScript sabia do
 * hífen.
 */
export const PLANO_DO_TESTE = "leve";

/** Quando termina um teste que começa agora. */
export function terminaEm(inicio: Date, dias: number = DIAS_DE_TESTE): Date {
  return new Date(inicio.getTime() + dias * 24 * 60 * 60 * 1000);
}

/**
 * O teste desta assinatura já acabou?
 *
 * Assinatura sem `testeTerminaEm` NUNCA vence por aqui. É o caso da assinatura
 * paga, que não tem período de teste — e encerrá-la por falta de uma data que
 * ela nunca deveria ter seria cortar o acesso de quem está pagando.
 */
export function testeVenceu(
  assinatura: { status: string; testeTerminaEm: string | null },
  agora: Date,
): boolean {
  if (assinatura.status !== "teste") return false;
  if (assinatura.testeTerminaEm === null) return false;

  const fim = new Date(assinatura.testeTerminaEm).getTime();
  // Data ilegível não encerra nada: destruir acesso por causa de um campo que
  // não dá para ler é o erro mais caro possível neste arquivo.
  if (!Number.isFinite(fim)) return false;

  return agora.getTime() >= fim;
}

/** Quantos dias faltam, para a tela avisar antes de acabar. */
export function diasRestantes(
  assinatura: { status: string; testeTerminaEm: string | null },
  agora: Date,
): number | null {
  if (assinatura.status !== "teste" || assinatura.testeTerminaEm === null) return null;

  const fim = new Date(assinatura.testeTerminaEm).getTime();
  if (!Number.isFinite(fim)) return null;

  const faltam = Math.ceil((fim - agora.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, faltam);
}

/**
 * A partir de quantos dias restantes o produto avisa que o teste vai acabar.
 *
 * Três, e não um: um dia é aviso que chega junto com a perda. Três dão tempo de
 * decidir, de falar com quem paga a conta, e de reclamar se o produto não
 * entregou — que é uma conversa que a gente quer ter antes, não depois.
 */
export const AVISAR_A_PARTIR_DE = 3;

export function precisaAvisar(
  assinatura: { status: string; testeTerminaEm: string | null },
  agora: Date,
): boolean {
  const faltam = diasRestantes(assinatura, agora);
  return faltam !== null && faltam <= AVISAR_A_PARTIR_DE;
}
