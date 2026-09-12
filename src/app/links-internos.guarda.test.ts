import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Todo link interno escrito no código aponta para uma rota que existe.
 *
 * ## POR QUE ISTO É MAIS GRAVE AQUI DO QUE NA MAIORIA DOS SITES
 *
 * `next.config.ts` usa `dynamicParams = false` nas rotas de dado. Endereço fora
 * do que `generateStaticParams` devolve não é "página vazia": é **404
 * permanente**, e o Google tira do índice. O relatório de cobertura de 07/09
 * contou 18 assim, e cada uma tinha sido uma página publicada.
 *
 * Um link para uma página que alguém apagou faz a mesma coisa pelo caminho
 * inverso, e não aparece em teste nenhum: link é string, e string quebrada
 * compila, passa no `tsc` e sobe.
 *
 * ## COMO A LISTA DE ROTAS É MONTADA, E POR QUE NÃO PELO BUILD
 *
 * Pela estrutura de `src/app`, que é onde o Next as define. O build produziria
 * a mesma lista, mas exigiria `npm run build` antes do `npm test`, e um teste
 * que depende da ordem de dois comandos é um teste que uma hora não roda.
 *
 * A derivação foi CONFERIDA contra o manifesto do build em 10/09: as 50 rotas
 * de página bateram exatamente, sem sobra dos dois lados. As dez restantes do
 * build são arquivos de convenção (`sitemap.ts`, `robots.ts`, ícones,
 * `opengraph-image`), e estão tratadas abaixo.
 *
 * ## O QUE ELA NÃO ALCANÇA
 *
 * Link montado em tempo de execução, tipo `/licitacoes/${uf}/${slug}/`. Esses
 * dependem do DADO, e quem os guarda é `pncp/dados-versionados.test.ts` e o
 * registro de publicação. A varredura de 10/09 buscou as 1260 páginas
 * construídas e conferiu os 1261 destinos distintos que elas renderizam: zero
 * quebrados. Isso é auditoria, não guarda, porque exige build e servidor.
 *
 * E link externo, que depende de servidor de terceiro. O do PNCP falhou em
 * metade das tentativas num teste A/B de 10/09, com os dois hostnames dele
 * empatados: uma guarda de CI que dependesse disso seria vermelha por acaso.
 */

const RAIZ = join(__dirname, "..");
const APP = join(RAIZ, "app");
const PUBLICO = join(RAIZ, "..", "public");

/** Arquivo que vira rota sem se chamar `page`. */
const CONVENCOES: Record<string, string> = {
  "sitemap.ts": "sitemap.xml",
  "robots.ts": "robots.txt",
  "manifest.ts": "manifest.webmanifest",
  "icon.svg": "icon.svg",
  "apple-icon.png": "apple-icon.png",
};

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

/** As rotas que `src/app` define, com `[x]` preservado. */
function rotasDoApp(): string[] {
  const achadas = new Set<string>();
  for (const caminho of arquivos(APP)) {
    const relativo = caminho.slice(APP.length + 1);
    const partes = relativo.split("/");
    const nome = partes.pop()!;
    // Grupo entre parênteses não vira segmento de URL.
    const segmentos = partes.filter((p) => !(p.startsWith("(") && p.endsWith(")")));

    if (/^(page|route)\.tsx?$/.test(nome)) {
      achadas.add("/" + segmentos.join("/"));
    } else if (CONVENCOES[nome]) {
      achadas.add("/" + [...segmentos, CONVENCOES[nome]].join("/"));
    } else if (/^opengraph-image\.tsx?$/.test(nome)) {
      achadas.add("/" + [...segmentos, "opengraph-image"].join("/"));
    }
  }
  achadas.add("/");
  return [...achadas];
}

const PADROES = rotasDoApp().map(
  (rota) => new RegExp("^" + rota.replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+") + "$"),
);

const NO_PUBLICO = new Set(
  arquivos(PUBLICO).map((caminho) => "/" + caminho.slice(PUBLICO.length + 1)),
);

/**
 * As linhas que não são comentário.
 *
 * Sem isto a guarda reprova quem já consertou: um comentário que EXPLICA uma
 * rota antiga carrega o endereço dela. Aconteceu cinco vezes nesta base antes
 * desta guarda existir, e a varredura de 10/09 acusou `/destino/` que era só o
 * exemplo de marcação no comentário de `blog/Corpo.tsx`.
 */
function semComentario(texto: string): string {
  let bloco = false;
  return texto
    .split("\n")
    .filter((linha) => {
      const p = linha.trim();
      if (p.startsWith("/*") || p.startsWith("{/*")) bloco = true;
      const comentario = bloco || p.startsWith("//") || p.startsWith("*");
      if (p.includes("*/")) bloco = false;
      return !comentario;
    })
    .join("\n");
}

const ACHADORES = [
  /href="(\/[^"]*)"/g, //            <a href="/x/">
  /href: "(\/[^"]*)"/g, //           { href: "/x/" }
  /\]\((\/[^)\s]*)\)/g, //           [rótulo](/x/) do blog e dos guias
];

type Link = { destino: string; arquivo: string };

const links: Link[] = [];
for (const caminho of arquivos(join(RAIZ))) {
  if (!/\.tsx?$/.test(caminho) || /\.test\.tsx?$/.test(caminho)) continue;
  const texto = semComentario(readFileSync(caminho, "utf8"));
  for (const achador of ACHADORES) {
    for (const [, destino] of texto.matchAll(achador)) {
      links.push({ destino, arquivo: caminho.slice(RAIZ.length + 1) });
    }
  }
}

/**
 * Sem query, sem âncora e sem a barra final.
 *
 * A barra sai porque `src/app` define `/perfil` e o link escreve `/perfil/`:
 * são o mesmo endereço, e o `trailingSlash: true` é quem põe a barra. Comparar
 * cru reprovaria TODOS os links do projeto, que foi o que aconteceu na primeira
 * execução desta guarda. A exigência da barra é cobrada separado, adiante.
 */
function caminhoDe(destino: string): string {
  const semQuery = destino.split("?")[0].split("#")[0];
  return semQuery !== "/" && semQuery.endsWith("/") ? semQuery.slice(0, -1) : semQuery;
}

function ehArquivo(caminho: string): boolean {
  return caminho.split("/").pop()!.includes(".");
}

describe("link interno escrito no código", () => {
  it("a varredura acha links, senão ela não guarda nada", () => {
    expect(
      links.length,
      "nenhum link interno encontrado em `src/`. Ou os padrões de busca " +
        "quebraram, ou a estrutura mudou: nos dois casos esta guarda passaria " +
        "verde para sempre sem conferir coisa alguma.",
    ).toBeGreaterThan(20);
  });

  it("a lista de rotas foi montada, senão tudo seria inexistente", () => {
    // Sem esta, um erro em `rotasDoApp` reprovaria TUDO, e a leitura óbvia
    // seria "a guarda está errada", que é como uma guarda vira `skip`.
    expect(PADROES.length).toBeGreaterThan(30);
  });

  for (const { destino, arquivo } of links) {
    const caminho = caminhoDe(destino);

    it(`${arquivo}: ${destino}`, () => {
      const existe = ehArquivo(caminho)
        ? NO_PUBLICO.has(caminho) || PADROES.some((p) => p.test(caminho))
        : PADROES.some((p) => p.test(caminho));

      expect(
        existe,
        `${arquivo} aponta para ${destino}, e não existe rota nem arquivo com ` +
          `esse endereço. Com \`dynamicParams = false\`, endereço inexistente é ` +
          `404 PERMANENTE, e o Google tira do índice: foram 18 assim no relatório ` +
          `de cobertura de 07/09.`,
      ).toBe(true);

      const escrito = destino.split("?")[0].split("#")[0];
      if (!ehArquivo(escrito) && escrito !== "/") {
        expect(
          escrito.endsWith("/"),
          `${arquivo} aponta para ${destino}, sem a barra final. O site roda com ` +
            `\`trailingSlash: true\`, então esse endereço responde 308 antes de ` +
            `chegar na página. Navegador segue e esconde; rastreador conta como ` +
            `salto a mais, e integrador de fora costuma desistir.`,
        ).toBe(true);
      }
    });
  }
});
