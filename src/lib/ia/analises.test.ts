import { describe, expect, it } from "vitest";
import { analiseParaLinha, linhaParaAnalise } from "./analises.ts";
import { doEdital, desconhecido } from "../dominio/procedencia.ts";
import { analiseNaoRealizada } from "../dominio/recomendacao.ts";
import type { AnaliseDoEdital } from "../dominio/tipos.ts";

const UUID = "8f14e45f-ceea-467e-b7ea-5e5c8b0d8b3f";
const ID_CANONICO = "PE-2026-000001";

function analiseLida(): AnaliseDoEdital {
  return {
    editalId: ID_CANONICO,
    analisadoEm: "2026-08-21T09:00:00.000Z",
    versaoDoPrompt: "analise-de-edital.v1",
    modelo: "gemini-2.5-flash",
    resumoExecutivo: doEdital("Contratação de serviço de limpeza predial.", "Objeto do edital, item 1.1."),
    criterioDeJulgamento: doEdital("Menor preço", "Item 4.2 do edital."),
    garantiaExigida: doEdital(true, "Item 6.1: garantia de 5% do valor do contrato."),
    visitaTecnicaExigida: doEdital(false, "Nenhuma menção a visita técnica no edital."),
    amostraExigida: desconhecido("O edital não menciona exigência de amostra."),
    exigencias: [
      {
        tipo: "trabalhista_cndt",
        descricao: doEdital("CNDT", "Item 8.3, alínea c."),
        fase: "habilitacao",
        obrigatoria: doEdital(true, "Item 8.3: documentos obrigatórios de habilitação."),
      },
    ],
    riscos: [doEdital("Prazo de execução de 30 dias, considerado curto para o objeto.", "Item 3.1.")],
    profundidade: "documento_completo",
  };
}

describe("analiseParaLinha / linhaParaAnalise", () => {
  it("vai e volta sem perder nem inventar campo", () => {
    // Mesma disciplina de `triagem/mapeamento.ts`: a linha de teste sai do
    // mapeador que a implementação usa para GRAVAR, e o round-trip prova que
    // leitura e escrita não divergem sobre o formato de um campo.
    const analise = analiseLida();
    const linha = analiseParaLinha(analise, UUID, 42);
    const devolta = linhaParaAnalise(linha, ID_CANONICO);

    expect(devolta).toEqual(analise);
  });

  it("usa o uuid do edital na linha, não o id canônico", () => {
    const linha = analiseParaLinha(analiseLida(), UUID, null);
    expect(linha.edital_id).toBe(UUID);
  });

  it("nunca grava versao_do_prompt nula, mesmo para analiseNaoRealizada", () => {
    // `analiseNaoRealizada` tem `versaoDoPrompt: null` — quem chama já deveria
    // ter checado `analisadoEm` antes de gravar, mas a coluna é `not null`, e
    // gravar `null` aqui derrubaria a escrita com um erro de banco em vez de
    // um defeito visível no código que chama.
    const linha = analiseParaLinha(analiseNaoRealizada(ID_CANONICO, "não lido"), UUID, null);
    expect(linha.versao_do_prompt).toBeTruthy();
  });

  it("carrega o custo somado, não recalcula nada", () => {
    const linha = analiseParaLinha(analiseLida(), UUID, 137);
    expect(linha.custo_em_centavos).toBe(137);
  });

  it("aceita custo nulo quando o preço não foi conferido", () => {
    const linha = analiseParaLinha(analiseLida(), UUID, null);
    expect(linha.custo_em_centavos).toBeNull();
  });
});
