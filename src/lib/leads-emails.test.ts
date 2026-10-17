import { describe, expect, it } from "vitest";
import { urlDeConfirmacao } from "./leads-emails";

describe("o link de confirmação", () => {
  it("sem material, é só o token", () => {
    expect(urlDeConfirmacao("abc", "https://x")).toBe("https://x/confirmar/?t=abc");
  });

  it("com material, leva o slug junto, porque a página de confirmação entrega por ele", () => {
    // O destino absorve o segundo cadastro do mesmo e-mail mantendo a origem
    // antiga; sem o slug no link, quem já estava na lista nunca receberia o
    // material pedido.
    expect(urlDeConfirmacao("abc", "https://x", { slug: "folha-de-habilitacao" })).toBe(
      "https://x/confirmar/?t=abc&m=folha-de-habilitacao",
    );
  });
});
