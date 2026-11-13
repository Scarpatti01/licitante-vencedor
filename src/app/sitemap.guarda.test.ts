import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import { SITE } from "@/lib/site";
import { LEGACY_GONE, redirecionamentosAtivos } from "@/lib/legacy";
import { ROTAS_DO_PRODUTO, sobPrefixo } from "@/lib/auth/rotas";
import { caminhoDoMunicipio, medidoEmDoMunicipio, municipiosPublicaveis } from "@/lib/regioes";
import { abertosNoMunicipio, COLETADO_EM } from "@/lib/abertos/acervo";
import { todosOsPosts } from "@/lib/posts/acervo";
import { CAMINHO_DO_HISTORICO } from "@/lib/posts/trilha";

afterEach(() => vi.useRealTimers());

describe("o sitemap convida o Google somente para páginas públicas canônicas", () => {
  it("não contém duplicatas, redirecionamentos, remoções ou área privada", () => {
    const urls = sitemap().map((p) => p.url);
    expect(new Set(urls).size).toBe(urls.length);
    const removidos = new Set([...LEGACY_GONE, ...redirecionamentosAtivos().map((r) => r.source)]);
    for (const url of urls) {
      const u = new URL(url);
      expect(u.origin).toBe(SITE.url);
      expect(u.search).toBe("");
      expect(u.pathname.endsWith("/")).toBe(true);
      expect(sobPrefixo(u.pathname, ROTAS_DO_PRODUTO), url).toBe(false);
      expect(removidos.has(u.pathname), url).toBe(false);
    }
  });

  it("publicar o mesmo conteúdo outro dia não inventa novas datas", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
    const antes = sitemap();
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    expect(sitemap()).toEqual(antes);
  });

  it("o histórico acompanha a última publicação de edital", () => {
    const entrada = sitemap().find((e) => e.url === `${SITE.url}${CAMINHO_DO_HISTORICO}`);
    expect(entrada).toBeDefined();
    const posts = todosOsPosts();
    if (posts.length > 0) expect(entrada?.lastModified).toEqual(new Date(posts[0].postadoEm));
  });

  it("as páginas municipais consideram todos os conteúdos datados que exibem", () => {
    const entradas = new Map(sitemap().map((e) => [e.url, e]));
    const posts = todosOsPosts();
    for (const m of municipiosPublicaveis()) {
      const datas = [new Date(medidoEmDoMunicipio(m)).getTime()];
      if (abertosNoMunicipio(m.uf, m.slug)) datas.push(new Date(COLETADO_EM).getTime());
      for (const p of posts) {
        if (p.uf === m.uf && p.municipioSlug === m.slug) datas.push(new Date(p.postadoEm).getTime());
      }
      expect(entradas.get(`${SITE.url}${caminhoDoMunicipio(m)}`)?.lastModified).toEqual(new Date(Math.max(...datas)));
    }
  });
});
