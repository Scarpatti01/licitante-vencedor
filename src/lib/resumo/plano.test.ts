import { describe, expect, it } from "vitest";
import { planejarResumoDiario, pracasQueFaltaram, type DadosDoResumo, type OportunidadeDoResumo, linhaDeLeitura, aberturaDoResumo } from "./plano";

/**
 * As regras do resumo diário são promessas ao cliente, e é por isso que estão
 * num módulo puro com teste — e não espalhadas no script que envia.
 */

const AGORA = new Date("2026-08-24T10:00:00Z");

function oportunidade(over: Partial<OportunidadeDoResumo> = {}): OportunidadeDoResumo {
  return {
    editalId: "e1",
    objeto: "Contratação de serviço de dedetização",
    orgao: "Prefeitura de Recife",
    municipio: "Recife",
    uf: "PE",
    valorEstimado: 250_000,
    encerramentoProposta: "2026-08-30T13:00:00Z",
    link: "https://pncp.gov.br/app/editais/1",
    score: 85,
    leuTexto: true,
    ...over,
  };
}

function dados(over: Partial<DadosDoResumo> = {}): DadosDoResumo {
  return {
    empresa: "Insect Never",
    email: "contato@insectnever.com.br",
    ufsAtendidas: ["PE", "PB"],
    oportunidades: [oportunidade()],
    jaEnviados: new Set<string>(),
    ufsAusentes: [],
    preferencias: { scoreMinimo: 70, maximoPorEnvio: 8 },
    // O padrão dos testes existentes é o plano que LÊ, porque era o único que
    // existia quando eles foram escritos. Os testes do plano de lista passam
    // `false` explicitamente.
    leituraInclusaNoPlano: true,
    ...over,
  };
}

describe("dia sem edital novo é dia sem e-mail", () => {
  it("não manda nada quando não há oportunidade", () => {
    expect(planejarResumoDiario(dados({ oportunidades: [] }), AGORA).tipo).toBe("sem-novidade");
  });

  it("não manda nada quando tudo já foi enviado antes", () => {
    const plano = planejarResumoDiario(dados({ jaEnviados: new Set(["e1"]) }), AGORA);
    expect(plano.tipo).toBe("sem-novidade");
  });

  it("NÃO manda só para avisar da praça ausente", () => {
    /*
     * A regra que o dono decidiu em 22/08, e a mais fácil de quebrar sem
     * perceber: é tentador avisar "não conseguimos olhar a sua praça hoje".
     * Isso transformaria um problema nosso em interrupção na caixa de entrada
     * de quem paga, num dia em que não havia nada a entregar.
     */
    const plano = planejarResumoDiario(
      dados({ oportunidades: [], ufsAusentes: ["PB"] }),
      AGORA,
    );

    expect(plano.tipo).toBe("sem-novidade");
  });

  it("descarta edital com prazo já encerrado", () => {
    const plano = planejarResumoDiario(
      dados({ oportunidades: [oportunidade({ encerramentoProposta: "2026-08-20T13:00:00Z" })] }),
      AGORA,
    );

    expect(plano.tipo).toBe("sem-novidade");
  });
});

describe("o aviso de praça ausente pega carona", () => {
  it("aparece quando o e-mail já ia sair por outra praça", () => {
    const plano = planejarResumoDiario(
      dados({
        oportunidades: [oportunidade({ uf: "PE" })],
        ufsAusentes: ["PB"],
      }),
      AGORA,
    );

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    const fecho = plano.conteudo.fecho.join(" ");

    expect(fecho).toMatch(/PB/);
    expect(fecho).toMatch(/assim que entrarem/i);
  });

  it("não cita praça que não está no perfil do cliente", () => {
    // A coleta pode ter perdido RR sem que isso diga nada a quem atende PE e PB.
    const plano = planejarResumoDiario(dados({ ufsAusentes: ["RR"] }), AGORA);

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    expect(plano.conteudo.fecho.join(" ")).not.toMatch(/RR/);
  });

  it("nunca revela a causa ao cliente", () => {
    /*
     * Decisão do dono: "o cliente não vai saber o motivo". Despejar "o PNCP
     * respondeu 500" em quem contratou o serviço é transferir a nossa
     * dificuldade para a atenção dele.
     */
    const plano = planejarResumoDiario(dados({ ufsAusentes: ["PB"] }), AGORA);

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    const c = plano.conteudo;

    /*
     * Só a PROSA, e não o objeto inteiro.
     *
     * A primeira versão serializava tudo e falhava em `/PNCP/` — por causa do
     * link do edital, `pncp.gov.br`, que é o endereço da publicação oficial e
     * precisa estar ali. A asserção media a coisa errada: o que não pode
     * vazar é a EXPLICAÇÃO da falha, não a palavra.
     */
    const prosa = [
      c.assunto,
      c.titulo,
      ...c.paragrafos,
      ...c.fecho,
      ...c.listas.flatMap((l) => [l.titulo, ...l.itens.map((i) => i.texto), ...l.itens.map((i) => i.rotulo)]),
      c.rodape.limites,
    ].join(" ");

    for (const vazamento of [/PNCP/i, /instabilidade/i, /fora do ar/i, /erro/i, /falha/i, /indisponí/i, /coleta/i]) {
      expect(prosa, `a prosa do e-mail explica a causa da ausência: ${vazamento}`).not.toMatch(vazamento);
    }
  });

  it("lista as praças em ordem, sem repetir", () => {
    expect(pracasQueFaltaram(["PE", "pb", "PB"], ["pb", "PE"])).toEqual(["PB", "PE"]);
  });
});

describe("o e-mail é resumo, não a entrega", () => {
  it("manda ao painel para a análise", () => {
    const plano = planejarResumoDiario(dados(), AGORA);

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    expect(plano.conteudo.acao?.rotulo).toMatch(/análise/i);
    expect(plano.conteudo.acaoDepoisDasListas).toBe(true);
  });

  it("diz se o documento foi lido, e não finge resumo quando não foi", () => {
    const plano = planejarResumoDiario(
      dados({ oportunidades: [oportunidade({ leuTexto: false })] }),
      AGORA,
    );

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    const leitura = plano.conteudo.listas[0].itens.find((i) => i.rotulo === "Leitura");
    expect(leitura?.texto).toMatch(/ainda não lemos/i);
  });

  it("tem descadastro que aponta para um controle que existe", () => {
    // `preferencias_de_envio.canal_email` — o remetente lê antes de mandar.
    // Rodapé de descadastro que não desliga nada é pior que rodapé nenhum.
    const plano = planejarResumoDiario(dados(), AGORA);

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    expect(plano.conteudo.rodape.descadastro).toMatch(/\/configuracoes\//);
  });
});

describe("as preferências mandam", () => {
  it("respeita o score mínimo da empresa", () => {
    const plano = planejarResumoDiario(
      dados({
        oportunidades: [oportunidade({ score: 72 })],
        preferencias: { scoreMinimo: 80, maximoPorEnvio: 8 },
      }),
      AGORA,
    );

    expect(plano.tipo).toBe("sem-novidade");
  });

  it("recusa oportunidade sem score, que não é o mesmo que score zero", () => {
    // `null` significa "não há cobertura para afirmar um número". Mandar seria
    // interromper o cliente com um edital sobre o qual não temos opinião.
    const plano = planejarResumoDiario(
      dados({ oportunidades: [oportunidade({ score: null })] }),
      AGORA,
    );

    expect(plano.tipo).toBe("sem-novidade");
  });

  it("respeita o máximo por envio e diz quantos ficaram", () => {
    const muitas = Array.from({ length: 5 }, (_, i) =>
      oportunidade({ editalId: `e${i}`, score: 90 - i }),
    );
    const plano = planejarResumoDiario(
      dados({ oportunidades: muitas, preferencias: { scoreMinimo: 70, maximoPorEnvio: 2 } }),
      AGORA,
    );

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    expect(plano.editaisIds).toHaveLength(2);
    expect(plano.conteudo.fecho.join(" ")).toMatch(/mais 3 editais/);
  });

  it("ordena por aderência, do maior para o menor", () => {
    const plano = planejarResumoDiario(
      dados({
        oportunidades: [
          oportunidade({ editalId: "baixo", score: 71 }),
          oportunidade({ editalId: "alto", score: 96 }),
        ],
      }),
      AGORA,
    );

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    expect(plano.editaisIds).toEqual(["alto", "baixo"]);
  });
});

describe("objeto longo não vira paredão", () => {
  it("corta o objeto e mantém a aderência visível", () => {
    /*
     * O defeito que só a execução real mostrou. Este objeto é de verdade, saiu
     * da simulação de 22/08 contra o banco de produção.
     */
    const gigante =
      "Registro de Preços para eventual contratação de empresa especializada na " +
      "prestação de serviços de controle sanitário integrado, compreendendo " +
      "desinsetização, desratização e descupinização, para controle de vetores e " +
      "pragas urbanas, a serem executados sob demanda, nas instalações do Depósito " +
      "de Fardamento da Marinha no Rio de Janeiro.";

    const plano = planejarResumoDiario(
      dados({ oportunidades: [oportunidade({ objeto: gigante, score: 86 })] }),
      AGORA,
    );

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    const bloco = plano.conteudo.listas[0];

    expect(gigante.length).toBeGreaterThan(300);
    // O objeto é o TÍTULO do bloco, e é ele que precisa caber.
    expect(bloco.titulo.length).toBeLessThan(130);
    expect(bloco.titulo).toContain("…");
    // A aderência é item próprio, com rótulo curto — não some dentro do corte.
    expect(bloco.itens.find((i) => i.rotulo === "Aderência")?.texto).toBe("86 de 100");
  });

  it("não corta no meio da palavra", () => {
    const plano = planejarResumoDiario(
      dados({
        oportunidades: [
          oportunidade({ objeto: "Aquisição de material hospitalar diverso ".repeat(6) }),
        ],
      }),
      AGORA,
    );

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    const rotulo = plano.conteudo.listas[0].titulo;

    /*
     * A asserção certa não é "há espaço antes da reticência" — `cortar` faz
     * `trimEnd()` antes de acrescentá-la, e faz bem. O que importa é que o
     * pedaço mantido termine numa palavra INTEIRA do original.
     *
     * A primeira versão deste teste checava o espaço e falhava contra um corte
     * perfeitamente correto. Media a forma, não a propriedade.
     */
    const mantido = rotulo.slice(0, rotulo.indexOf("…"));
    const original = "Aquisição de material hospitalar diverso ".repeat(6);

    expect(original.startsWith(mantido)).toBe(true);
    // O caractere logo após o corte é espaço: prova de que a palavra terminou.
    expect(original[mantido.length]).toBe(" ");
  });
});

describe("a estrutura é a que o template sabe renderizar", () => {
  it("usa um bloco por edital, e não um item por edital", () => {
    /*
     * O defeito que a renderização mostrou: cada item vira linha de tabela de
     * duas colunas, e a do rótulo tem `white-space:nowrap`. Um rótulo de 120
     * caracteres empurra a tabela para fora da tela do celular, e o valor se
     * espreme numa coluna de três palavras por linha.
     */
    const plano = planejarResumoDiario(
      dados({
        oportunidades: [
          oportunidade({ editalId: "a", score: 90 }),
          oportunidade({ editalId: "b", score: 80 }),
        ],
      }),
      AGORA,
    );

    if (plano.tipo !== "enviar") throw new Error("esperava envio");
    expect(plano.conteudo.listas).toHaveLength(2);
  });

  it("mantém todo rótulo curto o bastante para não quebrar a tabela", () => {
    const plano = planejarResumoDiario(dados(), AGORA);

    if (plano.tipo !== "enviar") throw new Error("esperava envio");

    for (const lista of plano.conteudo.listas) {
      for (const item of lista.itens) {
        expect(
          item.rotulo.length,
          `o rótulo "${item.rotulo}" é longo demais: ele é renderizado com ` +
            "`white-space:nowrap` e empurraria a tabela para fora da tela.",
        ).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("o resumo de quem não paga pela leitura", () => {
  it('não diz "ainda não lemos": para ele, nunca vamos', () => {
    /*
     * "Ainda" promete que um dia vamos. É verdade para quem assina Empresa ou
     * Consultoria e falso para quem assina Leve — e é a diferença entre um
     * cliente que espera e um cliente que abre o edital ele mesmo.
     */
    expect(linhaDeLeitura({ leuTexto: false }, false)).toBe(
      "o seu plano não inclui a leitura do documento",
    );
    expect(linhaDeLeitura({ leuTexto: false }, true)).toBe("ainda não lemos o documento");
  });

  it("diz 'documento lido' quando leu, independente do plano", () => {
    // Um edital lido é um edital lido. Se um dia o plano leve ganhar leitura
    // avulsa paga, a linha precisa continuar dizendo a verdade sobre AQUELE
    // edital, e não sobre o plano.
    expect(linhaDeLeitura({ leuTexto: true }, false)).toBe("documento lido");
  });

  it("não promete exigências de habilitação no painel", () => {
    /*
     * O defeito mais caro que este PR conserta. O segundo parágrafo era fixo e
     * prometia, em TODO envio, "exigências de habilitação, garantia, visita
     * técnica e riscos" no painel. Para o plano de lista o painel não tem isso,
     * e uma promessa repetida todo dia útil é a que mais rápido vira reembolso.
     */
    const paragrafos = aberturaDoResumo(3, 0, "Insect Never", false).join(" ");
    expect(paragrafos).not.toMatch(/exigências de habilitação, garantia/i);
    expect(paragrafos).toMatch(/não inclui abrir o arquivo do edital/i);
  });

  it("continua prometendo as exigências para quem paga por elas", () => {
    // A guarda não pode virar medo de afirmar: quem assina o plano que lê tem
    // exatamente isso no painel, e some daqui seria esconder o que foi vendido.
    const paragrafos = aberturaDoResumo(3, 3, "Insect Never", true).join(" ");
    expect(paragrafos).toMatch(/exigências de habilitação, garantia/i);
  });

  it("não fica em silêncio sobre a leitura quando nada foi lido", () => {
    // Antes, `lidas === 0` simplesmente omitia a frase. Silêncio sobre a
    // leitura, num produto cuja diferença entre planos É a leitura, deixa o
    // cliente supor o que quiser.
    const doPlanoDeLista = aberturaDoResumo(2, 0, "X", false).join(" ");
    expect(doPlanoDeLista).toMatch(/plano não inclui/i);
  });

  it("o e-mail inteiro de um plano de lista não promete leitura em lugar nenhum", () => {
    const plano = planejarResumoDiario(
      dados({
        leituraInclusaNoPlano: false,
        oportunidades: [oportunidade({ leuTexto: false })],
      }),
    );
    expect(plano.tipo).toBe("enviar");
    if (plano.tipo !== "enviar") return;

    const tudo = [
      ...plano.conteudo.paragrafos,
      ...(plano.conteudo.listas ?? []).flatMap((l) => l.itens.map((i) => i.texto)),
    ].join(" | ");

    expect(tudo).not.toMatch(/ainda não lemos/i);
    expect(tudo).not.toMatch(/exigências de habilitação, garantia/i);
    expect(tudo).toMatch(/plano não inclui/i);
  });
});

describe("valor ausente é dito, nunca vira R$ 0,00", () => {
  /*
   * O princípio existia desde o alerta gratuito e era cobrado só lá
   * (`alertas/alertas.test.ts`, `alertas/mensagem-do-lead.test.ts`). Ao acabar
   * com o alerta gratuito, em 25/08, fui conferir se o produto pago guardava a
   * mesma regra: não guardava. A lição estava presa ao código que ia morrer.
   *
   * A regra: boa parte dos editais do PNCP sai sem valor estimado. Escrever
   * "R$ 0,00" no lugar do que falta é inventar informação em cima de ausência,
   * e o efeito não é estético — o assinante descarta oportunidade boa achando
   * que é migalha, e nunca descobre que o número era nosso, não do órgão.
   */
  function linhaDeValor(valorEstimado: number | null): string {
    const plano = planejarResumoDiario(
      dados({ oportunidades: [oportunidade({ valorEstimado })] }),
      AGORA,
    );
    if (plano.tipo !== "enviar") throw new Error("esperava um resumo para enviar");

    const item = plano.conteudo.listas[0].itens.find((i) => i.rotulo === "Valor");
    if (!item) throw new Error("o bloco do edital perdeu a linha de Valor");
    return item.texto;
  }

  it("sem valor publicado, diz que não foi informado", () => {
    expect(linhaDeValor(null)).toMatch(/não informado/i);
  });

  it("sem valor publicado, NÃO escreve moeda nenhuma", () => {
    expect(linhaDeValor(null)).not.toContain("R$");
    expect(linhaDeValor(null)).not.toMatch(/0/);
  });

  it("com valor publicado, mostra o valor", () => {
    expect(linhaDeValor(250_000)).toContain("250.000");
  });

  it("zero publicado pelo órgão continua sendo zero, e não some", () => {
    /*
     * A armadilha do outro lado: tratar `0` como ausência faria o produto
     * esconder um valor que o órgão realmente publicou. Ausência é `null`; zero
     * é um número, e um número informado se mostra.
     */
    // `real` formata sem centavos (`maximumFractionDigits: 0`), então o zero
    // publicado sai como "R$ 0" — e não como "R$ 0,00", que foi o que escrevi
    // primeiro aqui. A guarda afirma o que o código faz, não o que eu supus.
    expect(linhaDeValor(0)).toMatch(/R\$\s*0\b/);
    expect(linhaDeValor(0)).not.toMatch(/não informado/i);
  });
});
