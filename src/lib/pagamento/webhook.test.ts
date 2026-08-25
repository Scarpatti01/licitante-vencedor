import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

import {
  conferirAssinatura,
  eventoInteressa,
  lerCabecalho,
  statusDaAssinatura,
  TOLERANCIA_EM_SEGUNDOS,
} from "./webhook.ts";

const SEGREDO = "whsec_um_segredo_qualquer_de_teste";
const AGORA = new Date("2026-08-25T18:00:00Z");
const CARIMBO = Math.floor(AGORA.getTime() / 1000);
const CORPO = '{"id":"evt_1","type":"customer.subscription.updated"}';

function assinar(corpo: string, carimbo: number, segredo = SEGREDO): string {
  const v1 = createHmac("sha256", segredo).update(`${carimbo}.${corpo}`, "utf8").digest("hex");
  return `t=${carimbo},v1=${v1}`;
}

describe("lerCabecalho", () => {
  it("lê carimbo e assinatura", () => {
    expect(lerCabecalho("t=1614556800,v1=abc")).toEqual({
      carimbo: 1614556800,
      assinaturas: ["abc"],
    });
  });

  it("lê MAIS de uma assinatura", () => {
    // Durante a rotação de segredo a Stripe manda as duas, e as duas valem.
    // Ficar só com a primeira derrubaria o webhook no dia da troca.
    expect(lerCabecalho("t=1,v1=abc,v1=def")?.assinaturas).toEqual(["abc", "def"]);
  });

  it("devolve null sem carimbo ou sem assinatura", () => {
    expect(lerCabecalho("v1=abc")).toBeNull();
    expect(lerCabecalho("t=1")).toBeNull();
    expect(lerCabecalho("lixo")).toBeNull();
    expect(lerCabecalho("")).toBeNull();
  });
});

describe("conferirAssinatura", () => {
  it("aceita o que a Stripe assinou", () => {
    expect(conferirAssinatura(CORPO, assinar(CORPO, CARIMBO), SEGREDO, AGORA)).toEqual({ ok: true });
  });

  it("RECUSA sem cabeçalho", () => {
    // É o POST que um robô manda ao varrer a URL do webhook.
    expect(conferirAssinatura(CORPO, null, SEGREDO, AGORA)).toEqual({
      ok: false,
      motivo: "sem-cabecalho",
    });
  });

  it("RECUSA corpo adulterado", () => {
    /*
     * O ataque que importa: pegar um POST legítimo e trocar o conteúdo por
     * "esta empresa pagou". A assinatura é sobre o corpo, então trocar o corpo
     * a invalida.
     */
    const cabecalho = assinar(CORPO, CARIMBO);
    const adulterado = '{"id":"evt_1","type":"customer.subscription.updated","hack":true}';
    expect(conferirAssinatura(adulterado, cabecalho, SEGREDO, AGORA)).toEqual({
      ok: false,
      motivo: "assinatura-nao-confere",
    });
  });

  it("RECUSA assinatura feita com outro segredo", () => {
    const cabecalho = assinar(CORPO, CARIMBO, "whsec_segredo_de_outra_pessoa");
    expect(conferirAssinatura(CORPO, cabecalho, SEGREDO, AGORA)).toEqual({
      ok: false,
      motivo: "assinatura-nao-confere",
    });
  });

  it("RECUSA reenvio de um POST antigo, ainda que legítimo", () => {
    /*
     * Sem a tolerância, quem capturasse um POST verdadeiro poderia reenviá-lo
     * para sempre, e cada reenvio seria aceito com assinatura válida.
     */
    const velho = CARIMBO - TOLERANCIA_EM_SEGUNDOS - 1;
    expect(conferirAssinatura(CORPO, assinar(CORPO, velho), SEGREDO, AGORA)).toEqual({
      ok: false,
      motivo: "carimbo-fora-da-tolerancia",
    });
  });

  it("RECUSA carimbo no futuro", () => {
    const futuro = CARIMBO + TOLERANCIA_EM_SEGUNDOS + 1;
    expect(conferirAssinatura(CORPO, assinar(CORPO, futuro), SEGREDO, AGORA)).toEqual({
      ok: false,
      motivo: "carimbo-fora-da-tolerancia",
    });
  });

  it("aceita bem na borda da tolerância", () => {
    const naBorda = CARIMBO - TOLERANCIA_EM_SEGUNDOS;
    expect(conferirAssinatura(CORPO, assinar(CORPO, naBorda), SEGREDO, AGORA).ok).toBe(true);
  });

  it("aceita quando UMA das assinaturas confere", () => {
    // O caso da rotação de segredo, visto do outro lado.
    const boa = createHmac("sha256", SEGREDO).update(`${CARIMBO}.${CORPO}`).digest("hex");
    const cabecalho = `t=${CARIMBO},v1=naoconfere,v1=${boa}`;
    expect(conferirAssinatura(CORPO, cabecalho, SEGREDO, AGORA).ok).toBe(true);
  });

  it("RECUSA assinatura de tamanho diferente sem estourar", () => {
    // `timingSafeEqual` lança se os buffers têm tamanhos diferentes. Um
    // cabeçalho curto não pode derrubar o endpoint com exceção.
    expect(conferirAssinatura(CORPO, `t=${CARIMBO},v1=abc`, SEGREDO, AGORA)).toEqual({
      ok: false,
      motivo: "assinatura-nao-confere",
    });
  });

  it("é sensível a espaçamento do corpo, e isso é o esperado", () => {
    /*
     * O erro clássico deste código é fazer `JSON.parse` e depois `stringify`
     * antes de conferir. Este teste documenta por que a rota precisa ler
     * `await req.text()` ANTES de qualquer outra coisa.
     */
    const cabecalho = assinar(CORPO, CARIMBO);
    const reserializado = JSON.stringify(JSON.parse(CORPO), null, 2);
    expect(conferirAssinatura(reserializado, cabecalho, SEGREDO, AGORA).ok).toBe(false);
  });
});

describe("statusDaAssinatura", () => {
  it("traduz os estados que o produto conhece", () => {
    expect(statusDaAssinatura("trialing")).toBe("teste");
    expect(statusDaAssinatura("active")).toBe("ativa");
    expect(statusDaAssinatura("past_due")).toBe("inadimplente");
    expect(statusDaAssinatura("unpaid")).toBe("inadimplente");
    expect(statusDaAssinatura("canceled")).toBe("cancelada");
    expect(statusDaAssinatura("incomplete_expired")).toBe("encerrada");
  });

  it("NÃO cria assinatura para pagamento ainda em processamento", () => {
    // `incomplete` é o cartão que ainda não confirmou. Criar assinatura ali
    // daria acesso a quem talvez não pague, e o webhook seguinte resolve.
    expect(statusDaAssinatura("incomplete")).toBeNull();
  });

  it("devolve null para estado que o produto não modela", () => {
    // Inventar mapeamento para "paused", que não existe no produto, seria
    // escolher no escuro.
    expect(statusDaAssinatura("paused")).toBeNull();
    expect(statusDaAssinatura("qualquer_coisa_nova")).toBeNull();
  });
});

describe("eventoInteressa", () => {
  it("reconhece os quatro que o produto trata", () => {
    expect(eventoInteressa("checkout.session.completed")).toBe(true);
    expect(eventoInteressa("customer.subscription.deleted")).toBe(true);
  });

  it("ignora o resto", () => {
    // A Stripe reenvia o que não recebeu 200. Responder erro a um evento que
    // não nos diz respeito criaria uma fila de reentrega que nunca esvazia.
    expect(eventoInteressa("invoice.created")).toBe(false);
    expect(eventoInteressa("charge.refunded")).toBe(false);
  });
});
