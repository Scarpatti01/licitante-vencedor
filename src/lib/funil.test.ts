import { describe, expect, it } from "vitest";
import { calcularFunil, lerResumoDoFunil, periodoDoFunil, taxaDoFunil, type DadosDoFunil } from "./funil";

const exemplo = { dias: 30, desde: "2026-10-14T12:00:00Z", ate: "2026-11-13T12:00:00Z", cadastros: 10, confirmados: 8, contas: 5, empresas: 4, configurados: 3, interacoes: 2, assinaturas_ativas: 3 };

describe("contagens do funil", () => {
  it("mantém assinaturas separadas da ordem de ativação", () => {
    expect(lerResumoDoFunil(exemplo).assinaturas_ativas).toBe(3);
  });
  it("não transforma falha de leitura em zero", () => {
    expect(() => lerResumoDoFunil(null)).toThrow();
    expect(() => lerResumoDoFunil({ ...exemplo, interacoes: undefined })).toThrow();
  });
  it("recusa etapas que misturam bases diferentes", () => {
    expect(() => lerResumoDoFunil({ ...exemplo, contas: 9 })).toThrow();
    expect(() => lerResumoDoFunil({ ...exemplo, assinaturas_ativas: 6 })).toThrow();
  });
  it("recusa contagens fracionárias, negativas e datas inválidas", () => {
    for (const cadastros of [-1, 1.5, NaN, Infinity]) expect(() => lerResumoDoFunil({ ...exemplo, cadastros })).toThrow();
    expect(() => lerResumoDoFunil({ ...exemplo, desde: "invalido" })).toThrow();
  });
  it("zero cadastros não vira zero por cento", () => {
    expect(taxaDoFunil(0, 0)).toBeNull();
    expect(taxaDoFunil(2, 5)).toBe(0.4);
    expect(taxaDoFunil(6, 5)).toBeNull();
  });
  it("aceita somente as janelas oferecidas na tela", () => {
    expect(periodoDoFunil("7")).toBe(7);
    expect(periodoDoFunil("90")).toBe(90);
    for (const entrada of ["365", "0", "30;drop table leads", ["7"], null]) expect(periodoDoFunil(entrada)).toBe(30);
  });
});

describe("a mesma coorte avança sem duplicar pessoas", () => {
  const agora = new Date("2026-11-13T12:00:00Z");
  const dados: DadosDoFunil = {
    cadastros: [{ email: "pessoa@example.com", recebidoEm: "2026-11-01T12:00:00Z", confirmadoEm: "2026-11-01T12:01:00Z" }, { email: " PESSOA@example.com ", recebidoEm: "2026-11-02T12:00:00Z", confirmadoEm: "2026-11-02T12:01:00Z" }],
    contas: [{ id: "u1", email: "pessoa@example.com", criadoEm: "2026-11-01T12:02:00Z", confirmadoEm: "2026-11-01T12:03:00Z" }],
    empresas: [{ id: "e1", usuarioId: "u1", criadoEm: "2026-11-02T12:00:00Z", configurada: true, interacoesPor: ["u1"] }, { id: "e2", usuarioId: "u1", criadoEm: "2026-11-02T12:00:00Z", configurada: true, interacoesPor: ["u1"] }],
    assinaturas: [{ usuarioId: "u1", ativa: true, referenciaExterna: "assinatura-exemplo" }],
  };
  it("dois registros do mesmo e-mail e duas empresas contam uma conversão", () => {
    const r = calcularFunil(dados, 30, agora);
    for (const n of [r.cadastros, r.confirmados, r.contas, r.empresas, r.configurados, r.interacoes, r.assinaturas_ativas]) expect(n).toBe(1);
  });
  it("uma conta preexistente não vira aquisição nova", () => {
    const r = calcularFunil({ ...dados, contas: [{ ...dados.contas[0], criadoEm: "2026-10-01T12:00:00Z" }] }, 30, agora);
    expect(r.confirmados).toBe(1);
    expect(r.contas).toBe(0);
    expect(r.empresas).toBe(0);
  });
  it("não conta teste como assinatura ativa nem ação feita por outro membro", () => {
    const r = calcularFunil({ ...dados, empresas: dados.empresas.map((e) => ({ ...e, interacoesPor: ["outro"] })), assinaturas: [{ ...dados.assinaturas[0], ativa: false }] }, 30, agora);
    expect(r.configurados).toBe(1);
    expect(r.interacoes).toBe(0);
    expect(r.assinaturas_ativas).toBe(0);
  });
  it("recorta a entrada da coorte e recusa datas futuras", () => {
    expect(calcularFunil(dados, 7, agora).cadastros).toBe(0);
    expect(calcularFunil({ ...dados, cadastros: [{ ...dados.cadastros[0], recebidoEm: "2026-11-20T12:00:00Z" }] }, 30, agora).cadastros).toBe(0);
  });
});
