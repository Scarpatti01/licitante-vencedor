import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { GUIAS_PUBLICADOS, PAGINAS_INSTITUCIONAIS } from "@/lib/guias";

/**
 * Só entram no sitemap páginas com conteúdo próprio.
 * Os 338 endereços do acervo redirecionam 301 e, por definição, não são
 * sitemapeáveis — cada um volta para cá quando ganhar conteúdo real.
 *
 * A lista de guias deriva de `@/lib/guias`: publicar um hub entra aqui sozinho.
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
    ...PAGINAS_INSTITUCIONAIS.map((p) => ({
      url: `${SITE.url}${p.href}`,
      lastModified: agora,
      changeFrequency: "monthly" as const,
      priority: p.prioridade,
    })),
  ];
}
