import { describe, expect, it } from "vitest";
import { AuthWeakPasswordError } from "@supabase/supabase-js";
import { MINIMO_DA_SENHA, mensagemDeSenhaRecusada } from "./estado";

/**
 * O que a pessoa lê quando a senha dela é recusada.
 *
 * ## O defeito que estes testes fecham
 *
 * Até 22/08 toda falha de `signUp` virava "Não conseguimos criar a conta agora.
 * Tente mais tarde." — correto enquanto a única recusa possível era falha de
 * infraestrutura, porque nesse caso esperar É o que se pode fazer.
 *
 * Ligar a proteção contra senha vazada muda isso: passa a existir uma recusa
 * que SÓ a pessoa resolve, e "tente mais tarde" a faria repetir a mesma senha
 * indefinidamente. A proteção existe para evitar conta invadida; sem mensagem
 * legível ela evitaria a conta inteira. É esse o custo que estes testes guardam.
 */

describe("a recusa de senha diz o que fazer", () => {
  it("nomeia o vazamento quando a senha é conhecida", () => {
    const recado = mensagemDeSenhaRecusada(["pwned"]);

    expect(recado).toMatch(/vazamento/i);
    // A instrução prática importa tanto quanto o diagnóstico: quem reusa senha
    // reusa em vários sites, e este é o momento em que a informação é útil.
    expect(recado).toMatch(/outro site/i);
  });

  it("prefere o vazamento quando há mais de um motivo", () => {
    // Comprimento a pessoa descobre contando; "está num vazamento" é o que só
    // nós sabemos. Se a ordem inverter, ela troca por outra senha curta que
    // também vazou e recebe a mensagem errada duas vezes.
    expect(mensagemDeSenhaRecusada(["length", "pwned"])).toMatch(/vazamento/i);
  });

  it("cita o mínimo real quando o motivo é comprimento", () => {
    expect(mensagemDeSenhaRecusada(["length"])).toContain(String(MINIMO_DA_SENHA));
  });

  it("não fica muda diante de um motivo que ainda não existe", () => {
    // O Supabase pode acrescentar motivos. Cair num texto vazio seria trocar
    // uma mensagem ruim por nenhuma.
    const recado = mensagemDeSenhaRecusada(["motivo-que-o-supabase-inventar"]);

    expect(recado.length).toBeGreaterThan(20);
    expect(recado).toMatch(/senha/i);
  });

  it("nunca devolve o texto genérico de falha de infraestrutura", () => {
    // A regressão que importa: alguém "simplificar" isto de volta para a
    // mensagem única faria o defeito voltar inteiro, e sem ninguém perceber.
    for (const motivos of [["pwned"], ["length"], ["characters"], []]) {
      expect(mensagemDeSenhaRecusada(motivos)).not.toMatch(/tente mais tarde/i);
    }
  });

  it("lê os motivos que o Supabase de fato produz", () => {
    // Contra o erro REAL da biblioteca, e não contra um array escrito à mão:
    // se `reasons` mudar de nome ou de formato, este teste cai — que é o
    // objetivo. O array literal dos outros testes passaria feliz.
    const erro = new AuthWeakPasswordError("Password is known to be weak", 422, ["pwned"]);

    expect(erro.reasons).toContain("pwned");
    expect(mensagemDeSenhaRecusada(erro.reasons)).toMatch(/vazamento/i);
  });
});
