import { describe, expect, it } from "vitest";
import { emailPlausivel, normalizarEmail } from "./compras";

/**
 * O e-mail digitado na tela precisa passar exatamente na mesma trava do banco.
 * Se a tela aceitar o que o banco recusa, o operador clica em "liberar", vê um
 * erro cru de Postgres, e o cliente que pagou continua sem acesso.
 */
describe("o e-mail da compra", () => {
  it("normaliza como o banco espera", () => {
    expect(normalizarEmail("  Joao@Empresa.COM.br ")).toBe("joao@empresa.com.br");
  });

  it("aceita o que o banco aceita", () => {
    for (const bom of ["a@b.co", "joao.silva@empresa.com.br", "maria+jornada@gmail.com"]) {
      expect(emailPlausivel(bom), bom).toBe(true);
    }
  });

  it("recusa o que o banco recusaria", () => {
    for (const ruim of ["", "sem-arroba", "a@b", "a@b.c", "com espaco@b.com", "@b.com", "a@.com"]) {
      expect(emailPlausivel(ruim), ruim).toBe(false);
    }
  });

  it("recusa e-mail que ainda não foi normalizado", () => {
    // A trava do banco é `email = lower(btrim(email))`. Aceitar aqui um
    // "Joao@Empresa.com" faria a inserção falhar depois de a tela dizer que deu
    // certo, que é o pior instante possível para descobrir.
    expect(emailPlausivel("Joao@Empresa.com.br")).toBe(false);
    expect(emailPlausivel(" joao@empresa.com.br")).toBe(false);
  });
});
