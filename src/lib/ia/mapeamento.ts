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

/**
 * De operação nossa para `finalidade_da_ia`, o enum do banco.
 *
 * ## Por que é uma tabela, e não um `if`
 *
 * Era um `if` que traduzia `analise-de-edital` e deixava todo o resto passar
 * direto. Em 25/08 o primeiro lote que funcionou de ponta a ponta gravou as
 * duas análises e PERDEU as duas linhas de custo: `analise-de-edital-em-lote`
 * atravessou a tradução intacta e o Postgres recusou com
 * `invalid input value for enum finalidade_da_ia`.
 *
 * Análise salva e custo perdido é o pior par possível. A análise aparece na
 * tela, então tudo parece bem; o custo some, então o painel mostra a leitura
 * mais cara do sistema como se fosse de graça.
 *
 * Agora a tabela é fechada e `OperacaoDeIA` sai dela. Uma operação nova não
 * compila até alguém escrevê-la aqui — e escrevê-la aqui obriga a lembrar do
 * enum no banco, porque o teste ao lado compara as duas listas.
 *
 * ⚠️ Todo valor desta tabela precisa existir em `finalidade_da_ia`. Ao
 * acrescentar um, escreva a migração junto: `alter type finalidade_da_ia add
 * value if not exists '...'`.
 */
export const FINALIDADE_POR_OPERACAO = {
  "analise-de-edital": "analise_de_edital",
  /*
   * Finalidade PRÓPRIA, e não o rótulo da avulsa. Reaproveitar seria mais
   * fácil e ninguém notaria — mas a razão de o lote existir é custar metade, e
   * é esta separação que permite provar isso na fatura em vez de acreditar.
   */
  "analise-de-edital-em-lote": "analise_de_edital_em_lote",
  extracao: "extracao",
  embedding: "embedding",
  triagem: "triagem",
  redacao: "redacao",
} as const;

/** As operações que o sistema sabe registrar. Fora desta lista não compila. */
export type OperacaoDeIA = keyof typeof FINALIDADE_POR_OPERACAO;

export function finalidadeDaOperacao(operacao: OperacaoDeIA): string {
  return FINALIDADE_POR_OPERACAO[operacao];
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
