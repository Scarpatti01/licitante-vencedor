/**
 * Como valor e prazo aparecem para quem lê — em qualquer alerta.
 *
 * Estas duas frases nasceram em `mensagem.ts`, privadas, e saíram de lá quando o
 * alerta do lead passou a precisar exatamente delas. A alternativa era uma
 * segunda cópia, e cópia de texto de produto é pior que cópia de código: as duas
 * versões divergem devagar, e um dia o mesmo edital sem valor aparece como
 * "o órgão não publicou valor estimado" num e-mail e "R$ 0,00" no outro. A
 * segunda frase é uma mentira sobre dinheiro público.
 *
 * Não é utilitário genérico de formatação, e não deve virar um: o que está aqui
 * são as duas decisões de vocabulário que o produto já tomou.
 */

/**
 * Valor estimado, do jeito que dá para afirmar.
 *
 * Os dois casos que não são número existem porque a fonte os produz de verdade:
 * o órgão que não publicou valor, e o órgão que publicou um valor com erro de
 * digitação (ver `Edital.valorSuspeito` — houve um pregão de mobiliário
 * declarado a R$ 77,84 bilhões). Mostrar "R$ 0,00" no primeiro caso e o número
 * absurdo no segundo são os dois jeitos de o e-mail perder a credibilidade na
 * única linha que o leitor confere.
 */
export function emReais(valor: number | null, suspeito: boolean): string {
  if (suspeito) return "valor publicado é implausível — confira no edital";
  if (valor === null) return "o órgão não publicou valor estimado";
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Quanto falta, em linguagem de gente.
 *
 * "encerra hoje" e "encerra amanhã" no lugar de "0 dias" e "1 dias" não é
 * enfeite: são justamente os dois prazos em que a pessoa precisa largar o que
 * está fazendo, e "0 dias" é lido como "sem prazo" numa passada de olho.
 */
export function prazoEmTexto(dias: number | null): string {
  if (dias === null) return "sem data de encerramento publicada";
  if (dias === 0) return "encerra hoje";
  if (dias === 1) return "encerra amanhã";
  return `${dias} dias`;
}
