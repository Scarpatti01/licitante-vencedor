import { describe, expect, it } from "vitest";
import { chaveDeDeduplicacao, deduplicar } from "./deduplicacao";
import { edital } from "./fixtures";

/**
 * Hoje só há uma fonte, então a dedup é quase trivial. Os testes existem para
 * fixar o comportamento ANTES de entrar a segunda — é quando a regra estiver
 * sendo escrita no meio de outra coisa que ela vai errar.
 */

describe("chaveDeDeduplicacao", () => {
  it("é a mesma para o mesmo certame vindo de portais diferentes", () => {
    const noPncp = edital();
    const noPortal = edital({ id: "portal:9", fonte: "portal-pe", idNaFonte: "9" });
    expect(chaveDeDeduplicacao(noPortal)).toBe(chaveDeDeduplicacao(noPncp));
  });

  it("ignora reescrita de acento, caixa e pontuação no objeto", () => {
    expect(chaveDeDeduplicacao(edital({ objeto: "AQUISIÇÃO DE MATERIAL DE EXPEDIENTE, PARA A SECRETARIA DE EDUCAÇÃO" })))
      .toBe(chaveDeDeduplicacao(edital({ objeto: "aquisicao de material de expediente para a secretaria de educacao" })));
  });

  it("separa certames do mesmo órgão com objetos diferentes", () => {
    expect(chaveDeDeduplicacao(edital({ objeto: "Aquisição de merenda escolar para a rede" })))
      .not.toBe(chaveDeDeduplicacao(edital()));
  });

  it("separa certames do mesmo órgão e mesmo objeto com prazos diferentes", () => {
    expect(chaveDeDeduplicacao(edital({ encerramentoProposta: "2026-09-30T14:00:00-03:00" })))
      .not.toBe(chaveDeDeduplicacao(edital()));
  });
});

describe("deduplicar", () => {
  it("o mesmo id repetido entre páginas vira uma linha só", () => {
    const r = deduplicar([edital(), edital(), edital()]);
    expect(r.editais).toHaveLength(1);
    expect(r.repetidosNaFonte).toBe(2);
  });

  it("dois certames diferentes continuam dois", () => {
    const r = deduplicar([edital(), edital({ id: "outro", objeto: "Contratação de serviço de limpeza predial" })]);
    expect(r.editais).toHaveLength(2);
  });

  it("mesma fonte com ids distintos NÃO é fundido, mesmo com chave igual", () => {
    // Um portal não republica o mesmo certame com outro número; forçar a fusão
    // aqui apagaria edital legítimo, que é o erro mais caro dos dois.
    const r = deduplicar([edital({ id: "A" }), edital({ id: "B" })]);
    expect(r.editais).toHaveLength(2);
    expect(r.fundidosEntreFontes).toBe(0);
  });

  it("entre fontes, funde e a de maior precedência vence", () => {
    const r = deduplicar(
      [edital({ id: "portal:9", fonte: "portal-pe", idNaFonte: "9" }), edital()],
      { pncp: 100, "portal-pe": 10 },
    );
    expect(r.editais).toHaveLength(1);
    expect(r.fundidosEntreFontes).toBe(1);
    expect(r.editais[0].fonte).toBe("pncp");
  });

  it("o vencedor não depende da ordem de chegada", () => {
    const doPortal = edital({ id: "portal:9", fonte: "portal-pe", idNaFonte: "9" });
    const precedencia = { pncp: 100, "portal-pe": 10 };
    expect(deduplicar([doPortal, edital()], precedencia).editais[0].fonte).toBe("pncp");
    expect(deduplicar([edital(), doPortal], precedencia).editais[0].fonte).toBe("pncp");
  });

  it("lista vazia não explode", () => {
    expect(deduplicar([])).toEqual({ editais: [], repetidosNaFonte: 0, fundidosEntreFontes: 0 });
  });
});
