import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A fronteira do cache do service worker.
 *
 * Um service worker que guarda HTML de página logada é vazamento de dado, não
 * ganho de desempenho: o celular é emprestado, o computador do escritório é
 * compartilhado, e a resposta guardada continua no disco depois do logout. A
 * próxima pessoa abriria o app offline e leria as respostas da anterior, sem
 * sessão nenhuma.
 *
 * Esta guarda não lê o comentário do arquivo dizendo que isso não acontece: ela
 * EXECUTA a função que decide o que entra no cache e passa por ela as rotas
 * logadas de verdade, lidas da árvore de `src/app`. Rota nova criada amanhã já
 * entra na conferência sozinha, sem ninguém lembrar de acrescentá-la aqui.
 */

const SW = "public/sw.js";

function semComentarios(js: string) {
  // Um comentário citando "/minha-jornada" para explicar a regra não pode virar
  // a regra, nem alimentar o extrator que procura a função.
  return js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const fonte = semComentarios(readFileSync(SW, "utf8"));

/** Tira a decisão de dentro do worker e devolve como função executável. */
function decisorDeCache(): (url: URL) => boolean {
  const achado = fonte.match(/function podeGuardar\(url\)\s*\{[\s\S]*?\n\}/);
  if (!achado) throw new Error("não achei `podeGuardar` em " + SW);
  // `self` não existe fora do worker; o teste fornece a mesma origem das URLs.
  const construir = new Function(
    "self",
    `${achado[0]}; return podeGuardar;`,
  ) as (self: unknown) => (url: URL) => boolean;
  return construir({ location: { origin: "https://licitantevencedor.com.br" } });
}

/** As rotas da área logada, lidas da árvore em vez de escritas à mão. */
function rotasLogadas() {
  const doGrupo = readdirSync("src/app/(app)", { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `/${e.name}/`);
  return [...doGrupo, "/administracao/", "/administracao/jornada/", "/api/alertas/"];
}

const podeGuardar = decisorDeCache();
const origem = "https://licitantevencedor.com.br";

describe("o service worker não guarda nada de quem está logado", () => {
  it("acha as rotas logadas para medir", () => {
    // Sem lastro, a lista viria vazia e o teste passaria sem conferir nada.
    expect(rotasLogadas().length, "nenhuma rota logada encontrada").toBeGreaterThan(4);
  });

  it("guarda o estático com hash no nome", () => {
    // O outro lado do lastro: se a função recusasse tudo, os testes abaixo
    // passariam e o cache não serviria para nada.
    expect(podeGuardar(new URL("/_next/static/chunks/pagina-abc123.js", origem))).toBe(true);
    expect(podeGuardar(new URL("/icone-192.png", origem))).toBe(true);
  });

  it.each(rotasLogadas())("recusa a rota logada %s", (rota) => {
    expect(podeGuardar(new URL(rota, origem)), `${rota} entraria no cache`).toBe(false);
  });

  it("recusa a carga de dados que o Next busca ao navegar entre páginas logadas", () => {
    // Navegação no cliente não é `mode: navigate`: é um fetch de payload RSC.
    // Se ela escapasse pela regra de extensão, o conteúdo logado seria guardado
    // pela porta dos fundos.
    for (const rota of rotasLogadas()) {
      const url = new URL(rota, origem);
      url.searchParams.set("_rsc", "1a2b3");
      expect(podeGuardar(url), `${url.pathname}?_rsc entraria no cache`).toBe(false);
    }
  });

  it("recusa qualquer coisa de outro domínio", () => {
    expect(podeGuardar(new URL("https://outro-site.com/_next/static/x.js"))).toBe(false);
  });

  it("nunca guarda a resposta de uma navegação", () => {
    const trechoDeNavegacao = fonte.match(
      /if \(requisicao\.mode === "navigate"\)[\s\S]*?return;\n  \}/,
    );
    expect(trechoDeNavegacao, "não achei o ramo que trata navegação").not.toBeNull();
    expect(
      /cache\.put|caches\.open/.test(trechoDeNavegacao![0]),
      "o ramo de navegação grava em cache, e toda página logada é navegação",
    ).toBe(false);
  });

  it("só guarda requisição GET", () => {
    expect(fonte).toMatch(/requisicao\.method !== "GET"/);
  });
});
