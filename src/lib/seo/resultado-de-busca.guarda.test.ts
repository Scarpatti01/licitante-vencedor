import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { conferirDescricao, conferirTitulo } from "./resultado-de-busca.ts";

/**
 * Toda página estática leva para a busca um título só, e ele obedece à régua.
 *
 * ## Por que ler o arquivo-fonte em vez de importar o `metadata`
 *
 * O que este teste precisa provar não é o valor do título: é que existe UM.
 * Importar `metadata` devolveria a string vencedora e esconderia exatamente o
 * defeito que motivou a guarda — a página declarava `const TITULO` e passava
 * outra coisa para `metadata.title`, então o `openGraph` e a busca discordavam
 * em silêncio. Só o texto do arquivo mostra as duas.
 *
 * É o mesmo motivo de `coleta-versiona-o-que-coletou.test.ts` ler o YAML: o
 * defeito mora na diferença entre o que o código diz e o que alguém achou que
 * ele dizia.
 */

/*
 * Só as rotas estáticas de primeiro nível. As dinâmicas — `[uf]`, `[municipio]`,
 * `[slug]` — não têm título escrito no arquivo: ele é montado por função, e cada
 * uma tem o próprio teste com a própria régua (`regioes/serp.ts` para município,
 * `blog/tipos.ts` para artigo). Declarar o recorte aqui é o que impede alguém de
 * ler esta guarda como "todas as páginas do site estão cobertas".
 */
const PAGINAS = readdirSync(join("src", "app"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("(") && !d.name.startsWith("["))
  .map((d) => [d.name, join("src", "app", d.name, "page.tsx")] as const)
  .filter(([, caminho]) => {
    try {
      readFileSync(caminho, "utf8");
      return true;
    } catch {
      return false;
    }
  })
  .map(([rota, caminho]) => [rota, semComentarios(readFileSync(caminho, "utf8"))] as const);

/**
 * O fonte sem comentário, porque os extratores abaixo casam por texto.
 *
 * Descoberto ao provar a guarda nova: escrevi em `/editais-abertos/` um
 * comentário explicando a convenção, com a frase `const TITULO = "..."` dentro
 * dele. `tituloDeclarado` casou com o COMENTÁRIO e devolveu `"..."` — três
 * caracteres, que cabem folgado em qualquer teto. A página passou a ser
 * aprovada por um título que não existe.
 *
 * É o mesmo cuidado de `ancora-de-praca.test.ts`, e pela mesma razão: guarda
 * que lê fonte tem que ler o CÓDIGO, senão o comentário que explica a regra
 * vira o jeito de burlá-la.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

/** O `const TITULO = "..."` da página, quando ela declara um. */
function tituloDeclarado(fonte: string): string | null {
  const m = fonte.match(/const TITULO\s*=\s*\n?\s*"([^"]+)"/u);
  return m ? m[1] : null;
}

/** O literal passado para `metadata.title`, quando não é uma variável. */
function tituloDaBusca(fonte: string): string | null {
  const m = fonte.match(/^\s*title:\s*"([^"]+)",\s*$/mu);
  return m ? m[1] : null;
}

/** O `const DESCRICAO = "..."` da página, quando ela declara um. */
function descricaoDeclarada(fonte: string): string | null {
  const m = fonte.match(/const DESCRICAO\s*=\s*\n?\s*"([^"]+)"/u);
  return m ? m[1] : null;
}

describe("o título que vai para a busca", () => {
  it("encontra as páginas estáticas, senão o teste passa sem olhar nada", () => {
    // Uma guarda que roda sobre lista vazia é verde e inútil. Se a estrutura de
    // `src/app` mudar, é aqui que se descobre, não seis meses depois.
    expect(PAGINAS.length).toBeGreaterThan(15);
  });

  it("é o mesmo do compartilhamento: uma página, um título", () => {
    for (const [rota, fonte] of PAGINAS) {
      const declarado = tituloDeclarado(fonte);
      const daBusca = tituloDaBusca(fonte);
      if (declarado === null || daBusca === null) continue;

      expect(
        daBusca,
        `/${rota}/ tem dois títulos: a busca recebe "${daBusca}" e o openGraph recebe ` +
          `"${declarado}". Um dos dois ninguém escolheu. Use \`title: TITULO\`.`,
      ).toBe(declarado);
    }
  });

  it("obedece à régua: sem marca repetida, dentro do corte, resposta depois dos dois pontos", () => {
    for (const [rota, fonte] of PAGINAS) {
      const titulo = tituloDeclarado(fonte) ?? tituloDaBusca(fonte);
      if (titulo === null) continue;

      const falhas = conferirTitulo(titulo);
      expect(
        falhas,
        `/${rota}/ · "${titulo}"\n` + falhas.map((f) => `  · ${f.explicacao}`).join("\n"),
      ).toEqual([]);
    }
  });
});

describe("a página que a guarda não consegue ler", () => {
  /**
   * Guarda que pula em silêncio o que não entende é guarda que mente.
   *
   * Os dois extratores acima leem `const TITULO = "..."` e `title: "literal"`.
   * `/editais-abertos/` escrevia `const titulo` em minúsculas e passava a
   * variável para `metadata.title`: os dois devolviam `null`, o `continue`
   * disparava, e a página saía da conferência sem que nada dissesse isso. Era a
   * única do site nessa forma, e foi a única estática que chegou à busca com 90
   * caracteres.
   *
   * O defeito não estava no título — estava no `continue`. Um recorte que se
   * decide pela FORMA de escrever pula justamente quem escreveu diferente, que é
   * o mais provável de estar errado. Agora quem não é legível reprova.
   */
  it("toda página com título na busca tem um título que a guarda consegue medir", () => {
    for (const [rota, fonte] of PAGINAS) {
      if (!/^\s*title:/mu.test(fonte)) continue;
      if (tituloDeclarado(fonte) !== null || tituloDaBusca(fonte) !== null) continue;

      expect.fail(
        `/${rota}/ tem título na busca, e esta guarda não consegue lê-lo no fonte — ` +
          "então ela estava pulando a página inteira sem avisar. Declare " +
          '`const TITULO = "..."` e passe `title: TITULO`.',
      );
    }
  });
});

describe("a descrição que vai para a busca", () => {
  it("cabe no corte e abre pela resposta", () => {
    for (const [rota, fonte] of PAGINAS) {
      const descricao = descricaoDeclarada(fonte);
      if (descricao === null) continue;

      const falhas = conferirDescricao(descricao);
      expect(
        falhas,
        `/${rota}/ · "${descricao}"\n` + falhas.map((f) => `  · ${f.explicacao}`).join("\n"),
      ).toEqual([]);
    }
  });
});

describe("a descrição que a guarda não consegue ler no fonte", () => {
  /**
   * Duas páginas montam a descrição a partir de dado — a de preços interpola a
   * mensalidade, a de editais abertos interpola a contagem do retrato. O
   * extrator acima só enxerga literal, então elas passavam sem ser conferidas, e
   * as duas estavam fora do teto: 162 caracteres numa, e `.slice(0, 160)`
   * cortando no meio da palavra na outra.
   *
   * A saída não foi ensinar o extrator a avaliar TypeScript. Foi obrigar quem
   * monta a passar por `limitarDescricao`, e cobrar isso aqui.
   */
  it("passa por limitarDescricao, que garante o corte em tempo de execução", () => {
    for (const [rota, fonte] of PAGINAS) {
      const temDescricao = /^\s*description:/mu.test(fonte);
      if (!temDescricao) continue;
      if (descricaoDeclarada(fonte) !== null) continue;

      expect(
        fonte,
        `/${rota}/ monta a descrição em vez de escrevê-la, então a guarda não consegue ` +
          "medir o tamanho lendo o fonte. Passe o texto por `limitarDescricao()` para o " +
          "corte acontecer em tempo de execução, na fronteira de palavra.",
      ).toContain("limitarDescricao");
    }
  });

  it("nenhuma página corta descrição na mão", () => {
    for (const [rota, fonte] of PAGINAS) {
      expect(
        fonte,
        `/${rota}/ corta a descrição com .slice(), que parte a palavra no meio. ` +
          "Use `limitarDescricao()`.",
      ).not.toMatch(/descricao\.slice\(/u);
    }
  });
});
