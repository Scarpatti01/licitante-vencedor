import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A lista de praças não volta para dentro das páginas.
 *
 * ## O defeito, medido em 20/09/2026
 *
 * `BuscaDePracas` recebia a lista por propriedade. A decisão estava certa
 * quando foi tomada, e o comentário dela dizia o porquê: "~96 linhas, ~7 KB",
 * barato demais para valer uma requisição.
 *
 * A cobertura cresceu 13 vezes e ninguém remediu. Eram 1246 praças, 147 KB. E
 * o componente mora em `Navegacao.tsx`, o menu de TODA página, então a lista ia
 * em todo documento do site e também em toda resposta de prefetch de rota.
 *
 * Abrir a home, medido no navegador com o build de produção:
 *
 *     1703 KB descomprimidos, em 29 respostas
 *     1096 KB eram a MESMA lista, baixada 6 vezes
 *     (uma no documento e uma em cada um dos 5 prefetches de rota)
 *
 * Depois da troca: 909 KB, e a lista em nenhuma delas.
 *
 * ## Por que uma guarda, e não só o conserto
 *
 * Nada no código diz "esta função é cara". `pracasParaBusca()` tem o nome de
 * qualquer outra, devolve um array, e passá-la a um componente é a coisa mais
 * natural do mundo — foi assim que ela entrou. O custo não aparece em teste, não
 * aparece no `tsc`, não aparece no lint e não quebra tela nenhuma. Só aparece
 * na conta de dados de quem abre o site pelo celular.
 *
 * Pior: o defeito ESCALA em silêncio. Cada praça nova que a coleta publica
 * engorda todo documento do site, e a linha que causa isso continua parecendo
 * correta.
 */

/**
 * Quem pode chamar a função, e por quê.
 *
 * Lista curta de propósito. Cada entrada aqui é uma cópia da lista viajando
 * para algum lugar, e o motivo precisa estar escrito ao lado.
 */
const PERMITIDOS: { arquivo: string; porque: string }[] = [
  {
    arquivo: "src/app/pracas.json/route.ts",
    porque:
      "É o arquivo que a busca baixa sob demanda. É o ÚNICO lugar onde a " +
      "lista inteira deve existir: um recurso próprio, buscado uma vez e " +
      "guardado pelo navegador, em vez de repetido dentro de cada página.",
  },
];

function arquivosDeCodigo(raiz: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(raiz)) {
    const caminho = join(raiz, nome);
    if (statSync(caminho).isDirectory()) achados.push(...arquivosDeCodigo(caminho));
    else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) achados.push(caminho);
  }
  return achados;
}

/**
 * Comentário fora da varredura.
 *
 * Este arquivo nomeia a função para proibi-la, e `regioes.ts` a documenta. É a
 * oitava vez nesta base que uma guarda encontraria o texto que a justifica.
 */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("a lista de praças não entra no documento", () => {
  const arquivos = [
    ...arquivosDeCodigo(join("src", "app")),
    ...arquivosDeCodigo(join("src", "components")),
  ];

  it("acha arquivos para varrer", () => {
    // Lastro: varredura vazia não pode passar por aprovação.
    expect(arquivos.length).toBeGreaterThan(50);
  });

  it("acha a chamada que a guarda existe para permitir", () => {
    // Se o endereço do permitido mudar e ninguém atualizar aqui, a guarda
    // continuaria "passando" sem vigiar coisa nenhuma.
    const permitido = arquivos.filter((c) =>
      PERMITIDOS.some((p) => c.replaceAll("\\", "/") === p.arquivo),
    );
    expect(permitido).toHaveLength(PERMITIDOS.length);
    for (const c of permitido) {
      expect(semComentario(readFileSync(c, "utf8"))).toContain("pracasParaBusca()");
    }
  });

  it("só o arquivo baixado sob demanda monta a lista inteira", () => {
    const culpados: string[] = [];

    for (const caminho of arquivos) {
      const normalizado = caminho.replaceAll("\\", "/");
      if (PERMITIDOS.some((p) => normalizado === p.arquivo)) continue;
      if (semComentario(readFileSync(caminho, "utf8")).includes("pracasParaBusca(")) {
        culpados.push(normalizado);
      }
    }

    expect(
      culpados,
      `montam a lista inteira dentro de uma página:\n${culpados.join("\n")}\n\n` +
        `São 1246 praças, 147 KB. Toda página que monta esta lista a embute no ` +
        `próprio documento E em cada resposta de prefetch de rota. Em 20/09/2026 ` +
        `isso era 64% de tudo que abrir a home baixava. A busca já pega a lista ` +
        `de /pracas.json sob demanda: não passe por propriedade.`,
    ).toEqual([]);
  });

  it("o componente da busca não recebe a lista por propriedade", () => {
    const fonte = semComentario(readFileSync(join("src", "components", "BuscaDePracas.tsx"), "utf8"));

    expect(
      fonte,
      "BuscaDePracas voltou a aceitar `pracas` por propriedade. Foi assim que " +
        "a lista entrou em toda página do site.",
    ).not.toMatch(/pracas:\s*PracaBuscavel\[\]/);

    // E continua buscando de onde deve. Sem isto, a guarda acima passaria
    // também num componente que simplesmente perdeu a busca.
    expect(fonte).toContain('fetch("/pracas.json")');
  });
});
