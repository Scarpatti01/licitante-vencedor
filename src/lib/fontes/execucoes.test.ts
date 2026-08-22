import { afterEach, describe, expect, it, vi } from "vitest";
import { gravarExecucaoDeColeta } from "./execucoes";
import type { Classificacao } from "./degradacao";

const CLASSIFICACAO: Classificacao = {
  classe: "parcial-aceitavel",
  motivos: ["cobertura incompleta: 1 UF(s) parcial(is)"],
  atual: { editais: 120, municipios: 8, ufs: ["PE", "CE"] },
  anterior: { editais: 3200, municipios: 60, ufs: ["PE", "CE", "AL", "PB", "RN", "SE"] },
  preservarAnterior: false,
  // As quatro que estão no anterior e não no atual — coerente com os dois resumos acima.
  ufsAusentes: ["AL", "PB", "RN", "SE"],
};

afterEach(() => {
  vi.restoreAllMocks();
});

function responder(status: number, corpo = "") {
  const chamadas: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      chamadas.push({ url, init });
      return new Response(corpo, { status });
    }),
  );
  return chamadas;
}

describe("gravarExecucaoDeColeta", () => {
  it("manda os campos da classificação para as colunas certas", async () => {
    const chamadas = responder(201);
    await gravarExecucaoDeColeta(
      { fonte: "pncp", coletadoEm: "2026-08-18T06:10:00.000Z", classificacao: CLASSIFICACAO },
      { url: "https://exemplo.test", chave: "chave-de-servico" },
    );

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].url).toBe("https://exemplo.test/rest/v1/execucoes_de_coleta");
    expect(chamadas[0].init.method).toBe("POST");

    const corpo = JSON.parse(chamadas[0].init.body as string);
    expect(corpo).toEqual({
      fonte: "pncp",
      classe: "parcial-aceitavel",
      motivos: ["cobertura incompleta: 1 UF(s) parcial(is)"],
      editais: 120,
      municipios: 8,
      ufs: ["PE", "CE"],
      coletado_em: "2026-08-18T06:10:00.000Z",
    });
  });

  it("manda a chave de serviço, não a chave anônima", async () => {
    const chamadas = responder(201);
    await gravarExecucaoDeColeta(
      { fonte: "pncp", coletadoEm: "2026-08-18T06:10:00.000Z", classificacao: CLASSIFICACAO },
      { url: "https://exemplo.test", chave: "chave-de-servico" },
    );

    const cabecalhos = chamadas[0].init.headers as Record<string, string>;
    expect(cabecalhos.apikey).toBe("chave-de-servico");
    expect(cabecalhos.authorization).toBe("Bearer chave-de-servico");
  });

  it("lança quando o supabase recusa, com o corpo da resposta na mensagem", async () => {
    responder(400, '{"message":"invalid input syntax"}');
    await expect(
      gravarExecucaoDeColeta(
        { fonte: "pncp", coletadoEm: "2026-08-18T06:10:00.000Z", classificacao: CLASSIFICACAO },
        { url: "https://exemplo.test", chave: "x" },
      ),
    ).rejects.toThrow(/400.*invalid input syntax/);
  });
});
