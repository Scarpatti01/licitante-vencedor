import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A coleta que grava decisão também apaga a que venceu.
 *
 * ## Por que isto precisa de guarda
 *
 * A limpeza tem um jeito peculiar de falhar: **em silêncio e por semanas**.
 * Como a coleta começou em 16/08, nenhum edital encerrou há mais de trinta dias
 * ainda, então o script vai apagar ZERO por umas três semanas. Zero apagado é
 * indistinguível de "o passo não existe no workflow" e de "o script quebrou".
 *
 * Quando o primeiro edital vencer o prazo, ninguém vai estar olhando. Se o
 * passo tiver sido removido num refactor no meio do caminho, a tabela
 * simplesmente cresce para sempre e a descoberta vem pela fatura.
 *
 * ## Por que só o workflow paralelo
 *
 * `coletar-pncp.yml` está sem agendamento desde 18/08 e é o caminho de volta,
 * disparado à mão. Ele já nem publica o retrato de abertos. Cobrar limpeza dele
 * seria cobrar de um workflow que, se for usado, roda uma vez — e uma limpeza
 * pulada custa um dia de crescimento, não um dia de produto, porque a próxima
 * execução alcança o atraso sozinha.
 */

const PARALELO = readFileSync(join(".github", "workflows", "coletar-pncp-paralelo.yml"), "utf8");

describe("a coleta limpa o que guardou", () => {
  it("chama o script de limpeza", () => {
    expect(
      PARALELO,
      "a coleta grava decisão todo dia e nunca apaga: a tabela cresce para sempre.",
    ).toContain("scripts/limpar-decisoes.ts");
  });

  it("limpa DEPOIS de triar, nunca antes", () => {
    /*
     * Limpar antes de triar apagaria o que esta madrugada acabou de decidir
     * sobre editais que encerraram ontem — e é exatamente na manhã seguinte que
     * o cliente abre o e-mail e pergunta por que não foi avisado.
     */
    const triagem = PARALELO.indexOf("scripts/triar-editais.ts");
    const limpeza = PARALELO.indexOf("scripts/limpar-decisoes.ts");

    expect(triagem, "não achei o passo de triagem").toBeGreaterThan(-1);
    expect(
      limpeza,
      "a limpeza está antes da triagem: ela apagaria a decisão do dia sobre o edital que encerrou ontem.",
    ).toBeGreaterThan(triagem);
  });

  it("não derruba a coleta quando falha", () => {
    // O agregado e os posts do dia valem por si. Uma limpeza pulada custa um dia
    // de crescimento; uma coleta derrubada custa um dia de produto.
    const passo = PARALELO.slice(
      PARALELO.indexOf("- name: Limpar decisões de editais encerrados"),
      PARALELO.indexOf("- name: Versionar agregado"),
    );
    expect(passo, "não achei o passo da limpeza").not.toBe("");
    expect(
      passo,
      "sem `|| codigo=$?` a falha da limpeza derruba a coleta inteira.",
    ).toContain("|| codigo=$?");
  });

  it("grita quando falha, em vez de sumir no log", () => {
    const passo = PARALELO.slice(
      PARALELO.indexOf("- name: Limpar decisões de editais encerrados"),
      PARALELO.indexOf("- name: Versionar agregado"),
    );
    expect(passo).toContain("::error title=");
    expect(passo).toContain("GITHUB_STEP_SUMMARY");
  });

  it("roda com a mesma trava de degradação dos outros passos", () => {
    // Coleta recusada por degradação não pode disparar limpeza: apagaríamos com
    // base num dia em que a fonte estava pela metade.
    const passo = PARALELO.slice(
      PARALELO.indexOf("- name: Limpar decisões de editais encerrados"),
      PARALELO.indexOf("- name: Versionar agregado"),
    );
    expect(passo).toContain("steps.classe.outputs.classe == 'completa'");
  });
});
