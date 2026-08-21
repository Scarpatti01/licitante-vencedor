import type { MunicipioAgregado } from "./agregarPorMunicipio.ts";

/**
 * O portão de primeira publicação de um município.
 *
 * Separado de `regioes.ts` para `registroDePublicacao.ts` poder usá-lo sem
 * criar um ciclo de import — `regioes.ts` precisa do registro, e o registro
 * precisa deste portão para decidir quem entra nele.
 *
 * `MINIMO_DE_EDITAIS` — volume. Um edital não é um retrato do município; é uma
 *   coincidência da janela coletada.
 * `MINIMO_DE_ORGAOS` — variedade. Seis editais do mesmo órgão descrevem aquele
 *   órgão, não o município. É o critério que separa "aqui há um mercado" de
 *   "aqui houve uma compra".
 */
export const MINIMO_DE_EDITAIS = 5;
export const MINIMO_DE_ORGAOS = 2;

export function temLastro(m: Pick<MunicipioAgregado, "editais" | "orgaos">): boolean {
  return m.editais >= MINIMO_DE_EDITAIS && m.orgaos >= MINIMO_DE_ORGAOS;
}
