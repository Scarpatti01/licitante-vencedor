/**
 * De onde vêm os editais, e quantos foram na última coleta.
 *
 * ## Por que isto é uma constante e não texto solto na página
 *
 * Em 21/08 a coleta passou de seis estados do Nordeste para o país inteiro. A
 * mudança levou minutos no workflow e deixou TRÊS páginas mentindo ao mesmo
 * tempo — `/alerta-de-licitacao` dizendo "a operação começou por seis estados"
 * como se ainda fosse o caso, `/metodologia` listando "cobertura limitada a
 * seis estados" entre as limitações conhecidas, e `/como-funciona` publicando
 * "639 municípios de seis estados" na descrição da coleta.
 *
 * Nenhuma delas estava errada quando foi escrita. É esse o modo de falha que
 * importa: número fixado na mão não envelhece com barulho, envelhece em
 * silêncio, e o texto continua parecendo cuidadoso enquanto vai ficando falso.
 * Como o defeito era o mesmo nos três lugares, a correção não podia ser trocar
 * o número nos três lugares.
 *
 * ## O que isto NÃO é
 *
 * Não é leitura ao vivo do banco. Estas páginas são estáticas de propósito —
 * são texto de marketing, não painel —, então o número continua sendo uma
 * fotografia. A diferença é que agora existe UM lugar para atualizá-la, e ele
 * carrega a data em que foi tirada. Uma fotografia datada é honesta; uma
 * fotografia sem data se passa por tempo presente.
 *
 * Quem quiser o número de agora tem `/licitacoes/`, que lê o banco.
 */

/** As 27 unidades da federação. A coleta pede todas, todo dia. */
export const UFS_COBERTAS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

/**
 * A última coleta que serviu de base para os números publicados.
 *
 * `classe` é o veredito da própria coleta sobre si mesma, e vai junto de
 * propósito: `parcial-aceitavel` significa que alguma UF não veio inteira e o
 * agregado continua utilizável. Publicar o número sem essa palavra seria
 * apresentar cobertura parcial como se fosse completa — exatamente o que
 * `/metodologia` promete não fazer.
 */
export const ULTIMA_COLETA = {
  data: "2026-08-21",
  editais: 26773,
  municipios: 3995,
  ufs: 27,
  classe: "parcial-aceitavel",
} as const;

/**
 * Como a cobertura se descreve em prosa, para as páginas não divergirem entre
 * si na hora de dizer a mesma coisa.
 */
export const COBERTURA = {
  /** Ex.: "as 27 unidades da federação" */
  extensao: `as ${UFS_COBERTAS.length} unidades da federação`,
  /** Ex.: "26.773 editais" — formatado em pt-BR, como o resto do site. */
  editais: ULTIMA_COLETA.editais.toLocaleString("pt-BR"),
  /** Ex.: "3.995 municípios" */
  municipios: ULTIMA_COLETA.municipios.toLocaleString("pt-BR"),
  /** Ex.: "21 de agosto de 2026" */
  dataPorExtenso: new Date(`${ULTIMA_COLETA.data}T12:00:00Z`).toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  ),
} as const;
