import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * A política de privacidade afirma coisas sobre o CÓDIGO. Estes testes conferem
 * se elas continuam verdadeiras.
 *
 * Uma política de privacidade não quebra como código quebra: ela continua
 * publicada, bonita e falsa. Se alguém adicionar o Google Analytics amanhã, a
 * frase "não usamos rastreador" vira declaração falsa ao titular — que é
 * exatamente o que a LGPD pune — e nada no build reclama.
 *
 * Então as duas afirmações mais fortes da página viram teste. Não é zelo
 * excessivo: são as duas que um comprador B2B confere, e as duas que dariam
 * problema real se deixassem de valer sem ninguém perceber.
 */

function arquivosDeCodigo(dir: string, achados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) arquivosDeCodigo(caminho, achados);
    else if (/\.tsx?$/.test(entrada.name) && !entrada.name.includes(".test."))
      achados.push(caminho);
  }
  return achados;
}

/**
 * Tudo menos a própria política.
 *
 * Ela NOMEIA os rastreadores — "não temos Google Analytics, Hotjar, PostHog…" —
 * e por isso reprovava a si mesma na primeira execução. A varredura procura
 * quem CARREGA um rastreador; a página que os cita para negá-los é justamente a
 * afirmação sendo protegida, não uma violação dela.
 */
const CODIGO = arquivosDeCodigo("src").filter(
  (a) => !a.includes(join("app", "privacidade")),
);

describe("a página de privacidade não pode virar mentira", () => {
  /**
   * "Não usamos rastreador, pixel de anúncio nem ferramenta de analytics."
   *
   * A lista é dos suspeitos reais, não exaustiva — cobre o que de fato entra num
   * projeto Next por hábito ou por pedido de marketing. Se um novo entrar por
   * outro nome, este teste não pega; mas quem adicionar um DESTES vai ler a
   * mensagem e saber que precisa mexer na política junto.
   */
  const RASTREADORES = [
    "googletagmanager",
    "google-analytics",
    "gtag(",
    "connect.facebook.net",
    "fbq(",
    "hotjar",
    "mixpanel",
    "posthog",
    "plausible.io",
    "umami",
    "clarity.ms",
    "segment.com/analytics",
  ];

  it.each(RASTREADORES)("nenhum arquivo carrega %s", (marca) => {
    const culpados = CODIGO.filter((arquivo) =>
      readFileSync(arquivo, "utf8").toLowerCase().includes(marca.toLowerCase()),
    );

    expect(
      culpados,
      `/privacidade/ afirma que o site não tem rastreador, e ${marca} apareceu em ` +
        `${culpados.join(", ")}. Ou remova o rastreador, ou corrija a política ` +
        `ANTES de publicar — declaração falsa ao titular é o que a LGPD pune.`,
    ).toEqual([]);
  });

  /**
   * "O perfil da sua empresa não é enviado ao modelo."
   *
   * É a afirmação mais valiosa da página, e a mais fácil de quebrar sem querer:
   * bastaria alguém achar que a análise ficaria melhor "se o modelo soubesse o
   * perfil da empresa". Ficaria — e a política passaria a mentir no mesmo
   * commit.
   *
   * O teste guarda a fronteira: o caminho da IA não pode importar o perfil.
   */
  it("o caminho da IA não conhece o perfil da empresa", () => {
    const daIa = CODIGO.filter((a) => a.includes(join("src", "lib", "ia")));
    expect(daIa.length).toBeGreaterThan(0);

    /*
     * Mira no SÍMBOLO, e não no caminho do módulo.
     *
     * A primeira versão deste teste reprovava qualquer import de
     * `dominio/tipos` e acusou três arquivos inocentes: `dominio/tipos` é um
     * barril, e o que eles importam de lá é `AnaliseDoEdital`,
     * `ExigenciaDoEdital` e `TIPOS_DE_DOCUMENTO` — o vocabulário do RESULTADO
     * da análise, que obviamente pertence a esta camada.
     *
     * O que a política afirma é sobre o perfil da empresa chegar ao modelo.
     * Então é `PerfilDaEmpresa` — o tipo — e a tabela dele que precisam estar
     * ausentes. Teste que acusa inocente é abandonado na terceira vez.
     */
    const MARCAS_DO_PERFIL = /\bPerfilDaEmpresa\b|perfis_da_empresa/;

    const vazando = daIa.filter((arquivo) => {
      const fonte = readFileSync(arquivo, "utf8");
      // Fora dos comentários: o texto corrido desta camada fala de "perfil" o
      // tempo todo, e justamente para explicar por que ele NÃO é enviado.
      const semComentarios = fonte
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      return MARCAS_DO_PERFIL.test(semComentarios);
    });

    expect(
      vazando,
      `/privacidade/ afirma que o perfil da empresa nunca chega ao modelo, e ` +
        `${vazando.join(", ")} passou a importá-lo. Se a mudança é intencional, ` +
        `a política precisa mudar junto — e os clientes precisam ser avisados.`,
    ).toEqual([]);
  });

  /**
   * O canal do titular precisa existir na página.
   *
   * Direito do art. 18 sem endereço para exercê-lo não é direito. Se alguém
   * remover o contato da política numa reescrita, isto reclama.
   */
  it("a política publica um canal para o titular exercer os direitos", () => {
    const pagina = readFileSync(join("src", "app", "privacidade", "page.tsx"), "utf8");
    expect(pagina).toContain("CONTATO.email");
    expect(pagina).toMatch(/art\.\s*18/);
  });
});
