/**
 * Catálogo de prompts.
 *
 * O ponteiro `PROMPT_DE_ANALISE_EM_USO` existe para que trocar a versão em
 * produção seja uma linha só, e para que o resto do código nunca importe uma
 * versão específica por engano. As versões antigas continuam exportadas: uma
 * análise gravada com `analise-de-edital.v1` precisa poder ser reproduzida com
 * o texto que a gerou, mesmo depois de a v2 existir.
 */
export type { PromptVersionado } from "./tipos.ts";
export {
  PROMPT_ANALISE_DE_EDITAL_V1,
  type EntradaDaAnalise,
  type PromptDeAnaliseDeEdital,
} from "./analise-de-edital.v1.ts";

import { PROMPT_ANALISE_DE_EDITAL_V1 } from "./analise-de-edital.v1.ts";

export const PROMPT_DE_ANALISE_EM_USO = PROMPT_ANALISE_DE_EDITAL_V1;
