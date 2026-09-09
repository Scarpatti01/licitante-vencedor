import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Quem pede `ignore-duplicates` diz QUAL unicidade está ignorando.
 *
 * ## O DEFEITO, QUE APARECEU QUATRO VEZES
 *
 * `Prefer: resolution=ignore-duplicates` sem `on_conflict=` na URL faz o
 * PostgREST usar a CHAVE PRIMÁRIA como alvo do conflito. Quando a primária é um
 * `id` gerado, o alvo nunca conflita, a violação da unicidade REAL sobe como
 * erro, e o 409 chega em cima de quem esperava sucesso.
 *
 * Os quatro usos do projeto, conferidos contra o banco de produção em 09/09:
 *
 *   compras_da_jornada    pk (id)      unique parcial em referencia_externa  QUEBRADO
 *   leads                 pk (id)      unique em email                       QUEBRADO
 *   envios_de_alerta      pk (id)      unique (lead_id, edital_id)           QUEBRADO
 *   envios_do_resumo      pk (id)      unique (empresa_id, edital_id)        QUEBRADO
 *   avisos_de_custo_de_ia pk (mes)     a própria primária                    ok
 *
 * O último funcionava por coincidência: a primária É a chave natural. Foi a
 * única diferença entre um caso são e três quebrados, e nada no código dizia
 * isso, porque o alvo era implícito nos cinco.
 *
 * ## O QUE ISSO CUSTOU
 *
 * O do `leads` recusava, na home, quem tentasse se cadastrar duas vezes: o topo
 * do funil devolvendo "não conseguimos registrar" justo para quem não recebeu o
 * primeiro e-mail. Os de `envios_` derrubam a gravação DEPOIS de o e-mail ter
 * saído, quebrando exatamente a retentativa que os comentários deles descrevem
 * como o motivo do header. O da Hotmart transformou 165 reentregas de uma
 * compra já gravada em 165 respostas 503.
 *
 * Nenhum foi pego por teste, porque os mocks devolviam o que eu SUPUNHA do
 * PostgREST. Mock de serviço externo é afirmação sobre o mundo.
 *
 * ## A REGRA
 *
 * Não é "não use o header". É: quem usa nomeia o alvo. Um `on_conflict=`
 * explícito é uma frase verificável, que alguém pode conferir contra o esquema;
 * o alvo implícito é uma suposição que ninguém vê para checar.
 *
 * Vale inclusive onde a primária É a chave natural, porque depender dessa
 * coincidência é depender de a próxima migração não mexer nela.
 */

const RAIZ = join(__dirname, "..");
const HEADER = "resolution=ignore-duplicates";

function arquivosDeCodigo(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeCodigo(caminho);
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

/**
 * O trecho de uma chamada ao redor do header, ignorando comentário.
 *
 * A URL e o `prefer` ficam no mesmo `fetch`, então uma janela generosa em volta
 * do header contém os dois. Simplório de propósito: o erro possível é aceitar
 * um `on_conflict` de uma chamada vizinha, e isso é muito menos provável do que
 * um `fetch` de trinta linhas, que não existe neste projeto.
 *
 * A filtragem de comentário NÃO é detalhe. Na primeira execução esta guarda
 * reprovou quatro arquivos, e três deles só CITAVAM o header num comentário
 * explicando por que ele havia sido removido. Guarda que confunde o texto sobre
 * o defeito com o defeito reprova quem já consertou, e a saída fácil para isso
 * é afrouxar a regra. É a terceira vez nesta base que uma guarda morde o
 * próprio comentário.
 */
function janelas(texto: string): string[] {
  const linhas = texto.split("\n");
  let dentroDeBloco = false;

  const ehComentario = linhas.map((linha) => {
    const podado = linha.trim();
    if (podado.startsWith("/*")) dentroDeBloco = true;
    const comentario = dentroDeBloco || podado.startsWith("//") || podado.startsWith("*");
    if (podado.includes("*/")) dentroDeBloco = false;
    return comentario;
  });

  return linhas.flatMap((linha, i) =>
    linha.includes(HEADER) && !ehComentario[i]
      ? [linhas.slice(Math.max(0, i - 25), i + 10).join("\n")]
      : [],
  );
}

const usos = arquivosDeCodigo(join(RAIZ, "lib")).flatMap((arquivo) =>
  janelas(readFileSync(arquivo, "utf8")).map((janela) => ({
    arquivo: arquivo.slice(RAIZ.length + 1),
    janela,
  })),
);

describe("`ignore-duplicates` no PostgREST", () => {
  it("é usado em algum lugar, senão esta guarda não guarda nada", () => {
    expect(
      usos.length,
      "nenhum uso encontrado. Ou o header sumiu do projeto, e aí esta guarda " +
        "pode sair, ou a varredura quebrou e ela passaria verde para sempre.",
    ).toBeGreaterThan(0);
  });

  for (const { arquivo, janela } of usos) {
    it(`${arquivo} nomeia o alvo do conflito`, () => {
      expect(
        janela,
        `${arquivo} pede \`${HEADER}\` sem \`on_conflict=\` na URL. Sem o alvo ` +
          `nomeado, o PostgREST mira a CHAVE PRIMÁRIA: se ela for um id gerado, ` +
          `o alvo nunca conflita, a unicidade real estoura em 409, e quem chamou ` +
          `recebe erro onde esperava sucesso. Foi assim quatro vezes neste ` +
          `projeto. Nomeie a constraint, mesmo quando a primária parecer a certa.`,
      ).toContain("on_conflict=");
    });
  }
});
