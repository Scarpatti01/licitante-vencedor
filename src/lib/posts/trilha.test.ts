import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { caminhoDoPost, todosOsPosts } from "./acervo";
import { CAMINHO_DO_HISTORICO, trilhaDoPost } from "./trilha";
import { SITE } from "../site";
import { municipioPorSlug } from "../regioes";
import sitemap from "../../app/sitemap";

describe("a trilha dos editais não fabrica páginas municipais", () => {
  it("todos os destinos de todos os editais existem no catálogo público", () => {
    const urls = new Set(sitemap().map((e) => e.url));
    for (const post of todosOsPosts()) {
      const trilha = trilhaDoPost(post, post.objeto).itemListElement;
      expect(trilha.at(-1)?.item).toBe(`${SITE.url}${caminhoDoPost(post)}`);
      for (const [i, item] of trilha.entries()) {
        expect(item.position).toBe(i + 1);
        expect(urls.has(item.item), `${caminhoDoPost(post)} aponta para ${item.item}`).toBe(true);
      }
    }
  });

  it("sem página municipal, oferece o histórico sem link para um 404", () => {
    const post = todosOsPosts()[0];
    const semPraca = { ...post, municipioSlug: "municipio-sem-pagina-publicada" };
    const trilha = trilhaDoPost(semPraca, "Edital de exemplo").itemListElement;
    expect(trilha).toHaveLength(3);
    expect(trilha[1].item).toBe(`${SITE.url}${CAMINHO_DO_HISTORICO}`);
    expect(trilha.some((p) => p.name.startsWith("Licitações em"))).toBe(false);
  });

  it("preserva o caminho municipal quando a página existe", () => {
    const post = todosOsPosts().find((p) => municipioPorSlug(p.uf, p.municipioSlug));
    expect(post).toBeDefined();
    expect(trilhaDoPost(post!, post!.objeto).itemListElement).toHaveLength(4);
  });

  it("o histórico tem uma lista completa no HTML e não uma janela dos posts recentes", () => {
    const fonte = readFileSync("src/app/editais-publicados/page.tsx", "utf8");
    expect(fonte).toContain("todosOsPosts()");
    expect(fonte).toContain("href={caminhoDoPost(post)}");
    expect(fonte).not.toMatch(/posts\.slice\(/);
    expect(readFileSync("src/components/RodapeSite.tsx", "utf8")).toContain(CAMINHO_DO_HISTORICO);
    expect(readFileSync("src/app/blog/page.tsx", "utf8")).toContain(CAMINHO_DO_HISTORICO);
  });
});
