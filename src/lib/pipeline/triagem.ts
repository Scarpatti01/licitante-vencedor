import type { Edital } from "../pncp/tipos.ts";
import type { AnaliseDoEdital, PerfilDaEmpresa } from "../dominio/tipos.ts";
import { avaliarOportunidade, type Avaliacao } from "../dominio/recomendacao.ts";

/**
 * A triagem: cruzar o que foi coletado com quem assina, e registrar o porquê.
 *
 * Esta função é a espinha do produto e tem uma característica incomum de
 * propósito: ela devolve linha para TODO edital avaliado, inclusive — e
 * principalmente — para os que não viraram oportunidade. O registro do descarte
 * é tão importante quanto o da recomendação.
 *
 * O motivo é a pergunta que todo cliente faz no primeiro mês:
 *
 *   *"por que este edital não apareceu para mim?"*
 *
 * Sem este registro, a resposta honesta seria "não sei" — o cruzamento já teria
 * acontecido e sumido. Com ele, a resposta é a frase exata do critério que
 * barrou, com a data e a versão da análise usada. É a diferença entre um
 * produto auditável e uma caixa-preta que o cliente cancela quando desconfia.
 *
 * Também é o que torna o flywheel possível: acumular decisão de triagem com
 * resultado real (participou? ganhou?) é o que permite, mais tarde, calibrar os
 * pesos do score com dado em vez de opinião.
 */

export type MotivoDeDescarte =
  | "impedimento"
  | "abaixo_do_corte"
  | "sem_base_para_avaliar"
  | "prazo_encerrado";

export type DecisaoDeTriagem = {
  empresaId: string;
  editalId: string;
  decididoEm: string;
  /** `true` quando a oportunidade entra na lista da empresa. */
  entregue: boolean;
  motivoDoDescarte: MotivoDeDescarte | null;
  /** A frase específica que explica a decisão. É isto que o suporte lê para o cliente. */
  explicacao: string;
  score: number | null;
  nivel: Avaliacao["recomendacao"]["nivel"];
  /** Versão da análise que sustentou a decisão, para reprocessar com honestidade. */
  versaoDaAnalise: string | null;
  /**
   * A avaliação inteira, e não só o resumo acima.
   *
   * `decisoes_de_triagem` (o "por que descartou") precisa só do resumo — score,
   * nível, explicação. Quem grava `oportunidades` (o "o que a empresa vê")
   * precisa de mais: `criterios` com cada frase e peso, `checklist`,
   * `proximaAcao`, `cobertura` — ver `src/lib/triagem/mapeamento.ts`. Sem este
   * campo, quem grava `oportunidades` teria de chamar `avaliarOportunidade` uma
   * segunda vez para o mesmo par, e as duas chamadas divergirem é o jeito mais
   * silencioso de o placar do e-mail discordar do que a tela mostra.
   */
  avaliacao: Avaliacao;
};

export type ResultadoDaTriagem = {
  decisoes: DecisaoDeTriagem[];
  entregues: DecisaoDeTriagem[];
  descartadas: DecisaoDeTriagem[];
};

/**
 * Corte de entrega.
 *
 * Deliberadamente mais baixo que o corte de ALERTA (70). Entrar na lista do
 * painel e interromper o dia de alguém são decisões diferentes: a lista pode
 * ser generosa, porque o usuário escolhe quando olhar; o e-mail não pode.
 *
 * Abaixo deste corte a oportunidade não some do sistema — ela fica registrada
 * como descarte explicável e reaparece se o perfil da empresa mudar.
 */
const CORTE_DE_ENTREGA = 40;

function classificar(avaliacao: Avaliacao): {
  entregue: boolean;
  motivo: MotivoDeDescarte | null;
  explicacao: string;
} {
  const { score, recomendacao } = avaliacao;

  // O prazo encerrado é um impedimento como qualquer outro para o motor de
  // score, mas aqui ele precisa de motivo próprio: não é uma afirmação sobre a
  // empresa. Registrar "impedimento" para um certame que simplesmente acabou
  // faria o suporte responder ao cliente que ele não podia participar, quando o
  // fato é que ninguém mais podia. Por isso a checagem vem pela chave do
  // critério, e não pelo nível da recomendação.
  const prazoEncerrado = score.impedimentos.find((c) => c.chave === "prazo");
  if (prazoEncerrado) {
    return { entregue: false, motivo: "prazo_encerrado", explicacao: prazoEncerrado.frase };
  }

  if (score.impedimentos.length > 0) {
    return {
      entregue: false,
      motivo: "impedimento",
      explicacao: score.impedimentos.map((c) => c.frase).join(" "),
    };
  }

  if (score.valor === null) {
    // Sem base para avaliar, a oportunidade É entregue — com o rótulo de
    // indeterminada e a lista do que falta. Esconder o que não conseguimos
    // avaliar seria esconder justamente o que precisa de olho humano, e daria
    // ao cliente a impressão de cobertura que o sistema não tem.
    return {
      entregue: true,
      motivo: null,
      explicacao: score.motivo ?? "Sem informação suficiente para pontuar.",
    };
  }

  if (score.valor < CORTE_DE_ENTREGA) {
    return {
      entregue: false,
      motivo: "abaixo_do_corte",
      explicacao: `Aderência ${score.valor}/100, abaixo do corte de ${CORTE_DE_ENTREGA}. ${
        score.atencoes[0]?.frase ?? ""
      }`.trim(),
    };
  }

  return {
    entregue: true,
    motivo: null,
    explicacao: `Aderência ${score.valor}/100. ${recomendacao.resumo}`,
  };
}

export function triar(
  editais: { edital: Edital; analise: AnaliseDoEdital }[],
  perfil: PerfilDaEmpresa,
  agora: Date = new Date(),
): ResultadoDaTriagem {
  const decisoes = editais.map(({ edital, analise }) => {
    const avaliacao = avaliarOportunidade(edital, analise, perfil, agora);
    const { entregue, motivo, explicacao } = classificar(avaliacao);

    return {
      empresaId: perfil.empresaId,
      editalId: edital.id,
      decididoEm: agora.toISOString(),
      entregue,
      motivoDoDescarte: motivo,
      explicacao,
      score: avaliacao.score.valor,
      nivel: avaliacao.recomendacao.nivel,
      versaoDaAnalise: analise.versaoDoPrompt,
      avaliacao,
    } satisfies DecisaoDeTriagem;
  });

  return {
    decisoes,
    entregues: decisoes.filter((d) => d.entregue),
    descartadas: decisoes.filter((d) => !d.entregue),
  };
}

/**
 * A resposta para "por que este edital não apareceu para mim?".
 *
 * Recebe a decisão registrada — não recalcula. Recalcular responderia com o
 * estado de hoje uma pergunta sobre o que aconteceu na terça-feira, depois de o
 * perfil ter mudado, e produziria uma explicação sinceramente errada.
 */
export function explicarDecisao(decisao: DecisaoDeTriagem | null, editalId: string): string {
  if (!decisao) {
    return `Não há registro de triagem para o edital ${editalId} nesta empresa. Isso normalmente significa que ele não foi coletado — verifique se o estado dele está na cobertura da coleta daquele dia.`;
  }

  const quando = new Date(decisao.decididoEm).toLocaleString("pt-BR");
  if (decisao.entregue) {
    return `Este edital foi entregue em ${quando}. ${decisao.explicacao}`;
  }

  const cabecalho: Record<MotivoDeDescarte, string> = {
    impedimento: "Não foi entregue porque há impedimento para a sua empresa:",
    abaixo_do_corte: "Não foi entregue porque ficou abaixo do corte de aderência:",
    sem_base_para_avaliar: "Não foi entregue por falta de base para avaliar:",
    prazo_encerrado: "Não foi entregue porque o prazo já havia encerrado:",
  };

  return `${cabecalho[decisao.motivoDoDescarte!]} ${decisao.explicacao} (decidido em ${quando})`;
}
