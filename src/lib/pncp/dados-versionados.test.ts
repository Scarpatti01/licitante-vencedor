import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * Tudo que a coleta escreve em `dados/` precisa ser commitado por ela.
 *
 * ## O DEFEITO QUE MOTIVOU ESTA GUARDA
 *
 * `dados/municipios-publicados.json` nasceu no PR #50, em 21/08, com o título
 * "Páginas regionais não desaparecem mais depois de publicadas". Ele é escrito
 * a cada coleta e nunca entrou no `git add` de workflow nenhum. O runner é
 * destruído levando a versão nova junto, e a build seguinte lê o arquivo
 * congelado em 21/08.
 *
 * Resultado: o mecanismo que impede uma página publicada de morrer por um dia
 * fraco passou dezessete dias sem proteger nada que tenha sido publicado depois
 * dele. Com `dynamicParams = false`, cada morte dessas é 404 permanente. O
 * relatório de cobertura do Search Console de 07/09 contou 18, e onze foram
 * identificadas pelo nome (`/licitacoes/ba/cachoeira/`, `/licitacoes/rn/assu/`
 * e outras nove).
 *
 * ## POR QUE A LISTA EXPLÍCITA É A ARMADILHA
 *
 * O passo usa `git add -f <lista>`, e uma lista explícita não reclama do que
 * falta. Quem acrescenta um arquivo novo em `dados/` tem de lembrar de duas
 * coisas em dois lugares diferentes, e o dia em que esquecer não produz erro
 * nenhum: a coleta fica verde, o commit sai, e o que sumiu só aparece semanas
 * depois num relatório externo.
 *
 * Por isso esta guarda não confere se `municipios-publicados.json` está lá —
 * isso seria fechar o caso e deixar a classe aberta, que é o erro recorrente
 * deste repositório. Ela lê o que os SCRIPTS escrevem e cobra cada caminho
 * contra a lista de cada workflow que roda aquele script.
 *
 * ## A REGRA, E POR QUE ELA TEM DUAS SAÍDAS
 *
 * Nem tudo que a coleta escreve deve ser versionado: `dados/editais.json` é o
 * retrato cru de dezenas de MB, e `dados/parciais/` são os shards intermediários.
 * Os dois estão no `.gitignore`, e é isso que os torna decisão em vez de
 * esquecimento.
 *
 * Então a régua é: todo caminho escrito está OU na lista do `git add` OU no
 * `.gitignore`. O que a guarda proíbe não é ficar de fora — é ficar de fora
 * sem que ninguém tenha dito isso em lugar nenhum.
 */

const COLETAS = [
  {
    workflow: ".github/workflows/coletar-pncp-paralelo.yml",
    scripts: [
      "scripts/juntar-coleta.ts",
      "scripts/publicar-posts.ts",
      "scripts/publicar-abertos.ts",
    ],
  },
  {
    workflow: ".github/workflows/coletar-pncp.yml",
    scripts: ["scripts/ingerir-pncp.ts", "scripts/publicar-posts.ts"],
  },
] as const;

/**
 * Os caminhos em `dados/` que um script escreve.
 *
 * Reconhece as duas formas que os scripts usam: o literal `"dados/x.json"` e o
 * `resolve(pastaDados, "x.json")`, em que `pastaDados` é sempre o diretório do
 * agregado. Não tenta ser um analisador de TypeScript: se aparecer uma terceira
 * forma, o teste do lastro abaixo denuncia, porque a contagem cai.
 */
function escritosEmDados(script: string): string[] {
  const fonte = readFileSync(script, "utf8");
  const achados = new Set<string>();

  for (const m of fonte.matchAll(/["'`](dados\/[\w./-]+)["'`]/g)) {
    achados.add(m[1].replace(/\/$/, ""));
  }
  for (const m of fonte.matchAll(/resolve\(\s*pastaDados\s*,\s*["'`]([\w.-]+)["'`]/g)) {
    achados.add(`dados/${m[1]}`);
  }

  return [...achados];
}

/** Os caminhos que a linha de `git add` do workflow cobre. */
function versionados(workflow: string): string[] {
  const fonte = readFileSync(workflow, "utf8");
  const linha = fonte.match(/git add -f ([^\n]+)/)?.[1];
  return linha ? linha.trim().split(/\s+/) : [];
}

/** `dados/posts/` na lista cobre `dados/posts/2026-09-07.json`. */
function semBarra(p: string): string {
  return p.replace(/\/+$/, "");
}

function naLista(caminho: string, lista: string[]): boolean {
  const alvo = semBarra(caminho);
  return lista.some((item) => {
    const i = semBarra(item);
    // Diretório na lista cobre tudo abaixo dele, nos dois sentidos: a lista
    // pode citar a pasta e o script escrever o arquivo, ou o contrário.
    return i === alvo || alvo.startsWith(`${i}/`) || i.startsWith(`${alvo}/`);
  });
}

/** O git é quem responde, e não uma segunda cópia das regras aqui dentro. */
function ignorado(caminho: string): boolean {
  // Com e sem barra: a regra do .gitignore pode ser de diretório
  // (`/dados/parciais/`), e o git só casa quando a forma bate.
  return [semBarra(caminho), `${semBarra(caminho)}/`].some((forma) => {
    try {
      execFileSync("git", ["check-ignore", "-q", forma], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  });
}

describe("a coleta commita tudo o que ela escreve", () => {
  it.each(COLETAS.map((c) => [c.workflow, c] as const))(
    "%s não deixa arquivo para trás",
    (_nome, coleta) => {
      const lista = versionados(coleta.workflow);
      expect(lista.length, "não achei a linha de `git add -f` no workflow").toBeGreaterThan(0);

      for (const script of coleta.scripts) {
        for (const caminho of escritosEmDados(script)) {
          expect(
            naLista(caminho, lista) || ignorado(caminho),
            `${script} escreve ${caminho}, e ele não está no \`git add\` de ` +
              `${coleta.workflow} nem no .gitignore. Decida e escreva a decisão: se ` +
              `precisa sobreviver à coleta, entre na lista; se é intermediário, entre ` +
              `no .gitignore. Ficar fora dos dois é como o registro de publicação ` +
              `passou dezessete dias congelado sem nada ficar vermelho.`,
          ).toBe(true);
        }
      }
    },
  );

  it("acha caminho de verdade nos scripts, senão a guarda passa por vacuidade", () => {
    // O lastro. Se a extração parar de reconhecer as formas que os scripts
    // usam, o laço acima roda zero vezes e aprova qualquer coisa.
    for (const script of ["scripts/juntar-coleta.ts", "scripts/ingerir-pncp.ts"]) {
      const achados = escritosEmDados(script);
      expect(achados, `não extraí nenhum caminho de ${script}`).not.toHaveLength(0);
      expect(
        achados.some((c) => c.includes("municipios-publicados")),
        `${script} escreve o registro de publicação e a extração não o viu`,
      ).toBe(true);
    }
  });
});
