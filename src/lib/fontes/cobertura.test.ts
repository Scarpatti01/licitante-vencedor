import { describe, expect, it } from "vitest";
import { classificarUf, editaisPorUf, resumirCobertura } from "./cobertura";
import { auditar, relatorioEmTexto } from "../pncp/auditoria";
import { edital } from "./fixtures";

/**
 * O defeito que estes testes travam: cobertura declarada como booleana por UF.
 *
 * Uma UF interrompida DEPOIS de entregar editais entrava como falha total, e o
 * relatório negava justamente as UFs que sustentavam os números publicados.
 */

describe("classificarUf — os três estados", () => {
  it("sem motivo de parada, terminou inteira", () => {
    expect(classificarUf({ uf: "PB", editais: 412 })).toEqual({
      uf: "PB",
      estado: "completa",
      editais: 412,
      motivo: null,
    });
  });

  it("com motivo e com editais, é PARCIAL — e o quanto entrou fica registrado", () => {
    const r = classificarUf({ uf: "PE", editais: 100, motivo: "The operation was aborted due to timeout" });
    expect(r.estado).toBe("parcial");
    expect(r.editais).toBe(100);
    expect(r.motivo).toBe("The operation was aborted due to timeout");
  });

  it("com motivo e sem nada entregue, é falha total", () => {
    expect(classificarUf({ uf: "RN", editais: 0, motivo: "PNCP respondeu 500" }).estado).toBe("falha");
  });

  it("um edital entregue já basta para não ser falha", () => {
    expect(classificarUf({ uf: "SE", editais: 1, motivo: "timeout" }).estado).toBe("parcial");
  });
});

describe("resumirCobertura", () => {
  it("UF solicitada que nunca rodou entra como falha declarada, não some da lista", () => {
    const c = resumirCobertura(["PE", "PB", "AL"], [classificarUf({ uf: "PE", editais: 10 })]);
    expect(c.porUf).toHaveLength(3);
    expect(c.ufsComFalha.map((f) => f.uf)).toEqual(["PB", "AL"]);
    expect(c.ufsComFalha[0].motivo).toBe("não coletada nesta rodada");
  });

  it("só é completa quando TODAS terminaram inteiras", () => {
    const todas = resumirCobertura(
      ["PE", "PB"],
      [classificarUf({ uf: "PE", editais: 10 }), classificarUf({ uf: "PB", editais: 20 })],
    );
    expect(todas.completa).toBe(true);
    expect(todas.editaisColetados).toBe(30);

    const umaParcial = resumirCobertura(
      ["PE", "PB"],
      [classificarUf({ uf: "PE", editais: 10, motivo: "timeout" }), classificarUf({ uf: "PB", editais: 20 })],
    );
    expect(umaParcial.completa).toBe(false);
    // O parcial CONTA nos números — o dado dele está no snapshot.
    expect(umaParcial.editaisColetados).toBe(30);
  });

  it("editaisPorUf devolve o que entrou por UF", () => {
    const c = resumirCobertura(
      ["PE", "AL", "CE"],
      [
        classificarUf({ uf: "PE", editais: 100, motivo: "timeout" }),
        classificarUf({ uf: "AL", editais: 50, motivo: "timeout" }),
        classificarUf({ uf: "CE", editais: 0, motivo: "500" }),
      ],
    );
    expect(editaisPorUf(c)).toEqual({ PE: 100, AL: 50, CE: 0 });
  });
});

/**
 * O caso real de 2026-08-13, reproduzido com os números medidos.
 *
 * Medido em `dados/agregados.json` (o agregado versionado daquele dia): 150
 * editais, 63 municípios, PE com 100 e AL com 50 — e `ufsColetadas: []`. As 6
 * UFs foram interrompidas no meio; 4 sem entregar nada, PE e AL entregando os
 * 150 que o relatório publicou como se não existissem.
 */
describe("cenário de 2026-08-13", () => {
  const cobertura = resumirCobertura(
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

  it("PE e AL são parciais, não falhas", () => {
    expect(cobertura.ufsParciais.map((p) => p.uf)).toEqual(["PE", "AL"]);
    expect(cobertura.ufsComFalha.map((f) => f.uf)).toEqual(["PB", "RN", "CE", "SE"]);
    expect(cobertura.ufsCompletas).toEqual([]);
    expect(cobertura.editaisColetados).toBe(150);
  });

  it("o relatório NÃO repete a afirmação falsa de que PE e AL não estão nos números", () => {
    const auditoria = auditar(
      Array.from({ length: 150 }, (_, i) => edital({ id: `edital-${i}` })),
      "2026-08-13T07:49:55.338Z",
    );
    const texto = relatorioEmTexto(auditoria, cobertura);

    // O texto publicado em dados/revisao.md dizia "6 não puderam ser coletadas
    // ... e não estão representadas nos números abaixo", listando PE e AL.
    const semColeta = texto.slice(texto.indexOf("Sem coleta"));
    expect(semColeta).not.toContain("PE:");
    expect(semColeta).not.toContain("AL:");

    // E diz, com todas as letras, o que cada uma entregou antes de parar.
    expect(texto).toContain("PE: 100 editais coletados, interrompida");
    expect(texto).toContain("AL: 50 editais coletados, interrompida");
    expect(texto).toContain("Os 150 editais revisados vêm de PE, AL.");
  });

  it("a declaração de cobertura vem antes dos números que ela qualifica", () => {
    const auditoria = auditar([edital()], "2026-08-13T07:49:55.338Z");
    const texto = relatorioEmTexto(auditoria, cobertura);
    expect(texto.indexOf("cobertura incompleta")).toBeLessThan(texto.indexOf("editais têm valor"));
  });

  it("o texto publicado concorda em número — é página pública, não log", () => {
    const uma = resumirCobertura(
      ["PE", "AL"],
      [classificarUf({ uf: "PE", editais: 1, motivo: "timeout" }), classificarUf({ uf: "AL", editais: 5 })],
    );
    const texto = relatorioEmTexto(auditar([edital()], "2026-08-13T07:49:55.338Z"), uma);
    expect(texto).toContain("1 foi coletada por inteiro");
    expect(texto).toContain("1 ficou parcial");
    expect(texto).toContain("0 não trouxeram nada");
    expect(texto).toContain("PE: 1 edital coletado, interrompida");
  });

  it("cobertura completa não gera aviso nenhum", () => {
    const completa = resumirCobertura(
      ["PE", "AL"],
      [classificarUf({ uf: "PE", editais: 100 }), classificarUf({ uf: "AL", editais: 50 })],
    );
    const texto = relatorioEmTexto(auditar([edital()], "2026-08-13T07:49:55.338Z"), completa);
    expect(texto).not.toContain("cobertura incompleta");
  });
});
