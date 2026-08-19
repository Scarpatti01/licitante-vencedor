import { describe, expect, it } from "vitest";
import { acoesDisponiveis } from "./transicoes";
import type { SituacaoDaOportunidade } from "@/lib/dominio/tipos";

const TERMINAIS: SituacaoDaOportunidade[] = ["vencida", "perdida", "descartada"];

describe("acoesDisponiveis", () => {
  it("oferece salvar e descartar para nova e vista", () => {
    for (const situacao of ["nova", "vista"] as const) {
      const situacoes = acoesDisponiveis(situacao).map((a) => a.situacao);
      expect(situacoes).toEqual(["salva", "descartada"]);
    }
  });

  it("oferece marcar em preparação e descartar para salva", () => {
    const situacoes = acoesDisponiveis("salva").map((a) => a.situacao);
    expect(situacoes).toEqual(["em_preparacao", "descartada"]);
  });

  it("oferece marcar participada e descartar para em_preparacao", () => {
    const situacoes = acoesDisponiveis("em_preparacao").map((a) => a.situacao);
    expect(situacoes).toEqual(["participada", "descartada"]);
  });

  it("oferece vencida e perdida para participada — não descartar", () => {
    const situacoes = acoesDisponiveis("participada").map((a) => a.situacao);
    expect(situacoes).toEqual(["vencida", "perdida"]);
  });

  it("não oferece nenhuma ação para os estados terminais", () => {
    for (const situacao of TERMINAIS) {
      expect(acoesDisponiveis(situacao)).toEqual([]);
    }
  });
});
