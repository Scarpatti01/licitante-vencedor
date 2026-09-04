import { describe, expect, it } from "vitest";

import { falhaSistemicaDeLeitura, resumoDaLeitura } from "./falhaSistemica.ts";

const nada = {
  lidos: 0,
  semDocumento: 0,
  fonteIndisponivel: 0,
  recusadosPeloModelo: 0,
  comErro: 0,
};

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

  it("acusa falha quando a fonte não respondeu a nenhum pedido de documento", () => {
    /*
     * O DEFEITO QUE ESTE CASO EXISTE PARA IMPEDIR.
     *
     * Em 03/09 os cinco editais da leva deram `lista-indisponivel` em
     * sequência, dez segundos um do outro. Como `lista-indisponivel` era
     * contado em `semDocumento`, a conta de tentativas reais deu ZERO, a
     * guarda passou, e o site ganhou cinco páginas sem uma linha de leitura
     * com a execução verde.
     *
     * Cinco fontes não deixam de responder por acaso, e é essa a frase de
     * abertura deste módulo. Ela só não estava sendo aplicada aqui.
     */
    const motivo = falhaSistemicaDeLeitura({ ...nada, fonteIndisponivel: 5 });
    expect(motivo, "cinco listas indisponíveis seguidas passaram na guarda").not.toBeNull();
    expect(motivo).toContain("5 tentativa(s) reais");
    expect(motivo).toContain("sem resposta da fonte");
  });

  it("separa a fonte muda do edital sem anexo na mesma execução", () => {
    // O dia misto é o que distingue esta guarda de uma que só conta zeros: o
    // edital sem anexo continua fora da conta, e a fonte muda entra nela.
    const motivo = falhaSistemicaDeLeitura({ ...nada, fonteIndisponivel: 2, semDocumento: 9 });
    expect(motivo).toContain("2 tentativa(s) reais");
    expect(motivo).toContain("não conta como tentativa");
  });

  it("não acusa falha quando ao menos um edital foi lido de verdade", () => {
    expect(
      falhaSistemicaDeLeitura({
        lidos: 1,
        semDocumento: 3,
        fonteIndisponivel: 4,
        recusadosPeloModelo: 5,
        comErro: 2,
      }),
    ).toBeNull();
  });

  it("não acusa falha num dia em que nada fresco foi tentado", () => {
    expect(falhaSistemicaDeLeitura(nada)).toBeNull();
  });
});

describe("resumoDaLeitura", () => {
  it("mostra cada motivo separado, para o operador não confundir os três", () => {
    expect(
      resumoDaLeitura({ ...nada, jaEmCache: 15, semDocumento: 1, fonteIndisponivel: 2 }),
    ).toBe(
      "15 em cache · 0 lido(s) agora · 1 sem documento legível · 2 sem resposta da fonte · " +
        "0 recusado(s) pelo modelo · 0 com erro",
    );
  });

  it("omite o cache quando quem chama não tem cache", () => {
    expect(resumoDaLeitura({ ...nada, lidos: 3 })).not.toContain("cache");
  });
});
