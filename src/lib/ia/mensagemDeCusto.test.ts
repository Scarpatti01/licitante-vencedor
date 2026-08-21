import { describe, expect, it } from "vitest";
import { conteudoDoAvisoDeCusto } from "./mensagemDeCusto";
import { resumirMes } from "./tetoDeCusto";

describe("conteudoDoAvisoDeCusto", () => {
  it("diz o total, o mês e que a análise não foi interrompida", () => {
    const resumo = resumirMes("2026-08", [
      { modelo: "gemini-2.5-flash", tokensDeEntrada: 1000, tokensDeSaida: 500, custoEmCentavosUsd: 7000, sucesso: true },
    ]);
    const conteudo = conteudoDoAvisoDeCusto(resumo, 35_000);

    expect(conteudo.assunto).toContain("R$");
    expect(conteudo.texto).toContain("agosto de 2026");
    expect(conteudo.texto).toMatch(/não é um corte|análise continua/);
    expect(conteudo.html).not.toContain("<script>");
  });

  it("lista execuções por modelo", () => {
    const resumo = resumirMes("2026-08", [
      { modelo: "gemini-2.5-flash", tokensDeEntrada: 1000, tokensDeSaida: 500, custoEmCentavosUsd: 10, sucesso: true },
      { modelo: "gemini-2.5-pro", tokensDeEntrada: 2000, tokensDeSaida: 1000, custoEmCentavosUsd: 20, sucesso: true },
    ]);
    const conteudo = conteudoDoAvisoDeCusto(resumo, 35_000);
    expect(conteudo.texto).toContain("gemini-2.5-flash");
    expect(conteudo.texto).toContain("gemini-2.5-pro");
  });

  it("avisa quando parte do mês não tinha preço conferido — o total pode estar subestimado", () => {
    const resumo = resumirMes("2026-08", [
      { modelo: "gemini-2.5-flash", tokensDeEntrada: 1000, tokensDeSaida: 500, custoEmCentavosUsd: 7000, sucesso: true },
      { modelo: "gemini-2.5-pro", tokensDeEntrada: 1000, tokensDeSaida: 500, custoEmCentavosUsd: null, sucesso: true },
    ]);
    const conteudo = conteudoDoAvisoDeCusto(resumo, 35_000);
    expect(conteudo.texto).toContain("1 execução");
    expect(conteudo.texto).toMatch(/total real pode ser maior/);
  });

  it("escapa nome de modelo — vem de variável de ambiente, não é confiável por padrão", () => {
    const resumo = resumirMes("2026-08", [
      { modelo: '<img src=x onerror=alert(1)>', tokensDeEntrada: 10, tokensDeSaida: 5, custoEmCentavosUsd: 7000, sucesso: true },
    ]);
    const conteudo = conteudoDoAvisoDeCusto(resumo, 35_000);
    expect(conteudo.html).not.toContain("<img src=x");
    expect(conteudo.html).toContain("&lt;img");
  });

  it("não tem link de descadastro — não é lista de assinante", () => {
    const resumo = resumirMes("2026-08", [
      { modelo: "gemini-2.5-flash", tokensDeEntrada: 10, tokensDeSaida: 5, custoEmCentavosUsd: 7000, sucesso: true },
    ]);
    const conteudo = conteudoDoAvisoDeCusto(resumo, 35_000);
    expect(conteudo.texto.toLowerCase()).not.toContain("descadastr");
  });
});
