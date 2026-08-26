import { describe, expect, it } from "vitest";

import {
  FILTRO_POSTGREST_DE_PAGANTES,
  FILTRO_POSTGREST_DE_VIVAS,
  STATUS_PAGANTES,
  STATUS_VIVOS,
  assinaturaEstaViva,
  assinaturaPaga,
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

describe("quem PAGA, que não é a mesma pergunta de quem está vivo", () => {
  /*
   * A guarda que existe por causa de um custo real.
   *
   * Em 25/08 o primeiro teste de catorze dias foi aberto, e `tetoDeLeitura`
   * — que pergunta "há assinante?" para decidir quantos editais ler por dia —
   * viu um. O teto subiu de 5 para 25 leituras por empresa por dia, de um dia
   * para o outro, sem ninguém ter pago nada.
   *
   * Se alguém trocar `assinaturaPaga` por `assinaturaEstaViva` aqui, o gasto
   * quintuplica de novo e nada no sistema reclama: as duas devolvem booleano,
   * as duas parecem certas, e a fatura chega um mês depois.
   */
  it("teste está VIVO e NÃO paga", () => {
    expect(assinaturaEstaViva("teste")).toBe(true);
    expect(assinaturaPaga("teste")).toBe(false);
  });

  it("ativa e inadimplente pagam", () => {
    expect(assinaturaPaga("ativa")).toBe(true);
    // Cartão recusado é cliente com problema de cobrança, não cliente que
    // sumiu. Ele continua contando como receita esperada.
    expect(assinaturaPaga("inadimplente")).toBe(true);
  });

  it("cancelada e encerrada não pagam", () => {
    expect(assinaturaPaga("cancelada")).toBe(false);
    expect(assinaturaPaga("encerrada")).toBe(false);
  });

  it("quem paga é subconjunto de quem está vivo", () => {
    // Se um dia alguém acrescentar um status a `STATUS_PAGANTES` sem pô-lo em
    // `STATUS_VIVOS`, existiria assinatura que paga e não recebe serviço.
    for (const status of STATUS_PAGANTES) {
      expect(assinaturaEstaViva(status)).toBe(true);
    }
    expect(STATUS_PAGANTES.length).toBeLessThan(STATUS_VIVOS.length);
  });

  it("o filtro de pagantes sai da lista", () => {
    expect(FILTRO_POSTGREST_DE_PAGANTES).toBe("in.(ativa,inadimplente)");
    expect(FILTRO_POSTGREST_DE_PAGANTES).not.toContain("teste");
  });
});
