import type { ConteudoDeEmail } from "../email/mensagens.ts";
import type { Edital } from "../fontes/tipos.ts";
import { selecionarParaLead, type PreferenciasDoLead } from "./lead.ts";
import { conteudoDeAlertaDiario } from "./mensagem-do-lead.ts";
import { interpretarRegiao } from "./regiao.ts";

/**
 * A decisão inteira sobre um lead, sem tocar em rede.
 *
 * Existe porque a alternativa era deixá-la dentro do script de envio, onde ela
 * ficaria misturada com `fetch`, `console.log` e código de saída — e portanto
 * sem teste. O que este arquivo decide não é detalhe de orquestração: é se uma
 * pessoa recebe ou não recebe e-mail hoje, e por quê. Essa é exatamente a parte
 * que precisa de teste, e a parte que um script torna intestável.
 *
 * O que sobra para o script depois disto é I/O puro: ler o snapshot, ler os
 * cadastros, mandar, gravar. Nenhuma regra.
 */

export type LeadDoEnvio = {
  email: string;
  cidade: string | null;
  /** Token de descadastro — vai no rodapé. */
  token: string;
};

/**
 * O que fazer com este lead hoje.
 *
 * Os três casos que não são "enviar" existem separados porque são coisas
 * diferentes para quem opera, e achatá-las num `null` esconderia justamente o
 * que precisa ser visto:
 *
 * - `sem-novidade` é o funcionamento normal e esperado — a promessa das
 *   boas-vindas é que dia sem edital novo é dia sem e-mail;
 * - `regiao-ilegivel` é matéria-prima de produto: um punhado de
 *   "regiao metropolitana de X" repetido é o sinal de que falta um campo no
 *   formulário, e esse sinal só existe se alguém contar.
 */
export type PlanoDeEnvio =
  | { tipo: "enviar"; conteudo: ConteudoDeEmail; editaisIds: string[] }
  | { tipo: "sem-novidade" }
  | { tipo: "regiao-ilegivel"; textoDaCidade: string };

export function planejarEnvio(
  lead: LeadDoEnvio,
  editais: Edital[],
  jaEnviados: ReadonlySet<string>,
  agora: Date = new Date(),
  preferencias?: PreferenciasDoLead,
): PlanoDeEnvio {
  const regiao = interpretarRegiao(lead.cidade);
  if (!regiao) return { tipo: "regiao-ilegivel", textoDaCidade: lead.cidade ?? "" };

  const selecao = selecionarParaLead(editais, regiao, jaEnviados, preferencias, agora);
  if (selecao.vazio) return { tipo: "sem-novidade" };

  return {
    tipo: "enviar",
    conteudo: conteudoDeAlertaDiario({
      email: lead.email,
      tokenDeDescadastro: lead.token,
      // `rotulo`, e não `original`: é o que o leitor vê no assunto, e
      // "2 editais abertos em recife/pe" lê como defeito.
      regiao: regiao.rotulo,
      selecao,
    }),
    // Os ids que vão ser gravados como enviados. Saem da seleção, e não do
    // conteúdo, para não haver como registrar um edital que não entrou no
    // e-mail — que produziria silêncio permanente sobre aquele certame.
    editaisIds: selecao.itens.map((i) => i.edital.id),
  };
}
