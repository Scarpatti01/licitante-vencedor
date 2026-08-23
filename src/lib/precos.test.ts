import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLANOS, O_QUE_INCLUI, O_QUE_NAO_FAZ, emReais, porEmpresa, divergenciasDePreco, type PlanoNoBanco } from "./precos";

const PAGINA = readFileSync(
  join(import.meta.dirname, "..", "app", "precos", "page.tsx"),
  "utf8",
);
const HOME = readFileSync(join(import.meta.dirname, "..", "app", "page.tsx"), "utf8");
const GUIAS = readFileSync(join(import.meta.dirname, "guias.ts"), "utf8");

/** Troca o espaço não separável do formatador por espaço comum. Ver abaixo. */
const semNbsp = (s: string) => s.replace(/\u00a0/g, " ");

describe("os planos", () => {
  it("cobram por número de empresas, e o maior sai mais barato por empresa", () => {
    // O argumento de venda do plano maior é este número. Se a conta inverter,
    // o plano "Consultoria" passa a punir quem traz cinco clientes.
    const [menor, maior] = PLANOS;

    expect(maior.empresas).toBeGreaterThan(menor.empresas);
    expect(maior.mensalidadeEmCentavos / maior.empresas).toBeLessThan(
      menor.mensalidadeEmCentavos / menor.empresas,
    );
  });

  it("formata em reais sem centavos", () => {
    /*
     * `semNbsp` não é preciosismo: `toLocaleString` com BRL separa o símbolo do
     * número com espaço NÃO SEPARÁVEL (U+00A0), e não com espaço comum.
     *
     * A primeira versão deste teste comparava com espaço comum e falhava
     * exibindo "expected 'R$ 800' to be 'R$ 800'" — duas strings idênticas na
     * tela e diferentes na memória. Pior: o teste de mais abaixo, que confere
     * se a página fixa preço na mão, PASSAVA pelo motivo errado, porque o
     * `replace` também usava espaço comum e nunca casava.
     */
    expect(semNbsp(emReais(80_000))).toBe("R$ 800");
    expect(semNbsp(emReais(150_000))).toBe("R$ 1.500");
    expect(semNbsp(porEmpresa(PLANOS[1]))).toBe("R$ 300 por empresa");
  });

  it("tem código estável, que o checkout vai referenciar", () => {
    for (const p of PLANOS) expect(p.codigo).toMatch(/^[a-z-]+$/);
    expect(new Set(PLANOS.map((p) => p.codigo)).size).toBe(PLANOS.length);
  });

  it("declara o que NÃO faz, e não só o que faz", () => {
    /*
     * Página de preço que só lista virtude obriga o leitor a descobrir os
     * limites depois de pagar — e é aí que nasce pedido de reembolso. Este
     * projeto declara limitação em toda superfície; a página que cobra dinheiro
     * não é a exceção.
     */
    expect(O_QUE_NAO_FAZ.length).toBeGreaterThan(0);
    expect(O_QUE_INCLUI.length).toBeGreaterThan(0);
  });
});

describe("a página de preços não promete o que não existe", () => {
  it("diz que ainda não dá para assinar", () => {
    // O dia em que a cobrança abrir, esta seção sai — e o teste cai, obrigando
    // quem ligou o checkout a conferir o resto do texto junto.
    expect(PAGINA).toMatch(/Ainda não dá para assinar/);
  });

  it("marca a oferta como PreOrder, e não InStock", () => {
    /*
     * `InStock` afirmaria ao buscador que dá para comprar agora. O visitante
     * chegaria pelo resultado da busca esperando checkout e encontraria uma
     * lista de espera — decepção que o dado estruturado causou, não a página.
     */
    expect(PAGINA).toMatch(/schema\.org\/PreOrder/);
    expect(PAGINA).not.toMatch(/schema\.org\/InStock/);
  });

  it("não fixa preço na mão: o texto e o `Offer` saem da mesma constante", () => {
    // Preço divergente entre a página e o dado estruturado faz o buscador
    // anunciar um número que a página não pratica.
    for (const p of PLANOS) {
      // Sem `semNbsp` este `replace` nunca casaria, `valor` continuaria com o
      // "R$" na frente, e o teste passaria sem conferir nada.
      const valor = semNbsp(emReais(p.mensalidadeEmCentavos)).replace("R$ ", "");
      expect(
        PAGINA.includes(valor),
        `"${valor}" aparece escrito na página. Use \`PLANOS\` — a página, o ` +
          "`schema.org/Offer` e o futuro checkout precisam ler do mesmo lugar.",
      ).toBe(false);
    }
  });
});

describe("o caminho até os preços existe", () => {
  it("o botão principal da home leva a preços", () => {
    /*
     * A incoerência que o dono apontou: o texto do hero vende a leitura diária
     * comparada ao perfil — o produto PAGO — e o botão entregava o alerta
     * gratuito por cidade, que não lê nada.
     */
    const hero = HOME.slice(HOME.indexOf("mt-10 flex flex-wrap"));
    const primeiroLink = hero.slice(hero.indexOf("href="), hero.indexOf("href=") + 40);

    expect(primeiroLink).toContain("/precos/");
  });

  it("preços está no sitemap", () => {
    // Página que recebe o CTA principal e não entra no sitemap é página que o
    // buscador não acha.
    expect(GUIAS).toMatch(/href: "\/precos\/"/);
  });
});

describe("o preço publicado e o preço cobrável não podem divergir", () => {
  /**
   * A tabela `planos` como ela está semeada em produção hoje. Repetir os
   * números aqui é proposital: se alguém mudar `PLANOS` sem mudar o banco,
   * este caso quebra e diz qual dos dois ficou para trás.
   */
  const COMO_ESTA_NO_BANCO: PlanoNoBanco[] = [
    { codigo: "empresa", ativo: true, mensalidade_em_centavos: 80_000, limite_de_empresas: 1 },
    { codigo: "consultoria", ativo: true, mensalidade_em_centavos: 150_000, limite_de_empresas: 5 },
  ];

  it("não acusa nada quando o banco reflete a página", () => {
    expect(divergenciasDePreco(COMO_ESTA_NO_BANCO)).toEqual([]);
  });

  it("acusa preço diferente, com os dois números na mensagem", () => {
    const banco = COMO_ESTA_NO_BANCO.map((l) =>
      l.codigo === "empresa" ? { ...l, mensalidade_em_centavos: 90_000 } : l,
    );
    const [erro, ...resto] = divergenciasDePreco(banco);
    expect(resto).toEqual([]);
    // Os dois valores precisam aparecer: "diverge" sem os números obriga quem
    // recebe o alerta a ir procurar qual dos lados mudou.
    expect(erro).toContain("80000");
    expect(erro).toContain("90000");
  });

  it("acusa limite de empresas diferente — que é a dimensão em que o preço muda", () => {
    const banco = COMO_ESTA_NO_BANCO.map((l) =>
      l.codigo === "consultoria" ? { ...l, limite_de_empresas: 3 } : l,
    );
    expect(divergenciasDePreco(banco)).toHaveLength(1);
    expect(divergenciasDePreco(banco)[0]).toMatch(/consultoria/);
  });

  it('trata "sem limite" no banco como divergência de um plano que promete cinco', () => {
    // NULL é sem limite. Um plano de R$ 1.500 anunciado como "até 5 empresas"
    // e gravado como ilimitado não quebra tela nenhuma — só entrega de graça o
    // que deveria ser o degrau seguinte de preço.
    const banco = COMO_ESTA_NO_BANCO.map((l) =>
      l.codigo === "consultoria" ? { ...l, limite_de_empresas: null } : l,
    );
    expect(divergenciasDePreco(banco)[0]).toContain("sem limite");
  });

  it("acusa plano anunciado que não existe no banco", () => {
    const banco = COMO_ESTA_NO_BANCO.filter((l) => l.codigo !== "consultoria");
    expect(divergenciasDePreco(banco)[0]).toMatch(/consultoria.*não existe/);
  });

  it("acusa plano anunciado que está inativo no banco", () => {
    const banco = COMO_ESTA_NO_BANCO.map((l) =>
      l.codigo === "empresa" ? { ...l, ativo: false } : l,
    );
    expect(divergenciasDePreco(banco)[0]).toMatch(/inativo/);
  });

  it("acusa plano cobrável que a página não anuncia", () => {
    // O lado que se esquece de conferir. Ninguém reclama, porque nenhuma tela
    // quebra — existe só uma cobrança possível sem preço público correspondente.
    const banco = [
      ...COMO_ESTA_NO_BANCO,
      { codigo: "antigo", ativo: true, mensalidade_em_centavos: 50_000, limite_de_empresas: 1 },
    ];
    expect(divergenciasDePreco(banco)[0]).toMatch(/"antigo".*não aparece/);
  });

  it("ignora plano inativo que a página não anuncia — é histórico, não divergência", () => {
    const banco = [
      ...COMO_ESTA_NO_BANCO,
      { codigo: "antigo", ativo: false, mensalidade_em_centavos: 50_000, limite_de_empresas: 1 },
    ];
    expect(divergenciasDePreco(banco)).toEqual([]);
  });
});

describe("a página não promete volume que o produto não garante", () => {
  /**
   * Duas promessas minhas, escritas no mesmo dia e as duas erradas pelo mesmo
   * motivo: descrevem a CADÊNCIA do processo como se fosse cadência do
   * resultado.
   *
   * - A leitura roda todo dia, mas só lê o que passa do corte de score. Em dois
   *   dos três primeiros dias de operação real, nada passou — e "leitura todo
   *   dia" teria virado reclamação na segunda-feira.
   * - O resumo sai todo dia útil, mas "dia sem edital novo é dia sem e-mail" é
   *   regra deliberada do produto. Prometer e-mail diário faz o silêncio
   *   correto parecer defeito.
   *
   * O que o produto garante é o PROCESSO rodando; o volume depende do que os
   * órgãos publicam e do perfil do cliente. A lista precisa dizer isso.
   */
  const inclui = O_QUE_INCLUI.join(" | ");

  it("não promete leitura com periodicidade garantida", () => {
    expect(inclui).not.toMatch(/leitura[^|]*todo dia/i);
    expect(inclui).not.toMatch(/leitura diária/i);
  });

  it("não promete e-mail em todo dia útil", () => {
    expect(inclui).not.toMatch(/resumo diário/i);
  });

  it("continua prometendo o que de fato roda todo dia: a coleta", () => {
    // A guarda não pode virar medo de afirmar. A coleta É diária e nas 27 UFs,
    // e isso é verdade que vende — some daqui e a lista perde o que tem de mais
    // concreto.
    expect(inclui).toMatch(/coleta diária/i);
    expect(inclui).toMatch(/27 unidades/i);
  });
});
