import { describe, expect, it } from "vitest";
import { classificarColeta, resumirAgregado, type ResumoDeAgregado } from "./degradacao";
import { classificarUf, resumirCobertura, type Cobertura } from "./cobertura";

/**
 * A guarda que impede um dia ruim de apagar um dia bom.
 *
 * `dados/agregados.json` é a série temporal do produto: o commit diário É o
 * histórico, e a janela de coleta ("propostas abertas hoje") não é recoletável
 * — o que se perde não volta.
 */

const coberturaCompleta = (ufs: string[]): Cobertura =>
  resumirCobertura(ufs, ufs.map((uf) => classificarUf({ uf, editais: 10 })));

const resumo = (editais: number, municipios: number, ufs: string[]): ResumoDeAgregado => ({
  editais,
  municipios,
  ufs: [...ufs].sort(),
});

describe("resumirAgregado", () => {
  it("mede editais, municípios e UFs representadas", () => {
    expect(
      resumirAgregado({
        municipios: [
          { uf: "PE", editais: 34 },
          { uf: "AL", editais: 18 },
          { uf: "PE", editais: 4 },
        ],
      }),
    ).toEqual({ editais: 56, municipios: 3, ufs: ["AL", "PE"] });
  });

  it("agregado ausente ou vazio não explode — vira zero", () => {
    expect(resumirAgregado(null)).toEqual({ editais: 0, municipios: 0, ufs: [] });
    expect(resumirAgregado({ municipios: [] })).toEqual({ editais: 0, municipios: 0, ufs: [] });
  });

  it("município com zero edital não conta como UF representada", () => {
    expect(resumirAgregado({ municipios: [{ uf: "SE", editais: 0 }] }).ufs).toEqual([]);
  });
});

describe("classificarColeta", () => {
  it("sem agregado anterior, aceita — não há série a proteger", () => {
    const c = classificarColeta({
      cobertura: coberturaCompleta(["PE", "AL"]),
      atual: resumo(150, 63, ["PE", "AL"]),
      anterior: null,
    });
    expect(c.classe).toBe("completa");
    expect(c.preservarAnterior).toBe(false);
  });

  it("coleta igual ou maior, com tudo coletado, é completa", () => {
    const c = classificarColeta({
      cobertura: coberturaCompleta(["PE", "PB", "AL", "RN", "CE", "SE"]),
      atual: resumo(3400, 700, ["PE", "PB", "AL", "RN", "CE", "SE"]),
      anterior: resumo(3312, 690, ["PE", "PB", "AL", "RN", "CE", "SE"]),
    });
    expect(c.classe).toBe("completa");
    expect(c.preservarAnterior).toBe(false);
  });

  it("queda moderada com todas as UFs presentes é parcial ACEITÁVEL — e substitui", () => {
    const cobertura = resumirCobertura(
      ["PE", "PB"],
      [classificarUf({ uf: "PE", editais: 1500, motivo: "timeout" }), classificarUf({ uf: "PB", editais: 1200 })],
    );
    const c = classificarColeta({
      cobertura,
      atual: resumo(2700, 600, ["PE", "PB"]),
      anterior: resumo(3312, 690, ["PE", "PB"]),
    });
    expect(c.classe).toBe("parcial-aceitavel");
    expect(c.preservarAnterior).toBe(false);
  });

  it("volume despencado é degradação, mesmo sem UF perdida", () => {
    const c = classificarColeta({
      cobertura: coberturaCompleta(["PE", "PB"]),
      atual: resumo(300, 40, ["PE", "PB"]),
      anterior: resumo(3312, 690, ["PE", "PB"]),
    });
    expect(c.classe).toBe("degradada");
    expect(c.preservarAnterior).toBe(true);
    expect(c.motivos.join(" ")).toContain("volume caiu");
  });

  it("UF que sumiu é degradação, mesmo com volume total alto", () => {
    const c = classificarColeta({
      cobertura: coberturaCompleta(["PE", "PB"]),
      atual: resumo(3500, 700, ["PE"]),
      anterior: resumo(3312, 690, ["PE", "PB"]),
    });
    expect(c.classe).toBe("degradada");
    expect(c.motivos.join(" ")).toContain("PB");
  });

  it("o limiar de volume é ajustável, e a regra respeita o ajuste", () => {
    const entrada = {
      cobertura: coberturaCompleta(["PE"]),
      atual: resumo(2500, 500, ["PE"]),
      anterior: resumo(3312, 690, ["PE"]),
    };
    // 2500/3312 = 75,5%: passa no limiar padrão de 60%, reprova num de 90%.
    expect(classificarColeta(entrada).classe).not.toBe("degradada");
    expect(classificarColeta({ ...entrada, opcoes: { limiarDeVolume: 0.9 } }).classe).toBe("degradada");
  });
});

/**
 * O caso real: a coleta de 2026-08-13 sobrescreveu a de 12/08 em silêncio.
 *
 * Os números de 13/08 são medidos em `dados/agregados.json`, que é o agregado
 * versionado daquele dia: 150 editais, 63 municípios, só PE e AL. Do dia 12 se
 * sabe o total (3.312 editais nas 6 UFs piloto) — o agregado em si não está no
 * git, porque só o commit de 13/08 tocou o arquivo, e é justamente esse o
 * defeito: o único agregado que restou é o ruim. A distribuição por município
 * de 12/08 é, portanto, sintética; o que este teste exercita é o total e o
 * conjunto de UFs, que são os dois fatos conhecidos.
 */
describe("cenário de 2026-08-13 — o agregado bom não pode ser sobrescrito pelo ruim", () => {
  const cobertura13 = resumirCobertura(
    ["PE", "PB", "AL", "RN", "CE", "SE"],
    [
      classificarUf({ uf: "PE", editais: 100, motivo: "The operation was aborted due to timeout" }),
      classificarUf({ uf: "PB", editais: 0, motivo: "The operation was aborted due to timeout" }),
      classificarUf({ uf: "AL", editais: 50, motivo: "The operation was aborted due to timeout" }),
      classificarUf({ uf: "RN", editais: 0, motivo: "PNCP respondeu 500" }),
      classificarUf({ uf: "CE", editais: 0, motivo: "PNCP respondeu 500" }),
      classificarUf({ uf: "SE", editais: 0, motivo: "The operation was aborted due to timeout" }),
    ],
  );

  const classificacao = classificarColeta({
    cobertura: cobertura13,
    atual: resumo(150, 63, ["PE", "AL"]),
    anterior: resumo(3312, 690, ["PE", "PB", "AL", "RN", "CE", "SE"]),
  });

  it("é degradada e o agregado anterior é preservado", () => {
    expect(classificacao.classe).toBe("degradada");
    expect(classificacao.preservarAnterior).toBe(true);
  });

  it("as duas regras disparam, e o motivo nomeia as UFs perdidas", () => {
    const texto = classificacao.motivos.join(" | ");
    expect(texto).toContain("CE");
    expect(texto).toContain("PB");
    expect(texto).toContain("RN");
    expect(texto).toContain("SE");
    // 150 / 3312 = 4,5% — uma ordem de grandeza abaixo de qualquer limiar.
    expect(texto).toContain("4.5%");
  });

  it("uma segunda rodada ruim no dia seguinte também não passa", () => {
    // O anterior continua sendo o BOM, porque o ruim nunca foi gravado. É esta
    // propriedade que faz a guarda valer para uma sequência de dias ruins.
    const seguinte = classificarColeta({
      cobertura: cobertura13,
      atual: resumo(210, 80, ["PE", "AL"]),
      anterior: resumo(3312, 690, ["PE", "PB", "AL", "RN", "CE", "SE"]),
    });
    expect(seguinte.classe).toBe("degradada");
  });
});
