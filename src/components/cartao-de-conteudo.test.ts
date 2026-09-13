import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O cartão de conteúdo precisa PARECER clicável, nas duas páginas que o usam.
 *
 * Relato do dono, olhando a home: "esses cards são clicáveis, mas não parecem".
 * E não pareciam mesmo. Só o título era link, sem sublinhado em repouso, dentro
 * de um bloco sem borda e sem fundo: no computador a pista aparecia ao passar o
 * mouse por cima, e no celular não existe passar o mouse por cima. Era o
 * conteúdo de aquisição do site (nove guias na home, guias e artigos no índice
 * do blog) parecendo parágrafo.
 *
 * Estas guardas existem porque nenhuma das pistas quebra nada ao sumir: tire a
 * borda, o sublinhado, a chamada ou a área esticada, e o site continua verde
 * enquanto perde cliques. Teste não enxerga pixel, mas enxerga a causa.
 */

const RAIZ = join(import.meta.dirname, "..");
const CARTAO = readFileSync(join(RAIZ, "components", "CartaoDeConteudo.tsx"), "utf8");
const HOME = readFileSync(join(RAIZ, "app", "page.tsx"), "utf8");
const BLOG = readFileSync(join(RAIZ, "app", "blog", "page.tsx"), "utf8");

describe("o cartão de conteúdo mostra que é clicável", () => {
  it("desenha uma caixa em repouso, e não só no hover", () => {
    expect(
      /\brounded-\w+\b/.test(CARTAO) && /\bborder\b/.test(CARTAO),
      "sem borda e sem canto arredondado o cartão volta a ser um parágrafo: " +
        "quem está no celular não tem hover para descobrir que ali se clica.",
    ).toBe(true);
  });

  it("estica a área de clique sobre o cartão inteiro", () => {
    expect(
      CARTAO,
      "`after:absolute after:inset-0` no link do título é o que faz o cartão " +
        "inteiro responder ao toque. Sem isso, o alvo volta a ser o texto do " +
        "título, que no celular é um alvo pequeno cercado de área morta.",
    ).toContain("after:absolute after:inset-0");
  });

  it("diz por escrito para onde leva", () => {
    expect(
      CARTAO,
      "a chamada visível é a pista que não depende de hover nem de cor.",
    ).toContain("{chamada}");
  });

  it("contorna o cartão para quem chega pelo teclado", () => {
    expect(
      CARTAO,
      "o anel de foco precisa cercar a área que responde ao Enter, que é o " +
        "cartão, e não só o texto do título.",
    ).toContain("has-[a:focus-visible]:outline-2");
  });
});

/**
 * O componente só serve se as páginas o usarem.
 *
 * O padrão nasceu copiado na home e teria sido copiado de novo no blog. Cópia
 * diverge na primeira pressa, e a divergência não reprova nada: uma página fica
 * com a pista e a outra não, e quem escreve não vê as duas na mesma tela.
 */
describe("as listas de conteúdo usam o cartão, e não markup próprio", () => {
  it("a home monta os guias com ele", () => {
    const lista = HOME.slice(HOME.indexOf("{GUIAS_PUBLICADOS.map("));
    expect(lista.slice(0, 400)).toContain("<CartaoDeConteudo");
  });

  it("o índice do blog monta artigos e guias com ele", () => {
    for (const catalogo of ["{ARTIGOS_PUBLICADOS.map(", "{GUIAS_PUBLICADOS.map("]) {
      const lista = BLOG.slice(BLOG.indexOf(catalogo));
      expect(lista.slice(0, 400), `${catalogo} não usa o cartão`).toContain(
        "<CartaoDeConteudo",
      );
    }
  });
});
