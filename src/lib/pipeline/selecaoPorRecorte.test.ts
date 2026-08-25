import { describe, expect, it } from "vitest";

import {
  entregaveis,
  exigePalavraAntesDeAvaliar,
  paraAvaliar,
  paraAvaliarNoRecorte,
  paraAvaliarDaEmpresa,
  type Pontuado,
} from "./selecaoPorRecorte.ts";
import { SCORE_MINIMO_NO_BRASIL, TETO_DIARIO_POR_RECORTE, type Recorte } from "../dominio/recorte.ts";
import type { Edital } from "../fontes/tipos.ts";

const edital = (id: string, uf: string, ibge: string, objeto: string) =>
  ({ id, objeto, local: { uf, codigoIbge: ibge, municipio: "X", municipioSlug: "x" } }) as unknown as Edital;

const recorte = (id: string, parcial: Partial<Recorte> = {}): Recorte => ({
  id,
  nome: id,
  abrangencia: { tipo: "municipio", uf: "CE", codigoIbge: "2304400", nome: "Fortaleza" },
  palavrasChave: [],
  palavrasExcluidas: [],
  ticketMinimo: null,
  ticketMaximo: null,
  ...parcial,
});

const PERFIL = { palavrasChave: ["pavimentação"], palavrasExcluidas: ["merenda"] };

const FORTALEZA_ASFALTO = edital("1", "CE", "2304400", "Pavimentação asfáltica de vias urbanas");
const FORTALEZA_MERENDA = edital("2", "CE", "2304400", "Aquisição de merenda escolar");
const SOBRAL_ASFALTO = edital("3", "CE", "2312908", "Pavimentação de estrada vicinal");
const RECIFE_ASFALTO = edital("4", "PE", "2611606", "Pavimentação de praça");
const RECIFE_MOVEIS = edital("5", "PE", "2611606", "Aquisição de mobiliário de escritório");

const TODOS = [FORTALEZA_ASFALTO, FORTALEZA_MERENDA, SOBRAL_ASFALTO, RECIFE_ASFALTO, RECIFE_MOVEIS];

describe("exigePalavraAntesDeAvaliar", () => {
  it("só o recorte nacional exige", () => {
    expect(exigePalavraAntesDeAvaliar(recorte("a", { abrangencia: { tipo: "brasil" } }))).toBe(true);
    expect(exigePalavraAntesDeAvaliar(recorte("b", { abrangencia: { tipo: "uf", uf: "CE" } }))).toBe(
      false,
    );
    expect(exigePalavraAntesDeAvaliar(recorte("c"))).toBe(false);
  });
});

describe("paraAvaliarNoRecorte", () => {
  it("município avalia TUDO da cidade, mesmo o que não casa com as palavras", () => {
    /*
     * Este é o ponto do recorte municipal, e é deliberadamente caro: dentro da
     * cidade do cliente, gastamos a avaliação para poder responder "por que
     * este não apareceu para mim?". É o território que ele conhece de cor, e é
     * onde ele mais pergunta.
     */
    const r = recorte("cidade");
    const ids = paraAvaliarNoRecorte(TODOS, r, PERFIL).map((e) => e.id);
    expect(ids).toContain("1"); // casa com "pavimentação"
    expect(ids).not.toContain("2"); // "merenda" está excluída pelo cliente
    expect(ids).not.toContain("3"); // outra cidade
  });

  it("a exclusão vale mesmo onde a palavra-chave não é exigida", () => {
    // Desobedecer à exclusão para poder explicar melhor depois seria explicar
    // bem uma entrega que o cliente já pediu para não receber.
    const r = recorte("cidade");
    expect(paraAvaliarNoRecorte([FORTALEZA_MERENDA], r, PERFIL)).toEqual([]);
  });

  it("UF avalia tudo do estado", () => {
    const r = recorte("estado", { abrangencia: { tipo: "uf", uf: "CE" } });
    const ids = paraAvaliarNoRecorte(TODOS, r, PERFIL).map((e) => e.id);
    expect(ids.sort()).toEqual(["1", "3"]);
  });

  it("Brasil exige palavra no objeto ANTES de avaliar", () => {
    // Sem isto são 2.725 editais por dia e uns 646 MB por ano, para um cliente
    // de R$ 59.
    const r = recorte("brasil", { abrangencia: { tipo: "brasil" } });
    const ids = paraAvaliarNoRecorte(TODOS, r, PERFIL).map((e) => e.id);
    expect(ids.sort()).toEqual(["1", "3", "4"]);
    expect(ids).not.toContain("5"); // mobiliário não casa com "pavimentação"
  });

  it("Brasil sem palavra nenhuma declarada não vira 'tudo': vira nada", () => {
    const r = recorte("brasil", { abrangencia: { tipo: "brasil" } });
    const semPalavras = { palavrasChave: [], palavrasExcluidas: [] };
    expect(paraAvaliarNoRecorte(TODOS, r, semPalavras)).toEqual([]);
  });

  it("o recorte pode ter palavras próprias, diferentes das do perfil", () => {
    const r = recorte("brasil", {
      abrangencia: { tipo: "brasil" },
      palavrasChave: ["mobiliário"],
    });
    const ids = paraAvaliarNoRecorte(TODOS, r, PERFIL).map((e) => e.id);
    expect(ids).toEqual(["5"]);
  });
});

describe("paraAvaliar (a união dos recortes)", () => {
  it("não avalia o mesmo edital duas vezes quando dois recortes o cobrem", () => {
    // A avaliação depende do PERFIL, não do recorte. Pontuar duas vezes
    // gravaria duas linhas idênticas e cobraria o dobro.
    const cidade = recorte("cidade");
    const estado = recorte("estado", { abrangencia: { tipo: "uf", uf: "CE" } });

    const selecionados = paraAvaliar(TODOS, [cidade, estado], PERFIL);
    const ids = selecionados.map((s) => s.edital.id);

    expect(ids.length).toBe(new Set(ids).size);
    expect(ids.sort()).toEqual(["1", "3"]);
  });

  it("o edital repetido fica com o PRIMEIRO recorte, na ordem do cliente", () => {
    const cidade = recorte("cidade");
    const estado = recorte("estado", { abrangencia: { tipo: "uf", uf: "CE" } });

    const primeiro = paraAvaliar(TODOS, [cidade, estado], PERFIL).find((s) => s.edital.id === "1");
    expect(primeiro?.recorte.id).toBe("cidade");

    const invertido = paraAvaliar(TODOS, [estado, cidade], PERFIL).find((s) => s.edital.id === "1");
    expect(invertido?.recorte.id).toBe("estado");
  });

  it("sem recorte nenhum, não avalia nada", () => {
    expect(paraAvaliar(TODOS, [], PERFIL)).toEqual([]);
  });
});

describe("entregaveis", () => {
  const r = recorte("cidade");
  const pontuado = (id: string, score: number | null, entregue = true): Pontuado => ({
    editalId: id,
    recorte: r,
    entregue,
    score,
  });

  it("não entrega o que a triagem descartou", () => {
    expect(entregaveis([pontuado("1", 90, false)])).toEqual([]);
  });

  it("respeita o teto diário, e o teto vale para município também", () => {
    /*
     * A correção do erro de desenho: eu tinha posto teto só no recorte
     * nacional, achando que município seria pequeno. São Paulo tem uns 120
     * editais novos por dia.
     */
    const muitos = Array.from({ length: TETO_DIARIO_POR_RECORTE + 15 }, (_, i) =>
      pontuado(String(i), 100 - i),
    );
    expect(entregaveis(muitos).length).toBe(TETO_DIARIO_POR_RECORTE);
  });

  it("dentro do teto, entrega os de maior score", () => {
    const escolhidos = entregaveis([pontuado("baixo", 51), pontuado("alto", 99)], 1);
    expect(escolhidos.map((p) => p.editalId)).toEqual(["alto"]);
  });

  it("o indeterminado vem na FRENTE do score baixo", () => {
    // Esconder o que não conseguimos avaliar seria esconder justamente o que
    // precisa de olho humano. O teto pode cortá-lo, mas por posição na fila.
    const escolhidos = entregaveis([pontuado("baixo", 51), pontuado("sem", null)], 1);
    expect(escolhidos.map((p) => p.editalId)).toEqual(["sem"]);
  });

  it("o teto é POR RECORTE, não por conta", () => {
    const outro = recorte("estado", { abrangencia: { tipo: "uf", uf: "CE" } });
    const lista: Pontuado[] = [
      ...Array.from({ length: TETO_DIARIO_POR_RECORTE + 5 }, (_, i) => pontuado(`a${i}`, 90)),
      ...Array.from({ length: TETO_DIARIO_POR_RECORTE + 5 }, (_, i) => ({
        editalId: `b${i}`,
        recorte: outro,
        entregue: true,
        score: 90,
      })),
    ];
    expect(entregaveis(lista).length).toBe(TETO_DIARIO_POR_RECORTE * 2);
  });

  it("o recorte nacional corta abaixo da faixa 'boa'", () => {
    const brasil = recorte("brasil", { abrangencia: { tipo: "brasil" } });
    const quaseBom: Pontuado = {
      editalId: "quase",
      recorte: brasil,
      entregue: true,
      score: SCORE_MINIMO_NO_BRASIL - 1,
    };
    const bom: Pontuado = { ...quaseBom, editalId: "bom", score: SCORE_MINIMO_NO_BRASIL };

    expect(entregaveis([quaseBom, bom]).map((p) => p.editalId)).toEqual(["bom"]);
  });

  it("o corte nacional NÃO se aplica a município nem a UF", () => {
    // Quem escolheu a própria cidade quer saber do que abre lá, mesmo com
    // aderência mediana. O corte alto existe para o recorte que cobre o país.
    const fraco = pontuado("fraco", SCORE_MINIMO_NO_BRASIL - 20);
    expect(entregaveis([fraco]).map((p) => p.editalId)).toEqual(["fraco"]);
  });

  it("o indeterminado sobrevive ao corte nacional", () => {
    // `score === null` não é "abaixo de 70": é "não sabemos". Cortá-lo aqui
    // usaria o corte de qualidade para esconder ausência de informação.
    const brasil = recorte("brasil", { abrangencia: { tipo: "brasil" } });
    const sem: Pontuado = { editalId: "sem", recorte: brasil, entregue: true, score: null };
    expect(entregaveis([sem]).map((p) => p.editalId)).toEqual(["sem"]);
  });
});

describe("paraAvaliarDaEmpresa", () => {
  const item = (e: Edital) => ({ uuid: `u-${e.id}`, edital: e });
  const ITENS = TODOS.map(item);

  it("SEM recorte, avalia TUDO", () => {
    /*
     * A regra mais perigosa do arquivo. Empresa sem recorte é o plano que lê o
     * documento, cobrindo o perfil inteiro. Tratar lista vazia como "nada a
     * avaliar" passaria em todo teste de recorte, passaria no build, e
     * desligaria a triagem de quem paga R$ 800 até o cliente ligar.
     */
    expect(paraAvaliarDaEmpresa(ITENS, [], PERFIL)).toHaveLength(TODOS.length);
  });

  it("COM recorte, avalia só o que ele deixa entrar", () => {
    const r = recorte("cidade");
    const escolhidos = paraAvaliarDaEmpresa(ITENS, [r], PERFIL);
    expect(escolhidos.map((i) => i.edital.id)).toEqual(["1"]);
  });

  it("devolve o item inteiro, não só o edital", () => {
    // O script carrega o uuid do banco junto; perdê-lo aqui obrigaria a
    // procurar de novo depois, e é onde nasceria um desalinhamento por índice.
    const escolhidos = paraAvaliarDaEmpresa(ITENS, [recorte("cidade")], PERFIL);
    expect(escolhidos[0].uuid).toBe("u-1");
  });

  it("preserva a ordem e a identidade dos itens sem recorte", () => {
    const iguais = paraAvaliarDaEmpresa(ITENS, [], PERFIL);
    expect(iguais.map((i) => i.uuid)).toEqual(ITENS.map((i) => i.uuid));
  });
});
