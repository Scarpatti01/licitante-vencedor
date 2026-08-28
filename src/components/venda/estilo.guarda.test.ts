import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ESTILO_PREMIUM } from "./estilo";

/**
 * A folha do Minimalista Premium não pode vencer as utilidades de margem.
 *
 * As regras da folha são escritas como `.premium h2` ou `.premium .serifa`, que
 * valem duas classes de especificidade. As utilidades do Tailwind (`mt-12`,
 * `mx-auto`) valem uma. Toda margem declarada na folha, portanto, apaga em
 * silêncio o espaçamento pedido na marcação, e ninguém percebe lendo o código,
 * porque a classe que vence está num arquivo e a que perde está noutro.
 *
 * Aconteceu duas vezes, uma em cada eixo:
 *
 * - `margin:0` apagava `mx-auto`, e o subtítulo do herói ficava 112px fora do
 *   eixo enquanto o resto da dobra continuava centralizado.
 * - `margin-block:0`, que entrou para consertar o caso acima, apagava todo
 *   `mt-*`: 17 elementos pediam espaçamento e recebiam zero, e os cartões do
 *   bloco da dor ficavam colados no texto seguinte.
 *
 * A primeira versão desta guarda olhava só o eixo horizontal, e por isso ficou
 * verde enquanto o segundo defeito estava no ar. Agora ela mede os dois, e
 * também os seletores de tipo (`.premium h2`), que foram por onde o segundo
 * escapou.
 *
 * Nada aqui é lista de nomes proibidos, que envelheceria. Os dois lados saem do
 * próprio código: de um lado as classes e tags cuja margem a folha trava, e em
 * qual eixo; do outro, as que a marcação combina com uma utilidade de margem, e
 * em qual eixo. Cruzamento no mesmo eixo é marcação pedindo espaçamento que
 * nunca vai receber.
 */

const PASTAS = ["src/components/venda", "src/app/jornada"];
const TAGS = "h1|h2|h3|h4|h5|h6|p|ul|ol|li|dl|dd|dt";

type Eixo = "horizontal" | "vertical";

function semComentarios(css: string) {
  // Um comentário citando `margin:0` para explicar o defeito não pode virar o
  // defeito, senão a guarda mede a explicação em vez da regra.
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Em que eixos manda esta propriedade CSS. */
function eixosDaPropriedade(prop: string, valor: string): Eixo[] {
  // `margin:auto` não briga com utilidade nenhuma: é o que `mx-auto` faria.
  if (prop === "margin") return valor === "auto" ? [] : ["horizontal", "vertical"];
  if (prop === "margin-left" || prop === "margin-right" || prop === "margin-inline") {
    return ["horizontal"];
  }
  if (prop === "margin-top" || prop === "margin-bottom" || prop === "margin-block") {
    return ["vertical"];
  }
  return [];
}

/** Em que eixos manda esta utilidade do Tailwind. */
function eixosDaUtilidade(classe: string): Eixo[] {
  if (/^-?m-\S/.test(classe)) return ["horizontal", "vertical"];
  if (/^-?mx-\S/.test(classe) || /^-?m[lr]-\S/.test(classe)) return ["horizontal"];
  if (/^-?my-\S/.test(classe) || /^-?m[tb]-\S/.test(classe)) return ["vertical"];
  return [];
}

/** O que a folha trava, por alvo e eixo. `alvos` diz se lemos classes ou tags. */
function travadoPelaFolha(css: string, alvos: "classes" | "tags") {
  const padrao =
    alvos === "classes"
      ? /\.([a-zA-Z][\w-]*)/g
      : new RegExp(String.raw`\.premium\s+(${TAGS})\b`, "g");
  const travado = new Map<string, Set<Eixo>>();

  for (const [, seletores, corpo] of semComentarios(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const eixos = new Set<Eixo>();
    for (const declaracao of corpo.split(";")) {
      const [prop, valor] = declaracao.split(":").map((p) => p?.trim().toLowerCase());
      if (!prop || valor === undefined) continue;
      for (const eixo of eixosDaPropriedade(prop, valor)) eixos.add(eixo);
    }
    if (eixos.size === 0) continue;
    for (const [, alvo] of seletores.matchAll(padrao)) {
      const atual = travado.get(alvo) ?? new Set<Eixo>();
      for (const e of eixos) atual.add(e);
      travado.set(alvo, atual);
    }
  }
  return travado;
}

function paraCadaClassName(visita: (classes: string[], tag: string | null) => void) {
  for (const pasta of PASTAS) {
    for (const nome of readdirSync(pasta)) {
      if (!nome.endsWith(".tsx")) continue;
      const fonte = readFileSync(`${pasta}/${nome}`, "utf8");
      // Com a tag junto, quando dá para saber qual é.
      for (const [, tag, atributos] of fonte.matchAll(
        new RegExp(String.raw`<(${TAGS})\s([^>]*?)>`, "g"),
      )) {
        const lista = atributos.match(/className="([^"]*)"/)?.[1] ?? "";
        visita(lista.split(/\s+/).filter(Boolean), tag);
      }
      // E solto, para os className de componentes e divs.
      for (const [, aspas, crase] of fonte.matchAll(
        /className=(?:"([^"]*)"|\{`([^`]*)`\})/g,
      )) {
        visita((aspas ?? crase ?? "").split(/\s+/).filter(Boolean), null);
      }
    }
  }
}

/** O que a marcação pede, por alvo e eixo. */
function pedidoNaMarcacao(alvos: "classes" | "tags") {
  const pedido = new Map<string, Set<Eixo>>();
  paraCadaClassName((classes, tag) => {
    const eixos = new Set<Eixo>();
    for (const c of classes) for (const e of eixosDaUtilidade(c)) eixos.add(e);
    if (eixos.size === 0) return;

    const chaves =
      alvos === "tags"
        ? tag
          ? [tag]
          : []
        : classes.filter((c) => eixosDaUtilidade(c).length === 0);

    for (const chave of chaves) {
      const atual = pedido.get(chave) ?? new Set<Eixo>();
      for (const e of eixos) atual.add(e);
      pedido.set(chave, atual);
    }
  });
  return pedido;
}

function conflitos(travado: Map<string, Set<Eixo>>, pedido: Map<string, Set<Eixo>>) {
  const achados: string[] = [];
  for (const [alvo, eixosPedidos] of pedido) {
    const eixosTravados = travado.get(alvo);
    if (!eixosTravados) continue;
    for (const eixo of eixosPedidos) {
      if (eixosTravados.has(eixo)) achados.push(`${alvo} (${eixo})`);
    }
  }
  return achados.sort();
}

describe("o Minimalista Premium não apaga o espaçamento da marcação", () => {
  it("acha as telas de venda para medir", () => {
    // Sem lastro, as listas viriam vazias e a guarda passaria sem ler nada.
    const arquivos = PASTAS.flatMap((p) => readdirSync(p).filter((n) => n.endsWith(".tsx")));
    expect(arquivos.length, "nenhuma tela de venda encontrada").toBeGreaterThan(0);
  });

  it("acha marcação pedindo margem nos dois eixos", () => {
    // O outro lado do lastro: se a marcação deixasse de pedir margem, os testes
    // abaixo passariam sem proteger coisa alguma.
    const eixos = new Set<Eixo>();
    for (const alvos of ["classes", "tags"] as const) {
      for (const conjunto of pedidoNaMarcacao(alvos).values()) {
        for (const e of conjunto) eixos.add(e);
      }
    }
    expect([...eixos].sort(), "a marcação deixou de pedir margem em algum eixo").toEqual([
      "horizontal",
      "vertical",
    ]);
  });

  it("nenhuma classe tem a margem travada no eixo em que a marcação a pede", () => {
    const achados = conflitos(travadoPelaFolha(ESTILO_PREMIUM, "classes"), pedidoNaMarcacao("classes"));
    expect(
      achados,
      `a folha trava a margem destas classes no mesmo eixo em que a marcação pede ` +
        `espaçamento, então a utilidade do Tailwind é apagada em silêncio: ${achados.join(", ")}. ` +
        `Tire a declaração de margem da regra: o preflight do Tailwind já zera margem, ` +
        `e com especificidade menor que a das utilidades.`,
    ).toEqual([]);
  });

  it("nenhum seletor de tipo trava a margem que a marcação pede", () => {
    const achados = conflitos(travadoPelaFolha(ESTILO_PREMIUM, "tags"), pedidoNaMarcacao("tags"));
    expect(
      achados,
      `a folha trava a margem destes elementos no mesmo eixo em que a marcação pede ` +
        `espaçamento: ${achados.join(", ")}. Foi por aqui que o defeito do \`mt-*\` escapou. ` +
        `Tire a declaração de margem da regra.`,
    ).toEqual([]);
  });
});
