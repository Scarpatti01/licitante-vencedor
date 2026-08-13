import { describe, expect, it } from "vitest";
import { criarVerificador, paraCampo } from "./evidencia";
import type { CampoExtraido } from "./schemas";

/**
 * Estes são os testes mais importantes da camada.
 *
 * Tudo o que o produto promete — "não inventamos" — depende de esta conferência
 * funcionar. Se ela deixar passar uma citação inexistente, um número que não
 * está no edital vai para a tela do cliente com a mesma cara de um número que
 * está, e o produto perde a única coisa que o distingue.
 */

const EDITAL = `7. DA HABILITAÇÃO
Para fins de habilitação, a licitante deverá apresentar certidão negativa de débitos
federais e certificado de regularidade do FGTS.

8. DA GARANTIA
Será exigida garantia contratual no percentual de 5% (cinco por cento) do valor do
contrato, na modalidade caução em dinheiro ou seguro-garantia.`;

const verificador = criarVerificador(EDITAL);

function extraido<T>(over: Partial<CampoExtraido<T>> = {}): CampoExtraido<T> {
  return {
    encontrado: true,
    valor: null,
    evidencia: null,
    confianca: "alta",
    motivo: null,
    ...over,
  };
}

describe("criarVerificador", () => {
  it("aceita citação literal", () => {
    expect(verificador.localizar("Será exigida garantia contratual no percentual de 5%")).toBe(
      "exato",
    );
  });

  it("aceita citação reformatada — quebra de linha e espaço não são conteúdo", () => {
    expect(
      verificador.localizar(
        "a licitante deverá apresentar certidão negativa de débitos federais",
      ),
    ).toBe("exato");
  });

  it("aceita citação com reticências, casando por janela de palavras", () => {
    expect(
      verificador.localizar(
        "[...] deverá apresentar certidão negativa de débitos federais e certificado [...] de outra coisa qualquer",
      ),
    ).toBe("aproximado");
  });

  it("recusa trecho que não está no texto, por mais plausível que soe", () => {
    expect(
      verificador.localizar(
        "O prazo de entrega será de 30 (trinta) dias corridos contados da assinatura",
      ),
    ).toBe("ausente");
  });

  it("recusa citação curta demais para significar alguma coisa", () => {
    // "5%" casa com qualquer edital do Brasil; conferir isso seria teatro.
    expect(verificador.localizar("5%")).toBe("ausente");
    expect(verificador.localizar(null)).toBe("ausente");
    expect(verificador.localizar("")).toBe("ausente");
  });
});

describe("paraCampo", () => {
  it("com evidência conferida, vira campo do edital", () => {
    const { campo, resultado } = paraCampo(
      extraido<boolean>({
        valor: true,
        evidencia: "Será exigida garantia contratual no percentual de 5% (cinco por cento)",
      }),
      verificador,
      "exigência de garantia",
    );

    expect(resultado).toBe("sustentado");
    expect(campo.origem).toBe("edital");
    if (campo.origem === "edital") {
      expect(campo.valor).toBe(true);
      expect(campo.confianca).toBe("alta");
    }
  });

  it("valor sem evidência nenhuma NÃO vira dado, mesmo com confiança alta", () => {
    const { campo, resultado } = paraCampo(
      extraido<boolean>({ valor: true, evidencia: null, confianca: "alta" }),
      verificador,
      "exigência de garantia",
    );

    expect(resultado).toBe("descartado");
    expect(campo.origem).toBe("desconhecido");
    if (campo.origem === "desconhecido") expect(campo.motivo).toContain("Sem evidência");
  });

  it("evidência inventada é descartada e o motivo explica por quê", () => {
    const { campo, resultado } = paraCampo(
      extraido<string>({
        valor: "30 dias",
        evidencia: "O prazo de entrega será de 30 (trinta) dias corridos após a ordem de serviço",
      }),
      verificador,
      "o prazo de entrega",
    );

    expect(resultado).toBe("descartado");
    expect(campo.origem).toBe("desconhecido");
    if (campo.origem === "desconhecido") {
      expect(campo.motivo).toContain("não foi encontrado no texto analisado");
    }
  });

  it("'não encontrei' é resposta honesta e não conta contra o modelo", () => {
    const { campo, resultado } = paraCampo(
      extraido<string>({
        encontrado: false,
        motivo: "O texto recebido não trata de prazo de entrega.",
      }),
      verificador,
      "o prazo de entrega",
    );

    expect(resultado).toBe("sem_base");
    expect(campo.origem).toBe("desconhecido");
    if (campo.origem === "desconhecido") {
      expect(campo.motivo).toBe("O texto recebido não trata de prazo de entrega.");
    }
  });

  it("nunca devolve zero, string vazia ou false de aparência inocente", () => {
    const { campo } = paraCampo(
      extraido<boolean>({ encontrado: false }),
      verificador,
      "exigência de amostra",
    );
    expect(campo.valor).toBeNull();
  });

  it("citação aproximada não sobe para confiança alta", () => {
    const { campo } = paraCampo(
      extraido<string>({
        valor: "certidões federais e FGTS",
        evidencia:
          "deverá apresentar certidão negativa de débitos federais e certificado de coisa nenhuma",
        confianca: "alta",
      }),
      verificador,
      "a documentação exigida",
    );

    expect(campo.origem).toBe("edital");
    if (campo.origem === "edital") expect(campo.confianca).toBe("media");
  });
});
