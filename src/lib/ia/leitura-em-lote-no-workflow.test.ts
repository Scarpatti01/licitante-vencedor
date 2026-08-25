import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardas da leitura em lote — as que vivem entre arquivos, e por isso nenhum
 * teste de unidade pega.
 *
 * O lote tem uma propriedade desconfortável: ele gasta ANTES de a gente poder
 * conferir o resultado. Criado o job, o fornecedor cobra mesmo que a nossa
 * espera desista, mesmo que o runner morra no meio, mesmo que o resultado
 * chegue e a gente descarte. Então os erros caros aqui não são de lógica: são
 * de combinação — um prazo maior que o outro, um script que grava o que não
 * devia.
 */

const SCRIPT = readFileSync(join("scripts", "ler-em-lote.ts"), "utf8");
const WORKFLOW = readFileSync(join(".github", "workflows", "ler-em-lote.yml"), "utf8");

describe("o runner espera mais que o script", () => {
  /**
   * O pior desperdício possível neste script.
   *
   * Se o `timeout-minutes` do job for menor que o prazo de espera do script, o
   * GitHub mata a execução com o lote AINDA RODANDO. O fornecedor termina,
   * cobra, e não há mais ninguém para aplicar o resultado — dinheiro gasto por
   * leitura que nunca chega ao cliente, e nada em log nenhum dizendo isso.
   */
  it("o teto do job é maior que o prazo de espera do lote", () => {
    // A constante é escrita como conta (`3 * 60 * 60 * 1000`) para ser legível.
    // Só dígitos, `*`, `+`, `_` e espaço passam daqui — nada de executar código
    // arbitrário lido de um arquivo.
    const expressao = /PRAZO_DE_ESPERA_MS = ([^;]+);/.exec(SCRIPT)?.[1]?.trim() ?? "";
    expect(expressao, "não achei PRAZO_DE_ESPERA_MS no script").toMatch(/^[\d_ *+]+$/);

    const ms = expressao
      .split("+")
      .map((parcela) => parcela.split("*").reduce((a, b) => a * Number(b.replace(/_/g, "").trim()), 1))
      .reduce((a, b) => a + b, 0);

    const minutosDeEspera = ms / 60_000;
    const tetoDoJob = Number(/timeout-minutes:\s*(\d+)/.exec(WORKFLOW)?.[1]);

    expect(
      tetoDoJob,
      `o job morre em ${tetoDoJob} min e o script espera o lote por ${minutosDeEspera} min. ` +
        "O runner vai matar a execução com o lote rodando: o fornecedor cobra e " +
        "ninguém aplica o resultado.",
    ).toBeGreaterThan(minutosDeEspera);
  });
});

describe("o script não grava o que não deve", () => {
  /**
   * A guarda de POSIÇÃO, vista do lado de quem consome.
   *
   * `lerRespostasDoLote` recusa o lote inteiro quando a contagem não bate,
   * porque a API liga resposta a pedido pela posição no array. Isso só vale se
   * quem chama olhar o `ok`. Ignorar esse campo devolveria análises trocadas
   * entre editais, com aparência perfeitamente normal na tela.
   */
  it("olha o `ok` da leitura antes de aplicar qualquer item", () => {
    expect(SCRIPT).toMatch(/if\s*\(!leitura\.ok\)/);
    const trecho = SCRIPT.slice(SCRIPT.indexOf("if (!leitura.ok)"));
    expect(trecho.slice(0, 400)).toMatch(/continue|return|throw/);
  });

  /**
   * Sem escalonamento, análise fraca não vira cache.
   *
   * O lote não pode reler com um modelo melhor: ele já partiu. Gravar assim
   * mesmo colocaria no cache — que é compartilhado por TODA empresa que casa
   * com aquele edital, e dura enquanto a proposta estiver aberta — a pior
   * análise que o sistema sabe produzir, e ainda impediria a leitura avulsa de
   * consertar, porque ela pula o que já está em cache.
   */
  it("não grava a análise cuja evidência não se sustentou", () => {
    expect(SCRIPT).toMatch(/evidenciasSuficientes\(/);
    const trecho = SCRIPT.slice(SCRIPT.indexOf("evidenciasSuficientes("));
    expect(
      trecho.slice(0, 700),
      "o script deixou de pular o edital sem evidência suficiente. Ele vai gravar " +
        "no cache a análise mais fraca que sabe produzir, e a leitura avulsa não " +
        "vai mais poder consertar: ela pula o que já está em cache.",
    ).toMatch(/continue/);
  });

  it("o custo do lote entra com o desconto, não com o preço cheio", () => {
    // Cobrar do lote o dobro do que ele custou é o tipo de erro que ninguém
    // desconfia: custo alto demais não parece suspeito, parece caro.
    expect(SCRIPT).toMatch(/precosEmLote\(\)/);
  });
});

describe("o lote não substitui a leitura avulsa", () => {
  /**
   * Os dois caminhos convivem de propósito. O que o lote deixa passar — edital
   * sem evidência, lote recusado, prazo estourado — cai na leitura avulsa, que
   * sabe escalar de modelo. Trocar um pelo outro tornaria toda falha do lote
   * uma leitura perdida.
   */
  /**
   * O lote roda ANTES da coleta, e é isso que faz os dois se somarem em vez de
   * se atropelarem.
   *
   * Se o lote rodasse depois da coleta, a avulsa já teria lido tudo pelo preço
   * cheio e o lote encontraria só cache — trabalho e espera para economizar
   * nada. Três horas antes dá folga de sobra para o lote terminar e deixar o
   * cache quente.
   */
  it("o lote é agendado antes da coleta das 06:10", () => {
    const cron = /- cron: "(\d+) (\d+) \* \* \*"/.exec(WORKFLOW);
    expect(cron, "o agendamento do lote sumiu — a leitura voltou a custar o dobro").not.toBeNull();

    const horaDoLote = Number(cron![2]) + Number(cron![1]) / 60;
    /*
     * A coleta agendada é a PARALELA — `coletar-pncp.yml` teve os `cron`
     * movidos para lá e hoje só roda à mão. Ler o arquivo errado faria este
     * teste passar por não achar nada, que é a pior forma de passar.
     */
    const coleta = readFileSync(join(".github", "workflows", "coletar-pncp-paralelo.yml"), "utf8");
    const horarios = [...coleta.matchAll(/- cron: "(\d+) (\d+) \* \* \*"/g)].map(
      (m) => Number(m[2]) + Number(m[1]) / 60,
    );
    expect(horarios.length, "não achei o agendamento da coleta paralela").toBeGreaterThan(0);
    const horaDaColeta = Math.min(...horarios);

    expect(
      horaDoLote,
      `o lote roda às ${horaDoLote}h UTC e a coleta às ${horaDaColeta}h. Rodando depois, ` +
        "a avulsa já leu tudo pelo preço cheio e o lote não economiza nada.",
    ).toBeLessThan(horaDaColeta);
  });

  /**
   * As opções de ensaio (`--limite`, `--ignorar-cache`) existem porque a
   * primeira execução real não mandou nada: todos os candidatos do dia já
   * estavam em cache, e sem forçar não havia como exercitar o formato do lote
   * contra a API.
   *
   * Elas precisam ficar DESLIGADAS por padrão. `ignorar-cache` ligado sozinho
   * relê e paga de novo por análise que já existe — todo dia, sem ninguém
   * perceber, porque o resultado fica idêntico.
   */
  it("as opções de ensaio não são o padrão do workflow", () => {
    const bloco = WORKFLOW.slice(WORKFLOW.indexOf("ignorar_cache:"));
    expect(bloco.slice(0, 200)).toMatch(/default:\s*false/);
    expect(WORKFLOW).toMatch(/limite:[\s\S]{0,200}default:\s*""/);
  });

  it("a leitura avulsa continua existindo", () => {
    const avulsa = readFileSync(join(".github", "workflows", "ler-recomendados.yml"), "utf8");
    expect(avulsa).toContain("scripts/ler-recomendados.ts");
  });
});
