import { pracasParaBusca } from "@/lib/regioes";

/**
 * A lista de praças da busca, como arquivo, e não dentro de cada página.
 *
 * ## O defeito, medido em 20/09/2026
 *
 * `BuscaDePracas` recebia a lista por propriedade, e a decisão estava certa
 * quando foi tomada: o comentário dela fala em "96 linhas, ~7 KB". Só que a
 * cobertura cresceu e ninguém remediu. Na data acima eram 1246 praças, 147 KB
 * de JSON — 21 vezes o que o desenho supunha.
 *
 * O componente mora em `Navegacao.tsx`, que é o menu de TODA página. Então a
 * lista ia junto em todo documento do site, e também em toda resposta de
 * prefetch de rota, que é como o Next adianta o clique seguinte.
 *
 * Abrir a home, medido no navegador com o build de produção:
 *
 *     1703 KB descomprimidos, em 29 respostas
 *     1096 KB deles eram a MESMA lista, baixada 6 vezes
 *     (uma no documento e uma em cada um dos 5 prefetches)
 *
 * Sessenta e quatro por cento do que o visitante baixava para ver a primeira
 * tela era a mesma lista de cidades, repetida.
 *
 * ## Por que sai daqui, e não do `public/`
 *
 * A lista é derivada de `dados/agregados.json`, que a coleta reescreve todo
 * dia. Um arquivo em `public/` seria uma segunda cópia para alguém lembrar de
 * regenerar, e "alguém lembrar" é o que falha. Aqui ela sai da MESMA função que
 * o servidor já usava, e `force-static` faz o Next pré-renderizar o arquivo no
 * build: mesma origem de verdade, mesmo custo de servir.
 *
 * ## O que isto NÃO muda
 *
 * Nada de SEO. Conferido no HTML de produção antes da troca: zero links
 * `/licitacoes/uf/cidade/` renderizados. A lista nunca virou link no documento
 * — ela só alimenta o filtro que roda no navegador, e a navegação é por
 * `router.push`. As páginas regionais são descobertas pelo sitemap e pelo
 * acordeão de praças, que não passam por aqui.
 */

export const dynamic = "force-static";

export function GET() {
  return Response.json(pracasParaBusca());
}
