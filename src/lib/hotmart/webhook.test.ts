import { describe, expect, it } from "vitest";
import { lerAviso, nomeDoEvento } from "./webhook";
import { tokenConfere } from "./configuracao";

/**
 * O aviso de venda da Hotmart, que é o que transforma dinheiro em acesso.
 *
 * O que estes testes protegem não é o parsing: é a fronteira entre "não
 * interessa" e "não entendi". A Hotmart desiste de reentregar o que recebeu
 * 200, então tratar um aviso incompreendido como ignorado apaga uma compra paga
 * sem deixar rastro em lugar nenhum. `ignorar` responde 200 e `null` responde
 * 400, e a diferença entre os dois é o dinheiro.
 */

const APROVADA = {
  event: "PURCHASE_APPROVED",
  data: {
    buyer: { email: "Comprador@Exemplo.com.BR ", name: "Comprador" },
    purchase: { transaction: "HP1234567890", status: "APPROVED" },
    product: { id: 8479984 },
  },
};

describe("lerAviso", () => {
  it("compra aprovada libera, com o e-mail normalizado", () => {
    /*
     * A normalização não é estética. A coluna tem
     * `check (email = lower(btrim(email)))`, e a Hotmart devolve o e-mail como
     * a pessoa digitou. Sem baixar a caixa e cortar o espaço, o banco recusa a
     * linha e a compra se perde por causa de um shift.
     */
    expect(lerAviso(APROVADA)).toEqual({
      fazer: "liberar",
      email: "comprador@exemplo.com.br",
      referencia: "HP1234567890",
    });
  });

  it("PURCHASE_COMPLETE também libera", () => {
    // A Hotmart manda um ou outro conforme a forma de pagamento. Receber os
    // dois é inofensivo: o índice único da tabela come o segundo.
    const r = lerAviso({ ...APROVADA, event: "PURCHASE_COMPLETE" });
    expect(r).toMatchObject({ fazer: "liberar" });
  });

  it.each([
    ["PURCHASE_REFUNDED", "reembolso"],
    ["PURCHASE_CHARGEBACK", "chargeback"],
    ["PURCHASE_PROTEST", "contestação"],
    ["PURCHASE_CANCELED", "cancelada"],
    ["PURCHASE_EXPIRED", "expirado"],
  ])("%s revoga, com motivo escrito", (evento, pedaco) => {
    const r = lerAviso({ ...APROVADA, event: evento });
    expect(r).toMatchObject({ fazer: "revogar", referencia: "HP1234567890" });
    if (r && r.fazer === "revogar") expect(r.motivo).toContain(pedaco);
  });

  it("evento que não interessa é ignorado, e ignorado não é erro", () => {
    // A Hotmart manda dezenas de tipos, de carrinho abandonado a aula
    // assistida. Nenhum deles é problema, e todos devem responder 200.
    const r = lerAviso({ event: "CLUB_FIRST_ACCESS", data: {} });
    expect(r).toMatchObject({ fazer: "ignorar" });
  });

  it("compra sem e-mail NÃO é ignorada: é `null`", () => {
    /*
     * O CASO QUE MOTIVA O ARQUIVO INTEIRO.
     *
     * Um evento de compra que chega sem e-mail é formato que eu não sei ler, e
     * a rota transforma `null` em 400 para a Hotmart reentregar. Devolver
     * `ignorar` aqui daria 200, ela pararia de reentregar, e a compra sumiria
     * com o dinheiro já recebido.
     */
    const semEmail = { event: "PURCHASE_APPROVED", data: { purchase: { transaction: "X1" } } };
    expect(lerAviso(semEmail)).toBeNull();
  });

  it("compra sem transação também é `null`", () => {
    // Sem referência não há idempotência, e a coluna `compra_tem_referencia`
    // recusaria a linha de qualquer forma.
    const semRef = { event: "PURCHASE_APPROVED", data: { buyer: { email: "a@b.com" } } };
    expect(lerAviso(semRef)).toBeNull();
  });

  it("e-mail malformado é `null`, e não uma linha recusada pelo banco", () => {
    const torto = {
      event: "PURCHASE_APPROVED",
      data: { buyer: { email: "não é e-mail" }, purchase: { transaction: "X2" } },
    };
    expect(lerAviso(torto)).toBeNull();
  });

  it("lê também o formato antigo e achatado", () => {
    // A Hotmart mudou o postback entre versões. Suportar as duas formas custa
    // três linhas e evita descobrir a diferença com uma venda perdida.
    const antigo = { status: "approved", email: "velho@exemplo.com", transaction: "HP999" };
    expect(lerAviso({ ...antigo, event: "PURCHASE_APPROVED" })).toEqual({
      fazer: "liberar",
      email: "velho@exemplo.com",
      referencia: "HP999",
    });
  });

  it("corpo vazio não vira compra", () => {
    expect(lerAviso({})).toMatchObject({ fazer: "ignorar" });
  });

  it("nomeDoEvento serve ao log mesmo quando o resto falha", () => {
    expect(nomeDoEvento({ event: "PURCHASE_APPROVED" })).toBe("PURCHASE_APPROVED");
    expect(nomeDoEvento({})).toBe("");
  });
});

describe("tokenConfere", () => {
  it("aceita o token certo e recusa o errado", () => {
    expect(tokenConfere("segredo", "segredo")).toBe(true);
    expect(tokenConfere("segred0", "segredo")).toBe(false);
  });

  it("recusa ausente, vazio e de tamanho diferente", () => {
    expect(tokenConfere(null, "segredo")).toBe(false);
    expect(tokenConfere("", "segredo")).toBe(false);
    expect(tokenConfere("segredoo", "segredo")).toBe(false);
    expect(tokenConfere("segred", "segredo")).toBe(false);
  });

  it("um prefixo correto não passa", () => {
    // O ponto da comparação em tempo constante: quem acerta o começo não pode
    // descobrir isso, nem pelo resultado nem pelo tempo.
    expect(tokenConfere("s", "segredo")).toBe(false);
  });
});
