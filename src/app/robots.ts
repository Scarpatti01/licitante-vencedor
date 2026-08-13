import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Decisão da Fase 3: liberamos todos os crawlers, inclusive os de IA.
 * O diferencial do site é frescor de dado — nada disso é memorizável por um modelo,
 * então bloquear reduziria visibilidade sem proteger nada.
 *
 * O produto é o contrário e está fechado. As rotas de `(app)` mostram dado de
 * UMA empresa: score, documentação pendente, quais certames ela disputa. Nada
 * ali tem valor de busca, e tudo ali tem valor competitivo para o concorrente do
 * cliente. Isto não é controle de acesso — quem faz isso é a sessão e a RLS —, é
 * evitar que uma página que escape por descuido vire resultado indexado, que é
 * um estrago difícil de desfazer.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/busca",
          "/painel",
          "/oportunidades",
          "/perfil",
          "/onboarding",
          "/configuracoes",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
