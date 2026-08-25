import retrato from "../../../dados/abertos.json" with { type: "json" };
import type { RetratoDeAbertos, UfAberta } from "./tipos.ts";

/**
 * A leitura do retrato versionado.
 *
 * Mesmo padrão do agregado e dos posts: o arquivo é gravado pela coleta, entra
 * no repositório e vira página na build. A diferença é a validade — este
 * envelhece em horas, não em semanas, e por isso toda página que o usa é
 * obrigada a mostrar `COLETADO_EM`.
 */
const dados = retrato as RetratoDeAbertos;

export const COLETADO_EM: string = dados.coletadoEm;
export const TOTAIS = dados.totais;

export function ufsComAbertos(): UfAberta[] {
  return dados.ufs;
}

export function ufAberta(sigla: string): UfAberta | null {
  const alvo = sigla.toUpperCase();
  return dados.ufs.find((u) => u.uf === alvo) ?? null;
}

export function encerrandoAgora() {
  return dados.encerrandoAgora;
}

/**
 * Há quanto tempo o retrato foi tirado, em horas cheias.
 *
 * Serve para a página dizer "medido há 3 horas" em vez de só uma data — a
 * pergunta de quem chega é "isso está velho?", e um número de horas responde
 * melhor que um carimbo de tempo.
 */
export function horasDesdeAColeta(agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(COLETADO_EM).getTime()) / 3_600_000));
}
