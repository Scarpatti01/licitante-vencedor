import type { Edital } from "@/lib/pncp/tipos";
import { diasAteEncerrar } from "@/lib/pncp/normaliza";
import type { FaixaDoScore, StatusDoCriterio } from "@/lib/dominio/score";
import type { NivelDaRecomendacao } from "@/lib/dominio/recomendacao";
import type { StatusDoItem } from "@/lib/dominio/checklist";
import { type Campo, desconhecido, doEdital } from "@/lib/dominio/procedencia";

/**
 * A gramática visual das telas do produto.
 *
 * Existe um motivo para isto ser um módulo e não classes espalhadas pelo JSX:
 * cor aqui é semântica, não decoração. São quatro tons e só quatro, com
 * significado fixo em todas as telas — o mesmo verde quer dizer a mesma coisa
 * no painel, na lista e na página do edital. Um quinto tom "porque ficou
 * bonito" desfaz o aprendizado do usuário e é exatamente o que faz um painel
 * virar enfeite.
 *
 * Duas regras que este arquivo faz cumprir por construção:
 *
 *  - **cor nunca é o único sinal.** Todo tom carrega um glifo e um rótulo em
 *    texto. Quem não distingue verde de âmbar lê "Disponível" e "Conferir";
 *    quem usa leitor de tela ouve a mesma coisa.
 *  - **ausência não vira zero.** `valorDoEdital` e `prazoDoEdital` devolvem
 *    `Campo`, o mesmo tipo do domínio, para que a tela seja obrigada a tratar
 *    o caso "não foi possível determinar" em vez de imprimir R$ 0.
 */

export type Tom = "positivo" | "atencao" | "impedimento" | "indeterminado" | "neutro";

type Estilo = {
  /** Pílula: fundo, texto e anel. Anel em vez de `border` de propósito —
   *  `globals.css` fixa `border-color` no seletor universal, fora de camada. */
  pilula: string;
  /** Só a cor do texto, para números e rótulos soltos. */
  texto: string;
  /** Fundo tênue para blocos inteiros (caixa de impedimento, por exemplo). */
  bloco: string;
  /** Barra sólida de 3px na lateral da linha da lista. */
  barra: string;
  /** Sempre acompanhado de palavra. Nunca sozinho. */
  glifo: string;
};

export const TOM: Record<Tom, Estilo> = {
  positivo: {
    pilula:
      "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-400/25",
    texto: "text-emerald-800 dark:text-emerald-300",
    bloco: "bg-emerald-50/70 dark:bg-emerald-950/30",
    barra: "bg-emerald-600 dark:bg-emerald-400",
    glifo: "✓",
  },
  atencao: {
    pilula:
      "bg-amber-50 text-amber-900 ring-1 ring-amber-600/25 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-400/25",
    texto: "text-amber-900 dark:text-amber-200",
    bloco: "bg-amber-50/70 dark:bg-amber-950/30",
    barra: "bg-amber-500 dark:bg-amber-400",
    glifo: "⚠",
  },
  impedimento: {
    pilula:
      "bg-rose-50 text-rose-800 ring-1 ring-rose-600/25 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-400/25",
    texto: "text-rose-800 dark:text-rose-300",
    bloco: "bg-rose-50/70 dark:bg-rose-950/30",
    barra: "bg-rose-600 dark:bg-rose-400",
    glifo: "✕",
  },
  indeterminado: {
    pilula:
      "bg-slate-100 text-slate-800 ring-1 ring-slate-500/25 dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-400/25",
    texto: "text-slate-700 dark:text-slate-300",
    bloco: "bg-slate-100/70 dark:bg-slate-800/40",
    barra: "bg-slate-400 dark:bg-slate-500",
    glifo: "?",
  },
  neutro: {
    pilula: "bg-[var(--surface)] text-[var(--foreground)] ring-1 ring-[var(--border)]",
    texto: "text-[var(--foreground)]",
    bloco: "bg-[var(--surface)]",
    barra: "bg-[var(--border)]",
    glifo: "•",
  },
};

/* ------------------------------------------------------------------ *
 * Recomendação, score e checklist — rótulo e tom, em um lugar só.
 * ------------------------------------------------------------------ */

/**
 * O nível da recomendação, e não a faixa do score, é o que colore a linha.
 *
 * A diferença aparece no dado real: um edital pode marcar 82 e ainda assim ser
 * `nao_recomendada` porque o prazo encerrou ou a execução é fora das UFs
 * atendidas. Pintar a linha pela faixa do score mostraria verde num certame de
 * que a empresa não pode participar — o erro mais caro possível nesta tela.
 */
export const RECOMENDACAO: Record<NivelDaRecomendacao, { rotulo: string; tom: Tom }> = {
  recomendada_forte: { rotulo: "Prioridade", tom: "positivo" },
  recomendada: { rotulo: "Recomendada", tom: "positivo" },
  avaliar: { rotulo: "Avaliar", tom: "atencao" },
  provavelmente_nao: { rotulo: "Provavelmente não", tom: "atencao" },
  nao_recomendada: { rotulo: "Não recomendada", tom: "impedimento" },
  informacao_insuficiente: { rotulo: "Sem base para recomendar", tom: "indeterminado" },
};

export const FAIXA: Record<FaixaDoScore, { rotulo: string; tom: Tom }> = {
  excelente: { rotulo: "Excelente", tom: "positivo" },
  boa: { rotulo: "Boa", tom: "positivo" },
  moderada: { rotulo: "Moderada", tom: "atencao" },
  baixa: { rotulo: "Baixa", tom: "atencao" },
  indeterminada: { rotulo: "Indeterminada", tom: "indeterminado" },
};

export const CRITERIO: Record<StatusDoCriterio, { rotulo: string; tom: Tom }> = {
  positivo: { rotulo: "A favor", tom: "positivo" },
  atencao: { rotulo: "Atenção", tom: "atencao" },
  impedimento: { rotulo: "Impedimento", tom: "impedimento" },
  indeterminado: { rotulo: "Não determinado", tom: "indeterminado" },
};

/** Os quatro estados do checklist. Dois seriam mais simples e mentiriam. */
export const ITEM_DO_CHECKLIST: Record<StatusDoItem, { rotulo: string; tom: Tom }> = {
  disponivel: { rotulo: "Disponível", tom: "positivo" },
  verificar: { rotulo: "Conferir", tom: "atencao" },
  ausente: { rotulo: "Ausente", tom: "impedimento" },
  nao_identificado: { rotulo: "Não identificado", tom: "indeterminado" },
};

export const FASE: Record<"habilitacao" | "proposta" | "execucao", string> = {
  habilitacao: "Habilitação",
  proposta: "Proposta",
  execucao: "Execução",
};

export const SITUACAO: Record<string, string> = {
  nova: "Nova",
  vista: "Vista",
  salva: "Salva",
  descartada: "Descartada",
  em_preparacao: "Em preparação",
  participada: "Participada",
  vencida: "Vencida",
  perdida: "Perdida",
};

/* ------------------------------------------------------------------ *
 * Formatação
 * ------------------------------------------------------------------ */

const FUSO = "America/Sao_Paulo";

export function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO });
}

export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/* ------------------------------------------------------------------ *
 * Campos do edital, com procedência
 * ------------------------------------------------------------------ */

export type DadoExibivel = {
  /** O que aparece grande. Nunca "0" nem "—" quando o dado não existe. */
  texto: string;
  campo: Campo<unknown>;
  tom: Tom;
};

/**
 * Valor estimado — e as duas maneiras de ele não existir.
 *
 * `valorEstimado === null` é "o órgão não publicou". `valorSuspeito` é "o órgão
 * publicou uma bobagem". São coisas diferentes, o usuário precisa saber qual
 * das duas é, e nenhuma delas pode virar um número na tela.
 */
export function valorDoEdital(edital: Edital): DadoExibivel {
  if (edital.valorSuspeito) {
    const bruto = edital.valorEstimadoBruto;
    return {
      texto: "Valor implausível",
      tom: "indeterminado",
      campo: desconhecido(
        `O valor publicado${bruto !== null ? ` (${moeda(bruto)})` : ""} destoa a ponto de não servir para comparação — provável erro de digitação na origem. O certame continua válido; só o número não é utilizável.`,
      ),
    };
  }
  if (edital.valorEstimado === null) {
    return {
      texto: "Sem valor estimado",
      tom: "indeterminado",
      campo: desconhecido("O órgão não publicou valor estimado para este certame."),
    };
  }
  return {
    texto: moeda(edital.valorEstimado),
    tom: "neutro",
    campo: doEdital(edital.valorEstimado, "Valor total estimado, como publicado pelo órgão."),
  };
}

export type Prazo = DadoExibivel & {
  dias: number | null;
  encerrado: boolean;
  /** Linha curta para a lista: "encerra em 3 dias". */
  resumo: string;
};

export function prazoDoEdital(edital: Edital, agora: Date): Prazo {
  const dias = diasAteEncerrar(edital, agora);

  if (dias === null || !edital.encerramentoProposta) {
    return {
      texto: "Sem data de encerramento",
      resumo: "Sem prazo publicado",
      dias: null,
      encerrado: false,
      tom: "indeterminado",
      campo: desconhecido(
        "A publicação não traz data de encerramento das propostas. Confirme no registro oficial antes de contar com prazo.",
      ),
    };
  }

  const campo = doEdital(
    edital.encerramentoProposta,
    `Encerramento das propostas em ${dataHora(edital.encerramentoProposta)} (horário de Brasília).`,
  );

  if (dias < 0) {
    return {
      texto: "Prazo encerrado",
      resumo: `Encerrou em ${dataCurta(edital.encerramentoProposta)}`,
      dias,
      encerrado: true,
      tom: "impedimento",
      campo,
    };
  }
  if (dias === 0) {
    return {
      texto: "Menos de 24 horas",
      resumo: "Encerra hoje",
      dias,
      encerrado: false,
      tom: "atencao",
      campo,
    };
  }
  return {
    texto: plural(dias, "dia restante", "dias restantes"),
    resumo: `Encerra em ${plural(dias, "dia", "dias")}`,
    dias,
    encerrado: false,
    tom: dias <= 7 ? "atencao" : "neutro",
    campo,
  };
}

export function orgaoDoEdital(edital: Edital): DadoExibivel {
  const esfera =
    edital.orgao.esfera === "desconhecida"
      ? "Esfera não informada na publicação."
      : `Esfera ${edital.orgao.esfera}.`;
  return {
    texto: edital.orgao.nome || "Órgão não informado",
    tom: "neutro",
    campo: edital.orgao.nome
      ? doEdital(edital.orgao.nome, `Unidade compradora informada na publicação. ${esfera}`)
      : desconhecido("A publicação não traz a razão social da unidade compradora."),
  };
}

export function localDoEdital(edital: Edital): DadoExibivel {
  return {
    texto: `${edital.local.municipio}/${edital.local.uf}`,
    tom: "neutro",
    campo: doEdital(
      `${edital.local.municipio}/${edital.local.uf}`,
      `Município e UF da unidade compradora, informados na publicação (código IBGE ${edital.local.codigoIbge}).`,
    ),
  };
}

/** Endereço da página do edital. `encodeURIComponent` porque o identificador
 *  canônico do PNCP contém barra (`.../2026`), que quebraria a rota. */
export function hrefDaOportunidade(id: string): string {
  return `/oportunidades/${encodeURIComponent(id)}/`;
}
