/**
 * Procedência: de onde veio cada informação que o produto mostra.
 *
 * Esta é a primitiva mais importante do sistema, e ela existe por um motivo
 * comercial, não estético. O produto vende decisão sobre dinheiro: participar
 * ou não de um certame, gastar ou não uma semana montando proposta. Um número
 * errado apresentado com a mesma confiança de um número certo destrói o produto
 * na primeira vez que o cliente confere — e ele confere, porque o edital está
 * a um clique.
 *
 * Por isso nenhum valor circula solto aqui dentro. Todo campo carrega junto o
 * seu `origem`, e a interface é obrigada a mostrar essa diferença:
 *
 *   `edital`       — está escrito na fonte oficial. É fato, com evidência.
 *   `perfil`       — a própria empresa declarou. É fato sobre ela, não sobre o edital.
 *   `inferencia`   — nós deduzimos. Tem raciocínio, e PRECISA de confirmação.
 *   `desconhecido` — não foi possível determinar. Tem motivo, e não tem valor.
 *
 * A regra que nunca se quebra: `desconhecido` jamais vira `0`, `false`, `"—"` ou
 * qualquer outro valor de aparência inocente. Preencher lacuna com palpite de
 * cara confiante é pior que deixá-la aberta, porque o leitor não tem como saber
 * que foi palpite. Quando não dá para determinar, o produto diz que não dá.
 */

/** Quanta confiança cabe no que foi extraído ou inferido. */
export type Confianca = "alta" | "media" | "baixa";

export type CampoDoEdital<T> = {
  origem: "edital";
  valor: T;
  /** O trecho ou campo da fonte que sustenta o valor. Sem isso não é "do edital". */
  evidencia: string;
  confianca: Confianca;
};

export type CampoDoPerfil<T> = {
  origem: "perfil";
  valor: T;
  /** Qual informação declarada pela empresa foi usada. */
  evidencia: string;
};

export type CampoInferido<T> = {
  origem: "inferencia";
  valor: T;
  /** Como se chegou ao valor. Obrigatório: inferência sem raciocínio é chute. */
  raciocinio: string;
  confianca: Confianca;
  /** Sempre `true`. Existe para a interface não ter como esquecer o aviso. */
  precisaConfirmacao: true;
};

export type CampoDesconhecido = {
  origem: "desconhecido";
  valor: null;
  /** Por que não foi possível determinar. É isto que o usuário lê. */
  motivo: string;
};

/**
 * Um campo do produto: um valor mais a sua procedência.
 *
 * Repare que `CampoDesconhecido` não é genérico em `T` — é justamente o que
 * obriga quem consome a testar `origem` antes de usar `valor`. O compilador
 * passa a cobrar o que a disciplina sozinha esqueceria.
 */
export type Campo<T> =
  | CampoDoEdital<T>
  | CampoDoPerfil<T>
  | CampoInferido<T>
  | CampoDesconhecido;

export function doEdital<T>(
  valor: T,
  evidencia: string,
  confianca: Confianca = "alta",
): CampoDoEdital<T> {
  return { origem: "edital", valor, evidencia, confianca };
}

export function doPerfil<T>(valor: T, evidencia: string): CampoDoPerfil<T> {
  return { origem: "perfil", valor, evidencia };
}

export function inferido<T>(
  valor: T,
  raciocinio: string,
  confianca: Confianca = "media",
): CampoInferido<T> {
  return { origem: "inferencia", valor, raciocinio, confianca, precisaConfirmacao: true };
}

/**
 * O caso que o resto do mercado evita e que aqui é cidadão de primeira classe.
 *
 * O texto padrão é deliberadamente o mesmo em todo o produto: quando o usuário
 * ler "Não foi possível determinar com segurança", ele saberá exatamente o que
 * aquilo significa, em qualquer tela.
 */
export function desconhecido(motivo: string): CampoDesconhecido {
  return { origem: "desconhecido", valor: null, motivo };
}

export const NAO_DETERMINADO = "Não foi possível determinar com segurança.";

/** `true` quando há valor utilizável — o único jeito seguro de ler um `Campo`. */
export function temValor<T>(
  campo: Campo<T>,
): campo is CampoDoEdital<T> | CampoDoPerfil<T> | CampoInferido<T> {
  return campo.origem !== "desconhecido";
}

/** O valor, ou `null`. Para quando o chamador já tratou o caso ausente. */
export function valorOuNulo<T>(campo: Campo<T>): T | null {
  return temValor(campo) ? campo.valor : null;
}

/**
 * Rótulo curto de procedência, para a interface exibir junto do dado.
 *
 * Fica aqui, e não no componente, porque a redação é regra de produto: mudar
 * "Inferido" para algo que soe mais assertivo seria mudar o que prometemos.
 */
export function rotuloDeProcedencia(campo: Campo<unknown>): string {
  switch (campo.origem) {
    case "edital":
      return "Informado no edital";
    case "perfil":
      return "Declarado pela sua empresa";
    case "inferencia":
      return "Inferido — confirme antes de decidir";
    case "desconhecido":
      return "Não determinado";
  }
}

/** A justificativa por trás do campo, no formato que a interface mostra. */
export function explicacaoDeProcedencia(campo: Campo<unknown>): string {
  switch (campo.origem) {
    case "edital":
      return campo.evidencia;
    case "perfil":
      return campo.evidencia;
    case "inferencia":
      return campo.raciocinio;
    case "desconhecido":
      return campo.motivo;
  }
}
