import type { MunicipioAgregado } from "../pncp/agregarPorMunicipio.ts";

/**
 * O título e a descrição que a página de município leva para o resultado de
 * busca.
 *
 * ## Por que isto virou um arquivo, com teste
 *
 * Medido em 25/08, nos primeiros 28 dias do site: 219 páginas de município
 * somaram 847 impressões na posição média 7-8 e converteram 1,18%. Não é
 * catástrofe — é o dobro do site inteiro —, mas é metade do que a posição
 * comporta, e são as páginas que o produto realmente quer que sejam clicadas.
 *
 * O título anterior era `Licitações em Iguatu (CE): o que os órgãos compram`, e
 * a descrição abria com `Retrato do mercado público de Iguatu/CE a partir dos
 * dados do PNCP:`. Quem digita "licitação iguatu" lê as primeiras palavras e
 * decide: as primeiras oito ali são método, não resposta. O número vinha
 * depois, quando o olho já passou.
 *
 * ## O que NÃO pode entrar aqui, por decisão anterior
 *
 * "Editais abertos agora", "12 licitações abertas hoje", qualquer promessa de
 * presente. A página é um retrato datado do que já foi comprado, e o comentário
 * de `[municipio]/page.tsx` explica por quê: prometer no título o que a página
 * não entrega faz o visitante clicar, não achar, e concluir — com razão — que o
 * site mente. CTR alto conquistado assim volta como desconfiança.
 *
 * O que dá para fazer sem mentir é o que este arquivo faz: pôr o número na
 * frente, dizer QUANDO foi medido, e trocar método por resposta.
 */

/**
 * O valor em escala legível, ou `null` quando não há valor para mostrar.
 *
 * `null` e não "R$ 0": 185 dos 3.895 municípios do agregado não têm valor
 * somado, seja porque o órgão não publicou estimativa, seja porque o que
 * publicou não é comparável. "R$ 0 em compras" afirmaria que o município não
 * compra, que é diferente de "não sabemos quanto".
 */
export function valorResumido(valor: number): string | null {
  if (!Number.isFinite(valor) || valor < 1_000) return null;

  if (valor >= 1_000_000) {
    const milhoes = valor / 1_000_000;
    // Uma casa decimal abaixo de cem milhões, nenhuma acima: "R$ 18,1 mi"
    // informa e custa dois caracteres; "R$ 118,4 mi" só ocupa espaço que o
    // título não tem, e a precisão ali não muda decisão de ninguém.
    return `R$ ${milhoes.toLocaleString("pt-BR", {
      maximumFractionDigits: milhoes < 100 ? 1 : 0,
    })} mi`;
  }

  return `R$ ${Math.round(valor / 1_000).toLocaleString("pt-BR")} mil`;
}

function contratacoes(n: number): string {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? "contratação" : "contratações"}`;
}

function orgaos(n: number): string {
  return `${n} ${n === 1 ? "órgão" : "órgãos"}`;
}

/**
 * O título. Números primeiro, marca por último (o Next acrescenta o sufixo).
 *
 * O Google corta perto de 60 caracteres. Por isso o valor entra só quando
 * existe: num município sem valor somado, insistir empurraria o resto para
 * fora da faixa visível em troca de nada.
 */
export function tituloDoMunicipio(m: MunicipioAgregado): string {
  const valor = valorResumido(m.valor);
  const cabeca = `Licitações em ${m.municipio} (${m.uf}): ${contratacoes(m.editais)}`;
  // Vírgula em vez de "e R$ … em compras": a versão longa passava de 62
  // caracteres e o Google cortava justamente o valor, que é o argumento.
  return valor ? `${cabeca}, ${valor}` : `${cabeca} de ${orgaos(m.orgaos)}`;
}

/**
 * A descrição. Número, data e o que o leitor ganha — nessa ordem.
 *
 * A data não é enfeite: ela é a única coisa nesta caixa que responde "isso está
 * velho?", que é a primeira dúvida de quem procura licitação. E é honesta
 * justamente por ser data de MEDIÇÃO, não promessa de edital aberto.
 */
export function descricaoDoMunicipio(m: MunicipioAgregado, medidoEm: string): string {
  const valor = valorResumido(m.valor);
  const soma = valor ? `, somando ${valor}` : "";

  return (
    `${contratacoes(m.editais)} de ${orgaos(m.orgaos)} em ${m.municipio}/${m.uf}${soma}. ` +
    `Medido no PNCP em ${medidoEm}: quem compra, o que compra e por quais modalidades.`
  );
}
