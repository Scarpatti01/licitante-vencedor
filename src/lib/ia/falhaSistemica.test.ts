import { describe, expect, it } from "vitest";

import { falhaSistemicaDeLeitura, resumoDaLeitura } from "./falhaSistemica.ts";

const nada = { lidos: 0, semDocumento: 0, recusadosPeloModelo: 0, comErro: 0 };

describe("falhaSistemicaDeLeitura", () => {
  it("não acusa falha quando o único edital fresco do dia não tinha texto para ler", () => {
    /*
     * O caso real de 24/08: 15 editais vieram do cache, o 16º era um PDF
     * digitalizado. A execução parou com erro e mandou procurar uma quebra
     * que não existia. Esta é a regressão que o módulo existe para impedir.
     */
    expect(falhaSistemicaDeLeitura({ ...nada, semDocumento: 1 })).toBeNull();
  });

  it("não acusa falha nem quando o dia inteiro foi de editais sem documento", () => {
    expect(falhaSistemicaDeLeitura({ ...nada, semDocumento: 25 })).toBeNull();
  });

  it("acusa falha quando o provedor recusou toda leitura que chegou nele", () => {
    const motivo = falhaSistemicaDeLeitura({ ...nada, recusadosPeloModelo: 4 });
    expect(motivo).toContain("4 tentativa(s) reais");
    expect(motivo).toContain("recusada(s) pelo provedor de IA");
  });

  it("acusa falha quando download ou extração lançou em todos — a quebra de 16/08", () => {
    const motivo = falhaSistemicaDeLeitura({ ...nada, comErro: 25 });
    expect(motivo).toContain("erro de download ou extração");
  });

  it("cita o sem-documento no diagnóstico, mas não o soma às tentativas", () => {
    const motivo = falhaSistemicaDeLeitura({ ...nada, recusadosPeloModelo: 2, semDocumento: 9 });
    expect(motivo).toContain("2 tentativa(s) reais");
    expect(motivo).toContain("não conta como tentativa");
  });

  it("não acusa falha quando ao menos um edital foi lido de verdade", () => {
    expect(
      falhaSistemicaDeLeitura({ lidos: 1, semDocumento: 3, recusadosPeloModelo: 5, comErro: 2 }),
    ).toBeNull();
  });

  it("não acusa falha num dia em que nada fresco foi tentado", () => {
    expect(falhaSistemicaDeLeitura(nada)).toBeNull();
  });
});

describe("resumoDaLeitura", () => {
  it("mostra cada motivo separado, para o operador não confundir os três", () => {
    expect(
      resumoDaLeitura({ jaEmCache: 15, lidos: 0, semDocumento: 1, recusadosPeloModelo: 0, comErro: 0 }),
    ).toBe("15 em cache · 0 lido(s) agora · 1 sem documento legível · 0 recusado(s) pelo modelo · 0 com erro");
  });

  it("omite o cache quando quem chama não tem cache", () => {
    expect(resumoDaLeitura({ ...nada, lidos: 3 })).not.toContain("cache");
  });
});
