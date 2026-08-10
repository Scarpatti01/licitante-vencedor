import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Decisão da Fase 3: liberamos todos os crawlers, inclusive os de IA.
 * O diferencial do site é frescor de dado — nada disso é memorizável por um modelo,
 * então bloquear reduziria visibilidade sem proteger nada.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/busca"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
