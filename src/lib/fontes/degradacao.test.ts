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

describe("UF ausente é tolerada, e declarada", () => {
  /** 27 UFs, como a coleta real pede desde 21/08. */
  const TODAS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
    "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
  ];

  /**
   * Uma `Cobertura` completa de verdade — os oito campos.
   *
   * A primeira versão deste helper tinha só quatro, e os testes PASSAVAM: o
   * vitest não checa tipo. Quem reclamou foi o `tsc`. Vale como lembrete de que
   * teste verde e tipo certo são duas garantias diferentes.
   */
  const cobertura = (ufs: string[]): Cobertura => ({
    ufsSolicitadas: TODAS,
    // Via `classificarUf`, e não à mão: é ele que decide completa/parcial/falha
    // no código de produção, e montar `ColetaDeUf` na marra aqui abriria espaço
    // para o teste concordar com uma forma que a produção não gera.
    porUf: TODAS.map((uf) =>
      ufs.includes(uf)
        ? classificarUf({ uf, editais: 1000 })
        : classificarUf({ uf, editais: 0, motivo: "fetch failed" }),
    ),
    ufsCompletas: ufs,
    ufsParciais: [],
    ufsComFalha: TODAS.filter((uf) => !ufs.includes(uf)).map((uf) =>
      classificarUf({ uf, editais: 0, motivo: "fetch failed" }),
    ),
    completa: ufs.length === TODAS.length,
    editaisColetados: ufs.length * 1000,
  });

  function classificarComUfsFora(fora: string[], editaisAtuais = 26000) {
    const presentes = TODAS.filter((uf) => !fora.includes(uf));
    return classificarColeta({
      cobertura: cobertura(presentes),
      atual: { editais: editaisAtuais, municipios: 3900, ufs: presentes },
      anterior: { editais: 28000, municipios: 3900, ufs: TODAS },
    });
  }

  it("deixa o dia passar quando uma UF cai — o caso de 22/08", () => {
    // Nas duas coletas daquele dia caiu uma UF diferente (RR numa, MA na
    // outra), as duas foram recusadas, e o produto ficou sem dado novo por
    // causa de 1 UF em 27. É este o defeito que a regra nova fecha.
    const r = classificarComUfsFora(["MA"]);

    expect(r.classe).not.toBe("degradada");
    expect(r.preservarAnterior).toBe(false);
  });

  it("diz QUAIS praças ficaram de fora", () => {
    // Sem esta lista o e-mail não tem como distinguir "não há edital para você
    // hoje" de "não conseguimos olhar a sua praça hoje".
    expect(classificarComUfsFora(["MA", "RR"]).ufsAusentes).toEqual(["MA", "RR"]);
  });

  it("não inventa ausência quando veio tudo", () => {
    expect(classificarComUfsFora([]).ufsAusentes).toEqual([]);
  });

  it("ainda recusa quando some gente demais — aí não é a fonte, somos nós", () => {
    // Sete de 27 passa do teto de um quarto. Nenhuma instabilidade de PNCP tem
    // esse formato; isso é credencial vencida ou deploy quebrado.
    const r = classificarComUfsFora(["AC", "AL", "AM", "AP", "BA", "CE", "DF"]);

    expect(r.classe).toBe("degradada");
    expect(r.preservarAnterior).toBe(true);
    expect(r.motivos.join(" ")).toMatch(/falha nossa/);
  });

  it("ainda recusa quando o volume despenca, mesmo com todas as UFs presentes", () => {
    // A outra guarda, que mede editais em vez de praças. Um dia em que todas as
    // UFs respondem com quase nada é tão suspeito quanto UFs sumindo.
    const r = classificarComUfsFora([], 900);

    expect(r.classe).toBe("degradada");
    expect(r.preservarAnterior).toBe(true);
  });

  it("registra a ausência mesmo quando recusa", () => {
    // Recusada continua sendo diagnóstico: quem for investigar precisa saber
    // quais praças faltaram, e não só que faltaram.
    const r = classificarComUfsFora(["AC", "AL", "AM", "AP", "BA", "CE", "DF"]);

    expect(r.ufsAusentes).toContain("AC");
    expect(r.ufsAusentes).toHaveLength(7);
  });
});
