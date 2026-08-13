/**
 * A guarda que impede um dia ruim de apagar um dia bom.
 *
 * DEFEITO CORRIGIDO AQUI (coleta de 2026-08-13): `dados/agregados.json` é a
 * série temporal do produto — o commit diário É o histórico, e é dele que sai o
 * "valor licitado nos últimos 12 meses" da página regional, sem banco. O
 * workflow só verificava "o arquivo existe e mudou", então uma coleta de 150
 * editais em 2 UFs sobrescreveu, sem um aviso, a de 3.312 editais em 6 UFs do
 * dia anterior. Dado perdido em série temporal não volta: a janela de coleta é
 * "propostas abertas HOJE", e o que fechou ontem não é recoletável.
 *
 * O mecanismo escolhido é o mais simples que funciona, e a escolha é
 * deliberada: a coleta compara com o agregado que JÁ ESTÁ no diretório — que é,
 * por construção, o último agregado versionado, porque o workflow faz checkout
 * do repositório antes de coletar. Nada de banco, de API do GitHub ou de estado
 * fora do git. O git continua sendo a única fonte de verdade do histórico.
 *
 * Classificado o resultado, quem grava decide o caminho:
 *
 *   completa / parcial-aceitável — substitui `dados/agregados.json`. É commit.
 *   degradada                    — vai para `dados/parciais/`, e o agregado
 *                                  anterior fica intocado. Não é commit, e o
 *                                  workflow ANUNCIA em vez de passar batido.
 *
 * Uma coleta degradada não é lixo — ela é o retrato honesto de um dia em que o
 * PNCP esteve fora do ar, e serve para diagnóstico. O que ela não pode é passar
 * por retrato do país.
 */

import type { Cobertura } from "./cobertura.ts";

export type ClasseDeColeta = "completa" | "parcial-aceitavel" | "degradada";

/** O mínimo que dá para medir de um agregado, seja o novo ou o do disco. */
export type ResumoDeAgregado = {
  editais: number;
  municipios: number;
  /** UFs com pelo menos um edital no agregado. */
  ufs: string[];
};

export type Classificacao = {
  classe: ClasseDeColeta;
  /** Um por regra disparada, em português, pronto para o log e para o relatório. */
  motivos: string[];
  atual: ResumoDeAgregado;
  /** `null` na primeira coleta — não há o que proteger. */
  anterior: ResumoDeAgregado | null;
  /** `true` quando o agregado anterior deve ser PRESERVADO em vez de substituído. */
  preservarAnterior: boolean;
};

/** A forma mínima de um agregado; basta para medir, sem acoplar ao formato inteiro. */
export type AgregadoMedivel = {
  municipios?: { uf?: string; editais?: number }[] | null;
};

export function resumirAgregado(agregado: AgregadoMedivel | null | undefined): ResumoDeAgregado {
  const municipios = agregado?.municipios ?? [];
  return {
    editais: municipios.reduce((a, m) => a + (m.editais ?? 0), 0),
    municipios: municipios.length,
    ufs: [...new Set(municipios.filter((m) => (m.editais ?? 0) > 0).map((m) => m.uf ?? ""))]
      .filter(Boolean)
      .sort(),
  };
}

export type OpcoesDeGuarda = {
  /**
   * Fração do total anterior abaixo da qual a coleta é degradada.
   *
   * 0,6 e não 0,95: o volume de propostas abertas oscila de verdade entre dias
   * — feriado, fim de mês, lote grande publicado de uma vez. Um limiar apertado
   * transformaria variação normal em alarme diário, e alarme diário é alarme
   * ignorado. O caso que precisa ser pego é o catastrófico: 13/08 entregou 4,5%
   * do dia anterior, uma ordem de grandeza abaixo de qualquer limiar razoável.
   */
  limiarDeVolume?: number;
};

/**
 * Decide se esta coleta pode substituir a anterior.
 *
 * Duas regras, e as duas olham para o dado, não para o processo:
 *
 *  1. UF QUE SUMIU. Uma UF que tinha editais no agregado anterior e não tem
 *     nenhum agora é perda de série inteira daquela UF. Isso vale mesmo com
 *     volume total alto: um dia em que CE explode e RN some não é um bom dia.
 *  2. VOLUME DESPENCOU. Total abaixo de `limiarDeVolume` do anterior.
 *
 * O estado da cobertura NÃO decide sozinho, de propósito. Uma UF pode terminar
 * "completa" e ainda assim ter vindo vazia por bug da fonte, e uma UF parcial
 * pode ter trazido 98% do que trouxe ontem. Quem manda é o resultado medido; a
 * cobertura entra para separar "completa" de "parcial aceitável" no rótulo.
 */
export function classificarColeta(entrada: {
  cobertura: Cobertura;
  atual: ResumoDeAgregado;
  anterior: ResumoDeAgregado | null;
  opcoes?: OpcoesDeGuarda;
}): Classificacao {
  const { cobertura, atual, anterior } = entrada;
  const limiar = entrada.opcoes?.limiarDeVolume ?? 0.6;
  const motivos: string[] = [];

  if (!anterior || anterior.editais === 0) {
    // Primeira coleta (ou primeiro agregado não vazio): não há série a
    // proteger, e recusar a gravação aqui deixaria o produto sem dado nenhum.
    const classe: ClasseDeColeta = cobertura.completa ? "completa" : "parcial-aceitavel";
    motivos.push(
      anterior
        ? "não há agregado anterior com editais para comparar — nada a proteger"
        : "não há agregado anterior — primeira coleta",
    );
    if (!cobertura.completa) motivos.push(descreverCobertura(cobertura));
    return { classe, motivos, atual, anterior, preservarAnterior: false };
  }

  const sumiram = anterior.ufs.filter((uf) => !atual.ufs.includes(uf));
  if (sumiram.length > 0) {
    motivos.push(
      `${sumiram.length} UF(s) presentes no agregado anterior não têm nenhum edital nesta coleta: ${sumiram.join(", ")}`,
    );
  }

  const razao = atual.editais / anterior.editais;
  if (razao < limiar) {
    motivos.push(
      `volume caiu para ${(razao * 100).toFixed(1)}% do agregado anterior (${atual.editais} contra ${anterior.editais} editais), abaixo do limiar de ${(limiar * 100).toFixed(0)}%`,
    );
  }

  if (motivos.length > 0) {
    return { classe: "degradada", motivos, atual, anterior, preservarAnterior: true };
  }

  if (cobertura.completa) {
    return {
      classe: "completa",
      motivos: [`${cobertura.ufsCompletas.length} UF(s) coletadas por inteiro`],
      atual,
      anterior,
      preservarAnterior: false,
    };
  }

  return {
    classe: "parcial-aceitavel",
    motivos: [
      descreverCobertura(cobertura),
      `volume em ${(razao * 100).toFixed(1)}% do anterior e nenhuma UF perdida — o agregado continua utilizável`,
    ],
    atual,
    anterior,
    preservarAnterior: false,
  };
}

function descreverCobertura(c: Cobertura): string {
  const partes: string[] = [];
  if (c.ufsParciais.length) partes.push(`${c.ufsParciais.length} UF(s) parcial(is)`);
  if (c.ufsComFalha.length) partes.push(`${c.ufsComFalha.length} UF(s) sem coleta`);
  return `cobertura incompleta: ${partes.join(" e ")}`;
}
