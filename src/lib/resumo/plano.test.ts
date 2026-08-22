import { describe, expect, it } from "vitest";
import { planejarResumoDiario, pracasQueFaltaram, type DadosDoResumo, type OportunidadeDoResumo } from "./plano";

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
