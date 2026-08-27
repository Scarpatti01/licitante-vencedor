import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ESTILO_PREMIUM } from "./estilo";

/**
 * A página de venda centraliza blocos com a utilidade `mx-auto` do Tailwind,
 * que vale `margin-inline:auto` e tem especificidade de uma classe. As regras
 * do Minimalista Premium são escritas como `.premium .serifa`, que é uma classe
 * a mais: qualquer margem horizontal declarada ali vence a utilidade e encosta
 * o bloco à esquerda, calado.
 *
 * Foi o que aconteceu: `.premium h1, .premium h2, .premium h3, .premium .serifa`
 * trazia `margin:0`, e o subtítulo do herói ficava 112px fora do eixo enquanto
 * todo o resto da dobra continuava centralizado. Ninguém percebe lendo o código,
 * porque a classe que quebra está num arquivo e a que sofre está noutro.
 *
 * A guarda não guarda uma lista de nomes proibidos. Ela deriva os dois lados do
 * próprio código: quais classes a folha de estilo trava no eixo horizontal, e
 * quais classes as telas de venda de fato combinam com `mx-auto`. Se as duas
 * listas se encontrarem, existe um bloco que se pretende centralizado e não é.
 */

const PASTAS = ["src/components/venda", "src/app/jornada"];

function semComentarios(css: string) {
  // Um comentário citando `margin:0` para explicar o defeito não pode virar o
  // defeito, senão a guarda passa a medir a explicação em vez da regra.
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Classes cuja regra declara margem no eixo horizontal. */
function classesQueTravamOEixo(css: string) {
  const travadas = new Set<string>();
  for (const [, seletores, corpo] of semComentarios(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const horizontal = corpo
      .split(";")
      .map((d) => d.trim().toLowerCase())
      .some((d) => {
        const [prop, valor] = d.split(":").map((p) => p?.trim());
        if (!prop || valor === undefined) return false;
        if (prop === "margin-left" || prop === "margin-right" || prop === "margin-inline") return true;
        // O atalho `margin` só não mexe no eixo horizontal se for `margin-block`.
        return prop === "margin" && valor !== "auto";
      });
    if (!horizontal) continue;
    for (const [, classe] of seletores.matchAll(/\.([a-zA-Z][\w-]*)/g)) travadas.add(classe);
  }
  return travadas;
}

/** Classes que as telas de venda combinam com `mx-auto` no mesmo elemento. */
function classesCentralizadasNaMao() {
  const usadas = new Set<string>();
  for (const pasta of PASTAS) {
    for (const nome of readdirSync(pasta)) {
      if (!nome.endsWith(".tsx")) continue;
      const fonte = readFileSync(`${pasta}/${nome}`, "utf8");
      for (const [, lista] of fonte.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const classes = (lista ?? "").split(/\s+/).filter(Boolean);
        if (!classes.includes("mx-auto")) continue;
        for (const c of classes) if (c !== "mx-auto") usadas.add(c);
      }
    }
  }
  return usadas;
}

describe("o Minimalista Premium não desfaz a centralização", () => {
  it("acha as telas de venda para medir", () => {
    // Sem lastro, as duas listas viriam vazias e a guarda passaria sem ler nada.
    const arquivos = PASTAS.flatMap((p) => readdirSync(p).filter((n) => n.endsWith(".tsx")));
    expect(arquivos.length, "nenhuma tela de venda encontrada").toBeGreaterThan(0);
  });

  it("acha pelo menos um bloco centralizado com mx-auto", () => {
    expect(classesCentralizadasNaMao().size, "nenhum uso de mx-auto para proteger").toBeGreaterThan(0);
  });

  it("nenhuma classe centralizada tem a margem horizontal travada pela folha", () => {
    const travadas = classesQueTravamOEixo(ESTILO_PREMIUM);
    const conflito = [...classesCentralizadasNaMao()].filter((c) => travadas.has(c));
    expect(
      conflito,
      `estas classes aparecem junto de mx-auto e a folha trava a margem horizontal delas, ` +
        `então o bloco encosta à esquerda: ${conflito.join(", ")}. ` +
        `Use margin-block na regra, em vez do atalho margin.`,
    ).toEqual([]);
  });
});
