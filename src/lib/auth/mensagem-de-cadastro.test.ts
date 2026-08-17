import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A mensagem do cadastro não pode afirmar o que talvez não tenha acontecido.
 *
 * ## O episódio
 *
 * Em 17/08 alguém tentou criar conta com um e-mail que já tinha conta — e já
 * confirmada. A tela respondeu:
 *
 *   "Conta criada. Confirme o e-mail que acabamos de enviar para entrar."
 *
 * Nenhuma conta foi criada. Nenhum e-mail foi enviado. Os logs do Supabase
 * mostram `/signup` às 19:02:02 sem nenhum `mail.send` junto — enquanto o
 * cadastro real, às 17:59:04, tinha os dois eventos.
 *
 * A pessoa ficou esperando um e-mail que não ia chegar, quando bastava entrar.
 *
 * ## Por que a resposta é ambígua, e por que continua sendo
 *
 * `signUp` devolve a MESMA coisa — usuário sem sessão, sem erro — para e-mail
 * novo e para e-mail já cadastrado. É deliberado: resposta diferente permitiria
 * descobrir quem tem conta no site testando endereços, que é como se monta lista
 * para phishing dirigido.
 *
 * A correção, então, não é revelar o caso. É escrever uma frase VERDADEIRA nos
 * dois — o que também é a regra que o projeto aplica ao edital, aqui virada para
 * dentro.
 */

const ACOES = readFileSync(join("src", "lib", "auth", "acoes.ts"), "utf8");

/** Comentário explica o erro citando a frase antiga; só o código conta. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const CODIGO = semComentarios(ACOES);

describe("a mensagem do cadastro", () => {
  /**
   * A guarda principal: nada de afirmar criação ou envio no indicativo.
   *
   * As duas frases proibidas são exatamente as que estavam lá, e são as que
   * qualquer pessoa escreveria de novo — porque descrevem o caso feliz, que é o
   * único em que se pensa ao escrever a tela.
   */
  it("não afirma que a conta foi criada nem que o e-mail saiu", () => {
    const proibidas: [RegExp, string][] = [
      [/Conta criada/i, 'afirma criação — falso quando o e-mail já tinha conta'],
      [/acabamos de enviar/i, 'afirma envio — falso quando o e-mail já tinha conta'],
      [/enviamos um e-?mail para/i, "afirma envio"],
    ];

    for (const [padrao, porque] of proibidas) {
      expect(
        padrao.test(CODIGO),
        `a mensagem de cadastro ${porque}. \`signUp\` responde igual para e-mail ` +
          `novo e para e-mail já cadastrado, e no segundo caso nada é criado e ` +
          `nada é enviado. Descreva os dois caminhos em vez de afirmar um.`,
      ).toBe(false);
    }
  });

  /**
   * E não pode resolver o problema do jeito fácil.
   *
   * Dizer "este e-mail já está cadastrado" tornaria a tela clara e o site
   * enumerável. A ambiguidade aqui é uma decisão de segurança, não um descuido.
   */
  it("não revela se o e-mail já tinha conta", () => {
    for (const padrao of [/j[áa] (est[áa] )?cadastrad/i, /e-?mail j[áa] existe/i, /conta j[áa] existe/i]) {
      expect(
        padrao.test(CODIGO),
        "a mensagem passou a revelar que o e-mail já tem conta. Isso torna o " +
          "site enumerável: dá para descobrir quem é cliente testando endereços, " +
          "que é o primeiro passo de uma lista de phishing dirigido.",
      ).toBe(false);
    }
  });

  /** Descrever os dois caminhos é o que a torna verdadeira nos dois. */
  it("oferece a saída de quem já tem conta", () => {
    expect(
      /Entrar|recupere a senha/i.test(CODIGO),
      "a mensagem precisa apontar o caminho de quem já tem conta — senão a " +
        "pessoa fica esperando um e-mail que talvez não exista, que foi " +
        "exatamente o que aconteceu em 17/08.",
    ).toBe(true);
  });
});
