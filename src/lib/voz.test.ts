import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A voz do texto que o cliente lê.
 *
 * Decisão do dono em 23/08: nada de travessão em post, guia ou e-mail. O motivo
 * é comercial e não estético. O travessão virou assinatura de texto gerado por
 * IA, o leitor brasileiro já reconhece, e um texto que parece de máquina perde
 * autoridade justamente no assunto em que a autoridade É o produto.
 *
 * ## Por que ler o arquivo em vez de confiar na revisão
 *
 * Porque revisão não escala e ninguém relê guia de oitocentas linhas ao trocar
 * um parágrafo. Havia 642 travessões no texto de cliente quando esta regra
 * nasceu, todos escritos por mim, todos com a melhor das intenções. Sem uma
 * guarda, o 643º entra na semana que vem.
 *
 * ## O que ele NÃO cobre, de propósito
 *
 * Comentário de código. Ali o travessão continua liberado: é conversa entre
 * quem mantém o repositório, não texto de venda, e trocar tudo por vírgula só
 * pioraria a legibilidade de quem lê o código.
 *
 * A lista de arquivos é explícita e cresce conforme cada área é limpa. Guarda
 * que reprova o repositório inteiro no primeiro dia vira `skip` na primeira
 * pressa, e aí não guarda mais nada.
 */

const RAIZ = join(import.meta.dirname, "..");

/** As áreas já limpas. Acrescente aqui ao limpar uma nova. */
const VIGIADOS = [
  "lib/blog/artigos/atraso-no-pagamento-de-contrato-administrativo.ts",
  "lib/blog/artigos/como-saber-se-saiu-uma-licitacao.ts",
  "lib/blog/artigos/documentos-para-participar-de-licitacao.ts",
  "lib/blog/artigos/prazo-para-impugnar-edital-de-licitacao.ts",
  "lib/blog/artigos/quantas-licitacoes-sao-publicadas-por-dia.ts",
  "lib/blog/artigos/vale-a-pena-participar-de-licitacao.ts",
  "lib/resumo/plano.ts",
  "lib/resumo/repositorio.ts",
  "lib/leads-emails.ts",
  "components/CardAssinatura.tsx",
  /*
   * Entrou em 26/08 com a faixa de procedência. É texto de venda como qualquer
   * outro: fala de fonte, de lei e de privacidade para quem ainda decide se
   * confia.
   */
  "components/SelosDeConfianca.tsx",
  "app/vender-para-o-governo/page.tsx",
  "app/contratos/page.tsx",
  "app/sumulas-tcu/page.tsx",
  "app/habilitacao/page.tsx",
  "app/legislacao/page.tsx",
  "app/jurisprudencia/page.tsx",
  "app/lei-14133/page.tsx",
  "app/portais-de-licitacao/page.tsx",
  /*
   * Entrou em 26/08, quando a página de UF deixou de ser uma lista com título e
   * virou a âncora de praça: passo a passo, tabelas de perfil, vantagens de ME e
   * EPP e FAQ. Ela passou a ser texto de venda como qualquer guia, então passa a
   * responder pela mesma régua.
   */
  "app/editais-abertos/[uf]/page.tsx",
  /*
   * A jornada, em 27/08. É a área com mais texto de venda por tela do produto:
   * ela explica o método, promete um resultado por semana e pede que a pessoa
   * escreva sobre o próprio negócio. Nasce vigiada, e não limpa depois.
   */
  "lib/jornada/conteudo.ts",
  "lib/jornada/repositorio.ts",
  "components/jornada/SemAcessoAJornada.tsx",
  "components/jornada/FormularioDaEtapa.tsx",
  "app/(app)/jornada/page.tsx",
  "app/(app)/jornada/[semana]/page.tsx",
  "app/(app)/jornada/acoes.ts",
];

/**
 * As linhas que NÃO são comentário.
 *
 * Simplório de propósito: reconhece `/* … *\/`, `//` e a continuação `*` de um
 * bloco. Não entende travessão dentro de string numa linha que também abre
 * comentário, e isso é aceitável — o erro possível é reprovar de mais, nunca
 * de menos, e reprovar de mais só custa uma reescrita.
 */
/** Todo arquivo de uma pasta, recursivamente, em caminho relativo à raiz. */
function listarArquivos(pasta: string): string[] {
  const achados: string[] = [];
  for (const item of readdirSync(join(RAIZ, "..", pasta), { withFileTypes: true })) {
    const caminho = `${pasta}/${item.name}`;
    if (item.isDirectory()) achados.push(...listarArquivos(caminho));
    else achados.push(caminho);
  }
  return achados;
}

function linhasDeTexto(caminho: string): { numero: number; texto: string }[] {
  const fora: { numero: number; texto: string }[] = [];
  let dentroDeBloco = false;

  const linhas = readFileSync(join(RAIZ, caminho), "utf8").split("\n");
  linhas.forEach((linha, i) => {
    const podado = linha.trim();
    if (podado.startsWith("/*") || podado.startsWith("{/*")) dentroDeBloco = true;
    const ehComentario =
      dentroDeBloco || podado.startsWith("//") || podado.startsWith("*");
    if (podado.includes("*/")) dentroDeBloco = false;
    if (!ehComentario) fora.push({ numero: i + 1, texto: linha });
  });

  return fora;
}

describe("o texto que o cliente lê não usa travessão", () => {
  for (const caminho of VIGIADOS) {
    it(caminho, () => {
      const culpadas = linhasDeTexto(caminho).filter((l) => l.texto.includes("—"));

      const detalhe = culpadas
        .map((l) => `  linha ${l.numero}: ${l.texto.trim().slice(0, 110)}`)
        .join("\n");

      expect(
        culpadas.length,
        `${caminho} usa travessão em texto de cliente:\n${detalhe}\n\n` +
          `Troque pela pontuação que um humano usaria: vírgula para aposto, ` +
          `dois-pontos para o que completa, ponto final para o que muda de ` +
          `direção. Frase que não cabe sem travessão quer virar duas.`,
      ).toBe(0);
    });
  }
});

describe("a guarda vigia o que foi limpo", () => {
  it("cobre os seis artigos, os guias, o e-mail do resumo e a jornada inteira", () => {
    // Sem esta contagem, alguém "conserta" um teste vermelho removendo a linha
    // da lista, e a guarda passa a proteger um conjunto vazio sem ficar
    // vermelha nunca mais.
    expect(VIGIADOS.filter((c) => c.startsWith("lib/blog/artigos/"))).toHaveLength(6);
    expect(VIGIADOS.filter((c) => c.startsWith("app/"))).toHaveLength(12);
    expect(VIGIADOS).toContain("lib/resumo/plano.ts");

    /*
     * A jornada é conferida por evidência positiva, e não por número: todo
     * arquivo que existe na área precisa estar na lista. Uma contagem fixa
     * continuaria verde no dia em que uma tela nova entrasse sem ser vigiada,
     * que é exatamente o caso que a guarda deveria pegar.
     */
    const daJornada = [
      ...listarArquivos("src/app/(app)/jornada"),
      ...listarArquivos("src/components/jornada"),
      ...listarArquivos("src/lib/jornada"),
    ].filter((c) => !c.endsWith(".test.ts"));

    for (const arquivo of daJornada) {
      expect(VIGIADOS, `${arquivo} não está vigiado pela regra de voz`).toContain(
        arquivo.replace(/^src\//, ""),
      );
    }
  });
});
