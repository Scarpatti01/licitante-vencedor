import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Coleta vermelha quer dizer "alguém tem de olhar", e só isso.
 *
 * ## O defeito
 *
 * De 03/09 a 02/10 o crédito do Gemini esteve esgotado. A leva de posts foi
 * recusada todo dia, o passo anunciou com `::error`, e ninguém viu durante um
 * mês. A anotação estava certa; o problema era onde ela caía: numa execução
 * que já era vermelha quase todo dia. Das 41 execuções vermelhas entre 02/09 e
 * 02/10, 33 eram só uma ou duas UFs com `fetch failed` contra o PNCP, com a
 * junção funcionando e o dia versionado. Vermelho todo dia ensina a não olhar.
 *
 * Job vermelho é a única coisa que o GitHub notifica sozinho num cron (ver o
 * comentário de "Avisar que a coleta foi recusada" em `coletar-pncp.yml`).
 * Então o vermelho precisa ser raro e verdadeiro:
 *
 *   - UF tolerada NÃO pinta a execução (vira aviso amarelo na junção);
 *   - coleta recusada CONTINUA pintando;
 *   - leva de posts recusada PASSA a pintar, no fim, depois do commit.
 */

const WORKFLOWS = join(import.meta.dirname, "..", "..", ".github", "workflows");
const PARALELO = readFileSync(join(WORKFLOWS, "coletar-pncp-paralelo.yml"), "utf8");
const COLETAS = [
  ["coletar-pncp-paralelo.yml", PARALELO],
  ["coletar-pncp.yml", readFileSync(join(WORKFLOWS, "coletar-pncp.yml"), "utf8")],
] as const;

function passos(yaml: string): string[] {
  return yaml.split(/^ {6}- name: /m).slice(1);
}

function passo(yaml: string, nome: string): string {
  const bloco = passos(yaml).find((b) => b.startsWith(nome));
  expect(bloco, `não achei o passo "${nome}"`).toBeDefined();
  return bloco!;
}

function posicao(yaml: string, nome: string): number {
  return passos(yaml).findIndex((b) => b.startsWith(nome));
}

describe("UF tolerada não pinta a execução de vermelho", () => {
  it("o job de cada UF tem `continue-on-error`, no nível do job", () => {
    const job = PARALELO.slice(PARALELO.indexOf("\n  coletar:\n"), PARALELO.indexOf("\n    steps:", PARALELO.indexOf("\n  coletar:\n")));
    expect(job, "o recorte do job `coletar` veio vazio").toContain("matrix:");
    expect(job).toMatch(/^ {4}continue-on-error: true$/m);
  });

  it("a junção continua rodando com UF falhando", () => {
    const juntar = PARALELO.slice(PARALELO.indexOf("\n  juntar:\n"));
    expect(juntar).toMatch(/^ {4}if: always\(\)$/m);
  });

  it("a coleta parcial vira aviso amarelo, e não some", () => {
    const anunciar = passo(PARALELO, "Anunciar a coleta parcial");
    expect(anunciar).toContain("if: steps.classe.outputs.classe == 'parcial-aceitavel'");
    expect(anunciar).toContain("::warning");
    expect(anunciar).toContain("GITHUB_STEP_SUMMARY");
  });

  it("a coleta recusada continua vermelha", () => {
    const avisar = passo(PARALELO, "Avisar que a coleta foi recusada");
    expect(avisar).toContain("::error");
    expect(avisar).toContain("exit 1");
  });
});

describe("leva de posts recusada pinta a execução de vermelho", () => {
  it.each(COLETAS)("%s: o passo de posts registra a recusa", (_nome, yaml) => {
    const publicar = passo(yaml, "Publicar a leva de posts do dia");
    expect(publicar).toMatch(/^ {8}id: posts$/m);
    expect(publicar).toContain('echo "recusada=true" >> "$GITHUB_OUTPUT"');
  });

  it.each(COLETAS)("%s: cobra a recusa no fim, falhando de verdade", (_nome, yaml) => {
    const cobrar = passo(yaml, "Cobrar a leva de posts recusada");
    expect(cobrar).toContain("if: steps.posts.outputs.recusada == 'true'");
    expect(cobrar).toContain("exit 1");
    expect(cobrar, "um `continue-on-error` aqui apagaria o sinal outra vez").not.toMatch(
      /continue-on-error/,
    );
  });

  it.each(COLETAS)("%s: a cobrança vem DEPOIS do commit do agregado", (_nome, yaml) => {
    // Antes do commit, o vermelho custaria o agregado do dia por causa de um
    // post, que é o que o `continue-on-error` do passo de posts impede.
    const versionar = passos(yaml).findIndex((b) => b.startsWith("Versionar agregado"));
    expect(versionar, "não achei o passo de versionar").toBeGreaterThan(-1);
    expect(posicao(yaml, "Cobrar a leva de posts recusada")).toBeGreaterThan(versionar);
  });
});
