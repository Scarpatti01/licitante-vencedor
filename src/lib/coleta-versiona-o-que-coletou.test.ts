import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * A coleta não pode perder o que coletou por causa de um push recusado.
 *
 * ## O que aconteceu em 25/08
 *
 * As DUAS coletas do dia falharam, e a coleta em si tinha funcionado. O que
 * quebrou foi o passo de versionar:
 *
 *     hint: 'git pull' before pushing again.
 *     ##[error]Process completed with exit code 1.
 *
 * `git push` recusado por não estar em fast-forward — houve merge no `main`
 * enquanto o job rodava. A coleta leva de 30 a 110 minutos, então a janela para
 * alguém mesclar no meio é enorme; naquele dia foram doze merges.
 *
 * O efeito é caro e discreto: o agregado, os posts e o retrato de editais
 * abertos não são versionados, o site continua servindo o dado de ontem, e a
 * única pista é um job vermelho cuja mensagem fala de git, não de coleta.
 */

const WORKFLOWS = readdirSync(join(".github", "workflows"))
  .filter((f) => f.startsWith("coletar-pncp"))
  .map((f) => [f, readFileSync(join(".github", "workflows", f), "utf8")] as const);

describe("o push da coleta sobrevive a um main que andou", () => {
  it("existe mais de um workflow de coleta, e os dois são cobertos", () => {
    // A correção de 16/08 foi feita só onde o defeito apareceu, e um mês depois
    // o mesmo defeito mordeu no outro workflow. Não de novo.
    expect(WORKFLOWS.length).toBeGreaterThanOrEqual(2);
  });

  it("rebaseia antes de desistir", () => {
    for (const [nome, yaml] of WORKFLOWS) {
      expect(yaml, `${nome}: push sem rebase volta a perder a coleta do dia`).toContain(
        "git pull --rebase",
      );
    }
  });

  it("tenta mais de uma vez", () => {
    for (const [nome, yaml] of WORKFLOWS) {
      const trecho = yaml.slice(yaml.indexOf('git commit -m "Coleta'));
      expect(trecho, `${nome}: uma tentativa só perde para qualquer corrida`).toMatch(
        /for tentativa in/,
      );
    }
  });

  it("quando desiste, diz que foi o PUSH e não a coleta", () => {
    // "Process completed with exit code 1" mandou procurar no lugar errado.
    for (const [nome, yaml] of WORKFLOWS) {
      expect(yaml, `${nome}: sem mensagem própria, a falha vira mistério`).toContain(
        "Coleta não conseguiu versionar",
      );
    }
  });

  it("o rebase não é silencioso quando falha de verdade", () => {
    // Conflito real em `dados/` significa dois processos gravando o mesmo
    // arquivo. Aí alguém precisa olhar, e o job tem de ficar vermelho.
    for (const [nome, yaml] of WORKFLOWS) {
      const trecho = yaml.slice(yaml.indexOf("git pull --rebase"));
      expect(trecho.slice(0, 200), `${nome}: rebase falhando em silêncio`).toContain("|| exit 1");
    }
  });
});
