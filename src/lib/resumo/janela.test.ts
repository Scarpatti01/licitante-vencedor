import { describe, expect, it } from "vitest";
import {
  ESPERA_MAXIMA_MS,
  decidirJanelaDoResumo,
  diaEmBrasilia,
  mesmoDiaEmBrasilia,
} from "./janela";

/**
 * A janela do resumo diário.
 *
 * Todos os instantes abaixo estão em UTC, de propósito: é assim que o GitHub
 * entrega o horário, e é na conversão para Brasília que este tipo de regra
 * erra. 24/09/2026 é quinta; 26 é sábado; 28 é segunda.
 */

const utc = (iso: string) => new Date(iso);

describe("decidirJanelaDoResumo", () => {
  it("manda na hora quando a coleta termina depois das 7h", () => {
    // 10:30 UTC = 07:30 em Brasília, quinta.
    expect(decidirJanelaDoResumo(utc("2026-09-24T10:30:00Z"))).toEqual({ acao: "enviar" });
  });

  it("espera até as 7h quando a coleta termina antes", () => {
    // 09:10 UTC = 06:10 em Brasília: faltam 50 minutos.
    const d = decidirJanelaDoResumo(utc("2026-09-24T09:10:00Z"));
    expect(d).toEqual({ acao: "esperar", ms: 50 * 60 * 1000, ate: "2026-09-24T10:00:00.000Z" });
  });

  it("7h em ponto já é hora", () => {
    expect(decidirJanelaDoResumo(utc("2026-09-24T10:00:00Z"))).toEqual({ acao: "enviar" });
  });

  it("um segundo antes das 7h ainda espera, e espera um segundo", () => {
    const d = decidirJanelaDoResumo(utc("2026-09-24T09:59:59Z"));
    expect(d).toEqual({ acao: "esperar", ms: 1000, ate: "2026-09-24T10:00:00.000Z" });
  });

  /**
   * O teto da espera.
   *
   * Um job do GitHub vive no máximo 6 horas. Se a coleta terminar à 01h10 de
   * Brasília num dia em que o GitHub foi pontual, esperar até as 7h passaria do
   * teto e o job morreria no meio, sem mandar nada. A resposta é `pular`, e a
   * segunda coleta do dia — que termina perto das 3h — dispara de novo.
   */
  it("não aceita uma espera que não cabe no job", () => {
    // 04:10 UTC = 01:10 em Brasília: faltariam 5h50.
    const d = decidirJanelaDoResumo(utc("2026-09-24T04:10:00Z"));
    expect(d.acao).toBe("pular");
    expect(d.acao === "pular" && d.motivo).toMatch(/cedo demais/);
  });

  it("aceita a espera que cabe no job", () => {
    // 05:00 UTC = 02:00 em Brasília: faltam 5h, abaixo do teto de 5h30.
    const d = decidirJanelaDoResumo(utc("2026-09-24T05:00:00Z"));
    expect(d).toEqual({ acao: "esperar", ms: 5 * 60 * 60 * 1000, ate: "2026-09-24T10:00:00.000Z" });
  });

  it("o teto é o que decide, e não um número escondido", () => {
    // O mesmo instante, com teto menor: vira pular.
    const d = decidirJanelaDoResumo(utc("2026-09-24T05:00:00Z"), 60 * 60 * 1000);
    expect(d.acao).toBe("pular");
    expect(ESPERA_MAXIMA_MS).toBeLessThan(6 * 60 * 60 * 1000);
  });

  it("depois das 20h não manda: fica para o próximo dia útil", () => {
    // 23:30 UTC = 20:30 em Brasília.
    const d = decidirJanelaDoResumo(utc("2026-09-24T23:30:00Z"));
    expect(d.acao).toBe("pular");
    expect(d.acao === "pular" && d.motivo).toMatch(/depois das 20h/);
  });

  it("19h59 ainda manda; 20h em ponto já não", () => {
    expect(decidirJanelaDoResumo(utc("2026-09-24T22:59:59Z"))).toEqual({ acao: "enviar" });
    expect(decidirJanelaDoResumo(utc("2026-09-24T23:00:00Z")).acao).toBe("pular");
  });

  it("não manda no fim de semana", () => {
    // Sábado e domingo às 10h de Brasília.
    for (const iso of ["2026-09-26T13:00:00Z", "2026-09-27T13:00:00Z"]) {
      const d = decidirJanelaDoResumo(utc(iso));
      expect(d.acao, iso).toBe("pular");
      expect(d.acao === "pular" && d.motivo).toMatch(/fim de semana/);
    }
  });

  /**
   * O caso que uma conta em UTC erra.
   *
   * 02:00 UTC de segunda é 23:00 de DOMINGO em Brasília. Quem decidisse pelo dia
   * UTC mandaria o resumo "de segunda" no domingo à noite.
   */
  it("o dia da semana é o de Brasília, não o de UTC", () => {
    const d = decidirJanelaDoResumo(utc("2026-09-28T02:00:00Z"));
    expect(d.acao).toBe("pular");
    expect(d.acao === "pular" && d.motivo).toMatch(/fim de semana/);
  });

  it("sexta às 22h de Brasília é sexta, e tarde demais — não fim de semana", () => {
    // 01:00 UTC de sábado = 22:00 de sexta em Brasília.
    const d = decidirJanelaDoResumo(utc("2026-09-26T01:00:00Z"));
    expect(d.acao).toBe("pular");
    expect(d.acao === "pular" && d.motivo).toMatch(/depois das 20h/);
  });
});

describe("dia em Brasília", () => {
  it("vira à meia-noite de Brasília, e não à de UTC", () => {
    // 02:00 UTC do dia 24 ainda é dia 23 em Brasília.
    expect(diaEmBrasilia(utc("2026-09-24T02:00:00Z"))).toBe("2026-09-23");
    expect(diaEmBrasilia(utc("2026-09-24T03:00:00Z"))).toBe("2026-09-24");
  });

  it("dois instantes no mesmo dia de Brasília, em dias UTC diferentes", () => {
    // 01:00 e 23:59 de 24/09 em Brasília; o segundo já é 25/09 em UTC.
    expect(mesmoDiaEmBrasilia(utc("2026-09-24T04:00:00Z"), utc("2026-09-25T02:59:00Z"))).toBe(true);
  });

  it("dois instantes no mesmo dia UTC, em dias diferentes de Brasília", () => {
    // 23:00 de 23/09 e 09:00 de 24/09 em Brasília; os dois em 24/09 UTC.
    expect(mesmoDiaEmBrasilia(utc("2026-09-24T02:00:00Z"), utc("2026-09-24T12:00:00Z"))).toBe(false);
  });
});
