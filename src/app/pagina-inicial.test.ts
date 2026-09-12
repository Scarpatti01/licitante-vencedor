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
