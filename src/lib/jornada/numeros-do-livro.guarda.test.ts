import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Os números que o site afirma sobre o livro têm de sair do livro.
 *
 * O DEFEITO QUE MOTIVOU ESTA GUARDA
 *
 * O site anunciou "8 folhas de trabalho" em seis lugares, incluindo a
 * ancoragem de preço e a arte do produto impressa em vinte e quatro páginas.
 * O livro tem SETE, de A.1 a A.7. Ninguém mentiu de propósito: o número foi
 * escrito uma vez, copiado dali para todo o resto, e nunca mais comparado com
 * a fonte.
 *
 * Junto com ele foi "126 páginas para preencher, e não para ler", que descreve
 * um caderno de exercícios. O livro tem 126 páginas de texto, com 25
 * exercícios e as 7 folhas dentro. Quem comprasse esperando 126 páginas de
 * formulário receberia outra coisa.
 *
 * POR QUE ESTA GUARDA LÊ O LIVRO, E NÃO UMA CONSTANTE
 *
 * É a mesma lição de `cobertura.ts`: um número certo que envelhece em silêncio
 * não quebra nada. Conferir a constante contra ela mesma passaria com o site
 * inteiro publicando oito. A única prova que vale é contar no `completo.html`,
 * que é de onde o PDF e o EPUB são gerados.
 */

const LIVRO = readFileSync("livro/completo.html", "utf8");

/** As folhas de trabalho do anexo, rotuladas A.1, A.2, e assim por diante. */
function folhasDeTrabalho(): string[] {
  return [...new Set(LIVRO.match(/\bA\.\d+\b/g) ?? [])].sort();
}

/** Cada exercício é uma seção com a classe `exercicio`. */
function exercicios(): number {
  return (LIVRO.match(/class="exercicio/g) ?? []).length;
}

/** Cada verbete do glossário é um `.verbete`. */
function verbetes(): number {
  return (LIVRO.match(/class="verbete/g) ?? []).length;
}

/** Onde o site afirma número sobre o livro. */
const ONDE_O_SITE_AFIRMA = [
  "src/lib/jornada/oferta.ts",
  "src/components/venda/copy-da-jornada.ts",
  "src/components/venda/OfertaDoWorkbook.tsx",
  "src/app/page.tsx",
];

const TEXTO_DO_SITE = ONDE_O_SITE_AFIRMA.map((caminho) => ({
  caminho,
  texto: readFileSync(caminho, "utf8"),
}));

describe("os números do livro batem com o livro", () => {
  it("acha o livro para medir", () => {
    // Sem lastro, todas as contagens dariam zero e as comparações abaixo
    // passariam por vacuidade.
    expect(LIVRO.length, "livro/completo.html sumiu ou está vazio").toBeGreaterThan(100_000);
    expect(folhasDeTrabalho().length).toBeGreaterThan(0);
    expect(exercicios()).toBeGreaterThan(0);
    expect(verbetes()).toBeGreaterThan(0);
  });

  it("o site anuncia o número de folhas de trabalho que o livro tem", () => {
    const folhas = folhasDeTrabalho();
    for (const { caminho, texto } of TEXTO_DO_SITE) {
      const anunciados = [...texto.matchAll(/(\d+)\s+folhas de trabalho/gi)].map((m) =>
        Number(m[1]),
      );
      for (const anunciado of anunciados) {
        expect(
          anunciado,
          `${caminho} anuncia ${anunciado} folhas de trabalho, e o livro tem ` +
            `${folhas.length} (${folhas.join(", ")}). Conte no livro antes de mudar o texto.`,
        ).toBe(folhas.length);
      }
    }
  });

  it("o site anuncia o número de verbetes que o glossário tem", () => {
    for (const { caminho, texto } of TEXTO_DO_SITE) {
      const anunciados = [...texto.matchAll(/(\d+)\s+termos/gi)].map((m) => Number(m[1]));
      for (const anunciado of anunciados) {
        expect(
          anunciado,
          `${caminho} anuncia ${anunciado} termos no glossário, e o livro tem ${verbetes()}`,
        ).toBe(verbetes());
      }
    }
  });

  it("o site anuncia o número de exercícios que o livro tem", () => {
    for (const { caminho, texto } of TEXTO_DO_SITE) {
      const anunciados = [...texto.matchAll(/(\d+)\s+exerc[íi]cios/gi)].map((m) => Number(m[1]));
      for (const anunciado of anunciados) {
        expect(
          anunciado,
          `${caminho} anuncia ${anunciado} exercícios, e o livro tem ${exercicios()}`,
        ).toBe(exercicios());
      }
    }
  });

  it("nenhuma página chama o livro inteiro de caderno para preencher", () => {
    /*
     * O livro é 126 páginas de TEXTO, com exercícios e folhas dentro. Dizer
     * "126 páginas para preencher" vende um bloco de formulários, que é outro
     * produto. A frase esteve no ar e foi o próprio dono quem pegou.
     */
    const enganosas = [
      /\d+\s+páginas para preencher/i,
      /páginas para preencher, e não para ler/i,
      /cada semana tem a sua folha/i,
    ];
    for (const { caminho, texto } of TEXTO_DO_SITE) {
      for (const frase of enganosas) {
        expect(
          frase.test(texto),
          `${caminho} descreve o livro como se todas as páginas fossem para ` +
            `preencher. São ${exercicios()} exercícios e ${folhasDeTrabalho().length} ` +
            `folhas dentro de um livro de texto.`,
        ).toBe(false);
      }
    }
  });
});
