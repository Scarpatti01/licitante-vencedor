import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `continue-on-error: true` não pode significar "falhe em silêncio".
 *
 * ## O defeito que este teste existe para impedir
 *
 * Entre 16 e 21/08 a publicação de posts falhou cinco dias seguidos e o passo
 * apareceu VERDE nos cinco. O script estava certo: ele recusa gravar a leva
 * quando nenhum edital foi lido, porque 25 posts sem leitura são a listagem
 * crua que o site promete não ser. Quem apagou o sinal foi o workflow —
 * `continue-on-error: true` engole o código de saída e não deixa rastro.
 *
 * A flag em si é correta e deve continuar: um post não pode custar o commit do
 * agregado da coleta. O que não pode é ela ser a única coisa ali. Falha
 * tolerada precisa ser falha ANUNCIADA, senão "tolerada" vira "invisível" e o
 * produto encolhe sem ninguém perceber — que é o modo de falha mais caro que
 * este projeto já teve, medido em dias.
 *
 * ## Por que um teste, e não um comentário
 *
 * Porque o próximo passo tolerante será escrito daqui a meses, por alguém que
 * não leu este arquivo, copiando o vizinho. Comentário não é cobrado; teste é.
 */

const WORKFLOWS = join(import.meta.dirname, "..", "..", ".github", "workflows");

type Passo = { arquivo: string; corpo: string };

/**
 * Os blocos de passo que declaram `continue-on-error: true`.
 *
 * Vai por texto, e não por um analisador de YAML, de propósito: o que importa
 * aqui é o que está escrito no arquivo que o GitHub lê, e um passo é delimitado
 * pelo `- name:` seguinte com a mesma indentação.
 */
function passosTolerantes(): Passo[] {
  const achados: Passo[] = [];

  for (const arquivo of readdirSync(WORKFLOWS).filter((n) => n.endsWith(".yml"))) {
    const texto = readFileSync(join(WORKFLOWS, arquivo), "utf8");
    const blocos = texto.split(/^ {6}- name: /m).slice(1);

    for (const bloco of blocos) {
      if (/^\s*continue-on-error:\s*true\s*$/m.test(bloco)) {
        achados.push({ arquivo, corpo: bloco });
      }
    }
  }

  return achados;
}

describe("falha tolerada é falha anunciada", () => {
  const tolerantes = passosTolerantes();

  it("existe pelo menos um passo tolerante para conferir", () => {
    // Se este teste cair, o formato dos workflows mudou e a varredura acima
    // parou de encontrar o que deveria — o resto do arquivo estaria passando
    // por vacuidade, que é pior que falhar.
    expect(tolerantes.length).toBeGreaterThan(0);
  });

  it.each(tolerantes.map((p) => [`${p.arquivo} → ${p.corpo.split("\n")[0]}`, p]))(
    "%s trata o código de saída em vez de ignorá-lo",
    (_rotulo, passo) => {
      const capturaOCodigo = /\|\|\s*codigo=\$\?/.test((passo as Passo).corpo);
      const anuncia = /::error|::warning/.test((passo as Passo).corpo);

      expect(
        capturaOCodigo && anuncia,
        `Este passo tem \`continue-on-error: true\` e nenhuma forma de contar que falhou.\n\n` +
          `A flag está certa — o passo não deve derrubar o job. O que falta é o sinal:\n` +
          `capture a saída com \`|| codigo=$?\` e, quando não for zero, emita\n` +
          `\`::error title=...\` e escreva em \`$GITHUB_STEP_SUMMARY\`.\n\n` +
          `Sem isso a falha some. Foi assim que a publicação de posts ficou cinco\n` +
          `dias quebrada com o job verde, entre 16 e 21/08.`,
      ).toBe(true);
    },
  );
});
