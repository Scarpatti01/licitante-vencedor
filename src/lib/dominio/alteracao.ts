/**
 * Quando o conteúdo de uma linha mudou de verdade, e não quando foi medido.
 *
 * ## O defeito que isto resolve
 *
 * A coleta regrava `agregados.json` e `abertos.json` todo dia, e o sitemap
 * datava cada página de município pela hora da coleta. Em 22/11/2026 eram
 * 1.821 páginas com o mesmo `lastmod`, o minuto da coleta. Comparando as
 * coletas seguidas da semana, só 0% a 2% dos 4.154 municípios tinham mudado
 * qualquer número do agregado. O `lastmod` dizia "mudou hoje" sobre páginas
 * que não mudaram, e um campo que sempre diz isso ensina o rastreador a
 * ignorá-lo, inclusive no dia em que a página muda.
 *
 * A data "medido em" que a página mostra continua mudando todo dia, e deve:
 * ela diz quando o número foi conferido. Ela não é mudança de conteúdo.
 *
 * ## Como funciona
 *
 * Cada linha ganha `alteradoEm`. Se o que a página mostra daquela linha é
 * igual ao da gravação anterior, a data anterior é mantida. Se mudou, ou se a
 * linha é nova, vale a data de agora.
 *
 * Linha anterior gravada antes de `alteradoEm` existir não tem a data: `desde`
 * diz qual usar no lugar. É a data da medição anterior, que é o mais perto do
 * certo que dá para saber sem o histórico.
 */

type Linha = { uf: string; slug: string; alteradoEm?: string };

export function datarAlteracoes<T extends Linha>({
  atuais,
  anteriores,
  conteudo,
  desde,
  mudouEm,
}: {
  atuais: readonly T[];
  anteriores: readonly T[];
  /** O que a página mostra desta linha. Só mudança aqui conta como mudança. */
  conteudo: (linha: T) => unknown;
  /** A data da linha anterior que ainda não tinha `alteradoEm`. */
  desde: (anterior: T) => string;
  /** A data de uma linha que mudou ou é nova. */
  mudouEm: (atual: T) => string;
}): T[] {
  const porChave = new Map(anteriores.map((a) => [chave(a), a]));
  return atuais.map((atual) => {
    const anterior = porChave.get(chave(atual));
    const igual =
      anterior !== undefined && estavel(conteudo(anterior)) === estavel(conteudo(atual));
    const alteradoEm = igual ? (anterior.alteradoEm ?? desde(anterior)) : mudouEm(atual);
    return { ...atual, alteradoEm };
  });
}

function chave(l: Linha): string {
  return `${l.uf.toUpperCase()}/${l.slug}`;
}

/**
 * JSON com as chaves em ordem. `compradores` e `modalidades` são objetos, e a
 * ordem das chaves depende da ordem em que os editais chegaram: sem isto, a
 * mesma página com os mesmos números pareceria mudada.
 */
function estavel(valor: unknown): string {
  return JSON.stringify(valor, (_chave, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}
