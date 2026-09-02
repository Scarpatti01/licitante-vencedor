import { describe, expect, it } from "vitest";
import {
  DIAS_QUE_A_MEDICAO_VALE,
  medidoEmDe,
  municipiosCarregados,
  type AgregadoAnterior,
} from "./carregarUfAusente.ts";
import type { MunicipioAgregado } from "./agregarPorMunicipio.ts";

/**
 * Página de município não morre porque a NOSSA coleta falhou.
 *
 * O relatório do Ahrefs de 02/09 mostrou visitas recebendo 404 em
 * `/licitacoes/pr/mandaguari/` e `/licitacoes/sp/sertaozinho/`. Conferido nos
 * dados: Mandaguari está no registro de publicação e sumiu inteiro do agregado,
 * porque o Paraná não foi coletado naquele dia. O registro só protege quem
 * continua no agregado, então ele não alcançava este caso.
 *
 * A distinção que estes testes protegem é uma só, e é toda a regra: "a UF não
 * foi coletada" e "a UF veio e o município não tem mais nada" são fatos
 * diferentes. O primeiro não é notícia sobre o mercado e não pode derrubar
 * página; o segundo é, e continua derrubando.
 */

function municipio(uf: string, slug: string, extra: Partial<MunicipioAgregado> = {}) {
  return {
    uf,
    municipio: slug,
    slug,
    ibge: "0000000",
    editais: 5,
    valor: 1000,
    orgaos: 2,
    modalidades: {},
    compradores: {},
    ...extra,
  } satisfies MunicipioAgregado;
}

const ONTEM = "2026-08-28T10:00:00.000Z";
const HOJE = new Date("2026-08-29T10:00:00.000Z");

const anterior: AgregadoAnterior = {
  coletadoEm: ONTEM,
  municipios: [
    municipio("PR", "mandaguari"),
    municipio("PR", "maringa"),
    municipio("SP", "sertaozinho"),
    municipio("CE", "sobral"),
  ],
};

describe("UF que não foi coletada não apaga as páginas dela", () => {
  it("carrega os municípios da UF ausente", () => {
    const carregados = municipiosCarregados({
      municipiosDeHoje: [municipio("CE", "sobral")],
      anterior,
      ufsAusentes: ["PR"],
      agora: HOJE,
    });
    expect(carregados.map((m) => `${m.uf}/${m.slug}`).sort()).toEqual([
      "PR/mandaguari",
      "PR/maringa",
    ]);
  });

  it("a linha carregada leva a data em que foi medida, e não a de hoje", () => {
    // O ponto inteiro do módulo. Escrever a data de hoje sobre o número de
    // ontem seria dizer que medimos o que não medimos.
    const [m] = municipiosCarregados({
      municipiosDeHoje: [],
      anterior,
      ufsAusentes: ["PR"],
      agora: HOJE,
    });
    expect(m.medidoEm).toBe(ONTEM);
  });

  it("NÃO carrega município de UF que foi coletada", () => {
    // Se o Ceará veio e Sobral não está mais lá, isso é notícia sobre o
    // mercado. Carregar apagaria a notícia e a página passaria a mostrar para
    // sempre o último dia bom.
    const carregados = municipiosCarregados({
      municipiosDeHoje: [municipio("PR", "maringa")],
      anterior,
      ufsAusentes: ["PR"],
      agora: HOJE,
    });
    expect(carregados.some((m) => m.uf === "CE")).toBe(false);
  });

  it("não duplica quem a coleta de hoje trouxe", () => {
    const carregados = municipiosCarregados({
      municipiosDeHoje: [municipio("PR", "maringa", { editais: 99 })],
      anterior,
      ufsAusentes: ["PR"],
      agora: HOJE,
    });
    expect(carregados.map((m) => m.slug)).toEqual(["mandaguari"]);
  });

  it("para de carregar depois do prazo", () => {
    // Número rotulado com a data certa é honesto; mercado descrito por medição
    // de um mês atrás deixa de descrever o presente mesmo assim.
    const muitoDepois = new Date("2026-09-30T10:00:00.000Z");
    expect(
      municipiosCarregados({
        municipiosDeHoje: [],
        anterior,
        ufsAusentes: ["PR"],
        agora: muitoDepois,
      }),
    ).toEqual([]);
  });

  it("a medição carregada não se renova sozinha", () => {
    /*
     * O caso que faria o prazo virar decoração: no segundo dia de UF ausente, o
     * anterior já é uma linha carregada. Se ela fosse recarregada com a data do
     * anterior em vez da própria, o prazo reiniciaria a cada dia e a página
     * congelaria para sempre no último dia bom.
     */
    const segundoDia: AgregadoAnterior = {
      coletadoEm: "2026-08-29T10:00:00.000Z",
      municipios: [municipio("PR", "mandaguari", { medidoEm: ONTEM })],
    };
    const [m] = municipiosCarregados({
      municipiosDeHoje: [],
      anterior: segundoDia,
      ufsAusentes: ["PR"],
      agora: new Date("2026-08-30T10:00:00.000Z"),
    });
    expect(m.medidoEm, "a data foi renovada e o prazo nunca venceria").toBe(ONTEM);
  });

  it("sem UF ausente, não carrega nada", () => {
    expect(
      municipiosCarregados({
        municipiosDeHoje: [],
        anterior,
        ufsAusentes: [],
        agora: HOJE,
      }),
    ).toEqual([]);
  });

  it("sem coleta anterior, não inventa nada", () => {
    expect(
      municipiosCarregados({
        municipiosDeHoje: [],
        anterior: null,
        ufsAusentes: ["PR"],
        agora: HOJE,
      }),
    ).toEqual([]);
  });

  it("data ilegível não vira medição eterna", () => {
    // `new Date("qualquer coisa")` é `NaN`, e comparação com `NaN` é sempre
    // falsa: sem o cuidado explícito, uma data corrompida passaria no prazo
    // para sempre em vez de reprovar.
    const quebrado: AgregadoAnterior = {
      coletadoEm: "isto não é data",
      municipios: [municipio("PR", "mandaguari")],
    };
    expect(
      municipiosCarregados({
        municipiosDeHoje: [],
        anterior: quebrado,
        ufsAusentes: ["PR"],
        agora: HOJE,
      }),
    ).toEqual([]);
  });

  it("o prazo é declarado, e é maior que a pior falha observada", () => {
    // Dois dias seguidos de coleta degradada foi o pior caso real, em 28 e
    // 29/08. O prazo precisa cobrir isso com folga para não virar 404 no meio
    // de uma sequência ruim.
    expect(DIAS_QUE_A_MEDICAO_VALE).toBeGreaterThan(2);
  });

  it("medidoEmDe cai para a data da coleta quando a linha não tem a sua", () => {
    expect(medidoEmDe(municipio("CE", "sobral"), ONTEM)).toBe(ONTEM);
    expect(medidoEmDe(municipio("CE", "sobral", { medidoEm: "x" }), ONTEM)).toBe("x");
  });
});
