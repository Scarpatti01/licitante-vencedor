import { describe, expect, it } from "vitest";
import { explicarDecisao, triar } from "./triagem";
import { analiseNaoRealizada } from "../dominio/recomendacao";
import {
  EDITAIS_DE_EXEMPLO,
  EDITAL_COMPATIVEL,
  EDITAL_ENCERRADO,
  EDITAL_FORA_DA_REGIAO,
  EDITAL_OUTRO_RAMO,
  PERFIL_COMPLETO,
  PERFIL_INCOMPLETO,
} from "../dominio/exemplos";

const AGORA = new Date("2026-08-14T12:00:00-03:00");
const comAnalise = (editais: typeof EDITAIS_DE_EXEMPLO) =>
  editais.map((edital) => ({
    edital,
    analise: analiseNaoRealizada(edital.id, "documento não baixado"),
  }));

describe("triar", () => {
  it("registra decisão para TODO edital, inclusive os descartados", () => {
    const resultado = triar(comAnalise(EDITAIS_DE_EXEMPLO), PERFIL_COMPLETO, AGORA);
    expect(resultado.decisoes).toHaveLength(EDITAIS_DE_EXEMPLO.length);
    expect(resultado.entregues.length + resultado.descartadas.length).toBe(EDITAIS_DE_EXEMPLO.length);
    expect(resultado.descartadas.length).toBeGreaterThan(0);
  });

  it("toda decisão carrega explicação específica, nunca vazia", () => {
    const resultado = triar(comAnalise(EDITAIS_DE_EXEMPLO), PERFIL_COMPLETO, AGORA);
    for (const decisao of resultado.decisoes) {
      expect(decisao.explicacao.trim().length).toBeGreaterThan(10);
    }
  });

  it("descarta por impedimento e nomeia o motivo", () => {
    const resultado = triar(comAnalise([EDITAL_FORA_DA_REGIAO]), PERFIL_COMPLETO, AGORA);
    const decisao = resultado.decisoes[0];
    expect(decisao.entregue).toBe(false);
    expect(decisao.motivoDoDescarte).toBe("impedimento");
    expect(decisao.explicacao).toContain("Porto Alegre");
  });

  it("descarta prazo encerrado", () => {
    const resultado = triar(comAnalise([EDITAL_ENCERRADO]), PERFIL_COMPLETO, AGORA);
    expect(resultado.decisoes[0].motivoDoDescarte).toBe("prazo_encerrado");
  });

  it("descarta o que está fora do ramo por palavra excluída", () => {
    const resultado = triar(comAnalise([EDITAL_OUTRO_RAMO]), PERFIL_COMPLETO, AGORA);
    expect(resultado.decisoes[0].entregue).toBe(false);
    expect(resultado.decisoes[0].explicacao).toContain("medicamentos");
  });

  it("entrega o que não pôde ser avaliado, em vez de esconder", () => {
    // Perfil vazio: nada pode ser pontuado. Sumir com tudo daria ao cliente a
    // impressão de que não há licitação para ele, que é falso e é o pior erro
    // possível de um produto de triagem.
    const resultado = triar(comAnalise([EDITAL_COMPATIVEL]), PERFIL_INCOMPLETO, AGORA);
    expect(resultado.decisoes[0].entregue).toBe(true);
    expect(resultado.decisoes[0].score).toBeNull();
    expect(resultado.decisoes[0].explicacao).toMatch(/[Ff]alta/);
  });
});

describe("explicarDecisao", () => {
  it("responde 'por que não apareceu' com o critério e a data", () => {
    const { decisoes } = triar(comAnalise([EDITAL_FORA_DA_REGIAO]), PERFIL_COMPLETO, AGORA);
    const texto = explicarDecisao(decisoes[0], EDITAL_FORA_DA_REGIAO.id);
    expect(texto).toContain("impedimento");
    expect(texto).toContain("Porto Alegre");
    expect(texto).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("sem registro, aponta a cobertura da coleta em vez de dar desculpa vaga", () => {
    expect(explicarDecisao(null, "PNCP-123")).toMatch(/coletado|cobertura/i);
  });

  it("explica também o caso entregue", () => {
    const { decisoes } = triar(comAnalise([EDITAL_COMPATIVEL]), PERFIL_COMPLETO, AGORA);
    expect(explicarDecisao(decisoes[0], EDITAL_COMPATIVEL.id)).toMatch(/foi entregue/);
  });
});
