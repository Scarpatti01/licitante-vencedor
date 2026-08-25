/**
 * O mecanismo que faltava, descrito no roadmap: "custo.ts registra e estima
 * custo por execução, mas não soma o mês nem avisa ninguém."
 *
 * ## O que este arquivo NÃO decide
 *
 * `PRECOS_POR_MODELO` (`custo.ts`) nasceu vazio de propósito e foi preenchido
 * em 25/08 com o preço PUBLICADO pelo fornecedor, com data e URL em cada linha.
 *
 * Isso é menos que a fatura, e a diferença está declarada onde importa: cada
 * preço carrega `fonte`, e o aviso que o dono recebe diz, no corpo, que o valor
 * é estimativa e que a fatura inclui imposto, câmbio do dia e eventual crédito.
 * Preço publicado com procedência é conhecimento; preço sem ela seria a mesma
 * invenção de certeza que o resto do produto existe para recusar (ver
 * `procedencia.ts`).
 *
 * Este arquivo funciona nos dois estados, e continuou funcionando sem uma linha
 * de mudança: sem preço conferido para um modelo, ele diz que não sabe; com
 * preço, soma e compara contra o teto. Só o veredito mudou.
 *
 * ## Nunca um interruptor
 *
 * A decisão de 20/08 (`docs/produto/roadmap.md`) é explícita: ultrapassar o
 * teto gera alerta para revisão com dado real, nunca interrompe a análise
 * sozinho. Este arquivo só decide QUE mensagem mostrar — quem lê, decide o que
 * fazer com ela.
 */

export const TETO_MENSAL_EM_CENTAVOS_BRL = 30_000;

/**
 * Câmbio de referência, não taxa de fechamento de fatura.
 *
 * A fatura do Gemini é em dólar; o teto foi decidido em real. Precisa de uma
 * conversão em algum ponto, e este número é ela — mas é indicativo, não
 * contábil: câmbio varia todo dia e a fatura real usa a taxa do dia da cobrança,
 * não esta. Reconferir periodicamente (mesma disciplina de `PRECOS_POR_MODELO`:
 * data e fonte, nunca chute sem as duas).
 */
export const TAXA_USD_PARA_BRL = {
  usdParaBrl: 5.19,
  conferidaEm: "2026-08-21",
  fonte: "xe.com, câmbio de referência (mid-market) — não é a taxa de fechamento do cartão/fatura.",
};

/** O que se sabe de uma execução, no vocabulário deste arquivo. */
export type LinhaDeExecucao = {
  modelo: string;
  tokensDeEntrada: number;
  tokensDeSaida: number;
  /** `null` quando `estimarCusto` não tinha preço conferido para este modelo. */
  custoEmCentavosUsd: number | null;
  sucesso: boolean;
};

export type ResumoPorModelo = {
  execucoes: number;
  tokensDeEntrada: number;
  tokensDeSaida: number;
};

export type ResumoMensalDeCusto = {
  /** Rótulo do período, ex.: "2026-08". Não filtra nada — só identifica o resumo. */
  mes: string;
  execucoes: number;
  falhas: number;
  tokensDeEntrada: number;
  tokensDeSaida: number;
  /** Soma só do que tinha preço conferido no momento da execução. Nunca a conta inteira, a menos que `execucoesSemPreco` seja 0. */
  custoConhecidoEmCentavosUsd: number;
  execucoesSemPreco: number;
  porModelo: Record<string, ResumoPorModelo>;
};

export function resumirMes(mes: string, linhas: readonly LinhaDeExecucao[]): ResumoMensalDeCusto {
  const resumo: ResumoMensalDeCusto = {
    mes,
    execucoes: linhas.length,
    falhas: 0,
    tokensDeEntrada: 0,
    tokensDeSaida: 0,
    custoConhecidoEmCentavosUsd: 0,
    execucoesSemPreco: 0,
    porModelo: {},
  };

  for (const linha of linhas) {
    if (!linha.sucesso) resumo.falhas++;
    resumo.tokensDeEntrada += linha.tokensDeEntrada;
    resumo.tokensDeSaida += linha.tokensDeSaida;

    if (linha.custoEmCentavosUsd === null) resumo.execucoesSemPreco++;
    else resumo.custoConhecidoEmCentavosUsd += linha.custoEmCentavosUsd;

    const porModelo = resumo.porModelo[linha.modelo] ?? {
      execucoes: 0,
      tokensDeEntrada: 0,
      tokensDeSaida: 0,
    };
    porModelo.execucoes++;
    porModelo.tokensDeEntrada += linha.tokensDeEntrada;
    porModelo.tokensDeSaida += linha.tokensDeSaida;
    resumo.porModelo[linha.modelo] = porModelo;
  }

  return resumo;
}

export type VereditoDoTeto =
  | {
      /** Havia execução sem preço conferido, e o que se sabe não basta para afirmar nada. */
      situacao: "sem_preco_conferido";
      /** Piso: o que já se sabe que foi gasto, mesmo sem contar o resto. */
      pisoEmCentavosBrl: number;
      motivo: string;
    }
  | { situacao: "dentro_do_teto"; totalEmCentavosBrl: number }
  | { situacao: "estourou"; totalEmCentavosBrl: number };

/**
 * Compara o mês contra o teto — sem nunca alegar mais certeza do que os
 * dados sustentam.
 *
 * A regra do meio é a que existe para não deixar um estouro real escondido
 * atrás de uma execução sem preço: se o que JÁ se sabe (o piso, ignorando as
 * execuções sem preço) já passa do teto sozinho, o resto é irrelevante para a
 * pergunta "estourou?" — a resposta já é sim. Só quando o piso fica abaixo do
 * teto é que a execução sem preço vira o que impede a resposta.
 */
export function avaliarContraOTeto(
  resumo: ResumoMensalDeCusto,
  taxa: { usdParaBrl: number } = TAXA_USD_PARA_BRL,
  tetoEmCentavosBrl: number = TETO_MENSAL_EM_CENTAVOS_BRL,
): VereditoDoTeto {
  const pisoEmCentavosBrl = Math.round(resumo.custoConhecidoEmCentavosUsd * taxa.usdParaBrl);

  if (pisoEmCentavosBrl >= tetoEmCentavosBrl) {
    return { situacao: "estourou", totalEmCentavosBrl: pisoEmCentavosBrl };
  }

  if (resumo.execucoesSemPreco > 0) {
    return {
      situacao: "sem_preco_conferido",
      pisoEmCentavosBrl,
      motivo:
        `${resumo.execucoesSemPreco} de ${resumo.execucoes} execução(ões) deste mês não ` +
        "tinham preço conferido em PRECOS_POR_MODELO no momento em que rodaram — não dá " +
        "para afirmar que o mês ficou dentro do teto, só que o piso conhecido ficou.",
    };
  }

  return { situacao: "dentro_do_teto", totalEmCentavosBrl: pisoEmCentavosBrl };
}
