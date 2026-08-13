/**
 * Prompt é código versionado, não literal solto.
 *
 * A razão é auditoria, e ela aparece no domínio: `AnaliseDoEdital` guarda
 * `versaoDoPrompt` e `modelo` (ver `dominio/tipos.ts`). Isso só tem valor se a
 * versão identificar um texto imutável. Um prompt editado no meio de um arquivo
 * de lógica muda sem deixar rastro, e aí duas análises com a mesma "versão"
 * foram feitas com instruções diferentes — o histórico vira ficção, e
 * reprocessar deixa de ser reproduzível.
 *
 * A disciplina é simples: **prompt em produção não se edita, se versiona.**
 * Ajuste vira `.v2`, o `.v1` continua no repositório, e o que já foi analisado
 * continua explicável.
 */
export type PromptVersionado<E> = {
  /** Estável entre versões. Ex.: `"analise-de-edital"`. */
  id: string;
  versao: number;
  /** `${id}.v${versao}` — o que é gravado junto da análise. */
  referencia: string;
  /** Instrução de sistema, quando o fornecedor tiver esse canal separado. */
  sistema: string;
  montar(entrada: E): string;
};
