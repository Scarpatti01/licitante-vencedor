import { afterEach, describe, expect, it } from "vitest";

import {
  avisoDeConfiguracao,
  configuracaoDePagamento,
  pagamentoLigado,
  webhookLigado,
} from "./configuracao.ts";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

function comAmbiente(vars: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL };
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("o padrão é desligado", () => {
  it("sem chave, a cobrança está desligada", () => {
    /*
     * A alternativa — código que "funciona" com credencial ausente e falha só
     * na hora do clique — produziria a pior tela do produto: o cliente decide
     * pagar, clica, e leva um erro. Quem chega ao botão já decidiu.
     */
    comAmbiente({ STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined });
    expect(configuracaoDePagamento()).toBeNull();
    expect(pagamentoLigado()).toBe(false);
  });

  it("chave em branco não conta como chave", () => {
    // Variável criada e deixada vazia no painel é o erro mais fácil de cometer,
    // e é indistinguível de "configurado" para quem só confere se existe.
    comAmbiente({ STRIPE_SECRET_KEY: "   " });
    expect(pagamentoLigado()).toBe(false);
  });
});

describe("o estado meio-configurado, que é o pior dos três", () => {
  it("com chave e SEM segredo do webhook, avisa em voz alta", () => {
    /*
     * Neste estado o checkout abre, o cliente paga, e a assinatura nunca é
     * registrada. Ele sai com dinheiro cobrado e sem serviço, e nada no sistema
     * aponta para o motivo.
     */
    comAmbiente({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: undefined });

    expect(pagamentoLigado()).toBe(true);
    expect(webhookLigado()).toBe(false);

    const aviso = avisoDeConfiguracao();
    expect(aviso).toMatch(/STRIPE_WEBHOOK_SECRET/);
    expect(aviso).toMatch(/NÃO é registrada/i);
  });

  it("com as duas, não há aviso", () => {
    comAmbiente({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x" });
    expect(avisoDeConfiguracao()).toBeNull();
    expect(pagamentoLigado()).toBe(true);
    expect(webhookLigado()).toBe(true);
  });

  it("sem nenhuma, o aviso fala da chave que falta primeiro", () => {
    comAmbiente({ STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined });
    expect(avisoDeConfiguracao()).toMatch(/STRIPE_SECRET_KEY/);
  });
});

describe("a chave nunca vaza pelo módulo", () => {
  it("`pagamentoLigado` devolve booleano, não a chave", () => {
    // Guarda contra alguém trocar o retorno por conveniência: um `boolean` não
    // pode acabar num log por acidente; uma string pode.
    comAmbiente({ STRIPE_SECRET_KEY: "sk_test_segredo" });
    expect(typeof pagamentoLigado()).toBe("boolean");
  });
});
