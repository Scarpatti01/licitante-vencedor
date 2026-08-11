import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { GUIAS_PUBLICADOS } from "@/lib/guias";

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
    { url: `${SITE.url}/blog/`, lastModified: agora, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE.url}/sobre/`, lastModified: agora, changeFrequency: "yearly", priority: 0.5 },
  ];
}
