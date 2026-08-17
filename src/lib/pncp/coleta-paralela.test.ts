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

/** `schedule:` citado em comentário não é agendamento. */
function agendado(yaml: string): boolean {
  return /^\s*schedule:/m.test(yaml.replace(/^\s*#.*$/gm, ""));
}

describe("exatamente um dos dois coleta por agendamento", () => {
  /**
   * A garantia principal, e ela mudou de forma em 18/08.
   *
   * Antes da promoção este bloco cobrava "o paralelo não tem agendamento" e "o
   * sequencial tem". Escrito assim, ele travava a promoção que o próprio
   * cabeçalho do workflow paralelo descrevia como o passo seguinte — e quem
   * promovesse teria de INVERTER dois testes, que é a operação em que se erra o
   * sinal e se aprova exatamente o estado que o teste existia para impedir.
   *
   * O que importa não é qual dos dois está agendado. É que seja UM:
   *
   *   · os DOIS agendados — o `concurrency` compartilhado faz um esperar o
   *     outro em vez de rodarem juntos, mas o agregado é comitado duas vezes no
   *     mesmo dia, com resultados diferentes;
   *   · NENHUM agendado — a coleta simplesmente para, e para em silêncio: não
   *     há job vermelho, não há alerta, só um agregado que envelhece.
   *
   * Nesta forma o teste sobrevive à promoção e ao retorno, e continua pegando
   * os dois desastres.
   */
  it("um, e só um, tem `schedule:`", () => {
    const comAgendamento = [
      ["coletar-pncp.yml", SEQUENCIAL],
      ["coletar-pncp-paralelo.yml", PARALELO],
    ]
      .filter(([, yaml]) => agendado(yaml))
      .map(([nome]) => nome);

    expect(
      comAgendamento,
      comAgendamento.length === 0
        ? "NENHUM dos dois workflows coleta por agendamento. A coleta parou, e " +
          "vai parar em silêncio: sem job agendado não há job vermelho."
        : "os DOIS workflows coletam por agendamento. No mesmo dia, os dois " +
          "comitam `dados/agregados.json` com resultados diferentes — o " +
          "`concurrency` compartilhado serializa a execução, não o commit.",
    ).toHaveLength(1);
  });

  it("quem está agendado coleta duas vezes por dia", () => {
    // A segunda tentativa não é redundância: o PNCP caiu duas vezes em 12/08,
    // veio degradado em 13/08 e falhou inteiro em 14/08 — e dia perdido não se
    // recolhe, porque a janela é "propostas abertas HOJE".
    const quemColeta = agendado(SEQUENCIAL) ? SEQUENCIAL : PARALELO;
    expect(quemColeta).toContain('cron: "10 6 * * *"');
    expect(quemColeta).toContain('cron: "10 8 * * *"');
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
