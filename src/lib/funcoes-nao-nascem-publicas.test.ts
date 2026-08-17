import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Nenhuma função nova de `public` fica alcançável sem que alguém tenha decidido.
 *
 * ## A armadilha, que já pegou duas vezes
 *
 * `20260814104000_endurecer_privilegios` faz `revoke all on all functions in
 * schema public from anon`. Parece resolver o assunto e não resolve: vale para
 * as funções que existiam naquele instante, e o Postgres não guarda a regra
 * para as futuras. Cada função criada depois nasce outra vez exposta, por dois
 * mecanismos independentes que `20260814120000` documenta em detalhe:
 *
 *   1. o Postgres concede EXECUTE ao pseudo-papel `PUBLIC` em toda função nova,
 *      e `anon` herda dele;
 *   2. o Supabase, por default privileges do projeto, concede EXECUTE
 *      nominalmente a `anon` e `authenticated`.
 *
 * A primeira vez custou uma migração inteira (as quatro funções de trigger,
 * incluindo uma `security definer`, expostas em `/rest/v1/rpc/`). A segunda foi
 * `texto_do_json`, em 17/08, auxiliar de `salvar_perfil_da_empresa`: a função
 * principal trouxe o próprio revoke, a auxiliar criada no mesmo arquivo não — e
 * virou a única função do schema que `anon` podia chamar.
 *
 * O padrão é sempre o mesmo: quem escreve a migração pensa na função que
 * importa e esquece a que só existe para servi-la.
 *
 * ## Por que um teste de texto, e não uma consulta ao banco
 *
 * O banco responde sobre o banco de HOJE. Esta guarda precisa falhar no
 * momento em que a migração é escrita — antes de existir em lugar nenhum —,
 * porque o custo de descobrir depois é uma migração corretiva e uma janela em
 * que a função esteve aberta.
 */

const PASTA = join("supabase", "migrations");

/**
 * A migração que fez a limpeza geral. Antes dela, funções sem revoke próprio
 * estão cobertas; depois, cada uma responde por si.
 */
const LIMPEZA_GERAL = "20260814104000";

/** Comentário citando uma função não é declaração de função. */
function semComentarios(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*--.*$/gm, "");
}

type Migracao = { arquivo: string; versao: string; sql: string };

function migracoes(): Migracao[] {
  return readdirSync(PASTA)
    .filter((n) => n.endsWith(".sql"))
    .sort()
    .map((arquivo) => ({
      arquivo,
      versao: arquivo.slice(0, 14),
      sql: semComentarios(readFileSync(join(PASTA, arquivo), "utf8")),
    }));
}

const CRIA = /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z_0-9]+)\s*\(/g;

describe("função criada depois da limpeza geral fecha a própria porta", () => {
  it("toda função nova revoga EXECUTE de `public` e de `anon`", () => {
    const abertas: string[] = [];

    for (const { arquivo, versao, sql } of migracoes()) {
      if (versao <= LIMPEZA_GERAL) continue;

      for (const [, nome] of sql.matchAll(CRIA)) {
        // O revoke pode estar na mesma migração ou numa posterior — é o caso
        // das quatro funções de trigger, fechadas em `20260814120000`.
        const fechada = migracoes().some(({ sql: outra }) =>
          new RegExp(
            `revoke\\s+execute\\s+on\\s+function\\s+public\\.${nome}\\s*\\([^)]*\\)\\s+from\\s+[^;]*\\bpublic\\b[^;]*\\banon\\b`,
          ).test(outra),
        );

        if (!fechada) abertas.push(`  ${arquivo} → public.${nome}()`);
      }
    }

    expect(
      abertas,
      `${abertas.length} função(ões) criada(s) depois de ${LIMPEZA_GERAL} sem ` +
        `revoke próprio:\n\n${abertas.join("\n")}\n\n` +
        `\`revoke all on all functions ... from anon\` cobre o que existia ` +
        `naquele momento e NADA do que vier depois: o Postgres concede EXECUTE ` +
        `ao pseudo-papel PUBLIC em toda função nova (e \`anon\` herda dele), e o ` +
        `Supabase concede nominalmente a \`anon\` e \`authenticated\` por default ` +
        `privileges. A função fica em /rest/v1/rpc/ para quem não tem conta. ` +
        `Acrescente \`revoke execute on function public.<nome>(<tipos>) from ` +
        `public, anon;\` e, se algum papel precisar chamá-la, um \`grant\` ` +
        `explícito depois — como fazem \`criar_empresa_com_dono\` e ` +
        `\`salvar_perfil_da_empresa\`.`,
    ).toEqual([]);
  });

  /**
   * A guarda da guarda: se o padrão parar de encontrar declarações — porque
   * mudou o estilo de escrita, ou porque a pasta mudou de lugar —, o teste
   * acima passa a aprovar tudo em silêncio.
   */
  it("o varredor realmente encontra funções", () => {
    const encontradas = migracoes().flatMap(({ sql }) => [...sql.matchAll(CRIA)].map((m) => m[1]));
    expect(
      new Set(encontradas).size,
      "o varredor deixou de encontrar declarações de função nas migrações. " +
        "Enquanto ele não encontrar, a guarda acima aprova qualquer coisa.",
    ).toBeGreaterThan(10);
  });
});
