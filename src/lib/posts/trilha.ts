import { SITE } from "../site";
import { caminhoDoMunicipio, municipioPorSlug } from "../regioes";
import { caminhoDoPost } from "./acervo";
import type { PostDeEdital } from "./tipos";

export const CAMINHO_DO_HISTORICO = "/editais-publicados/";

/** A praça só entra na trilha quando sua página passou no portão de publicação. */
export function trilhaDoPost(post: PostDeEdital, titulo: string) {
  const praca = municipioPorSlug(post.uf, post.municipioSlug);
  const itens = [
    { name: "Início", item: `${SITE.url}/` },
    { name: "Editais publicados", item: `${SITE.url}${CAMINHO_DO_HISTORICO}` },
    ...(praca
      ? [{ name: `Licitações em ${praca.municipio}`, item: `${SITE.url}${caminhoDoMunicipio(praca)}` }]
      : []),
    { name: titulo, item: `${SITE.url}${caminhoDoPost(post)}` },
  ];
  return {
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, i) => ({ "@type": "ListItem", position: i + 1, ...item })),
  };
}
