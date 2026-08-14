import { describe, expect, it } from "vitest";
import {
  criarRegistroEmMemoria,
  estimarCusto,
  evidenciasSuficientes,
  planejarExecucao,
  PRECOS_POR_MODELO,
  type CatalogoDeModelos,
} from "./custo";

const catalogo: CatalogoDeModelos = { economico: "barato", premium: "caro" };

function plano(over: { caracteres: number; secoesEncontradas?: number; elidiu?: boolean }) {
  return planejarExecucao({
    secoesEncontradas: 2,
    elidiu: false,
    catalogo,
    ...over,
  });
}

describe("planejarExecucao", () => {
  it("edital pequeno vai no modelo barato, passada única", () => {
    const p = plano({ caracteres: 8_000 });
    expect(p.porte).toBe("pequeno");
    expect(p.modelo).toBe("barato");
    expect(p.validar).toBe(false);
  });

  it("edital pequeno não escala: se o barato não leu, o caro também não lê", () => {
    expect(plano({ caracteres: 8_000 }).escalarPara).toBeNull();
  });

  it("edital médio vai no barato, mas com conferência e caminho para escalar", () => {
    const p = plano({ caracteres: 50_000 });
    expect(p.porte).toBe("medio");
    expect(p.modelo).toBe("barato");
    expect(p.validar).toBe(true);
    expect(p.escalarPara).toBe("caro");
  });

  it("edital muito grande começa no premium — e só nesse caso", () => {
    const p = plano({ caracteres: 200_000 });
    expect(p.porte).toBe("grande");
    expect(p.modelo).toBe("caro");
  });

  it("muitas seções relevantes sobem um degrau de porte", () => {
    const simples = plano({ caracteres: 8_000, secoesEncontradas: 2 });
    const complexo = plano({ caracteres: 8_000, secoesEncontradas: 6 });

    expect(simples.porte).toBe("pequeno");
    expect(complexo.porte).toBe("medio");
  });

  it("trecho relevante descartado por falta de espaço também sobe o degrau", () => {
    const p = plano({ caracteres: 50_000, elidiu: true });
    expect(p.porte).toBe("grande");
    expect(p.modelo).toBe("caro");
  });

  it("explica a escolha em texto, porque a conta vai ser questionada", () => {
    expect(plano({ caracteres: 200_000 }).motivo).toContain("caracteres selecionados");
  });
});

describe("estimarCusto", () => {
  it("sem preço conferido, o custo é desconhecido — nunca zero", () => {
    const c = estimarCusto("barato", { entrada: 1000, saida: 500, total: 1500 });
    expect(c.usd).toBeNull();
    expect(c.motivo).toContain("preço conferido");
  });

  it("a tabela de preços nasce vazia de propósito", () => {
    // Preencher com número plausível seria inventar custo, que é a mesma
    // doença de inventar exigência — só que na planilha do dono.
    expect(Object.keys(PRECOS_POR_MODELO)).toHaveLength(0);
  });

  it("com preço cadastrado, calcula entrada e saída separadamente", () => {
    const c = estimarCusto(
      "barato",
      { entrada: 1_000_000, saida: 500_000, total: 1_500_000 },
      { barato: { entradaPorMilhao: 0.3, saidaPorMilhao: 2.5, conferidoEm: "2026-08-13" } },
    );
    expect(c.usd).toBeCloseTo(0.3 + 1.25, 10);
    expect(c.motivo).toBeNull();
  });
});

describe("criarRegistroEmMemoria", () => {
  it("soma o que sabe e conta separadamente o que não sabe precificar", () => {
    const registro = criarRegistroEmMemoria();
    const base = {
      em: "2026-08-13T00:00:00.000Z",
      operacao: "analise-de-edital",
      referencia: "PE-2026-000001",
      prompt: "analise-de-edital.v1",
      provedor: "falso",
      modelo: "barato",
      tentativas: 1,
      duracaoMs: 10,
      resultado: "ok" as const,
      falha: null,
      motivo: null,
      camposDescartados: 0,
    };

    registro.registrar({
      ...base,
      uso: { entrada: 100, saida: 50, total: 150 },
      custo: { usd: 0.5, motivo: null },
    });
    registro.registrar({
      ...base,
      uso: { entrada: 100, saida: 50, total: 150 },
      custo: { usd: null, motivo: "sem preço" },
    });

    expect(registro.total()).toEqual({ usd: 0.5, semPreco: 1, tokens: 300 });
  });
});

describe("evidenciasSuficientes", () => {
  it("reprova quando a maior parte do que voltou não se sustenta", () => {
    expect(evidenciasSuficientes({ camposSustentados: 2, camposDescartados: 8 })).toBe(false);
  });

  it("aprova quando a maioria se sustenta", () => {
    expect(evidenciasSuficientes({ camposSustentados: 8, camposDescartados: 2 })).toBe(true);
  });

  it("extração que não produziu nada não passa por boa", () => {
    expect(evidenciasSuficientes({ camposSustentados: 0, camposDescartados: 0 })).toBe(false);
  });
});
