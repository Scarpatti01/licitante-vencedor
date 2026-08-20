import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * O alerta escolhe a coleta que PRODUZIU snapshot, não a que ficou verde.
 *
 * ## O defeito
 *
 * Em 17/08, o primeiro envio de alerta da história do projeto falhou em 10
 * segundos com `no valid artifacts found to download`.
 *
 * `coletar-pncp.yml` roda duas vezes por dia. A das 08:10 é a segunda tentativa
 * e, quando a das 06:10 já publicou, ela decide não coletar e termina em ~18
 * segundos — verde, correta, e sem snapshot nenhum. Como o alerta pedia
 * `--status=success --limit=1`, era exatamente ela que vinha.
 *
 * Isso não era um azar de um dia: a segunda tentativa é a mais recente em TODO
 * dia útil em que a primeira funciona. O alerta estava condenado a nunca rodar.
 *
 * ## A lição que o projeto já tinha aprendido do outro lado
 *
 * `coletar-pncp.yml` recusa consultar a API do GitHub para saber se já coletou
 * hoje, e o comentário dele explica: *"a API responderia a pergunta ERRADA —
 * `conclusion == success` diz que o job terminou verde"*. O mesmo raciocínio
 * valia aqui e não tinha sido aplicado. A pergunta certa não é "terminou bem?",
 * é "produziu o arquivo de que eu preciso?" — e só a lista de artefatos responde.
 */

const ALERTAS_CRU = readFileSync(join(".github", "workflows", "enviar-alertas.yml"), "utf8");
const COLETA = readFileSync(join(".github", "workflows", "coletar-pncp.yml"), "utf8");

/**
 * Comentário de YAML fora antes de varrer.
 *
 * Não é preciosismo: o comentário que explica este defeito CITA `--limit=1`
 * entre crases, para dizer o que estava errado. Varrendo o arquivo cru, o teste
 * reprovava a própria documentação da correção — e foi o que aconteceu na
 * primeira versão dele.
 *
 * A lição já apareceu três vezes neste repositório, sempre igual: varredor de
 * texto que não distingue código de comentário acusa quem explica o problema.
 */
const ALERTAS = ALERTAS_CRU.split("\n")
  .map((l) => l.replace(/(^|\s)#.*$/, "$1"))
  .join("\n");

describe("a escolha do snapshot", () => {
  /**
   * A guarda principal.
   *
   * Pegar a primeira execução verde é o caminho óbvio, é o que estava escrito, e
   * é o que quebra. Se alguém "simplificar" de volta, isto falha.
   */
  it("filtra por artefato, e não só por sucesso", () => {
    expect(
      /actions\/runs\/[^\s]*\/artifacts/.test(ALERTAS),
      "o alerta voltou a escolher a execução sem conferir se ela produziu o " +
        "snapshot. A segunda tentativa diária termina verde sem coletar, é a " +
        "mais recente em todo dia útil normal, e o download morre com " +
        "'no valid artifacts found'.",
    ).toBe(true);

    expect(
      /--limit=1\b/.test(ALERTAS),
      "`--limit=1` só enxerga a execução mais recente, que num dia normal é a " +
        "segunda tentativa sem snapshot. Olhe várias candidatas e pare na " +
        "primeira que tenha o artefato.",
    ).toBe(false);
  });

  it("procura o artefato pelo nome exato que a coleta publica", () => {
    // Se um dos dois lados renomear o artefato, o alerta passa a não achar
    // nenhuma candidata — e a mensagem de erro apontaria para o lugar errado.
    expect(ALERTAS).toContain("snapshot-pncp");
    expect(COLETA).toContain("name: snapshot-pncp");
  });

  /**
   * A razão de olhar 10 candidatas não afrouxar nada.
   *
   * Uma coleta antiga com artefato continua sendo recusada — mas pelo motivo
   * certo, e com a mensagem certa, em vez de morrer no download.
   */
  it("a recusa por snapshot velho continua existindo", () => {
    const ENVIO = readFileSync(join("scripts", "enviar-alertas.ts"), "utf8");
    expect(
      /36|horas/.test(ENVIO),
      "sumiu a recusa de snapshot velho. Ela é o que torna seguro procurar " +
        "entre várias execuções em vez de exigir a mais recente.",
    ).toBe(true);
  });

  /**
   * As duas rodadas continuam existindo.
   *
   * Se a segunda tentativa sair, este teste vira decoração — e vale saber,
   * porque ela é a razão de todo o cuidado acima: é a execução das 08:10 que
   * termina verde sem produzir snapshot, e foi ela que derrubou o primeiro
   * alerta.
   *
   * Olha QUEM COLETA, e não um arquivo fixo. Em 18/08 a coleta diária passou de
   * `coletar-pncp.yml` para `coletar-pncp-paralelo.yml`, e uma asserção presa ao
   * nome do arquivo transformaria uma promoção planejada em teste vermelho —
   * ruído que ensina a mexer no teste em vez de olhar o que ele diz.
   * `coleta-paralela.test.ts` cobra que exatamente um dos dois esteja agendado.
   */
  it("a coleta ainda tem a segunda tentativa que originou o defeito", () => {
    const PARALELA = readFileSync(
      join(".github", "workflows", "coletar-pncp-paralelo.yml"),
      "utf8",
    );
    const semComentarios = (y: string) => y.replace(/^\s*#.*$/gm, "");
    const quemColeta = /^\s*schedule:/m.test(semComentarios(COLETA)) ? COLETA : PARALELA;

    expect(quemColeta).toContain('cron: "10 6 * * *"');
    expect(quemColeta).toContain('cron: "10 8 * * *"');
  });
});
