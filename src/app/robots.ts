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
/**
 * As cópias de teste do site NÃO podem ser indexadas.
 *
 * Cada pull request gera um endereço `licitante-vencedor-git-*.vercel.app` com
 * o site inteiro respondendo 200. Foram mais de 130 até agora, e o Ahrefs
 * flagrou duas recebendo visita: `.../privacidade/` e `.../jornada/`. São
 * cópias completas do conteúdo competindo com o domínio real, que é o pior
 * tipo de conteúdo duplicado, porque nenhuma delas tem por que ganhar.
 *
 * `VERCEL_ENV` vale "production" só no domínio de verdade; em preview e em
 * desenvolvimento vale outra coisa. Fora de produção, o robots proíbe tudo.
 *
 * Isto sozinho não basta, e por isso `next.config.ts` também manda
 * `X-Robots-Tag: noindex` fora de produção: o robots.txt pede para não
 * RASTREAR, e um endereço descoberto por link de fora pode ser indexado mesmo
 * sem rastreio. O cabeçalho é o que proíbe indexar.
 */
function ehProducao(): boolean {
  // Sem a variável, presume produção: errar para o lado de bloquear tiraria o
  // site de verdade do índice, que é um estrago muito maior que o duplicado.
  const ambiente = process.env.VERCEL_ENV;
  return !ambiente || ambiente === "production";
}

export default function robots(): MetadataRoute.Robots {
  if (!ehProducao()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

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
