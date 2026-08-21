import { describe, expect, it } from "vitest";
import {
  avaliarContraOTeto,
  resumirMes,
  TETO_MENSAL_EM_CENTAVOS_BRL,
  type LinhaDeExecucao,
} from "./tetoDeCusto";

function linha(extra: Partial<LinhaDeExecucao> = {}): LinhaDeExecucao {
  return {
    modelo: "gemini-2.5-flash",
    tokensDeEntrada: 1000,
    tokensDeSaida: 500,
    custoEmCentavosUsd: 10,
    sucesso: true,
    ...extra,
  };
}

describe("resumirMes", () => {
  it("mês sem execução soma zero em tudo, não erro", () => {
    const resumo = resumirMes("2026-08", []);
    expect(resumo.execucoes).toBe(0);
    expect(resumo.custoConhecidoEmCentavosUsd).toBe(0);
    expect(resumo.execucoesSemPreco).toBe(0);
  });

  it("soma tokens e custo, separa o que não tinha preço", () => {
    const resumo = resumirMes("2026-08", [
      linha({ custoEmCentavosUsd: 10 }),
      linha({ custoEmCentavosUsd: 20 }),
      linha({ custoEmCentavosUsd: null }),
    ]);
    expect(resumo.execucoes).toBe(3);
    expect(resumo.custoConhecidoEmCentavosUsd).toBe(30);
    expect(resumo.execucoesSemPreco).toBe(1);
    expect(resumo.tokensDeEntrada).toBe(3000);
  });

  it("conta falha separado de sucesso, mas soma tokens dos dois", () => {
    const resumo = resumirMes("2026-08", [linha({ sucesso: true }), linha({ sucesso: false })]);
    expect(resumo.falhas).toBe(1);
    expect(resumo.execucoes).toBe(2);
  });

  it("agrupa por modelo", () => {
    const resumo = resumirMes("2026-08", [
      linha({ modelo: "gemini-2.5-flash" }),
      linha({ modelo: "gemini-2.5-flash" }),
      linha({ modelo: "gemini-2.5-pro" }),
    ]);
    expect(resumo.porModelo["gemini-2.5-flash"].execucoes).toBe(2);
    expect(resumo.porModelo["gemini-2.5-pro"].execucoes).toBe(1);
  });
});

describe("avaliarContraOTeto", () => {
  const taxa = { usdParaBrl: 5 };

  it("mês sem execução fica dentro do teto, com total zero", () => {
    const veredito = avaliarContraOTeto(resumirMes("2026-08", []), taxa);
    expect(veredito).toEqual({ situacao: "dentro_do_teto", totalEmCentavosBrl: 0 });
  });

  it("tudo com preço conferido e abaixo do teto: dentro_do_teto com o total exato", () => {
    // 100 centavos USD * taxa 5 = 500 centavos BRL, bem abaixo dos 30.000 do teto.
    const resumo = resumirMes("2026-08", [linha({ custoEmCentavosUsd: 100 })]);
    expect(avaliarContraOTeto(resumo, taxa)).toEqual({
      situacao: "dentro_do_teto",
      totalEmCentavosBrl: 500,
    });
  });

  it("tudo com preço conferido e acima do teto: estourou com o total exato", () => {
    // 7.000 centavos USD * 5 = 35.000 centavos BRL > teto de 30.000.
    const resumo = resumirMes("2026-08", [linha({ custoEmCentavosUsd: 7000 })]);
    expect(avaliarContraOTeto(resumo, taxa)).toEqual({
      situacao: "estourou",
      totalEmCentavosBrl: 35_000,
    });
  });

  it("sem preço conferido em nenhuma execução: sem_preco_conferido, nunca dentro_do_teto por omissão", () => {
    const resumo = resumirMes("2026-08", [linha({ custoEmCentavosUsd: null })]);
    const veredito = avaliarContraOTeto(resumo, taxa);
    expect(veredito.situacao).toBe("sem_preco_conferido");
  });

  it("piso conhecido já estourou sozinho: estourou, mesmo com execução sem preço no mesmo mês", () => {
    // Regra do meio do arquivo: o desconhecido não pode ESCONDER um estouro real.
    const resumo = resumirMes("2026-08", [
      linha({ custoEmCentavosUsd: 7000 }), // 35.000 BRL sozinho, já > teto
      linha({ custoEmCentavosUsd: null }),
    ]);
    expect(avaliarContraOTeto(resumo, taxa)).toEqual({
      situacao: "estourou",
      totalEmCentavosBrl: 35_000,
    });
  });

  it("piso conhecido abaixo do teto, mas há execução sem preço: sem_preco_conferido com o piso relatado", () => {
    const resumo = resumirMes("2026-08", [
      linha({ custoEmCentavosUsd: 100 }), // 500 BRL, bem abaixo do teto
      linha({ custoEmCentavosUsd: null }),
    ]);
    const veredito = avaliarContraOTeto(resumo, taxa);
    expect(veredito.situacao).toBe("sem_preco_conferido");
    if (veredito.situacao === "sem_preco_conferido") {
      expect(veredito.pisoEmCentavosBrl).toBe(500);
      expect(veredito.motivo).toContain("1 de 2");
    }
  });

  it("respeita um teto diferente do padrão, quando passado explicitamente", () => {
    const resumo = resumirMes("2026-08", [linha({ custoEmCentavosUsd: 100 })]);
    expect(avaliarContraOTeto(resumo, taxa, 100).situacao).toBe("estourou");
  });

  it("o teto padrão é R$300, exportado e não escondido num número mágico", () => {
    expect(TETO_MENSAL_EM_CENTAVOS_BRL).toBe(30_000);
  });
});
