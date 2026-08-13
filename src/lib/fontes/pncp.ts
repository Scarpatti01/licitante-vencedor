/**
 * O PNCP como UMA fonte, atrás da porta `FonteDeEditais`.
 *
 * Este arquivo é fino de propósito: o cliente HTTP, a normalização e os tipos
 * do PNCP continuam em `src/lib/pncp/` — testados, medidos contra a API real e
 * funcionando. Aqui só se declara o que a fonte é e se converte o DTO em
 * `Edital` no caminho, para quem consome nunca ver `ContratacaoPncp`.
 *
 * O que era responsabilidade do script e passou a ser da fonte: descartar
 * registro inutilizável. Antes cada consumidor precisava lembrar de chamar
 * `ehUtilizavel` — esquecer isso enfia linha suja no banco. Agora a fonte só
 * emite o que é utilizável e diz quantos descartou por `aoDescartar`.
 */

import { coletarEditaisAbertos } from "../pncp/cliente.ts";
import { ehUtilizavel, normalizarEdital } from "../pncp/normaliza.ts";
import type { Edital, FonteDeEditais, ParametrosDeColeta } from "./tipos.ts";

/** Nome curto e estável — vai para `Edital.fonte` e para a chave de dedup. */
export const NOME_FONTE_PNCP = "pncp";

export type ParametrosPncp = ParametrosDeColeta & {
  /** Instante da coleta, gravado em cada edital. Um só por rodada. */
  coletadoEm?: string;
  /**
   * Chamado a cada registro BRUTO recebido, antes de qualquer filtro.
   *
   * Contar o bruto do lado de fora não dá mais: quem consome só vê o que passou
   * pelo filtro, e "recebidos" é justamente a medida que mostra quanto a fonte
   * publica de registro incompleto.
   */
  aoReceber?: () => void;
  /** Chamado a cada registro recusado por `ehUtilizavel`, para o CLI contar. */
  aoDescartar?: (motivo: "campos-obrigatorios") => void;
};

/**
 * O PNCP é nacional por lei: qualquer UF é pedível. Ainda assim `cobre` existe
 * e é honesto — quando entrar uma fonte estadual, quem monta o plano de coleta
 * pergunta em vez de assumir.
 */
export const fontePncp: FonteDeEditais & {
  coletar(parametros: ParametrosPncp): AsyncGenerator<Edital>;
} = {
  nome: NOME_FONTE_PNCP,
  rotulo: "Portal Nacional de Contratações Públicas",
  ufsCobertas: "todas",
  filtraPorData: true,
  // Registro nacional obrigatório: quando o mesmo certame vier de dois portais,
  // a versão do PNCP é a que vale.
  precedencia: 100,

  cobre() {
    return true;
  },

  async *coletar(parametros: ParametrosPncp): AsyncGenerator<Edital> {
    const {
      uf,
      dataFinal,
      maxPaginas,
      aoProgredir,
      aoEsperar,
      aoReceber,
      aoDescartar,
      coletadoEm = new Date().toISOString(),
    } = parametros;

    if (!dataFinal) {
      // O endpoint de propostas abertas EXIGE `dataFinal`. Falhar aqui, com
      // nome, é melhor que deixar o PNCP responder 400 e o erro voltar como
      // "confira os parâmetros" sem dizer qual.
      throw new Error("fontePncp.coletar: `dataFinal` (yyyyMMdd) é obrigatório");
    }

    for await (const c of coletarEditaisAbertos({ uf, dataFinal, maxPaginas, aoProgredir, aoEsperar })) {
      aoReceber?.();
      if (!ehUtilizavel(c)) {
        aoDescartar?.("campos-obrigatorios");
        continue;
      }
      yield normalizarEdital(c, coletadoEm);
    }
  },
};
