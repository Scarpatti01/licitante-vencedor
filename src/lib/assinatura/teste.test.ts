import { describe, expect, it } from "vitest";

import {
  AVISAR_A_PARTIR_DE,
  DIAS_DE_TESTE,
  diasRestantes,
  precisaAvisar,
  terminaEm,
  testeVenceu,
} from "./teste.ts";

const AGORA = new Date("2026-08-25T12:00:00Z");
const emDias = (n: number) => new Date(AGORA.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const teste = (testeTerminaEm: string | null) => ({ status: "teste", testeTerminaEm });

describe("terminaEm", () => {
  it("soma os dias do teste", () => {
    expect(terminaEm(AGORA).toISOString()).toBe(emDias(DIAS_DE_TESTE));
  });
});

describe("testeVenceu", () => {
  it("não vence antes da hora", () => {
    expect(testeVenceu(teste(emDias(1)), AGORA)).toBe(false);
  });

  it("vence na hora exata", () => {
    expect(testeVenceu(teste(AGORA.toISOString()), AGORA)).toBe(true);
  });

  it("vence depois", () => {
    expect(testeVenceu(teste(emDias(-1)), AGORA)).toBe(true);
  });

  it("NUNCA vence assinatura paga", () => {
    /*
     * O erro mais caro possível deste arquivo: cortar o acesso de quem está
     * pagando. Assinatura `ativa` não tem período de teste, e passar por aqui
     * não pode encerrá-la de jeito nenhum.
     */
    expect(testeVenceu({ status: "ativa", testeTerminaEm: emDias(-100) }, AGORA)).toBe(false);
    expect(testeVenceu({ status: "inadimplente", testeTerminaEm: emDias(-100) }, AGORA)).toBe(false);
  });

  it("NUNCA vence teste sem data de fim", () => {
    // Encerrar por falta de uma data que a assinatura talvez nunca devesse ter
    // é destruir acesso por ausência de informação.
    expect(testeVenceu(teste(null), AGORA)).toBe(false);
  });

  it("NUNCA vence com data ilegível", () => {
    expect(testeVenceu(teste("catorze de setembro"), AGORA)).toBe(false);
  });
});

describe("diasRestantes", () => {
  it("conta os dias que faltam", () => {
    expect(diasRestantes(teste(emDias(5)), AGORA)).toBe(5);
  });

  it("nunca é negativo: teste vencido é zero", () => {
    // "faltam -3 dias" na tela é defeito visível. Zero é a verdade útil.
    expect(diasRestantes(teste(emDias(-3)), AGORA)).toBe(0);
  });

  it("é null para quem não está em teste", () => {
    expect(diasRestantes({ status: "ativa", testeTerminaEm: emDias(5) }, AGORA)).toBeNull();
    expect(diasRestantes(teste(null), AGORA)).toBeNull();
  });

  it("arredonda para cima: meio dia que falta ainda é um dia", () => {
    const meioDia = new Date(AGORA.getTime() + 12 * 60 * 60 * 1000).toISOString();
    expect(diasRestantes(teste(meioDia), AGORA)).toBe(1);
  });
});

describe("precisaAvisar", () => {
  it("avisa a partir do limite, e não no último dia", () => {
    /*
     * Um dia de aviso é aviso que chega junto com a perda. Três dão tempo de
     * decidir, de falar com quem paga a conta, e de reclamar se o produto não
     * entregou — conversa que a gente quer ter antes, não depois.
     */
    expect(precisaAvisar(teste(emDias(AVISAR_A_PARTIR_DE)), AGORA)).toBe(true);
    expect(precisaAvisar(teste(emDias(AVISAR_A_PARTIR_DE + 1)), AGORA)).toBe(false);
  });

  it("continua avisando depois de vencido", () => {
    // Zero dias restantes ainda precisa de aviso: é o momento em que o cliente
    // mais precisa entender por que parou de receber.
    expect(precisaAvisar(teste(emDias(-1)), AGORA)).toBe(true);
  });

  it("não avisa quem está pagando", () => {
    expect(precisaAvisar({ status: "ativa", testeTerminaEm: emDias(1) }, AGORA)).toBe(false);
  });
});
