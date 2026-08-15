import { describe, expect, it } from "vitest";
import { buscarPracas, normalizarParaBusca, type PracaBuscavel } from "./busca-de-pracas";

function praca(nome: string, uf: string, estado: string): PracaBuscavel {
  return {
    nome,
    uf,
    href: `/licitacoes/${uf.toLowerCase()}/${normalizarParaBusca(nome).replace(/ /g, "-")}/`,
    busca: normalizarParaBusca(`${nome} ${uf} ${estado}`),
  };
}

/*
 * Praças reais do agregado, e na ordem que o servidor manda (volume
 * decrescente). A ordem importa em vários testes abaixo — ela é o critério de
 * desempate, então usar nomes inventados esconderia os casos que de fato
 * apareceram.
 */
const PRACAS = [
  praca("Fortaleza", "CE", "Ceará"),
  praca("Recife", "PE", "Pernambuco"),
  praca("Aracaju", "SE", "Sergipe"),
  praca("Petrolina", "PE", "Pernambuco"),
  praca("Juazeiro do Norte", "CE", "Ceará"),
  praca("São José do Egito", "PE", "Pernambuco"),
  praca("Sobral", "CE", "Ceará"),
  praca("Campos Sales", "CE", "Ceará"),
  praca("Pesqueira", "PE", "Pernambuco"),
];

const nomes = (lista: PracaBuscavel[]) => lista.map((p) => p.nome);

describe("normalizarParaBusca", () => {
  it("tira acento, caixa e pontuação", () => {
    expect(normalizarParaBusca("São José do Egito")).toBe("sao jose do egito");
    expect(normalizarParaBusca("  MACEIÓ/AL  ")).toBe("maceio al");
  });
});

describe("buscarPracas", () => {
  it("acha a cidade pelo começo do nome", () => {
    expect(nomes(buscarPracas(PRACAS, "forta"))).toEqual(["Fortaleza"]);
  });

  /*
   * Quem digita no celular quase nunca acentua. Se a busca exigisse o acento,
   * "sao jose" não acharia "São José do Egito" — e o visitante concluiria que a
   * praça não existe, não que ele escreveu diferente.
   */
  it("acha sem acento e sem caixa", () => {
    expect(nomes(buscarPracas(PRACAS, "sao jose"))).toEqual(["São José do Egito"]);
    expect(nomes(buscarPracas(PRACAS, "JUAZEIRO"))).toEqual(["Juazeiro do Norte"]);
  });

  it("acha por palavra do meio do nome", () => {
    // "Egito" e "Norte" são o que a pessoa lembra desses dois nomes compostos.
    expect(nomes(buscarPracas(PRACAS, "egito"))).toEqual(["São José do Egito"]);
    expect(nomes(buscarPracas(PRACAS, "norte"))).toEqual(["Juazeiro do Norte"]);
  });

  it("busca por sigla de estado devolve as praças daquele estado", () => {
    expect(nomes(buscarPracas(PRACAS, "CE"))).toEqual([
      "Fortaleza",
      "Juazeiro do Norte",
      "Sobral",
      "Campos Sales",
    ]);
  });

  /**
   * Mesmo CONJUNTO, e de propósito em ordem diferente.
   *
   * Este teste começou exigindo arrays idênticos e falhou — mostrando que as
   * duas consultas não são a mesma pergunta:
   *
   *   `"pe"` é ambíguo. Pode ser o estado ou o começo de "Petrolina". As duas
   *   cidades que começam por "pe" sobem, porque quem digitou pode estar
   *   procurando exatamente uma delas.
   *
   *   `"pernambuco"` não é ambíguo. Ninguém digita o nome do estado por inteiro
   *   querendo uma cidade específica, então a ordem cai para volume e Recife
   *   — a maior praça do estado — vem primeiro.
   *
   * O que precisa ser igual é a COBERTURA: nenhuma praça pernambucana pode
   * aparecer por um caminho e sumir pelo outro.
   */
  it("sigla e nome por extenso alcançam exatamente as mesmas praças", () => {
    const porSigla = new Set(nomes(buscarPracas(PRACAS, "PE")));
    const porExtenso = new Set(nomes(buscarPracas(PRACAS, "pernambuco")));

    expect(porExtenso).toEqual(porSigla);
    expect(porSigla).toEqual(
      new Set(["Recife", "Petrolina", "São José do Egito", "Pesqueira"]),
    );
  });

  it("o nome do estado por extenso ordena por volume", () => {
    expect(nomes(buscarPracas(PRACAS, "pernambuco"))[0]).toBe("Recife");
  });

  /**
   * O caso que motivou a função de relevância, e ele é real.
   *
   * **Petrolina** e **Pesqueira** são praças de **PE** cujo nome começa com a
   * própria sigla do estado — as duas saíram do agregado, não da imaginação.
   * Digitando "pe", a consulta casa TODAS as praças pernambucanas (pela sigla e
   * por "pernambuco"), e Recife tem quase quinze vezes mais contratações que
   * Petrolina.
   *
   * Sem relevância, a ordem por volume mandaria Recife primeiro e quem digitou
   * "Petrolina" veria a cidade errada no topo. Quem digita o nome de uma cidade
   * quer aquela cidade em primeiro lugar, por menor que ela seja.
   */
  it("o nome que começa com a consulta vence o volume de quem casou pela UF", () => {
    const resultado = nomes(buscarPracas(PRACAS, "pe"));

    expect(resultado.slice(0, 2)).toEqual(["Petrolina", "Pesqueira"]);
    // Recife casa só pela UF, e tem mais contratações que as duas somadas.
    expect(resultado.indexOf("Recife")).toBeGreaterThan(1);
  });

  it("o nome exato vem em primeiro", () => {
    expect(buscarPracas(PRACAS, "sobral")[0].nome).toBe("Sobral");
    expect(buscarPracas(PRACAS, "recife")[0].nome).toBe("Recife");
  });

  /*
   * `includes` casaria "ar" com Fort**ale**za? Não — mas casaria "aca" com
   * "Aracaju" pelo meio da palavra, e "ale" com "Fortaleza". Prefixo por palavra
   * é o que impede a lista de virar ruído a cada tecla.
   */
  it("não casa pedaço do meio de uma palavra", () => {
    expect(buscarPracas(PRACAS, "aleza")).toEqual([]);
    expect(buscarPracas(PRACAS, "cife")).toEqual([]);
  });

  it("todos os termos precisam casar", () => {
    // "campos" casa Campos Sales; "campos recife" não pode casar nada.
    expect(nomes(buscarPracas(PRACAS, "campos"))).toEqual(["Campos Sales"]);
    expect(buscarPracas(PRACAS, "campos recife")).toEqual([]);
  });

  /**
   * O vazio precisa ser vazio de verdade.
   *
   * A tentação é devolver "o mais parecido" quando nada casa. Seria pior:
   * quem digita "Campinas" — que não é praça medida — receberia uma cidade
   * qualquer e poderia clicar sem perceber a troca. Melhor não achar nada e
   * explicar por quê, que é o que o componente faz.
   */
  it("cidade fora da cobertura não devolve resultado nenhum", () => {
    expect(buscarPracas(PRACAS, "Campinas")).toEqual([]);
    expect(buscarPracas(PRACAS, "São Paulo")).toEqual([]);
  });

  /*
   * Consulta vazia devolve vazio, e não a lista inteira: um painel que abre com
   * 96 sugestões antes de a pessoa digitar é ruído, e o lugar de ver tudo é o
   * acordeão.
   */
  it("consulta vazia ou só espaço não devolve nada", () => {
    expect(buscarPracas(PRACAS, "")).toEqual([]);
    expect(buscarPracas(PRACAS, "   ")).toEqual([]);
    expect(buscarPracas(PRACAS, "///")).toEqual([]);
  });

  it("respeita o limite pedido", () => {
    expect(buscarPracas(PRACAS, "CE", 2)).toHaveLength(2);
  });

  it("preserva a ordem da fonte no empate de relevância", () => {
    // Fortaleza, Juazeiro, Sobral e Campos Sales casam todos só pela UF; a ordem
    // tem de ser a que o servidor mandou (volume decrescente).
    expect(nomes(buscarPracas(PRACAS, "ceara"))).toEqual([
      "Fortaleza",
      "Juazeiro do Norte",
      "Sobral",
      "Campos Sales",
    ]);
  });
});
