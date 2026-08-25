import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PLANOS,
  FORMATO_DO_CODIGO,
  O_QUE_NENHUM_PLANO_FAZ,
  O_QUE_O_PLANO_DE_LISTA_NAO_FAZ,
  oQueIncluiO,
  oQueNaoFazO,
  emReais,
  porEmpresa,
  divergenciasDePreco,
  type PlanoNoBanco,
} from "./precos";

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
    // Por código, e não por posição: `PLANOS[1]` deixou de ser o mesmo plano no
    // dia em que o plano leve nasceu, e a asserção passou a falar de outro
    // produto sem ninguém escrever isso.
    const consultoria = PLANOS.find((p) => p.codigo === "consultoria")!;
    expect(semNbsp(porEmpresa(consultoria))).toBe("R$ 300 por empresa");
    const escritorio = PLANOS.find((p) => p.codigo === "leve_escritorio")!;
    expect(semNbsp(porEmpresa(escritorio))).toBe("R$ 50 por empresa");
  });

  it("tem código estável, que o checkout vai referenciar", () => {
    // A régua vem de `FORMATO_DO_CODIGO`, que espelha `planos_codigo_check`.
    // Escrever a expressão de novo aqui foi o que deixou as duas divergirem.
    for (const p of PLANOS) expect(p.codigo).toMatch(FORMATO_DO_CODIGO);
    expect(new Set(PLANOS.map((p) => p.codigo)).size).toBe(PLANOS.length);
  });

  it("declara o que NÃO faz, e não só o que faz", () => {
    /*
     * Página de preço que só lista virtude obriga o leitor a descobrir os
     * limites depois de pagar — e é aí que nasce pedido de reembolso. Este
     * projeto declara limitação em toda superfície; a página que cobra dinheiro
     * não é a exceção.
     */
    expect(O_QUE_NENHUM_PLANO_FAZ.length).toBeGreaterThan(0);
    for (const p of PLANOS) {
      expect(oQueIncluiO(p).length, `${p.codigo} não lista o que entrega`).toBeGreaterThan(0);
      expect(oQueNaoFazO(p).length, `${p.codigo} não lista o que não faz`).toBeGreaterThan(0);
    }
  });

  it("o plano sem leitura declara isso onde ninguém deixa de ver", () => {
    /*
     * A frase mais importante da página. Sem ela, o cliente de R$ 59 acha que
     * comprou o de R$ 800, descobre no primeiro edital que perdeu por falta de
     * um documento que ninguém avisou que era exigido, e pede reembolso com
     * razão. A guarda cobra que a limitação apareça na lista do PRÓPRIO plano,
     * e não só numa seção genérica lá embaixo.
     */
    for (const p of PLANOS.filter((x) => x.profundidade === "lista")) {
      const naoFaz = oQueNaoFazO(p).join(" | ");
      expect(naoFaz, `${p.codigo} não avisa que não abre o arquivo do edital`).toMatch(
        /não abre o arquivo do edital/i,
      );
      expect(naoFaz, `${p.codigo} não avisa que não traz exigência de habilitação`).toMatch(
        /habilitação/i,
      );
    }
    // E o contrário: o plano que LÊ não pode carregar esse aviso, senão a
    // página desmente o que ela mesma está vendendo.
    for (const p of PLANOS.filter((x) => x.profundidade === "documento")) {
      expect(oQueNaoFazO(p).join(" | ")).not.toMatch(/não abre o arquivo/i);
    }
  });

  it("o plano de lista não promete leitura em lugar nenhum da própria lista", () => {
    // O erro mais fácil de cometer aqui é copiar a linha da leitura para o
    // plano leve por descuido. Seria vender o que ele não entrega.
    for (const p of PLANOS.filter((x) => x.profundidade === "lista")) {
      const inclui = oQueIncluiO(p).join(" | ");
      expect(inclui, `${p.codigo} promete ler o documento`).not.toMatch(
        /leitura do documento|exigências de habilitação|prontidão documental/i,
      );
    }
    expect(O_QUE_O_PLANO_DE_LISTA_NAO_FAZ.length).toBeGreaterThan(0);
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
    { codigo: "leve", ativo: true, mensalidade_em_centavos: 5_900, limite_de_empresas: 1 },
    { codigo: "leve_escritorio", ativo: true, mensalidade_em_centavos: 24_900, limite_de_empresas: 5 },
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
  // Agora cobre TODOS os planos, e não uma lista única: cada plano tem a sua, e
  // uma promessa exagerada pode entrar em qualquer uma delas.
  const inclui = PLANOS.flatMap((p) => oQueIncluiO(p)).join(" | ");

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

describe("o código do plano não diverge entre o TypeScript e o banco", () => {
  /**
   * `FORMATO_DO_CODIGO` espelha o CHECK `planos_codigo_check`. Se um mudar e o
   * outro não, volta a existir um código que passa num lado e é recusado no
   * outro — e a descoberta é um `insert` recusado em produção, como aconteceu
   * em 25/08 com `leve-escritorio`.
   */
  const migracoes = readdirSync(join("supabase", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join("supabase", "migrations", f), "utf8"));

  it("a régua do banco existe numa migração", () => {
    const comCheck = migracoes.filter((sql) => sql.includes("codigo ~ "));
    expect(
      comCheck.length,
      "nenhuma migração declara o formato do código de plano; se o CHECK mudou de forma, esta guarda virou decoração.",
    ).toBeGreaterThan(0);
  });

  it("a régua do banco e a do TypeScript são a mesma", () => {
    const sql = migracoes.find((s) => s.includes("codigo ~ "))!;
    const doBanco = sql.match(/codigo ~ '([^']+)'/u);
    expect(doBanco, "não achei a expressão do CHECK").not.toBeNull();

    expect(
      doBanco![1],
      `o banco exige ${doBanco![1]} e o código exige ${FORMATO_DO_CODIGO.source}. ` +
        "Um plano válido de um lado é recusado do outro.",
    ).toBe(FORMATO_DO_CODIGO.source);
  });
});

describe("a página de preços não promete leitura no preço de quem não lê", () => {
  /**
   * O defeito que esta guarda existe para impedir aconteceu em 25/08, no mesmo
   * dia em que o plano leve nasceu, e passou por TODOS os outros testes.
   *
   * A página tinha um título ("Preços: quanto custa receber os editais já
   * lidos") e uma descrição ("A partir de R$ 59 por mês, com a leitura diária
   * dos editais de maior aderência") escritos quando o plano mais barato custava
   * R$ 800 e lia o documento de todo edital. As duas frases usavam
   * `MAIS_BARATO`, então elas se ATUALIZARAM SOZINHAS para R$ 59 e continuaram
   * prometendo leitura — o preço mudou, a promessa ficou, e o resultado é a
   * página anunciando por R$ 59 exatamente aquilo que o plano de R$ 59 declara,
   * três parágrafos abaixo, que não faz.
   *
   * Nenhuma guarda pegou porque nenhuma comparava a PROMESSA com a
   * PROFUNDIDADE do plano cujo preço ela cita.
   */
  const pagina = readFileSync(join("src", "app", "precos", "page.tsx"), "utf8");

  const maisBarato = [...PLANOS].sort(
    (a, b) => a.mensalidadeEmCentavos - b.mensalidadeEmCentavos,
  )[0];

  /**
   * Palavras que afirmam que alguém abriu o arquivo do edital.
   *
   * A régua é grosseira DE PROPÓSITO, e vale dizer por quê: ela reprova até
   * "se lemos o arquivo ou não", que é uma frase honesta. Nenhuma expressão
   * regular distingue promessa de ressalva sem errar de outro jeito, e o custo
   * dos dois erros é assimétrico — reprovar uma frase honesta custa uma
   * reescrita, e aprovar uma frase mentirosa custa um reembolso.
   *
   * A saída, quando a reprovação for injusta, não é afrouxar a régua: é parar
   * de citar o preço do plano mais barato na mesma frase em que se fala de
   * leitura. Foi juntar as duas coisas que criou o defeito.
   */
  const PROMESSA_DE_LEITURA = /j[áa] lidos?|leitura|lemos|lidos/i;

  it("o plano mais barato é de lista — se deixar de ser, esta guarda precisa ser relida", () => {
    // A guarda inteira assume isto. Se um dia o mais barato voltar a ler, ela
    // passa a proibir uma frase verdadeira, e é aqui que se descobre.
    expect(maisBarato.profundidade).toBe("lista");
  });

  it("o título não promete edital lido", () => {
    const titulo = pagina.match(/const TITULO = "([^"]+)"/u);
    expect(titulo, "não achei `const TITULO` na página").not.toBeNull();
    expect(
      titulo![1],
      `o título promete leitura, e o plano mais barato ("${maisBarato.codigo}") não lê o documento.`,
    ).not.toMatch(PROMESSA_DE_LEITURA);
  });

  it("a descrição não promete leitura junto do preço mais barato", () => {
    const inicio = pagina.indexOf("const DESCRICAO");
    expect(inicio, "não achei `const DESCRICAO` na página").toBeGreaterThan(-1);
    const descricao = pagina.slice(inicio, pagina.indexOf("const ATUALIZADO"));

    // A descrição cita `MAIS_BARATO`. Citar o preço de quem não lê e falar de
    // leitura na mesma frase é a armadilha exata.
    if (descricao.includes("MAIS_BARATO")) {
      expect(
        descricao,
        "a descrição cita o preço do plano mais barato E promete leitura. " +
          "Foi assim que a página passou a anunciar por R$ 59 o que o plano de R$ 59 não faz.",
      ).not.toMatch(PROMESSA_DE_LEITURA);
    }
  });

  it("a página nomeia o limite do plano de lista em algum lugar do corpo", () => {
    // Não basta não mentir: o limite precisa estar dito. Se a lista de
    // `O_QUE_O_PLANO_DE_LISTA_NAO_FAZ` deixar de ser renderizada num refactor,
    // a página fica tecnicamente honesta e praticamente omissa.
    expect(
      pagina,
      "a página não renderiza `O_QUE_O_PLANO_DE_LISTA_NAO_FAZ`: o cliente de R$ 59 não tem onde ler que não abrimos o arquivo.",
    ).toContain("O_QUE_O_PLANO_DE_LISTA_NAO_FAZ");
  });
});
