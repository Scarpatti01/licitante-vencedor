import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  conferirAssinatura,
  decidirPeloStatus,
  eventoImporta,
  partirOCabecalho,
  TOLERANCIA_EM_SEGUNDOS,
  type StatusNaStripe,
} from "./assinatura";

const SEGREDO = "whsec_exemplo_de_teste";
const AGORA = new Date("2026-08-23T12:00:00Z");

/** Monta um cabeçalho válido, como a Stripe montaria. */
function assinar(corpo: string, quando: Date = AGORA, segredo = SEGREDO): string {
  const t = Math.floor(quando.getTime() / 1000);
  const v1 = createHmac("sha256", segredo).update(`${t}.${corpo}`, "utf8").digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("a assinatura do webhook", () => {
  const corpo = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated" });

  it("aceita uma requisição legítima", () => {
    expect(conferirAssinatura({ corpo, cabecalho: assinar(corpo), segredo: SEGREDO, agora: AGORA }))
      .toEqual({ valida: true });
  });

  it("recusa corpo adulterado", () => {
    // O ataque que a assinatura existe para impedir: cabeçalho legítimo,
    // conteúdo trocado por um que nos mandaria liberar acesso.
    const cabecalho = assinar(corpo);
    const forjado = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated", x: 1 });
    const v = conferirAssinatura({ corpo: forjado, cabecalho, segredo: SEGREDO, agora: AGORA });
    expect(v).toEqual({ valida: false, motivo: "assinatura não confere" });
  });

  it("recusa segredo errado", () => {
    const cabecalho = assinar(corpo, AGORA, "whsec_de_outra_conta");
    expect(conferirAssinatura({ corpo, cabecalho, segredo: SEGREDO, agora: AGORA }).valida).toBe(false);
  });

  it("recusa requisição antiga, mesmo com assinatura boa", () => {
    // Sem janela de tempo, uma requisição legítima capturada uma vez vale para
    // sempre — a assinatura não expira sozinha.
    const antiga = new Date(AGORA.getTime() - (TOLERANCIA_EM_SEGUNDOS + 5) * 1000);
    const v = conferirAssinatura({ corpo, cabecalho: assinar(corpo, antiga), segredo: SEGREDO, agora: AGORA });
    expect(v.valida).toBe(false);
    expect(v).toMatchObject({ motivo: expect.stringContaining("janela") });
  });

  it("recusa carimbo do futuro pela mesma régua", () => {
    const futura = new Date(AGORA.getTime() + (TOLERANCIA_EM_SEGUNDOS + 5) * 1000);
    expect(conferirAssinatura({ corpo, cabecalho: assinar(corpo, futura), segredo: SEGREDO, agora: AGORA }).valida)
      .toBe(false);
  });

  it("aceita quando UMA das assinaturas confere — o caso do rodízio de segredo", () => {
    // Durante a troca de segredo a Stripe manda duas `v1`. Ficar com a primeira
    // faria a cobrança cair num dia qualquer, sem ninguém ligar as duas coisas.
    const t = Math.floor(AGORA.getTime() / 1000);
    const boa = createHmac("sha256", SEGREDO).update(`${t}.${corpo}`, "utf8").digest("hex");
    const cabecalho = `t=${t},v1=${"0".repeat(64)},v1=${boa}`;
    expect(conferirAssinatura({ corpo, cabecalho, segredo: SEGREDO, agora: AGORA }).valida).toBe(true);
  });

  it("recusa cabeçalho ausente ou malformado, e segredo não configurado", () => {
    expect(conferirAssinatura({ corpo, cabecalho: null, segredo: SEGREDO, agora: AGORA }).valida).toBe(false);
    expect(conferirAssinatura({ corpo, cabecalho: "lixo", segredo: SEGREDO, agora: AGORA }).valida).toBe(false);
    expect(conferirAssinatura({ corpo, cabecalho: assinar(corpo), segredo: "", agora: AGORA }).valida).toBe(false);
  });

  it("lê t e todas as v1 do cabeçalho", () => {
    expect(partirOCabecalho("t=123,v1=aa,v0=zz,v1=bb")).toEqual({ t: "123", v1: ["aa", "bb"] });
  });
});

describe("a decisão a partir do estado na Stripe", () => {
  it("NÃO registra nada enquanto o primeiro pagamento não entrou", () => {
    // A razão de ser deste módulo. `incomplete` é o boleto gerado e não pago.
    // Como `cobertura_da_empresa` conta como coberta qualquer assinatura sem
    // `encerrada_em`, gravar aqui daria produto de graça a quem só imprimiu o
    // documento — e sem limite de tentativas.
    expect(decidirPeloStatus("incomplete")).toEqual({
      registrar: false,
      motivo: "primeiro pagamento ainda não entrou",
    });
  });

  it("registra e libera quando o dinheiro entrou", () => {
    expect(decidirPeloStatus("active")).toEqual({ registrar: true, status: "ativa", encerrar: false });
    expect(decidirPeloStatus("trialing")).toEqual({ registrar: true, status: "teste", encerrar: false });
  });

  it("mantém o acesso em past_due, e corta em unpaid", () => {
    // Os dois lados da mesma régua: quem já pagou antes ganha a folga de um
    // boleto atrasado; quem esgotou as tentativas da Stripe, não.
    expect(decidirPeloStatus("past_due")).toMatchObject({ status: "inadimplente", encerrar: false });
    expect(decidirPeloStatus("unpaid")).toMatchObject({ encerrar: true });
  });

  it("encerra em todo estado terminal", () => {
    for (const status of ["canceled", "incomplete_expired", "unpaid", "paused"] as StatusNaStripe[]) {
      expect(decidirPeloStatus(status)).toMatchObject({ registrar: true, encerrar: true });
    }
  });

  it("nenhum estado que libera acesso deixa de registrar, e vice-versa", () => {
    // A invariante que amarra as duas metades: o único estado sem linha é o que
    // não paga, e todo estado que paga tem linha aberta. Se alguém acrescentar
    // um status novo e esquecer de decidir, este caso mostra onde.
    const liberam: StatusNaStripe[] = ["trialing", "active", "past_due"];
    const naoLiberam: StatusNaStripe[] = ["incomplete", "incomplete_expired", "canceled", "unpaid", "paused"];

    for (const s of liberam) {
      const d = decidirPeloStatus(s);
      expect(d.registrar, `${s} precisa de linha aberta`).toBe(true);
      expect(d.registrar && d.encerrar, `${s} não pode nascer encerrada`).toBe(false);
    }
    for (const s of naoLiberam) {
      const d = decidirPeloStatus(s);
      // Ou não grava, ou grava já encerrada — as duas negam cobertura.
      expect(!d.registrar || d.encerrar, `${s} não pode conceder cobertura`).toBe(true);
    }
  });
});

describe("quais eventos importam", () => {
  it("escuta o ciclo da assinatura", () => {
    expect(eventoImporta("customer.subscription.updated")).toBe(true);
    expect(eventoImporta("customer.subscription.deleted")).toBe(true);
  });

  it("IGNORA checkout.session.completed", () => {
    // No boleto ele dispara quando o documento é GERADO, não pago. É o evento
    // que integrações ingênuas tratam como venda.
    expect(eventoImporta("checkout.session.completed")).toBe(false);
  });
});
