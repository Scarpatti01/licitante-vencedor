import { describe, expect, it } from "vitest";
import { montarChecklist, prontidaoDocumental } from "./checklist";
import { analiseNaoRealizada } from "./recomendacao";
import { PERFIL_COMPLETO, PERFIL_DOCUMENTACAO_RUIM, PERFIL_INCOMPLETO } from "./exemplos";
import { doEdital } from "./procedencia";
import type { AnaliseDoEdital } from "./tipos";
import { normalizar, radical, termosEncontrados, termosSignificativos } from "./texto";

const AGORA = new Date("2026-08-14T12:00:00-03:00");

function comExigencias(): AnaliseDoEdital {
  return {
    ...analiseNaoRealizada("EXEMPLO-1", "n/a"),
    analisadoEm: "2026-08-14T06:30:00.000Z",
    profundidade: "documento_completo",
    exigencias: [
      { tipo: "certidao_federal", descricao: doEdital("Certidão federal", "Item 9.1"), fase: "habilitacao", obrigatoria: doEdital(true, "Item 9.1") },
      { tipo: "fgts", descricao: doEdital("CRF FGTS", "Item 9.2"), fase: "habilitacao", obrigatoria: doEdital(true, "Item 9.2") },
      { tipo: "contrato_social", descricao: doEdital("Ato constitutivo", "Item 9.4"), fase: "habilitacao", obrigatoria: doEdital(true, "Item 9.4") },
    ],
  };
}

describe("montarChecklist", () => {
  it("sem leitura do edital, não devolve lista vazia — devolve o usual marcado como não identificado", () => {
    const checklist = montarChecklist(analiseNaoRealizada("X", "não lido"), PERFIL_INCOMPLETO, AGORA);
    expect(checklist.derivadoDoDocumento).toBe(false);
    expect(checklist.itens.length).toBeGreaterThan(0);
    expect(checklist.itens.every((i) => i.status === "nao_identificado")).toBe(true);
  });

  it("documento anexado e válido fica disponível", () => {
    const checklist = montarChecklist(comExigencias(), PERFIL_COMPLETO, AGORA);
    const federal = checklist.itens.find((i) => i.tipo === "certidao_federal")!;
    expect(federal.status).toBe("disponivel");
    expect(federal.observacao).toContain("válido até");
  });

  it("cadastrado sem arquivo NÃO conta como disponível", () => {
    const checklist = montarChecklist(comExigencias(), PERFIL_DOCUMENTACAO_RUIM, AGORA);
    const fgts = checklist.itens.find((i) => i.tipo === "fgts")!;
    expect(fgts.status).toBe("verificar");
    expect(fgts.observacao).toContain("sem arquivo anexado");
  });

  it("validade vencida vira 'verificar' com a data, não 'disponível'", () => {
    const checklist = montarChecklist(comExigencias(), PERFIL_DOCUMENTACAO_RUIM, AGORA);
    const federal = checklist.itens.find((i) => i.tipo === "certidao_federal")!;
    expect(federal.status).toBe("verificar");
    expect(federal.observacao).toContain("vencida");
  });

  it("exigência sem documento correspondente fica ausente", () => {
    const checklist = montarChecklist(comExigencias(), PERFIL_INCOMPLETO, AGORA);
    expect(checklist.itens.every((i) => i.status === "ausente")).toBe(true);
    expect(checklist.totais.ausentes).toBe(3);
  });

  it("obrigatoriedade não determinada é tratada como obrigatória", () => {
    const analise = comExigencias();
    analise.exigencias[0].obrigatoria = { origem: "desconhecido", valor: null, motivo: "não localizado" };
    const checklist = montarChecklist(analise, PERFIL_COMPLETO, AGORA);
    expect(checklist.itens[0].obrigatorio).toBe(true);
  });
});

describe("prontidaoDocumental", () => {
  it("é null quando não há item avaliável — nunca zero", () => {
    const checklist = montarChecklist(analiseNaoRealizada("X", "não lido"), PERFIL_INCOMPLETO, AGORA);
    expect(prontidaoDocumental(checklist)).toBeNull();
  });

  it("conta 'verificar' como meio ponto", () => {
    const checklist = montarChecklist(comExigencias(), PERFIL_DOCUMENTACAO_RUIM, AGORA);
    // federal: verificar (0,5) · fgts: verificar (0,5) · contrato social: disponível (1)
    expect(prontidaoDocumental(checklist)).toBeCloseTo(2 / 3, 5);
  });
});

describe("texto — casamento de objeto de edital", () => {
  it("ignora acento, caixa e pontuação", () => {
    expect(normalizar("AQUISIÇÃO de Material, de Limpeza.")).toBe("aquisicao de material de limpeza");
  });

  it("corta plural simples", () => {
    expect(radical("servicos")).toBe("servico");
    expect(radical("limpezas")).toBe("limpeza");
  });

  it("descarta ruído que aparece em todo edital", () => {
    expect(termosSignificativos("Contratação de empresa especializada em limpeza")).toEqual(["limpeza"]);
  });

  it("expressão de várias palavras só casa se todas aparecerem", () => {
    const objeto = "Contratação de serviços de limpeza predial e conservação";
    expect(termosEncontrados(objeto, ["limpeza predial"])).toEqual(["limpeza predial"]);
    expect(termosEncontrados(objeto, ["limpeza hospitalar"])).toEqual([]);
  });

  it("não casa por palavra genérica solta", () => {
    const objeto = "Aquisição de material hospitalar";
    expect(termosEncontrados(objeto, ["material de limpeza"])).toEqual([]);
  });

  it("devolve os termos que casaram, para a interface poder explicar", () => {
    const objeto = "Serviços de limpeza predial e conservação de áreas verdes";
    expect(termosEncontrados(objeto, ["limpeza predial", "conservação", "vigilância"])).toEqual([
      "limpeza predial",
      "conservação",
    ]);
  });

  it("lista de procurados vazia não casa com nada", () => {
    expect(termosEncontrados("qualquer coisa", [])).toEqual([]);
  });
});
