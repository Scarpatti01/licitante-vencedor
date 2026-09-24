/**
 * Quando o resumo diário pode sair.
 *
 * ## Por que isto existe
 *
 * A home promete: "Todo dia útil, às 7h, você recebe os editais". Até 24/09/2026
 * o resumo era disparado por um `schedule` do GitHub marcado para 10:00 UTC, que
 * é 07:00 em Brasília. Nos 12 dias úteis medidos de 08 a 23/09, ele chegou entre
 * 10h58 e 13h07 — todos os dias, com 4 a 6 horas de atraso. O conteúdo estava
 * certo; a hora, nunca.
 *
 * O atraso é do agendador do GitHub, que a própria documentação descreve como
 * sujeito a atraso sob carga. Mudar o horário do cron não resolveria: seria
 * apostar que o atraso fica igual, e no dia em que o GitHub fosse pontual o
 * cliente receberia e-mail de madrugada, possivelmente antes da coleta do dia.
 *
 * Então o gatilho mudou. O resumo passa a sair quando a COLETA termina — que é
 * o momento em que os dados do dia existem — e esta função decide se já pode
 * mandar, se precisa esperar, ou se não é hora de mandar nada.
 *
 * ## As regras
 *
 *   - Só de segunda a sexta, no dia de Brasília. A promessa é "dia útil".
 *   - Nunca antes das 07:00. Se a coleta terminar às 05:50, espera.
 *   - Nunca depois das 20:00. O que chegar depois vai no resumo de amanhã, que
 *     é onde iria de qualquer jeito: um e-mail às 22h com editais de licitação
 *     é interrupção, não serviço.
 *   - A espera tem teto. Um job do GitHub vive no máximo 6 horas, e uma espera
 *     maior que o teto é devolvida como `pular`, e não como erro: nesse caso a
 *     segunda coleta do dia, ou o agendamento de reserva, dispara de novo mais
 *     perto das 7h. Morrer no meio da espera não mandaria nada e ainda deixaria
 *     um X vermelho que ensina a ignorar X vermelho.
 *
 * ## Por que o fuso vem do Intl, e não de "-3 horas"
 *
 * O Brasil não tem horário de verão desde 2019, e `-03:00` fixo daria o mesmo
 * resultado hoje. O Intl é o que continua certo se o horário de verão voltar,
 * que já foi reinstituído antes por decreto, de um ano para o outro.
 */

const FUSO = "America/Sao_Paulo";

/** O que a home promete. */
export const HORA_DO_RESUMO = 7;

/** Depois disto, o que chegou vai no resumo do próximo dia útil. */
export const HORA_LIMITE = 20;

/**
 * Cabe no teto de 6 horas de um job do GitHub com folga para instalar,
 * baixar a classificação e enviar.
 */
export const ESPERA_MAXIMA_MS = 5.5 * 60 * 60 * 1000;

type Partes = {
  data: string;
  hora: number;
  minuto: number;
  segundo: number;
  /** 1 = segunda … 7 = domingo, como a ISO 8601. */
  diaDaSemana: number;
};

const DIAS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const formato = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

function partesEmBrasilia(instante: Date): Partes {
  const p = Object.fromEntries(formato.formatToParts(instante).map((x) => [x.type, x.value]));
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    hora: Number(p.hour),
    minuto: Number(p.minute),
    segundo: Number(p.second),
    diaDaSemana: DIAS[p.weekday as string],
  };
}

/** `YYYY-MM-DD` do dia em Brasília. */
export function diaEmBrasilia(instante: Date): string {
  return partesEmBrasilia(instante).data;
}

/** Os dois instantes caem no mesmo dia do calendário de Brasília? */
export function mesmoDiaEmBrasilia(a: Date, b: Date): boolean {
  return diaEmBrasilia(a) === diaEmBrasilia(b);
}

export type DecisaoDaJanela =
  | { acao: "enviar" }
  | { acao: "esperar"; ms: number; ate: string }
  | { acao: "pular"; motivo: string };

export function decidirJanelaDoResumo(
  agora: Date,
  esperaMaximaMs: number = ESPERA_MAXIMA_MS,
): DecisaoDaJanela {
  const p = partesEmBrasilia(agora);

  if (p.diaDaSemana >= 6) {
    return { acao: "pular", motivo: "fim de semana: o resumo sai de segunda a sexta" };
  }

  const segundosDoDia = p.hora * 3600 + p.minuto * 60 + p.segundo;

  if (segundosDoDia >= HORA_LIMITE * 3600) {
    return {
      acao: "pular",
      motivo: `depois das ${HORA_LIMITE}h em Brasília: o que chegou agora vai no resumo do próximo dia útil`,
    };
  }

  if (segundosDoDia >= HORA_DO_RESUMO * 3600) return { acao: "enviar" };

  const ms = (HORA_DO_RESUMO * 3600 - segundosDoDia) * 1000;

  if (ms > esperaMaximaMs) {
    return {
      acao: "pular",
      motivo:
        `cedo demais: faltam ${Math.ceil(ms / 60000)} min para as ${HORA_DO_RESUMO}h, mais do que ` +
        "a espera cabe num job. A próxima coleta ou o agendamento de reserva disparam mais perto",
    };
  }

  return { acao: "esperar", ms, ate: new Date(agora.getTime() + ms).toISOString() };
}
