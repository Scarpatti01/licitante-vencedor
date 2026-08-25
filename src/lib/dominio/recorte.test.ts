import { describe, expect, it } from "vitest";

import {
  abrangenciaAceita,
  chaveDaAbrangencia,
  conferirConjunto,
  conferirRecorte,
  descreverAbrangencia,
  excluidasEfetivas,
  LIMITE_DE_RECORTES,
  palavrasEfetivas,
  SCORE_MINIMO_NO_BRASIL,
  type Abrangencia,
  type Recorte,
} from "./recorte.ts";
import type { Edital } from "../fontes/tipos.ts";

const editalEm = (uf: string, codigoIbge: string) =>
  ({ local: { uf, codigoIbge, municipio: "Qualquer" } }) as unknown as Edital;

const recorte = (parcial: Partial<Recorte> = {}): Recorte => ({
  id: "r1",
  nome: "Minha cidade",
  abrangencia: { tipo: "municipio", uf: "CE", codigoIbge: "2304400", nome: "Fortaleza" },
  palavrasChave: [],
  palavrasExcluidas: [],
  ticketMinimo: null,
  ticketMaximo: null,
  ...parcial,
});

describe("abrangenciaAceita", () => {
  const fortaleza = editalEm("CE", "2304400");
  const sobral = editalEm("CE", "2312908");
  const recife = editalEm("PE", "2611606");

  it("município aceita só aquele município", () => {
    const a: Abrangencia = { tipo: "municipio", uf: "CE", codigoIbge: "2304400", nome: "Fortaleza" };
    expect(abrangenciaAceita(a, fortaleza)).toBe(true);
    // Mesmo estado, outro município: fora. É o ponto do recorte municipal.
    expect(abrangenciaAceita(a, sobral)).toBe(false);
    expect(abrangenciaAceita(a, recife)).toBe(false);
  });

  it("UF aceita qualquer município do estado", () => {
    const a: Abrangencia = { tipo: "uf", uf: "CE" };
    expect(abrangenciaAceita(a, fortaleza)).toBe(true);
    expect(abrangenciaAceita(a, sobral)).toBe(true);
    expect(abrangenciaAceita(a, recife)).toBe(false);
  });

  it("Brasil aceita tudo", () => {
    const a: Abrangencia = { tipo: "brasil" };
    expect(abrangenciaAceita(a, fortaleza)).toBe(true);
    expect(abrangenciaAceita(a, recife)).toBe(true);
  });
});

describe("palavras herdadas do perfil", () => {
  const perfil = { palavrasChave: ["pavimentação"], palavrasExcluidas: ["merenda"] };

  it("usa as do recorte quando ele declarou", () => {
    expect(palavrasEfetivas({ palavrasChave: ["drenagem"] }, perfil)).toEqual(["drenagem"]);
    expect(excluidasEfetivas({ palavrasExcluidas: ["limpeza"] }, perfil)).toEqual(["limpeza"]);
  });

  it("herda as do perfil quando o recorte não declarou", () => {
    // Recorte estadual sem palavra nenhuma entregaria merenda escolar para uma
    // empresa de pavimentação, e o cliente concluiria que o filtro não funciona.
    expect(palavrasEfetivas({ palavrasChave: [] }, perfil)).toEqual(["pavimentação"]);
    expect(excluidasEfetivas({ palavrasExcluidas: [] }, perfil)).toEqual(["merenda"]);
  });
});

describe("conferirRecorte", () => {
  it("aprova um recorte bem formado", () => {
    expect(conferirRecorte(recorte())).toEqual([]);
  });

  it("cobra nome, porque é por ele que o cliente reconhece o alerta", () => {
    expect(conferirRecorte(recorte({ nome: "   " })).map((f) => f.campo)).toEqual(["nome"]);
  });

  it("recusa sigla de estado inválida", () => {
    expect(
      conferirRecorte(recorte({ abrangencia: { tipo: "uf", uf: "Ceará" } })).map((f) => f.campo),
    ).toEqual(["abrangencia"]);
  });

  it("recusa município sem código IBGE de sete dígitos", () => {
    const r = recorte({
      abrangencia: { tipo: "municipio", uf: "CE", codigoIbge: "230440", nome: "Fortaleza" },
    });
    expect(conferirRecorte(r).map((f) => f.campo)).toEqual(["abrangencia"]);
  });

  it("recusa faixa de valor invertida, que não deixaria nada passar", () => {
    const r = recorte({ ticketMinimo: 500_000, ticketMaximo: 100_000 });
    expect(conferirRecorte(r).map((f) => f.campo)).toEqual(["ticket"]);
  });

  it("aceita faixa aberta de um lado só", () => {
    expect(conferirRecorte(recorte({ ticketMinimo: 500_000, ticketMaximo: null }))).toEqual([]);
    expect(conferirRecorte(recorte({ ticketMinimo: null, ticketMaximo: 100_000 }))).toEqual([]);
  });

  it("recusa valor negativo", () => {
    expect(conferirRecorte(recorte({ ticketMinimo: -1 })).map((f) => f.campo)).toEqual(["ticket"]);
  });

  it("Brasil não precisa de UF nem de município", () => {
    expect(conferirRecorte(recorte({ abrangencia: { tipo: "brasil" } }))).toEqual([]);
  });
});

describe("conferirConjunto", () => {
  const comAbrangencia = (a: Abrangencia, id: string) => recorte({ id, abrangencia: a });

  it("aceita o limite cheio", () => {
    const tres = [
      comAbrangencia({ tipo: "municipio", uf: "CE", codigoIbge: "2304400", nome: "Fortaleza" }, "1"),
      comAbrangencia({ tipo: "uf", uf: "CE" }, "2"),
      comAbrangencia({ tipo: "brasil" }, "3"),
    ];
    expect(tres.length).toBe(LIMITE_DE_RECORTES);
    expect(conferirConjunto(tres)).toEqual([]);
  });

  it("recusa acima do limite", () => {
    const quatro = [
      comAbrangencia({ tipo: "uf", uf: "CE" }, "1"),
      comAbrangencia({ tipo: "uf", uf: "PE" }, "2"),
      comAbrangencia({ tipo: "uf", uf: "PB" }, "3"),
      comAbrangencia({ tipo: "uf", uf: "RN" }, "4"),
    ];
    expect(conferirConjunto(quatro).map((f) => f.campo)).toContain("quantidade");
  });

  it("recusa dois recortes cobrindo a mesma coisa", () => {
    // Dobra o custo de avaliação e entrega o mesmo edital duas vezes no mesmo
    // e-mail. Não é erro de digitação inofensivo.
    const repetido = [
      comAbrangencia({ tipo: "uf", uf: "CE" }, "1"),
      comAbrangencia({ tipo: "uf", uf: "CE" }, "2"),
    ];
    expect(conferirConjunto(repetido).map((f) => f.campo)).toContain("abrangencia");
  });

  it("não confunde municípios diferentes do mesmo estado", () => {
    const dois = [
      comAbrangencia({ tipo: "municipio", uf: "CE", codigoIbge: "2304400", nome: "Fortaleza" }, "1"),
      comAbrangencia({ tipo: "municipio", uf: "CE", codigoIbge: "2312908", nome: "Sobral" }, "2"),
    ];
    expect(conferirConjunto(dois)).toEqual([]);
  });

  it("aceita conjunto vazio: empresa que ainda não configurou não está errada", () => {
    expect(conferirConjunto([])).toEqual([]);
  });
});

describe("chaveDaAbrangencia", () => {
  it("distingue município, UF e Brasil sem colidir", () => {
    const chaves = [
      chaveDaAbrangencia({ tipo: "brasil" }),
      chaveDaAbrangencia({ tipo: "uf", uf: "CE" }),
      chaveDaAbrangencia({ tipo: "municipio", uf: "CE", codigoIbge: "2304400", nome: "Fortaleza" }),
    ];
    expect(new Set(chaves).size).toBe(3);
  });
});

describe("descreverAbrangencia", () => {
  it("diz o nome do município, não o código", () => {
    expect(
      descreverAbrangencia({ tipo: "municipio", uf: "CE", codigoIbge: "2304400", nome: "Fortaleza" }),
    ).toBe("Fortaleza (CE)");
  });
});

describe("as constantes que sustentam a conta de custo", () => {
  it("o corte do Brasil reaproveita a faixa 'boa' do score, em vez de inventar número", () => {
    // Se `score.ts` mudar a faixa, este teste é o lembrete de que o produto
    // passou a ter dois conceitos de "bom o bastante".
    expect(SCORE_MINIMO_NO_BRASIL).toBe(70);
  });
});
