import { describe, expect, it } from "vitest";
import { checkoutAberto, economiaEmReais, OFERTA, valorAncorado } from "./oferta";

/**
 * A página promete um preço, um prazo de garantia e uma ancoragem. Se um número
 * mudar num lugar e não no outro, o cliente lê uma coisa e paga outra, e
 * descobre com o cartão na mão.
 */
describe("a oferta é coerente consigo mesma", () => {
  it("o preço escrito bate com o número", () => {
    expect(OFERTA.precoEscrito).toBe(`R$ ${OFERTA.preco}`);
  });

  it("a garantia é pelo menos o mínimo legal de arrependimento", () => {
    // Sete dias é o direito de arrependimento do Código de Defesa do Consumidor
    // na compra fora do estabelecimento. Prometer menos seria prometer menos do
    // que a lei já dá, o que além de inútil soa desonesto.
    expect(OFERTA.diasDeGarantia).toBeGreaterThanOrEqual(7);
  });

  it("a ancoragem é maior que o preço, senão ela desanacora", () => {
    // Uma ancoragem abaixo do preço faria a página argumentar contra si mesma.
    expect(valorAncorado()).toBeGreaterThan(OFERTA.preco);
    expect(economiaEmReais()).toBeGreaterThan(0);
  });

  it("checkoutAberto responde pelo conteúdo real da URL", () => {
    expect(checkoutAberto()).toBe(OFERTA.CHECKOUT.trim().length > 0);
  });

  it("quando houver URL de checkout, ela é https", () => {
    if (OFERTA.CHECKOUT.trim().length > 0) {
      expect(OFERTA.CHECKOUT).toMatch(/^https:\/\//);
    }
  });

  it("nenhum depoimento é inventado", () => {
    // A lista nasce vazia de propósito. Esta guarda existe para que ninguém
    // "encha" a seção com nome e fala fictícios para a página parecer mais
    // vendida: um depoimento falso é a coisa mais cara que uma página destas
    // pode carregar.
    for (const d of OFERTA.DEPOIMENTOS) {
      expect(d.embed.trim().length, `${d.nome} sem vídeo real`).toBeGreaterThan(0);
    }
  });
});
