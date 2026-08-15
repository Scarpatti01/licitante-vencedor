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

/** Quantos posts por dia, no padrão. */
export const POSTS_POR_DIA = 25;

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
 * A ordem de escolha é por **prazo mais próximo primeiro**, entre os que ainda
 * são acionáveis. Não é por valor: um edital bilionário de obra interessa a
 * pouquíssimas empresas, enquanto o de R$ 80 mil de material escolar interessa a
 * muitas — e o site existe para PMEs. Prazo primeiro também é o que faz o post
 * chegar enquanto ainda dá para participar, que é o valor que o leitor tira dele.
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

  // Prazo mais próximo primeiro; empate desfeito pelo id, para a seleção do
  // mesmo conjunto dar sempre o mesmo resultado entre execuções.
  const ordenados = [...elegiveis].sort((a, b) => {
    const pa = a.encerramentoProposta ?? "";
    const pb = b.encerramentoProposta ?? "";
    return pa.localeCompare(pb) || a.id.localeCompare(b.id);
  });

  const escolhidos: Edital[] = [];
  const porMunicipio = new Map<string, number>();
  const porOrgao = new Map<string, number>();

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

    escolhidos.push(edital);
    porMunicipio.set(chaveMunicipio, (porMunicipio.get(chaveMunicipio) ?? 0) + 1);
    porOrgao.set(chaveOrgao, (porOrgao.get(chaveOrgao) ?? 0) + 1);
  }

  return { escolhidos, recusas };
}
