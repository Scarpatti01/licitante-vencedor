import { temLastro } from "./lastro.ts";
import type { MunicipioAgregado } from "./agregarPorMunicipio.ts";

/**
 * O registro de quem já passou pelo portão — a peça que faltava para uma
 * página não desaparecer no dia em que a coleta vê menos.
 *
 * ## O problema que este arquivo resolve
 *
 * `dados/agregados.json` é um retrato do INSTANTE: editais fecham, saem da
 * janela coletada, e o número de um município cai de um dia para o outro sem
 * que nada de errado tenha acontecido. Antes deste arquivo, `temLastro` era
 * conferido só contra o retrato de hoje — então um município podia passar 6
 * dias seguidos com lastro, ser indexado pelo Google, receber um clique real,
 * e no 7º dia, com a mesma legitimidade que tinha nos 6 anteriores, sumir:
 * `dynamicParams = false` faz `/licitacoes/<uf>/<slug>/` responder 404
 * permanente para todo visitante daquele dia em diante — inclusive quem
 * clicou num resultado de busca que o Google ainda não tinha atualizado.
 *
 * Foi exatamente o que aconteceu com Russas/CE e Feira Nova/PE: os dois
 * tiveram lastro de 15 a 20/08, apareceram no Search Console com impressão e
 * clique real (Feira Nova com 50% de CTR), e em 21/08 caíram para 1 e 3
 * editais — abaixo do portão — e passaram a responder 404.
 *
 * ## A regra
 *
 * Município que já teve lastro um dia fica no registro para sempre — este
 * arquivo só cresce, nunca remove uma linha. Mas ficar no registro não basta
 * para continuar publicado: `regioes.ts` ainda exige pelo menos 1 edital no
 * retrato de hoje (`PISO_STICKY_EM_EDITAIS`). Uma página com literalmente
 * zero contratação no momento não tem o que descrever — 404 continua sendo
 * mais honesto que uma página vazia com um título em cima.
 */

export type ChaveDeMunicipio = { uf: string; slug: string };

export type RegistroDePublicacao = { municipios: ChaveDeMunicipio[] };

export const REGISTRO_VAZIO: RegistroDePublicacao = { municipios: [] };

/**
 * Normaliza o registro na carga, na mesma linha de `regioes.ts:normalizar` —
 * entrada malformada é descartada, nunca vira `undefined` propagando adiante.
 */
export function normalizarRegistro(bruto: unknown): RegistroDePublicacao {
  const objeto = bruto as { municipios?: unknown } | null | undefined;
  if (!objeto || !Array.isArray(objeto.municipios)) return REGISTRO_VAZIO;

  const municipios = objeto.municipios.flatMap((linha): ChaveDeMunicipio[] => {
    const l = linha as Record<string, unknown>;
    if (typeof l?.uf !== "string" || !l.uf) return [];
    if (typeof l?.slug !== "string" || !l.slug) return [];
    return [{ uf: l.uf, slug: l.slug }];
  });

  return { municipios };
}

export function estaNoRegistro(
  registro: RegistroDePublicacao,
  m: Pick<MunicipioAgregado, "uf" | "slug">,
): boolean {
  return registro.municipios.some((c) => c.uf === m.uf && c.slug === m.slug);
}

/**
 * Une o registro com quem tem lastro no agregado de hoje. Só cresce.
 *
 * Ordenado (UF, depois slug) para o arquivo gravado ter diff estável — sem
 * isso, cada rodada reescreveria a ordem inteira e o histórico do arquivo no
 * git ficaria ilegível.
 */
export function atualizarRegistro(
  registro: RegistroDePublicacao,
  agregadoDeHoje: readonly MunicipioAgregado[],
): RegistroDePublicacao {
  const chaves = new Map<string, ChaveDeMunicipio>();
  for (const c of registro.municipios) chaves.set(`${c.uf}/${c.slug}`, c);
  for (const m of agregadoDeHoje) {
    if (temLastro(m)) chaves.set(`${m.uf}/${m.slug}`, { uf: m.uf, slug: m.slug });
  }

  return {
    municipios: [...chaves.values()].sort(
      (a, b) => a.uf.localeCompare(b.uf) || a.slug.localeCompare(b.slug),
    ),
  };
}
