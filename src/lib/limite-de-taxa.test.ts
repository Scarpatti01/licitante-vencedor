import { beforeEach, describe, expect, it } from "vitest";
import { dentroDoLimite, esquecerTudo, identificarChamador } from "./limite-de-taxa";

const REGRA = { maximo: 3, janelaSegundos: 60 };

describe("dentroDoLimite", () => {
  beforeEach(esquecerTudo);

  it("permite até o teto e barra a partir dele", () => {
    for (let i = 0; i < 3; i++) {
      expect(dentroDoLimite("a", REGRA, 1000).permitido, `tentativa ${i + 1}`).toBe(true);
    }
    expect(dentroDoLimite("a", REGRA, 1000).permitido).toBe(false);
  });

  it("libera de novo quando a janela vira", () => {
    for (let i = 0; i < 4; i++) dentroDoLimite("a", REGRA, 1000);
    expect(dentroDoLimite("a", REGRA, 1000).permitido).toBe(false);
    expect(dentroDoLimite("a", REGRA, 1000 + 61_000).permitido).toBe(true);
  });

  it("conta por chave — um visitante não derruba o outro", () => {
    for (let i = 0; i < 4; i++) dentroDoLimite("a", REGRA, 1000);
    expect(dentroDoLimite("a", REGRA, 1000).permitido).toBe(false);
    expect(dentroDoLimite("b", REGRA, 1000).permitido).toBe(true);
  });

  it("diz quantos segundos faltam, para o Retry-After não ser chute", () => {
    for (let i = 0; i < 4; i++) dentroDoLimite("a", REGRA, 1000);
    const barrado = dentroDoLimite("a", REGRA, 1000 + 20_000);
    expect(barrado.permitido).toBe(false);
    expect(barrado.esperarSegundos).toBe(40);
  });

  it("nunca devolve espera zero quando barra", () => {
    // `Retry-After: 0` convida o cliente a tentar de novo no mesmo instante,
    // que é o oposto do que a resposta quer dizer.
    for (let i = 0; i < 4; i++) dentroDoLimite("a", REGRA, 1000);
    const quaseVirando = dentroDoLimite("a", REGRA, 1000 + 59_900);
    expect(quaseVirando.esperarSegundos).toBeGreaterThanOrEqual(1);
  });
});

describe("identificarChamador", () => {
  it("usa o primeiro endereço do x-forwarded-for", () => {
    const cabecalhos = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(identificarChamador(cabecalhos)).toBe("203.0.113.7");
  });

  it("cai para x-real-ip e depois para um valor fixo", () => {
    expect(identificarChamador(new Headers({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
    expect(identificarChamador(new Headers())).toBe("desconhecido");
  });
});
