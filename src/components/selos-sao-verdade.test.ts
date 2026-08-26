import { readFileSync, existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Cada selo do rodapé tem de ser verdade, conferida no próprio código.
 *
 * ## O card que motivou esta guarda
 *
 * A referência trazida em 26/08 pedia seis logos sob "integrado, seguro e em
 * conformidade com": gov.br, PNCP, ChatGPT, Oracle Cloud, "Blockchain Custody"
 * e Claude Code. Quatro eram falsos, e o mais perigoso é que nenhum deles
 * pareceria falso para quem não abre o `package.json`.
 *
 * É por isso que a guarda não é uma lista de proibidos: é uma exigência de
 * lastro. Toda marca de terceiro citada na faixa precisa aparecer nas
 * dependências ou nas chamadas de rede do projeto. Assim o teste continua
 * valendo para a próxima marca que ninguém previu, que é sempre a que entra.
 *
 * ## Por que uma faixa de selos merece teste
 *
 * Porque ela envelhece calada, igual aos números de lei de `limites-legais.ts`.
 * Ninguém abre o rodapé para conferir se o produto ainda usa o que ele anuncia.
 * O dia em que a IA trocar de fornecedor, é aqui que se descobre.
 */

const COMPONENTE = "src/components/SelosDeConfianca.tsx";

function fonte(): string {
  return readFileSync(COMPONENTE, "utf8");
}

/** Só o código: os comentários FALAM dos selos falsos, e devem falar. */
function codigo(): string {
  return fonte()
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

/** Os nomes declarados em `SELOS`, na ordem em que aparecem. */
function nomesDosSelos(): string[] {
  return [...codigo().matchAll(/^\s*nome: "([^"]+)"/gmu)].map((m) => m[1]);
}

describe("a faixa existe e não está vazia", () => {
  it("declara selos", () => {
    // Guarda sobre lista vazia é verde e inútil.
    expect(nomesDosSelos().length).toBeGreaterThanOrEqual(4);
  });

  it("todo selo diz o que é", () => {
    /*
     * Logo sem legenda insinua uma relação e deixa o leitor preencher o
     * sentido, que foi exatamente o buraco onde o card original enfiou a
     * palavra "conformidade".
     */
    const c = codigo();
    // Com valor entre aspas, simétrico ao de `nome`: sem isso o regex casava
    // também com `papel: string` da declaração do tipo, e a contagem dava um a
    // mais. Foi o próprio teste que acusou, na primeira execução.
    const papeis = [...c.matchAll(/^\s*papel:\s*\n?\s*"[^"]+"/gmu)];
    expect(papeis).toHaveLength(nomesDosSelos().length);
  });
});

describe("nenhum selo anuncia o que o projeto não usa", () => {
  /*
   * A lista dos quatro que vieram no card de referência. Não é a defesa
   * principal (a exigência de lastro, abaixo, é), mas nomeia os que já foram
   * propostos uma vez, com a explicação junto, para ninguém repropor por
   * esquecimento.
   */
  const JA_PROPOSTOS_E_FALSOS: [string, string][] = [
    ["ChatGPT", "a IA do projeto é o Gemini; não há OpenAI no código"],
    ["OpenAI", "a IA do projeto é o Gemini; não há OpenAI no código"],
    ["Oracle", "a hospedagem é Vercel e o banco é Supabase"],
    ["Blockchain", "não existe blockchain no produto"],
    ["Claude Code", "é a ferramenta que escreve o código, não parte do produto"],
  ];

  it("não repete nenhum dos selos falsos do card original", () => {
    const c = codigo();
    const culpados = JA_PROPOSTOS_E_FALSOS.filter(([marca]) =>
      new RegExp(marca.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu").test(c),
    ).map(([marca, porque]) => `${marca}: ${porque}`);

    expect(
      culpados,
      "Selo sem lastro no rodapé:\n\n" + culpados.join("\n"),
    ).toEqual([]);
  });
});

describe("as marcas de terceiro têm lastro no código", () => {
  /**
   * A defesa que vale para a marca que ainda não foi inventada.
   *
   * Cada selo que nomeia uma EMPRESA precisa de prova no projeto: uma
   * dependência instalada ou um domínio que o código realmente chama. Órgão
   * público e norma não entram nesta conta, porque a prova deles é de outra
   * natureza e está no teste seguinte.
   */
  const NAO_SAO_EMPRESA = ["gov.br", "PNCP", "Lei 14.133/2021", "LGPD"];

  /** Onde procurar lastro: dependências e chamadas de rede. */
  function provasDoProjeto(): string {
    const pacote = readFileSync("package.json", "utf8");
    const chamadas = [
      "src/lib/ia/loteGemini.ts",
      "src/lib/dados/supabase.ts",
    ]
      .filter((c) => existsSync(c))
      .map((c) => readFileSync(c, "utf8"))
      .join("\n");
    return `${pacote}\n${chamadas}`.toLowerCase();
  }

  it("toda empresa citada aparece nas dependências ou nas chamadas", () => {
    const provas = provasDoProjeto();
    const semLastro = nomesDosSelos()
      .filter((nome) => !NAO_SAO_EMPRESA.includes(nome))
      .filter((nome) => {
        // "Google Gemini" casa por qualquer uma das duas palavras: o pacote é
        // `@google/genai` e a URL é `generativelanguage.googleapis.com`.
        const partes = nome.toLowerCase().split(/\s+/);
        return !partes.some((parte) => provas.includes(parte));
      });

    expect(
      semLastro,
      "Marca no rodapé sem nenhuma prova no projeto:\n\n" +
        semLastro.join("\n") +
        "\n\nSe o produto passou a usar de verdade, a dependência ou a chamada " +
        "aparece no código e este teste passa sozinho. Se não passou, o selo é " +
        "propaganda enganosa.",
    ).toEqual([]);
  });
});

describe("os selos que não são empresa apontam para prova nossa", () => {
  it("a Lei 14.133 leva ao guia, e a LGPD à política de privacidade", () => {
    /*
     * Selo de conformidade que não leva a lugar nenhum é afirmação sem recibo.
     * Estes dois levam a páginas que existem, e é lá que o leitor confere.
     */
    const c = codigo();
    expect(c).toMatch(/href: "\/lei-14133\/"/);
    expect(c).toMatch(/href: "\/privacidade\/"/);

    expect(existsSync("src/app/lei-14133/page.tsx")).toBe(true);
    expect(existsSync("src/app/privacidade/page.tsx")).toBe(true);
  });

  it("a LGPD só é selo porque existe rotina de retenção, e não só texto", () => {
    /*
     * Qualquer site escreve "conforme a LGPD" numa página. O que sustenta o
     * selo é o apagamento acontecer: `retencao/decisoes.ts` define o prazo e a
     * migração de limpeza o executa.
     */
    expect(existsSync("src/lib/retencao/decisoes.ts")).toBe(true);
    const retencao = readFileSync("src/lib/retencao/decisoes.ts", "utf8");
    expect(retencao).toMatch(/DIAS_APOS_ENCERRAMENTO/);
  });
});

describe("os arquivos de marca existem", () => {
  it("todo `src` declarado tem arquivo em public/", () => {
    // Logo quebrado no rodapé é pior que logo nenhum: parece site abandonado,
    // que é o oposto do que uma faixa de confiança existe para dizer.
    const caminhos = [...codigo().matchAll(/src: "(\/marcas\/[^"]+)"/gu)].map(
      (m) => m[1],
    );

    expect(caminhos.length).toBeGreaterThan(0);
    for (const caminho of caminhos) {
      expect(existsSync(`public${caminho}`), `falta public${caminho}`).toBe(true);
    }
  });
});
