import type { ContratacaoPncp } from "./tipos.ts";
import type { Edital } from "../fontes/tipos.ts";

/**
 * Converte o DTO do PNCP no registro que o projeto usa.
 *
 * Existe para o resto do código nunca falar o dialeto do PNCP. Se amanhã eles
 * renomearem um campo, o estrago fica contido neste arquivo.
 */

/**
 * O PNCP devolve data sem fuso — `"2026-08-12T14:00:00"` — e é horário de
 * Brasília. Passar essa string para `new Date()` faz o runtime interpretar como
 * horário LOCAL: na Vercel, que roda em UTC, o prazo de um edital atrasa três
 * horas e ninguém percebe até alguém perder um certame. Por isso o offset é
 * anexado explicitamente.
 *
 * `-03:00` fixo é correto: o Brasil extinguiu o horário de verão em 2019, então
 * não há mais alternância. Se voltar a existir, este é o ponto único a mudar.
 */
export function comFusoDeBrasilia(dataIngenua: string | null): string | null {
  if (!dataIngenua) return null;
  const limpa = dataIngenua.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(limpa)) return null;
  return `${limpa.slice(0, 19)}-03:00`;
}

/** Slug de município: sem acento, sem cedilha, hífen no lugar de espaço. */
export function slugDeMunicipio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const ESFERAS: Record<string, Edital["orgao"]["esfera"]> = {
  F: "federal",
  E: "estadual",
  M: "municipal",
  D: "distrital",
};

/**
 * `true` quando o registro tem o mínimo para virar página ou alerta.
 *
 * Sem UF, município ou prazo, o edital não entra em página regional nem em
 * e-mail — e entra como linha suja no banco. Melhor descartar na porta e
 * contar quantos foram descartados.
 */
export function ehUtilizavel(c: ContratacaoPncp): boolean {
  return Boolean(
    c?.numeroControlePNCP &&
      c.unidadeOrgao?.ufSigla &&
      c.unidadeOrgao?.municipioNome &&
      c.unidadeOrgao?.codigoIbge &&
      c.dataEncerramentoProposta,
  );
}

export function normalizarEdital(c: ContratacaoPncp, coletadoEm: string): Edital {
  const bruto = typeof c.valorTotalEstimado === "number" ? c.valorTotalEstimado : null;

  return {
    // Para o PNCP, chave canônica e id na fonte coincidem: o
    // `numeroControlePNCP` é identificador de registro NACIONAL, atribuído pelo
    // portal obrigatório da Lei 14.133/2021 — é a melhor chave canônica que
    // existe hoje. Numa fonte estadual isso não valerá, e é por isso que os
    // dois campos são separados: `idNaFonte` é o número do portal, e o `id`
    // canônico terá de ser derivado (`fonte:idNaFonte`) para não colidir.
    id: c.numeroControlePNCP,
    fonte: "pncp",
    idNaFonte: c.numeroControlePNCP,
    objeto: (c.objetoCompra ?? "").trim(),
    orgao: {
      cnpj: c.orgaoEntidade?.cnpj ?? "",
      nome: (c.orgaoEntidade?.razaoSocial ?? "").trim(),
      esfera: ESFERAS[c.orgaoEntidade?.esferaId ?? ""] ?? "desconhecida",
    },
    local: {
      uf: c.unidadeOrgao!.ufSigla!,
      municipio: c.unidadeOrgao!.municipioNome!,
      municipioSlug: slugDeMunicipio(c.unidadeOrgao!.municipioNome!),
      codigoIbge: c.unidadeOrgao!.codigoIbge!,
    },
    modalidade: c.modalidadeNome ?? "Não informada",
    modoDisputa: c.modoDisputaNome ?? null,
    instrumento: c.tipoInstrumentoConvocatorioNome ?? null,
    amparoLegal: c.amparoLegal?.nome ?? null,
    registroDePrecos: c.srp === true,
    // Ver a nota em `tipos.ts`: zero é "não informado" na prática.
    valorEstimado: bruto && bruto > 0 ? bruto : null,
    valorEstimadoBruto: bruto,
    // Definido em lote por `marcarValoresSuspeitos` — sozinho, um registro não
    // tem como saber se o próprio valor destoa do conjunto.
    valorSuspeito: false,
    aberturaProposta: comFusoDeBrasilia(c.dataAberturaProposta),
    encerramentoProposta: comFusoDeBrasilia(c.dataEncerramentoProposta),
    publicadoEm: comFusoDeBrasilia(c.dataPublicacaoPncp),
    situacao: c.situacaoCompraNome ?? null,
    link: `https://pncp.gov.br/app/editais/${c.orgaoEntidade.cnpj}/${c.anoCompra}/${c.sequencialCompra}`,
    coletadoEm,
  };
}

/**
 * Marca, no lote, os valores implausíveis — e devolve quantos foram.
 *
 * O corte é relativo ao próprio conjunto (múltiplo do percentil 99,9) em vez de
 * um teto fixo em reais, porque um teto fixo envelhece com a inflação e não
 * serve para UFs de portes diferentes. No piloto, qualquer multiplicador entre
 * 10 e 100 isolou exatamente o mesmo registro — o corte não é sensível à
 * escolha, que é o que faz dele uma regra e não um chute.
 *
 * O piso existe para lote pequeno: com poucos editais o percentil vira ruído, e
 * sem piso um município com três licitações marcaria a maior como suspeita.
 */
export function marcarValoresSuspeitos(
  editais: Edital[],
  { multiplicador = 20, piso = 1_000_000_000 } = {},
): { marcados: number; corte: number } {
  const valores = editais
    .map((e) => e.valorEstimado)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  if (valores.length < 100) return { marcados: 0, corte: Infinity };

  const p999 = valores[Math.floor(0.999 * (valores.length - 1))];
  const corte = Math.max(p999 * multiplicador, piso);

  let marcados = 0;
  for (const e of editais) {
    if (e.valorEstimado !== null && e.valorEstimado > corte) {
      e.valorSuspeito = true;
      marcados++;
    }
  }
  return { marcados, corte };
}

/** Soma que ignora valor suspeito. É esta que vai para página e para e-mail. */
export function somaConfiavel(editais: Edital[]): number {
  return editais.reduce((a, e) => a + (e.valorSuspeito ? 0 : (e.valorEstimado ?? 0)), 0);
}

/** Dias até o encerramento, a partir de um instante de referência. */
export function diasAteEncerrar(edital: Edital, agora: Date): number | null {
  if (!edital.encerramentoProposta) return null;
  const fim = new Date(edital.encerramentoProposta).getTime();
  if (Number.isNaN(fim)) return null;
  return Math.ceil((fim - agora.getTime()) / 86_400_000);
}
