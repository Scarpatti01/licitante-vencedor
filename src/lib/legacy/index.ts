import redirects from "./redirects.json";
import gone from "./gone.json";
import { GUIAS_PUBLICADOS, PAGINAS_FIXAS } from "../guias";

/**
 * Mapa de recuperação do acervo (2016–2025).
 *
 * Os endereços antigos redirecionam 301 para o hub do seu silo, e as páginas da
 * antiga área de assinante respondem 410. Conforme cada artigo for reescrito,
 * o endereço correspondente sai desta lista e volta a responder 200 com
 * conteúdo próprio. A contagem sai de `redirects.json`, nunca escrita aqui.
 *
 * **Por que isto existe — corrigido em 2026-08-12, com dado medido.**
 * O desenho original partia de que a URL antiga carregava link equity. A
 * verificação no Ahrefs mostrou que não carrega: dos 166 domínios de referência,
 * 162 apontam para a home, e as URLs do acervo somam 4 links no total. O perfil
 * é dominado por spam de venda de link acumulado enquanto o domínio esteve
 * caducado, e o DR do domínio é 0,4.
 *
 * Isto NÃO torna o mapa inútil, muda o motivo dele: o 301 existe para que quem
 * chegar por um link antigo encontre a página do mesmo assunto em vez de um 404,
 * e para não deixar buraco na malha. É decisão de experiência e de arquitetura,
 * não resgate de autoridade. Não reintroduza a justificativa de equity aqui.
 *
 * Nota de procedência: o inventário veio do Wayback, que só conhece o que
 * arquivou. `/jurisprudencia/atraso-injustificado-de-obra-publica-e-o-dever-de-
 * penalizacao/` só apareceu porque tinha backlink vivo no Ahrefs e respondia
 * 404 — pode haver outros endereços fora do inventário pelo mesmo motivo.
 */

export type LegacyRedirect = {
  source: string;
  destination: string;
  permanent: boolean;
};

/**
 * Hubs já publicados. Só os redirecionamentos que apontam para cá entram em
 * vigor. Deriva do catálogo em `../guias` para não existir uma segunda lista
 * capaz de discordar dele.
 */
export const HUBS_PUBLICADOS: readonly string[] = [
  ...GUIAS_PUBLICADOS.map((g) => g.href),
  ...PAGINAS_FIXAS,
];

export const LEGACY_REDIRECTS = redirects as LegacyRedirect[];
export const LEGACY_GONE = gone as string[];

/**
 * Um 301 para um hub que ainda não existe é um 404 com passo extra.
 * Este filtro é o que garante que só ativamos o que tem destino real.
 */
export function redirecionamentosAtivos(): LegacyRedirect[] {
  return LEGACY_REDIRECTS.filter((r) =>
    HUBS_PUBLICADOS.includes(r.destination),
  );
}

/**
 * Quantos endereços do acervo apontam para um destino.
 * É a contagem que a página de guias exibe — derivada do mapa, nunca digitada,
 * para não voltar a existir um número que discorda do `redirects.json`.
 */
export function urlsDoAcervo(destino: string): number {
  return LEGACY_REDIRECTS.filter((r) => r.destination === destino).length;
}
