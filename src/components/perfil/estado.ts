import type { ErrosDoFormulario } from "./leitura";

/**
 * O estado que um formulário do produto devolve.
 *
 * Fica num módulo próprio porque arquivo com `"use server"` só pode exportar
 * função assíncrona — a constante do estado inicial não cabe lá, e escondê-la
 * dentro do componente faria cada tela inventar o seu próprio formato de erro.
 *
 * Os quatro estados que a interface precisa saber distinguir estão todos
 * representados: `inicial` (nada aconteceu), `erro` (com os campos culpados),
 * `sucesso` (com o instante, para a tela não dizer "salvo" para sempre) e o
 * salvamento em andamento, que vem do `pending` do `useActionState` e não
 * precisa viajar pela rede.
 */
export type EstadoDoFormulario = {
  status: "inicial" | "sucesso" | "erro";
  mensagem: string | null;
  erros: ErrosDoFormulario;
  /** ISO do momento em que o servidor confirmou a gravação. */
  salvoEm: string | null;
};

export const ESTADO_INICIAL: EstadoDoFormulario = {
  status: "inicial",
  mensagem: null,
  erros: {},
  salvoEm: null,
};
