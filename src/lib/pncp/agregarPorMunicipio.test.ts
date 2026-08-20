import { describe, expect, it } from "vitest";
import { agregarPorMunicipio } from "./agregarPorMunicipio";
import { edital } from "../fontes/fixtures";

describe("agregarPorMunicipio", () => {
  it("agrupa por uf/municipioSlug, não por nome do município", () => {
    const r = agregarPorMunicipio([
      edital(),
      edital({ id: "2", local: { uf: "PE", municipio: "Limoeiro", municipioSlug: "limoeiro", codigoIbge: "2608909" } }),
      edital({
        id: "3",
        local: { uf: "CE", municipio: "Sobral", municipioSlug: "sobral", codigoIbge: "2312908" },
      }),
    ]);

    expect(r).toHaveLength(2);
    const limoeiro = r.find((m) => m.slug === "limoeiro")!;
    expect(limoeiro.editais).toBe(2);
  });

  it("soma o valor estimado, e pula o que está marcado como suspeito", () => {
    const r = agregarPorMunicipio([
      edital({ valorEstimado: 100_000 }),
      edital({ id: "2", valorEstimado: 999_999_999, valorSuspeito: true }),
    ]);
    expect(r[0].valor).toBe(100_000);
  });

  it("conta modalidades separadamente", () => {
    const r = agregarPorMunicipio([
      edital({ modalidade: "Pregão - Eletrônico" }),
      edital({ id: "2", modalidade: "Pregão - Eletrônico" }),
      edital({ id: "3", modalidade: "Dispensa" }),
    ]);
    expect(r[0].modalidades).toEqual({ "Pregão - Eletrônico": 2, Dispensa: 1 });
  });

  it("agrupa compradores por CNPJ, guardando o nome e contando as contratações", () => {
    const r = agregarPorMunicipio([
      edital({ orgao: { cnpj: "11097292000149", nome: "MUNICIPIO DE LIMOEIRO", esfera: "municipal" } }),
      edital({
        id: "2",
        orgao: { cnpj: "11097292000149", nome: "MUNICIPIO DE LIMOEIRO", esfera: "municipal" },
      }),
      edital({
        id: "3",
        orgao: { cnpj: "22000000000199", nome: "SECRETARIA DE SAUDE", esfera: "municipal" },
      }),
    ]);

    expect(r[0].orgaos).toBe(2);
    expect(r[0].compradores).toEqual({
      "11097292000149": { nome: "MUNICIPIO DE LIMOEIRO", editais: 2 },
      "22000000000199": { nome: "SECRETARIA DE SAUDE", editais: 1 },
    });
  });

  it("não funde dois compradores diferentes que por acaso têm o mesmo nome", () => {
    const r = agregarPorMunicipio([
      edital({ orgao: { cnpj: "11097292000149", nome: "SECRETARIA MUNICIPAL", esfera: "municipal" } }),
      edital({
        id: "2",
        orgao: { cnpj: "22000000000199", nome: "SECRETARIA MUNICIPAL", esfera: "municipal" },
      }),
    ]);

    expect(r[0].orgaos).toBe(2);
    expect(Object.keys(r[0].compradores)).toHaveLength(2);
  });

  it("ordena os municípios do maior para o menor volume", () => {
    const r = agregarPorMunicipio([
      edital(),
      edital({
        id: "2",
        local: { uf: "CE", municipio: "Sobral", municipioSlug: "sobral", codigoIbge: "2312908" },
      }),
      edital({
        id: "3",
        local: { uf: "CE", municipio: "Sobral", municipioSlug: "sobral", codigoIbge: "2312908" },
      }),
    ]);
    expect(r.map((m) => m.slug)).toEqual(["sobral", "limoeiro"]);
  });

  it("devolve lista vazia para lista de editais vazia", () => {
    expect(agregarPorMunicipio([])).toEqual([]);
  });
});
