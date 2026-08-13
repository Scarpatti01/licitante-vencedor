/**
 * O ponto ÚNICO onde se decide que dois registros são o mesmo certame.
 *
 * Hoje só existe uma fonte, então este módulo praticamente não faz nada — e é
 * exatamente por isso que ele existe agora. Quando entrar o segundo portal, a
 * pergunta "o mesmo pregão publicado no PNCP e no portal do estado vira uma ou
 * duas linhas?" vai aparecer no meio de outra coisa, e a resposta tem de ter um
 * lugar, não ser improvisada dentro de um `for` do script — que é onde a dedup
 * morava até aqui (`porId.set(...)`, sem nome e sem teste).
 *
 * São DOIS problemas diferentes, e tratá-los como um só produz erro:
 *
 *  1. DENTRO de uma fonte: o mesmo registro reaparece entre páginas quando o
 *     PNCP reordena durante a coleta. O `idNaFonte` é o mesmo — dedup exata,
 *     sem heurística, sem risco. Medido no piloto de 2026-08-12.
 *
 *  2. ENTRE fontes: o mesmo certame com identificadores distintos, porque cada
 *     portal numera do seu jeito. Não há chave comum publicada, então a
 *     identidade só pode ser INFERIDA — e inferência erra nos dois sentidos.
 *     Fundir dois certames distintos some com um edital que a empresa poderia
 *     ganhar; não fundir duplica o alerta. O primeiro erro é pior, então a
 *     chave heurística é deliberadamente ESTREITA: só funde quando órgão,
 *     instante de encerramento e objeto batem.
 *
 * O que NÃO entra na chave heurística: valor (é o campo com erro de digitação
 * na fonte, ver `valorSuspeito`), modalidade (portais divergem no rótulo) e
 * município (o mesmo órgão às vezes é gravado com unidade diferente).
 */

import type { Edital } from "./tipos.ts";

/** Normalização de texto livre para comparação: sem acento, sem pontuação, sem caixa. */
function textoComparavel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * A chave que identifica um CERTAME, independente de quem o publicou.
 *
 * Objeto truncado em 120 caracteres porque portais reescrevem o final da
 * descrição (acrescentam "conforme edital", número de processo, unidade); o
 * começo, que diz o que está sendo comprado, é a parte estável.
 */
export function chaveDeDeduplicacao(e: Edital): string {
  return [
    e.orgao.cnpj,
    e.encerramentoProposta ?? "sem-prazo",
    textoComparavel(e.objeto).slice(0, 120),
  ].join("|");
}

export type ResultadoDeDeduplicacao = {
  editais: Edital[];
  /** Repetições do mesmo `id` — reordenação de páginas dentro de uma fonte. */
  repetidosNaFonte: number;
  /** Certames que apareceram em mais de uma fonte e viraram uma linha só. */
  fundidosEntreFontes: number;
};

/**
 * Reduz a lista a um edital por certame.
 *
 * A precedência decide quem sobrevive: entre fontes, vence a de maior
 * `precedencia` (o PNCP é o registro nacional obrigatório, então é ele). Sem
 * precedência declarada, vence o primeiro — estável e previsível.
 */
export function deduplicar(
  editais: Edital[],
  precedenciaPorFonte: Record<string, number> = {},
): ResultadoDeDeduplicacao {
  const porId = new Map<string, Edital>();
  let repetidosNaFonte = 0;

  // Passo 1 — exato, por id canônico. Sem heurística: aqui não há dúvida.
  for (const e of editais) {
    if (porId.has(e.id)) {
      repetidosNaFonte++;
      continue;
    }
    porId.set(e.id, e);
  }

  // Passo 2 — heurístico, só entre fontes DIFERENTES. Dois registros da mesma
  // fonte com ids distintos são dois certames: o portal não republica o mesmo
  // com outro número, e forçar a fusão aqui apagaria edital legítimo.
  const porCertame = new Map<string, Edital>();
  let fundidosEntreFontes = 0;

  for (const e of porId.values()) {
    const chave = chaveDeDeduplicacao(e);
    const atual = porCertame.get(chave);
    if (!atual) {
      porCertame.set(chave, e);
      continue;
    }
    if (atual.fonte === e.fonte) {
      // Mesma fonte, ids diferentes: são dois certames. A chave heurística não
      // manda aqui — o id manda. Desempata pelo id para o resultado não
      // depender da ordem de chegada.
      porCertame.set(`${chave}#${e.id}`, e);
      continue;
    }
    fundidosEntreFontes++;
    const vence =
      (precedenciaPorFonte[e.fonte] ?? 0) > (precedenciaPorFonte[atual.fonte] ?? 0) ? e : atual;
    porCertame.set(chave, vence);
  }

  return { editais: [...porCertame.values()], repetidosNaFonte, fundidosEntreFontes };
}
