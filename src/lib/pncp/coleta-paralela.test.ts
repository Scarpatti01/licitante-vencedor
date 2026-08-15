import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardas da coleta paralela.
 *
 * A paralelização foi construída pronta e **deliberadamente desligada**: quem
 * coleta todo dia continua sendo o workflow sequencial, até uma rodada real
 * confirmar que a publicação de posts sai certa. Duas cirurgias na mesma véspera,
 * no workflow do qual dependem o alerta, o produto e os posts, tornariam
 * impossível saber qual das duas quebrou.
 *
 * Essa decisão vive num arquivo YAML que ninguém compila e nenhum teste executa.
 * Estas asserções são o que impede que ela seja desfeita sem intenção — por um
 * merge, por um copiar-e-colar, ou por alguém "só arrumando" o agendamento.
 */

const PARALELO = readFileSync(
  join(".github", "workflows", "coletar-pncp-paralelo.yml"),
  "utf8",
);
const SEQUENCIAL = readFileSync(
  join(".github", "workflows", "coletar-pncp.yml"),
  "utf8",
);

describe("a coleta paralela fica pronta, e desligada", () => {
  /**
   * A garantia principal.
   *
   * Se este teste falhar, os dois workflows passaram a coletar no mesmo dia — e
   * o `concurrency` compartilhado faria um esperar o outro em vez de os dois
   * rodarem, mas o commit do agregado seria feito duas vezes com resultados
   * diferentes.
   */
  it("o paralelo não tem agendamento", () => {
    expect(
      PARALELO.includes("schedule:"),
      "o workflow paralelo ganhou agendamento. Se a promoção é intencional, o " +
        "agendamento do SEQUENCIAL precisa sair no mesmo commit — os dois " +
        "coletando no mesmo dia comitam o agregado duas vezes.",
    ).toBe(false);
  });

  it("o sequencial continua sendo quem coleta todo dia", () => {
    expect(SEQUENCIAL).toContain("schedule:");
    expect(SEQUENCIAL).toContain('cron: "10 6 * * *"');
  });

  /**
   * Os dois compartilham o grupo de concorrência.
   *
   * É o que impede os dois rodarem ao mesmo tempo no dia da promoção, quando
   * ambos existirem com agendamento por alguns minutos. O upsert no banco
   * aguentaria; o commit do agregado, não.
   */
  it("os dois usam o mesmo grupo de concorrência", () => {
    const grupo = /group:\s*coletar-pncp\b/;
    expect(PARALELO).toMatch(grupo);
    expect(SEQUENCIAL).toMatch(grupo);
  });

  /**
   * `fail-fast: false` é o coração do desenho.
   *
   * Ligado, uma UF que falha cancela as outras 26 — reintroduzindo no runner
   * exatamente o modo de falha que paralelizar veio eliminar. O PNCP caiu no
   * meio da coleta em 12/08 e em 14/08; é para esse dia que isto existe.
   */
  it("uma UF que falha não cancela as outras", () => {
    expect(PARALELO).toMatch(/fail-fast:\s*false/);
  });

  /**
   * A junção roda mesmo com UFs faltando.
   *
   * Juntar 24 de 27 é o resultado CERTO de um dia em que o PNCP oscilou.
   * Recusar isso jogaria fora uma coleta boa por causa de três estados — e a
   * classificação já sabe declarar cobertura parcial.
   */
  it("a junção roda mesmo com shards falhando", () => {
    expect(PARALELO).toMatch(/if:\s*always\(\)/);
  });

  it("o shard coleta em modo parcial, sem agregar", () => {
    // Sem `--parcial`, cada um dos 27 escreveria seu próprio agregado e a
    // junção seria sobrescrita por qualquer um deles.
    expect(PARALELO).toContain("--parcial");
  });

  /**
   * A guarda contra degradação sobreviveu à paralelização.
   *
   * "Um dia ruim não apaga um dia bom" é a regra que custou uma série temporal
   * para ser aprendida. Ela precisa valer nos dois caminhos.
   */
  it("o paralelo só comita coleta completa ou parcial-aceitável", () => {
    expect(PARALELO).toContain("classe == 'completa' || steps.classe.outputs.classe == 'parcial-aceitavel'");
  });

  it("as credenciais do banco chegam ao shard", () => {
    // Foi a ausência exata disto no sequencial que deixou `editais/gravar.ts`
    // escrito, testado e nunca executado em produção.
    expect(PARALELO).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(PARALELO).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });
});

describe("o modo parcial não pode mudar o caminho de hoje", () => {
  const INGERIR = readFileSync(join("scripts", "ingerir-pncp.ts"), "utf8");

  /**
   * `--parcial` é aditiva e desligada por padrão.
   *
   * É o que permitiu construir a paralelização sem tocar no comportamento da
   * coleta agendada. Se um dia ela virar padrão, a coleta sequencial para de
   * gravar o agregado — em silêncio, porque o job continuaria verde.
   */
  it("a flag existe e é opcional", () => {
    expect(INGERIR).toContain('temFlag("parcial")');
    expect(INGERIR).not.toMatch(/parcial\s*=\s*!temFlag/);
  });
});
