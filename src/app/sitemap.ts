import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { GUIAS_PUBLICADOS, PAGINAS_INSTITUCIONAIS, PAGINAS_PRODUTO } from "@/lib/guias";
import { ARTIGOS_PUBLICADOS } from "@/lib/blog";
import {
  caminhoDoMunicipio,
  MEDIDO_EM,
  medidoEmDoMunicipio,
  municipiosPublicaveis,
} from "@/lib/regioes";
import { caminhoDoPost, todosOsPosts } from "@/lib/posts/acervo";
import { COLETADO_EM, ufsComAbertos } from "@/lib/abertos/acervo";
import { temPaginaDeUf } from "@/lib/abertos/paginas";

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
      // A data do município, e não a da coleta: uma página cuja UF não foi
      // coletada não mudou, e anunciar que mudou ensina o rastreador a
      // desconfiar do campo em todas as outras.
      lastModified: new Date(medidoEmDoMunicipio(m)),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),

    /*
     * Os posts do dia. FALTAVAM AQUI, e a ausência esvaziava o modelo inteiro.
     *
     * O site é um guia que publica licitações como notícia datada, e é dessa
     * publicação diária que vêm os leitores. Fora do sitemap e sem link em lugar
     * nenhum — `postsDoMunicipio` existia e não era chamada por página alguma —,
     * os 25 posts de 16/08 nasceram órfãos: URL válida, HTTP 200, e nenhum
     * caminho até ela.
     *
     * `changeFrequency: "never"` é o valor honesto: post de edital é notícia
     * datada e não muda depois de publicado. O que muda é o mundo em volta — o
     * prazo encerra —, e disso a própria página cuida ao renderizar.
     *
     * Prioridade acima da página de município porque o post traz o objeto
     * literal e as datas do certame: é ele que responde a busca de quem procura
     * aquele edital específico.
     */
    ...todosOsPosts().map((post) => ({
      url: `${SITE.url}${caminhoDoPost(post)}`,
      lastModified: new Date(post.postadoEm),
      changeFrequency: "never" as const,
      priority: 0.7,
    })),

    /*
     * A listagem de abertos, pela lição do parágrafo acima: página fora do
     * sitemap e sem link é URL órfã, e foi assim que 25 posts nasceram
     * invisíveis em 16/08.
     *
     * `daily` aqui é literal, não otimista: o retrato é regravado a cada
     * coleta, e `lastModified` é a hora da coleta — não a do build. Prioridade
     * alta porque é a página que responde a busca mais frequente do setor
     * ("licitações abertas"), com dado que só nós temos agregado.
     *
     * Só as UF que passaram no portão de `paginas.ts`: a lista vem da mesma
     * função que gera as rotas, então não existe um segundo lugar capaz de
     * sitemapear estado que não virou página.
     */
    {
      url: `${SITE.url}/editais-abertos/`,
      lastModified: new Date(COLETADO_EM),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    ...ufsComAbertos()
      .filter(temPaginaDeUf)
      .map((u) => ({
        url: `${SITE.url}/editais-abertos/${u.uf.toLowerCase()}/`,
        lastModified: new Date(COLETADO_EM),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
  ];
}
