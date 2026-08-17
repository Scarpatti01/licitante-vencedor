import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Todo job que roda um script instala o que o script importa.
 *
 * ## Duas vezes o mesmo defeito, em dois workflows diferentes
 *
 * **16/08.** A primeira rodada agendada com a publicação de posts ligada gravou
 * 25 posts sem uma única análise — `com leitura: 0 de 25` — e o job terminou
 * VERDE. `coletar-pncp.yml` nunca tinha rodado `npm ci`: a coleta usa só o
 * `fetch` embutido e passou meses sem precisar. A publicação precisa de
 * `pdfjs-dist` e `@google/genai`.
 *
 * **17/08.** A primeira execução do alerta com um perfil de empresa real morreu
 * em 11 segundos: `Cannot find package 'server-only' imported from
 * src/lib/email/resend.ts`. `enviar-alertas.yml` também nunca tinha rodado
 * `npm ci`. A correção de 16/08 foi feita só onde o defeito apareceu.
 *
 * Um mês entre um e outro, e o alerta não funcionou nenhuma vez nesse período —
 * sem que ninguém notasse, porque não havia perfil de empresa para receber.
 *
 * ## Por que esta guarda é por JOB, e não por arquivo
 *
 * Procurar `npm ci` no arquivo inteiro aprovaria um workflow que instala no job
 * `A` e roda o script no job `B`. Jobs não compartilham disco: cada um começa
 * numa máquina limpa. É exatamente o formato de `coletar-pncp-paralelo.yml`, que
 * tem um job de coleta e um de junção, e cada um instala o seu.
 */

const PASTA = join(".github", "workflows");

/** Comentário citando um comando não é o comando. */
function semComentarios(yaml: string): string {
  return yaml.replace(/^\s*#.*$/gm, "");
}

type Job = { workflow: string; nome: string; corpo: string };

/**
 * Fatia um workflow nos seus jobs.
 *
 * `jobs:` na coluna 0, cada job com dois espaços de indentação. É como os cinco
 * workflows deste repositório são escritos, e o teste seguinte cobra que o
 * fatiador continue encontrando jobs — se o formato mudar, ele acusa em vez de
 * aprovar tudo em silêncio.
 */
function jobsDe(workflow: string, yaml: string): Job[] {
  const limpo = semComentarios(yaml);
  const inicio = limpo.indexOf("\njobs:");
  if (inicio === -1) return [];

  const linhas = limpo.slice(inicio).split("\n");
  const jobs: Job[] = [];
  let atual: Job | null = null;

  for (const linha of linhas) {
    const cabecalho = /^ {2}([A-Za-z_][A-Za-z0-9_-]*):\s*$/.exec(linha);
    if (cabecalho) {
      if (atual) jobs.push(atual);
      atual = { workflow, nome: cabecalho[1], corpo: "" };
      continue;
    }
    if (atual) atual.corpo += `${linha}\n`;
  }
  if (atual) jobs.push(atual);
  return jobs;
}

function todosOsJobs(): Job[] {
  return readdirSync(PASTA)
    .filter((n) => n.endsWith(".yml"))
    .flatMap((n) => jobsDe(n, readFileSync(join(PASTA, n), "utf8")));
}

/** Linha que executa um script do repositório com `node`. */
const RODA_SCRIPT = /^\s*(?:-\s*)?.*\bnode\b[^\n]*\bscripts\/[a-z0-9-]+\.ts\b/;

describe("nenhum job roda script sem instalar dependências", () => {
  it("todo job que invoca `scripts/*.ts` roda `npm ci` antes", () => {
    const faltando: string[] = [];

    for (const job of todosOsJobs()) {
      const linhas = job.corpo.split("\n");
      const primeiroScript = linhas.findIndex((l) => RODA_SCRIPT.test(l));
      if (primeiroScript === -1) continue;

      // ANTES, não em qualquer lugar: um `npm ci` depois do script seria
      // decoração. Já houve um passo fora de ordem neste repositório —
      // a condição lia uma saída que ainda não existia.
      const instalaAntes = linhas
        .slice(0, primeiroScript)
        .some((l) => /\bnpm\s+ci\b/.test(l));

      if (!instalaAntes) {
        faltando.push(
          `  ${job.workflow} → job \`${job.nome}\`: ${linhas[primeiroScript].trim()}`,
        );
      }
    }

    expect(
      faltando,
      `${faltando.length} job(s) rodam script sem \`npm ci\` antes:\n\n${faltando.join("\n")}\n\n` +
        `Sem \`node_modules\`, o script morre no primeiro import de pacote — ` +
        `\`Cannot find package\`. Aconteceu duas vezes: em 16/08 apagou a ` +
        `análise de 25 editais com o job VERDE, e em 17/08 derrubou o alerta ` +
        `em 11 segundos. Jobs não compartilham disco: instalar num não instala ` +
        `no outro. Acrescente um passo \`npm ci --omit=dev\` antes da linha ` +
        `acima, no MESMO job.`,
    ).toEqual([]);
  });

  /**
   * A guarda da guarda. Se o fatiador parar de encontrar jobs — mudança de
   * indentação, de layout de pasta, de nome —, o teste acima passa a aprovar
   * qualquer coisa, que é o pior resultado possível para um teste.
   */
  it("o fatiador encontra jobs, e encontra jobs que rodam script", () => {
    const jobs = todosOsJobs();
    expect(jobs.length, "o fatiador deixou de encontrar jobs nos workflows").toBeGreaterThan(3);

    const comScript = jobs.filter((j) => j.corpo.split("\n").some((l) => RODA_SCRIPT.test(l)));
    expect(
      comScript.length,
      "nenhum job invoca `scripts/*.ts`. Se isso é verdade, a guarda acima não " +
        "protege mais nada; se não é, o padrão de detecção quebrou.",
    ).toBeGreaterThan(1);
  });
});
