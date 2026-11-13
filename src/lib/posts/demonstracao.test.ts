import { describe, expect, it } from "vitest";
import { todosOsPosts } from "./acervo";
import { DEMONSTRACAO, selecionarDemonstracao } from "./demonstracao";

describe("a demonstração pública tem lastro no acervo", () => {
  const exemplo = selecionarDemonstracao(todosOsPosts());

  it("encontra uma análise real com documentos e evidência", () => {
    expect(exemplo).not.toBeNull();
    expect(exemplo?.link).toMatch(/^https:\/\/pncp.gov.br\//);
    expect(exemplo?.analise?.resumoExecutivo.origem).toBe("edital");
    expect(exemplo?.editalId).toBe(DEMONSTRACAO.editalId);
    expect(exemplo?.analise?.exigencias.filter((e) => e.fase === "habilitacao").length).toBeGreaterThanOrEqual(10);
    expect(exemplo?.analise?.riscos.length).toBeGreaterThanOrEqual(3);
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

  it("mantém o exemplo conferido mesmo quando chega uma análise mais recente", () => {
    if (!exemplo) throw new Error("Falta a análise de referência no acervo");
    const recente = { ...exemplo, editalId: "outro-edital", postadoEm: "2026-11-13T12:00:00Z" };
    const posts = [recente, exemplo];
    expect(selecionarDemonstracao(posts)).toBe(exemplo);
    expect(posts[0]).toBe(recente);
    expect(selecionarDemonstracao([recente])).toBeNull();
  });

  it.each(["resumoExecutivo", "criterioDeJulgamento", "garantiaExigida", "visitaTecnicaExigida", "amostraExigida"] as const)("recusa exemplo com %s sem resposta ou sem evidência", (chave) => {
    if (!exemplo?.analise) throw new Error("Falta a análise de referência no acervo");
    const analise = exemplo.analise;
    expect(selecionarDemonstracao([{ ...exemplo, analise: { ...analise, [chave]: { origem: "desconhecido", valor: null, motivo: "Documento indisponível" } } }])).toBeNull();
    expect(selecionarDemonstracao([{ ...exemplo, analise: { ...analise, [chave]: { ...analise[chave], evidencia: " " } } }])).toBeNull();
  });

  it("distingue vistoria facultativa de obrigação e conserva o limite da leitura original", () => {
    expect(exemplo?.analise?.visitaTecnicaExigida).toMatchObject({ origem: "edital", valor: false });
    expect(exemplo?.analise?.visitaTecnicaExigida).toHaveProperty("evidencia", expect.stringContaining("facultativa"));
    expect(exemplo?.analise?.amostraExigida).toMatchObject({ origem: "edital", valor: true });
    expect(exemplo?.analise?.exigencias.find((e) => e.tipo === "amostra")?.fase).toBe("execucao");
    expect(exemplo?.analise?.profundidade).toBe("documento_parcial");
  });
});
