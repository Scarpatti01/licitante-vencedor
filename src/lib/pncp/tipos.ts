/**
 * Tipos do Portal Nacional de Contratações Públicas.
 *
 * Derivados da resposta real da API em 2026-08-12, não do manual: o manual
 * descreve campos que a API devolve como `null` na prática, e omite alguns que
 * ela devolve. Onde os dois discordam, vale o que veio no fio.
 *
 * Spec: https://pncp.gov.br/api/consulta/v3/api-docs
 */

/** Envelope de paginação, igual em todos os endpoints de consulta. */
export type PaginaPncp<T> = {
  data: T[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
};

export type OrgaoEntidadePncp = {
  cnpj: string;
  razaoSocial: string;
  /** "N" = não se aplica, "E" = Executivo, "L" = Legislativo, "J" = Judiciário. */
  poderId: string | null;
  /** "F" = Federal, "E" = Estadual, "M" = Municipal, "D" = Distrital. */
  esferaId: string | null;
};

export type UnidadeOrgaoPncp = {
  ufNome: string | null;
  ufSigla: string | null;
  municipioNome: string | null;
  codigoIbge: string | null;
  codigoUnidade: string | null;
  nomeUnidade: string | null;
};

export type AmparoLegalPncp = {
  codigo: number | null;
  nome: string | null;
  descricao: string | null;
};

/**
 * Uma contratação como o PNCP devolve.
 *
 * Atenção nas datas: vêm SEM fuso (`"2026-08-12T14:00:00"`) e são horário de
 * Brasília. Passar isso direto para `new Date()` num servidor em UTC erra em
 * três horas — e o prazo de um edital é justamente o dado que não pode errar.
 * Por isso ficam como string aqui e a conversão é explícita em `normaliza.ts`.
 */
export type ContratacaoPncp = {
  numeroControlePNCP: string;
  objetoCompra: string | null;
  orgaoEntidade: OrgaoEntidadePncp;
  unidadeOrgao: UnidadeOrgaoPncp;
  amparoLegal: AmparoLegalPncp | null;
  modalidadeId: number | null;
  modalidadeNome: string | null;
  modoDisputaId: number | null;
  modoDisputaNome: string | null;
  situacaoCompraId: number | null;
  situacaoCompraNome: string | null;
  tipoInstrumentoConvocatorioNome: string | null;
  srp: boolean | null;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  dataPublicacaoPncp: string | null;
  dataAtualizacaoGlobal: string | null;
  anoCompra: number;
  sequencialCompra: number;
  numeroCompra: string | null;
  processo: string | null;
  linkSistemaOrigem: string | null;
  informacaoComplementar: string | null;
};

/** O registro que o projeto usa. Estável mesmo se o PNCP mexer no dele. */
export type Edital = {
  /** `numeroControlePNCP` — identificador canônico e chave de deduplicação. */
  id: string;
  objeto: string;
  orgao: {
    cnpj: string;
    nome: string;
    esfera: "federal" | "estadual" | "municipal" | "distrital" | "desconhecida";
  };
  local: {
    uf: string;
    municipio: string;
    municipioSlug: string;
    codigoIbge: string;
  };
  modalidade: string;
  modoDisputa: string | null;
  instrumento: string | null;
  amparoLegal: string | null;
  registroDePrecos: boolean;
  /**
   * Em reais. `null` quando o órgão não informou.
   *
   * O PNCP usa `0` para "não informado" e também aceita valores reais baixos —
   * há editais legítimos de R$ 0,01. Distinguir os dois é impossível pelo
   * endpoint de lista, então `0` vira `null` e fica registrado em
   * `valorEstimadoBruto` o que veio, para nada se perder.
   */
  valorEstimado: number | null;
  valorEstimadoBruto: number | null;
  /**
   * `true` quando o valor é implausível a ponto de contaminar qualquer soma.
   *
   * A fonte tem erro de digitação. No piloto de 2026-08-12 havia um pregão de
   * mobiliário declarado a R$ 77,84 bilhões — sozinho, 88% do total de seis
   * estados. Uma página que anuncia "R$ 81 bi licitados em Fortaleza" perde a
   * credibilidade exatamente onde ela deveria ser provada.
   *
   * O edital continua na listagem, porque existe de verdade e alguém pode
   * querer disputá-lo. O que ele não faz é entrar em agregado.
   */
  valorSuspeito: boolean;
  /** ISO 8601 com offset de Brasília, convertido de propósito. */
  aberturaProposta: string | null;
  encerramentoProposta: string | null;
  publicadoEm: string | null;
  situacao: string | null;
  /** Página pública no PNCP. Padrão verificado, não deduzido. */
  link: string;
  coletadoEm: string;
};
