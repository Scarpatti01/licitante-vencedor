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
 * ## Entrega e devolução de um produto digital, sem inventar
 *
 * O livro é digital. Não há frete e não há o que devolver pelo correio. Os dois
 * campos descrevem o que de fato acontece:
 *
 *   - entrega: custo zero, acesso liberado na hora da compra, para o Brasil;
 *   - devolução: os dias de garantia de `OFERTA`, reembolso sem custo e sem
 *     exigir justificativa, que é o que a página promete no FAQ.
 *
 * Os dois saem de `OFERTA`: se a garantia mudar lá, muda aqui junto, e a busca
 * nunca mostra um prazo diferente do que a página e o checkout praticam.
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
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "BRL" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "BR" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: OFERTA.diasDeGarantia,
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };
}
