import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Duas armadilhas de acessibilidade que já morderam este projeto.
 *
 * As duas foram encontradas por auditoria externa em 22/08, e nenhuma aparecia
 * em teste nem em revisão de código — porque nas duas o HTML está sintaticamente
 * correto e o defeito só existe no que o navegador faz com ele.
 */

const SRC = join(import.meta.dirname, "..");

function arquivosDeInterface(dir: string): { caminho: string; texto: string }[] {
  const achados: { caminho: string; texto: string }[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...arquivosDeInterface(caminho));
    else if (entrada.name.endsWith(".tsx")) {
      achados.push({ caminho: caminho.slice(SRC.length + 1), texto: readFileSync(caminho, "utf8") });
    }
  }
  return achados;
}

const INTERFACE = arquivosDeInterface(SRC);

describe("rótulo sem papel semântico não é lido", () => {
  it("nenhum `span` carrega `aria-label` sem `role`", () => {
    /*
     * `aria-label` num `span` sem `role` é IGNORADO pelo leitor de tela — a
     * especificação chama de atributo proibido. O HTML fica válido, a revisão
     * de código não estranha, e quem usa leitor de tela simplesmente não ouve
     * nada ali.
     *
     * Aconteceu na home: o logo não é link (a pessoa já está na home), então
     * virou `span aria-label`. O SVG é `aria-hidden` e o nome escrito some no
     * celular — o resultado era um elemento completamente mudo.
     */
    for (const { caminho, texto } of INTERFACE) {
      // `<span` seguido de `aria-label` antes do `>`, sem `role` no meio.
      const proibido = /<span(?![^>]*\brole=)[^>]*\saria-label=/;

      expect(
        proibido.test(texto),
        `${caminho} tem \`<span aria-label>\` sem \`role\`. O rótulo será IGNORADO ` +
          `pelo leitor de tela. Acrescente \`role="img"\` (ou o papel adequado), ou ` +
          `use um elemento que já tenha semântica — um \`<a>\`, por exemplo.`,
      ).toBe(false);
    }
  });
});

describe("campo que pinta o próprio fundo declara a própria cor", () => {
  it("todo input com fundo próprio também define a cor do texto", () => {
    /*
     * O defeito: o campo de busca pintava `bg-[var(--surface)]` (claro) e NÃO
     * declarava cor de texto, herdando a do cabeçalho da home, que é escuro e
     * escreve em claro. Deu texto `#cad5e2` sobre `#f5f7fa` — 1,39:1, contra os
     * 4,5:1 da WCAG.
     *
     * O que fez isso passar despercebido: o `placeholder` TINHA cor própria e
     * aparecia normal. O campo parecia certo até alguém digitar, e aí o que foi
     * digitado sumia. Ninguém reporta um defeito assim — conclui que o site não
     * funciona e vai embora.
     */
    for (const { caminho, texto } of INTERFACE) {
      for (const tag of texto.match(/<input[^>]*>/g) ?? []) {
        if (!/className="[^"]*\bbg-\[/.test(tag)) continue;

        expect(
          /className="[^"]*\btext-\[/.test(tag),
          `${caminho}: este \`<input>\` pinta o próprio fundo e não declara a cor ` +
            `do texto — vai herdar a do ancestral, que pode ser clara sobre claro.\n\n${tag.slice(0, 200)}`,
        ).toBe(true);
      }
    }
  });
});
