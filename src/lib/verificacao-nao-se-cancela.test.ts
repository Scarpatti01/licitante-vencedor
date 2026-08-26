import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * A verificação da `main` não pode ser cancelada por outra execução.
 *
 * ## O dia em que ela foi
 *
 * Em 26/08 dois PRs foram mesclados com quinze minutos de diferença, e a fila
 * do Actions estava com uns sete minutos de atraso. As duas execuções da `main`
 * entraram FORA DE ORDEM: a do commit mais velho (#111) começou às 17:24, a do
 * commit mais novo (#110) tinha começado às 17:22.
 *
 * Com `cancel-in-progress: true` e o grupo `verificar-refs/heads/main`, quem
 * começa por último cancela quem está rodando, sem olhar qual commit é mais
 * recente. Resultado: a execução do `head` foi cancelada pela execução de um
 * commit que já não era o topo. A `main` ficou publicada com verificação
 * cancelada, e o único check verde apontava para o commit anterior.
 *
 * ## Por que a distinção, e não simplesmente desligar
 *
 * Em PR, cancelar está certo e economiza runner: três pushes seguidos são três
 * versões do mesmo trabalho, e só a última responde à pergunta.
 *
 * Na `main` é o contrário. Cada push é um commit diferente, cada um precisa do
 * próprio veredito, e é dela que a Vercel publica — o cabeçalho do workflow diz
 * exatamente isso: "uma mudança de dado que quebrasse o build precisa aparecer
 * antes de a Vercel publicar". Cancelando, ela não aparece.
 *
 * A linha é fácil de "simplificar" de volta para `true`, porque `true` parece a
 * forma normal e a condição parece firula. Daí esta guarda.
 */

const WORKFLOW = ".github/workflows/verificar.yml";

function fonte(): string {
  return readFileSync(WORKFLOW, "utf8");
}

/** O bloco `concurrency:`, sem os comentários que falam dele. */
function blocoDeConcorrencia(): string {
  const linhas = fonte().split("\n");
  const inicio = linhas.findIndex((l) => l.startsWith("concurrency:"));
  expect(inicio, `${WORKFLOW} não declara \`concurrency:\``).toBeGreaterThan(-1);

  const corpo: string[] = [];
  for (const linha of linhas.slice(inicio + 1)) {
    // O bloco acaba na primeira linha que volta à margem.
    if (linha.trim() && !linha.startsWith(" ") && !linha.startsWith("\t")) break;
    if (!linha.trim().startsWith("#")) corpo.push(linha);
  }
  return corpo.join("\n");
}

describe("o cancelamento vale em PR, e não na main", () => {
  it("`cancel-in-progress` é condicionado ao evento, e nunca um `true` seco", () => {
    const bloco = blocoDeConcorrencia();

    expect(
      bloco,
      "`cancel-in-progress: true` cancela, na `main`, a execução do commit que " +
        "está no topo quando duas entram fora de ordem — foi o que aconteceu em " +
        "26/08. Condicione ao evento:\n\n" +
        "  cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
    ).not.toMatch(/cancel-in-progress:\s*true\s*$/mu);

    expect(bloco).toMatch(
      /cancel-in-progress:\s*\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*\}\}/u,
    );
  });

  it("o grupo continua separando um PR do outro", () => {
    /*
     * Sem `github.ref` no grupo, dois PRs diferentes cairiam no mesmo balde e
     * um cancelaria o outro. Consertar o cancelamento na `main` não pode
     * custar isso.
     */
    expect(blocoDeConcorrencia()).toMatch(/group:.*github\.ref/u);
  });
});

describe("a verificação continua rodando onde precisa", () => {
  it("dispara em pull request e em push para a main", () => {
    /*
     * O push para `main` é metade do motivo de o workflow existir: a coleta
     * diária comita direto nela, sem passar por PR nenhum. Se alguém "limpar"
     * os gatilhos e deixar só `pull_request`, a coleta volta a publicar sem
     * verificação — e desta vez em silêncio, porque nem execução cancelada
     * apareceria.
     */
    const gatilhos = fonte().slice(fonte().indexOf("\non:"), fonte().indexOf("concurrency:"));
    expect(gatilhos).toMatch(/pull_request:/u);
    expect(gatilhos).toMatch(/push:[\s\S]*branches:\s*\[main\]/u);
  });
});
