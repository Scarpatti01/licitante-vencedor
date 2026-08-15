import type { Edital } from "../pncp/tipos.ts";
import { diasAteEncerrar } from "../pncp/normaliza.ts";
import type { AnaliseDoEdital, PerfilDaEmpresa } from "./tipos.ts";
import { calcularScore, type Score } from "./score.ts";
import type { Checklist } from "./checklist.ts";

/**
 * A recomendação e, principalmente, a próxima ação.
 *
 * O produto inteiro existe para responder a última pergunta da página do
 * edital: **o que eu faço agora?**. Score é meio; recomendação é conclusão;
 * próxima ação é o que o empresário executa depois de fechar a tela. Uma tela
 * que informa muito e não termina em verbo devolve o problema ao usuário.
 *
 * Duas coisas que este arquivo se recusa a fazer, por posicionamento e por
 * responsabilidade jurídica:
 *
 *  - **não estima chance de vitória.** Não temos dado de concorrência, e um
 *    percentual inventado seria a informação mais perigosa do produto;
 *  - **não dá parecer.** "Recomendada" quer dizer que o cruzamento entre o
 *    edital e o perfil é favorável, e o texto diz isso com essas palavras. A
 *    decisão de participar é do cliente, e a leitura do edital continua sendo
 *    obrigação dele.
 */

export type NivelDaRecomendacao =
  | "recomendada_forte"
  | "recomendada"
  | "avaliar"
  | "provavelmente_nao"
  | "nao_recomendada"
  | "informacao_insuficiente";

export type TipoDeProximaAcao =
  | "montar_proposta"
  | "regularizar_documentos"
  | "ler_edital"
  | "completar_perfil"
  | "decidir_rapido"
  | "arquivar";

export type ProximaAcao = {
  tipo: TipoDeProximaAcao;
  /** Texto curto e imperativo. É o que vira botão e primeira linha do alerta. */
  titulo: string;
  /** Uma frase dizendo por que essa é a ação, e não outra. */
  porque: string;
  /** Itens concretos, quando existirem (documentos a providenciar, por exemplo). */
  itens: string[];
};

export type Recomendacao = {
  nivel: NivelDaRecomendacao;
  /** Frase de uma linha, para lista e e-mail. */
  resumo: string;
  /** Os "por quês" que sustentam o nível, prontos para exibição. */
  justificativa: {
    positivos: string[];
    atencoes: string[];
    impedimentos: string[];
    naoDeterminados: string[];
  };
  proximaAcao: ProximaAcao;
  /** `true` quando o prazo transforma a decisão em urgência real. */
  urgente: boolean;
};

export type Avaliacao = {
  score: Score;
  checklist: Checklist;
  recomendacao: Recomendacao;
};

function nivelDe(score: Score): NivelDaRecomendacao {
  if (score.impedimentos.length > 0) return "nao_recomendada";
  if (score.valor === null) return "informacao_insuficiente";
  switch (score.faixa) {
    case "excelente":
      return "recomendada_forte";
    case "boa":
      return "recomendada";
    case "moderada":
      return "avaliar";
    default:
      return "provavelmente_nao";
  }
}

const RESUMO: Record<NivelDaRecomendacao, string> = {
  recomendada_forte: "Alta aderência ao seu perfil — vale priorizar.",
  recomendada: "Boa aderência ao seu perfil.",
  avaliar: "Aderência parcial — vale uma olhada antes de decidir.",
  provavelmente_nao: "Baixa aderência ao seu perfil.",
  nao_recomendada: "Há impedimento para a sua empresa participar.",
  informacao_insuficiente: "Ainda não há informação suficiente para recomendar.",
};

function definirProximaAcao(
  edital: Edital,
  analise: AnaliseDoEdital,
  score: Score,
  checklist: Checklist,
  nivel: NivelDaRecomendacao,
  agora: Date,
): ProximaAcao {
  const dias = diasAteEncerrar(edital, agora);

  // Ordem de precedência deliberada: o que impede vem antes do que atrasa, que
  // vem antes do que falta saber. Inverter isso produz a tela que manda a
  // empresa buscar certidão para um certame que já encerrou.
  if (dias !== null && dias < 0) {
    return {
      tipo: "arquivar",
      titulo: "Arquivar — o prazo já encerrou",
      porque: "As propostas para este edital não são mais aceitas.",
      itens: [],
    };
  }

  if (nivel === "nao_recomendada") {
    return {
      tipo: "arquivar",
      titulo: "Descartar e seguir",
      porque: score.impedimentos[0]?.frase ?? "Há impedimento registrado para a sua empresa.",
      itens: score.impedimentos.map((c) => c.frase),
    };
  }

  if (nivel === "informacao_insuficiente") {
    const faltaNoPerfil = score.indeterminados.filter(
      (c) => c.procedencia.origem === "desconhecido" && /perfil/i.test(c.procedencia.motivo),
    );
    if (faltaNoPerfil.length > 0) {
      return {
        tipo: "completar_perfil",
        titulo: "Completar o perfil da empresa",
        porque:
          "Sem esses dados não dá para dizer se o edital serve para você — e preferimos não chutar.",
        itens: faltaNoPerfil.map((c) => c.nome),
      };
    }
    return {
      tipo: "ler_edital",
      titulo: "Abrir o edital na fonte oficial",
      porque: "Faltam informações que só o texto do edital resolve.",
      itens: score.indeterminados.map((c) => c.nome),
    };
  }

  const pendentes = checklist.itens.filter(
    (i) => i.obrigatorio && (i.status === "ausente" || i.status === "verificar"),
  );
  if (pendentes.length > 0) {
    return {
      tipo: "regularizar_documentos",
      titulo:
        pendentes.length === 1
          ? "Regularizar 1 documento"
          : `Regularizar ${pendentes.length} documentos`,
      porque: "Documento pendente é o que mais desclassifica fornecedor na habilitação.",
      itens: pendentes.map((i) => `${i.nome} — ${i.observacao}`),
    };
  }

  if (analise.profundidade === "lista") {
    return {
      tipo: "ler_edital",
      titulo: "Ler o edital na íntegra",
      porque:
        "O cruzamento com o seu perfil é favorável, mas as exigências detalhadas ainda não foram extraídas do documento.",
      itens: [],
    };
  }

  if (dias !== null && dias <= 2) {
    return {
      tipo: "decidir_rapido",
      titulo: "Decidir hoje",
      porque: `Restam ${dias === 0 ? "menos de 24 horas" : `${dias} dia${dias === 1 ? "" : "s"}`} e a sua documentação aparenta estar em ordem.`,
      itens: [],
    };
  }

  return {
    tipo: "montar_proposta",
    titulo: "Montar a proposta",
    porque: "Perfil compatível e documentação obrigatória aparentemente em ordem.",
    itens: [],
  };
}

export function avaliarOportunidade(
  edital: Edital,
  analise: AnaliseDoEdital,
  perfil: PerfilDaEmpresa,
  agora: Date = new Date(),
): Avaliacao {
  const { score, checklist } = calcularScore(edital, analise, perfil, agora);
  const nivel = nivelDe(score);
  const dias = diasAteEncerrar(edital, agora);

  return {
    score,
    checklist,
    recomendacao: {
      nivel,
      resumo: RESUMO[nivel],
      justificativa: {
        positivos: score.positivos.map((c) => c.frase),
        atencoes: score.atencoes.map((c) => c.frase),
        impedimentos: score.impedimentos.map((c) => c.frase),
        naoDeterminados: score.indeterminados.map((c) => c.frase),
      },
      proximaAcao: definirProximaAcao(edital, analise, score, checklist, nivel, agora),
      // Urgente é interseção de "merece atenção" com "acaba logo". Marcar como
      // urgente algo que não vale a pena participar treinaria o cliente a
      // ignorar o aviso, que é como um produto de alerta morre.
      urgente:
        dias !== null &&
        dias >= 0 &&
        dias <= 3 &&
        (nivel === "recomendada_forte" || nivel === "recomendada"),
    },
  };
}

/**
 * Análise vazia, para quando o edital ainda não passou pela leitura profunda.
 *
 * Existe para o produto funcionar do dia 1, com o que a coleta traz, sem que
 * nenhuma parte do sistema precise fingir que leu o documento.
 */
export function analiseNaoRealizada(editalId: string, motivo: string): AnaliseDoEdital {
  const ausente = { origem: "desconhecido" as const, valor: null, motivo };
  return {
    editalId,
    analisadoEm: null,
    versaoDoPrompt: null,
    modelo: null,
    resumoExecutivo: ausente,
    exigencias: [],
    criterioDeJulgamento: ausente,
    garantiaExigida: ausente,
    visitaTecnicaExigida: ausente,
    amostraExigida: ausente,
    riscos: [],
    profundidade: "lista",
  };
}
