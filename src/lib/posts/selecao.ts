/**
 * Quais editais do dia viram post.
 *
 * ## O problema que esta função resolve
 *
 * A coleta traz milhares de editais por dia — 3.445 nas 6 UFs de hoje, 28.912 se
 * o Brasil inteiro for varrido. Transformar cada um num post produziria, em um
 * mês, dezenas de milhares de páginas quase idênticas.
 *
 * Isso é o mesmo erro que o portão de `regioes.ts` já evitou uma vez, e o
 * comentário de lá diz por quê: conteúdo raso e repetido **não é neutro** — ele
 * dilui a autoridade dos guias, e o custo cai sobre as páginas que convertem. Em
 * escala de dezenas de milhares, deixa de ser diluição e vira o que os
 * buscadores tratam como abuso de conteúdo gerado em massa.
 *
 * Então a torneira é estreita de propósito: um punhado por dia, escolhidos, cada
 * um com a leitura completa que o PNCP não tem. **O que justifica o post não é o
 * edital — é a nossa leitura dele.** Sem ela, a página seria uma cópia da fonte
 * oficial, que sempre vai ranquear melhor que a cópia.
 *
 * ## Por que a seleção é uma função pura
 *
 * Ela decide o que o site publica. Sendo pura e testada, dá para exercitar as
 * regras contra casos reais da coleta sem rede, sem banco e sem publicar nada —
 * e dá para responder "por que este edital virou post e aquele não" com um
 * teste, e não com uma opinião.
 */

import type { Edital } from "../fontes/tipos.ts";
import { categoriaDoObjeto, pesoDaDemanda } from "./demanda.ts";

/**
 * Quantos posts por dia, no padrão.
 *
 * **Cinco, e não 25, desde 26/08.** Decisão do dono, e a pesquisa que a
 * acompanhou explica por que ela não é só economia.
 *
 * Vinte e cinco por dia custavam entre US$ 2,96 e US$ 5,73 por dia de leitura de
 * IA — a maior linha da conta depois que a leitura de cliente passou a respeitar
 * o plano. E não havia evidência de retorno: para consulta de edital por cidade,
 * quem ocupa os primeiros lugares é o portal do próprio órgão e a página-âncora
 * do concorrente por praça. Página de UM edital, de agregador nenhum, aparece.
 * Ver `demanda.ts`, que carrega a pesquisa inteira.
 *
 * Cinco por dia é o que mantém a prova pública de que a leitura existe — que é
 * o que a página do município tem para mostrar — sem financiar volume que não
 * traz ninguém. São ~150 páginas por mês em vez de 750.
 */
export const POSTS_POR_DIA = 5;

/**
 * Objeto curto demais não vira post.
 *
 * Medido na coleta real: existem editais cujo objeto declarado é `"COPA E
 * COZINHA"` ou `"dfd 160 2026"` — o próprio revisor da coleta já os marca como
 * curtos demais para dizer o que está sendo comprado. Um post sobre isso não
 * teria o que analisar, e seria exatamente a página rasa que queremos evitar.
 *
 * 60 caracteres é onde a amostra separa "descrição" de "sigla interna do órgão".
 */
export const MINIMO_DO_OBJETO = 60;

/**
 * Dias mínimos de prazo restante no momento da publicação.
 *
 * Um post sobre edital que encerra amanhã nasce inútil: quem ler já não
 * consegue reunir documentação nem impugnar. Três dias úteis é o prazo do art.
 * 164 da Lei 14.133 para impugnação, e é o piso do que torna a leitura
 * acionável — abaixo disso o post vira arquivo no mesmo dia em que sai.
 */
export const DIAS_MINIMOS_DE_PRAZO = 3;

/**
 * Teto por município numa mesma leva.
 *
 * Sem ele, um dia em que Fortaleza publica 40 editais produziria 25 posts todos
 * de Fortaleza — e o leitor de Sergipe abre o site e não encontra nada dele. A
 * diversidade não é enfeite editorial: ela é o que faz as páginas regionais de
 * praças menores existirem com conteúdo próprio.
 */
export const MAXIMO_POR_MUNICIPIO = 3;

/** Teto por órgão, pela mesma razão — uma prefeitura não pauta o dia inteiro. */
export const MAXIMO_POR_ORGAO = 2;

/**
 * Teto por categoria de compra.
 *
 * Nasceu junto com a ordenação por demanda, e existe por causa dela: sem este
 * teto, "Alimentação escolar" tem o maior peso da tabela e levaria a leva
 * inteira todo dia, porque toda prefeitura do país compra merenda toda semana.
 * O leitor abriria o site cinco dias seguidos e veria vinte e cinco posts de
 * gêneros alimentícios.
 *
 * Dois de cinco deixa a categoria mais buscada liderar sem monopolizar, e
 * garante pelo menos três assuntos diferentes por dia. Com a torneira em 25 o
 * problema não aparecia, porque havia espaço para todo mundo — foi fechar para
 * cinco que o criou.
 */
export const MAXIMO_POR_CATEGORIA = 2;

export type Criterios = {
  /** Quantos selecionar. */
  limite?: number;
  /** O instante da publicação, para medir o prazo restante. */
  agora?: Date;
};

/** Por que um edital ficou de fora. Existe para a decisão ser auditável. */
export type Recusa =
  | "objeto-curto-demais"
  | "sem-prazo"
  | "prazo-curto-demais"
  | "sem-valor-informado"
  | "cota-do-municipio"
  | "cota-do-orgao"
  | "cota-da-categoria"
  | "fora-do-limite";

export type Selecao = {
  escolhidos: Edital[];
  /** Contagem por motivo, para o script dizer o que descartou e por quê. */
  recusas: Record<string, number>;
};

const DIA = 86_400_000;

function diasAte(iso: string | null, agora: Date): number | null {
  if (!iso) return null;
  const alvo = new Date(iso).getTime();
  if (!Number.isFinite(alvo)) return null;
  return (alvo - agora.getTime()) / DIA;
}

/**
 * O edital tem lastro para virar post?
 *
 * Separado da seleção para o teste exercitar as bordas sem montar uma lista
 * inteira, e para o motivo da recusa ser nomeado em vez de inferido.
 */
export function motivoDaRecusa(
  edital: Edital,
  agora: Date,
): Extract<Recusa, "objeto-curto-demais" | "sem-prazo" | "prazo-curto-demais" | "sem-valor-informado"> | null {
  if (edital.objeto.trim().length < MINIMO_DO_OBJETO) return "objeto-curto-demais";

  const dias = diasAte(edital.encerramentoProposta, agora);
  if (dias === null) return "sem-prazo";
  if (dias < DIAS_MINIMOS_DE_PRAZO) return "prazo-curto-demais";

  /*
   * Sem valor estimado, o post perde metade do que o leitor procura — "cabe no
   * meu porte?" é a primeira pergunta de quem decide participar. 86% dos editais
   * trazem o campo, então exigi-lo custa pouca cobertura e melhora muito a
   * página.
   */
  if (edital.valorEstimado === null || edital.valorEstimado <= 0) {
    return "sem-valor-informado";
  }

  return null;
}

/**
 * A leva do dia.
 *
 * ## A ordem mudou em 26/08: DEMANDA primeiro, prazo depois
 *
 * Era só prazo, entre os acionáveis, e o argumento continua válido pela metade:
 * prazo primeiro faz o post chegar enquanto ainda dá para participar, que é o
 * valor de quem já está lendo. O que faltava era a outra metade — prazo não é
 * assunto que ninguém procura, então ordenar só por ele publica sem nunca
 * perguntar quem viria.
 *
 * Agora a ordem é o peso de `demanda.ts` primeiro, e o prazo desempata. Com a
 * torneira em cinco por dia isso deixou de ser detalhe: escolher cinco entre
 * milhares é uma decisão editorial de verdade, e "os cinco que fecham antes" não
 * é uma.
 *
 * O que NÃO mudou: nada entra sem ser acionável. Um edital de merenda com peso
 * 10 e prazo de dois dias continua recusado por `prazo-curto-demais`, porque
 * post que nasce vencido não serve a leitor nenhum, procurado ou não.
 *
 * Não é por valor, e isso segue firme: um edital bilionário de obra interessa a
 * pouquíssimas empresas, enquanto o de R$ 80 mil de material escolar interessa a
 * muitas — e o site existe para PMEs.
 */
export function selecionarDoDia(
  editais: readonly Edital[],
  { limite = POSTS_POR_DIA, agora = new Date() }: Criterios = {},
): Selecao {
  const recusas: Record<string, number> = {};
  const conta = (motivo: Recusa) => {
    recusas[motivo] = (recusas[motivo] ?? 0) + 1;
  };

  const elegiveis: Edital[] = [];
  for (const edital of editais) {
    const motivo = motivoDaRecusa(edital, agora);
    if (motivo) conta(motivo);
    else elegiveis.push(edital);
  }

  /*
   * Demanda primeiro, prazo desempatando, id desempatando o desempate.
   *
   * O `id` no fim não é enfeite: sem ele, dois editais com o mesmo peso e o
   * mesmo prazo trocariam de lugar entre execuções conforme a ordem que a
   * coleta devolveu, e a mesma entrada daria levas diferentes. Um teste cobra
   * exatamente isso.
   */
  const ordenados = [...elegiveis].sort((a, b) => {
    const da = pesoDaDemanda(b) - pesoDaDemanda(a);
    if (da !== 0) return da;

    const pa = a.encerramentoProposta ?? "";
    const pb = b.encerramentoProposta ?? "";
    return pa.localeCompare(pb) || a.id.localeCompare(b.id);
  });

  const escolhidos: Edital[] = [];
  const porMunicipio = new Map<string, number>();
  const porOrgao = new Map<string, number>();
  const porCategoria = new Map<string, number>();

  for (const edital of ordenados) {
    if (escolhidos.length >= limite) {
      conta("fora-do-limite");
      continue;
    }

    const chaveMunicipio = `${edital.local.uf}/${edital.local.municipioSlug}`;
    if ((porMunicipio.get(chaveMunicipio) ?? 0) >= MAXIMO_POR_MUNICIPIO) {
      conta("cota-do-municipio");
      continue;
    }

    const chaveOrgao = edital.orgao.cnpj || edital.orgao.nome;
    if ((porOrgao.get(chaveOrgao) ?? 0) >= MAXIMO_POR_ORGAO) {
      conta("cota-do-orgao");
      continue;
    }

    /*
     * A cota de categoria vale só para quem TEM categoria.
     *
     * Os sem classificação — 36% da amostra de 26/08 — não competem entre si por
     * uma vaga: eles não são um assunto, são a ausência de um. Contá-los juntos
     * limitaria a três por dia um grupo que na verdade é uma dúzia de nichos
     * diferentes, e justamente os nichos que o concorrente não cobre.
     */
    const categoria = categoriaDoObjeto(edital.objeto);
    if (categoria && (porCategoria.get(categoria.nome) ?? 0) >= MAXIMO_POR_CATEGORIA) {
      conta("cota-da-categoria");
      continue;
    }

    escolhidos.push(edital);
    porMunicipio.set(chaveMunicipio, (porMunicipio.get(chaveMunicipio) ?? 0) + 1);
    porOrgao.set(chaveOrgao, (porOrgao.get(chaveOrgao) ?? 0) + 1);
    if (categoria) porCategoria.set(categoria.nome, (porCategoria.get(categoria.nome) ?? 0) + 1);
  }

  return { escolhidos, recusas };
}
