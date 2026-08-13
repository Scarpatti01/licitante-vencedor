import { describe, expect, it } from "vitest";
import { calcularScore } from "./score";
import { avaliarOportunidade, analiseNaoRealizada } from "./recomendacao";
import {
  EDITAL_COMPATIVEL,
  EDITAL_ENCERRADO,
  EDITAL_FORA_DA_REGIAO,
  EDITAL_GRANDE_DEMAIS,
  EDITAL_OUTRO_RAMO,
  EDITAL_SEM_VALOR,
  EDITAL_URGENTE,
  EDITAL_VALOR_ABSURDO,
  PERFIL_COMPLETO,
  PERFIL_DOCUMENTACAO_RUIM,
  PERFIL_INCOMPLETO,
} from "./exemplos";
import type { AnaliseDoEdital } from "./tipos";
import { doEdital } from "./procedencia";

const AGORA = new Date("2026-08-14T12:00:00-03:00");

const semAnalise = (id: string) =>
  analiseNaoRealizada(id, "Documento do edital ainda não foi baixado.");

/** Análise completa fictícia, para exercitar o caminho em que o edital foi lido. */
function analiseCompleta(id: string): AnaliseDoEdital {
  return {
    ...semAnalise(id),
    analisadoEm: "2026-08-14T06:30:00.000Z",
    versaoDoPrompt: "analise-de-edital.v1",
    modelo: "gemini-flash",
    profundidade: "documento_completo",
    resumoExecutivo: doEdital("Limpeza predial por 12 meses.", "Item 1 do termo de referência."),
    garantiaExigida: doEdital(false, "Não há cláusula de garantia de proposta."),
    visitaTecnicaExigida: doEdital(false, "Não há exigência de vistoria."),
    amostraExigida: doEdital(false, "Não há exigência de amostra."),
    exigencias: [
      { tipo: "certidao_federal", descricao: doEdital("Certidão da Receita/PGFN", "Item 9.1"), fase: "habilitacao", obrigatoria: doEdital(true, "Item 9.1") },
      { tipo: "fgts", descricao: doEdital("CRF do FGTS", "Item 9.2"), fase: "habilitacao", obrigatoria: doEdital(true, "Item 9.2") },
      { tipo: "trabalhista_cndt", descricao: doEdital("CNDT", "Item 9.3"), fase: "habilitacao", obrigatoria: doEdital(true, "Item 9.3") },
      { tipo: "contrato_social", descricao: doEdital("Ato constitutivo", "Item 9.4"), fase: "habilitacao", obrigatoria: doEdital(true, "Item 9.4") },
    ],
  };
}

describe("calcularScore — o número", () => {
  it("pontua alto um edital compatível com um perfil completo", () => {
    const { score } = calcularScore(EDITAL_COMPATIVEL, analiseCompleta(EDITAL_COMPATIVEL.id), PERFIL_COMPLETO, AGORA);
    expect(score.valor).not.toBeNull();
    expect(score.valor!).toBeGreaterThanOrEqual(85);
    expect(score.faixa).toBe("excelente");
    expect(score.impedimentos).toHaveLength(0);
  });

  it("nunca passa de 100 nem fica abaixo de 0", () => {
    for (const edital of [EDITAL_COMPATIVEL, EDITAL_URGENTE, EDITAL_GRANDE_DEMAIS, EDITAL_OUTRO_RAMO]) {
      const { score } = calcularScore(edital, analiseCompleta(edital.id), PERFIL_COMPLETO, AGORA);
      if (score.valor !== null) {
        expect(score.valor).toBeGreaterThanOrEqual(0);
        expect(score.valor).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("calcularScore — o que ele se recusa a afirmar", () => {
  it("não pontua quando o perfil está vazio: devolve motivo em vez de número", () => {
    const { score } = calcularScore(EDITAL_COMPATIVEL, semAnalise(EDITAL_COMPATIVEL.id), PERFIL_INCOMPLETO, AGORA);
    expect(score.valor).toBeNull();
    expect(score.faixa).toBe("indeterminada");
    expect(score.motivo).toBeTruthy();
    expect(score.cobertura).toBeLessThan(0.5);
  });

  it("critério sem base sai da conta em vez de valer zero", () => {
    // O edital sem valor não pode arrastar o score para baixo: a ausência é da
    // fonte, não da empresa. O critério fica indeterminado e sai do denominador.
    const comValor = calcularScore(EDITAL_COMPATIVEL, analiseCompleta(EDITAL_COMPATIVEL.id), PERFIL_COMPLETO, AGORA).score;
    const semValor = calcularScore(EDITAL_SEM_VALOR, analiseCompleta(EDITAL_SEM_VALOR.id), PERFIL_COMPLETO, AGORA).score;

    const criterioValor = semValor.criterios.find((c) => c.chave === "valor")!;
    expect(criterioValor.status).toBe("indeterminado");
    expect(criterioValor.aproveitamento).toBeNull();
    expect(semValor.cobertura).toBeLessThan(comValor.cobertura);
    expect(semValor.valor!).toBeGreaterThanOrEqual(85);
  });

  it("valor implausível não vira comparação: fica indeterminado com o motivo", () => {
    const { score } = calcularScore(EDITAL_VALOR_ABSURDO, analiseCompleta(EDITAL_VALOR_ABSURDO.id), PERFIL_COMPLETO, AGORA);
    const criterio = score.criterios.find((c) => c.chave === "valor")!;
    expect(criterio.status).toBe("indeterminado");
    expect(criterio.procedencia.origem).toBe("desconhecido");
  });

  it("sem leitura do edital, documentação e complexidade ficam indeterminadas", () => {
    const { score } = calcularScore(EDITAL_COMPATIVEL, semAnalise(EDITAL_COMPATIVEL.id), PERFIL_COMPLETO, AGORA);
    expect(score.criterios.find((c) => c.chave === "documentacao")!.status).toBe("indeterminado");
    expect(score.criterios.find((c) => c.chave === "complexidade")!.status).toBe("indeterminado");
  });
});

describe("calcularScore — impedimentos", () => {
  it("edital fora das UFs atendidas é impedimento, não apenas nota baixa", () => {
    const { score } = calcularScore(EDITAL_FORA_DA_REGIAO, analiseCompleta(EDITAL_FORA_DA_REGIAO.id), PERFIL_COMPLETO, AGORA);
    const regiao = score.criterios.find((c) => c.chave === "regiao")!;
    expect(regiao.status).toBe("impedimento");
    expect(score.impedimentos).toHaveLength(1);
  });

  it("prazo encerrado é impedimento", () => {
    const { score } = calcularScore(EDITAL_ENCERRADO, analiseCompleta(EDITAL_ENCERRADO.id), PERFIL_COMPLETO, AGORA);
    expect(score.criterios.find((c) => c.chave === "prazo")!.status).toBe("impedimento");
  });

  it("palavra excluída pelo perfil impede, mesmo com todo o resto compatível", () => {
    const { score } = calcularScore(EDITAL_OUTRO_RAMO, analiseCompleta(EDITAL_OUTRO_RAMO.id), PERFIL_COMPLETO, AGORA);
    const objeto = score.criterios.find((c) => c.chave === "objeto")!;
    expect(objeto.status).toBe("impedimento");
    expect(objeto.frase).toContain("medicamentos");
  });
});

describe("calcularScore — explicabilidade", () => {
  it("todo critério traz frase e procedência, sem exceção", () => {
    const { score } = calcularScore(EDITAL_COMPATIVEL, analiseCompleta(EDITAL_COMPATIVEL.id), PERFIL_COMPLETO, AGORA);
    for (const criterio of score.criterios) {
      expect(criterio.frase.length).toBeGreaterThan(10);
      expect(criterio.procedencia.origem).toBeTruthy();
    }
  });

  it("a frase do objeto nomeia a palavra-chave que casou", () => {
    const { score } = calcularScore(EDITAL_COMPATIVEL, analiseCompleta(EDITAL_COMPATIVEL.id), PERFIL_COMPLETO, AGORA);
    expect(score.criterios.find((c) => c.chave === "objeto")!.frase).toContain("limpeza predial");
  });
});

describe("avaliarOportunidade — recomendação e próxima ação", () => {
  it("recomenda com força e manda montar proposta quando está tudo pronto", () => {
    const { recomendacao } = avaliarOportunidade(EDITAL_COMPATIVEL, analiseCompleta(EDITAL_COMPATIVEL.id), PERFIL_COMPLETO, AGORA);
    expect(recomendacao.nivel).toBe("recomendada_forte");
    expect(recomendacao.proximaAcao.tipo).toBe("montar_proposta");
    expect(recomendacao.justificativa.positivos.length).toBeGreaterThan(0);
  });

  it("com documentação pendente, a próxima ação é regularizar — e nomeia os documentos", () => {
    const { recomendacao } = avaliarOportunidade(EDITAL_COMPATIVEL, analiseCompleta(EDITAL_COMPATIVEL.id), PERFIL_DOCUMENTACAO_RUIM, AGORA);
    expect(recomendacao.proximaAcao.tipo).toBe("regularizar_documentos");
    expect(recomendacao.proximaAcao.itens.join(" ")).toMatch(/FGTS|federal/i);
  });

  it("com perfil vazio, manda completar o perfil em vez de inventar score", () => {
    const { recomendacao, score } = avaliarOportunidade(EDITAL_COMPATIVEL, semAnalise(EDITAL_COMPATIVEL.id), PERFIL_INCOMPLETO, AGORA);
    expect(score.valor).toBeNull();
    expect(recomendacao.nivel).toBe("informacao_insuficiente");
    expect(recomendacao.proximaAcao.tipo).toBe("completar_perfil");
  });

  it("prazo encerrado manda arquivar, e não buscar certidão", () => {
    const { recomendacao } = avaliarOportunidade(EDITAL_ENCERRADO, analiseCompleta(EDITAL_ENCERRADO.id), PERFIL_DOCUMENTACAO_RUIM, AGORA);
    expect(recomendacao.proximaAcao.tipo).toBe("arquivar");
  });

  it("urgente é só o que vale a pena E acaba logo", () => {
    const bom = avaliarOportunidade(EDITAL_URGENTE, analiseCompleta(EDITAL_URGENTE.id), PERFIL_COMPLETO, AGORA);
    expect(bom.recomendacao.urgente).toBe(true);

    // Mesmo prazo curto, mas fora do ramo: não pode competir por atenção.
    const ruim = avaliarOportunidade(
      { ...EDITAL_OUTRO_RAMO, encerramentoProposta: EDITAL_URGENTE.encerramentoProposta },
      analiseCompleta(EDITAL_OUTRO_RAMO.id),
      PERFIL_COMPLETO,
      AGORA,
    );
    expect(ruim.recomendacao.urgente).toBe(false);
  });

  it("edital fora da região é não recomendado e a justificativa diz por quê", () => {
    const { recomendacao } = avaliarOportunidade(EDITAL_FORA_DA_REGIAO, analiseCompleta(EDITAL_FORA_DA_REGIAO.id), PERFIL_COMPLETO, AGORA);
    expect(recomendacao.nivel).toBe("nao_recomendada");
    expect(recomendacao.justificativa.impedimentos[0]).toContain("Porto Alegre");
    expect(recomendacao.urgente).toBe(false);
  });

  it("contrato muito acima do porte vira atenção explicada, não impedimento silencioso", () => {
    const { score } = avaliarOportunidade(EDITAL_GRANDE_DEMAIS, analiseCompleta(EDITAL_GRANDE_DEMAIS.id), PERFIL_COMPLETO, AGORA);
    const capacidade = score.criterios.find((c) => c.chave === "capacidade")!;
    expect(capacidade.status).toBe("atencao");
    expect(capacidade.frase).toMatch(/faturamento/);
  });
});
