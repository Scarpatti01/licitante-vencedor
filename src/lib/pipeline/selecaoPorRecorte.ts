import type { Edital } from "../fontes/tipos.ts";
import { termosEncontrados } from "../dominio/texto.ts";
import {
  abrangenciaAceita,
  excluidasEfetivas,
  palavrasEfetivas,
  SCORE_MINIMO_NO_BRASIL,
  TETO_DIARIO_POR_RECORTE,
  type Recorte,
} from "../dominio/recorte.ts";

/**
 * Quais editais o recorte manda avaliar, e quais ele entrega.
 *
 * ## Onde o recorte corta, e por que o lugar importa
 *
 * A triagem grava uma linha em `decisoes_de_triagem` para TODO edital
 * avaliado, inclusive o descartado — é assim que o produto responde "por que
 * este edital não apareceu para mim?". Isso significa que **filtrar depois de
 * pontuar não economiza nada**: a linha já foi escrita, e o custo já foi pago.
 *
 * Então o recorte corta ANTES, e o corte tem dois estágios com finalidades
 * diferentes:
 *
 *   1. `paraAvaliar` decide o que chega a ser pontuado. É o que controla o
 *      CUSTO de armazenamento, e é o que faz o plano de R$ 59 fechar a conta.
 *   2. `entregaveis` decide o que vai para a tela e para o e-mail, depois de
 *      pontuado. É o que controla a ATENÇÃO do cliente.
 *
 * Confundir os dois é fácil e caro. Um teto diário aplicado só na entrega deixa
 * a conta de armazenamento exatamente como estava.
 *
 * ## A troca que o corte de custo obriga, dita em voz alta
 *
 * Todo edital que não é avaliado é um edital sobre o qual não sabemos
 * responder "por que não apareceu". Guardar a resposta custa 623 bytes; não
 * guardar custa uma pergunta sem resposta no suporte. A régua abaixo escolhe
 * lado conforme o tamanho da geografia, e isso é decisão consciente:
 *
 *   município e UF → avalia TUDO que está dentro. São de 1 a 514 editais por
 *   dia, cabem no orçamento, e é onde o cliente mais pergunta, porque é o
 *   território que ele conhece de cor.
 *
 *   Brasil → exige que o objeto case com as palavras do recorte ANTES de
 *   pontuar. Sem isso são 2.725 editais por dia, quase 1 milhão de linhas e uns
 *   646 MB por ano para UM cliente. E a exigência não é arbitrária: quem marca
 *   "Brasil" está dizendo "me avise se aparecer algo muito bom em qualquer
 *   lugar", não "me mande a fila inteira do PNCP". Pedir a palavra é cobrar
 *   dele a definição de "algo bom" que ele mesmo já quis dar.
 */

/** O recorte precisa de palavra no objeto antes de gastar avaliação? */
export function exigePalavraAntesDeAvaliar(recorte: Recorte): boolean {
  return recorte.abrangencia.tipo === "brasil";
}

export type EditalDoRecorte = {
  edital: Edital;
  /** Qual recorte deixou este edital entrar. */
  recorte: Recorte;
};

/**
 * O que este recorte manda avaliar.
 *
 * As palavras de exclusão valem SEMPRE, e não só no recorte nacional: elas são
 * o jeito de o cliente dizer "isto não é para mim", e desobedecer a isso para
 * poder explicar melhor depois seria explicar bem uma entrega que ele já pediu
 * para não receber.
 */
export function paraAvaliarNoRecorte(
  editais: readonly Edital[],
  recorte: Recorte,
  perfil: { palavrasChave: string[]; palavrasExcluidas: string[] },
): Edital[] {
  const excluidas = excluidasEfetivas(recorte, perfil);
  const palavras = palavrasEfetivas(recorte, perfil);
  const exigePalavra = exigePalavraAntesDeAvaliar(recorte);

  return editais.filter((edital) => {
    if (!abrangenciaAceita(recorte.abrangencia, edital)) return false;
    if (termosEncontrados(edital.objeto, excluidas).length > 0) return false;

    if (exigePalavra) {
      // Recorte nacional sem palavra nenhuma declarada (nem no recorte, nem no
      // perfil) não vira "o Brasil inteiro": vira nada. Entregar 2.725 editais
      // por dia a quem não disse o que procura é entregar ruído com aparência
      // de serviço, e cobrar armazenamento por isso.
      if (palavras.length === 0) return false;
      if (termosEncontrados(edital.objeto, palavras).length === 0) return false;
    }

    return true;
  });
}

/**
 * A união do que todos os recortes mandam avaliar, sem repetir edital.
 *
 * Um edital coberto por dois recortes (a cidade e o estado dela) precisa ser
 * avaliado UMA vez: a avaliação depende do perfil, não do recorte, e pontuar
 * duas vezes gravaria duas linhas idênticas e cobraria o dobro. Fica com o
 * primeiro recorte que o aceitou, e a ordem é a que o cliente definiu.
 */
export function paraAvaliar(
  editais: readonly Edital[],
  recortes: readonly Recorte[],
  perfil: { palavrasChave: string[]; palavrasExcluidas: string[] },
): EditalDoRecorte[] {
  const vistos = new Set<string>();
  const selecionados: EditalDoRecorte[] = [];

  for (const recorte of recortes) {
    for (const edital of paraAvaliarNoRecorte(editais, recorte, perfil)) {
      if (vistos.has(edital.id)) continue;
      vistos.add(edital.id);
      selecionados.push({ edital, recorte });
    }
  }

  return selecionados;
}

export type Pontuado = {
  editalId: string;
  recorte: Recorte;
  entregue: boolean;
  /** `null` quando não houve base para pontuar. */
  score: number | null;
};

/**
 * O que de fato vai para a tela e para o e-mail, depois de pontuado.
 *
 * ## Por que o teto vale para TODA abrangência
 *
 * Correção de um erro meu: eu tinha desenhado teto só para o recorte nacional,
 * supondo que "município" seria pequeno por natureza. O retrato de 25/08 diz
 * outra coisa — o município mediano tem menos de um edital novo por dia, mas
 * São Paulo tem uns 120 e Fortaleza uns 46. "Só uma cidade" pode ser São Paulo.
 *
 * ## O que acontece com quem não tem score
 *
 * Entra, e à frente de quem tem score baixo. `triagem.ts` já decidiu isso e a
 * razão continua valendo: esconder o que não conseguimos avaliar seria esconder
 * justamente o que precisa de olho humano. O teto pode cortá-lo, mas o corte é
 * por posição na fila, não por ser indeterminado.
 */
export function entregaveis(
  pontuados: readonly Pontuado[],
  teto: number = TETO_DIARIO_POR_RECORTE,
): Pontuado[] {
  const porRecorte = new Map<string, Pontuado[]>();

  for (const p of pontuados) {
    if (!p.entregue) continue;

    // O corte nacional é aplicado aqui, e não em `paraAvaliar`, de propósito: o
    // score só existe depois de pontuar. O que `paraAvaliar` já cobrou daquele
    // recorte foi a palavra no objeto, que é conferível sem pontuar.
    if (
      p.recorte.abrangencia.tipo === "brasil" &&
      p.score !== null &&
      p.score < SCORE_MINIMO_NO_BRASIL
    ) {
      continue;
    }

    const lista = porRecorte.get(p.recorte.id) ?? [];
    lista.push(p);
    porRecorte.set(p.recorte.id, lista);
  }

  const escolhidos: Pontuado[] = [];
  for (const lista of porRecorte.values()) {
    // Sem score primeiro, depois do maior para o menor. `null` na frente porque
    // "não consegui avaliar" é o que mais precisa de olho humano, e o teto não
    // pode ser o mecanismo que esconde justamente isso.
    const ordenada = [...lista].sort((a, b) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return -1;
      if (b.score === null) return 1;
      return b.score - a.score;
    });
    escolhidos.push(...ordenada.slice(0, teto));
  }

  return escolhidos;
}

/**
 * O que esta empresa manda avaliar, considerando que ela pode não ter recorte.
 *
 * ## A regra que precisa estar num lugar testável
 *
 * Empresa SEM recorte avalia TUDO. Isso não é caso degenerado nem configuração
 * pela metade: é o que os planos que leem o documento fazem, cobrindo o perfil
 * inteiro sem limite geográfico. `Plano.recortes` é `null` neles justamente
 * para dizer isso.
 *
 * O defeito que esta função existe para impedir é uma linha só: tratar lista
 * vazia como "nada a avaliar". Escrito assim, ele passa em qualquer teste de
 * unidade do recorte, passa no build, passa na revisão — e desliga a triagem de
 * quem paga R$ 800, silenciosamente, até o cliente ligar perguntando por que
 * parou de receber e-mail.
 *
 * Genérica no item para o script poder passar o par `{ uuid, edital, analise }`
 * que ele carrega, sem a seleção precisar conhecer o uuid do banco.
 */
export function paraAvaliarDaEmpresa<T extends { edital: Edital }>(
  itens: readonly T[],
  recortes: readonly Recorte[],
  perfil: { palavrasChave: string[]; palavrasExcluidas: string[] },
): T[] {
  if (recortes.length === 0) return [...itens];

  const porId = new Map(itens.map((i) => [i.edital.id, i]));
  return paraAvaliar(
    itens.map((i) => i.edital),
    recortes,
    perfil,
  ).map((s) => porId.get(s.edital.id)!);
}
