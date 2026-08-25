import type { Edital } from "../fontes/tipos.ts";

/**
 * O recorte: uma abrangência geográfica com filtro próprio.
 *
 * ## Por que isto existe, e o que ele NÃO é
 *
 * Hoje a geografia da empresa mora em dois campos soltos do perfil,
 * `ufsAtendidas` e `municipiosPrioritarios`, e o resto do filtro (palavras,
 * ticket, modalidades) vale para tudo ao mesmo tempo. Isso tem dois defeitos.
 *
 * O primeiro é de produto: não dá para dizer "na minha cidade eu quero tudo,
 * porque eu vou de carro; no resto do estado só obra grande, porque só compensa
 * se for". Ou a empresa abre e recebe lixo do interior, ou fecha e perde o que
 * é bom na porta dela.
 *
 * O segundo é de custo, e é o que viabiliza o plano barato. A triagem grava uma
 * linha em `decisoes_de_triagem` para TODO edital avaliado, inclusive o
 * descartado — é assim que o produto consegue responder "por que este edital
 * não apareceu para mim?". Medido em 25/08, essa tabela dá 623 bytes por linha
 * contando índice. Sem limite de abrangência, uma empresa que marca o Brasil
 * inteiro manda avaliar 2.725 editais por dia, o que dá quase 1 milhão de
 * linhas e uns 646 MB por ano. Para UM cliente que paga R$ 59.
 *
 * O recorte é, então, o que decide QUAIS editais chegam a ser avaliados. Ele
 * não substitui o score: dentro do recorte, os critérios de `score.ts`
 * continuam mandando. Recorte controla o tamanho da piscina; score controla a
 * ordem de quem está dentro dela.
 */

/**
 * A abrangência de um recorte.
 *
 * União discriminada e não três campos opcionais: `{ uf: "CE", codigoIbge:
 * null }` deixaria representável o estado impossível de "município sem
 * município", e alguém teria que lembrar de conferir. Aqui o tipo não permite.
 */
export type Abrangencia =
  | { tipo: "municipio"; uf: string; codigoIbge: string; nome: string }
  | { tipo: "uf"; uf: string }
  | { tipo: "brasil" };

export type Recorte = {
  id: string;
  /** O nome que a própria empresa deu. É o que ela lê no e-mail. */
  nome: string;
  abrangencia: Abrangencia;
  /**
   * Palavras que o objeto precisa conter para este recorte.
   *
   * Vazio significa "usa as do perfil", e não "aceita tudo": um recorte sem
   * palavra nenhuma num estado inteiro é a definição de spam. Quem resolve isso
   * é `palavrasEfetivas`, logo abaixo, para a regra morar num lugar só.
   */
  palavrasChave: string[];
  palavrasExcluidas: string[];
  ticketMinimo: number | null;
  ticketMaximo: number | null;
};

/**
 * Quantos recortes cabem numa assinatura.
 *
 * Três é chute informado, e vale dizer isso em voz alta porque ainda não temos
 * cliente para medir.
 *
 * Dois é pouco para o caso mais comum que os dados sugerem: a empresa tem a
 * cidade dela e uma categoria que compensa viajar, e aí não sobra espaço para
 * experimentar um terceiro sem apagar um dos dois.
 *
 * Cinco vira lista de spam. Com cinco, o e-mail diário passa de dezenas de
 * itens e o cliente para de abrir — e alerta não aberto é pior que alerta
 * nenhum, porque ele acha que está coberto.
 *
 * Se os primeiros clientes pedirem um quarto, aumentar é barato. Começar em
 * cinco e ter que reduzir é que seria constrangedor.
 */
export const LIMITE_DE_RECORTES = 3;

/**
 * Quantos editais um recorte entrega por dia, no máximo.
 *
 * O teto vale para TODA abrangência, e isso é uma correção de um erro meu. Eu
 * tinha desenhado o teto só para o recorte "Brasil", com a ideia de que
 * "município" seria naturalmente pequeno. Os números do retrato de 25/08 dizem
 * outra coisa: o município mediano tem menos de um edital novo por dia, mas São
 * Paulo tem uns 120 e Fortaleza uns 46. "Só uma cidade" pode ser São Paulo.
 *
 * Vinte por recorte, com três recortes, dá sessenta itens por dia no pior caso.
 * Já é muito e-mail; é o limite do que uma pessoa lê antes de desistir.
 */
export const TETO_DIARIO_POR_RECORTE = 20;

/**
 * O score mínimo para um edital entrar por um recorte de abrangência nacional.
 *
 * 70 não é número novo: é o piso da faixa "boa" em `score.ts`. Reaproveitar a
 * régua que já existe evita que o produto passe a ter dois conceitos de "bom o
 * bastante" que ninguém consegue explicar na tela.
 *
 * A regra existe porque "Brasil" sem corte é o mesmo que assinar a fila inteira
 * do PNCP: 2.725 editais por dia. Quem quer volume assina por estado; quem
 * marca Brasil está dizendo "me avise se aparecer algo muito bom em qualquer
 * lugar", e é isso que a regra entrega.
 */
export const SCORE_MINIMO_NO_BRASIL = 70;

/** O recorte cobre onde este edital vai ser executado? */
export function abrangenciaAceita(abrangencia: Abrangencia, edital: Edital): boolean {
  switch (abrangencia.tipo) {
    case "brasil":
      return true;
    case "uf":
      return edital.local.uf === abrangencia.uf;
    case "municipio":
      return edital.local.codigoIbge === abrangencia.codigoIbge;
  }
}

/**
 * As palavras que valem para este recorte: as dele, ou as do perfil se ele não
 * declarou nenhuma.
 *
 * Herdar em vez de aceitar tudo é decisão de segurança do cliente, não de
 * economia: um recorte estadual sem palavra nenhuma entregaria merenda escolar
 * para uma empresa de pavimentação, e o cliente concluiria — com razão — que o
 * filtro não funciona.
 */
export function palavrasEfetivas(
  recorte: Pick<Recorte, "palavrasChave">,
  perfil: { palavrasChave: string[] },
): string[] {
  return recorte.palavrasChave.length > 0 ? recorte.palavrasChave : perfil.palavrasChave;
}

export function excluidasEfetivas(
  recorte: Pick<Recorte, "palavrasExcluidas">,
  perfil: { palavrasExcluidas: string[] },
): string[] {
  return recorte.palavrasExcluidas.length > 0
    ? recorte.palavrasExcluidas
    : perfil.palavrasExcluidas;
}

export type FalhaDoRecorte = {
  campo: "nome" | "abrangencia" | "ticket" | "quantidade";
  explicacao: string;
};

/** Uma UF brasileira tem duas letras maiúsculas. Não valida se existe. */
const UF = /^[A-Z]{2}$/u;
/** Código IBGE de município: sete dígitos. */
const IBGE = /^\d{7}$/u;

/**
 * Confere um recorte isolado. Devolve lista vazia quando ele passa.
 *
 * Separado de `conferirConjunto` de propósito: o formulário conserta um recorte
 * por vez, e misturar "este recorte está errado" com "você já tem três" faria a
 * tela mostrar o erro no campo errado.
 */
export function conferirRecorte(recorte: Recorte): FalhaDoRecorte[] {
  const falhas: FalhaDoRecorte[] = [];

  if (recorte.nome.trim().length === 0) {
    falhas.push({
      campo: "nome",
      explicacao: "dê um nome ao recorte: é por ele que você vai reconhecer o alerta no e-mail.",
    });
  }

  const a = recorte.abrangencia;
  if (a.tipo === "uf" && !UF.test(a.uf)) {
    falhas.push({ campo: "abrangencia", explicacao: `"${a.uf}" não é uma sigla de estado.` });
  }
  if (a.tipo === "municipio") {
    if (!UF.test(a.uf)) {
      falhas.push({ campo: "abrangencia", explicacao: `"${a.uf}" não é uma sigla de estado.` });
    }
    if (!IBGE.test(a.codigoIbge)) {
      falhas.push({
        campo: "abrangencia",
        explicacao: "o município precisa do código IBGE de sete dígitos.",
      });
    }
  }

  const { ticketMinimo: min, ticketMaximo: max } = recorte;
  if (min !== null && max !== null && min > max) {
    falhas.push({
      campo: "ticket",
      explicacao: `o valor mínimo (${min}) está acima do máximo (${max}), então nada passaria.`,
    });
  }
  if ((min !== null && min < 0) || (max !== null && max < 0)) {
    falhas.push({ campo: "ticket", explicacao: "valor de contrato não é negativo." });
  }

  return falhas;
}

/**
 * Confere o conjunto de recortes de uma empresa.
 *
 * O limite é cobrado aqui E por uma trava no banco (ver a migração
 * `recortes_da_empresa`). Duplicar não é desleixo: esta função dá a mensagem
 * que a tela mostra, e a trava do banco é o que sobra se alguém chamar a API
 * direto ou se um caminho novo esquecer de validar. Regra de negócio que só
 * mora na tela é regra que a próxima tela não tem.
 */
export function conferirConjunto(recortes: Recorte[]): FalhaDoRecorte[] {
  const falhas: FalhaDoRecorte[] = [];

  if (recortes.length > LIMITE_DE_RECORTES) {
    falhas.push({
      campo: "quantidade",
      explicacao:
        `são ${recortes.length} recortes, e o plano permite ${LIMITE_DE_RECORTES}. ` +
        "Apague um antes de criar outro.",
    });
  }

  // Dois recortes idênticos dobram o custo de avaliação e entregam o mesmo
  // edital duas vezes no mesmo e-mail. Não é erro de digitação inofensivo.
  const vistos = new Set<string>();
  for (const r of recortes) {
    const chave = chaveDaAbrangencia(r.abrangencia);
    if (vistos.has(chave)) {
      falhas.push({
        campo: "abrangencia",
        explicacao: `há dois recortes cobrindo ${descreverAbrangencia(r.abrangencia)}, e o mesmo edital chegaria repetido.`,
      });
    }
    vistos.add(chave);
  }

  return falhas;
}

/** Identidade de uma abrangência, para comparar duas. */
export function chaveDaAbrangencia(a: Abrangencia): string {
  switch (a.tipo) {
    case "brasil":
      return "brasil";
    case "uf":
      return `uf:${a.uf}`;
    case "municipio":
      return `municipio:${a.codigoIbge}`;
  }
}

/** Como a abrangência aparece na tela e no e-mail. */
export function descreverAbrangencia(a: Abrangencia): string {
  switch (a.tipo) {
    case "brasil":
      return "todo o Brasil";
    case "uf":
      return `todo o estado (${a.uf})`;
    case "municipio":
      return `${a.nome} (${a.uf})`;
  }
}
