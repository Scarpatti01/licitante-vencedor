import { describe, expect, it } from "vitest";
import { execucaoParaLinha } from "./mapeamento";
import type { ExecucaoDeIA } from "./custo";

function execucao(extra: Partial<ExecucaoDeIA> = {}): ExecucaoDeIA {
  return {
    em: "2026-08-21T10:00:00.000Z",
    operacao: "analise-de-edital",
    referencia: "EXEMPLO-1",
    prompt: "analise-de-edital.v1",
    provedor: "gemini",
    modelo: "gemini-2.5-flash",
    tentativas: 1,
    uso: { entrada: 1000, saida: 500, total: 1500 },
    custo: { usd: 0.0125, motivo: null },
    duracaoMs: 2300,
    resultado: "ok",
    falha: null,
    motivo: null,
    camposDescartados: 0,
    ...extra,
  };
}

describe("execucaoParaLinha", () => {
  it("mapeia finalidade, modelo e tokens", () => {
    const linha = execucaoParaLinha(execucao(), { empresaId: null, editalId: "uuid-1" });
    expect(linha.finalidade).toBe("analise_de_edital");
    expect(linha.modelo).toBe("gemini-2.5-flash");
    expect(linha.tokens_de_entrada).toBe(1000);
    expect(linha.tokens_de_saida).toBe(500);
    expect(linha.edital_id).toBe("uuid-1");
    expect(linha.empresa_id).toBeNull();
  });

  it("converte custo de dólar para centavos de dólar, arredondando", () => {
    const linha = execucaoParaLinha(execucao({ custo: { usd: 0.0125, motivo: null } }), {
      empresaId: null,
      editalId: null,
    });
    expect(linha.custo_em_centavos).toBe(1); // 1,25 centavo arredonda para 1
  });

  it("sem preço conferido, custo fica null — nunca zero", () => {
    const linha = execucaoParaLinha(execucao({ custo: { usd: null, motivo: "sem preço" } }), {
      empresaId: null,
      editalId: null,
    });
    expect(linha.custo_em_centavos).toBeNull();
  });

  it("sucesso vira true, falha vira false", () => {
    expect(execucaoParaLinha(execucao({ resultado: "ok" }), { empresaId: null, editalId: null }).sucesso).toBe(true);
    expect(
      execucaoParaLinha(execucao({ resultado: "falha", motivo: "sem_credencial" }), {
        empresaId: null,
        editalId: null,
      }).sucesso,
    ).toBe(false);
  });

  it("falha sempre carrega mensagem de erro — a restrição do banco exige isso", () => {
    const linha = execucaoParaLinha(execucao({ resultado: "falha", motivo: null }), {
      empresaId: null,
      editalId: null,
    });
    expect(linha.erro).toBe("sem motivo declarado");
  });

  it("sucesso não carrega erro", () => {
    const linha = execucaoParaLinha(execucao({ resultado: "ok" }), { empresaId: null, editalId: null });
    expect(linha.erro).toBeNull();
  });
});
