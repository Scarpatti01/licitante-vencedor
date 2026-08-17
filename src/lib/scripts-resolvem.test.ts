import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Os scripts agendados conseguem carregar o que importam.
 *
 * ## O defeito que este arquivo existe para não deixar voltar
 *
 * Em 17/08 a publicação de posts morreu nos 25 editais. Duas causas empilhadas,
 * e nenhuma delas aparece em build, tipo ou teste:
 *
 * **1. Extensão.** `node` executa TypeScript apagando os tipos, e a resolução de
 * ESM não adivinha extensão: `from "../dominio/procedencia"` procura um arquivo
 * com esse nome exato e desiste. O arquivo existia; faltava o `.ts`.
 *
 * **2. `server-only`.** `ia/gemini.ts` importa `server-only`, que lança quando
 * não resolve pela condição `react-server`. O workflow de alertas já passava
 * `--conditions=react-server` e documentava o porquê; o de coleta chamava
 * `publicar-posts.ts` sem a flag.
 *
 * ## Por que nenhuma outra verificação pega
 *
 * Todos os outros consumidores resolvem sem extensão e sem a condição:
 *
 *   · Turbopack, no `next build` — o site compila;
 *   · `tsc --noEmit`, com `moduleResolution: bundler` — tipos limpos;
 *   · vitest, com o resolvedor do Vite e `server-only` apontado para um módulo
 *     vazio — testes verdes.
 *
 * Quatro passos de CI, quatro resoluções bem-sucedidas, e o único ambiente que
 * importa para o cron falhando sozinho, de madrugada, num log que ninguém abre
 * enquanto o job termina verde.
 *
 * ## A distinção que torna a primeira guarda exata
 *
 * `import type` é apagado pelo runtime e nunca chega ao resolvedor — foi por
 * isso que a coleta funcionava enquanto a análise quebrava: `pncp/` importava
 * tipos, `ia/` importava valores.
 *
 * A guarda cobra a extensão dos dois. Import de tipo sem extensão é uma bomba
 * armada: no dia em que alguém precisar de um valor daquele módulo, o script
 * quebra — e a mudança que armou não terá nada a ver com o script.
 */

const DECLARACAO = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?[\s\S]*?from\s*["']([^"']+)["']/g;
const DINAMICO = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
const EFEITO = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;

const COM_EXTENSAO = /\.(ts|tsx|js|mjs|cjs|json)$/;

/** Comentário citando um caminho não é import. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function especificadores(fonte: string): string[] {
  const limpa = semComentarios(fonte);
  return [
    ...[...limpa.matchAll(DECLARACAO)].map((m) => m[1]),
    ...[...limpa.matchAll(DINAMICO)].map((m) => m[1]),
    ...[...limpa.matchAll(EFEITO)].map((m) => m[1]),
  ];
}

/**
 * Onde um especificador relativo aterrissa.
 *
 * Trata diretório com `index.ts`, e não só arquivo: foi exatamente esse caso —
 * `./prompts` — que escapou da primeira versão desta guarda e só apareceu quando
 * o `node` tentou importar de verdade.
 */
function alvoDe(arquivo: string, especificador: string): string {
  const base = resolve(dirname(arquivo), especificador);
  if (COM_EXTENSAO.test(especificador)) return base;
  if (existsSync(`${base}.ts`)) return `${base}.ts`;
  if (existsSync(join(base, "index.ts"))) return join(base, "index.ts");
  return base;
}

function scripts(): string[] {
  return readdirSync("scripts")
    .filter((n) => n.endsWith(".ts"))
    .map((n) => resolve("scripts", n));
}

/** Anda o grafo relativo a partir de uma entrada, visitando cada módulo uma vez. */
function grafoDe(entrada: string): Set<string> {
  const vistos = new Set<string>();
  (function andar(arquivo: string) {
    if (vistos.has(arquivo) || !existsSync(arquivo)) return;
    vistos.add(arquivo);
    for (const e of especificadores(readFileSync(arquivo, "utf8"))) {
      if (e.startsWith(".")) andar(alvoDe(arquivo, e));
    }
  })(entrada);
  return vistos;
}

describe("os scripts resolvem o que importam", () => {
  /**
   * Anda o grafo a partir de `scripts/`, e não a árvore inteira de `src/`: o app
   * do Next tem todo o direito de importar sem extensão, porque quem o resolve é
   * o bundler. A regra vale para quem `node` executa direto.
   */
  it("todo import relativo do grafo dos scripts tem extensão", () => {
    const achados: string[] = [];
    const vistos = new Set<string>();

    (function andar(arquivo: string) {
      if (vistos.has(arquivo) || !existsSync(arquivo)) return;
      vistos.add(arquivo);
      for (const e of especificadores(readFileSync(arquivo, "utf8"))) {
        if (!e.startsWith(".")) continue;
        const base = resolve(dirname(arquivo), e);
        // Só acusa quando existe algo de verdade do outro lado; caminho já
        // quebrado é outro problema, e viraria ruído aqui.
        const existe = existsSync(`${base}.ts`) || existsSync(join(base, "index.ts"));
        if (!COM_EXTENSAO.test(e) && existe) {
          achados.push(`  ${relative(".", arquivo)} → "${e}"`);
        }
        andar(alvoDe(arquivo, e));
      }
    });

    for (const s of scripts()) {
      (function andar(arquivo: string) {
        if (vistos.has(arquivo) || !existsSync(arquivo)) return;
        vistos.add(arquivo);
        for (const e of especificadores(readFileSync(arquivo, "utf8"))) {
          if (!e.startsWith(".")) continue;
          const base = resolve(dirname(arquivo), e);
          const existe = existsSync(`${base}.ts`) || existsSync(join(base, "index.ts"));
          if (!COM_EXTENSAO.test(e) && existe) {
            achados.push(`  ${relative(".", arquivo)} → "${e}"`);
          }
          andar(alvoDe(arquivo, e));
        }
      })(s);
    }

    expect(
      achados,
      `${achados.length} import(s) relativos sem extensão no grafo alcançável por ` +
        `\`scripts/\`:\n\n${achados.join("\n")}\n\n` +
        `\`node\` roda TypeScript apagando tipos e a resolução de ESM NÃO adivinha ` +
        `extensão — o import falha em execução mesmo com o arquivo existindo. ` +
        `Turbopack, tsc e vitest resolvem sem extensão, então build, tipos e testes ` +
        `seguem verdes: o único que quebra é o script agendado. Acrescente \`.ts\` ` +
        `(ou \`/index.ts\`, para diretório) ao caminho.`,
    ).toEqual([]);
  });

  /**
   * A guarda da guarda.
   *
   * Se o caminhador parar de encontrar módulos — por mudança de regex, de layout
   * de pastas, ou porque `scripts/` mudou de lugar —, o teste acima passa a
   * aprovar tudo em silêncio, que é o pior resultado possível para um teste.
   */
  it("o caminhador realmente percorre o grafo", () => {
    const total = new Set<string>();
    for (const s of scripts()) for (const m of grafoDe(s)) total.add(m);
    expect(
      total.size,
      "o caminhador deixou de percorrer o grafo dos scripts. Enquanto ele não " +
        "andar, o teste de extensões aprova qualquer coisa.",
    ).toBeGreaterThan(30);
  });
});

describe("quem importa `server-only` roda com a condição que o resolve", () => {
  /**
   * `server-only` existe para explodir quando um módulo de servidor é arrastado
   * para o cliente. Fora do Next, ele só resolve para a versão inofensiva sob a
   * condição `react-server` — e sem ela lança na importação.
   *
   * Este teste descobre sozinho QUAIS scripts precisam da flag, andando o grafo,
   * em vez de guardar uma lista escrita à mão que envelhece na primeira vez que
   * alguém acrescentar um import.
   */
  function precisaDaCondicao(script: string): boolean {
    for (const modulo of grafoDe(script)) {
      if (!existsSync(modulo)) continue;
      if (especificadores(readFileSync(modulo, "utf8")).includes("server-only")) return true;
    }
    return false;
  }

  const WORKFLOWS = readdirSync(join(".github", "workflows"))
    .filter((n) => n.endsWith(".yml"))
    .map((n) => ({ nome: n, texto: readFileSync(join(".github", "workflows", n), "utf8") }));

  it("todo script que alcança `server-only` é invocado com --conditions=react-server", () => {
    const faltando: string[] = [];

    for (const script of scripts()) {
      if (!precisaDaCondicao(script)) continue;
      const nome = relative(".", script);

      for (const { nome: wf, texto } of WORKFLOWS) {
        // Cada linha que invoca este script precisa trazer a flag.
        for (const linha of texto.split("\n")) {
          if (!linha.includes(nome)) continue;
          if (!linha.includes("node ")) continue;
          if (!linha.includes("--conditions=react-server")) {
            faltando.push(`  ${wf}: ${linha.trim()}`);
          }
        }
      }
    }

    expect(
      faltando,
      `invocação(ões) sem \`--conditions=react-server\`:\n\n${faltando.join("\n")}\n\n` +
        `O grafo destes scripts alcança \`server-only\`, que LANÇA na importação ` +
        `quando não resolve pela condição \`react-server\`. Foi assim que a ` +
        `publicação de posts morreu em 17/08 nos 25 editais, com o job verde — ` +
        `a falha é capturada por edital e some no log.`,
    ).toEqual([]);
  });

  it("pelo menos um script alcança `server-only`", () => {
    // Se nenhum alcançar, o teste acima vira decoração: ele passaria com todos
    // os workflows errados.
    expect(
      scripts().some((s) => precisaDaCondicao(s)),
      "nenhum script alcança `server-only`. Se isso é verdade, o teste acima não " +
        "guarda mais nada e pode sair; se não é, o caminhador quebrou.",
    ).toBe(true);
  });
});
