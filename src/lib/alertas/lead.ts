import type { Edital } from "../fontes/tipos";
import { diasAteEncerrar } from "../pncp/normaliza.ts";
import { localCasaComRegiao, type Regiao } from "./regiao.ts";

/**
 * O que entra no alerta diário de um lead — e o que fica de fora.
 *
 * Existe separado de `selecao.ts` porque as duas seleções decidem sobre coisas
 * diferentes, e juntá-las obrigaria uma delas a mentir. `selecao.ts` recebe
 * `ResumoDaOportunidade`: edital JÁ cruzado com o perfil de uma empresa, com
 * score, checklist e situação. Um lead não tem nada disso — ele deu um e-mail e
 * uma cidade. Não há score para filtrar, não há "salva" para lembrar, não há
 * perfil para dizer que a empresa não atende àquele objeto.
 *
 * O que sobra é geografia e prazo, e é honesto que sobre: o alerta gratuito
 * promete "os editais da sua região", não "os editais para a sua empresa". A
 * segunda promessa é o produto pago, e cumpri-la exige o perfil que o lead não
 * preencheu.
 *
 * ## O contrato que o e-mail de boas-vindas já assinou
 *
 * `conteudoDeBoasVindas` diz, com todas as letras, que o alerta chega nos dias
 * úteis pela manhã e que **quando não houver publicação nova, não há e-mail**.
 * Isso não é preferência de implementação: é promessa feita a quem confirmou o
 * cadastro. Por isso `vazio` é um resultado de primeira classe aqui, e quem
 * chama tem de tratá-lo como "não envie" — nunca como "envie dizendo que não há
 * nada".
 */

export type ItemDoAlertaDeLead = {
  edital: Edital;
  /** Dias até o encerramento na data do envio. `null` quando a fonte não informou. */
  diasParaEncerrar: number | null;
};

export type SelecaoParaLead = {
  itens: ItemDoAlertaDeLead[];
  /**
   * Quantos editais da região ficaram de fora por causa do teto.
   *
   * Vai para o rodapé do e-mail. Um alerta que mostra 5 de 23 sem dizer que são
   * 23 parece um alerta que só achou 5 — e a pessoa conclui que a região dela é
   * fraca, quando na verdade o que ela viu foi o topo de uma lista cortada.
   */
  excedentes: number;
  vazio: boolean;
};

export type PreferenciasDoLead = {
  /** Teto de editais por e-mail. */
  maximoPorEnvio: number;
  /**
   * Não alertar sobre certame que encerra em menos de X dias.
   *
   * Zero por padrão — encerra hoje ainda é acionável para quem já tem a
   * documentação pronta, e cortar isso seria decidir pela pessoa. O parâmetro
   * existe porque um dia alguém vai querer "só o que dá para preparar".
   */
  minimoDeDias: number;
};

export const PREFERENCIAS_DO_LEAD: PreferenciasDoLead = {
  // Cinco é o mesmo teto do alerta do produto pago, e pelo mesmo motivo: acima
  // disso o e-mail vira lista, lista vira rolagem, e rolagem vira arquivo.
  maximoPorEnvio: 5,
  minimoDeDias: 0,
};

/**
 * Escolhe os editais que este lead recebe hoje.
 *
 * `jaEnviados` são os ids que já foram para este endereço em qualquer envio
 * anterior. É o parâmetro que impede o pior defeito possível num alerta diário:
 * repetir o mesmo edital todo dia até ele encerrar. Um edital publicado hoje
 * continua aberto amanhã, então SEM esta exclusão a segunda mensagem seria
 * quase idêntica à primeira, e a terceira idêntica à segunda — o jeito mais
 * rápido conhecido de ensinar alguém a ignorar um remetente.
 *
 * A ordenação é por prazo mais curto primeiro, e não por valor. Valor alto
 * chama atenção, mas quem decide o que a pessoa consegue fazer alguma coisa a
 * respeito é o relógio: o edital de R$ 2 milhões que encerra em 30 dias volta
 * amanhã e depois; o de R$ 40 mil que encerra em 2 dias não volta.
 */
export function selecionarParaLead(
  editais: Edital[],
  regiao: Regiao,
  jaEnviados: ReadonlySet<string>,
  preferencias: PreferenciasDoLead = PREFERENCIAS_DO_LEAD,
  agora: Date = new Date(),
): SelecaoParaLead {
  const candidatos: ItemDoAlertaDeLead[] = [];

  for (const edital of editais) {
    if (!localCasaComRegiao(edital.local, regiao)) continue;
    if (jaEnviados.has(edital.id)) continue;

    const dias = diasAteEncerrar(edital, agora);

    // Encerrado não vira alerta em hipótese nenhuma — a mesma regra do alerta
    // pago, pelo mesmo motivo: avisar sobre certame que já passou é o e-mail
    // mais irritante que este produto poderia mandar.
    if (dias !== null && dias < 0) continue;
    if (dias !== null && dias < preferencias.minimoDeDias) continue;

    candidatos.push({ edital, diasParaEncerrar: dias });
  }

  candidatos.sort(ordenar);

  const itens = candidatos.slice(0, preferencias.maximoPorEnvio);

  return {
    itens,
    excedentes: candidatos.length - itens.length,
    vazio: itens.length === 0,
  };
}

/**
 * Prazo mais curto primeiro; sem prazo, por último.
 *
 * Edital sem data de encerramento existe (a fonte publica registro incompleto), e
 * ele não pode encabeçar a lista: "não sabemos quando encerra" é a informação
 * menos acionável do conjunto. Empate de prazo desempata por valor, maior
 * primeiro — entre dois certames que encerram no mesmo dia, o maior é o que
 * merece o clique primeiro. Valor suspeito não desempata nada: um erro de
 * digitação do órgão não pode decidir a ordem do e-mail de ninguém.
 */
function ordenar(a: ItemDoAlertaDeLead, b: ItemDoAlertaDeLead): number {
  if (a.diasParaEncerrar === null && b.diasParaEncerrar === null) return 0;
  if (a.diasParaEncerrar === null) return 1;
  if (b.diasParaEncerrar === null) return -1;
  if (a.diasParaEncerrar !== b.diasParaEncerrar) return a.diasParaEncerrar - b.diasParaEncerrar;

  const valorA = a.edital.valorSuspeito ? null : a.edital.valorEstimado;
  const valorB = b.edital.valorSuspeito ? null : b.edital.valorEstimado;
  if (valorA === valorB) return 0;
  if (valorA === null) return 1;
  if (valorB === null) return -1;
  return valorB - valorA;
}
