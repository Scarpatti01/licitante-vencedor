import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  abrirPainelDeLeads,
  estadoDoLead,
  resumirLeads,
  TETO_DE_LEITURA,
  type LeadDoPainel,
} from "./leads-painel";

const AGORA = new Date("2026-08-14T12:00:00.000Z");

function lead(extra: Partial<LeadDoPainel> = {}): LeadDoPainel {
  return {
    email: "interessado@exemplo.com",
    cidade: "Recife",
    origem: "guia/habilitacao#meio",
    recebidoEm: AGORA.toISOString(),
    confirmadoEm: null,
    descadastradoEm: null,
    ...extra,
  };
}

/** Dias antes de `AGORA`, em ISO. */
function haDias(dias: number): string {
  return new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
}

describe("estadoDoLead", () => {
  it("pendente enquanto não confirma", () => {
    expect(estadoDoLead(lead())).toBe("pendente");
  });

  it("confirmado depois do clique no link", () => {
    expect(estadoDoLead(lead({ confirmadoEm: haDias(1) }))).toBe("confirmado");
  });

  /*
   * A precedência que importa: quem confirmou e depois saiu está FORA. Contá-lo
   * como confirmado faria a tela prometer uma lista de envio maior do que o
   * envio real produz — e o envio filtra `descadastrado_em is null`.
   */
  it("descadastrado tem precedência sobre confirmado", () => {
    expect(
      estadoDoLead(lead({ confirmadoEm: haDias(10), descadastradoEm: haDias(2) })),
    ).toBe("descadastrado");
  });
});

describe("resumirLeads", () => {
  it("sem lead nenhum, não afirma taxa de confirmação", () => {
    const resumo = resumirLeads([], AGORA);

    expect(resumo.total).toBe(0);
    // Zero por cento seria a afirmação "ninguém confirma"; a verdade é que não
    // há o que medir.
    expect(resumo.taxaDeConfirmacao).toBeNull();
    expect(resumo.porOrigem).toEqual([]);
  });

  it("conta cada estado uma vez só", () => {
    const resumo = resumirLeads(
      [
        lead({ confirmadoEm: haDias(1) }),
        lead({ confirmadoEm: haDias(2) }),
        lead(),
        lead({ confirmadoEm: haDias(9), descadastradoEm: haDias(3) }),
      ],
      AGORA,
    );

    expect(resumo.total).toBe(4);
    expect(resumo.confirmados).toBe(2);
    expect(resumo.pendentes).toBe(1);
    expect(resumo.descadastrados).toBe(1);
    expect(resumo.confirmados + resumo.pendentes + resumo.descadastrados).toBe(resumo.total);
  });

  /*
   * A taxa mede "este conteúdo traz gente que confirma o e-mail?". Quem
   * confirmou e meses depois se descadastrou respondeu que sim. Se a taxa
   * contasse só quem está na lista hoje, todo conteúdo pareceria piorar com o
   * tempo — sem que nada nele tivesse mudado.
   */
  it("a taxa conta quem confirmou alguma vez, inclusive quem saiu depois", () => {
    const resumo = resumirLeads(
      [lead({ confirmadoEm: haDias(9), descadastradoEm: haDias(3) }), lead()],
      AGORA,
    );

    expect(resumo.confirmados).toBe(0);
    expect(resumo.taxaDeConfirmacao).toBe(0.5);
  });

  it("conta as janelas de 7 e 30 dias pela data de recebimento", () => {
    const resumo = resumirLeads(
      [
        lead({ recebidoEm: haDias(0) }),
        lead({ recebidoEm: haDias(6) }),
        lead({ recebidoEm: haDias(20) }),
        lead({ recebidoEm: haDias(45) }),
      ],
      AGORA,
    );

    expect(resumo.novosEm7Dias).toBe(2);
    // As janelas são cumulativas: quem entrou em 7 dias também entrou em 30.
    expect(resumo.novosEm30Dias).toBe(3);
    expect(resumo.total).toBe(4);
  });

  it("data ilegível não entra em nenhuma janela, e não derruba a contagem", () => {
    const resumo = resumirLeads([lead({ recebidoEm: "" }), lead({ recebidoEm: "ontem" })], AGORA);

    expect(resumo.total).toBe(2);
    expect(resumo.novosEm7Dias).toBe(0);
    expect(resumo.novosEm30Dias).toBe(0);
  });

  it("agrupa por origem, com o volume maior primeiro", () => {
    const resumo = resumirLeads(
      [
        lead({ origem: "guia/habilitacao#meio", confirmadoEm: haDias(1) }),
        lead({ origem: "guia/habilitacao#meio" }),
        lead({ origem: "blog/lei-14133#captura-3", confirmadoEm: haDias(1) }),
      ],
      AGORA,
    );

    expect(resumo.porOrigem).toEqual([
      { origem: "guia/habilitacao#meio", total: 2, confirmados: 1 },
      { origem: "blog/lei-14133#captura-3", total: 1, confirmados: 1 },
    ]);
  });

  /*
   * Ordem estável importa mais do que parece: quem compara a tela de uma semana
   * com a da seguinte precisa que o empate não embaralhe sozinho, ou lê como
   * mudança o que é só ordenação instável.
   */
  it("desempata origens de mesmo volume pelo nome", () => {
    const resumo = resumirLeads([lead({ origem: "zebra" }), lead({ origem: "alfa" })], AGORA);

    expect(resumo.porOrigem.map((o) => o.origem)).toEqual(["alfa", "zebra"]);
  });

  it("origem vazia vira 'desconhecida' em vez de sumir do agrupamento", () => {
    const resumo = resumirLeads([lead({ origem: "" })], AGORA);
    expect(resumo.porOrigem).toEqual([{ origem: "desconhecida", total: 1, confirmados: 0 }]);
  });
});

describe("abrirPainelDeLeads", () => {
  const ambiente = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-de-servico";
  });

  afterEach(() => {
    process.env = { ...ambiente };
    vi.unstubAllGlobals();
  });

  it.each([
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"],
  ])("devolve null sem %s", (ausente) => {
    delete process.env[ausente];
    expect(abrirPainelDeLeads()).toBeNull();
  });

  /**
   * O teste de segurança do arquivo.
   *
   * O token confirma cadastro e cancela inscrição pelos links públicos: quem o
   * tem tira qualquer pessoa da lista. Ele não pode ser pedido ao banco, porque
   * o que chega ao servidor chega ao HTML da tela por descuido de uma linha.
   * Este teste falha se alguém trocar o `select` explícito por `*`.
   */
  it("nunca pede o token ao banco", async () => {
    let pedida = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        pedida = String(url);
        return new Response("[]");
      }),
    );

    await abrirPainelDeLeads()!.listar();

    expect(pedida).not.toContain("token");
    expect(pedida).not.toContain("select=*");
    expect(pedida).toContain("select=email");
  });

  it("normaliza as linhas e descarta o que não tem e-mail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                email: "a@x.com",
                cidade: "Recife",
                origem: "guia/habilitacao#meio",
                recebido_em: AGORA.toISOString(),
                confirmado_em: null,
                descadastrado_em: null,
              },
              // Sem e-mail: não é lead, não é contável como cadastro.
              { email: null, cidade: "Olinda", origem: "blog/x" },
            ]),
          ),
      ),
    );

    const { leads, truncada } = await abrirPainelDeLeads()!.listar();

    expect(truncada).toBe(false);
    expect(leads).toEqual([
      {
        email: "a@x.com",
        cidade: "Recife",
        origem: "guia/habilitacao#meio",
        recebidoEm: AGORA.toISOString(),
        confirmadoEm: null,
        descadastradoEm: null,
      },
    ]);
  });

  it("declara a leitura truncada quando bate no teto", async () => {
    const cheia = Array.from({ length: TETO_DE_LEITURA }, (_, i) => ({
      email: `lead-${i}@x.com`,
      recebido_em: AGORA.toISOString(),
      origem: "guia/x",
    }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(cheia))));

    const { truncada } = await abrirPainelDeLeads()!.listar();
    expect(truncada).toBe(true);
  });

  /*
   * A mensagem descreve a forma do problema e nunca a credencial: ela vai parar
   * em log, e log é lido por mais gente do que o segredo deveria alcançar.
   */
  it("estoura com o status, sem vazar a chave, quando o banco recusa", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nao autorizado", { status: 401 })));

    await expect(abrirPainelDeLeads()!.listar()).rejects.toThrow(/401/);
    await expect(abrirPainelDeLeads()!.listar()).rejects.not.toThrow(/chave-de-servico/);
  });
});
