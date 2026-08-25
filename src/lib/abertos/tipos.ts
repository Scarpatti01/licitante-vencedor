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
  /** Os que encerram primeiro no país inteiro. */
  encerrandoAgora: EditalAberto[];
};

/**
 * Quantos editais cada página mostra.
 *
 * Não é a lista inteira de propósito: são 28.995 abertos, e versionar isso
 * diariamente encheria o repositório de megabytes para entregar uma página que
 * ninguém rola até o fim. O que a listagem faz é provar que o dado existe e é
 * fresco; quem precisa do recorte dele assina.
 */
export const EDITAIS_POR_UF = 20;
export const EDITAIS_NO_BRASIL = 30;

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
