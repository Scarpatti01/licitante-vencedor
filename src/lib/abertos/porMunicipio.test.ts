import { describe, expect, it } from "vitest";
import { contarPorMunicipio } from "./porMunicipio";

/**
 * As contagens por cidade, que é o que a página do município afirma no topo.
 *
 * O que estes testes protegem não é aritmética: é a coerência entre o número
 * da cidade e o número da UF, que saem da MESMA execução e são lidos lado a
 * lado por quem navega de uma página para a outra. Um visitante que vê "3
 * novos em Sobral" e depois "1 novo no Ceará" não conclui que houve mudança de
 * régua; conclui que o site erra a conta.
 */

type Fixture = {
  local: { uf: string; municipioSlug: string | null };
  novo?: boolean;
  encerra?: boolean;
};

function e(uf: string, slug: string | null, extra: Omit<Fixture, "local"> = {}): Fixture {
  return { local: { uf, municipioSlug: slug }, ...extra };
}

const REGUAS = {
  ehNovo: (x: Fixture) => x.novo === true,
  encerraLogo: (x: Fixture) => x.encerra === true,
};

describe("contarPorMunicipio", () => {
  it("conta por cidade, e não por UF", () => {
    const r = contarPorMunicipio(
      [e("SP", "santos"), e("SP", "santos"), e("SP", "campinas"), e("CE", "sobral")],
      REGUAS,
    );
    expect(r.map((x) => `${x.uf}/${x.slug}=${x.abertos}`)).toEqual([
      "CE/sobral=1",
      "SP/campinas=1",
      "SP/santos=2",
    ]);
  });

  it("aplica as réguas recebidas, sem reimplementar nenhuma", () => {
    const r = contarPorMunicipio(
      [
        e("SP", "santos", { novo: true }),
        e("SP", "santos", { encerra: true }),
        e("SP", "santos", { novo: true, encerra: true }),
        e("SP", "santos"),
      ],
      REGUAS,
    );
    expect(r[0]).toMatchObject({ abertos: 4, novos: 2, encerramEm24h: 2 });
  });

  it("cidade sem slug não vira linha", () => {
    /*
     * Sem slug não existe página para o número ir. Derivar a chave do nome
     * criaria uma cidade que o agregado não conhece: linha no arquivo que
     * nenhuma página lê, e que ninguém encontraria para conferir.
     */
    const r = contarPorMunicipio([e("SP", null), e("SP", ""), e("SP", "santos")], REGUAS);
    expect(r).toHaveLength(1);
    expect(r[0].slug).toBe("santos");
  });

  it("a UF entra em maiúscula, que é como a página procura", () => {
    // `abertosNoMunicipio` compara com `uf.toUpperCase()`. Gravar "sp" aqui
    // faria a busca falhar em silêncio e o bloco sumir da página inteira.
    const r = contarPorMunicipio([e("sp", "santos")], REGUAS);
    expect(r[0].uf).toBe("SP");
  });

  it("a mesma cidade em grafias diferentes de UF é uma cidade só", () => {
    const r = contarPorMunicipio([e("sp", "santos"), e("SP", "santos")], REGUAS);
    expect(r).toHaveLength(1);
    expect(r[0].abertos).toBe(2);
  });

  it("sem edital aberto, nenhuma linha — e não uma linha com zero", () => {
    /*
     * O zero é o ponto. "0 editais abertos" seria verdade no instante da
     * coleta e mentira duas horas depois, e é o tipo de zero que faz o
     * visitante concluir que o site não tem dado. A ausência da linha faz a
     * leitura devolver `null`, e o bloco não é renderizado.
     */
    expect(contarPorMunicipio([], REGUAS)).toEqual([]);
  });
});
