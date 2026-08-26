import { categoriaDoObjeto } from "../posts/demanda.ts";

/**
 * O que uma praça está comprando, e como.
 *
 * ## Por que este perfil é calculado na COLETA, e não na página
 *
 * A página de UF tem em mãos dois números muito diferentes: a contagem real de
 * abertos naquele estado (733 em Pernambuco, na coleta de 26/08) e uma AMOSTRA
 * de 40 editais, que é o que cabe no arquivo versionado.
 *
 * Montar a distribuição por categoria a partir dos 40 e apresentá-la como o
 * perfil do estado seria overclaim do tipo que este projeto já pune em outros
 * lugares: "o que Pernambuco compra" derivado de 5% dos editais, com a precisão
 * de um número exato. O leitor não tem como saber que a base era uma amostra, e
 * a página não teria como avisar sem se desmentir.
 *
 * Então a conta é feita na coleta, sobre TODOS os editais abertos da UF, e só o
 * resultado vai para o arquivo. São duas dezenas de linhas por UF, contra as
 * centenas de editais que não cabem — e o número que a página mostra passa a ser
 * o número de verdade.
 *
 * ## O que isto tem que o concorrente não tem
 *
 * A página que hoje ganha a busca "licitações em São Paulo" cita "4.748
 * processos abertos" com data de 11/08 e nada mais: nenhuma quebra por tipo de
 * compra, nenhuma por modalidade. Não é desleixo deles — é que a quebra exige
 * coletar o país inteiro todo dia, que é justamente o que este projeto faz de
 * madrugada e ninguém mais faz de graça.
 */

/** Uma linha da quebra: o rótulo e quantos editais abertos ele tem. */
export type FatiaDaUf = {
  rotulo: string;
  quantidade: number;
};

export type PerfilDaUf = {
  /** O que está sendo comprado, por categoria de `posts/demanda.ts`. */
  porCategoria: FatiaDaUf[];
  /** Como está sendo comprado. */
  porModalidade: FatiaDaUf[];
};

/**
 * O rótulo de quem não casa com nenhuma categoria.
 *
 * "Outros" e não a omissão da linha: some-los faria as porcentagens não fecharem
 * e o leitor conferir a conta antes de confiar no resto. Em 26/08 eles eram 36%
 * da amostra nacional, ou seja, a maior fatia isolada — esconder a maior fatia
 * seria o pior lugar para começar a arredondar a verdade.
 */
export const OUTROS = "Outros";

/**
 * Quantos aparecem na quebra por categoria, fora "Outros".
 *
 * Seis cabe numa tabela sem rolagem no celular, e a cauda de categorias com um
 * ou dois editais não diz nada ao leitor. O que sobra é somado em "Outros", que
 * já existe por outro motivo.
 */
export const CATEGORIAS_NA_TABELA = 6;

/** Quantas modalidades aparecem. A cauda aqui é ainda mais curta: são sete no total. */
export const MODALIDADES_NA_TABELA = 5;

function contar(valores: readonly string[]): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const valor of valores) contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
  return contagem;
}

/**
 * Ordena por quantidade e corta a cauda em "Outros".
 *
 * O desempate é pelo rótulo, e não é preciosismo: sem ele, duas categorias com a
 * mesma contagem trocam de lugar entre coletas e o `git diff` do arquivo
 * versionado fica cheio de mudança que não é mudança.
 */
function maioresPrimeiro(contagem: Map<string, number>, teto: number): FatiaDaUf[] {
  const todas = [...contagem.entries()]
    .map(([rotulo, quantidade]) => ({ rotulo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  const dentro = todas.filter((f) => f.rotulo !== OUTROS).slice(0, teto);
  const restante = todas
    .filter((f) => !dentro.includes(f))
    .reduce((soma, f) => soma + f.quantidade, 0);

  return restante > 0 ? [...dentro, { rotulo: OUTROS, quantidade: restante }] : dentro;
}

/** O perfil de uma praça, calculado sobre TODOS os editais abertos dela. */
export function perfilDaUf(
  editais: readonly { objeto: string; modalidade: string }[],
): PerfilDaUf {
  const categorias = contar(
    editais.map((e) => categoriaDoObjeto(e.objeto)?.nome ?? OUTROS),
  );
  const modalidades = contar(
    // Modalidade em branco existe no PNCP e viraria uma fatia sem nome na
    // tabela, que é pior do que uma fatia chamada "Outros".
    editais.map((e) => (e.modalidade.trim() ? e.modalidade.trim() : OUTROS)),
  );

  return {
    porCategoria: maioresPrimeiro(categorias, CATEGORIAS_NA_TABELA),
    porModalidade: maioresPrimeiro(modalidades, MODALIDADES_NA_TABELA),
  };
}

/**
 * A porcentagem de uma fatia, para a tabela.
 *
 * Arredondada para inteiro, e o total vem de fora: somar as fatias daria o total
 * da TABELA, não o do estado, e as duas coisas divergem sempre que houve corte
 * de cauda. Um leitor que soma as porcentagens e acha 100% quando a página diz
 * 733 abertos está sendo enganado por arredondamento.
 */
export function percentual(quantidade: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((quantidade / total) * 100);
}
