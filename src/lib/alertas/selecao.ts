import type { ResumoDaOportunidade } from "../dados/porta";
import { diasAteEncerrar } from "../pncp/normaliza";

/**
 * Quem merece virar alerta — e, principalmente, quem não merece.
 *
 * Um produto de alerta morre de um jeito só: mandando coisa demais. O cliente
 * para de abrir, e quando o edital certo finalmente chega, ele já não lê. Por
 * isso a pergunta que este arquivo responde não é "o que houve hoje?", e sim
 * "o que muda a decisão de alguém hoje?".
 *
 * A diferença prática entre "Novo edital publicado" e
 * "R$ 420 mil, aderência 94, prazo 3 dias, 90% da documentação aparentemente em
 * ordem" é a diferença entre notificação e produto.
 */

export type PreferenciasDeAlerta = {
  /** Score a partir do qual uma oportunidade pode ser alertada. */
  scoreMinimo: number;
  /** Teto de itens por envio. Alerta longo não é lido. */
  maximoPorEnvio: number;
  /** Avisar quando o prazo de algo salvo estiver acabando. */
  avisarPrazoDeSalvas: boolean;
  /** Mandar mensagem mesmo quando não houver nada. Padrão: não. */
  enviarQuandoVazio: boolean;
};

export const PREFERENCIAS_PADRAO: PreferenciasDeAlerta = {
  // 70 é o piso da faixa "boa" no motor de score. Abaixo disso a oportunidade
  // continua na lista do painel — ela só não interrompe o dia de ninguém.
  scoreMinimo: 70,
  maximoPorEnvio: 5,
  avisarPrazoDeSalvas: true,
  enviarQuandoVazio: false,
};

export type MotivoDoAlerta =
  | "alta_aderencia"
  | "prazo_acabando"
  | "salva_com_prazo_curto";

export type ItemSelecionado = {
  oportunidade: ResumoDaOportunidade;
  motivo: MotivoDoAlerta;
  /** Ordena o envio. Maior primeiro. Não aparece para o usuário. */
  prioridade: number;
};

export type SelecaoDeAlerta = {
  itens: ItemSelecionado[];
  /**
   * Quantas oportunidades foram deliberadamente deixadas de fora. A tela e o
   * rodapé do e-mail mostram isso: silêncio sem explicação parece falha do
   * sistema, e o cliente precisa saber que a triagem trabalhou.
   */
  descartadas: number;
  /** `true` quando não há nada que justifique interromper o cliente. */
  vazio: boolean;
};

export function selecionarParaAlerta(
  oportunidades: ResumoDaOportunidade[],
  preferencias: PreferenciasDeAlerta = PREFERENCIAS_PADRAO,
  agora: Date = new Date(),
  /**
   * Ids de oportunidade já alertados nesta janela, um `${id}|${motivo}` por
   * combinação (a mesma oportunidade pode alertar de novo por um motivo
   * diferente — "ficou urgente" depois de "aderência alta" é notícia nova).
   *
   * Sem isto, nada aqui muda `situacao` depois de alertar: uma oportunidade
   * que segue "nova" ou "vista" — porque o cliente ainda não abriu, salvou ou
   * descartou — seria selecionada de novo no próximo envio, e no seguinte, até
   * alguém agir. O e-mail de lead já tem essa guarda (`jaEnviados`, gravada em
   * `envios_de_alerta`); este é o mesmo desenho para o alerta por empresa.
   */
  jaAlertados: ReadonlySet<`${string}|${MotivoDoAlerta}`> = new Set(),
): SelecaoDeAlerta {
  const selecionados: ItemSelecionado[] = [];

  for (const oportunidade of oportunidades) {
    const { score, recomendacao } = oportunidade.avaliacao;
    const dias = diasAteEncerrar(oportunidade.edital, agora);

    // Encerrado não vira alerta em nenhuma hipótese. Avisar sobre um certame
    // que já passou é o alerta mais irritante que existe.
    if (dias !== null && dias < 0) continue;
    if (oportunidade.situacao === "descartada") continue;

    if (
      preferencias.avisarPrazoDeSalvas &&
      oportunidade.situacao === "salva" &&
      dias !== null &&
      dias <= 3 &&
      !jaAlertados.has(`${oportunidade.id}|salva_com_prazo_curto`)
    ) {
      selecionados.push({
        oportunidade,
        motivo: "salva_com_prazo_curto",
        // Acima de tudo: o cliente já demonstrou interesse e está prestes a
        // perder o prazo por esquecimento. É o alerta de maior valor do produto.
        prioridade: 1000 - dias,
      });
      continue;
    }

    // Sem score não há alerta. Uma oportunidade que não pôde ser avaliada
    // aparece no painel com o motivo, mas não interrompe ninguém: mandar
    // "talvez sirva, não sabemos" por e-mail é ruído com aparência de sinal.
    if (score.valor === null) continue;
    if (recomendacao.nivel === "nao_recomendada") continue;
    if (score.valor < preferencias.scoreMinimo) continue;
    if (oportunidade.situacao !== "nova" && oportunidade.situacao !== "vista") continue;

    if (recomendacao.urgente) {
      if (jaAlertados.has(`${oportunidade.id}|prazo_acabando`)) continue;
      selecionados.push({
        oportunidade,
        motivo: "prazo_acabando",
        prioridade: 500 + score.valor,
      });
      continue;
    }

    if (jaAlertados.has(`${oportunidade.id}|alta_aderencia`)) continue;
    selecionados.push({
      oportunidade,
      motivo: "alta_aderencia",
      prioridade: score.valor,
    });
  }

  selecionados.sort((a, b) => b.prioridade - a.prioridade);
  const itens = selecionados.slice(0, preferencias.maximoPorEnvio);

  return {
    itens,
    descartadas: oportunidades.length - itens.length,
    vazio: itens.length === 0,
  };
}
