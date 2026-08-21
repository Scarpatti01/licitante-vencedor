import type { ExecucaoDeIA } from "./custo.ts";

/**
 * `ExecucaoDeIA` virando a linha que `execucoes_de_ia` entende.
 *
 * Mesma razão de `triagem/mapeamento.ts` existir separado do script que grava:
 * um mapeamento que ignora uma restrição do banco não falha no teste, falha no
 * lote em produção — e aqui o `check (sucesso or erro is not null)` é
 * exatamente esse tipo de restrição silenciosa até a primeira falha real.
 */

export type ContextoDaExecucao = {
  /** `null` para análise de edital, que é compartilhada — ver `dominio/tipos.ts`. */
  empresaId: string | null;
  /** `null` quando a execução não se refere a um edital específico já persistido. */
  editalId: string | null;
};

/** `finalidade_da_ia` no banco — hoje só o que a leitura de edital produz. */
export function finalidadeDaOperacao(operacao: string): string {
  return operacao === "analise-de-edital" ? "analise_de_edital" : operacao;
}

export function execucaoParaLinha(execucao: ExecucaoDeIA, contexto: ContextoDaExecucao) {
  return {
    finalidade: finalidadeDaOperacao(execucao.operacao),
    empresa_id: contexto.empresaId,
    edital_id: contexto.editalId,
    modelo: execucao.modelo,
    versao_do_prompt: execucao.prompt,
    tokens_de_entrada: execucao.uso.entrada,
    tokens_de_saida: execucao.uso.saida,
    // `execucoes_de_ia` não tem coluna de tokens em cache além de `tokens_em_cache`,
    // e `UsoDeTokens` ainda não distingue cache — fica nula até existir prompt
    // caching de verdade, em vez de fingir zero (zero afirmaria "sem cache
    // usado", que é uma alegação diferente de "não medido").
    tokens_em_cache: null,
    // Centavos de DÓLAR, o mesmo que `estimarCusto` devolve — a fatura do
    // fornecedor é em dólar, e converter aqui obrigaria a tabela a saber de
    // câmbio, que muda todo dia e não é dela. A conversão para real acontece só
    // na hora de comparar com o teto (`tetoDeCusto.ts`), nunca na gravação.
    custo_em_centavos: execucao.custo.usd === null ? null : Math.round(execucao.custo.usd * 100),
    duracao_em_ms: execucao.duracaoMs,
    sucesso: execucao.resultado === "ok",
    resultado: null,
    // A restrição do banco exige mensagem em toda falha; sem motivo declarado
    // dizemos isso explicitamente em vez de mandar `null` e a linha ser
    // recusada sem ninguém entender por quê.
    erro: execucao.resultado === "falha" ? (execucao.motivo ?? "sem motivo declarado") : null,
  };
}
