import type { Artigo } from "./tipos";
import { ATRASO_NO_PAGAMENTO } from "./artigos/atraso-no-pagamento-de-contrato-administrativo";
import { COMO_SABER_SE_SAIU_UMA_LICITACAO } from "./artigos/como-saber-se-saiu-uma-licitacao";
import { DOCUMENTOS_PARA_PARTICIPAR } from "./artigos/documentos-para-participar-de-licitacao";
import { PRAZO_PARA_IMPUGNAR_EDITAL } from "./artigos/prazo-para-impugnar-edital-de-licitacao";
import { QUANTAS_LICITACOES_POR_DIA } from "./artigos/quantas-licitacoes-sao-publicadas-por-dia";
import { VALE_A_PENA_PARTICIPAR } from "./artigos/vale-a-pena-participar-de-licitacao";

export type { Artigo, BlocoDeConteudo, IntencaoDeBusca } from "./tipos";
export { validarArtigo, contarPalavras, textoDoArtigo } from "./tipos";

/**
 * O catálogo de artigos — fonte única, como `guias.ts` é para os hubs.
 *
 * Publicar é virar uma flag: a rota, o índice do blog, o sitemap e os links
 * relacionados de cada guia derivam daqui. Não existe uma segunda lista capaz
 * de discordar desta, que foi o defeito que `guias.ts` já teve de corrigir uma
 * vez neste projeto.
 */
const CATALOGO: readonly Artigo[] = [
  ATRASO_NO_PAGAMENTO,
  COMO_SABER_SE_SAIU_UMA_LICITACAO,
  DOCUMENTOS_PARA_PARTICIPAR,
  PRAZO_PARA_IMPUGNAR_EDITAL,
  QUANTAS_LICITACOES_POR_DIA,
  VALE_A_PENA_PARTICIPAR,
];

export const ARTIGOS = CATALOGO;
export const ARTIGOS_PUBLICADOS = CATALOGO.filter((a) => a.publicado);

export function artigoPorSlug(slug: string): Artigo | null {
  return ARTIGOS_PUBLICADOS.find((a) => a.slug === slug) ?? null;
}

/** Os artigos de um hub, para o guia poder puxar quem aprofunda cada tema. */
export function artigosDoGuia(href: string): Artigo[] {
  return ARTIGOS_PUBLICADOS.filter((a) => a.guiaRelacionado === href);
}

/**
 * Outros artigos para oferecer ao fim da leitura.
 *
 * Prioriza quem divide o mesmo hub — é ali que a intenção do leitor continua —
 * e completa com os demais, para o bloco nunca aparecer com um item só. Leitor
 * que chega ao fim do texto sem próximo passo volta para o Google, e a sessão
 * termina no concorrente.
 */
export function artigosRelacionados(artigo: Artigo, quantidade = 2): Artigo[] {
  const mesmoTema = ARTIGOS_PUBLICADOS.filter(
    (a) => a.slug !== artigo.slug && a.guiaRelacionado === artigo.guiaRelacionado,
  );
  const restantes = ARTIGOS_PUBLICADOS.filter(
    (a) => a.slug !== artigo.slug && a.guiaRelacionado !== artigo.guiaRelacionado,
  );
  return [...mesmoTema, ...restantes].slice(0, quantidade);
}
