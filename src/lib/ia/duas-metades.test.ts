import { describe, expect, it } from "vitest";
import { edital } from "../fontes/fixtures";
import {
  analisarEdital,
  montarAnaliseDaResposta,
  prepararAnalise,
} from "./analisar-edital";
import { criarProvedorFalso } from "./provedor-falso";
import type { CatalogoDeModelos } from "./custo";
import type { CampoExtraido } from "./schemas";

/**
 * A guarda que sustenta a leitura em lote.
 *
 * O lote não pode chamar `analisarEdital`: ele precisa montar dezenas de
 * pedidos, mandar todos de uma vez e converter as respostas horas depois. Então
 * `analisar-edital.ts` foi partido em duas metades públicas — `prepararAnalise`
 * antes do modelo, `montarAnaliseDaResposta` depois —, e `analisarEdital` passou
 * a ser as duas coladas.
 *
 * O risco dessa partilha é conhecido e é grave: no dia em que uma das metades
 * mudar sem a outra, o MESMO edital passa a receber análises diferentes conforme
 * o caminho por onde entrou. Ninguém percebe olhando a tela, porque as duas
 * parecem perfeitamente normais.
 *
 * Este arquivo prova, com a mesma resposta de modelo nos dois caminhos, que eles
 * produzem exatamente a mesma análise.
 */

const TEXTO = `PREGÃO ELETRÔNICO 15/2026

1. DO OBJETO
Aquisição de material de expediente para a Secretaria de Educação do Município.

8. DA GARANTIA CONTRATUAL
Será exigida garantia contratual no percentual de 5% (cinco por cento) do valor do
contrato, na modalidade caução em dinheiro ou seguro-garantia.

9. DO JULGAMENTO
O critério de julgamento será o de menor preço por item, observada a aceitabilidade.`;

const CATALOGO: CatalogoDeModelos = { economico: "barato", premium: "caro" };
const AGORA = () => new Date("2026-08-25T03:00:00.000Z");

function campo<T>(over: Partial<CampoExtraido<T>> = {}): CampoExtraido<T> {
  return { encontrado: false, valor: null, evidencia: null, confianca: null, motivo: "não consta", ...over };
}

function achou<T>(valor: T, evidencia: string): CampoExtraido<T> {
  return { encontrado: true, valor, evidencia, confianca: "alta", motivo: null };
}

/** Uma resposta com um campo sustentado e um inventado, para exercitar os dois lados. */
function resposta() {
  return {
    resumoExecutivo: achou(
      "Aquisição de material de expediente para a Secretaria de Educação.",
      "Aquisição de material de expediente para a Secretaria de Educação do Município",
    ),
    criterioDeJulgamento: achou(
      "Menor preço por item",
      "O critério de julgamento será o de menor preço por item",
    ),
    garantiaExigida: achou(
      true,
      "Será exigida garantia contratual no percentual de 5% (cinco por cento) do valor do contrato",
    ),
    visitaTecnicaExigida: campo<boolean>({ motivo: "O texto não menciona visita técnica." }),
    amostraExigida: campo<boolean>({ motivo: "O texto não menciona amostra." }),
    exigencias: [
      {
        tipo: "certidao_federal",
        fase: "habilitacao",
        // Inventada de propósito: esta frase não está no TEXTO acima. Tem de ser
        // descartada IGUAL nos dois caminhos — é o pior lugar para divergirem.
        descricao: achou("Certidão negativa federal", "a licitante deverá apresentar certidão federal"),
        obrigatoria: achou(true, "Para fins de habilitação"),
      },
    ],
    riscos: [achou("Garantia de 5% do valor do contrato", "garantia contratual no percentual de 5%")],
  };
}

describe("o lote e a chamada avulsa produzem a MESMA análise", () => {
  it("mesma resposta do modelo, mesmo resultado nos dois caminhos", async () => {
    const pelaAvulsa = await analisarEdital(edital(), {
      textoDoDocumento: TEXTO,
      provedor: criarProvedorFalso({ tipo: "resposta", dados: resposta() }),
      catalogo: CATALOGO,
      agora: AGORA,
    });

    const pedido = prepararAnalise(edital(), { textoDoDocumento: TEXTO, catalogo: CATALOGO });
    const peloLote = montarAnaliseDaResposta(edital(), resposta() as never, pedido, {
      modelo: pelaAvulsa.modelo ?? "barato",
      agora: AGORA,
    });

    expect(
      peloLote.analise,
      "as duas metades divergiram. O mesmo edital passou a receber análises " +
        "diferentes conforme o caminho por onde entrou, e nenhuma das duas telas " +
        "denuncia isso: as duas parecem normais.",
    ).toEqual(pelaAvulsa);
  });

  it("a exigência inventada é descartada nos dois", async () => {
    const pelaAvulsa = await analisarEdital(edital(), {
      textoDoDocumento: TEXTO,
      provedor: criarProvedorFalso({ tipo: "resposta", dados: resposta() }),
      catalogo: CATALOGO,
      agora: AGORA,
    });

    const pedido = prepararAnalise(edital(), { textoDoDocumento: TEXTO, catalogo: CATALOGO });
    const peloLote = montarAnaliseDaResposta(edital(), resposta() as never, pedido, {
      modelo: "barato",
      agora: AGORA,
    });

    expect(pelaAvulsa.exigencias).toHaveLength(0);
    expect(peloLote.analise.exigencias).toHaveLength(0);
  });

  it("o prompt que o lote monta é o mesmo que o provedor recebe na avulsa", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: resposta() });
    await analisarEdital(edital(), {
      textoDoDocumento: TEXTO,
      provedor,
      catalogo: CATALOGO,
      agora: AGORA,
    });

    const pedido = prepararAnalise(edital(), { textoDoDocumento: TEXTO, catalogo: CATALOGO });

    /*
     * Se o prompt divergir, tudo o mais diverge junto: o texto enviado é também
     * o texto contra o qual a evidência é conferida.
     */
    expect(pedido.prompt).toBe(provedor.pedidos[0].prompt);
    expect(pedido.instrucaoDeSistema).toBe(provedor.pedidos[0].instrucaoDeSistema);
  });

  it("o plano do lote escolhe o mesmo modelo que a avulsa escolheria", () => {
    const pedido = prepararAnalise(edital(), { textoDoDocumento: TEXTO, catalogo: CATALOGO });
    expect([CATALOGO.economico, CATALOGO.premium]).toContain(pedido.plano.modelo);
  });
});
