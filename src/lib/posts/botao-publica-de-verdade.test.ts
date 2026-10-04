import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O botão `publicar-posts.yml` publica, e não briga com a coleta por isso.
 *
 * ## O defeito
 *
 * Até 02/10 o botão tinha `contents: read` e nenhum passo de commit. O script
 * gravava `dados/posts/<dia>.json` no runner, e o arquivo morria com ele. Isso
 * passou despercebido porque o botão nasceu para investigar, e investigar
 * funcionava: o log mostrava `com leitura: n de 5`. Apareceu no dia em que se
 * precisou dele para publicar. O crédito do Gemini voltou às 17h, a coleta já
 * tinha passado, e a leva lida (4 de 5) não chegou ao site.
 *
 * ## O risco que o conserto cria, e que estas guardas cobrem
 *
 * Com o botão versionando, dois processos escrevem o mesmo arquivo do dia. Se
 * a coleta for a segunda a empurrar, o rebase dela conflita e ela perde o
 * commit do AGREGADO por causa de um post. Por isso o botão recusa publicar
 * com coleta rodando ou com a leva do dia já versionada, e a coleta não publica
 * quando a leva do dia já existe, no checkout dela ou na `main`.
 *
 * ## E a segunda coleta não troca a primeira (04/10)
 *
 * Até 04/10 a coleta só pulava a leva que chegava à `main` depois do checkout,
 * e regravava a da própria tentativa anterior. Em 03/10 isso trocou cinco posts
 * publicados às 09:46 UTC por outros cinco às 10:58: as páginas saem destes
 * arquivos, então as primeiras sumiram, e a leitura foi paga duas vezes.
 */

const WORKFLOWS = join(import.meta.dirname, "..", "..", "..", ".github", "workflows");
const BOTAO = readFileSync(join(WORKFLOWS, "publicar-posts.yml"), "utf8");
const COLETAS = ["coletar-pncp-paralelo.yml", "coletar-pncp.yml"].map(
  (nome) => [nome, readFileSync(join(WORKFLOWS, nome), "utf8")] as const,
);
const SCRIPT = readFileSync(
  join(import.meta.dirname, "..", "..", "..", "scripts", "publicar-posts.ts"),
  "utf8",
);

/** O corpo do passo com este nome, até o próximo passo. */
function passo(yaml: string, nome: string): string {
  const bloco = yaml.split(/^ {6}- name: /m).find((b) => b.startsWith(nome));
  expect(bloco, `não achei o passo "${nome}"`).toBeDefined();
  return bloco!;
}

describe("o botão publica de verdade", () => {
  it("pode escrever no repositório", () => {
    const bloco = BOTAO.slice(BOTAO.indexOf("\npermissions:"), BOTAO.indexOf("\nconcurrency:"));
    expect(bloco).toMatch(/^ {2}contents: write$/m);
  });

  it("versiona a leva, e só fora da simulação", () => {
    const versionar = passo(BOTAO, "Versionar a leva");
    expect(versionar).toContain("git add -f dados/posts/");
    expect(versionar).toContain("git commit -m");
    expect(versionar).toMatch(/if: .*!inputs\.simular/);
  });

  it("empurra com rebase e retentativa, como a coleta", () => {
    const versionar = passo(BOTAO, "Versionar a leva");
    expect(versionar).toMatch(/for tentativa in/);
    expect(versionar).toContain("git pull --rebase origin main || exit 1");
    expect(versionar).toContain("Leva não conseguiu versionar");
  });

  it("não roda no mesmo grupo de concorrência da coleta", () => {
    // O GitHub mantém só uma execução pendente por grupo e cancela a que
    // esperava. No grupo da coleta, um clique na hora errada cancelaria a
    // segunda coleta do dia.
    expect(BOTAO).not.toMatch(/group:\s*coletar-pncp/);
  });
});

describe("o botão e a coleta não escrevem o mesmo dia", () => {
  const conferir = () => passo(BOTAO, "Conferir se a leva de hoje pode ser publicada aqui");

  it("o botão recusa com coleta rodando ou na fila, nas duas coletas", () => {
    expect(conferir()).toContain("gh run list");
    for (const [nome] of COLETAS) expect(conferir()).toContain(nome);
    expect(conferir()).toMatch(/select\(\.status != "completed"\)/);
    expect(conferir()).toContain("exit 1");
  });

  it("o botão confere de novo logo antes de empurrar, e cede", () => {
    // A leitura pode levar muitos minutos. Uma coleta que começou no meio não
    // viu a leva no checkout dela e vai publicar o mesmo dia.
    const versionar = passo(BOTAO, "Versionar a leva");
    expect(versionar).toContain("gh run list");
    for (const [nome] of COLETAS) expect(versionar).toContain(nome);
    expect(versionar.indexOf("gh run list")).toBeLessThan(versionar.indexOf("git push"));
  });

  it("o botão recusa republicar um dia que já está no ar", () => {
    expect(conferir()).toContain('dados/posts/$dia.json');
    expect(conferir()).toContain("pode=false");
  });

  it("o passo de publicar só roda com a conferência dizendo que pode", () => {
    expect(passo(BOTAO, "Publicar\n")).toMatch(/steps\.conferir\.outputs\.pode == 'true'/);
  });

  it.each(COLETAS)("%s não publica de novo um dia que já tem leva", (_nome, yaml) => {
    const publicar = passo(yaml, "Publicar a leva de posts do dia");
    // No checkout: a leva da tentativa anterior desta coleta. Regravar trocaria
    // posts que já estão no ar, como em 03/10, quando cinco páginas sumiram uma
    // hora depois de publicadas. Na `main`: a leva do botão, que chegou depois
    // do checkout. Regravar essa conflitaria no rebase e custaria o agregado.
    expect(publicar).toContain('git cat-file -e "HEAD:dados/posts/$dia.json"');
    expect(publicar).toContain('|| git cat-file -e "origin/main:dados/posts/$dia.json"');
    expect(publicar, "a regra até 04/10 regravava a leva do checkout").not.toContain(
      '! git cat-file -e "HEAD:dados/posts/$dia.json"',
    );
    // A conferência vem ANTES de chamar o script, senão não evita nada.
    expect(publicar.indexOf("git cat-file")).toBeLessThan(publicar.indexOf("scripts/publicar-posts.ts"));
  });

  it("o dia do workflow é o dia do script", () => {
    // Se o script mudar o fuso do nome do arquivo, as duas conferências acima
    // passam a olhar para um arquivo que nunca existe, e param de proteger em
    // silêncio.
    expect(SCRIPT).toContain("const dia = agora.toISOString().slice(0, 10);");
    expect(conferir()).toContain("dia=$(date -u +%Y-%m-%d)");
    for (const [, yaml] of COLETAS) {
      expect(passo(yaml, "Publicar a leva de posts do dia")).toContain("dia=$(date -u +%Y-%m-%d)");
    }
  });
});
