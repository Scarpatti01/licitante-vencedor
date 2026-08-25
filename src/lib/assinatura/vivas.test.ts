import { describe, expect, it } from "vitest";

import {
  FILTRO_POSTGREST_DE_VIVAS,
  STATUS_VIVOS,
  assinaturaEstaViva,
  leituraInclusaNoPlano,
  recebeOResumo,
} from "./vivas.ts";

describe("quem está vivo", () => {
  it("teste, ativa e inadimplente recebem; cancelada e encerrada, não", () => {
    for (const status of ["teste", "ativa", "inadimplente"]) {
      expect(assinaturaEstaViva(status)).toBe(true);
    }
    for (const status of ["cancelada", "encerrada"]) {
      expect(assinaturaEstaViva(status)).toBe(false);
    }
  });

  it("inadimplente continua vivo, e é decisão, não esquecimento", () => {
    // Cartão recusado não é cancelamento. Cortar o serviço na primeira falha de
    // cobrança perde o cliente que ia pagar na segunda tentativa.
    expect(assinaturaEstaViva("inadimplente")).toBe(true);
  });

  it("o filtro do PostgREST sai da lista, e não de uma string digitada de novo", () => {
    expect(FILTRO_POSTGREST_DE_VIVAS).toBe("in.(teste,ativa,inadimplente)");
    for (const status of STATUS_VIVOS) {
      expect(FILTRO_POSTGREST_DE_VIVAS).toContain(status);
    }
  });
});

describe("o portão do resumo diário", () => {
  /*
   * A guarda mais importante deste arquivo, e a razão de ele existir.
   *
   * Até 25/08 `destinatarias()` devolvia toda empresa com perfil, sem olhar
   * assinatura. Se alguém voltar a esse comportamento, o teste de catorze dias
   * deixa de acabar e o alerta gratuito ressuscita com outro nome.
   */
  it("sem assinatura, ninguém recebe", () => {
    expect(recebeOResumo(undefined)).toBe(false);
    expect(recebeOResumo(null)).toBe(false);
    expect(recebeOResumo({})).toBe(false);
  });

  it("teste vencido e virado `encerrada` para de receber no mesmo dia", () => {
    expect(recebeOResumo({ status: "teste" })).toBe(true);
    expect(recebeOResumo({ status: "encerrada" })).toBe(false);
  });

  it("quem cancelou para de receber", () => {
    expect(recebeOResumo({ status: "cancelada" })).toBe(false);
  });
});

describe("o plano lê o documento?", () => {
  it("`null` é sem limite, e sem limite lê", () => {
    expect(leituraInclusaNoPlano(null, true)).toBe(true);
  });

  it("`0` é o plano de lista: a cota não acabou, ela nunca existiu", () => {
    expect(leituraInclusaNoPlano(0, true)).toBe(false);
  });

  it("sem plano legível, promete menos", () => {
    expect(leituraInclusaNoPlano(null, false)).toBe(false);
    expect(leituraInclusaNoPlano(5, false)).toBe(false);
  });

  it("limite positivo lê", () => {
    expect(leituraInclusaNoPlano(20, true)).toBe(true);
  });

  it("lixo no lugar do número não vira permissão", () => {
    // O valor vem do PostgREST como JSON: uma string "0" ou um `undefined` de
    // coluna ausente não podem virar "este plano lê".
    expect(leituraInclusaNoPlano("20", true)).toBe(false);
    expect(leituraInclusaNoPlano(undefined, true)).toBe(false);
  });
});
