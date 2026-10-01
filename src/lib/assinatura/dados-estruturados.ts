import { SITE } from "@/lib/site";
import { PLANOS } from "@/lib/precos";

/**
 * A imagem da assinatura: o e-mail do resumo diário, como ele chega.
 *
 * ## Por que existe
 *
 * O Google cobra uma imagem de todo `Product`. Em 30/09/2026 o Search Console
 * marcou `/jornada/` por falta dela, e `/precos/` tinha o mesmo buraco. O
 * Workbook tem arte de capa; a assinatura é um serviço e não tinha nada.
 *
 * ## O que ela é, e o que NÃO é
 *
 * É o e-mail do resumo de 29/09/2026, gerado pelo MESMO código que o envia
 * (`planejarResumoDiario` e `emHtml`), com os cinco editais reais que saíram
 * naquele dia, publicados no PNCP, e a aderência gravada no banco. Uma
 * única troca: o nome da empresa cliente virou "sua empresa", porque a imagem
 * é pública e o cliente não autorizou aparecer nela. O plano é o Leve, por
 * isso a linha "o seu plano não inclui a leitura do documento".
 *
 * Não é tela de demonstração. `AvisoDeDemonstracao` existe justamente para que
 * edital inventado nunca vire captura de tela comercial, e uma foto de produto
 * no Google é exatamente isso.
 *
 * Se o e-mail mudar de cara, esta imagem precisa ser refeita: ela promete o
 * que o cliente recebe.
 */
export const IMAGEM_DA_ASSINATURA = "/assinatura-resumo-diario.webp";

/** Texto alternativo da imagem, dito como ela é. */
export const ALT_DA_ASSINATURA =
  "E-mail do resumo diário do Licitante Vencedor com o assunto \"5 editais para a sua empresa\", " +
  "mostrando o primeiro edital: controle de pragas urbanas para a Companhia Maricá Alimentos, " +
  "em Maricá/RJ, com aderência de 95 de 100.";

/**
 * A assinatura como `Product`, um `Offer` por plano.
 *
 * O preço de cada `Offer` é a MENSALIDADE. `priceSpecification` diz isso ao
 * buscador: sem ela, a busca poderia anunciar "R$ 59" como se fosse pagamento
 * único, e o visitante chegaria achando que foi enganado.
 *
 * `availability` segue o pagamento: `PreOrder` enquanto não há como pagar,
 * porque é a verdade, e `InStock` no dia em que o pagamento ligar, sem
 * ninguém precisar lembrar deste arquivo.
 *
 * A entrega descrita é a real: digital, sem custo, no Brasil, começando no dia
 * da assinatura. Não há `hasMerchantReturnPolicy` de propósito: a assinatura
 * não tem política de devolução escrita, só cancelamento a qualquer momento, e
 * inventar uma para calar um aviso opcional seria declarar ao Google uma regra
 * que o cliente não encontra em lugar nenhum.
 */
export function assinaturaEmDadosEstruturados(descricao: string, pagamentoLigado: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE.url}/precos/#assinatura`,
    name: `${SITE.name}, assinatura`,
    description: descricao,
    image: `${SITE.url}${IMAGEM_DA_ASSINATURA}`,
    brand: { "@type": "Brand", name: SITE.name },
    offers: PLANOS.map((plano) => {
      const preco = (plano.mensalidadeEmCentavos / 100).toFixed(2);
      return {
        "@type": "Offer",
        name: plano.nome,
        price: preco,
        priceCurrency: "BRL",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: preco,
          priceCurrency: "BRL",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
        },
        availability: pagamentoLigado
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
        url: `${SITE.url}/precos/`,
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
      };
    }),
  };
}
