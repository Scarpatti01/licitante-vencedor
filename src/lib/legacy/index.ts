import redirects from "./redirects.json";
import gone from "./gone.json";
import { GUIAS_PUBLICADOS, PAGINAS_FIXAS } from "../guias";

/**
 * Mapa de recuperação do acervo (2016–2025).
 *
 * 338 endereços antigos redirecionam 301 para o hub do seu silo, e 7 páginas da
 * antiga área de assinante respondem 410. Conforme cada artigo for reescrito,
 * o endereço correspondente sai desta lista e volta a responder 200 com
 * conteúdo próprio.
 *
 * A regra que originou este desenho: a aquisição foi do domínio, não do
 * conteúdo. O que carrega o link equity é a URL, não o texto que estava nela —
 * então redirecionar agora preserva o valor sem criar página rasa nenhuma.
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
