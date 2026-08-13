import type { PerfilDaEmpresa } from "@/lib/dominio/tipos";

/**
 * O que o perfil liga e o que ele deixa desligado.
 *
 * Não é uma barra de progresso decorativa. Cada linha aqui corresponde a um
 * critério que `src/lib/dominio/score.ts` avalia, e a condição de "ativo" é a
 * MESMA condição que faz aquele critério sair de `indeterminado` lá. É o que
 * transforma "complete seu cadastro" (que ninguém completa) em "sem estado
 * declarado, o motor não consegue descartar edital de fora da sua região".
 *
 * Regra que este arquivo respeita e que o produto inteiro respeita: critério
 * indeterminado NÃO vale zero — ele sai da conta. Por isso o texto fala em
 * "inerte", nunca em "nota baixa".
 *
 * Ao mexer em um critério do score, mexa na linha correspondente aqui na mesma
 * mudança. A duplicação é consciente: o score precisa de um edital para
 * responder, e esta tela precisa responder sem nenhum.
 */

export type EstadoDoCriterio = "ativo" | "inerte" | "sempre_ativo";

export type CriterioDoPerfil = {
  chave: string;
  nome: string;
  estado: EstadoDoCriterio;
  /** O que o motor consegue (ou não) fazer com o que está declarado hoje. */
  efeito: string;
  /** Para onde mandar quem quiser resolver. Etapa do onboarding / seção do perfil. */
  secao: SecaoDoPerfil;
  /** Rótulo do campo que falta, quando falta. */
  campoQueFalta: string | null;
};

export type SecaoDoPerfil = "empresa" | "atuacao" | "capacidade" | "documentacao" | "atestados";

export const NOME_DA_SECAO: Record<SecaoDoPerfil, string> = {
  empresa: "Empresa",
  atuacao: "Atuação",
  capacidade: "Capacidade",
  documentacao: "Documentação",
  atestados: "Atestados",
};

export type DiagnosticoDoPerfil = {
  criterios: CriterioDoPerfil[];
  ativos: CriterioDoPerfil[];
  inertes: CriterioDoPerfil[];
  /**
   * `true` quando falta pelo menos um dos dois campos sem os quais o motor se
   * recusa a pontuar qualquer edital: região e faixa de ticket.
   */
  bloqueiaRecomendacao: boolean;
  /** Fração 0..1 de critérios dependentes do perfil que estão ativos. */
  preenchimento: number;
};

export function diagnosticarPerfil(perfil: PerfilDaEmpresa | null): DiagnosticoDoPerfil {
  const p = perfil;
  const temUf = (p?.ufsAtendidas.length ?? 0) > 0;
  const temTicket = p != null && (p.ticketMinimo !== null || p.ticketMaximo !== null);

  const criterios: CriterioDoPerfil[] = [
    {
      chave: "objeto",
      nome: "Compatibilidade do objeto",
      estado: (p?.palavrasChave.length ?? 0) > 0 ? "ativo" : "inerte",
      efeito:
        (p?.palavrasChave.length ?? 0) > 0
          ? `Comparamos o objeto de cada edital com ${p!.palavrasChave.length} palavra(s)-chave sua.`
          : "Sem palavras-chave, não há como julgar se o objeto é do seu ramo — e este é o critério de maior peso.",
      secao: "atuacao",
      campoQueFalta: (p?.palavrasChave.length ?? 0) > 0 ? null : "Palavras-chave",
    },
    {
      chave: "exclusao",
      nome: "Descarte por palavra excluída",
      estado: (p?.palavrasExcluidas.length ?? 0) > 0 ? "ativo" : "inerte",
      efeito:
        (p?.palavrasExcluidas.length ?? 0) > 0
          ? `Editais cujo objeto contenha ${p!.palavrasExcluidas.map((t) => `"${t}"`).join(", ")} são marcados como fora do seu escopo.`
          : "Nenhum termo de exclusão declarado. Editais de ramo vizinho ao seu continuarão aparecendo.",
      secao: "atuacao",
      campoQueFalta: (p?.palavrasExcluidas.length ?? 0) > 0 ? null : "Palavras excluídas",
    },
    {
      chave: "regiao",
      nome: "Região de atuação",
      estado: temUf ? "ativo" : "inerte",
      efeito: temUf
        ? `Editais fora de ${p!.ufsAtendidas.join(", ")} são marcados como impedimento.`
        : "Sem estados declarados, editais de qualquer canto do país entram na sua lista.",
      secao: "capacidade",
      campoQueFalta: temUf ? null : "Estados atendidos",
    },
    {
      chave: "valor",
      nome: "Valor dentro da sua faixa",
      estado: temTicket ? "ativo" : "inerte",
      efeito: temTicket
        ? "Comparamos o valor estimado publicado com a faixa que você opera."
        : "Sem faixa de ticket, contrato de R$ 20 mil e de R$ 20 milhões chegam com o mesmo peso.",
      secao: "capacidade",
      campoQueFalta: temTicket ? null : "Ticket mínimo ou máximo",
    },
    {
      chave: "capacidade",
      nome: "Capacidade financeira",
      estado: p?.faturamentoAnual != null ? "ativo" : "inerte",
      efeito:
        p?.faturamentoAnual != null
          ? "Comparamos o porte do contrato com o seu faturamento anual declarado."
          : "Sem faturamento declarado, não dá para avisar quando a qualificação econômico-financeira tende a barrar.",
      secao: "empresa",
      campoQueFalta: p?.faturamentoAnual != null ? null : "Faturamento anual",
    },
    {
      chave: "documentacao",
      nome: "Documentação",
      estado: (p?.documentos.length ?? 0) > 0 ? "ativo" : "inerte",
      efeito:
        (p?.documentos.length ?? 0) > 0
          ? `${p!.documentos.length} documento(s) no cadastro para cruzar com a exigência de habilitação de cada edital.`
          : "Sem documentos cadastrados, o checklist de habilitação não tem com o que comparar a exigência do edital.",
      secao: "documentacao",
      campoQueFalta: (p?.documentos.length ?? 0) > 0 ? null : "Documentos",
    },
    {
      chave: "experiencia",
      nome: "Experiência comprovável",
      estado: (p?.atestados.length ?? 0) > 0 ? "ativo" : "inerte",
      efeito:
        (p?.atestados.length ?? 0) > 0
          ? `${p!.atestados.length} atestado(s) para casar com a exigência de capacidade técnica.`
          : "Sem atestados, não dá para dizer se a sua experiência cobre o objeto exigido.",
      secao: "atestados",
      campoQueFalta: (p?.atestados.length ?? 0) > 0 ? null : "Atestados de capacidade técnica",
    },
    {
      chave: "modalidade",
      nome: "Modalidade",
      estado: "sempre_ativo",
      efeito:
        (p?.modalidadesAceitas.length ?? 0) > 0
          ? `Você disputa ${p!.modalidadesAceitas.join(", ")}. As demais entram marcadas como atenção.`
          : "Sem restrição declarada, todas as modalidades passam. É um padrão válido, não uma pendência.",
      secao: "capacidade",
      campoQueFalta: null,
    },
    {
      chave: "prazo",
      nome: "Prazo para preparar",
      estado: "sempre_ativo",
      efeito: "Depende só da data publicada pelo órgão — não há nada a preencher no perfil.",
      secao: "capacidade",
      campoQueFalta: null,
    },
  ];

  const dependemDoPerfil = criterios.filter((c) => c.estado !== "sempre_ativo");
  const ativos = criterios.filter((c) => c.estado === "ativo");
  const inertes = criterios.filter((c) => c.estado === "inerte");

  return {
    criterios,
    ativos,
    inertes,
    bloqueiaRecomendacao: !temUf || !temTicket,
    preenchimento: dependemDoPerfil.length === 0 ? 0 : ativos.length / dependemDoPerfil.length,
  };
}

/** Rótulo curto para o cabeçalho do produto. Sem número inventado. */
export function resumoDoPerfil(diagnostico: DiagnosticoDoPerfil): string {
  const inertes = diagnostico.inertes.length;
  if (inertes === 0) return "Todos os critérios do perfil estão ativos";
  return `${inertes} critério${inertes === 1 ? "" : "s"} inerte${inertes === 1 ? "" : "s"} por falta de dado`;
}
