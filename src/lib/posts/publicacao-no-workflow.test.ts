import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardas da publicação diária de posts.
 *
 * Estes testes existem por causa de um defeito real, e a forma dele importa mais
 * que o conteúdo: em 16/08, a primeira rodada agendada com a publicação ligada
 * gravou **25 posts sem uma única análise** — `com leitura: 0 de 25` — e o job
 * terminou VERDE.
 *
 * A causa era banal: o runner nunca instalou `node_modules`. A coleta jamais
 * precisou (usa só o `fetch` embutido), então o workflow rodou meses sem isso e
 * ninguém notou. A publicação precisa de `pdfjs-dist` e `@google/genai`.
 *
 * O que transformou um erro banal em defeito caro foi o silêncio: a falha
 * aparecia uma vez por edital, num passo que terminou bem, dentro de um log que
 * ninguém abre quando está tudo verde.
 */

const SEQUENCIAL = readFileSync(join(".github", "workflows", "coletar-pncp.yml"), "utf8");
const PARALELO = readFileSync(join(".github", "workflows", "coletar-pncp-paralelo.yml"), "utf8");
const PUBLICAR = readFileSync(join("scripts", "publicar-posts.ts"), "utf8");

describe("o runner instala o que os scripts importam", () => {
  /**
   * A guarda principal.
   *
   * Sem `npm ci`, `publicar-posts.ts` roda, falha em todo edital, e grava a leva
   * assim mesmo. Nada nisso é visível de fora.
   */
  it("o workflow sequencial instala dependências", () => {
    expect(
      /npm ci/.test(SEQUENCIAL),
      "o workflow que publica posts parou de instalar dependências. Sem elas, " +
        "`pdfjs-dist` e `@google/genai` não existem no runner: a leitura falha " +
        "em TODOS os editais, a leva sai vazia de análise e o job fica verde.",
    ).toBe(true);
  });

  it("o workflow paralelo instala dependências no job que publica", () => {
    // O `juntar` é quem chama `publicar-posts.ts` no caminho paralelo. Se a
    // promoção acontecer sem isto, o defeito de 16/08 volta inteiro.
    const juntar = PARALELO.slice(PARALELO.indexOf("juntar:"));
    expect(
      /npm ci/.test(juntar),
      "o job `juntar` publica os posts e precisa das dependências instaladas.",
    ).toBe(true);
  });

  it("a instalação vem antes de publicar", () => {
    // Ordem importa: um `npm ci` depois do script seria decoração. Foi um passo
    // fora de ordem que já deixou a publicação inalcançável uma vez neste
    // workflow — a condição lia uma saída que ainda não existia.
    const instala = SEQUENCIAL.indexOf("npm ci");
    const publica = SEQUENCIAL.indexOf("publicar-posts.ts");
    expect(instala).toBeGreaterThan(-1);
    expect(publica).toBeGreaterThan(-1);
    expect(
      instala < publica,
      "`npm ci` precisa vir ANTES do passo que publica os posts.",
    ).toBe(true);
  });
});

describe("a busca de candidatos não pode ser cortada em silêncio", () => {
  /**
   * O PostgREST tem teto próprio de linhas e ele vence o `limit` da URL.
   *
   * Em 16/08 o script pedia `limit=5000` e recebia 1.000 — sem erro e sem aviso.
   * O corte não era aleatório: a ordem é `encerramento_proposta.asc`, então as
   * 1.000 linhas eram as de prazo mais curto, e 643 delas foram recusadas por
   * "prazo-curto-demais". Havia 2.108 editais elegíveis no banco que a seleção
   * nunca viu.
   */
  it("a leitura é paginada", () => {
    expect(
      /offset=/.test(PUBLICAR),
      "a busca voltou a pedir tudo numa requisição só. O `limit` da URL não " +
        "vence o teto do servidor: a resposta vem cortada em silêncio, e como a " +
        "ordem é por prazo crescente, o que sobra é justamente o que a seleção " +
        "descarta por fechar cedo demais.",
    ).toBe(true);
  });

  it("a parada olha o que chegou, não o que foi pedido", () => {
    // `pagina.length < POR_PAGINA` é a condição certa. Comparar com o `limit`
    // pedido faria o laço não terminar quando o servidor devolvesse menos.
    expect(PUBLICAR).toMatch(/pagina\.length\s*<\s*POR_PAGINA/);
  });
});

describe("leva sem nenhuma leitura não é publicada", () => {
  /**
   * A segunda guarda, e a que sobrevive à próxima causa.
   *
   * Instalar a dependência conserta ESTE motivo. Amanhã pode ser a chave da IA
   * revogada, o PNCP mudando o endereço do documento, ou o `pdfjs` quebrando
   * numa atualização. A assinatura é sempre a mesma — zero de N —, e é ela que o
   * script passou a recusar.
   *
   * Vinte e cinco editais independentes não falham todos por acaso: quando
   * nenhum é lido, o que quebrou está antes deles.
   */
  it("o script recusa gravar quando nada foi lido", () => {
    expect(
      /comLeitura === 0/.test(PUBLICAR),
      "sumiu a recusa de gravar leva sem nenhuma leitura. Sem ela, uma falha " +
        "comum a todos os editais vira 25 posts publicados sem análise — a " +
        "listagem crua que o site existe para não ser.",
    ).toBe(true);
  });

  it("a recusa lança, e não apenas avisa", () => {
    // `console.warn` seria mais uma linha num log que ninguém abre quando o job
    // está verde. Foi exatamente esse o modo de falha.
    const trecho = PUBLICAR.slice(PUBLICAR.indexOf("comLeitura === 0"));
    expect(trecho.slice(0, 400)).toMatch(/throw new ErroDeOperacao/);
  });

  /**
   * Leitura parcial continua passando.
   *
   * Nem todo edital publica documento legível, e a guarda existe para pegar
   * falha sistêmica — não para exigir perfeição. Uma guarda que recusasse
   * 24 de 25 seria abandonada na primeira semana.
   */
  it("a recusa é só para o zero absoluto", () => {
    const trecho = PUBLICAR.slice(PUBLICAR.indexOf("comLeitura === 0"), PUBLICAR.indexOf("comLeitura === 0") + 200);
    expect(trecho).not.toMatch(/comLeitura\s*<\s*[1-9]/);
  });
});

describe("leva sem leitura tem de dizer POR QUÊ", () => {
  /**
   * A guarda que faltava, e que custou duas rodadas.
   *
   * Em 18/08 a publicação recusou gravar com `com leitura: 0 de 25` — o
   * comportamento certo. Mas o log não continha uma única linha explicando a
   * causa, e a mensagem da própria recusa mandava procurar um erro que não
   * existia ali.
   *
   * O motivo estava sendo calculado e descartado. `analisarEdital` NÃO lança
   * quando o provedor recusa: devolve análise sem `analisadoEm` e entrega a
   * causa real por `registrar`. `publicar-posts.ts` não passava esse callback,
   * então `sem_credencial`, quota estourada, modelo inexistente e resposta fora
   * do schema chegavam todos ao log como o mesmo silêncio.
   *
   * Recusar sem dizer por quê é meio caminho: protege o produto e não permite
   * consertar.
   */
  it("a análise passa `registrar`, que é por onde a recusa se explica", () => {
    const chamada = PUBLICAR.slice(PUBLICAR.indexOf("analisarEdital(edital"));
    expect(
      /registrar\s*:/.test(chamada.slice(0, 900)),
      "`publicar-posts.ts` voltou a chamar `analisarEdital` sem `registrar`. " +
        "Sem esse callback a recusa do provedor de IA é silenciosa: a leva é " +
        "corretamente recusada, e ninguém consegue descobrir a causa. Foi o que " +
        "aconteceu em 18/08 — log inteiro sem uma linha de motivo.",
    ).toBe(true);
  });

  it("a recusa vai para o log de erro, não some numa variável", () => {
    const trecho = PUBLICAR.slice(PUBLICAR.indexOf("registrar:"));
    expect(trecho.slice(0, 600)).toMatch(/console\.error/);
  });

  /**
   * A mensagem da recusa precisa apontar para os erros que EXISTEM.
   *
   * A versão anterior mandava procurar só `leitura falhou em ...`, que é
   * impresso apenas quando há exceção — e recusa de provedor não é exceção.
   * Mandar alguém procurar a linha errada é pior que não mandar nada.
   */
  it("a mensagem da recusa cita as duas origens possíveis", () => {
    const trecho = PUBLICAR.slice(PUBLICAR.indexOf("comLeitura === 0"));
    expect(trecho.slice(0, 900)).toContain("análise recusada");
    expect(trecho.slice(0, 900)).toContain("leitura falhou");
  });
});
