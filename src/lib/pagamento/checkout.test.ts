import { describe, expect, it } from "vitest";

import { chaveDeIdempotencia, corpoDoCheckout, parametrosDoCheckout } from "./checkout.ts";
import { PLANOS, type Plano } from "../precos.ts";

const LEVE = PLANOS.find((p) => p.codigo === "leve")!;

const dados = (over: Partial<Parameters<typeof parametrosDoCheckout>[0]> = {}) => ({
  plano: LEVE,
  empresaId: "e0728737-d84e-4980-b575-60f24e2ea7f8",
  email: "contato@empresa.com.br",
  urlDeSucesso: "https://licitantevencedor.com.br/painel/?assinou=1",
  urlDeCancelamento: "https://licitantevencedor.com.br/precos/",
  ...over,
});

describe("parametrosDoCheckout", () => {
  it("cobra assinatura mensal em reais, com o preço de `precos.ts`", () => {
    /*
     * O preço vai inline em vez de referenciar um `Price` cadastrado na Stripe.
     * Com `Price`, mudar R$ 59 para R$ 69 exigiria mexer no código E no painel,
     * e esquecer o segundo cobraria o valor antigo — sem erro em lugar nenhum.
     */
    const p = parametrosDoCheckout(dados());
    expect(p.mode).toBe("subscription");
    expect(p["line_items[0][price_data][currency]"]).toBe("brl");
    expect(p["line_items[0][price_data][recurring][interval]"]).toBe("month");
    expect(p["line_items[0][price_data][unit_amount]"]).toBe(String(LEVE.mensalidadeEmCentavos));
  });

  it("o valor cobrado é exatamente o publicado, para todo plano", () => {
    // A guarda que impede a cobrança de divergir da página. Vale para os
    // quatro, e passa a valer para o quinto no dia em que ele existir.
    for (const plano of PLANOS) {
      const p = parametrosDoCheckout(dados({ plano }));
      expect(
        p["line_items[0][price_data][unit_amount]"],
        `${plano.codigo}: a Stripe cobraria valor diferente do anunciado`,
      ).toBe(String(plano.mensalidadeEmCentavos));
    }
  });

  it("manda a empresa na sessão E na assinatura", () => {
    /*
     * Na sessão, para o webhook de conclusão saber de quem é. Na assinatura,
     * porque a sessão some do painel depois de um tempo e a assinatura fica —
     * sem isto, uma renovação daqui a seis meses chegaria órfã.
     */
    const p = parametrosDoCheckout(dados());
    expect(p.client_reference_id).toBe(dados().empresaId);
    expect(p["metadata[empresa_id]"]).toBe(dados().empresaId);
    expect(p["subscription_data[metadata][empresa_id]"]).toBe(dados().empresaId);
    expect(p["subscription_data[metadata][plano]"]).toBe("leve");
  });

  it("não manda customer_email vazio", () => {
    // A Stripe recusa a sessão inteira com e-mail vazio, e o cliente veria um
    // erro em vez do checkout.
    const p = parametrosDoCheckout(dados({ email: null }));
    expect("customer_email" in p).toBe(false);
  });

  it("pede documento e endereço", () => {
    // Nota fiscal no Brasil pede o documento. Deixar para depois do pagamento
    // cria um cliente pago que a contabilidade não consegue fechar.
    const p = parametrosDoCheckout(dados());
    expect(p["tax_id_collection[enabled]"]).toBe("true");
    expect(p.billing_address_collection).toBe("required");
  });

  it("nomeia o produto com o plano, para o cliente reconhecer na fatura", () => {
    const p = parametrosDoCheckout(dados());
    expect(p["line_items[0][price_data][product_data][name]"]).toContain("Leve");
  });
});

describe("corpoDoCheckout", () => {
  it("codifica os colchetes que a API da Stripe espera", () => {
    // A API não recebe JSON: recebe formulário, com aninhamento em colchetes.
    const corpo = corpoDoCheckout(dados());
    expect(corpo).toContain("mode=subscription");
    expect(corpo).toContain(encodeURIComponent("line_items[0][price_data][currency]"));
  });
});

describe("chaveDeIdempotencia", () => {
  it("o duplo clique reaproveita a mesma sessão", () => {
    const a = chaveDeIdempotencia(dados(), new Date("2026-08-25T18:00:10Z"));
    const b = chaveDeIdempotencia(dados(), new Date("2026-08-25T18:00:50Z"));
    expect(a).toBe(b);
  });

  it("meia hora depois é outra sessão, porque é outra decisão", () => {
    const a = chaveDeIdempotencia(dados(), new Date("2026-08-25T18:00:00Z"));
    const b = chaveDeIdempotencia(dados(), new Date("2026-08-25T18:30:00Z"));
    expect(a).not.toBe(b);
  });

  it("empresas diferentes nunca compartilham chave", () => {
    // Compartilhar devolveria a sessão de OUTRA empresa para o cliente. É o
    // pior defeito possível neste arquivo.
    const a = chaveDeIdempotencia(dados(), new Date("2026-08-25T18:00:00Z"));
    const b = chaveDeIdempotencia(
      dados({ empresaId: "outra-empresa" }),
      new Date("2026-08-25T18:00:00Z"),
    );
    expect(a).not.toBe(b);
  });

  it("planos diferentes nunca compartilham chave", () => {
    const outro = PLANOS.find((p) => p.codigo === "empresa")! as Plano;
    const a = chaveDeIdempotencia(dados(), new Date("2026-08-25T18:00:00Z"));
    const b = chaveDeIdempotencia(dados({ plano: outro }), new Date("2026-08-25T18:00:00Z"));
    expect(a).not.toBe(b);
  });
});
