/**
 * O retrato dos editais abertos, do jeito que ele é gravado e lido.
 *
 * ## A decisão que este arquivo carrega
 *
 * As páginas de município (`/licitacoes/uf/municipio/`) recusam, por decisão
 * documentada lá, listar "editais abertos": o agregado é um retrato do instante
 * da coleta, e edital tem prazo — publicar "34 abertos em Recife" a partir de
 * um arquivo de dois dias afirmaria como presente o que já encerrou.
 *
 * Aqui a listagem existe, e o que mudou não foi a régua: foi o dado. Este
 * retrato é regravado a cada coleta, e cada item carrega o próprio prazo, para
 * a página poder marcar no relógio de QUEM LÊ o que já encerrou desde a última
 * coleta. Medido em 25/08: 2.923 editais encerram a cada 24 horas, uns 120 por
 * hora. Sem essa marcação, a página estaria errada sobre uns 10% do que mostra
 * ao fim de um dia — e seria errada em silêncio, que é o pior jeito.
 *
 * ## Por que "últimas 24 horas" e não "hoje"
 *
 * A coleta roda às 03:10 de Brasília. "Publicados hoje" medido nesse horário
 * conta três horas de dia e devolve quase zero — número que parece defeito. As
 * últimas 24 horas medem a mesma coisa que a pergunta quer dizer ("o que
 * apareceu desde a última vez que olhei") e não dependem da hora em que o
 * retrato foi tirado. Medido em 25/08: 2.729 nas últimas 24h contra 146 "hoje".
 */

/** Um edital na listagem. Recorte do `Edital`, só o que a página mostra. */
export type EditalAberto = {
  id: string;
  objeto: string;
  orgao: string;
  uf: string;
  municipio: string;
  municipioSlug: string;
  modalidade: string;
  /** `null` quando o órgão não informou, ou quando o valor é implausível. */
  valorEstimado: number | null;
  publicadoEm: string | null;
  /** ISO 8601. É o que permite marcar "encerrado" no relógio do leitor. */
  encerramentoProposta: string;
  link: string;
};

export type ContagemDeAbertos = {
  abertos: number;
  /** Publicados nas últimas 24 horas — ver o comentário do topo. */
  novos: number;
  /** Encerram nas próximas 24 horas: o que some do retrato antes da coleta seguinte. */
  encerramEm24h: number;
};

export type UfAberta = ContagemDeAbertos & {
  uf: string;
  /** Uma amostra ordenada por encerramento mais próximo, não a lista inteira. */
  editais: EditalAberto[];
};

export type RetratoDeAbertos = {
  /** ISO 8601. A hora do retrato, que a página é obrigada a mostrar. */
  coletadoEm: string;
  totais: ContagemDeAbertos;
  ufs: UfAberta[];
  /**
   * A lista nacional: os que continuam abertos por toda a vida deste retrato,
   * do prazo mais próximo ao mais distante.
   *
   * Não se chama mais `encerrandoAgora`, e o nome importa: o nome antigo
   * descrevia o defeito. Uma lista dos que encerram agora é, algumas horas
   * depois, uma lista dos que já encerraram.
   */
  abertos: EditalAberto[];
};

/**
 * Quantos editais cada página mostra.
 *
 * Não é a lista inteira de propósito: são quase 29 mil abertos, e versionar
 * isso diariamente encheria o repositório de megabytes para entregar uma página
 * que ninguém rola até o fim. O que a listagem faz é provar que o dado existe e
 * é fresco; quem precisa do recorte dele assina.
 */
export const EDITAIS_POR_UF = 40;
export const EDITAIS_NO_BRASIL = 100;

/**
 * Só entra na lista quem continua aberto até a próxima coleta.
 *
 * ## O defeito que isto conserta, e ele era de desenho
 *
 * A primeira versão ordenava por "os que encerram primeiro", que parecia a
 * ordem óbvia — o mais urgente no topo. É a pior possível para uma página que
 * vive 24 horas: ela põe no topo justamente os que morrem primeiro. Nasceu boa
 * às 3h da manhã e, ao meio-dia, o dono abriu e viu **a lista inteira
 * encerrada**. A marcação de encerrado funcionou; errado era o que a lista
 * escolhia mostrar.
 *
 * A régua agora é o tempo de vida da própria página: um edital só entra se
 * ainda estiver aberto quando a coleta seguinte substituir este retrato. Assim
 * nenhum item vence enquanto a página está no ar — não por sorte, por
 * construção.
 *
 * A margem é maior que as 24 horas entre coletas de propósito. Coleta atrasa,
 * falha, é recusada por degradação; nesses dias o retrato de ontem continua
 * servindo, e as duas horas extras são o que impede a lista de começar a
 * apodrecer no exato momento em que ninguém está olhando.
 *
 * A marcação no relógio do leitor continua existindo, e continua sendo
 * necessária: ela é a rede embaixo desta regra, para o dia em que a coleta
 * ficar dois dias fora.
 */
export const MARGEM_DE_VALIDADE_MS = 26 * 60 * 60 * 1000;

/** O edital sobrevive ao tempo de vida deste retrato? */
export function sobreviveAoRetrato(
  edital: { encerramentoProposta: string },
  coletadoEm: Date,
): boolean {
  const fim = new Date(edital.encerramentoProposta).getTime();
  return fim > coletadoEm.getTime() + MARGEM_DE_VALIDADE_MS;
}

/**
 * O edital já encerrou, no relógio de quem está lendo?
 *
 * Calculado na leitura e nunca gravado. Gravar `encerrado: false` tornaria o
 * arquivo falso na hora seguinte — mesma razão de `posts/tipos.ts`.
 */
export function jaEncerrou(edital: EditalAberto, agora: Date): boolean {
  return new Date(edital.encerramentoProposta).getTime() <= agora.getTime();
}

/** Quantos itens do retrato já encerraram desde que ele foi tirado. */
export function quantosEncerraram(editais: readonly EditalAberto[], agora: Date): number {
  return editais.filter((e) => jaEncerrou(e, agora)).length;
}
