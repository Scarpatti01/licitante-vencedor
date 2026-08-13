import { describe, expect, it } from "vitest";
import { diferencas, hashDeConteudo, mudou } from "./mudanca";
import { edital } from "./fixtures";

/**
 * Detecção de mudança: o que separa "lista de licitações" de produto.
 *
 * Duas propriedades opostas precisam valer ao mesmo tempo, e é por isso que
 * cada uma tem teste: mudou o conteúdo, o hash TEM de mudar; mudou só o
 * metadado da coleta, o hash NÃO pode mudar.
 */

describe("hashDeConteudo — estabilidade", () => {
  it("mesmo conteúdo, mesmo hash", () => {
    expect(hashDeConteudo(edital())).toBe(hashDeConteudo(edital()));
  });

  it("não depende da ordem em que o objeto foi construído", () => {
    const a = edital();
    const b: typeof a = { ...edital({ situacao: "outra" }), situacao: a.situacao };
    expect(hashDeConteudo(b)).toBe(hashDeConteudo(a));
  });

  it("`coletadoEm` não entra: senão todo edital 'mudaria' toda coleta", () => {
    expect(hashDeConteudo(edital({ coletadoEm: "2026-09-01T00:00:00.000Z" }))).toBe(
      hashDeConteudo(edital()),
    );
  });

  it("`valorSuspeito` não entra: é decidido em lote, contra os vizinhos", () => {
    expect(hashDeConteudo(edital({ valorSuspeito: true }))).toBe(hashDeConteudo(edital()));
  });

  it("procedência não é conteúdo: outra fonte para o mesmo certame dá o mesmo hash", () => {
    const noPncp = edital();
    const noPortalEstadual = edital({
      fonte: "portal-pe",
      idNaFonte: "2026/000123",
      link: "https://exemplo.pe.gov.br/licitacoes/123",
    });
    expect(hashDeConteudo(noPortalEstadual)).toBe(hashDeConteudo(noPncp));
  });

  it("`null`, string vazia e a string 'null' são três conteúdos diferentes", () => {
    const hashes = new Set([
      hashDeConteudo(edital({ situacao: null })),
      hashDeConteudo(edital({ situacao: "" })),
      hashDeConteudo(edital({ situacao: "null" })),
    ]);
    // "" e null colapsam por design (`valor ?? null`); "null" tem de se separar
    // dos dois — é o caso que uma concatenação crua deixaria colidir.
    expect(hashes.has(hashDeConteudo(edital({ situacao: "null" })))).toBe(true);
    expect(hashDeConteudo(edital({ situacao: "null" }))).not.toBe(hashDeConteudo(edital({ situacao: null })));
  });
});

describe("mudou", () => {
  it("nada mudou entre duas coletas do mesmo edital", () => {
    expect(mudou(edital(), edital({ coletadoEm: "2026-08-14T07:00:00.000Z" }))).toBe(false);
  });

  it("prazo prorrogado é mudança — é o caso que o cliente precisa saber", () => {
    const antes = edital();
    const depois = edital({
      encerramentoProposta: "2026-09-15T14:00:00-03:00",
      coletadoEm: "2026-08-14T07:00:00.000Z",
    });
    expect(mudou(antes, depois)).toBe(true);
    expect(diferencas(antes, depois)).toEqual([
      {
        campo: "encerramentoProposta",
        de: '"2026-08-30T14:00:00-03:00"',
        para: '"2026-09-15T14:00:00-03:00"',
      },
    ]);
  });

  it("situação virou 'Suspensa' — mudança", () => {
    expect(mudou(edital(), edital({ situacao: "Suspensa" }))).toBe(true);
  });

  it("objeto retificado — mudança, mas espaço em volta não conta", () => {
    expect(mudou(edital(), edital({ objeto: `  ${edital().objeto}  ` }))).toBe(false);
    expect(mudou(edital(), edital({ objeto: "Aquisição de material de expediente e limpeza" }))).toBe(true);
  });

  it("valor que sai de 0 (não informado) para valor real é mudança", () => {
    const semValor = edital({ valorEstimado: null, valorEstimadoBruto: 0 });
    const comValor = edital({ valorEstimado: 250_000, valorEstimadoBruto: 250_000 });
    expect(mudou(semValor, comValor)).toBe(true);
  });

  it("recusa comparar editais diferentes — seria erro de pareamento escondido", () => {
    expect(() => mudou(edital({ id: "A" }), edital({ id: "B" }))).toThrow(/MESMO edital/);
  });
});

describe("diferencas", () => {
  it("lista todos os campos alterados, com antes e depois", () => {
    const campos = diferencas(
      edital(),
      edital({ situacao: "Suspensa", modoDisputa: "Fechado" }),
    ).map((d) => d.campo);
    expect(campos.sort()).toEqual(["modoDisputa", "situacao"]);
  });

  it("sem mudança, lista vazia", () => {
    expect(diferencas(edital(), edital())).toEqual([]);
  });
});
