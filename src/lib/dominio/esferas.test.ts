import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contarPorEsfera } from "../pncp/agregarPorMunicipio";
import { edital } from "../fontes/fixtures";
import { montarDistribuicao } from "./esferas";

/**
 * As guardas do gráfico de esferas da home.
 *
 * O gráfico substituiu um PNG em 19/09/2026. O PNG tinha um defeito que nenhum
 * teste alcançava: os números estavam em pixel. Estas guardas existem para o
 * substituto não adquirir defeitos que um teste ALCANÇA e ninguém escreveu.
 */

const CONTAGEM = {
  porEsfera: { municipal: 620, estadual: 200, distrital: 19, federal: 120, desconhecida: 41 },
  total: 1000,
};

describe("contarPorEsfera", () => {
  it("conta cada esfera e escreve a soma", () => {
    const r = contarPorEsfera([
      edital({ id: "1", orgao: { cnpj: "1", nome: "Prefeitura", esfera: "municipal" } }),
      edital({ id: "2", orgao: { cnpj: "2", nome: "Prefeitura", esfera: "municipal" } }),
      edital({ id: "3", orgao: { cnpj: "3", nome: "Estado", esfera: "estadual" } }),
      edital({ id: "4", orgao: { cnpj: "4", nome: "União", esfera: "federal" } }),
    ]);

    expect(r.porEsfera).toEqual({
      municipal: 2,
      estadual: 1,
      distrital: 0,
      federal: 1,
      desconhecida: 0,
    });
    expect(r.total).toBe(4);
  });

  /**
   * O total é o que vai virar denominador na página.
   *
   * Se ele deixar de bater com a soma das partes, todo percentual do gráfico
   * fica errado sem nada na tela denunciar: as barras continuam desenhando, só
   * param de somar 100. É a única invariante que este objeto tem.
   */
  it("o total é sempre a soma das partes", () => {
    for (const quantas of [0, 1, 7, 50]) {
      const esferas = ["municipal", "estadual", "distrital", "federal", "desconhecida"] as const;
      const r = contarPorEsfera(
        Array.from({ length: quantas }, (_, i) =>
          edital({
            id: String(i),
            orgao: { cnpj: String(i), nome: "Órgão", esfera: esferas[i % esferas.length] },
          }),
        ),
      );

      expect(r.total).toBe(quantas);
      expect(Object.values(r.porEsfera).reduce((s, n) => s + n, 0)).toBe(r.total);
    }
  });

  it("conta esfera não declarada em vez de descartá-la", () => {
    // Descartar encolheria o denominador e inflaria as outras três fatias.
    const r = contarPorEsfera([
      edital({ id: "1", orgao: { cnpj: "1", nome: "?", esfera: "desconhecida" } }),
    ]);

    expect(r.porEsfera.desconhecida).toBe(1);
    expect(r.total).toBe(1);
  });
});

describe("montarDistribuicao", () => {
  it("soma o Distrito Federal na fatia estadual", () => {
    // O governo do DF é unidade federativa comprando, não prefeitura. Numa
    // fatia própria seria ruído de 0,2%; em "não informada" seria falso.
    const d = montarDistribuicao(CONTAGEM, "2026-09-20T09:10:00.000Z")!;
    const estadual = d.fatias.find((f) => f.chave === "estadual")!;

    expect(estadual.editais).toBe(200 + 19);
  });

  it("usa o total declarado como denominador, e não a soma das fatias exibidas", () => {
    const d = montarDistribuicao(CONTAGEM, "2026-09-20T09:10:00.000Z")!;
    const municipal = d.fatias.find((f) => f.chave === "municipal")!;

    expect(municipal.percentual).toBe("62,0");
    expect(municipal.fracao).toBeCloseTo(0.62, 10);
    expect(d.total).toBe(1000);
  });

  it("nomeia o que a fonte não declarou em vez de chamar de 'outros'", () => {
    const d = montarDistribuicao(CONTAGEM, "2026-09-20T09:10:00.000Z")!;
    const naoInformada = d.fatias.find((f) => f.chave === "naoInformada")!;

    expect(naoInformada.rotulo).toBe("Não informada");
    expect(naoInformada.editais).toBe(41);
  });

  it("deriva o 'em cada dez' do título a partir da mesma medição", () => {
    // O título da seção é afirmação medida como qualquer outra. Escrito à mão,
    // seria a arte antiga de novo, só que em texto.
    expect(montarDistribuicao(CONTAGEM, "x")!.emCadaDez).toBe(6);
    expect(
      montarDistribuicao(
        { porEsfera: { municipal: 500, estadual: 500 }, total: 1000 },
        "x",
      )!.emCadaDez,
    ).toBe(5);
  });

  /**
   * Devolver `null` tira a seção inteira da home.
   *
   * É o comportamento certo para todo caso abaixo: nenhum deles significa algo
   * sobre o mercado, todos significam algo sobre a NOSSA coleta. Um gráfico de
   * zeros afirmaria a primeira coisa.
   */
  it.each([
    ["campo ausente", undefined],
    ["campo nulo", null],
    ["não é objeto", 42],
    ["sem porEsfera", { total: 10 }],
    ["sem total", { porEsfera: { municipal: 10 } }],
    ["total zero", { porEsfera: { municipal: 0 }, total: 0 }],
    ["total negativo", { porEsfera: { municipal: 1 }, total: -3 }],
    ["total não numérico", { porEsfera: { municipal: 1 }, total: "1000" }],
  ])("devolve null quando %s", (_caso, bruto) => {
    expect(montarDistribuicao(bruto, "2026-09-20T09:10:00.000Z")).toBeNull();
  });

  it("carrega a data da coleta que produziu os números", () => {
    const d = montarDistribuicao(CONTAGEM, "2026-09-20T09:10:00.000Z")!;
    expect(d.medidoEm).toBe("2026-09-20T09:10:00.000Z");
  });
});

/**
 * A ponta que nenhum teste de unidade alcança.
 *
 * `montarDistribuicao` pode estar perfeita e o gráfico sumir da home mesmo
 * assim, se o agregado parar de trazer o campo. Quem escreve o campo são os
 * dois scripts de coleta, e eles rodam num cron que ninguém abre: o dia em que
 * alguém mexer num e esquecer o outro só apareceria como uma seção que sumiu.
 *
 * É a mesma razão pela qual `agregarPorMunicipio` foi extraído dos dois: duas
 * cópias da mesma regra de agregação divergindo é o bug que não aparece em
 * teste nenhum dos dois arquivos.
 */
describe("os dois scripts que escrevem o agregado contam as esferas", () => {
  it.each(["scripts/ingerir-pncp.ts", "scripts/juntar-coleta.ts"])("%s", (caminho) => {
    const fonte = readFileSync(join(caminho), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(
      fonte,
      `${caminho} não escreve 'esferas' no agregado. Sem esse campo, ` +
        `distribuicaoPorEsfera() devolve null e a seção de esferas some da ` +
        `home inteira, sem erro nenhum em lugar nenhum.`,
    ).toContain("esferas: contarPorEsfera(editais)");
  });
});
