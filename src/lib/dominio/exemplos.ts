import type { Edital } from "../pncp/tipos.ts";
import type { PerfilDaEmpresa } from "./tipos.ts";

/**
 * Dados SINTÉTICOS para teste e para as telas de desenvolvimento.
 *
 * Aviso que vale como regra do projeto: nada daqui pode vazar para uma tela de
 * produção nem para um e-mail. São registros inventados com a forma do dado
 * real — inclusive os casos ruins, que é o que interessa. O `id` de todos
 * começa com `EXEMPLO-` justamente para que qualquer vazamento seja evidente na
 * hora, e para dar um alvo fácil de asserção em teste.
 *
 * A lista cobre de propósito o que o "happy path" não cobre: valor ausente,
 * valor absurdo, prazo estourado, prazo de horas, objeto fora do ramo, contrato
 * grande demais para o porte da empresa.
 */

const BASE: Omit<Edital, "id" | "idNaFonte" | "objeto" | "valorEstimado" | "valorEstimadoBruto"> = {
  // A fonte sintética se declara como tal. Se um destes registros vazar para
  // uma tela de produção, o campo `fonte` denuncia na hora — mais confiável que
  // depender de alguém reparar no prefixo do `id`.
  fonte: "exemplo",
  orgao: {
    cnpj: "00000000000191",
    nome: "PREFEITURA MUNICIPAL DE EXEMPLO",
    esfera: "municipal",
  },
  local: { uf: "PE", municipio: "Recife", municipioSlug: "recife", codigoIbge: "2611606" },
  modalidade: "Pregão - Eletrônico",
  modoDisputa: "Aberto",
  instrumento: "Edital",
  amparoLegal: "Lei 14.133/2021, Art. 28, I",
  registroDePrecos: false,
  valorSuspeito: false,
  aberturaProposta: "2026-08-14T09:00:00-03:00",
  encerramentoProposta: "2026-09-15T14:00:00-03:00",
  publicadoEm: "2026-08-13T10:00:00-03:00",
  situacao: "Divulgada no PNCP",
  link: "https://pncp.gov.br/app/editais/00000000000191/2026/1",
  coletadoEm: "2026-08-14T06:10:00.000Z",
};

export const EDITAL_COMPATIVEL: Edital = {
  ...BASE,
  id: "EXEMPLO-COMPATIVEL",
  idNaFonte: "EXEMPLO-COMPATIVEL",
  objeto: "Contratação de empresa especializada em serviços de limpeza predial e conservação",
  valorEstimado: 480_000,
  valorEstimadoBruto: 480_000,
};

/** O órgão publicou sem valor — acontece em ~11% dos registros medidos. */
export const EDITAL_SEM_VALOR: Edital = {
  ...BASE,
  id: "EXEMPLO-SEM-VALOR",
  idNaFonte: "EXEMPLO-SEM-VALOR",
  objeto: "Contratação de serviços de limpeza predial",
  valorEstimado: null,
  valorEstimadoBruto: 0,
};

/** Erro de digitação na fonte, do tipo que já apareceu na coleta real. */
export const EDITAL_VALOR_ABSURDO: Edital = {
  ...BASE,
  id: "EXEMPLO-VALOR-ABSURDO",
  idNaFonte: "EXEMPLO-VALOR-ABSURDO",
  objeto: "Aquisição de material de limpeza",
  valorEstimado: 77_840_000_000,
  valorEstimadoBruto: 77_840_000_000,
  valorSuspeito: true,
};

export const EDITAL_ENCERRADO: Edital = {
  ...BASE,
  id: "EXEMPLO-ENCERRADO",
  idNaFonte: "EXEMPLO-ENCERRADO",
  objeto: "Contratação de serviços de limpeza predial",
  valorEstimado: 300_000,
  valorEstimadoBruto: 300_000,
  encerramentoProposta: "2026-08-01T14:00:00-03:00",
};

export const EDITAL_URGENTE: Edital = {
  ...BASE,
  id: "EXEMPLO-URGENTE",
  idNaFonte: "EXEMPLO-URGENTE",
  objeto: "Contratação de empresa para limpeza e conservação de prédios públicos",
  valorEstimado: 220_000,
  valorEstimadoBruto: 220_000,
  encerramentoProposta: "2026-08-16T14:00:00-03:00",
};

export const EDITAL_OUTRO_RAMO: Edital = {
  ...BASE,
  id: "EXEMPLO-OUTRO-RAMO",
  idNaFonte: "EXEMPLO-OUTRO-RAMO",
  objeto: "Aquisição de medicamentos e insumos hospitalares para a rede municipal de saúde",
  valorEstimado: 900_000,
  valorEstimadoBruto: 900_000,
};

export const EDITAL_FORA_DA_REGIAO: Edital = {
  ...BASE,
  id: "EXEMPLO-FORA-DA-REGIAO",
  idNaFonte: "EXEMPLO-FORA-DA-REGIAO",
  objeto: "Contratação de serviços de limpeza predial",
  local: {
    uf: "RS",
    municipio: "Porto Alegre",
    municipioSlug: "porto-alegre",
    codigoIbge: "4314902",
  },
  valorEstimado: 400_000,
  valorEstimadoBruto: 400_000,
};

export const EDITAL_GRANDE_DEMAIS: Edital = {
  ...BASE,
  id: "EXEMPLO-GRANDE-DEMAIS",
  idNaFonte: "EXEMPLO-GRANDE-DEMAIS",
  objeto: "Contratação de serviços de limpeza predial para toda a rede estadual",
  valorEstimado: 24_000_000,
  valorEstimadoBruto: 24_000_000,
};

export const EDITAIS_DE_EXEMPLO: Edital[] = [
  EDITAL_COMPATIVEL,
  EDITAL_URGENTE,
  EDITAL_SEM_VALOR,
  EDITAL_VALOR_ABSURDO,
  EDITAL_ENCERRADO,
  EDITAL_OUTRO_RAMO,
  EDITAL_FORA_DA_REGIAO,
  EDITAL_GRANDE_DEMAIS,
];

/** Empresa madura: perfil completo, documentação em dia, atestados. */
export const PERFIL_COMPLETO: PerfilDaEmpresa = {
  empresaId: "EXEMPLO-EMPRESA-1",
  cnpj: "00000000000191",
  razaoSocial: "EXEMPLO SERVIÇOS DE LIMPEZA LTDA",
  nomeFantasia: "Exemplo Serviços",
  porte: "epp",
  faturamentoAnual: 3_600_000,
  cnaes: ["8121400"],
  palavrasChave: ["limpeza predial", "conservação", "material de limpeza"],
  palavrasExcluidas: ["medicamentos"],
  ufsAtendidas: ["PE", "AL", "PB"],
  municipiosPrioritarios: ["2611606"],
  ticketMinimo: 50_000,
  ticketMaximo: 2_000_000,
  documentos: [
    { tipo: "certidao_federal", descricao: null, validoAte: "2026-12-31", semValidade: false, arquivoAnexado: true },
    { tipo: "fgts", descricao: null, validoAte: "2026-11-30", semValidade: false, arquivoAnexado: true },
    { tipo: "trabalhista_cndt", descricao: null, validoAte: "2026-10-15", semValidade: false, arquivoAnexado: true },
    { tipo: "contrato_social", descricao: null, validoAte: null, semValidade: true, arquivoAnexado: true },
    { tipo: "balanco_patrimonial", descricao: "Exercício 2025", validoAte: null, semValidade: true, arquivoAnexado: true },
  ],
  atestados: [
    { objeto: "limpeza predial em unidades administrativas", valor: 620_000, orgao: "Prefeitura", ano: 2024 },
  ],
  modalidadesAceitas: [],
  atualizadoEm: "2026-08-14T00:00:00.000Z",
};

/** Empresa nova: onboarding pela metade. É o caso que mais aparece no início. */
export const PERFIL_INCOMPLETO: PerfilDaEmpresa = {
  ...PERFIL_COMPLETO,
  empresaId: "EXEMPLO-EMPRESA-2",
  razaoSocial: "EXEMPLO NOVA LTDA",
  nomeFantasia: null,
  porte: "me",
  faturamentoAnual: null,
  palavrasChave: [],
  palavrasExcluidas: [],
  ufsAtendidas: [],
  municipiosPrioritarios: [],
  ticketMinimo: null,
  ticketMaximo: null,
  documentos: [],
  atestados: [],
};

/** Empresa com documentação vencida ou sem anexo — o caso que o checklist existe para pegar. */
export const PERFIL_DOCUMENTACAO_RUIM: PerfilDaEmpresa = {
  ...PERFIL_COMPLETO,
  empresaId: "EXEMPLO-EMPRESA-3",
  razaoSocial: "EXEMPLO PENDENTE LTDA",
  documentos: [
    { tipo: "certidao_federal", descricao: null, validoAte: "2026-01-10", semValidade: false, arquivoAnexado: true },
    { tipo: "fgts", descricao: null, validoAte: null, semValidade: false, arquivoAnexado: false },
    { tipo: "contrato_social", descricao: null, validoAte: null, semValidade: true, arquivoAnexado: true },
  ],
};
