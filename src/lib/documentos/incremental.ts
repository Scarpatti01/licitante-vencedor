/**
 * Quem decide se vale baixar os documentos de um edital.
 *
 * ## O número que justifica este arquivo
 *
 * A janela mediana de um edital, medida em 709 publicações reais de PE, é de
 * **14,7 dias**. Como a coleta busca "propostas abertas", o mesmo edital
 * reaparece em cerca de quinze varreduras seguidas: **~6,8% de cada varredura é
 * novidade e ~93,2% é o mesmo dado de novo**.
 *
 * Para METADADOS isso é barato e vale a pena — é a varredura completa que
 * alimenta a detecção de mudança, e retificação de edital é comum e mexe em
 * prazo. Para DOCUMENTOS não é: são ~4 MB por edital (medido em 50 amostras),
 * o que daria ~12,5 GB por dia baixando tudo outra vez para obter o mesmo
 * arquivo. Este módulo é o corte entre as duas coisas.
 *
 * ## Puro de propósito
 *
 * Sem rede, sem `fetch`, sem banco — a decisão é uma função dos dados. É o
 * mesmo motivo de `rotas.ts` e `regioes.ts` serem puros: regra que decide gasto
 * e cobertura precisa ser conferível em teste, não observável só em produção.
 */

/** O que sabemos de um edital já processado antes. */
export type RegistroDeDocumentos = {
  /** Assinatura da lista de documentos na última vez em que baixamos. */
  assinatura: string;
  /** Quando os documentos foram baixados, ISO. */
  baixadoEm: string;
};

/** Um documento como o PNCP o anuncia, antes de qualquer download. */
export type DocumentoAnunciado = {
  /** Identificador do documento dentro da compra. */
  sequencial: number;
  titulo: string;
  /** Data de publicação no PNCP, ISO. Muda quando o órgão republica. */
  publicadoEm: string | null;
  ativo: boolean;
};

export type Decisao =
  | { baixar: true; motivo: "nunca-baixado" | "documentos-mudaram" }
  | {
      baixar: false;
      motivo: "ja-temos" | "sem-documento" | "fora-da-triagem" | "encerrado";
    };

/**
 * A assinatura da lista de documentos de um edital.
 *
 * É o que responde "mudou alguma coisa desde a última vez?" sem baixar nada.
 * Considera sequencial, título e data de publicação de cada documento ativo:
 * um anexo novo muda a lista, e uma **republicação do mesmo anexo** muda a data
 * — que é o caso que importa, porque retificação costuma vir assim, com o
 * mesmo título e conteúdo diferente.
 *
 * Ordena antes de juntar porque a ordem devolvida pela API não é garantida, e
 * uma assinatura que mudasse com a ordem faria toda varredura parecer alteração
 * — devolvendo os 93,2% que este arquivo existe para cortar.
 *
 * Documento inativo fica de fora: ele não será baixado, então não deve
 * provocar redownload dos outros.
 */
export function assinarDocumentos(documentos: readonly DocumentoAnunciado[]): string {
  return documentos
    .filter((d) => d.ativo)
    .map((d) => `${d.sequencial}:${d.titulo}:${d.publicadoEm ?? ""}`)
    .sort()
    .join("|");
}

export type EntradaDaDecisao = {
  /** Documentos que o PNCP anuncia para este edital agora. */
  documentos: readonly DocumentoAnunciado[];
  /** O que já temos guardado, ou `null` se nunca baixamos. */
  registro: RegistroDeDocumentos | null;
  /**
   * O edital interessa a alguém?
   *
   * Quem responde isto é a triagem, não este módulo. Baixar edital que nenhuma
   * empresa veria é o desperdício que a arquitetura do produto já evita no
   * resto do pipeline — não faz sentido reintroduzi-lo aqui.
   */
  interessaAAlguem: boolean;
  /** Encerramento das propostas, ISO. Documento de certame encerrado não serve. */
  encerramentoProposta: string | null;
  agora: Date;
};

/**
 * Baixar os documentos deste edital agora?
 *
 * A ordem das perguntas é a ordem do custo: recusa primeiro o que dá para
 * recusar sem olhar nada, e só chega à comparação de assinatura quando as
 * outras portas já deixaram passar.
 */
export function decidir(entrada: EntradaDaDecisao): Decisao {
  const { documentos, registro, interessaAAlguem, encerramentoProposta, agora } = entrada;

  /*
   * Encerrado antes de tudo, inclusive antes da triagem.
   *
   * Um edital cujo prazo passou não vira oportunidade para ninguém, e baixar
   * 4 MB para analisar o que já não dá para disputar é gasto pelo gasto. A
   * comparação é com o INSTANTE de encerramento, não com o dia: um pregão que
   * fecha às 9h da manhã já não aceita proposta às 10h.
   */
  if (encerramentoProposta) {
    const fim = Date.parse(encerramentoProposta);
    // Data ilegível não encerra nada: na dúvida seguimos, porque descartar por
    // causa de um campo malformado esconderia oportunidade real.
    if (!Number.isNaN(fim) && fim <= agora.getTime()) {
      return { baixar: false, motivo: "encerrado" };
    }
  }

  if (!interessaAAlguem) return { baixar: false, motivo: "fora-da-triagem" };

  const ativos = documentos.filter((d) => d.ativo);
  if (ativos.length === 0) return { baixar: false, motivo: "sem-documento" };

  if (!registro) return { baixar: true, motivo: "nunca-baixado" };

  return assinarDocumentos(ativos) === registro.assinatura
    ? { baixar: false, motivo: "ja-temos" }
    : { baixar: true, motivo: "documentos-mudaram" };
}
