import type { Campo } from "./procedencia.ts";
import type { Edital } from "../pncp/tipos.ts";

/**
 * O vocabulário do produto.
 *
 * Três coisas diferentes que é fácil confundir e caro confundir:
 *
 *   `Edital`            — o que a fonte publicou. Vem da coleta, é igual para todo mundo.
 *   `AnaliseDoEdital`   — o que conseguimos ler do edital. Continua igual para todo mundo.
 *   `Oportunidade`      — o cruzamento do edital com UMA empresa. É por cliente.
 *
 * A separação é o que permite analisar um edital uma única vez e reaproveitar
 * a análise para todos os clientes — o custo de IA por edital é fixo em vez de
 * multiplicado pelo número de assinantes. Também é o que faz o flywheel de
 * dados funcionar: a análise é ativo do produto, a oportunidade é do cliente.
 */

export type Porte = "mei" | "me" | "epp" | "media" | "grande";

/** Um documento que a empresa declara ter — e o que sabemos sobre ele. */
export type DocumentoDaEmpresa = {
  /** Chave estável, usada para casar com a exigência do edital. */
  tipo: TipoDeDocumento;
  /** Como a empresa chamou o documento, quando o nome dela importa. */
  descricao: string | null;
  /**
   * Validade declarada, quando existe. `null` significa "sem validade" OU
   * "não informada" — a diferença está em `semValidade`, porque tratar as duas
   * como a mesma coisa faria certidão vencida passar por documento perene.
   */
  validoAte: string | null;
  semValidade: boolean;
  /** `true` só quando um arquivo foi de fato anexado. Declaração não é anexo. */
  arquivoAnexado: boolean;
};

/**
 * Tipos de documento que o produto entende.
 *
 * Lista fechada de propósito: é ela que permite casar exigência do edital com
 * documento da empresa sem depender de comparação de texto livre, que erra.
 * `outro` existe para não perder o que não se encaixa — e o que cai muito em
 * `outro` é sinal de que falta um tipo aqui.
 */
export const TIPOS_DE_DOCUMENTO = [
  "certidao_federal",
  "certidao_estadual",
  "certidao_municipal",
  "fgts",
  "trabalhista_cndt",
  "falencia_concordata",
  "contrato_social",
  "balanco_patrimonial",
  "sicaf",
  "atestado_capacidade_tecnica",
  "registro_profissional_crea_cau",
  "certificacao_iso",
  "alvara_licenca",
  "declaracao_me_epp",
  "garantia_proposta",
  "amostra",
  "visita_tecnica",
  "outro",
] as const;

export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

export const NOME_DO_DOCUMENTO: Record<TipoDeDocumento, string> = {
  certidao_federal: "Certidão negativa federal (Receita/PGFN)",
  certidao_estadual: "Certidão negativa estadual",
  certidao_municipal: "Certidão negativa municipal",
  fgts: "Certificado de regularidade do FGTS",
  trabalhista_cndt: "Certidão negativa de débitos trabalhistas",
  falencia_concordata: "Certidão de falência e recuperação judicial",
  contrato_social: "Contrato social / estatuto",
  balanco_patrimonial: "Balanço patrimonial",
  sicaf: "Cadastro no SICAF",
  atestado_capacidade_tecnica: "Atestado de capacidade técnica",
  registro_profissional_crea_cau: "Registro no conselho profissional (CREA/CAU)",
  certificacao_iso: "Certificação ISO",
  alvara_licenca: "Alvará ou licença de funcionamento",
  declaracao_me_epp: "Declaração de ME/EPP",
  garantia_proposta: "Garantia de proposta",
  amostra: "Amostra ou prova de conceito",
  visita_tecnica: "Visita técnica / vistoria",
  outro: "Outro documento",
};

/**
 * O Perfil Inteligente da Empresa.
 *
 * É o lado do cruzamento que o cliente controla, e a qualidade dele determina a
 * qualidade de tudo que vem depois. Por isso o onboarding insiste em campos que
 * parecem burocráticos: sem região e sem faixa de ticket, recomendar vira
 * adivinhar.
 */
export type PerfilDaEmpresa = {
  empresaId: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  porte: Porte;
  /** Faturamento anual declarado, em reais. `null` quando a empresa não quis informar. */
  faturamentoAnual: number | null;

  /** CNAEs declarados, só dígitos (`"4120400"`). O principal vem primeiro. */
  cnaes: string[];
  /** Termos que descrevem o que a empresa vende, em linguagem de edital. */
  palavrasChave: string[];
  /** Termos que, se aparecerem no objeto, indicam que NÃO é para ela. */
  palavrasExcluidas: string[];

  /** UFs onde aceita executar. Vazio significa "sem restrição declarada". */
  ufsAtendidas: string[];
  /** Municípios (código IBGE) prioritários dentro das UFs. Opcional. */
  municipiosPrioritarios: string[];

  ticketMinimo: number | null;
  ticketMaximo: number | null;

  documentos: DocumentoDaEmpresa[];

  /** Experiência comprovável, para casar com exigência de atestado. */
  atestados: {
    objeto: string;
    valor: number | null;
    orgao: string | null;
    ano: number | null;
  }[];

  /** Modalidades que a empresa aceita disputar. Vazio = todas. */
  modalidadesAceitas: string[];

  atualizadoEm: string;
};

/**
 * Uma exigência lida do edital.
 *
 * `tipo` é o que permite cruzar com `DocumentoDaEmpresa` sem comparar texto.
 * `Campo` em volta de tudo porque exigência inventada é o pior erro possível
 * deste produto: manda a empresa correr atrás de documento que ninguém pediu,
 * ou pior, deixa de avisar sobre um que pediram.
 */
export type ExigenciaDoEdital = {
  tipo: TipoDeDocumento;
  /** Como o edital nomeou a exigência. */
  descricao: Campo<string>;
  /** `habilitacao` é eliminatória; `proposta` compõe o envelope; `execucao` vem depois de ganhar. */
  fase: "habilitacao" | "proposta" | "execucao";
  obrigatoria: Campo<boolean>;
};

/**
 * O que conseguimos estruturar de um edital. Uma vez por edital, não por cliente.
 *
 * Campos ausentes ficam como `desconhecido`, nunca como zero ou string vazia —
 * ver `procedencia.ts`. Quando a análise por IA não rodou (sem chave, custo
 * excedido, documento ilegível), `analisadoEm` é `null` e todos os campos
 * derivados de leitura ficam desconhecidos. O produto continua funcionando com
 * o que a coleta traz, e diz que a leitura profunda não aconteceu.
 */
export type AnaliseDoEdital = {
  editalId: string;
  /** `null` quando só existe o registro da coleta, sem leitura do documento. */
  analisadoEm: string | null;
  /** Identificação do prompt e do modelo, para reprocessar e auditar. */
  versaoDoPrompt: string | null;
  modelo: string | null;

  resumoExecutivo: Campo<string>;
  exigencias: ExigenciaDoEdital[];
  criterioDeJulgamento: Campo<string>;
  garantiaExigida: Campo<boolean>;
  visitaTecnicaExigida: Campo<boolean>;
  amostraExigida: Campo<boolean>;
  /** Riscos e pontos de atenção lidos do edital, cada um com sua procedência. */
  riscos: Campo<string>[];
  /** Quanto do edital foi efetivamente lido: `lista` = só metadados da coleta. */
  profundidade: "lista" | "documento_parcial" | "documento_completo";
};

/**
 * O cruzamento edital × empresa. É isto que o cliente vê e sobre o que ele age.
 *
 * `Oportunidade` não guarda cópia do edital nem da análise: guarda as
 * referências e o resultado do cruzamento. Assim, reprocessar a análise de um
 * edital atualiza todas as oportunidades derivadas dele sem migração de dados.
 */
export type Oportunidade = {
  id: string;
  empresaId: string;
  edital: Edital;
  analise: AnaliseDoEdital;
  avaliadoEm: string;
};

/** O que o usuário fez com a oportunidade. Alimenta o histórico e o aprendizado. */
export type SituacaoDaOportunidade =
  | "nova"
  | "vista"
  | "salva"
  | "descartada"
  | "em_preparacao"
  | "participada"
  | "vencida"
  | "perdida";
