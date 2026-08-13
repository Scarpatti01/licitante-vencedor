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

/**
 * `Edital` MUDOU DE CASA: agora mora em `src/lib/fontes/tipos.ts`.
 *
 * Ele nunca foi um tipo do PNCP — é o registro do projeto, e o PNCP é apenas a
 * primeira fonte a produzi-lo. Deixá-lo aqui obrigava todo consumidor a
 * importar de `pncp/` para falar de um edital que amanhã pode vir de outro
 * portal, e era o acoplamento errado exatamente no tipo mais central.
 *
 * O reexport fica porque quem já importava daqui continua funcionando — e
 * porque, sendo `export type`, ele some na compilação: não cria dependência de
 * runtime de `pncp/` para `fontes/`.
 */
export type { Edital } from "../fontes/tipos";
