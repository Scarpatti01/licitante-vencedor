import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { GUIAS_PUBLICADOS, PAGINAS_INSTITUCIONAIS, PAGINAS_PRODUTO } from "@/lib/guias";
import { ARTIGOS_PUBLICADOS } from "@/lib/blog";
import { caminhoDoMunicipio, MEDIDO_EM, municipiosPublicaveis } from "@/lib/regioes";

/**
 * Só entram no sitemap páginas com conteúdo próprio.
 * Os 338 endereços do acervo redirecionam 301 e, por definição, não são
 * sitemapeáveis — cada um volta para cá quando ganhar conteúdo real.
 *
 * As listas derivam de `@/lib/guias` e `@/lib/blog`: publicar um hub ou um
 * artigo entra aqui sozinho. As rotas do produto (`(app)`) NÃO entram, e não é
 * esquecimento — são páginas por empresa, bloqueadas no robots.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: agora, changeFrequency: "daily", priority: 1 },
    ...GUIAS_PUBLICADOS.map((guia) => ({
      url: `${SITE.url}${guia.href}`,
      lastModified: agora,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    /*
     * Artigos com prioridade abaixo dos hubs e acima das institucionais.
     * `lastModified` é a data de verificação do próprio artigo, não `agora`:
     * carimbar tudo com a data do build ensina o rastreador a ignorar o campo,
     * e quem publica pouco e revisa de verdade perde justamente o sinal que
     * teria vantagem em dar.
     */
    ...ARTIGOS_PUBLICADOS.map((artigo) => ({
      url: `${SITE.url}/blog/${artigo.slug}/`,
      lastModified: new Date(`${artigo.verificadoEm}T12:00:00-03:00`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...PAGINAS_PRODUTO.map((p) => ({
      url: `${SITE.url}${p.href}`,
      lastModified: agora,
      changeFrequency: "weekly" as const,
      priority: p.prioridade,
    })),
    ...PAGINAS_INSTITUCIONAIS.map((p) => ({
      url: `${SITE.url}${p.href}`,
      lastModified: agora,
      changeFrequency: "monthly" as const,
      priority: p.prioridade,
    })),
    /*
     * As regionais entram sozinhas — e só as que passaram no portão de
     * `regioes.ts`, porque a lista vem da mesma função que gera as rotas. Não
     * existe um segundo lugar capaz de discordar dela e sitemapear uma página
     * que não foi construída.
     *
     * `lastModified` é a data da COLETA, não a do build: é ela que diz quando o
     * conteúdo mudou de fato. Carimbar `agora` faria toda regional parecer
     * atualizada a cada deploy e ensinaria o rastreador a ignorar o campo.
     *
     * Prioridade abaixo dos artigos: elas atendem busca com intenção local, que
     * é valiosa, mas o texto é gerado a partir de agregado e não substitui um
     * guia escrito.
     */
    ...municipiosPublicaveis().map((m) => ({
      url: `${SITE.url}${caminhoDoMunicipio(m)}`,
      lastModified: new Date(MEDIDO_EM),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
