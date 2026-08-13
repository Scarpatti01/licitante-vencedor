/**
 * A superfície pública da camada de IA.
 *
 * Deliberadamente curta: quase todo consumidor precisa de UMA função —
 * `analisarEdital` — e do registro de custo. O resto (segmentação, conferência
 * de evidência, adaptador do fornecedor) é máquina interna, e exportar máquina
 * interna é como um acoplamento nasce: alguém importa `gemini.ts` direto "só
 * desta vez", e a promessa de trocar de modelo sem reescrever o sistema morre
 * naquela linha.
 *
 * O que está exportado aqui e por quê:
 *   - `analisarEdital` / `analiseNaoRealizada`: o trabalho e o seu caso ausente.
 *   - a porta `ProvedorDeIA`: para escrever outro fornecedor sem tocar no resto.
 *   - `custo.ts`: quem chama precisa poder registrar e somar o que gastou.
 *   - `criarProvedorGemini`: o wiring padrão, para quem monta um script.
 *
 * Nota de fronteira: este módulo é de SERVIDOR. O adaptador do Gemini declara
 * `import "server-only"`, e isso se propaga por quem importa daqui — de
 * propósito. A chave de API não tem o que fazer num bundle de cliente, e a
 * barreira do bundler avisa disso em tempo de build, não em produção.
 */

export { analisarEdital, analiseNaoRealizada, type OpcoesDeAnalise } from "./analisar-edital";

export {
  gerarComRetentativa,
  ehTransitoria,
  PROVEDOR_INDISPONIVEL,
  type ModoDeFalha,
  type PedidoEstruturado,
  type ProvedorDeIA,
  type ResultadoDaGeracao,
  type UsoDeTokens,
} from "./provedor";

export {
  criarRegistroEmMemoria,
  estimarCusto,
  planejarExecucao,
  PRECOS_POR_MODELO,
  type CatalogoDeModelos,
  type CustoEstimado,
  type ExecucaoDeIA,
  type PlanoDeExecucao,
  type PrecoDoModelo,
  type RegistradorDeExecucao,
} from "./custo";

export { criarProvedorGemini, modelosGemini } from "./gemini";

export { PROMPT_DE_ANALISE_EM_USO } from "./prompts";

export {
  respostaDeAnaliseDeEdital,
  type RespostaDeAnaliseDeEdital,
} from "./schemas";
