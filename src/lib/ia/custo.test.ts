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

  /**
   * A guarda mudou de regra em 25/08, e a mudança importa mais que o preço.
   *
   * Ela dizia "a tabela nasce VAZIA", e por um bom motivo: preencher com número
   * plausível é inventar custo, que é a mesma doença de inventar exigência, só
   * que na planilha do dono.
   *
   * Mas "vazia" é a regra errada, do mesmo jeito que "não usamos analytics" era
   * a regra errada na política de privacidade — uma promessa que a primeira
   * decisão legítima quebra, e que ao quebrar leva a guarda junto. O que
   * protege de verdade não é a ausência do número: é o número não poder existir
   * sem dizer de onde veio.
   *
   * Preço conferido, com data e fonte, é conhecimento. Preço sem isso é chute
   * com cara de exatidão.
   */
  it("nenhum preço existe sem data e fonte", () => {
    for (const [modelo, preco] of Object.entries(PRECOS_POR_MODELO)) {
      expect(preco.conferidoEm, `${modelo} sem data de conferência`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(preco.fonte.length, `${modelo} sem fonte`).toBeGreaterThan(10);
      expect(preco.entradaPorMilhao, `${modelo} com entrada não positiva`).toBeGreaterThan(0);
      expect(preco.saidaPorMilhao, `${modelo} com saída não positiva`).toBeGreaterThan(0);
    }
  });

  it("a fonte diz que é preço publicado, e não a fatura", () => {
    // A diferença não é preciosismo: a fatura inclui imposto, câmbio do dia e
    // eventual crédito promocional. Quem lê o relatório precisa saber qual das
    // duas coisas está vendo.
    for (const preco of Object.values(PRECOS_POR_MODELO)) {
      expect(preco.fonte.toLowerCase()).toContain("fatura");
    }
  });

  /**
   * O modelo que faz o trabalho tem preço; o resto pode não ter, e tudo bem.
   *
   * Medido em 25/08: `gemini-3.1-pro-preview` fez 153 chamadas contra 11 do
   * econômico configurado, que só foi exercitado por ping de diagnóstico.
   */
  it("o modelo que faz a leitura real está precificado", () => {
    expect(PRECOS_POR_MODELO["gemini-3.1-pro-preview"]).toBeDefined();
  });

  it("com preço cadastrado, calcula entrada e saída separadamente", () => {
    const c = estimarCusto(
      "barato",
      { entrada: 100_000, saida: 50_000, total: 150_000 },
      { barato: { entradaPorMilhao: 0.3, saidaPorMilhao: 2.5, conferidoEm: "2026-08-13", fonte: "teste" } },
    );
    expect(c.usd).toBeCloseTo(0.03 + 0.125, 10);
    expect(c.motivo).toBeNull();
  });

  /**
   * Acima de 200 mil tokens o fornecedor cobra outro preço, e a tabela só
   * guarda a faixa de baixo.
   *
   * Aplicar a faixa de baixo devolveria METADE do custo real com cara de número
   * exato — e ninguém desconfia de conta barata. Dizer "não sei" é pior de ler
   * e melhor de confiar.
   */
  it("acima da faixa que a tabela cobre, o custo é desconhecido — nunca o da faixa de baixo", () => {
    const c = estimarCusto(
      "barato",
      { entrada: 250_000, saida: 10_000, total: 260_000 },
      { barato: { entradaPorMilhao: 0.3, saidaPorMilhao: 2.5, conferidoEm: "2026-08-13", fonte: "teste" } },
    );
    expect(c.usd).toBeNull();
    expect(c.motivo).toContain("acima");
  });

  it("dentro da faixa, o maior prompt já visto continua sendo estimado", () => {
    // 45.190 tokens é o maior prompt registrado até 25/08. A guarda de faixa
    // não pode transformar a operação normal em "não sei".
    const c = estimarCusto(
      "gemini-3.1-pro-preview",
      { entrada: 45_190, saida: 11_000, total: 56_190 },
    );
    expect(c.usd).not.toBeNull();
    expect(c.usd).toBeCloseTo((45_190 / 1e6) * 2 + (11_000 / 1e6) * 12, 6);
  });
});

describe("criarRegistroEmMemoria", () => {
  it("soma o que sabe e conta separadamente o que não sabe precificar", () => {
    const registro = criarRegistroEmMemoria();
    const base = {
      em: "2026-08-13T00:00:00.000Z",
      operacao: "analise-de-edital" as const,
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
