/**
 * Junta os documentos extraídos no texto que vai para a análise.
 *
 * ## Por que a ordem decide, e não é detalhe
 *
 * `segmentacao.ts` corta o texto num orçamento de caracteres antes de mandar ao
 * modelo — um edital de 305 páginas não cabe, e mandar tudo seria caro e pior.
 * Isso significa que **o que vem primeiro é o que sobrevive ao corte**.
 *
 * Um edital publica o instrumento convocatório junto com termo de referência,
 * planilha de orçamento, minuta de contrato e anexos diversos. Medido: até 10
 * documentos no mesmo edital. Se a ordem for a que o PNCP devolveu — que é
 * arbitrária —, o orçamento pode ser gasto numa minuta de contrato enquanto o
 * edital em si fica de fora. A análise então responderia sobre o documento
 * errado, com aparência de certeza.
 *
 * Por isso o edital vem primeiro, o termo de referência em seguida, e o resto
 * depois. A heurística é por título, é declarada, e erra para o lado seguro: o
 * que não casa com nenhum padrão conhecido vai para o fim, nunca para a frente.
 *
 * ## Cada trecho diz de onde veio
 *
 * O cabeçalho por documento não é enfeite. `evidencia.ts` confere se o trecho
 * citado pelo modelo existe no texto enviado; quando a evidência aparece, quem
 * lê precisa saber se ela veio do edital ou de um anexo — "o edital exige X" e
 * "a minuta de contrato menciona X" não são a mesma afirmação.
 */

import type { DocumentoProcessado } from "./processar.ts";

/**
 * Ordem de prioridade por padrão no título.
 *
 * Do mais para o menos importante. O primeiro padrão que casar define a posição;
 * quem não casa com nenhum recebe a prioridade do fim.
 */
/**
 * Separador de palavra nos títulos do PNCP.
 *
 * `\b` do regex NÃO serve aqui: `_` conta como caractere de palavra, então
 * `\bedital\b` não casa em `EDITAL_CONCORRENCIA` — que é como metade dos
 * títulos reais vem. Medido nos títulos da amostra:
 * `4__EDITAL_CONCORRNCIA_COM_INVERSO_DE_FASES`, `EDITAL_Concorrncia__PAVIMENTAO`.
 */
const SEP = "[^a-zà-ú]";
const cerca = (nucleo: string) => new RegExp(`(^|${SEP})(${nucleo})(${SEP}|$)`, "i");

/**
 * A ordem de teste importa, e o termo de referência vem ANTES do edital.
 *
 * Parece invertido e não é: títulos como `ANEXO I do Edital - TR` contêm as duas
 * palavras, e são o termo de referência, não o instrumento convocatório.
 * Testando "edital" primeiro, todo anexo que menciona o edital no nome roubaria
 * a primeira posição — justamente a que o orçamento de caracteres garante.
 */
const PRIORIDADE: readonly { padrao: RegExp; peso: number }[] = [
  // Descreve o que está sendo comprado, em detalhe.
  { padrao: /term[oa][\s_-]+de[\s_-]+refer|projeto[\s_-]+b[áa]sico/i, peso: 1 },
  { padrao: cerca("tr"), peso: 1 },
  // O instrumento convocatório: define objeto, prazo e habilitação.
  { padrao: cerca("edital|edtl"), peso: 0 },
  { padrao: /anexo/i, peso: 2 },
  { padrao: /minuta|contrato/i, peso: 3 },
  // Planilha de custo raramente muda a decisão de participar, e ocupa muito
  // orçamento com número solto.
  { padrao: /planilha|or[çc]amento|composi[çc][ãa]o/i, peso: 5 },
];

/** Quem não casa com nada conhecido: depois dos nomeados, antes das planilhas. */
const PESO_PADRAO = 4;

export function prioridadeDoTitulo(titulo: string): number {
  for (const { padrao, peso } of PRIORIDADE) {
    if (padrao.test(titulo)) return peso;
  }
  return PESO_PADRAO;
}

/**
 * O texto único que a análise recebe, ou `null` quando nada foi extraído.
 *
 * `null` e não string vazia: são coisas diferentes para o chamador. Vazio faria
 * a análise rodar sobre nada e responder "não encontrei" para tudo, gastando
 * uma chamada de modelo para produzir uma resposta que já se sabia. `null` diz
 * "não há o que analisar", e `analiseNaoRealizada` cuida do resto — que é o
 * caminho honesto que o projeto já tinha.
 */
export function textoParaAnalise(documentos: readonly DocumentoProcessado[]): string | null {
  const legiveis = documentos
    .filter((d) => d.extracao.ok)
    .map((d, indice) => ({ documento: d, indice }));

  if (legiveis.length === 0) return null;

  const ordenados = legiveis.sort((a, b) => {
    const pa = prioridadeDoTitulo(a.documento.titulo);
    const pb = prioridadeDoTitulo(b.documento.titulo);
    // Empate desfeito pela ordem original, e não pelo título: dois anexos com o
    // mesmo peso devem sair na ordem em que o órgão os publicou, que costuma
    // ser a ordem de leitura pretendida.
    return pa - pb || a.indice - b.indice;
  });

  return ordenados
    .map(({ documento }) => {
      // O `ok` já foi filtrado acima; o TypeScript não carrega isso para cá.
      const texto = documento.extracao.ok ? documento.extracao.texto : "";
      return `=== ${documento.titulo} ===\n\n${texto}`;
    })
    .join("\n\n");
}
