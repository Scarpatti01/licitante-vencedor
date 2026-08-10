import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Só entram no sitemap páginas com conteúdo próprio.
 * Os 338 endereços do acervo redirecionam 301 e, por definição, não são
 * sitemapeáveis — cada um volta para cá quando ganhar conteúdo real.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: agora, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/lei-14133/`, lastModified: agora, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/jurisprudencia/`, lastModified: agora, changeFrequency: "monthly", priority: 0.9 },
  ];
}
