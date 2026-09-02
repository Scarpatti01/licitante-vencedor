import { afterEach, describe, expect, it } from "vitest";
import robots from "./robots";
import config from "../../next.config";

/**
 * As cópias de teste do site não podem entrar no Google.
 *
 * O DEFEITO QUE MOTIVOU ESTA GUARDA
 *
 * Cada pull request gera um endereço `licitante-vencedor-git-*.vercel.app` com
 * o site inteiro respondendo 200 e um `robots.txt` dizendo `Allow: /`. Foram
 * mais de 130 pull requests, e o relatório do Ahrefs de 02/09 flagrou duas
 * dessas cópias recebendo visita real. São cópias completas competindo com o
 * domínio de verdade pelo mesmo conteúdo.
 *
 * POR QUE DUAS PROTEÇÕES, E NÃO UMA
 *
 * `robots.txt` pede para não RASTREAR. Um endereço descoberto por link de fora
 * pode ser indexado sem nunca ter sido rastreado, e aí aparece na busca sem
 * título nem descrição. `X-Robots-Tag: noindex` é o que proíbe INDEXAR, e
 * alcança imagem e PDF, que o robots.txt cobre mal. Uma sem a outra deixa
 * metade do buraco aberto, então a guarda cobra as duas.
 *
 * O SENTIDO DO ERRO IMPORTA
 *
 * Sem a variável de ambiente, as duas contam como PRODUÇÃO. Errar para o lado
 * de bloquear tiraria o site real do índice, que é um estrago muito maior e
 * muito mais lento de desfazer do que o conteúdo duplicado que se conserta
 * aqui. A guarda cobra essa direção explicitamente.
 */

const ORIGINAL = process.env.VERCEL_ENV;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = ORIGINAL;
});

/** O `disallow` do robots pode vir string ou lista; normaliza para lista. */
function proibidos(regra: unknown): string[] {
  const d = (regra as { disallow?: string | string[] }).disallow;
  if (!d) return [];
  return Array.isArray(d) ? d : [d];
}

async function cabecalhosDe(ambiente: string | undefined) {
  if (ambiente === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = ambiente;
  return (await config.headers?.()) ?? [];
}

describe("preview do Vercel não é indexável", () => {
  it.each(["preview", "development"])("em %s o robots proíbe o site inteiro", (ambiente) => {
    process.env.VERCEL_ENV = ambiente;
    const regras = [robots().rules].flat();
    expect(regras.length, "o robots ficou sem regra nenhuma").toBeGreaterThan(0);
    for (const regra of regras) {
      expect(
        proibidos(regra),
        `em ${ambiente} o robots precisa proibir "/" inteiro, senão cada preview ` +
          `vira uma cópia do site competindo com o domínio real`,
      ).toContain("/");
    }
  });

  it.each(["preview", "development"])("em %s o site manda noindex", async (ambiente) => {
    const cabecalhos = await cabecalhosDe(ambiente);
    const todos = cabecalhos.flatMap((c) => c.headers);
    const noindex = todos.find((h) => h.key.toLowerCase() === "x-robots-tag");
    expect(
      noindex,
      `em ${ambiente} falta X-Robots-Tag; sem ele um preview linkado de fora ` +
        `pode ser indexado mesmo sem ser rastreado`,
    ).toBeDefined();
    expect(noindex?.value).toMatch(/noindex/i);
  });

  it("em produção o site continua liberado", () => {
    process.env.VERCEL_ENV = "production";
    const regras = [robots().rules].flat();
    for (const regra of regras) {
      expect(
        proibidos(regra),
        "produção não pode proibir a raiz: isso tira o site do Google",
      ).not.toContain("/");
    }
  });

  it("em produção nenhum noindex é enviado", async () => {
    const cabecalhos = await cabecalhosDe("production");
    const todos = cabecalhos.flatMap((c) => c.headers);
    expect(
      todos.some((h) => h.key.toLowerCase() === "x-robots-tag"),
      "produção está mandando X-Robots-Tag; isso tira o site do índice",
    ).toBe(false);
  });

  it("sem a variável, presume produção", async () => {
    // A direção do erro é deliberada, e é a metade da lição: um preview
    // indexado custa conteúdo duplicado; o domínio real com `noindex` custa o
    // site inteiro, e demora semanas para voltar.
    delete process.env.VERCEL_ENV;
    const regras = [robots().rules].flat();
    for (const regra of regras) {
      expect(proibidos(regra)).not.toContain("/");
    }
    const cabecalhos = await cabecalhosDe(undefined);
    expect(cabecalhos.flatMap((c) => c.headers).length).toBe(0);
  });

  it("o robots de produção continua escondendo a área logada", () => {
    // A regra que já existia não pode ter sido perdida no conserto.
    process.env.VERCEL_ENV = "production";
    const regras = [robots().rules].flat();
    const tudo = regras.flatMap(proibidos);
    for (const rota of ["/api/", "/painel", "/perfil"]) {
      expect(tudo, `${rota} saiu do disallow de produção`).toContain(rota);
    }
  });
});
