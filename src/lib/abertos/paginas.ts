import type { UfAberta } from "./tipos.ts";

/**
 * Quantos editais uma UF precisa ter na amostra para ganhar página própria.
 *
 * O mesmo princípio do portão de `regioes.ts`: uma página de listagem sem
 * listagem não é uma página, é uma URL. E URL vazia indexada custa autoridade
 * de domínio sem devolver nada.
 *
 * Isto também resolve sozinho o primeiro dia: o retrato semeado nasce com as
 * contagens das 27 UFs e sem amostra por UF, então nenhuma página de estado é
 * gerada até a primeira coleta preencher. Nada aparece quebrado no caminho —
 * as páginas simplesmente passam a existir quando têm o que mostrar.
 */
export const MINIMO_PARA_TER_PAGINA = 3;

export function temPaginaDeUf(uf: UfAberta): boolean {
  return uf.editais.length >= MINIMO_PARA_TER_PAGINA;
}
