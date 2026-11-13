import { AUTHOR, SITE } from "@/lib/site";
import { OFERTA } from "./oferta";

/**
 * A arte do produto: a mesma que a página de venda mostra.
 *
 * Mora aqui, e não como texto solto no JSX, porque o Google cobra que a imagem
 * dos dados estruturados seja a do produto que a página exibe. Com o caminho em
 * um lugar só, trocar a arte troca as duas coisas juntas.
 */
export const IMAGEM_DO_PRODUTO = "/workbook-do-licitante-produto.webp";

/**
 * O Workbook como `Product`, do jeito que o Google lê.
 *
 * ## O que faltava, e como apareceu
 *
 * Em 30/09/2026 a Inspeção de URL do Search Console marcou `/jornada/` com um
 * erro crítico, "O campo image não foi encontrado", e dois avisos opcionais,
 * `hasMerchantReturnPolicy` e `shippingDetails`. Com erro crítico o item fica
 * inelegível para o resultado de produto, e a página perde o preço e a
 * garantia que apareceriam na busca.
 *
 * ## Produto digital, sem inventar devolução física
 *
 * Em 13/11 o Search Console pediu `returnMethod` na política aninhada.
 * Os valores documentados pelo Google são correio, loja e quiosque; nenhum
 * descreve o reembolso deste PDF/ePub e da Jornada. `ReturnByMail` não é e-mail.
 * Não declaramos frete nem política logística de devolução para esse produto.
 * A entrega e a garantia reais permanecem na oferta textual e na página.
 *
 * Google pode continuar recomendando os campos opcionais de frete/devolução.
 * Isso não justifica inventar logística nem garante resultado enriquecido.
 * Referência: developers.google.com/search/docs/appearance/structured-data/merchant-listing
 */
export function produtoEmDadosEstruturados(checkoutAberto: boolean, descricao: string) {
  return {
    "@type": "Product",
    "@id": `${SITE.url}/jornada/#produto`,
    name: OFERTA.nomeCompleto,
    description: descricao,
    image: `${SITE.url}${IMAGEM_DO_PRODUTO}`,
    brand: { "@type": "Brand", name: SITE.name },
    author: { "@type": "Person", name: AUTHOR.name },
    offers: {
      "@type": "Offer",
      price: String(OFERTA.preco),
      priceCurrency: "BRL",
      availability: checkoutAberto
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
      url: `${SITE.url}/jornada/`,
      description: `Entrega digital imediata. Garantia incondicional de ${OFERTA.diasDeGarantia} dias, com reembolso sem necessidade de justificativa.`,
    },
  };
}
