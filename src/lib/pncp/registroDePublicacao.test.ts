import { describe, expect, it } from "vitest";
import {
  atualizarRegistro,
  estaNoRegistro,
  normalizarRegistro,
  REGISTRO_VAZIO,
  type RegistroDePublicacao,
} from "./registroDePublicacao";
import type { MunicipioAgregado } from "./agregarPorMunicipio";

function municipio(extra: Partial<MunicipioAgregado> = {}): MunicipioAgregado {
  return {
    uf: "CE",
    municipio: "Russas",
    slug: "russas",
    ibge: "2311405",
    editais: 1,
    valor: 100_000,
    orgaos: 1,
    modalidades: {},
    compradores: {},
    ...extra,
  };
}

describe("atualizarRegistro", () => {
  it("adiciona quem tem lastro hoje a um registro vazio", () => {
    const comLastro = municipio({ editais: 7, orgaos: 2 });
    const registro = atualizarRegistro(REGISTRO_VAZIO, [comLastro]);
    expect(registro.municipios).toEqual([{ uf: "CE", slug: "russas" }]);
  });

  it("não adiciona quem não tem lastro hoje", () => {
    const semLastro = municipio({ editais: 1, orgaos: 1 });
    const registro = atualizarRegistro(REGISTRO_VAZIO, [semLastro]);
    expect(registro.municipios).toEqual([]);
  });

  it("nunca remove uma entrada existente, mesmo que hoje não tenha lastro — é o ponto do arquivo", () => {
    // O caso real: Russas teve lastro de 15 a 20/08 e caiu para 1 edital em
    // 21/08. O registro do dia 20 precisa sobreviver à rodada do dia 21.
    const jaRegistrado: RegistroDePublicacao = { municipios: [{ uf: "CE", slug: "russas" }] };
    const semLastroHoje = municipio({ editais: 1, orgaos: 1 });
    const registro = atualizarRegistro(jaRegistrado, [semLastroHoje]);
    expect(registro.municipios).toEqual([{ uf: "CE", slug: "russas" }]);
  });

  it("não duplica quem já está registrado e continua com lastro", () => {
    const jaRegistrado: RegistroDePublicacao = { municipios: [{ uf: "CE", slug: "russas" }] };
    const comLastro = municipio({ editais: 7, orgaos: 2 });
    const registro = atualizarRegistro(jaRegistrado, [comLastro]);
    expect(registro.municipios).toEqual([{ uf: "CE", slug: "russas" }]);
  });

  it("ordena por UF e depois slug, para o arquivo gravado ter diff estável", () => {
    const registro = atualizarRegistro(REGISTRO_VAZIO, [
      municipio({ uf: "PE", slug: "recife", editais: 7, orgaos: 2 }),
      municipio({ uf: "CE", slug: "sobral", editais: 7, orgaos: 2 }),
      municipio({ uf: "CE", slug: "fortaleza", editais: 7, orgaos: 2 }),
    ]);
    expect(registro.municipios).toEqual([
      { uf: "CE", slug: "fortaleza" },
      { uf: "CE", slug: "sobral" },
      { uf: "PE", slug: "recife" },
    ]);
  });
});

describe("estaNoRegistro", () => {
  const registro: RegistroDePublicacao = { municipios: [{ uf: "CE", slug: "russas" }] };

  it("reconhece quem está no registro", () => {
    expect(estaNoRegistro(registro, { uf: "CE", slug: "russas" })).toBe(true);
  });

  it("não confunde slug igual em UF diferente", () => {
    expect(estaNoRegistro(registro, { uf: "PE", slug: "russas" })).toBe(false);
  });

  it("registro vazio não reconhece ninguém", () => {
    expect(estaNoRegistro(REGISTRO_VAZIO, { uf: "CE", slug: "russas" })).toBe(false);
  });
});

describe("normalizarRegistro", () => {
  it("aceita o formato válido", () => {
    const registro = normalizarRegistro({ municipios: [{ uf: "CE", slug: "russas" }] });
    expect(registro.municipios).toEqual([{ uf: "CE", slug: "russas" }]);
  });

  it("entrada malformada é descartada, não derruba o restante", () => {
    const registro = normalizarRegistro({
      municipios: [{ uf: "CE", slug: "russas" }, { uf: "CE" }, { slug: "sem-uf" }, null, "texto"],
    });
    expect(registro.municipios).toEqual([{ uf: "CE", slug: "russas" }]);
  });

  it("arquivo ausente ou vazio vira registro vazio, nunca erro", () => {
    expect(normalizarRegistro(undefined)).toEqual(REGISTRO_VAZIO);
    expect(normalizarRegistro(null)).toEqual(REGISTRO_VAZIO);
    expect(normalizarRegistro({})).toEqual(REGISTRO_VAZIO);
    expect(normalizarRegistro({ municipios: "não é lista" })).toEqual(REGISTRO_VAZIO);
  });
});
