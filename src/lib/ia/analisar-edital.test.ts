import { describe, expect, it, vi } from "vitest";
import { edital } from "../fontes/fixtures";
import { analisarEdital } from "./analisar-edital";
import { criarProvedorFalso } from "./provedor-falso";
import { criarRegistroEmMemoria, type CatalogoDeModelos } from "./custo";
import type { CampoExtraido } from "./schemas";

/**
 * Os testes desta camada existem para responder uma pergunta só, de várias
 * maneiras: **o que aparece na tela do cliente está no edital?**
 *
 * Nenhum deles chama a API de verdade. Isso não é comodidade de teste: um teste
 * que depende do modelo mede o humor do modelo, e um dia falha sem nada ter
 * mudado no nosso código. O provedor falso é a fronteira.
 */

const TEXTO = `PREGÃO ELETRÔNICO 15/2026

1. DO OBJETO
Aquisição de material de expediente para a Secretaria de Educação do Município.

7. DA HABILITAÇÃO
Para fins de habilitação, a licitante deverá apresentar certidão negativa de débitos
federais e certificado de regularidade do FGTS, ambos dentro do prazo de validade.

8. DA GARANTIA CONTRATUAL
Será exigida garantia contratual no percentual de 5% (cinco por cento) do valor do
contrato, na modalidade caução em dinheiro ou seguro-garantia.

9. DO JULGAMENTO
O critério de julgamento será o de menor preço por item, observada a aceitabilidade.`;

const CATALOGO: CatalogoDeModelos = { economico: "barato", premium: "caro" };
const SEM_ESPERA = { esperaBaseMs: 0, esperar: async () => {} };

function campo<T>(over: Partial<CampoExtraido<T>> = {}): CampoExtraido<T> {
  return { encontrado: false, valor: null, evidencia: null, confianca: null, motivo: "não consta", ...over };
}

function achou<T>(valor: T, evidencia: string): CampoExtraido<T> {
  return { encontrado: true, valor, evidencia, confianca: "alta", motivo: null };
}

/** Resposta de um modelo que se comportou: tudo o que afirma está no texto. */
function respostaHonesta(over: Record<string, unknown> = {}) {
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
        descricao: achou(
          "Certidão negativa de débitos federais",
          "a licitante deverá apresentar certidão negativa de débitos federais",
        ),
        obrigatoria: achou(true, "Para fins de habilitação, a licitante deverá apresentar"),
      },
      {
        tipo: "fgts",
        fase: "habilitacao",
        descricao: achou(
          "Certificado de regularidade do FGTS",
          "certificado de regularidade do FGTS, ambos dentro do prazo de validade",
        ),
        obrigatoria: achou(true, "Para fins de habilitação, a licitante deverá apresentar"),
      },
    ],
    riscos: [
      achou(
        "Garantia contratual de 5% imobiliza capital de giro.",
        "garantia contratual no percentual de 5% (cinco por cento) do valor do contrato",
      ),
    ],
    ...over,
  };
}

/** Resposta de um modelo que inventou: bem formada, plausível, e falsa. */
function respostaInventada() {
  return respostaHonesta({
    resumoExecutivo: achou(
      "Contratação de obra de reforma da escola municipal.",
      "O objeto do presente certame é a reforma completa da unidade escolar, com prazo de 180 dias",
    ),
    criterioDeJulgamento: achou(
      "Técnica e preço",
      "O julgamento se dará pelo critério de técnica e preço, na proporção de 70% e 30%",
    ),
    garantiaExigida: achou(
      true,
      "A contratada prestará garantia de 10% do valor do contrato mediante seguro-garantia específico",
    ),
    exigencias: [
      {
        tipo: "atestado_capacidade_tecnica",
        fase: "habilitacao",
        descricao: achou(
          "Atestado de capacidade técnica com acervo do CREA",
          "deverá comprovar experiência anterior mediante atestado registrado no conselho competente",
        ),
        obrigatoria: achou(true, "deverá comprovar experiência anterior mediante atestado"),
      },
    ],
    riscos: [
      achou(
        "Multa de 20% por atraso.",
        "O atraso injustificado sujeitará a contratada à multa de 20% sobre o valor total",
      ),
    ],
  });
}

describe("analisarEdital sem provedor configurado", () => {
  it("não lança, não finge: devolve análise não realizada com motivo", async () => {
    const provedor = criarProvedorFalso([], { configurado: false });
    const analise = await analisarEdital(edital(), { provedor, textoDoDocumento: TEXTO });

    expect(analise.analisadoEm).toBeNull();
    expect(analise.profundidade).toBe("lista");
    expect(analise.modelo).toBeNull();
    expect(analise.versaoDoPrompt).toBeNull();
    expect(analise.exigencias).toEqual([]);
    expect(analise.resumoExecutivo.origem).toBe("desconhecido");
    if (analise.resumoExecutivo.origem === "desconhecido") {
      expect(analise.resumoExecutivo.motivo).toContain("não há provedor de IA configurado");
    }
    expect(provedor.chamadas).toBe(0);
  });

  it("o caminho padrão (sem GEMINI_API_KEY) também não estoura", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const analise = await analisarEdital(edital(), { textoDoDocumento: TEXTO });
    expect(analise.analisadoEm).toBeNull();
    vi.unstubAllEnvs();
  });

  it("registra a não execução, para o histórico não ter buraco", async () => {
    const registro = criarRegistroEmMemoria();
    await analisarEdital(edital(), {
      provedor: criarProvedorFalso([], { configurado: false }),
      registrar: registro.registrar,
    });

    expect(registro.execucoes).toHaveLength(1);
    expect(registro.execucoes[0].resultado).toBe("falha");
    expect(registro.execucoes[0].falha).toBe("sem_credencial");
    expect(registro.execucoes[0].uso.total).toBe(0);
  });
});

describe("analisarEdital com resposta sustentada", () => {
  it("transforma o que tem evidência em campo do edital", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaHonesta() });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
      agora: () => new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(analise.analisadoEm).toBe("2026-08-13T12:00:00.000Z");
    expect(analise.versaoDoPrompt).toBe("analise-de-edital.v1");
    expect(analise.modelo).toBe("barato");
    expect(analise.criterioDeJulgamento.origem).toBe("edital");
    expect(analise.garantiaExigida.origem).toBe("edital");
    expect(analise.exigencias.map((e) => e.tipo)).toEqual(["certidao_federal", "fgts"]);
    expect(analise.riscos).toHaveLength(1);
  });

  it("o que o modelo não achou fica desconhecido com o motivo dele", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaHonesta() });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
    });

    expect(analise.visitaTecnicaExigida.origem).toBe("desconhecido");
    expect(analise.visitaTecnicaExigida.valor).toBeNull();
    if (analise.visitaTecnicaExigida.origem === "desconhecido") {
      expect(analise.visitaTecnicaExigida.motivo).toBe("O texto não menciona visita técnica.");
    }
  });

  it("documento inteiro no prompt vira profundidade completa", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaHonesta() });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
    });

    expect(analise.profundidade).toBe("documento_completo");
  });

  it("documento recortado vira profundidade parcial — sem fingir leitura completa", async () => {
    const gordo = `${TEXTO}\n\n${"20. DA MINUTA DO CONTRATO\nAs partes elegem o foro da comarca, renunciando a qualquer outro por mais privilegiado que seja.\n".repeat(200)}`;
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaHonesta() });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: gordo,
      orcamentoDeCaracteres: 3_000,
    });

    expect(analise.profundidade).toBe("documento_parcial");
  });

  it("sem documento, a leitura fica no nível da lista", async () => {
    const provedor = criarProvedorFalso({
      tipo: "resposta",
      dados: respostaHonesta({
        exigencias: [],
        riscos: [],
        criterioDeJulgamento: campo<string>(),
        garantiaExigida: campo<boolean>(),
      }),
    });
    const analise = await analisarEdital(edital(), { provedor, catalogo: CATALOGO });

    expect(analise.profundidade).toBe("lista");
    // O objeto vem da coleta e é fonte oficial: continua podendo ser citado.
    expect(analise.resumoExecutivo.origem).toBe("edital");
  });

  it("o prompt leva os metadados da coleta junto do documento", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaHonesta() });
    await analisarEdital(edital(), { provedor, catalogo: CATALOGO, textoDoDocumento: TEXTO });

    const enviado = provedor.pedidos[0].prompt;
    expect(enviado).toContain("MUNICIPIO DE LIMOEIRO");
    expect(enviado).toContain("Pregão - Eletrônico");
    expect(enviado).toContain("DA GARANTIA CONTRATUAL");
  });

  it("exigência repetida no mesmo estágio vira uma linha só", async () => {
    const duplicada = respostaHonesta();
    const provedor = criarProvedorFalso({
      tipo: "resposta",
      dados: { ...duplicada, exigencias: [duplicada.exigencias[0], duplicada.exigencias[0]] },
    });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
    });

    expect(analise.exigencias).toHaveLength(1);
  });
});

describe("analisarEdital diante de invenção", () => {
  it("campo com trecho inexistente cai para desconhecido", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaInventada() });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
      retentativa: SEM_ESPERA,
    });

    expect(analise.criterioDeJulgamento.origem).toBe("desconhecido");
    expect(analise.garantiaExigida.origem).toBe("desconhecido");
    if (analise.garantiaExigida.origem === "desconhecido") {
      expect(analise.garantiaExigida.motivo).toContain("não foi encontrado no texto analisado");
    }
  });

  it("exigência sem base no texto NÃO entra na lista", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaInventada() });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
      retentativa: SEM_ESPERA,
    });

    expect(analise.exigencias).toEqual([]);
  });

  it("risco sem base no texto some — assustar sem prova é caro", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaInventada() });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
      retentativa: SEM_ESPERA,
    });

    expect(analise.riscos).toEqual([]);
  });

  it("o descarte é contado no registro, que é onde a alucinação aparece", async () => {
    const registro = criarRegistroEmMemoria();
    await analisarEdital(edital(), {
      provedor: criarProvedorFalso({ tipo: "resposta", dados: respostaInventada() }),
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
      registrar: registro.registrar,
      retentativa: SEM_ESPERA,
    });

    expect(registro.execucoes[0].camposDescartados).toBeGreaterThan(0);
  });
});

describe("analisarEdital quando o provedor falha", () => {
  it("falha declarada vira análise não realizada, com o motivo à vista", async () => {
    const provedor = criarProvedorFalso({
      tipo: "falha",
      falha: "limite",
      motivo: "Cota excedida (HTTP 429).",
    });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
      retentativa: SEM_ESPERA,
    });

    expect(analise.analisadoEm).toBeNull();
    if (analise.resumoExecutivo.origem === "desconhecido") {
      expect(analise.resumoExecutivo.motivo).toContain("Cota excedida");
    }
  });

  it("resposta fora do schema não é aproveitada pela metade", async () => {
    const provedor = criarProvedorFalso({
      tipo: "resposta",
      dados: { resumoExecutivo: "só um texto solto" },
    });
    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
      retentativa: SEM_ESPERA,
    });

    expect(analise.analisadoEm).toBeNull();
    expect(analise.exigencias).toEqual([]);
  });
});

describe("escalonamento de modelo", () => {
  /** Texto grande o bastante para o plano cair no porte médio. */
  const MEDIO = `${TEXTO}\n${"7.1. A habilitação exigirá certidão negativa de débitos federais e regularidade do FGTS conforme o edital.\n".repeat(300)}`;

  it("resposta que se sustenta não escala: o modelo caro fica na gaveta", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaHonesta() });
    await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: MEDIO,
      retentativa: SEM_ESPERA,
    });

    expect(provedor.chamadas).toBe(1);
    expect(provedor.pedidos[0].modelo).toBe("barato");
  });

  it("extração sem sustentação escala para o premium, uma vez só", async () => {
    const provedor = criarProvedorFalso([
      { tipo: "resposta", dados: respostaInventada() },
      { tipo: "resposta", dados: respostaHonesta() },
    ]);

    const analise = await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: MEDIO,
      retentativa: SEM_ESPERA,
    });

    expect(provedor.chamadas).toBe(2);
    expect(provedor.pedidos[1].modelo).toBe("caro");
    expect(analise.modelo).toBe("caro");
    expect(analise.exigencias).toHaveLength(2);
  });

  it("edital pequeno não escala, mesmo com extração ruim", async () => {
    const provedor = criarProvedorFalso({ tipo: "resposta", dados: respostaInventada() });
    await analisarEdital(edital(), {
      provedor,
      catalogo: CATALOGO,
      textoDoDocumento: TEXTO,
      retentativa: SEM_ESPERA,
    });

    expect(provedor.chamadas).toBe(1);
  });

  it("cada passada entra no registro com o seu próprio custo", async () => {
    const registro = criarRegistroEmMemoria();
    await analisarEdital(edital(), {
      provedor: criarProvedorFalso([
        { tipo: "resposta", dados: respostaInventada(), uso: { entrada: 8_000, saida: 400 } },
        { tipo: "resposta", dados: respostaHonesta(), uso: { entrada: 8_000, saida: 500 } },
      ]),
      catalogo: CATALOGO,
      textoDoDocumento: MEDIO,
      registrar: registro.registrar,
      retentativa: SEM_ESPERA,
    });

    expect(registro.execucoes.map((e) => e.modelo)).toEqual(["barato", "caro"]);
    expect(registro.total().tokens).toBe(16_900);
    // Sem tabela de preços preenchida, o custo é declarado desconhecido — e não
    // some nem vira zero.
    expect(registro.total().semPreco).toBe(2);
  });
});
