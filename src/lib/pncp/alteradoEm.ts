import { datarAlteracoes } from "../dominio/alteracao.ts";
import type { MunicipioAgregado } from "./agregarPorMunicipio.ts";
import { medidoEmDe, type AgregadoAnterior } from "./carregarUfAusente.ts";

/**
 * O agregado de hoje, com a data da última mudança de cada município.
 *
 * Conta como mudança o que a página do município mostra a partir desta linha:
 * os editais, o valor, os órgãos, as modalidades e os compradores. A data da
 * medição não conta. Ver `dominio/alteracao.ts`.
 *
 * Município carregado de UF ausente (`carregarUfAusente.ts`) tem os mesmos
 * números da gravação anterior e por isso mantém a data anterior, como deve:
 * ninguém o mediu de novo.
 */
export function comAlteradoEm(
  municipios: readonly MunicipioAgregado[],
  anterior: AgregadoAnterior | null,
  coletadoEm: string,
): MunicipioAgregado[] {
  return datarAlteracoes({
    atuais: municipios,
    anteriores: anterior?.municipios ?? [],
    conteudo: (m) => [m.editais, m.valor, m.orgaos, m.modalidades, m.compradores],
    desde: (m) => medidoEmDe(m, anterior?.coletadoEm ?? coletadoEm),
    mudouEm: (m) => m.medidoEm ?? coletadoEm,
  });
}
