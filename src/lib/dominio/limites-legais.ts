/**
 * Os limites de valor da Lei 14.133, no ano vigente.
 *
 * ## Por que isto virou módulo em 26/08
 *
 * O guia da Lei 14.133 dizia, em duas passagens: "o artigo 75 fixou R$ 100 mil
 * para obras e R$ 50 mil para as demais compras", seguido de "esses valores são
 * corrigidos anualmente por decreto, então sempre confirme o decreto vigente".
 *
 * A frase é honesta e inútil. Ela dá ao leitor o número de 2021 e manda ele
 * procurar o de hoje em outro lugar — e o outro lugar é o concorrente, que
 * publica "Lei 14.133 atualizada 2026: o que mudou + novos valores" com o número
 * na primeira linha. Três concorrentes ranqueiam nessa busca ao mesmo tempo.
 *
 * Pior que perder a busca: quem confiar no texto vai usar R$ 50 mil quando o
 * limite real é R$ 65.492,11, e vai concluir que uma contratação cabia em
 * dispensa quando não cabia, ou o contrário. Número legal desatualizado num
 * guia de licitação não é detalhe editorial, é conselho errado.
 *
 * ## A mesma lição de `precos.ts` e `cobertura.ts`
 *
 * Número que envelhece mora num lugar só, com a data e a fonte grudadas nele.
 * Fixado na mão em prosa, ele não envelhece com barulho: envelhece em silêncio,
 * e ninguém descobre até um leitor perder dinheiro. `limites-legais.test.ts`
 * cobra que os valores não voltem a ser escritos em prosa nas páginas.
 *
 * ## Como atualizar, todo janeiro
 *
 * O reajuste sai por decreto no fim de dezembro e vale a partir de 1º de
 * janeiro. Troque `REAJUSTE_VIGENTE` inteiro — decreto, data e percentual — e os
 * valores. A guarda exige que os três campos mudem juntos: decreto novo com data
 * velha é o erro que passa despercebido.
 */

/** O decreto que fixou os valores em vigor, e quando ele passou a valer. */
export const REAJUSTE_VIGENTE = {
  /** Como o decreto é citado, para o leitor conferir na fonte. */
  decreto: "Decreto nº 12.807/2025",
  /** Primeiro dia de vigência, em ISO. */
  vigenteDesde: "2026-01-01",
  /** O percentual do reajuste, pelo IPCA-E. */
  percentual: 4.41,
  /** O ano a que os valores se referem, para o texto poder dizê-lo. */
  ano: 2026,
} as const;

/**
 * Dispensa de licitação por valor — art. 75 da Lei 14.133.
 *
 * Em reais, com centavos: o decreto publica com centavos, e arredondar aqui
 * criaria uma diferença entre o que o site diz e o que o órgão aplica bem no
 * ponto em que a contratação cabe ou não cabe na dispensa.
 */
export const DISPENSA_POR_VALOR = {
  /** Inciso I: obras e serviços de engenharia. */
  obrasEEngenharia: 130_984.2,
  /** Inciso II: demais compras e serviços. */
  comprasEServicos: 65_492.11,
} as const;

/**
 * Quem tem o limite dobrado, e é a exceção que mais confunde.
 *
 * A lei dobra os dois incisos para consórcio público, autarquia ou fundação
 * qualificada como agência executiva. Fornecedor que atende consórcio
 * intermunicipal — comum em saúde e em resíduos — trabalha com o dobro sem
 * saber, e conclui que a compra não podia ser por dispensa quando podia.
 */
export const DOBRAM_O_LIMITE =
  "consórcio público, autarquia ou fundação qualificada como agência executiva";

/** Em reais, no formato que o leitor brasileiro lê. */
export function emReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * A data de vigência por extenso.
 *
 * Montada a partir de `vigenteDesde` e não escrita à mão, pelo mesmo motivo de
 * tudo neste arquivo: duas grafias da mesma data divergem na primeira correção.
 */
export function vigenciaPorExtenso(): string {
  const [ano, mes, dia] = REAJUSTE_VIGENTE.vigenteDesde.split("-").map(Number);
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  // "1º de janeiro", mas "15 de janeiro": em português o ordinal só vale para o
  // primeiro dia do mês. A primeira versão desta linha escrevia "15º".
  const diaEscrito = dia === 1 ? "1º" : String(dia);
  return `${diaEscrito} de ${meses[mes - 1]} de ${ano}`;
}
