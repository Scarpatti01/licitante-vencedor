import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * A página de UF é âncora de praça, e não pode voltar a ser uma lista.
 *
 * ## A pesquisa que motivou o formato
 *
 * Em 26/08 fui ver quem ganha "licitações em <estado>". A página que ocupa o
 * primeiro lugar, da ConLicitação, **não mostra edital nenhum**: ela cita um
 * agregado com data e entrega onde encontrar, quantos estão abertos, como
 * participar passo a passo, documentos, prazos, modalidades, vantagens de ME e
 * EPP, e um FAQ. Os órgãos ficam com as buscas pelo edital específico, que
 * ninguém vence.
 *
 * A nossa tinha 119 linhas: título, lista de editais e link para os outros
 * estados. Tínhamos a única coisa que falta a eles, os editais reais coletados
 * todo dia, e nos faltava tudo o que eles têm.
 *
 * ## O que esta guarda protege, e não é a existência das seções
 *
 * Seção some numa refatoração e alguém percebe: a página encolhe à vista. O que
 * some sem ninguém ver é a HONESTIDADE do número, e é isso que está aqui.
 */

const PAGINA = "src/app/editais-abertos/[uf]/page.tsx";

function fonte(): string {
  return readFileSync(PAGINA, "utf8");
}

/** Sem comentários: eles falam de amostra o tempo todo, e devem falar. */
function codigo(): string {
  return fonte()
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

describe("o perfil da praça é do ESTADO, não da amostra", () => {
  /*
   * A distinção que a página inteira depende de acertar.
   *
   * `u.editais` é uma amostra de 40; a UF tem centenas (733 em Pernambuco, na
   * coleta de 26/08). Uma tabela "o que este estado compra" derivada de 5% dos
   * editais, apresentada com número exato, é overclaim que o leitor não tem como
   * detectar. Por isso a conta é feita na coleta, sobre tudo, e chega pronta em
   * `perfil`.
   */
  it("a tabela vem de `perfil`, e nunca de `u.editais`", () => {
    const c = codigo();

    expect(c).toMatch(/perfil\.porCategoria\.map/);
    expect(c).toMatch(/perfil\.porModalidade\.map/);

    // O caminho errado: classificar a amostra na hora de renderizar.
    expect(c).not.toMatch(/u\.editais[\s\S]{0,40}categoriaDoObjeto/);
    expect(c).not.toMatch(/categoriaDoObjeto/);
  });

  it("a fatia é calculada sobre o total do estado", () => {
    /*
     * `percentual(f.quantidade, u.abertos)` e não sobre a soma da tabela.
     *
     * As duas divergem sempre que houve corte de cauda, e a segunda faria as
     * fatias somarem 100% enquanto a página diz, três linhas acima, que o estado
     * tem 733 abertos. O leitor que confere a conta encontra uma contradição, e
     * quem confere a conta é exatamente o leitor que a gente quer.
     */
    const chamadas = [...codigo().matchAll(/percentual\(([^)]*)\)/g)].map((m) => m[1]);

    expect(chamadas.length).toBeGreaterThan(0);
    for (const argumentos of chamadas) {
      expect(argumentos).toContain("u.abertos");
    }
  });

  it("a página diz que a lista é uma amostra do total", () => {
    // Sem esta frase, as duas contagens na mesma tela (40 na lista, 733 no
    // resumo) parecem contradição, e a mais visível é a menor.
    expect(fonte()).toMatch(/dos \{numero\(u\.abertos\)\} abertos no/);
  });
});

describe("o retrato antigo não vira tabela vazia", () => {
  it("a seção só aparece quando há perfil", () => {
    /*
     * `perfil` nasceu em 26/08 e o `abertos.json` versionado naquele momento não
     * tinha o campo. Ausente é "ainda não medimos" e vazio é "esta praça não tem
     * editais": a primeira esconde a seção, a segunda mostraria uma tabela em
     * branco afirmando que o estado não compra nada.
     */
    const c = codigo();
    expect(c).toMatch(/perfil && perfil\.porCategoria\.length > 0/);
    expect(c).toMatch(/perfil && perfil\.porModalidade\.length > 0/);
  });

  it("o índice não aponta para seção que não existe", () => {
    // Índice com âncora para seção ausente leva o leitor a um pulo que não
    // acontece, e ele conclui que a página está quebrada.
    const c = codigo();
    const indice = c.slice(c.indexOf("const indice = ["), c.indexOf("return ("));
    expect(indice).toMatch(/perfil && perfil\.porCategoria\.length > 0/);
    expect(indice).toMatch(/perfil && perfil\.porModalidade\.length > 0/);
  });
});

describe("o dado estruturado descreve o que a página mostra", () => {
  it("o FAQ do schema é o MESMO objeto renderizado", () => {
    /*
     * Schema que descreve conteúdo ausente da página é o que o Google trata
     * como marcação enganosa, e o castigo não é perder o destaque daquela
     * seção: é a página inteira perder elegibilidade.
     *
     * A guarda exige que os dois lados leiam a mesma variável, em vez de duas
     * listas que começam iguais e divergem na primeira edição.
     */
    const c = codigo();
    expect(c).toMatch(/<Faq itens=\{faq\}/);
    expect(c).toMatch(/mainEntity: faq\.map/);
  });

  it("declara FAQPage e a trilha", () => {
    const c = codigo();
    expect(c).toMatch(/"@type": "FAQPage"/);
    expect(c).toMatch(/"@type": "BreadcrumbList"/);
  });
});
