/**
 * A superfície pública da camada de e-mail.
 *
 * Curta de propósito, pelo mesmo motivo de `ia/index.ts`: quem dispara e-mail
 * precisa de uma mensagem pronta e de um provedor. Exportar a máquina interna é
 * como o acoplamento nasce — alguém importa `resend.ts` direto "só desta vez", e
 * a promessa de trocar de fornecedor sem reescrever o sistema morre ali.
 *
 * O que sai daqui:
 *   - `mensagemDeConfirmacao` / `mensagemDeBoasVindas`: as duas mensagens, já em
 *     HTML e texto puro, prontas para `ProvedorDeEmail.enviar`.
 *   - o contrato `ProvedorDeEmail` e seus tipos, para escrever outro fornecedor.
 *   - `criarProvedorResend`: o wiring padrão.
 *   - `urlDeDescadastro`: quem monta a página de saída precisa da mesma forma de
 *     URL que o rodapé usa, e duas versões dela divergiriam.
 *
 * Nota de fronteira: este módulo é de SERVIDOR. `resend.ts` declara
 * `import "server-only"` e isso se propaga por quem importa daqui, de propósito
 * — `RESEND_API_KEY` não tem o que fazer num bundle de cliente, e a barreira do
 * bundler avisa em tempo de build em vez de em produção.
 */

export {
  REMETENTE_PADRAO,
  remetente,
  type Mensagem,
  type ProvedorDeEmail,
  type ResultadoDeEnvio,
} from "./tipos";

export {
  conteudoDeBoasVindas,
  conteudoDeConfirmacao,
  emHtml,
  emTextoSimples,
  LIMITES,
  mensagemDeBoasVindas,
  mensagemDeConfirmacao,
  urlDeDescadastro,
  type ConteudoDeEmail,
  type DadosDaConfirmacao,
  type DadosDeBoasVindas,
} from "./mensagens";

export { criarProvedorResend, chaveDoResend, type OpcoesDoProvedorResend } from "./resend";
