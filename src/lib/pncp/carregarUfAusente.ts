import type { MunicipioAgregado } from "./agregarPorMunicipio.ts";

/**
 * A página de um município não some porque a NOSSA coleta falhou.
 *
 * ## O defeito, medido
 *
 * O relatório do Ahrefs de 02/09 mostrou visitas recebendo 404 em
 * `/licitacoes/pr/mandaguari/` e `/licitacoes/sp/sertaozinho/`. Testadas
 * depois, Sertãozinho respondia 200 de novo e Mandaguari continuava fora. As
 * duas são páginas que existiram, foram indexadas, sumiram e uma delas voltou.
 *
 * A causa é precisa. `registroDePublicacao.ts` já impede que uma página morra
 * por ter tido um dia mais fraco, mas ele só protege quem CONTINUA no agregado
 * com pelo menos um edital. Quando a UF inteira falha na coleta, os municípios
 * dela não aparecem no agregado de forma nenhuma: não são avaliados, não são
 * publicados, e viram 404 permanente por causa de `dynamicParams = false`.
 *
 * Nos dias 28 e 29/08 faltaram, entre outras, PR, RN, SC, AM, PA e PE. Cada UF
 * ausente apaga de uma vez todas as páginas de município daquele estado.
 *
 * ## Por que carregar a medição anterior, e não publicar página vazia
 *
 * "Não medimos hoje" e "aqui não se compra nada" são fatos diferentes, e só o
 * segundo justifica tirar a página do ar. Uma coleta que não alcançou o estado
 * não descobriu nada sobre o mercado dele: o que se sabia ontem continua sendo
 * o melhor que se sabe.
 *
 * Então a linha do município anterior é carregada adiante COM A DATA EM QUE FOI
 * MEDIDA, e não com a data de hoje. A página já cita a data em toda afirmação;
 * o que muda é que essa data passa a ser a do município, e não a da coleta.
 * Escrever a data de hoje sobre um número de ontem seria a mentira que este
 * módulo existe para evitar.
 *
 * ## Por que existe um prazo
 *
 * Número rotulado com a data certa é honesto, mas mercado descrito por uma
 * medição de um mês atrás deixa de descrever o presente mesmo dizendo quando
 * foi medido. Passado o prazo, a página volta a sair do ar: 404 é pior que uma
 * página desatualizada por dois dias, e melhor que uma por dois meses.
 */

/**
 * Por quantos dias uma medição continua valendo quando a UF não é coletada.
 *
 * Duas semanas cobre com folga o pior caso observado, que foram dois dias
 * seguidos de coleta degradada, e ainda deixa a página cair sozinha se um
 * estado parar de ser coletado de vez, em vez de congelar para sempre.
 */
export const DIAS_QUE_A_MEDICAO_VALE = 14;

export type AgregadoAnterior = {
  coletadoEm: string;
  municipios: MunicipioAgregado[];
};

/** Quando esta linha foi medida de verdade. */
export function medidoEmDe(m: MunicipioAgregado, coletadoEm: string): string {
  return m.medidoEm ?? coletadoEm;
}

function emDias(de: string, ate: Date): number {
  const quando = new Date(de).getTime();
  if (Number.isNaN(quando)) return Number.POSITIVE_INFINITY;
  return (ate.getTime() - quando) / 86_400_000;
}

/**
 * Os municípios que devem ser carregados da coleta anterior.
 *
 * Devolve só o que ACRESCENTAR: quem a coleta de hoje trouxe fica como está,
 * porque medição de hoje sempre ganha da de ontem.
 */
export function municipiosCarregados({
  municipiosDeHoje,
  anterior,
  ufsAusentes,
  agora,
  prazoEmDias = DIAS_QUE_A_MEDICAO_VALE,
}: {
  municipiosDeHoje: MunicipioAgregado[];
  anterior: AgregadoAnterior | null;
  ufsAusentes: string[];
  agora: Date;
  prazoEmDias?: number;
}): MunicipioAgregado[] {
  if (!anterior || ufsAusentes.length === 0) return [];

  const ausentes = new Set(ufsAusentes.map((uf) => uf.toUpperCase()));
  const jaTemHoje = new Set(
    municipiosDeHoje.map((m) => `${m.uf.toUpperCase()}/${m.slug}`),
  );

  const carregados: MunicipioAgregado[] = [];
  for (const m of anterior.municipios) {
    const uf = m.uf.toUpperCase();

    // Só UF que NÃO foi coletada. Se ela veio e o município saiu, isso é
    // notícia sobre o mercado, e o registro de publicação já decide o que
    // fazer com ela. Carregar aqui apagaria essa notícia.
    if (!ausentes.has(uf)) continue;
    if (jaTemHoje.has(`${uf}/${m.slug}`)) continue;

    const medidoEm = medidoEmDe(m, anterior.coletadoEm);
    if (emDias(medidoEm, agora) > prazoEmDias) continue;

    carregados.push({ ...m, medidoEm });
  }
  return carregados;
}
