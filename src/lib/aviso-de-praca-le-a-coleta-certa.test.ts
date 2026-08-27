import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * O aviso de praça faltante lê a coleta CERTA, e não a última perfeita.
 *
 * ## O recurso que nasceu inerte
 *
 * Em 22/08 o dono pediu uma coisa específica: avisar o cliente quando uma praça
 * do perfil dele ficou de fora da coleta do dia. O PR #71 construiu o canal, e
 * `classificarColeta` passou a gravar `ufsAusentes`.
 *
 * O passo que lê esse campo procurava a última coleta com
 * `gh run list --status=success`. E a coleta termina em "failure" sempre que
 * UMA das 27 UFs cai, o que o PNCP provoca quase todo dia: em 27/08 foram seis
 * de uma vez (AP, BA, DF, GO, MA, SE), todas com erro 500 da fonte.
 *
 * O resultado é quase cômico de tão exato: o aviso só era lido nos dias em que
 * não havia nada para avisar. Nos dias com praça faltante, o passo pulava a
 * rodada e ia buscar a última coleta perfeita, cujo `ufsAusentes` é vazio por
 * definição. Em 27/08 ele leu a classificação de 24/08.
 *
 * ## Por que ninguém notou por cinco dias
 *
 * Porque o sintoma é a AUSÊNCIA de uma frase. O resumo sai igual, o cliente
 * recebe os editais, e o campo vazio parece "não havia praça faltando". Não há
 * erro, não há vermelho, não há linha no log dizendo que a informação foi
 * buscada no lugar errado.
 *
 * ## O critério certo
 *
 * A presença do artefato, que o `for` do passo já confere. O job `juntar` roda
 * com `if: always()` e publica o `snapshot-pncp` mesmo quando shards caem, que
 * é justamente o desenho: juntar 21 de 27 é o resultado certo de um dia em que
 * a fonte oscilou. O status da rodada nunca foi a pergunta.
 */

const WORKFLOW = ".github/workflows/enviar-resumo-diario.yml";
const COLETA = ".github/workflows/coletar-pncp-paralelo.yml";

const yaml = () => readFileSync(WORKFLOW, "utf8");

/** O passo que baixa a classificação, sem os comentários que falam dele. */
function passoDaClassificacao(): string {
  const s = yaml();
  const inicio = s.indexOf("Baixar a classificação da última coleta");
  expect(inicio, `${WORKFLOW} não tem o passo da classificação`).toBeGreaterThan(-1);
  const fim = s.indexOf("- name:", inicio + 40);
  return s
    .slice(inicio, fim === -1 ? undefined : fim)
    .replace(/^\s*#.*$/gm, " ");
}

describe("a busca pela coleta não filtra por sucesso", () => {
  it("usa `--status=completed`, e nunca `--status=success`", () => {
    const passo = passoDaClassificacao();

    expect(
      passo,
      "`--status=success` faz este passo pular exatamente as rodadas em que " +
        "houve praça faltante, porque a coleta termina em failure quando uma UF " +
        "cai. O aviso passa a ser lido só nos dias em que não há nada para " +
        "avisar. Use `--status=completed`.",
    ).not.toMatch(/--status=success/u);

    expect(passo).toMatch(/--status=completed/u);
  });

  it("continua exigindo o artefato antes de baixar", () => {
    /*
     * Trocar o filtro sem conferir o artefato faria o passo tentar baixar de
     * uma rodada que morreu antes de publicar qualquer coisa. A presença do
     * artefato é o critério que substitui o status, e não um extra.
     */
    const passo = passoDaClassificacao();
    expect(passo).toMatch(/artifacts/u);
    expect(passo).toMatch(/grep -qx snapshot-pncp/u);
  });

  it("olha os dois workflows de coleta, o paralelo e o sequencial", () => {
    // O sequencial é o plano B manual. Se ele sair da busca, um dia de coleta
    // manual vira um dia sem aviso de praça.
    const passo = passoDaClassificacao();
    expect(passo).toMatch(/coletar-pncp-paralelo\.yml/u);
    expect(passo).toMatch(/coletar-pncp\.yml/u);
  });
});

describe("a coleta publica o retrato mesmo quando falha", () => {
  /*
   * É esta garantia que torna o conserto acima válido. Se o `juntar` só
   * rodasse em rodada perfeita, filtrar por `completed` não adiantaria nada:
   * não haveria artefato para achar.
   */
  it("o job que junta roda com `if: always()`", () => {
    const s = readFileSync(COLETA, "utf8");
    const job = s.slice(s.indexOf("\n  juntar:"));
    const cabeca = job.slice(0, job.indexOf("steps:"));
    expect(cabeca).toMatch(/if:\s*always\(\)/u);
  });

  it("e publica o `snapshot-pncp`", () => {
    expect(readFileSync(COLETA, "utf8")).toMatch(/name:\s*snapshot-pncp/u);
  });
});

describe("a falha deste passo não pode virar silêncio", () => {
  it("o passo tolera erro mas anuncia", () => {
    /*
     * `continue-on-error` está certo: sem classificação o resumo sai igual, só
     * sem a observação de praça faltante. O que não pode é isso sumir sem
     * rastro, que é a lição de `falha-silenciosa.test.ts`.
     */
    const passo = passoDaClassificacao();
    expect(passo).toMatch(/continue-on-error:\s*true/u);
    expect(yaml()).toMatch(/::warning/u);
  });
});
