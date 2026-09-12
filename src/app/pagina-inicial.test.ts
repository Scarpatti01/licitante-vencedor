import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardas da primeira dobra.
 *
 * Existem por causa de um defeito que chegou à produção: o painel da busca
 * aparecia **cortado** na altura do cabeçalho. Quem digitava "rio" via metade de
 * "Rio Largo (AL)" e a outra metade recortada — a funcionalidade estava certa,
 * a caixa é que a escondia.
 *
 * A causa foi um `overflow-hidden` posto para conter a chuva de caracteres, num
 * elemento que também contém um painel posicionado fora da própria caixa. É o
 * tipo de defeito que nenhum teste de unidade pega e nenhum build reclama: só
 * aparece olhando a tela, e some do radar assim que a captura sai de vista.
 *
 * Não dá para testar "está visível" sem navegador aqui. Dá para testar a causa,
 * que é o que este arquivo faz.
 */

const HOME = readFileSync(join("src", "app", "page.tsx"), "utf8");

/** O trecho do `<header>` até o fechamento dele. */
function cabecalho(): string {
  const inicio = HOME.indexOf("<header");
  const fim = HOME.indexOf("</header>");
  expect(inicio, "não achei o <header> da home").toBeGreaterThan(-1);
  expect(fim).toBeGreaterThan(inicio);
  return HOME.slice(inicio, fim);
}

describe("o cabeçalho da home não pode recortar a busca", () => {
  it("contém a busca", () => {
    // Se a busca sair daqui, as duas guardas abaixo perdem o sentido e devem
    // ser reavaliadas em vez de continuarem passando por inércia.
    expect(cabecalho()).toContain("BuscaDePracas");
  });

  /**
   * A causa exata do defeito.
   *
   * O canvas da chuva é `absolute inset-0`: ele já está limitado à caixa do
   * cabeçalho por construção, e não havia nada para `overflow-hidden` conter.
   * O que ele continha era o painel de resultados.
   */
  it("não usa overflow-hidden", () => {
    expect(
      cabecalho(),
      "`overflow-hidden` no cabeçalho recorta o painel da busca — foi exatamente " +
        "assim que 'Rio Largo (AL)' apareceu cortado em produção. O canvas é " +
        "`absolute inset-0` e não precisa ser contido.",
    ).not.toContain("overflow-hidden");
  });

  /**
   * A outra metade.
   *
   * O hero vem depois no documento e cria contexto de empilhamento próprio.
   * Sem `z-` no cabeçalho, ele pinta por cima do painel — o que trocaria o
   * recorte por uma lista escondida atrás do título.
   */
  it("fica acima do hero na ordem de empilhamento", () => {
    expect(
      cabecalho(),
      "sem z-index o hero, que vem depois no DOM, cobre o painel da busca.",
    ).toMatch(/\bz-\d+\b/);
  });
});

/**
 * Os cartões de guia da home precisam PARECER clicáveis.
 *
 * Relato do dono, olhando a home no computador: "esses cards são clicáveis, mas
 * não parecem". E não pareciam mesmo. Só o título era link, sem sublinhado em
 * repouso, dentro de um bloco sem borda e sem fundo: no computador a pista
 * aparecia ao passar o mouse por cima, e no celular não existe passar o mouse
 * por cima. Nove guias publicados, que são o conteúdo de aquisição do site,
 * parecendo três colunas de parágrafo.
 *
 * A correção tem três partes, e as três estão guardadas aqui porque nenhuma
 * delas quebra nada ao ser removida: some a pista, e o site continua verde.
 */
describe("os cartões de guia da home parecem clicáveis", () => {
  /** O bloco que renderiza um cartão de guia. */
  function cartao(): string {
    const inicio = HOME.indexOf("{GUIAS_PUBLICADOS.map(");
    expect(inicio, "não achei a lista de guias da home").toBeGreaterThan(-1);
    const fim = HOME.indexOf("</article>", inicio);
    expect(fim).toBeGreaterThan(inicio);
    return HOME.slice(inicio, fim);
  }

  it("desenha uma caixa em repouso, e não só no hover", () => {
    const marcacao = cartao();
    expect(
      /\brounded-\w+\b/.test(marcacao) && /\bborder\b/.test(marcacao),
      "sem borda e sem canto arredondado o cartão volta a ser um parágrafo: " +
        "quem está no celular não tem hover para descobrir que ali se clica.",
    ).toBe(true);
  });

  it("tem a área de clique esticada sobre o cartão inteiro", () => {
    expect(
      cartao(),
      "`after:absolute after:inset-0` no link do título é o que faz o cartão " +
        "inteiro responder ao toque. Sem isso, o alvo volta a ser o texto do " +
        "título, que no celular é um alvo pequeno cercado de área morta.",
    ).toContain("after:absolute after:inset-0");
  });

  it("diz por escrito para onde leva", () => {
    expect(
      cartao(),
      "a chamada visível é a única pista que não depende de hover nem de cor.",
    ).toContain("Ler o guia");
  });
});
