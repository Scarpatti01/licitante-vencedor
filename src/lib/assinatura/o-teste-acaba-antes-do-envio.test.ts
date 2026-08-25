import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * O teste é encerrado ANTES do resumo do dia sair.
 *
 * ## Por que isto precisa de guarda
 *
 * `assinaturas.teste_termina_em` existiu desde o começo e ninguém lia. A coluna
 * dava a impressão de que o mecanismo existia; ela era só a intenção dele. Um
 * "teste de 14 dias" sobre isso nunca terminaria, e seria o plano gratuito com
 * passos a mais — exatamente o que a decisão de acabar com o alerta grátis
 * queria eliminar.
 *
 * ## E por que a ORDEM importa tanto quanto a existência
 *
 * Encerrar depois de enviar daria um dia a mais de produto a cada pessoa, todo
 * dia, para sempre. Pior: mandaria um e-mail prometendo um painel que a pessoa
 * já não consegue abrir, e o suporte receberia "o link não funciona" sem
 * ninguém conseguir ligar uma coisa à outra.
 */

const ENVIO = readFileSync(join(".github", "workflows", "enviar-resumo-diario.yml"), "utf8");

describe("o teste acaba antes do envio", () => {
  it("o envio diário chama o encerramento de testes", () => {
    expect(
      ENVIO,
      "nada encerra teste vencido: `teste_termina_em` volta a ser uma coluna que ninguém lê.",
    ).toContain("scripts/encerrar-testes.ts");
  });

  it("encerra ANTES de enviar, nunca depois", () => {
    const encerrar = ENVIO.indexOf("scripts/encerrar-testes.ts");
    const enviar = ENVIO.indexOf("scripts/enviar-resumo-diario.ts");

    expect(enviar, "não achei o passo de envio").toBeGreaterThan(-1);
    expect(
      encerrar,
      "o encerramento está DEPOIS do envio: quem venceu hoje recebe o e-mail de hoje, " +
        "com link para um painel que ele já não abre.",
    ).toBeLessThan(enviar);
  });

  it("a falha do encerramento não derruba o envio", () => {
    // Um teste que sobrevive um dia a mais custa um dia de produto. Um envio
    // derrubado custa o dia de todo mundo que paga.
    const passo = ENVIO.slice(
      ENVIO.indexOf("- name: Encerrar os testes vencidos"),
      ENVIO.indexOf("- name: Enviar"),
    );
    expect(passo, "não achei o passo do encerramento").not.toBe("");
    expect(passo).toContain("|| codigo=$?");
  });

  it("grita quando falha", () => {
    const passo = ENVIO.slice(
      ENVIO.indexOf("- name: Encerrar os testes vencidos"),
      ENVIO.indexOf("- name: Enviar"),
    );
    expect(passo).toContain("::error title=");
    expect(passo).toContain("GITHUB_STEP_SUMMARY");
  });
});
