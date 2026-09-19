import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Uma tela, um relógio.
 *
 * ## O defeito, medido
 *
 * Até 19/09/2026 `painel/page.tsx` fazia isto:
 *
 *     const [painel, lista] = await Promise.all([
 *       repo.painelDoDia(empresaId, agora),
 *       repo.listarOportunidades(empresaId),        // ← caía em new Date()
 *     ]);
 *
 * Duas avaliações de prazo no mesmo render, com dois instantes. Um certame que
 * encerrasse entre as duas chamadas podia aparecer como aberto no painel e
 * encerrado na lista logo abaixo, na mesma tela.
 *
 * A janela é de milissegundos, e o `Promise.all` a torna menor ainda. É por
 * isso que o defeito sobreviveu: ele não reprova teste nenhum, e quando
 * acontece é uma vez, para um cliente, num horário que ninguém reproduz depois.
 *
 * ## O que o compilador já cobre, e o que falta
 *
 * `porta.ts` tirou o `?` de `agora`: nenhuma chamada compila sem instante. Isso
 * mata a chamada distraída, que foi a causa aqui.
 *
 * Não mata a chamada deliberada. `listarOportunidades(empresaId, undefined,
 * new Date())` compila, e devolve os dois relógios à tela com uma linha a mais.
 * Esta guarda cobra que o instante venha de uma variável, porque uma variável
 * é compartilhável e um `new Date()` no meio da chamada nunca é.
 */

const METODOS = ["painelDoDia", "listarOportunidades"];

function paginas(raiz: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(raiz)) {
    const caminho = join(raiz, nome);
    if (statSync(caminho).isDirectory()) achados.push(...paginas(caminho));
    else if (nome === "page.tsx") achados.push(caminho);
  }
  return achados;
}

/** O trecho entre os parênteses da chamada, com os aninhados respeitados. */
function argumentosDe(fonte: string, inicio: number): string {
  let profundidade = 0;
  for (let i = inicio; i < fonte.length; i++) {
    if (fonte[i] === "(") profundidade++;
    else if (fonte[i] === ")") {
      profundidade--;
      if (profundidade === 0) return fonte.slice(inicio + 1, i);
    }
  }
  return fonte.slice(inicio);
}

/**
 * Comentário fora da varredura.
 *
 * O cabeçalho deste arquivo cita a chamada errada para explicá-la, e as telas
 * comentam por que compartilham o instante. Sétima ocorrência nesta base de uma
 * guarda que encontraria o texto que a justifica.
 */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("tela não avalia prazo com dois relógios", () => {
  const arquivos = paginas(join("src", "app"));

  const comChamada = arquivos.filter((c) => {
    const fonte = semComentario(readFileSync(c, "utf8"));
    return METODOS.some((m) => fonte.includes(`${m}(`));
  });

  it("acha as telas que a guarda existe para vigiar", () => {
    // Lastro. Uma varredura que não encontra nada passaria como aprovação, e
    // este arquivo viraria decoração no dia em que os métodos mudassem de nome.
    expect(arquivos.length).toBeGreaterThan(20);
    expect(comChamada.length).toBeGreaterThanOrEqual(3);
  });

  it("o instante vem de uma variável, nunca de um new Date() na chamada", () => {
    const culpadas: string[] = [];

    for (const caminho of comChamada) {
      const fonte = semComentario(readFileSync(caminho, "utf8"));

      for (const metodo of METODOS) {
        let de = fonte.indexOf(`${metodo}(`);
        while (de !== -1) {
          const args = argumentosDe(fonte, de + metodo.length);
          if (/new Date\(/.test(args)) {
            culpadas.push(`${caminho}: ${metodo}(${args.replace(/\s+/g, " ").trim().slice(0, 70)})`);
          }
          de = fonte.indexOf(`${metodo}(`, de + metodo.length);
        }
      }
    }

    expect(
      culpadas,
      `instante criado dentro da chamada:\n${culpadas.join("\n")}\n\n` +
        `Declare um \`const agora = new Date()\` no topo da tela e passe ele em ` +
        `todas as chamadas. Um new Date() por chamada dá à mesma tela dois ` +
        `instantes, e o certame que encerra entre as duas aparece aberto em uma ` +
        `metade e encerrado na outra.`,
    ).toEqual([]);
  });

  it("cada tela declara um instante só", () => {
    const culpadas: string[] = [];

    for (const caminho of comChamada) {
      const fonte = semComentario(readFileSync(caminho, "utf8"));
      const declaracoes = [...fonte.matchAll(/const\s+(\w+)\s*=\s*new Date\(\s*\)/g)];

      if (declaracoes.length > 1) {
        culpadas.push(`${caminho}: ${declaracoes.map((d) => d[1]).join(", ")}`);
      }
    }

    expect(
      culpadas,
      `mais de um instante declarado na mesma tela:\n${culpadas.join("\n")}\n\n` +
        `Duas variáveis de relógio numa tela é o mesmo defeito com outra cara: ` +
        `nada garante que as duas chamadas peguem a mesma.`,
    ).toEqual([]);
  });
});
