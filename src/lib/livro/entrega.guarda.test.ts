import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { carimboQueCabe, corpoQueCabe, linhaDoCarimbo } from "./carimbo";

/**
 * O livro é produto pago, e a rota que o entrega é a única porta.
 *
 * O que precisa continuar verdadeiro, e que nenhum teste de unidade comum
 * pegaria: a rota confere sessão e compra ANTES de tocar no arquivo, o carimbo
 * é obrigatório, e a resposta não pode ser guardada por intermediário nenhum.
 *
 * A guarda lê a rota de verdade, e não uma cópia da regra. Uma cópia envelhece
 * calada no dia em que alguém reordena as linhas do arquivo.
 */

const ROTA = "src/app/(app)/minha-jornada/livro/[formato]/route.ts";

function semComentarios(ts: string) {
  // Um comentário explicando a ordem não pode virar a prova da ordem.
  return ts.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const fonte = semComentarios(readFileSync(ROTA, "utf8"));

/** Em que linha aparece a primeira ocorrência, ou -1. */
function ondeAparece(trecho: string): number {
  const linhas = fonte.split("\n");
  return linhas.findIndex((l) => l.includes(trecho));
}

describe("a entrega do livro confere antes de entregar", () => {
  it("acha a rota para medir", () => {
    // Sem lastro, todas as buscas dariam -1 e as comparações abaixo passariam
    // por vacuidade.
    expect(fonte.length, "a rota sumiu ou está vazia").toBeGreaterThan(500);
    expect(ondeAparece("export async function GET")).toBeGreaterThanOrEqual(0);
  });

  it("confere a sessão antes de qualquer outra coisa", () => {
    const sessao = ondeAparece("usuarioAtual()");
    expect(sessao, "a rota não confere quem está logado").toBeGreaterThanOrEqual(0);
    expect(
      ondeAparece("baixarMestre("),
      "o mestre é lido antes de a sessão ser conferida",
    ).toBeGreaterThan(sessao);
  });

  it("confere a compra antes de ler o arquivo", () => {
    const compra = ondeAparece("estadoDaJornada()");
    const leitura = ondeAparece("baixarMestre(");
    expect(compra, "a rota não confere a compra").toBeGreaterThanOrEqual(0);
    expect(
      leitura,
      "o mestre é lido antes de a compra ser conferida: ler primeiro e conferir " +
        "depois é como vazamento começa",
    ).toBeGreaterThan(compra);
  });

  it("nega quem não comprou, e distingue de quem não está logado", () => {
    expect(fonte, "falta o 401 para quem não tem sessão").toMatch(/status:\s*401/);
    expect(fonte, "falta o 403 para quem está logado e não comprou").toMatch(/status:\s*403/);
  });

  it("nunca entrega o arquivo sem carimbo", () => {
    // O `catch` do carimbo tem de responder erro, e não seguir com o mestre.
    const carimbo = fonte.slice(fonte.indexOf("try {"), fonte.indexOf("return new NextResponse"));
    expect(carimbo, "não achei o bloco do carimbo").toContain("carimbarPdf");
    expect(carimbo).toContain("carimbarEpub");
    expect(
      /status:\s*500/.test(carimbo),
      "falha no carimbo precisa virar erro; entregar um exemplar anônimo perde " +
        "justamente a rastreabilidade que ele existe para dar",
    ).toBe(true);
  });

  it("proíbe qualquer intermediário de guardar a resposta", () => {
    // Sem isto, um proxy poderia servir ao próximo usuário o arquivo carimbado
    // com o nome do anterior.
    expect(fonte).toMatch(/"cache-control":\s*"private, no-store/);
  });
});

describe("o carimbo diz de quem é o exemplar", () => {
  it("traz o e-mail, que é o que identifica a compra", () => {
    const linha = linhaDoCarimbo({ nome: "Papelaria Silva", email: "contato@silva.com.br" });
    expect(linha).toContain("contato@silva.com.br");
    expect(linha).toContain("Papelaria Silva");
  });

  it("traz o aviso de intransferível e de reprodução proibida", () => {
    const linha = linhaDoCarimbo({ nome: "", email: "a@b.com.br" });
    expect(linha.toLowerCase()).toContain("intransferível");
    expect(linha.toLowerCase()).toContain("reprodução proibida");
  });

  it("funciona sem nome, porque nem toda conta tem empresa cadastrada", () => {
    const linha = linhaDoCarimbo({ nome: "   ", email: "so.email@exemplo.com.br" });
    expect(linha).toContain("so.email@exemplo.com.br");
    expect(linha.startsWith("so.email"), "sobrou um separador solto sem nome").toBe(true);
  });

  // Largura fingida: cada caractere ocupa `corpo * 0.5`.
  const largura = (t: string, c: number) => t.length * c * 0.5;

  it("não encolhe o que já cabe", () => {
    const curto = linhaDoCarimbo({ nome: "", email: "a@b.com" });
    expect(corpoQueCabe(largura, curto, 484)).toBe(6.5);
  });

  it("encolhe a letra antes de mexer no texto", () => {
    const medio = { nome: "Papelaria Silva e Filhos Ltda", email: "contato@papelariasilva.com.br" };
    const { texto, corpo } = carimboQueCabe(largura, medio, 300);
    expect(corpo, "não encolheu a letra").toBeLessThan(6.5);
    expect(texto, "encurtou o nome antes de esgotar a letra").toContain(
      "Papelaria Silva e Filhos Ltda",
    );
  });

  it("cabe mesmo no caso extremo, encurtando o nome e nunca o e-mail", () => {
    const extremo = {
      nome: "Construtora e Incorporadora Nossa Senhora Aparecida do Norte Sociedade Anônima",
      email: "departamento.de.licitacoes.e.contratos@construtoranossasenhoraaparecida.com.br",
    };
    const { texto, corpo } = carimboQueCabe(largura, extremo, 484);
    expect(largura(texto, corpo), "estourou a caixa").toBeLessThanOrEqual(484);
    expect(texto, "cortou o e-mail, que é o que identifica a compra").toContain(extremo.email);
    expect(texto.toLowerCase(), "cortou o aviso").toContain("reprodução proibida");
    expect(texto, "não encurtou o nome").toContain("…");
  });
});

describe("o que gera o livro roda em qualquer máquina", () => {
  /*
   * `gerar-pdf.mjs` trazia o caminho do Chromium do contêiner de
   * desenvolvimento escrito dentro dele. Funcionava aqui e só aqui: a primeira
   * execução de `publicar-livro.yml` morreu em 72 segundos com "executable
   * doesn't exist", e o livro não chegou ao balde.
   *
   * Caminho absoluto de máquina dentro do script é a classe do erro, e não o
   * caminho específico. A guarda procura a classe.
   */
  const SCRIPTS = [
    "livro/gerar-pdf.mjs",
    "livro/montar.py",
    "livro/gerar-epub.py",
    "livro/conferir-pdf.py",
    "livro/conferir-epub.py",
  ];

  it("acha os scripts para medir", () => {
    for (const caminho of SCRIPTS) {
      expect(readFileSync(caminho, "utf8").length, `${caminho} sumiu`).toBeGreaterThan(100);
    }
  });

  it.each(SCRIPTS)("%s não fixa caminho de máquina", (caminho) => {
    const fonte = readFileSync(caminho, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*(\/\/|#).*$/gm, "");
    // Diretórios que só existem numa máquina específica. `/tmp` entra porque
    // artefato em diretório temporário foi o que quase custou a fonte do livro.
    const suspeitos = fonte.match(/["'`](\/(opt|home|Users|root|tmp)\/[^"'`\s]*)["'`]/g) ?? [];
    expect(
      suspeitos,
      `${caminho} traz caminho absoluto de máquina: ${suspeitos.join(", ")}. ` +
        `Use variável de ambiente ou caminho relativo, senão o script roda só ` +
        `onde foi escrito e a publicação falha no runner.`,
    ).toEqual([]);
  });
});

describe("o balde do livro é fechado", () => {
  const migracao = readFileSync("supabase/migrations/20260828120000_o_balde_do_livro.sql", "utf8");

  it("cria o balde como privado", () => {
    expect(migracao).toMatch(/'livro'/);
    // `public = false` tanto na criação quanto no conflito: republicar a
    // migração não pode reabrir o balde.
    expect(migracao.match(/public\s*=\s*false|false,/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("não cria política de leitura para o balde", () => {
    // Sem política, o RLS nega por omissão. Uma política aqui abriria caminho de
    // leitura que não passa pela conferência de compra.
    expect(
      /create\s+policy/i.test(migracao),
      "a migração cria política no balde do livro: leitura só pelo servidor, " +
        "depois de conferir a compra",
    ).toBe(false);
  });
});
