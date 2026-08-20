import { describe, expect, it } from "vitest";
import { DIAS_DE_GRACA_APOS_CANCELAMENTO, prazoDeGracaVencido } from "./retencao";

const DIA = 24 * 60 * 60 * 1000;

describe("prazoDeGracaVencido", () => {
  it("não venceu no dia seguinte ao cancelamento", () => {
    const encerrada = new Date("2026-08-01T00:00:00Z");
    const agora = new Date(encerrada.getTime() + DIA);
    expect(prazoDeGracaVencido(encerrada, agora)).toBe(false);
  });

  it("não venceu um dia antes do prazo padrão", () => {
    const encerrada = new Date("2026-08-01T00:00:00Z");
    const agora = new Date(encerrada.getTime() + (DIAS_DE_GRACA_APOS_CANCELAMENTO - 1) * DIA);
    expect(prazoDeGracaVencido(encerrada, agora)).toBe(false);
  });

  it("vence exatamente no dia do prazo padrão", () => {
    const encerrada = new Date("2026-08-01T00:00:00Z");
    const agora = new Date(encerrada.getTime() + DIAS_DE_GRACA_APOS_CANCELAMENTO * DIA);
    expect(prazoDeGracaVencido(encerrada, agora)).toBe(true);
  });

  it("continua vencido bem depois do prazo", () => {
    const encerrada = new Date("2026-01-01T00:00:00Z");
    const agora = new Date("2026-08-20T00:00:00Z");
    expect(prazoDeGracaVencido(encerrada, agora)).toBe(true);
  });

  it("aceita um prazo de carência diferente do padrão", () => {
    const encerrada = new Date("2026-08-01T00:00:00Z");
    const agora = new Date(encerrada.getTime() + 5 * DIA);
    expect(prazoDeGracaVencido(encerrada, agora, 5)).toBe(true);
    expect(prazoDeGracaVencido(encerrada, agora, 6)).toBe(false);
  });
});
