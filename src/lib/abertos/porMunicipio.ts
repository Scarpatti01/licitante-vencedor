import type { ContagemDeAbertos, MunicipioAberto } from "./tipos.ts";

/**
 * As contagens de abertos agrupadas por cidade.
 *
 * Mora aqui, e não dentro de `scripts/publicar-abertos.ts`, pelo motivo de
 * sempre neste repositório: o que decide número que vai para a tela precisa de
 * teste, e script que fala com o banco não roda em teste.
 *
 * As réguas de "novo" e "encerra logo" chegam de fora, e é deliberado: são as
 * MESMAS funções que o agrupamento por UF usa, no mesmo instante da mesma
 * execução. Reimplementá-las aqui criaria dois lugares decidindo o que são
 * "últimas 24 horas", e eles divergem no primeiro dia em que um dos dois mudar.
 */
export type EditalParaContar = {
  local: { uf: string; municipioSlug: string | null };
};

export function contarPorMunicipio<T extends EditalParaContar>(
  editais: readonly T[],
  reguas: { ehNovo: (e: T) => boolean; encerraLogo: (e: T) => boolean },
): MunicipioAberto[] {
  const porChave = new Map<string, T[]>();

  for (const e of editais) {
    const { uf, municipioSlug } = e.local;
    /*
     * Sem slug não há página para o número ir, e derivar uma chave do nome
     * produziria cidade fantasma no arquivo. Some daqui, e o `null` de
     * `abertosNoMunicipio` cobre o caso na leitura.
     */
    if (!municipioSlug || !uf) continue;

    const chave = `${uf.toUpperCase()} ${municipioSlug}`;
    const lista = porChave.get(chave) ?? [];
    lista.push(e);
    porChave.set(chave, lista);
  }

  return [...porChave.entries()]
    .map(([chave, lista]): MunicipioAberto => {
      const [uf, slug] = chave.split(" ");
      const contagem: ContagemDeAbertos = {
        abertos: lista.length,
        novos: lista.filter(reguas.ehNovo).length,
        encerramEm24h: lista.filter(reguas.encerraLogo).length,
      };
      return { uf, slug, ...contagem };
    })
    .sort((a, b) => (a.uf === b.uf ? a.slug.localeCompare(b.slug) : a.uf.localeCompare(b.uf)));
}
