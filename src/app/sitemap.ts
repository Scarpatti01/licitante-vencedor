import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Etapa 1: apenas a home.
 * As 349 URLs recuperadas do acervo entram na Etapa 2, em sitemaps segmentados.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE.url}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
