/**
 * O post de um edital, congelado no dia em que foi publicado.
 *
 * ## Por que congelado, e não lido do banco na hora
 *
 * Um post é notícia datada. Ele diz "em 15/08 este edital estava aberto, com
 * este prazo e este valor", e essa frase precisa continuar verdadeira daqui a um
 * ano — inclusive depois de o edital sumir do PNCP, o que acontece.
 *
 * Se a página lesse o banco a cada visita, o post mudaria embaixo do leitor: o
 * edital some da fonte e a página quebra, ou o órgão retifica o valor e o texto
 * antigo passa a citar um número que ninguém mais consegue conferir. Congelado,
 * o post é um documento; vivo, ele é uma consulta que finge ser documento.
 *
 * É também o que permite gerar as páginas estaticamente e servi-las sem tocar no
 * banco — o mesmo desenho das páginas regionais, e pelo mesmo motivo.
 *
 * ## O que ele NÃO é
 *
 * Não é a promessa de que o edital está aberto AGORA. As três datas estão todas
 * na página justamente para o leitor saber em que ponto do tempo ele está, e a
 * página se declara encerrada sozinha quando o prazo passa — sem depender de
 * ninguém republicar nada.
 */

import type { AnaliseDoEdital } from "../dominio/tipos.ts";

export type PostDeEdital = {
  /** Parte final da URL: `pregao-eletronico-merenda-escolar-90012-2026`. */
  slug: string;
  /** Chave canônica do edital, para cruzar com o banco quando necessário. */
  editalId: string;

  objeto: string;
  orgao: string;
  modalidade: string;
  /** Em reais, sempre presente — a seleção recusa edital sem valor. */
  valorEstimado: number;
  registroDePrecos: boolean;

  uf: string;
  municipio: string;
  municipioSlug: string;
  codigoIbge: string;

  /** Quando o órgão publicou no PNCP. */
  publicadoEm: string | null;
  /** Quando as propostas encerram. É o que decide se o post está vencido. */
  encerramentoProposta: string;
  /** Quando a nossa coleta viu este edital. */
  coletadoEm: string;
  /** Quando este post foi publicado por nós. */
  postadoEm: string;

  /** Endereço do edital na fonte oficial. */
  link: string;

  /**
   * A leitura do edital, congelada junto do resto.
   *
   * `null` quando não foi possível ler — sem documento legível, sem credencial
   * de IA, ou falha do provedor. **Nunca preenchida com placeholder**: um resumo
   * inventado num post público é o pior defeito que este produto pode ter.
   *
   * Congelada pelo mesmo motivo do resto do post: ela cita trechos do documento
   * que estava publicado naquele dia. Se o órgão retificar o edital depois, a
   * análise antiga continua descrevendo com fidelidade o que foi lido — e a
   * página diz a data em que foi lido.
   */
  analise?: AnaliseDoEdital | null;

  /**
   * Quantos documentos do edital foram lidos para produzir a análise.
   *
   * Vai para a página porque muda o peso do que se lê: uma leitura sobre 8
   * documentos e 300 páginas não é a mesma coisa que uma sobre o aviso de
   * publicação. `0` significa que a análise saiu só dos metadados.
   */
  documentosLidos?: number;
};

/** Um dia de publicação, como fica no arquivo versionado. */
export type LevaDoDia = {
  /** `2026-08-15`. */
  dia: string;
  /** Quantos editais havia no conjunto de onde estes saíram. */
  consideradosNoDia: number;
  posts: PostDeEdital[];
};

/**
 * O instante contra o qual a página é avaliada.
 *
 * Existe para a página ler o relógio **uma vez só**. Antes, cada verificação
 * chamava `Date.now()` por conta própria, e o lint do React reclamou com razão:
 * chamada impura dentro do corpo de renderização. A reclamação apontou um
 * problema maior que o estilo — duas leituras separadas podem cair em lados
 * diferentes do mesmo segundo, e a página diria "encerrado" num bloco e "ainda
 * dá para impugnar" no outro.
 *
 * Um instante só, no topo, e todo o resto derivado dele.
 */
export function instanteDaPagina(): Date {
  return new Date();
}

/**
 * O post já encerrou?
 *
 * Calculado na renderização, e não gravado: gravar "encerrado: false" tornaria o
 * arquivo falso no dia seguinte, e obrigaria a reescrever posts antigos todo dia
 * só para atualizar um booleano que a data já responde.
 */
export function encerrado(post: PostDeEdital, agora: Date = instanteDaPagina()): boolean {
  return new Date(post.encerramentoProposta).getTime() <= agora.getTime();
}

/**
 * Até quando ainda cabia impugnar.
 *
 * O art. 164 da Lei 14.133 dá até **3 dias úteis** antes da data de abertura.
 * Este cálculo usa dias corridos e por isso é uma **aproximação para menos** —
 * ele nunca promete mais prazo do que existe, e a página diz que o cálculo é
 * aproximado e que o edital prevalece.
 *
 * Preferimos o número conservador a um cálculo de dias úteis que precisaria de
 * calendário de feriados municipais que não temos.
 */
export function limiteAproximadoDeImpugnacao(post: PostDeEdital): Date {
  const fim = new Date(post.encerramentoProposta).getTime();
  return new Date(fim - 3 * 86_400_000);
}
