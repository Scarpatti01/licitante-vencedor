import { describe, expect, it } from "vitest";
import { todosOsPosts } from "./acervo";
import { selecionarDemonstracao } from "./demonstracao";

describe("a demonstração pública tem lastro no acervo", () => {
  const exemplo = selecionarDemonstracao(todosOsPosts());

  it("encontra uma análise real com documentos e evidência", () => {
    expect(exemplo).not.toBeNull();
    expect(exemplo?.link).toMatch(/^https:\/\/pncp.gov.br\//);
    expect(exemplo?.analise?.resumoExecutivo.origem).toBe("edital");
  });

  it("não inventa demonstração quando o acervo está vazio", () => {
    expect(selecionarDemonstracao([])).toBeNull();
  });

  it("não apresenta metadados, texto sem evidência ou ausência de documento como leitura completa", () => {
    if (!exemplo?.analise) throw new Error("Falta a análise de referência no acervo");
    const analise = exemplo.analise;
    expect(selecionarDemonstracao([{ ...exemplo, documentosLidos: 0 }])).toBeNull();
    expect(selecionarDemonstracao([{ ...exemplo, analise: { ...analise, profundidade: "lista" } }])).toBeNull();
    expect(selecionarDemonstracao([{ ...exemplo, analise: { ...analise, resumoExecutivo: { origem: "desconhecido", valor: null, motivo: "Documento indisponível" } } }])).toBeNull();
  });

  it("seleciona a análise mais recente sem mudar a ordem do acervo recebido", () => {
    if (!exemplo) throw new Error("Falta a análise de referência no acervo");
    const antigo = { ...exemplo, postadoEm: "2026-01-01T12:00:00Z" };
    const recente = { ...exemplo, postadoEm: "2026-11-01T12:00:00Z" };
    const posts = [antigo, recente];
    expect(selecionarDemonstracao(posts)).toBe(recente);
    expect(posts[0]).toBe(antigo);
  });
});
