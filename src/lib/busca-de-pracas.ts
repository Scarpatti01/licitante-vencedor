/**
 * O casador da busca de praças.
 *
 * Vive sozinho, sem importar dado nenhum, porque precisa rodar dos DOIS lados: o
 * servidor monta a lista a partir de `regioes.ts` (que carrega 100 KB de JSON) e
 * o navegador filtra a cada tecla. Se o casador morasse junto do dado, importá-lo
 * no cliente arrastaria o agregado inteiro para o bundle.
 *
 * ## Por que prefixo de palavra, e não "contém"
 *
 * `includes` parece mais generoso e é pior: `"ar"` casaria com Macei**ar**…,
 * Jaboat**ar**…, e com metade da lista por acidente. Nome de lugar se digita do
 * começo — quem procura Fortaleza digita "for", não "leza". Prefixo por PALAVRA
 * (e não só pelo começo do nome inteiro) é o que faz "egito" achar "São José do
 * Egito" e "norte" achar "Juazeiro do Norte".
 *
 * ## O que esta busca cobre, e o que ela não cobre
 *
 * Ela procura entre as praças **medidas e publicáveis** — 96 hoje, das 6 UFs do
 * piloto. Não é uma busca sobre os 5.570 municípios do país, e não é uma busca
 * de editais abertos. Quem digitar "Campinas" não acha nada, e a tela precisa
 * dizer POR QUE não achou em vez de devolver um vazio mudo: um vazio sem
 * explicação faz o visitante concluir que o site está quebrado.
 */

export type PracaBuscavel = {
  nome: string;
  uf: string;
  href: string;
  /** Já normalizado: `"fortaleza ce ceara"`. */
  busca: string;
};

/** Sem acento, minúsculo, sem pontuação — a forma canônica dos dois lados. */
export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Quantos resultados a lista mostra antes de mandar o visitante ao hub.
 *
 * Oito cabe na tela de um celular sem rolar por cima do conteúdo da página. Não
 * é um limite de qualidade: quem quer a lista inteira tem o acordeão em
 * `/portais-de-licitacao/#pracas`, e a tela diz isso quando corta.
 */
export const MAXIMO_DE_SUGESTOES = 8;

/**
 * Uma palavra da consulta casa uma praça?
 *
 * Casa quando alguma palavra do alvo COMEÇA com ela. `"jo"` casa "São **Jo**sé";
 * `"se"` casa "**Se**rgipe" e a sigla "**SE**".
 */
function casaTermo(alvo: string, termo: string): boolean {
  if (alvo.startsWith(termo)) return true;
  return alvo.includes(` ${termo}`);
}

/**
 * A posição do resultado na lista.
 *
 * Menor vem primeiro. Existe porque a ordem por volume, sozinha, produz um
 * resultado ruim no caso mais comum: digitando "sobral", Fortaleza tem mais
 * contratações que Sobral, e sem este critério Sobral apareceria depois de
 * cidades que casaram só pela UF. Quem digita o nome de uma cidade quer aquela
 * cidade em primeiro lugar.
 *
 *   0 — o nome é exatamente a consulta
 *   1 — o nome COMEÇA com a consulta
 *   2 — casou em algum outro ponto (palavra do meio, sigla, nome do estado)
 */
function relevancia(praca: PracaBuscavel, consulta: string): number {
  const nome = normalizarParaBusca(praca.nome);
  if (nome === consulta) return 0;
  if (nome.startsWith(consulta)) return 1;
  return 2;
}

/**
 * As praças que casam com o texto digitado.
 *
 * Consulta vazia devolve lista vazia — e não a lista inteira. Um painel que abre
 * com 96 sugestões antes de a pessoa digitar qualquer coisa é ruído, e o lugar
 * de ver tudo é o acordeão.
 *
 * Todos os termos precisam casar (`"sao jose"` exige as duas palavras), o que
 * torna a busca mais precisa conforme se digita, em vez de mais barulhenta.
 */
export function buscarPracas(
  pracas: readonly PracaBuscavel[],
  texto: string,
  limite: number = MAXIMO_DE_SUGESTOES,
): PracaBuscavel[] {
  const consulta = normalizarParaBusca(texto ?? "");
  if (!consulta) return [];

  const termos = consulta.split(" ").filter(Boolean);

  const casadas = pracas.filter((p) => termos.every((t) => casaTermo(p.busca, t)));

  /*
   * `sort` do JS é estável desde o ES2019, e isto depende disso: dentro da mesma
   * relevância, a ordem preservada é a que veio do servidor — volume de
   * contratações, decrescente. Sem estabilidade, praças empatadas trocariam de
   * posição entre teclas e a lista pareceria nervosa.
   */
  return casadas
    .sort((a, b) => relevancia(a, consulta) - relevancia(b, consulta))
    .slice(0, limite);
}
