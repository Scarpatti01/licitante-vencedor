import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ESPERA_MAXIMA_MS } from "./janela";

/**
 * O resumo diário sai quando a coleta termina, e nunca antes das 7h.
 *
 * ## O defeito, medido
 *
 * A home promete "todo dia útil, às 7h". O resumo era um `schedule` às 10:00
 * UTC, e nos 12 dias úteis de 08 a 23/09/2026 chegou entre 10h58 e 13h07 de
 * Brasília — sempre, porque o agendador do GitHub atrasa de 4 a 6 horas sob
 * carga. Em 24/09 o gatilho passou a ser a coleta terminar.
 *
 * ## Por que estas guardas
 *
 * O novo desenho tem pontos que quebram EM SILÊNCIO, que é o tipo de defeito
 * que esta base aprendeu a vigiar:
 *
 *   - `workflow_run` casa o workflow da coleta pelo NOME. Renomear a coleta faz
 *     o gatilho parar de disparar sem erro nenhum; o único sintoma seria o
 *     resumo voltar a chegar às 11h pela reserva, e ninguém ligaria as coisas.
 *   - Um passo com efeito sem o `if` da janela mandaria e-mail no fim de semana,
 *     ou encerraria teste de madrugada.
 *   - Um `timeout-minutes` menor que a espera mataria o job no meio da espera,
 *     sem mandar nada.
 */

const RESUMO = readFileSync(join(".github", "workflows", "enviar-resumo-diario.yml"), "utf8");
const COLETAS = ["coletar-pncp-paralelo.yml", "coletar-pncp.yml"];

/**
 * O YAML sem comentários.
 *
 * O cabeçalho do workflow fala dos passos para explicá-los. Oitava vez nesta
 * base que uma guarda encontraria o texto que a justifica.
 */
const semComentarios = (y: string) => y.replace(/^\s*#.*$/gm, "");
const YAML = semComentarios(RESUMO);

/** O trecho de um passo, do `- name:` dele até o próximo. */
function passo(nome: string): string {
  const inicio = YAML.indexOf(`- name: ${nome}`);
  expect(inicio, `não achei o passo "${nome}"`).toBeGreaterThan(-1);
  const fim = YAML.indexOf("- name:", inicio + 10);
  return YAML.slice(inicio, fim === -1 ? undefined : fim);
}

describe("o resumo segue a coleta", () => {
  it("é disparado quando a coleta termina, com qualquer desfecho", () => {
    expect(YAML).toMatch(/^\s*workflow_run:/m);
    expect(YAML).toMatch(/types:\s*\[\s*completed\s*\]/);
    // "failure" é o desfecho normal da coleta: ela termina assim sempre que
    // uma das 27 UFs cai. Filtrar por sucesso faria o resumo quase nunca sair.
    expect(YAML).not.toMatch(/conclusion\s*==\s*'success'/);
  });

  it("só pela main", () => {
    // Uma coleta disparada num ramo de teste mandaria e-mail real a cliente
    // real, com dado de um código que ninguém mesclou.
    expect(YAML).toMatch(/branches:\s*\[\s*main\s*\]/);
  });

  /**
   * A guarda que ninguém escreveria.
   *
   * `workflow_run` referencia o workflow da coleta pelo campo `name:` dele, e
   * não pelo arquivo. Se o nome mudar, o gatilho simplesmente para — sem erro,
   * sem X vermelho, sem linha no log.
   */
  it("os nomes no gatilho são os nomes reais dos workflows de coleta", () => {
    const lista = /workflows:\s*\[([^\]]*)\]/.exec(YAML);
    expect(lista, "não achei a lista `workflows:` do gatilho").not.toBeNull();
    const noGatilho = [...lista![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();

    const reais = COLETAS.map((arquivo) => {
      const caminho = join(".github", "workflows", arquivo);
      expect(existsSync(caminho), `${arquivo} sumiu`).toBe(true);
      const nome = /^name:\s*(.+)$/m.exec(readFileSync(caminho, "utf8"));
      expect(nome, `${arquivo} não tem \`name:\``).not.toBeNull();
      return nome![1].trim().replace(/^["']|["']$/g, "");
    }).sort();

    expect(
      noGatilho,
      "o gatilho do resumo não casa com o nome dos workflows de coleta. Do jeito " +
        "que está, o resumo NÃO dispara quando a coleta termina, e volta a depender " +
        "só da reserva agendada, que atrasa de 4 a 6 horas.",
    ).toEqual(reais);
  });

  it("continua com o agendamento de reserva", () => {
    // Sob carga o GitHub pode descartar um disparo agendado da coleta. Sem a
    // reserva, nesse dia não haveria resumo nenhum.
    expect(YAML).toMatch(/^\s*schedule:/m);
    expect(YAML).toMatch(/- cron: "\d+ \d+ \* \* 1-5"/);
  });
});

describe("a janela das 7h vale antes de qualquer efeito", () => {
  const COM_EFEITO = [
    "Baixar a classificação da última coleta",
    "Encerrar os testes vencidos",
    "Enviar",
  ];

  it("a decisão vem antes de todo passo com efeito", () => {
    const decidir = YAML.indexOf("- name: Decidir a hora do resumo");
    const esperar = YAML.indexOf("- name: Esperar até as 7h");
    expect(decidir).toBeGreaterThan(-1);
    expect(esperar).toBeGreaterThan(decidir);

    for (const nome of COM_EFEITO) {
      expect(YAML.indexOf(`- name: ${nome}`), `${nome} roda antes da decisão`).toBeGreaterThan(esperar);
    }
  });

  it("todo passo com efeito respeita a decisão", () => {
    for (const nome of COM_EFEITO) {
      expect(
        passo(nome),
        `"${nome}" roda mesmo quando a janela mandou pular: mandaria e-mail no ` +
          "fim de semana, ou encerraria teste de madrugada",
      ).toContain("if: steps.janela.outputs.acao != 'pular'");
    }
  });

  it("quem dispara à mão não espera", () => {
    // O ensaio com `simular` às 3h da manhã não pode ficar cinco horas parado.
    expect(passo("Decidir a hora do resumo")).toContain("github.event_name != 'workflow_dispatch'");
  });

  it("pular anuncia o motivo", () => {
    // Resumo que não sai sem dizer por quê é o silêncio que esta base vigia.
    const decidir = passo("Decidir a hora do resumo");
    expect(decidir).toContain("GITHUB_STEP_SUMMARY");
    expect(decidir).toContain("::notice");
  });

  it("a decisão chama um script que existe", () => {
    expect(passo("Decidir a hora do resumo")).toContain("scripts/decidir-janela-do-resumo.ts");
    expect(existsSync(join("scripts", "decidir-janela-do-resumo.ts"))).toBe(true);
  });

  /**
   * A espera cabe no job.
   *
   * Um job do GitHub vive no máximo 360 minutos. Se `timeout-minutes` for menor
   * que a espera máxima, o job morre esperando e o resumo não sai — e o motivo
   * aparece como "timeout", que ninguém associa a "a coleta terminou cedo".
   */
  it("o teto do job cobre a espera máxima, e cabe no limite do GitHub", () => {
    const teto = /timeout-minutes:\s*(\d+)/.exec(YAML);
    expect(teto, "o job não declara `timeout-minutes`").not.toBeNull();
    const minutos = Number(teto![1]);
    const esperaMaxima = ESPERA_MAXIMA_MS / 60000;

    expect(
      minutos,
      `o job morre em ${minutos} min, e a espera pode chegar a ${esperaMaxima} min`,
    ).toBeGreaterThan(esperaMaxima + 10);
    expect(minutos, "o GitHub não aceita job de mais de 360 minutos").toBeLessThanOrEqual(360);
  });
});
