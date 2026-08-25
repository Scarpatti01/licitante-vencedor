import { describe, expect, it } from "vitest";
import { execucaoParaLinha, finalidadeDaOperacao, FINALIDADE_POR_OPERACAO } from "./mapeamento";
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

describe("toda finalidade que o código usa existe no enum do banco", () => {
  /**
   * A guarda do defeito de 25/08.
   *
   * O primeiro lote que funcionou de ponta a ponta gravou as duas análises e
   * perdeu as duas linhas de custo: `analise-de-edital-em-lote` atravessou a
   * tradução intacta e o Postgres recusou com `invalid input value for enum
   * finalidade_da_ia`.
   *
   * Análise salva e custo perdido é o pior par possível: a tela fica certa, e o
   * painel de custo passa a mostrar a leitura mais cara do sistema como se
   * fosse de graça.
   *
   * Esta lista é a cópia do enum no banco. Ela existe porque o teste não fala
   * com o Postgres — e uma cópia conferida é melhor que nenhuma conferência.
   * Ao acrescentar uma finalidade, a migração e esta lista andam juntas.
   */
  const NO_BANCO = [
    "extracao",
    "analise_de_edital",
    "analise_de_edital_em_lote",
    "embedding",
    "triagem",
    "redacao",
  ];

  it("nenhuma operação traduz para uma finalidade que o enum não tem", () => {
    for (const [operacao, finalidade] of Object.entries(FINALIDADE_POR_OPERACAO)) {
      expect(
        NO_BANCO,
        `a operação "${operacao}" traduz para "${finalidade}", que não está no enum ` +
          `finalidade_da_ia. A gravação vai falhar em produção DEPOIS de a análise ` +
          `já ter sido salva: tela certa, custo perdido. Escreva a migração ` +
          `(alter type finalidade_da_ia add value ...) e acrescente aqui.`,
      ).toContain(finalidade);
    }
  });

  it("a leitura em lote tem finalidade própria, para o custo dela ser comparável", () => {
    // Reaproveitar `analise_de_edital` seria mais fácil e ninguém notaria. Mas a
    // razão de o lote existir é custar metade, e é esta separação que permite
    // provar isso na fatura em vez de acreditar.
    expect(finalidadeDaOperacao("analise-de-edital-em-lote")).toBe("analise_de_edital_em_lote");
    expect(finalidadeDaOperacao("analise-de-edital")).toBe("analise_de_edital");
  });
});
